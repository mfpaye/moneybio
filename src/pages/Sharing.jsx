import { useState, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import { useT } from '../lib/i18n.jsx'
import { sharing, transactions, categories } from '../lib/supabase'

const VIEWS = ['all', 'shared_by_me', 'shared_with_me']

export default function Sharing() {
  const { user, profile } = useAuth()
  const t = useT()

  const [view, setView] = useState('all')             // all | recipient:<id> | shared_with_me
  const [recipients, setRecipients] = useState([])
  const [summary, setSummary] = useState([])
  const [sharedWithMe, setSharedWithMe] = useState([])
  const [allTxns, setAllTxns] = useState([])
  const [sharedTxns, setSharedTxns] = useState([])
  const [cats, setCats] = useState([])
  const [loading, setLoading] = useState(true)

  // Modals
  const [showAddRecipient, setShowAddRecipient] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [selectedRecipient, setSelectedRecipient] = useState(null)
  const [selectedTxn, setSelectedTxn] = useState(null)

  // Forms
  const [recipientForm, setRecipientForm] = useState({ recipient_name: '', recipient_email: '', nickname: '', access_level: 'view' })
  const [shareForm, setShareForm] = useState({ share_type: 'transaction', include_amounts: true, include_merchant: true, include_receipt: false })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => { if (user) loadData() }, [user])
  useEffect(() => { if (user && view.startsWith('recipient:')) loadSharedWith(view.split(':')[1]) }, [view])

  async function loadData() {
    setLoading(true)
    const [recRes, sumRes, swmRes, txnRes, catRes] = await Promise.all([
      sharing.listRecipients(user.id),
      sharing.getSummary(user.id),
      sharing.sharedWithMe(user.id),
      transactions.list(user.id, { limit: 200 }),
      categories.list(user.id),
    ])
    setRecipients(recRes.data || [])
    setSummary(sumRes.data || [])
    setSharedWithMe(swmRes.data || [])
    setAllTxns(txnRes.data || [])
    setCats(catRes.data || [])
    setLoading(false)
  }

  async function loadSharedWith(recipientId) {
    const { data } = await sharing.getSharedWith(user.id, recipientId)
    setSharedTxns(data || [])
  }

  async function addRecipient() {
    if (!recipientForm.recipient_name) return
    setSaving(true)
    const { data, error } = await sharing.addRecipient({ ...recipientForm, owner_id: user.id })
    if (!error && data) {
      setRecipients(prev => [data, ...prev])
      setShowAddRecipient(false)
      setRecipientForm({ recipient_name: '', recipient_email: '', nickname: '', access_level: 'view' })
      showToast('✅ Person added! Invite link ready to share.')
      await loadData()
    }
    setSaving(false)
  }

  async function doShare() {
    if (!selectedRecipient) return
    setSaving(true)
    let result
    if (shareForm.share_type === 'transaction' && selectedTxn) {
      result = await sharing.shareTransaction(user.id, selectedRecipient.id, selectedTxn.id, shareForm)
    } else if (shareForm.share_type === 'category' && shareForm.category_id) {
      result = await sharing.shareCategory(user.id, selectedRecipient.id, shareForm.category_id, shareForm)
    } else if (shareForm.share_type === 'date_range') {
      result = await sharing.shareDateRange(user.id, selectedRecipient.id, shareForm.date_from, shareForm.date_to, shareForm)
    } else if (shareForm.share_type === 'all') {
      result = await sharing.shareAll(user.id, selectedRecipient.id, shareForm)
    }
    if (!result?.error) {
      setShowShareModal(false)
      setSelectedTxn(null)
      showToast(`✅ Shared with ${selectedRecipient.recipient_name}!`)
      await loadData()
    }
    setSaving(false)
  }

  async function revokeShare(shareId) {
    await sharing.revokeShare(shareId)
    showToast('Share removed.')
    await loadData()
    if (view.startsWith('recipient:')) loadSharedWith(view.split(':')[1])
  }

  async function removeRecipient(id) {
    await sharing.revokeAllForRecipient(id)
    await sharing.removeRecipient(id)
    showToast('Person and all their shares removed.')
    setView('all')
    await loadData()
  }

  function copyInviteLink(token) {
    const url = `${window.location.origin}/invite/${token}`
    navigator.clipboard?.writeText(url)
    showToast('📋 Invite link copied!')
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  // Derive displayed transactions based on current view
  const activeRecipientId = view.startsWith('recipient:') ? view.split(':')[1] : null
  const activeRecipient = recipients.find(r => r.id === activeRecipientId)

  const displayedTxns = view === 'all' ? allTxns
    : view === 'shared_with_me' ? sharedWithMe.flatMap(r => r.transaction_shares?.flatMap(s => s.transactions ? [s.transactions] : []) || [])
    : sharedTxns

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: '#9C9A94' }}>Loading sharing…</div>

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16, height: 'calc(100vh - 100px)', overflow: 'hidden' }}>

      {/* ── LEFT PANEL: Recipients + views ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, overflow: 'hidden' }}>
        <div style={{ background: '#fff', border: '1px solid #E8E6E0', borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' }}>

          {/* Header */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #E8E6E0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Sharing</div>
            <button onClick={() => setShowAddRecipient(true)} style={{ width: 26, height: 26, borderRadius: '50%', background: '#FFD93D', border: 'none', cursor: 'pointer', fontSize: 16, color: '#7A5C00', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
          </div>

          <div style={{ overflowY: 'auto', flex: 1 }}>
            {/* View: All my transactions */}
            <ViewItem
              icon="ti-list" label={t('sharing_all')}
              sub={`${allTxns.length} transactions`}
              active={view === 'all'}
              onClick={() => setView('all')}
            />
            {/* View: Shared with me */}
            {sharedWithMe.length > 0 && (
              <ViewItem
                icon="ti-users" label={t('sharing_with_me')}
                sub={`From ${sharedWithMe.length} ${sharedWithMe.length === 1 ? 'person' : 'people'}`}
                active={view === 'shared_with_me'}
                onClick={() => setView('shared_with_me')}
              />
            )}

            {/* Recipients */}
            {recipients.length > 0 && (
              <div style={{ padding: '10px 16px 4px', fontSize: 10, fontWeight: 600, color: '#9C9A94', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Shared by me
              </div>
            )}
            {recipients.map(r => {
              const sum = summary.find(s => s.recipient_id === r.id)
              const isActive = view === `recipient:${r.id}`
              return (
                <div key={r.id}>
                  <ViewItem
                    avatar={r.recipient_name}
                    label={r.nickname || r.recipient_name}
                    sub={sum ? `${sum.transaction_count || 0} transactions visible` : r.recipient_email || ''}
                    active={isActive}
                    badge={r.invite_status === 'pending' ? 'Invited' : r.recipient_user_id ? 'On app' : null}
                    badgeColor={r.recipient_user_id ? '#E8F5E9' : '#FFF8DC'}
                    badgeText={r.recipient_user_id ? '#1A4D1F' : '#7A5C00'}
                    onClick={() => { setView(`recipient:${r.id}`); setSelectedRecipient(r) }}
                  />
                  {isActive && (
                    <div style={{ padding: '0 12px 10px', display: 'flex', gap: 6 }}>
                      <button onClick={() => { setShowShareModal(true); setSelectedRecipient(r) }} style={miniBtn('#FFF8DC','#7A5C00')}>+ Share more</button>
                      {r.invite_status === 'pending' && (
                        <button onClick={() => copyInviteLink(r.invite_token)} style={miniBtn('#F5F4F0','#5C5A54')}>📋 Copy link</button>
                      )}
                      <button onClick={() => removeRecipient(r.id)} style={miniBtn('#FFEBEE','#8B0000')}>Remove</button>
                    </div>
                  )}
                </div>
              )
            })}

            {recipients.length === 0 && (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: '#9C9A94' }}>
                <i className="ti ti-users" style={{ fontSize: 28, display: 'block', marginBottom: 8 }} />
                <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 4 }}>No one yet</div>
                <div style={{ fontSize: 11 }}>Add a person to share transactions with them</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL: Transaction list ── */}
      <div style={{ background: '#fff', border: '1px solid #E8E6E0', borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* Panel header */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #E8E6E0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              {view === 'all' ? t('sharing_all')
                : view === 'shared_with_me' ? t('sharing_with_me')
                : `Visible to ${activeRecipient?.nickname || activeRecipient?.recipient_name || 'recipient'}`}
            </div>
            <div style={{ fontSize: 11, color: '#9C9A94', marginTop: 1 }}>
              {view === 'all' ? t('sharing_all_sub')
                : view === 'shared_with_me' ? t('sharing_with_me_sub')
                : `${displayedTxns.length} transaction${displayedTxns.length !== 1 ? 's' : ''} visible to this person`}
            </div>
          </div>
          {view === 'all' && (
            <button onClick={() => setShowShareModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: '#FFD93D', color: '#7A5C00', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
              <i className="ti ti-share" /> Share transactions
            </button>
          )}
        </div>

        {/* Transaction list */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '0 16px' }}>
          {displayedTxns.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 24px', color: '#9C9A94' }}>
              <i className={`ti ${view === 'shared_with_me' ? 'ti-inbox' : 'ti-share'}`} style={{ fontSize: 32, display: 'block', marginBottom: 10 }} />
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
                {view === 'shared_with_me' ? t('sharing_nothing_shared') : t('sharing_nothing_yet')}
              </div>
              {view.startsWith('recipient:') && (
                <button onClick={() => setShowShareModal(true)} style={{ marginTop: 12, padding: '7px 16px', background: '#FFD93D', color: '#7A5C00', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Share some transactions
                </button>
              )}
            </div>
          ) : displayedTxns.map((txn, i) => {
            // Handle both full transaction objects and shared view objects
            const id = txn.transaction_id || txn.id
            const desc = txn.description
            const amt = txn.amount
            const date = txn.transaction_date
            const merchant = txn.merchant_name
            const catName = txn.category_name || txn.categories?.name
            const catColor = txn.category_color || txn.categories?.color || '#9C9A94'
            const shareType = txn.share_type
            const amtsHidden = txn.include_amounts === false

            return (
              <div key={id || i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #F0EEE8' }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: catColor + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className="ti ti-tag" style={{ color: catColor, fontSize: 16 }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {merchant || desc}
                  </div>
                  <div style={{ fontSize: 11, color: '#9C9A94', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    {catName && <span>{catName}</span>}
                    {date && <><span>·</span><span>{new Date(date).toLocaleDateString()}</span></>}
                    {shareType && (
                      <span style={{ background: '#F5F4F0', color: '#5C5A54', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>
                        {shareType === 'all' ? '🔓 Full access' : shareType === 'category' ? '📂 Category' : shareType === 'date_range' ? '📅 Date range' : '📌 Pinned'}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                  {amtsHidden
                    ? <span style={{ fontSize: 13, color: '#9C9A94' }}>••••</span>
                    : amt != null && <span style={{ fontSize: 13, fontWeight: 600, color: amt < 0 ? '#8B0000' : '#1A4D1F' }}>{amt < 0 ? '-' : '+'}${Math.abs(amt).toFixed(2)}</span>}
                  {/* Share / revoke button */}
                  {view === 'all' ? (
                    <button onClick={() => { setSelectedTxn({ id, description: desc, amount: amt }); setShowShareModal(true) }} style={{ padding: '4px 10px', background: '#F5F4F0', border: 'none', borderRadius: 8, fontSize: 11, cursor: 'pointer', color: '#5C5A54', fontFamily: 'inherit' }}>
                      <i className="ti ti-share" style={{ fontSize: 12 }} /> Share
                    </button>
                  ) : view.startsWith('recipient:') && txn.share_id ? (
                    <button onClick={() => revokeShare(txn.share_id)} style={{ padding: '4px 10px', background: '#FFEBEE', border: 'none', borderRadius: 8, fontSize: 11, cursor: 'pointer', color: '#8B0000', fontFamily: 'inherit' }}>
                      Revoke
                    </button>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── ADD RECIPIENT MODAL ── */}
      {showAddRecipient && (
        <Modal title={t('sharing_add_modal_title')} onClose={() => setShowAddRecipient(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label={t('sharing_name')} value={recipientForm.recipient_name} onChange={v => setRecipientForm(p=>({...p,recipient_name:v}))} placeholder={t('sharing_name_ph')} />
            <Field label={t('sharing_email')} value={recipientForm.recipient_email} onChange={v => setRecipientForm(p=>({...p,recipient_email:v}))} placeholder="they@example.com" type="email" />
            <Field label={t('sharing_nickname')} value={recipientForm.nickname} onChange={v => setRecipientForm(p=>({...p,nickname:v}))} placeholder="e.g. My accountant" />
            <div>
              <label style={labelStyle}>Access level</label>
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                {[['view','👁 View only'],['comment','💬 Can comment']].map(([val,label]) => (
                  <button key={val} onClick={() => setRecipientForm(p=>({...p,access_level:val}))} style={{
                    flex: 1, padding: '8px', border: '1.5px solid', fontFamily: 'inherit',
                    borderColor: recipientForm.access_level === val ? '#E6BE00' : '#E8E6E0',
                    background: recipientForm.access_level === val ? '#FFF8DC' : '#fff',
                    color: recipientForm.access_level === val ? '#7A5C00' : '#5C5A54',
                    borderRadius: 8, fontSize: 12, fontWeight: recipientForm.access_level === val ? 600 : 400, cursor: 'pointer',
                  }}>{label}</button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button onClick={() => setShowAddRecipient(false)} style={cancelBtn}>Cancel</button>
              <button onClick={addRecipient} disabled={saving} style={primaryBtn}>
                {saving ? t('sharing_adding') : t('sharing_add_person')}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── SHARE MODAL ── */}
      {showShareModal && (
        <Modal
          title={selectedTxn ? `Share "${selectedTxn.description || 'transaction'}"` : t('sharing_invite_label')}
          onClose={() => { setShowShareModal(false); setSelectedTxn(null) }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Pick recipient if not already selected */}
            {!selectedRecipient ? (
              <div>
                <label style={labelStyle}>Share with</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                  {recipients.map(r => (
                    <button key={r.id} onClick={() => setSelectedRecipient(r)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1.5px solid #E8E6E0', borderRadius: 10, background: '#fff', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                      <Avatar name={r.recipient_name} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{r.nickname || r.recipient_name}</div>
                        <div style={{ fontSize: 11, color: '#9C9A94' }}>{r.recipient_email || (r.recipient_user_id ? 'On MoneyBio' : 'Invite pending')}</div>
                      </div>
                    </button>
                  ))}
                  {recipients.length === 0 && (
                    <div style={{ textAlign: 'center', padding: 16, color: '#9C9A94', fontSize: 13 }}>
                      No one added yet. <button onClick={() => { setShowShareModal(false); setShowAddRecipient(true) }} style={{ color: '#7A5C00', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: 13, fontFamily: 'inherit' }}>Add a person first</button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#FFF8DC', borderRadius: 10 }}>
                  <Avatar name={selectedRecipient.recipient_name} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{selectedRecipient.nickname || selectedRecipient.recipient_name}</div>
                    <div style={{ fontSize: 11, color: '#7A5C00' }}>{selectedRecipient.recipient_email || 'Invite pending'}</div>
                  </div>
                  {!activeRecipientId && <button onClick={() => setSelectedRecipient(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9C9A94', fontSize: 18 }}>×</button>}
                </div>

                {/* What to share — only if not a specific transaction */}
                {!selectedTxn && (
                  <div>
                    <label style={labelStyle}>What to share</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 6 }}>
                      {[
                        ['transaction','📌 Specific transactions'],
                        ['category','📂 A category'],
                        ['date_range','📅 Date range'],
                        ['all','🔓 Everything'],
                      ].map(([val, label]) => (
                        <button key={val} onClick={() => setShareForm(p=>({...p,share_type:val}))} style={{
                          padding: '10px 8px', border: '1.5px solid', fontFamily: 'inherit', textAlign: 'left',
                          borderColor: shareForm.share_type === val ? '#E6BE00' : '#E8E6E0',
                          background: shareForm.share_type === val ? '#FFF8DC' : '#fff',
                          color: shareForm.share_type === val ? '#7A5C00' : '#5C5A54',
                          borderRadius: 8, fontSize: 12, fontWeight: shareForm.share_type === val ? 600 : 400, cursor: 'pointer',
                        }}>{label}</button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Category picker */}
                {shareForm.share_type === 'category' && !selectedTxn && (
                  <div>
                    <label style={labelStyle}>Category</label>
                    <select value={shareForm.category_id || ''} onChange={e => setShareForm(p=>({...p,category_id:e.target.value}))} style={selectStyle}>
                      <option value="">{t('sharing_select_category')}</option>
                      {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                )}

                {/* Date range picker */}
                {shareForm.share_type === 'date_range' && !selectedTxn && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div><label style={labelStyle}>From</label><input type="date" value={shareForm.date_from || ''} onChange={e => setShareForm(p=>({...p,date_from:e.target.value}))} style={inputStyle} /></div>
                    <div><label style={labelStyle}>To</label><input type="date" value={shareForm.date_to || ''} onChange={e => setShareForm(p=>({...p,date_to:e.target.value}))} style={inputStyle} /></div>
                  </div>
                )}

                {/* Privacy toggles */}
                <div style={{ background: '#F5F4F0', borderRadius: 10, padding: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#5C5A54', marginBottom: 8 }}>Privacy controls</div>
                  {[
                    ['include_amounts', t('sharing_show_amounts')],
                    ['include_merchant', t('sharing_show_merchant')],
                    ['include_receipt', t('sharing_show_receipts')],
                    ['include_notes', t('sharing_show_notes')],
                  ].map(([key, label]) => (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0' }}>
                      <span style={{ fontSize: 12, color: '#1A1A18' }}>{label}</span>
                      <Toggle value={shareForm[key]} onChange={v => setShareForm(p=>({...p,[key]:v}))} />
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => { setShowShareModal(false); setSelectedTxn(null) }} style={cancelBtn}>Cancel</button>
                  <button onClick={doShare} disabled={saving} style={primaryBtn}>
                    {saving ? 'Sharing…' : `Share with ${selectedRecipient.recipient_name}`}
                  </button>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#1A1A18', color: '#fff', padding: '10px 20px', borderRadius: 20, fontSize: 13, fontWeight: 500, zIndex: 200 }}>
          {toast}
        </div>
      )}
    </div>
  )
}

// ── Small components ──────────────────────────────────────────
function ViewItem({ icon, avatar, label, sub, active, onClick, badge, badgeColor, badgeText }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', width: '100%',
      background: active ? '#FFF8DC' : 'transparent', border: 'none', borderLeft: '3px solid',
      borderLeftColor: active ? '#E6BE00' : 'transparent', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
      transition: 'all 0.12s',
    }}>
      {avatar ? <Avatar name={avatar} size={28} /> : <i className={`ti ${icon}`} style={{ fontSize: 16, color: active ? '#7A5C00' : '#9C9A94', flexShrink: 0 }} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: active ? 500 : 400, color: active ? '#7A5C00' : '#1A1A18', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
        {sub && <div style={{ fontSize: 10, color: '#9C9A94' }}>{sub}</div>}
      </div>
      {badge && <span style={{ background: badgeColor, color: badgeText, padding: '1px 7px', borderRadius: 10, fontSize: 10, fontWeight: 500, flexShrink: 0 }}>{badge}</span>}
    </button>
  )
}

function Avatar({ name, size = 30 }) {
  const initials = name?.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2) || '?'
  const colors = ['#FFD93D','#6BCB77','#4ECDC4','#C77DFF','#FF9A3C','#FF6B6B']
  const color = colors[name?.charCodeAt(0) % colors.length] || '#FFD93D'
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{initials}</div>
  )
}

function Toggle({ value, onChange }) {
  return (
    <button onClick={() => onChange(!value)} style={{
      width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
      background: value ? '#FFD93D' : '#D0CEC8', position: 'relative', transition: 'background 0.2s', flexShrink: 0,
    }}>
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
        style={{ ...inputStyle, marginTop: 5 }} />
    </div>
  )
}

const labelStyle = { fontSize: 11, fontWeight: 500, color: '#5C5A54', display: 'block' }
const inputStyle = { width: '100%', padding: '8px 10px', border: '1px solid #D0CEC8', borderRadius: 7, fontSize: 13, outline: 'none', fontFamily: 'inherit', display: 'block' }
const selectStyle = { width: '100%', padding: '8px 10px', border: '1px solid #D0CEC8', borderRadius: 7, fontSize: 13, fontFamily: 'inherit', marginTop: 5 }
const primaryBtn = { flex: 1, padding: '9px', background: '#FFD93D', color: '#7A5C00', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }
const cancelBtn = { flex: 1, padding: '9px', background: '#fff', border: '1px solid #D0CEC8', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }
function miniBtn(bg, color) { return { padding: '4px 8px', background: bg, border: 'none', borderRadius: 6, fontSize: 11, cursor: 'pointer', color, fontFamily: 'inherit' } }
