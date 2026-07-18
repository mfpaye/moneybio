import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../lib/AuthContext'
import { useT } from '../lib/i18n.jsx'
import { spaces, categories, connectedAccounts } from '../lib/supabase'

const SPACE_TYPE_IDS = [
  { id: 'couple',    icon: '💑', key: 'spaces_couple'    },
  { id: 'family',    icon: '👨‍👩‍👧', key: 'spaces_family'    },
  { id: 'roommates', icon: '🏠', key: 'spaces_roommates' },
  { id: 'business',  icon: '🤝', key: 'spaces_business'  },
  { id: 'custom',    icon: '✨', key: 'spaces_custom'    },
]

const PERM_KEYS = {
  can_view_others: 'spaces_can_view',
  can_add_transactions: 'spaces_can_add',
  can_edit_own: 'spaces_can_edit_own',
  can_edit_others: 'spaces_can_edit_others',
  can_invite: 'spaces_can_invite',
  can_connect_bank: 'spaces_can_connect',
}

const PRIVACY_KEYS = {
  shares_transactions: 'spaces_share_transactions',
  shares_amounts: 'spaces_show_amounts',
  shares_merchant: 'spaces_show_merchant',
  shares_receipts: 'spaces_share_receipts',
  shares_bank_data: 'spaces_share_bank',
}

export default function Spaces() {
  const { user, profile } = useAuth()
  const t = useT()

  const [mySpaces, setMySpaces] = useState([])
  const [activeSpace, setActiveSpace] = useState(null)
  const [spaceDetail, setSpaceDetail] = useState(null) // {space, members, transactions, activity}
  const [spaceView, setSpaceView] = useState('transactions') // transactions | members | activity
  const [loading, setLoading] = useState(true)
  const [viewLoading, setViewLoading] = useState(false)

  // Modals
  const [modal, setModal] = useState(null) // create | invite | add_txn | privacy | permissions | connect_bank

  // Forms
  const [createForm, setCreateForm] = useState({ name: '', space_type: 'couple' })
  const [inviteForm, setInviteForm] = useState({ display_name: '', email: '', role: 'member' })
  const [txnForm, setTxnForm] = useState({ description: '', amount: '', transaction_date: new Date().toISOString().split('T')[0], payment_method: 'card', category_id: '' })
  const [cats, setCats] = useState([])
  const [myAccounts, setMyAccounts] = useState([])
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  // My member record in the active space
  const myMember = spaceDetail?.members?.find(m => m.user_id === user?.id)

  useEffect(() => { if (user) loadSpaces() }, [user])
  useEffect(() => { if (user && activeSpace) loadSpaceDetail(activeSpace.id) }, [activeSpace])
  useEffect(() => { if (user) { categories.list(user.id).then(r => setCats(r.data || [])); connectedAccounts.list(user.id).then(r => setMyAccounts(r.data || [])) } }, [user])

  async function loadSpaces() {
    setLoading(true)
    const { data } = await spaces.mySpaces(user.id)
    const all = (data || []).map(m => ({ ...m.collaborative_spaces, myRole: m.role, myStatus: m.invite_status }))
    setMySpaces(all)
    if (all.length > 0 && !activeSpace) setActiveSpace(all[0])
    setLoading(false)
  }

  async function loadSpaceDetail(spaceId) {
    setViewLoading(true)
    const [spaceRes, activityRes, viewRes] = await Promise.all([
      spaces.get(spaceId),
      spaces.getActivity(spaceId),
      spaces.getView(spaceId, user.id),
    ])
    setSpaceDetail({
      space: spaceRes.data,
      members: spaceRes.data?.space_members || [],
      transactions: viewRes.data || [],
      activity: activityRes.data || [],
    })
    setViewLoading(false)
  }

  async function createSpace() {
    if (!createForm.name) return
    setSaving(true)
    const { data: space } = await spaces.create({ ...createForm, created_by: user.id })
    if (space) {
      // Add creator as owner member
      await spaces.addMember({
        space_id: space.id,
        user_id: user.id,
        display_name: profile?.full_name || profile?.email || 'Me',
        role: 'owner',
        invite_status: 'accepted',
        accepted_at: new Date().toISOString(),
        can_view_others: true, can_add_transactions: true, can_edit_own: true,
        can_edit_others: true, can_invite: true, can_connect_bank: true,
        avatar_color: '#FFD93D',
      })
      await loadSpaces()
      setActiveSpace(space)
    }
    setModal(null)
    setCreateForm({ name: '', space_type: 'couple' })
    setSaving(false)
    showToast('✅ Space created!')
  }

  async function inviteMember() {
    if (!inviteForm.display_name || !activeSpace) return
    setSaving(true)
    const { data } = await spaces.addMember({
      space_id: activeSpace.id,
      display_name: inviteForm.display_name,
      email: inviteForm.email || null,
      role: inviteForm.role,
      invite_status: 'pending',
      can_view_others: true,
      can_add_transactions: inviteForm.role !== 'viewer',
      can_edit_own: inviteForm.role !== 'viewer',
      can_edit_others: inviteForm.role === 'admin',
      can_invite: inviteForm.role === 'admin',
      can_connect_bank: true,
      avatar_color: randomColor(),
    })
    if (data) {
      const link = `${window.location.origin}/join-space/${data.invite_token}`
      navigator.clipboard?.writeText(link)
      showToast('📋 Invite link copied to clipboard!')
    }
    await loadSpaceDetail(activeSpace.id)
    setModal(null)
    setInviteForm({ display_name: '', email: '', role: 'member' })
    setSaving(false)
  }

  async function addTransaction() {
    if (!txnForm.description || !txnForm.amount || !activeSpace) return
    setSaving(true)
    await spaces.addTransaction({
      space_id: activeSpace.id,
      added_by_user_id: user.id,
      added_by_name: profile?.full_name || 'Me',
      description: txnForm.description,
      amount: -Math.abs(parseFloat(txnForm.amount)),
      transaction_date: new Date(txnForm.transaction_date).toISOString(),
      payment_method: txnForm.payment_method,
      category_id: txnForm.category_id || null,
      visible_to: 'all',
    })
    await loadSpaceDetail(activeSpace.id)
    setModal(null)
    setTxnForm({ description: '', amount: '', transaction_date: new Date().toISOString().split('T')[0], payment_method: 'card', category_id: '' })
    setSaving(false)
    showToast('✅ Transaction added to space!')
  }

  async function updateMyPrivacy(field, value) {
    if (!myMember) return
    await spaces.updateMyPrivacy(activeSpace.id, user.id, { [field]: value })
    await loadSpaceDetail(activeSpace.id)
    showToast('Privacy settings updated.')
  }

  async function updateMemberPerms(memberId, field, value) {
    await spaces.updatePermissions(memberId, { [field]: value })
    await loadSpaceDetail(activeSpace.id)
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 2500) }
  function randomColor() { return ['#6BCB77','#4ECDC4','#C77DFF','#FF9A3C','#FF6B6B'][Math.floor(Math.random()*5)] }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: '#9C9A94', fontSize: 13 }}>Loading your spaces…</div>

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 16, height: 'calc(100vh - 100px)', overflow: 'hidden' }}>

      {/* ── LEFT: Space list ── */}
      <div style={{ background: '#fff', border: '1px solid #E8E6E0', borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #E8E6E0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Shared Spaces</div>
          <button onClick={() => setModal('create')} style={{ width: 26, height: 26, borderRadius: '50%', background: '#FFD93D', border: 'none', cursor: 'pointer', fontSize: 16, color: '#7A5C00', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {mySpaces.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: '#9C9A94' }}>
              <i className="ti ti-users" style={{ fontSize: 28, display: 'block', marginBottom: 8 }} />
              <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 4 }}>No spaces yet</div>
              <div style={{ fontSize: 11 }}>Create a space to share finances with someone</div>
              <button onClick={() => setModal('create')} style={{ marginTop: 10, padding: '6px 14px', background: '#FFD93D', color: '#7A5C00', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Create space</button>
            </div>
          ) : mySpaces.map(sp => {
            const icon = SPACE_TYPE_IDS.find(t => t.id === sp.space_type)?.icon || '✨'
            const isActive = activeSpace?.id === sp.id
            const memberCount = sp.space_members?.length || 0
            return (
              <button key={sp.id} onClick={() => setActiveSpace(sp)} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', width: '100%',
                background: isActive ? '#FFF8DC' : 'transparent', border: 'none',
                borderLeft: `3px solid ${isActive ? '#E6BE00' : 'transparent'}`,
                cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'all 0.12s',
              }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: isActive ? '#FFD93D' : '#F5F4F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: isActive ? 600 : 400, color: isActive ? '#7A5C00' : '#1A1A18', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sp.name}</div>
                  <div style={{ fontSize: 10, color: '#9C9A94' }}>{memberCount} member{memberCount !== 1 ? 's' : ''} · {sp.myRole}</div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── RIGHT: Space detail ── */}
      <div style={{ background: '#fff', border: '1px solid #E8E6E0', borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {!activeSpace ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9C9A94', flexDirection: 'column', gap: 8 }}>
            <i className="ti ti-users" style={{ fontSize: 32 }} />
            <div style={{ fontSize: 13 }}>Select or create a space</div>
          </div>
        ) : (
          <>
            {/* Space header */}
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #E8E6E0', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{activeSpace.name}</div>
                  <div style={{ fontSize: 11, color: '#9C9A94', marginTop: 1 }}>
                    {spaceDetail?.members?.length || 0} members · {spaceDetail?.transactions?.length || 0} shared transactions
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {myMember?.can_invite && (
                    <button onClick={() => setModal('invite')} style={secondaryBtn}>
                      <i className="ti ti-user-plus" style={{ fontSize: 13 }} /> Invite
                    </button>
                  )}
                  {myMember?.can_add_transactions && (
                    <button onClick={() => setModal('add_txn')} style={primaryBtn2}>
                      <i className="ti ti-plus" style={{ fontSize: 13 }} /> Add transaction
                    </button>
                  )}
                </div>
              </div>

              {/* Member avatars */}
              <div style={{ display: 'flex', gap: 6, marginTop: 10, alignItems: 'center' }}>
                {(spaceDetail?.members || []).map(m => (
                  <div key={m.id} title={m.display_name} style={{ position: 'relative' }}>
                    <MemberAvatar member={m} size={30} />
                    {m.shares_transactions && (
                      <div style={{ position: 'absolute', bottom: -2, right: -2, width: 10, height: 10, borderRadius: '50%', background: '#6BCB77', border: '1.5px solid #fff' }} title='Sharing transactions' />
                    )}
                  </div>
                ))}
                {myMember?.can_invite && (
                  <button onClick={() => setModal('invite')} style={{ width: 30, height: 30, borderRadius: '50%', background: '#F5F4F0', border: '1px dashed #D0CEC8', cursor: 'pointer', fontSize: 16, color: '#9C9A94', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                )}
              </div>

              {/* Tab bar */}
              <div style={{ display: 'flex', gap: 0, marginTop: 12, borderBottom: '1px solid #E8E6E0' }}>
                {[['transactions',t('spaces_transactions_tab')],['members',t('spaces_members_tab')],['activity',t('spaces_activity_tab')]].map(([id, label]) => (
                  <button key={id} onClick={() => setSpaceView(id)} style={{
                    padding: '7px 14px', border: 'none', background: 'none', cursor: 'pointer',
                    fontSize: 12, fontFamily: 'inherit', fontWeight: spaceView === id ? 600 : 400,
                    color: spaceView === id ? '#7A5C00' : '#5C5A54',
                    borderBottom: `2px solid ${spaceView === id ? '#E6BE00' : 'transparent'}`,
                  }}>{label}</button>
                ))}
              </div>
            </div>

            {/* Tab content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
              {viewLoading ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#9C9A94', fontSize: 13 }}>Loading…</div>
              ) : spaceView === 'transactions' ? (
                <TransactionView txns={spaceDetail?.transactions || []} myUserId={user.id} cats={cats} />
              ) : spaceView === 'members' ? (
                <MembersView
                  members={spaceDetail?.members || []}
                  myMember={myMember}
                  myUserId={user.id}
                  onUpdatePrivacy={updateMyPrivacy}
                  onUpdatePerms={updateMemberPerms}
                  onInviteLink={(token) => { navigator.clipboard?.writeText(`${window.location.origin}/join-space/${token}`); showToast('📋 Invite link copied!') }}
                  onRemove={async (id) => { await spaces.removeMember(id); await loadSpaceDetail(activeSpace.id); showToast('Member removed.') }}
                />
              ) : (
                <ActivityView activity={spaceDetail?.activity || []} />
              )}
            </div>
          </>
        )}
      </div>

      {/* ── MODALS ── */}

      {/* Create space */}
      {modal === 'create' && (
        <Modal title={t('spaces_create_title')} onClose={() => setModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label={t('spaces_name')} value={createForm.name} onChange={v => setCreateForm(p=>({...p,name:v}))} placeholder={t('spaces_name_ph')} />
            <div>
              <label style={labelStyle}>Type</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 6 }}>
                {SPACE_TYPE_IDS.map(st => (
                  <button key={st.id} onClick={() => setCreateForm(p=>({...p,space_type:st.id}))} style={{
                    padding: '8px', border: '1.5px solid', fontFamily: 'inherit', textAlign: 'left',
                    borderColor: createForm.space_type === st.id ? '#E6BE00' : '#E8E6E0',
                    background: createForm.space_type === st.id ? '#FFF8DC' : '#fff',
                    color: createForm.space_type === st.id ? '#7A5C00' : '#5C5A54',
                    borderRadius: 8, fontSize: 12, fontWeight: createForm.space_type === st.id ? 600 : 400, cursor: 'pointer',
                  }}>{st.icon} {t(st.key)}</button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button onClick={() => setModal(null)} style={cancelBtn}>Cancel</button>
              <button onClick={createSpace} disabled={saving} style={primaryBtn2}>{saving ? 'Creating…' : 'Create space'}</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Invite member */}
      {modal === 'invite' && (
        <Modal title={t('spaces_invite_title')} onClose={() => setModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label={t('spaces_their_name')} value={inviteForm.display_name} onChange={v => setInviteForm(p=>({...p,display_name:v}))} placeholder="e.g. Marcus" />
            <Field label={t('spaces_email_opt')} value={inviteForm.email} onChange={v => setInviteForm(p=>({...p,email:v}))} placeholder="they@example.com" type="email" />
            <div>
              <label style={labelStyle}>Role</label>
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                {[['viewer','👁 View only'],['member','✏️ Member'],['admin','⚙️ Admin']].map(([val,label]) => (
                  <button key={val} onClick={() => setInviteForm(p=>({...p,role:val}))} style={{
                    flex: 1, padding: '8px 4px', border: '1.5px solid', fontFamily: 'inherit', fontSize: 11,
                    borderColor: inviteForm.role === val ? '#E6BE00' : '#E8E6E0',
                    background: inviteForm.role === val ? '#FFF8DC' : '#fff',
                    color: inviteForm.role === val ? '#7A5C00' : '#5C5A54',
                    borderRadius: 8, fontWeight: inviteForm.role === val ? 600 : 400, cursor: 'pointer',
                  }}>{label}</button>
                ))}
              </div>
              <div style={{ fontSize: 10, color: '#9C9A94', marginTop: 6 }}>
                {inviteForm.role === 'viewer' ? 'Can only view transactions you choose to share with them.'
                  : inviteForm.role === 'member' ? 'Can view shared transactions and add their own.'
                  : 'Full access — can invite others, edit transactions, manage permissions.'}
              </div>
            </div>
            <InfoBox>An invite link will be copied to your clipboard — share it however you like. They don't need MoneyBio yet.</InfoBox>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setModal(null)} style={cancelBtn}>Cancel</button>
              <button onClick={inviteMember} disabled={saving} style={primaryBtn2}>{saving ? 'Generating link…' : '📋 Generate & copy invite link'}</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add transaction to space */}
      {modal === 'add_txn' && (
        <Modal title={`Add transaction to ${activeSpace?.name}`} onClose={() => setModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label={t('spaces_description')} value={txnForm.description} onChange={v => setTxnForm(p=>({...p,description:v}))} placeholder="e.g. Groceries, Rent, Utilities" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <Field label={t('expenses_amount')} value={txnForm.amount} onChange={v => setTxnForm(p=>({...p,amount:v}))} placeholder="0.00" type="number" />
              <Field label={t('income_date')} value={txnForm.transaction_date} onChange={v => setTxnForm(p=>({...p,transaction_date:v}))} type="date" />
            </div>
            <div>
              <label style={labelStyle}>Category</label>
              <select value={txnForm.category_id} onChange={e => setTxnForm(p=>({...p,category_id:e.target.value}))} style={{ ...selectStyle, marginTop: 5 }}>
                <option value="">{t('sharing_select_category')}</option>
                {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Payment method</label>
              <select value={txnForm.payment_method} onChange={e => setTxnForm(p=>({...p,payment_method:e.target.value}))} style={{ ...selectStyle, marginTop: 5 }}>
                {['card','cash','apple_pay','google_pay','bank_transfer'].map(m => <option key={m} value={m}>{m.replace('_',' ')}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button onClick={() => setModal(null)} style={cancelBtn}>Cancel</button>
              <button onClick={addTransaction} disabled={saving} style={primaryBtn2}>{saving ? 'Adding…' : 'Add to space'}</button>
            </div>
          </div>
        </Modal>
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#1A1A18', color: '#fff', padding: '10px 20px', borderRadius: 20, fontSize: 13, fontWeight: 500, zIndex: 200 }}>
          {toast}
        </div>
      )}
    </div>
  )
}

// ── Transaction view ──────────────────────────────────────────
function TransactionView({ txns, myUserId, cats }) {
  if (txns.length === 0) return (
    <div style={{ textAlign: 'center', padding: '48px 24px', color: '#9C9A94' }}>
      <i className="ti ti-receipt" style={{ fontSize: 32, display: 'block', marginBottom: 10 }} />
      <div style={{ fontSize: 13, fontWeight: 500 }}>No transactions yet</div>
      <div style={{ fontSize: 11, marginTop: 4 }}>Add transactions or ask a member to share their spending</div>
    </div>
  )
  return (
    <div>
      {txns.map((txn, i) => {
        const isOwn = txn.is_own
        const amtHidden = !txn.amounts_visible
        const merchantHidden = !txn.merchant_visible
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #F0EEE8' }}>
            {/* Source indicator */}
            <div style={{ width: 6, flexShrink: 0, alignSelf: 'stretch', background: isOwn ? '#FFD93D' : txn.source === 'shared' ? '#6BCB77' : '#4ECDC4', borderRadius: 3 }} />
            <div style={{ width: 34, height: 34, borderRadius: 10, background: '#F5F4F0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12, fontWeight: 700, color: '#5C5A54' }}>
              {txn.added_by_name?.[0]?.toUpperCase() || '?'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {merchantHidden ? '••••••' : (txn.merchant_name || txn.description)}
              </div>
              <div style={{ fontSize: 11, color: '#9C9A94', display: 'flex', gap: 6, alignItems: 'center' }}>
                <span>{txn.added_by_name}</span>
                {txn.category_name && <><span>·</span><span>{txn.category_name}</span></>}
                {txn.transaction_date && <><span>·</span><span>{new Date(txn.transaction_date).toLocaleDateString()}</span></>}
                <span style={{ background: txn.source === 'shared' ? '#E8F5E9' : '#FFF8DC', color: txn.source === 'shared' ? '#1A4D1F' : '#7A5C00', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>
                  {txn.source === 'shared' ? t('spaces_from_ledger') : t('spaces_added_to')}
                </span>
              </div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: amtHidden ? '#9C9A94' : '#8B0000', flexShrink: 0 }}>
              {amtHidden ? '••••' : `-$${Math.abs(txn.amount || 0).toFixed(2)}`}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Members & permissions view ────────────────────────────────
function MembersView({ members, myMember, myUserId, onUpdatePrivacy, onUpdatePerms, onInviteLink, onRemove }) {
  const [expandedId, setExpandedId] = useState(null)
  const isOwner = myMember?.role === 'owner'
  const isAdmin = myMember?.role === 'admin' || isOwner

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* My privacy settings first */}
      {myMember && (
        <div style={{ background: '#FFF8DC', border: '1px solid #FFD93D40', borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#7A5C00', marginBottom: 10 }}>My privacy settings — what I share with this space</div>
          {Object.entries(PRIVACY_KEYS).map(([key, labelKey]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0' }}>
              <span style={{ fontSize: 12, color: '#1A1A18' }}>{t(labelKey)}</span>
              <Toggle value={myMember[key]} onChange={v => onUpdatePrivacy(key, v)} />
            </div>
          ))}
        </div>
      )}

      {/* Other members */}
      {members.filter(m => m.user_id !== myUserId).map(m => (
        <div key={m.id} style={{ background: '#fff', border: '1px solid #E8E6E0', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, cursor: 'pointer' }} onClick={() => setExpandedId(expandedId === m.id ? null : m.id)}>
            <MemberAvatar member={m} size={36} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{m.display_name}</span>
                <span style={{ fontSize: 10, background: m.role === 'owner' ? '#FFD93D' : m.role === 'admin' ? '#4ECDC4' : '#F5F4F0', color: m.role === 'owner' ? '#7A5C00' : m.role === 'admin' ? '#0D4D4A' : '#5C5A54', padding: '1px 7px', borderRadius: 10, fontWeight: 500 }}>{m.role}</span>
                {m.invite_status === 'pending' && <span style={{ fontSize: 10, background: '#FFF8DC', color: '#7A5C00', padding: '1px 7px', borderRadius: 10 }}>Invited</span>}
              </div>
              <div style={{ fontSize: 11, color: '#9C9A94' }}>
                {m.shares_transactions ? '🟢 Sharing transactions' : '⚫ Not sharing'}
                {m.email && ` · ${m.email}`}
              </div>
            </div>
            <i className={`ti ${expandedId === m.id ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ color: '#9C9A94', fontSize: 14 }} />
          </div>

          {expandedId === m.id && (
            <div style={{ borderTop: '1px solid #F0EEE8', padding: 14, background: '#FAFAF8' }}>
              {/* Permissions (admin/owner can change) */}
              {isAdmin && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#5C5A54', marginBottom: 8 }}>Permissions</div>
                  {Object.entries(PERM_KEYS).map(([key, labelKey]) => (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
                      <span style={{ fontSize: 11, color: '#1A1A18' }}>{t(labelKey)}</span>
                      <Toggle value={m[key]} onChange={v => onUpdatePerms(m.id, key, v)} />
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: 6 }}>
                {m.invite_status === 'pending' && (
                  <button onClick={() => onInviteLink(m.invite_token)} style={{ padding: '5px 10px', background: '#FFF8DC', color: '#7A5C00', border: 'none', borderRadius: 7, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>📋 Re-copy invite link</button>
                )}
                {isAdmin && m.role !== 'owner' && (
                  <button onClick={() => onRemove(m.id)} style={{ padding: '5px 10px', background: '#FFEBEE', color: '#8B0000', border: 'none', borderRadius: 7, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>Remove</button>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Activity view ─────────────────────────────────────────────
function ActivityView({ activity }) {
  const icons = { member_joined: '👋', member_invited: '📨', transaction_added: '💸', transaction_edited: '✏️', transaction_deleted: '🗑', bank_connected: '🏦', privacy_updated: '🔒', permission_changed: '⚙️' }
  if (activity.length === 0) return <div style={{ textAlign: 'center', padding: '48px 24px', color: '#9C9A94', fontSize: 13 }}>No activity yet.</div>
  return (
    <div>
      {activity.map((a, i) => (
        <div key={i} style={{ display: 'flex', gap: 12, padding: '9px 0', borderBottom: '1px solid #F0EEE8' }}>
          <div style={{ fontSize: 18, width: 28, flexShrink: 0 }}>{icons[a.event_type] || '•'}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13 }}>
              <strong>{a.actor_name}</strong>{' '}
              {a.event_type.replace(/_/g, ' ')}
              {a.event_data?.description ? ` — "${a.event_data.description}"` : ''}
            </div>
            <div style={{ fontSize: 11, color: '#9C9A94', marginTop: 1 }}>{new Date(a.created_at).toLocaleString()}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Small components ──────────────────────────────────────────
function MemberAvatar({ member, size = 32 }) {
  const colors = ['#FFD93D','#6BCB77','#4ECDC4','#C77DFF','#FF9A3C']
  const color = member.avatar_color || colors[member.display_name?.charCodeAt(0) % colors.length] || '#FFD93D'
  const initials = member.display_name?.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2) || '?'
  return (
    <div title={member.display_name} style={{ width: size, height: size, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size*0.36, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
      {member.user_id ? initials : '?'}
    </div>
  )
}

function Toggle({ value, onChange }) {
  return (
    <button onClick={() => onChange(!value)} style={{ width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer', background: value ? '#FFD93D' : '#D0CEC8', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
      <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: value ? 18 : 2, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
    </button>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{title}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9C9A94', fontSize: 20 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', padding: '8px 10px', border: '1px solid #D0CEC8', borderRadius: 7, fontSize: 13, outline: 'none', fontFamily: 'inherit', marginTop: 5 }} />
    </div>
  )
}

function InfoBox({ children }) {
  return <div style={{ background: '#F5F4F0', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#5C5A54', lineHeight: 1.5 }}>{children}</div>
}

const labelStyle = { fontSize: 11, fontWeight: 500, color: '#5C5A54', display: 'block' }
const selectStyle = { width: '100%', padding: '8px 10px', border: '1px solid #D0CEC8', borderRadius: 7, fontSize: 13, fontFamily: 'inherit' }
const primaryBtn2 = { display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', background: '#FFD93D', color: '#7A5C00', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }
const secondaryBtn = { display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', background: '#fff', color: '#5C5A54', border: '1px solid #D0CEC8', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }
const cancelBtn = { flex: 1, padding: '9px', background: '#fff', border: '1px solid #D0CEC8', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }
