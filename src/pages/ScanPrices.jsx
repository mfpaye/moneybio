import { useT } from '../lib/i18n.jsx'
import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import { multiReceiptScan, listScans, emailReceipts, sharing } from '../lib/supabase'

// ── Simulated AI OCR per photo ────────────────────────────────
const MOCK_RECEIPTS = [
  { merchant_name: 'Kroger', merchant_address: '1234 Peachtree Rd NE, Atlanta GA 30309', receipt_date_str: 'Jul 16, 2026 2:14 PM', payment_method: 'apple_pay', payment_last4: '4242', card_network: 'Visa', wallet_type: 'apple_pay', subtotal: 73.81, tax_amount: 5.17, tip_amount: 0, total_amount: 78.98, line_items: [{ name: 'Organic Whole Milk (1 gal)', qty: 1, unit_price: 5.49, total: 5.49 },{ name: 'Large Eggs (12ct)', qty: 2, unit_price: 3.29, total: 6.58 },{ name: 'Chicken Breast (2 lb)', qty: 1, unit_price: 7.98, total: 7.98 },{ name: 'Sourdough Bread', qty: 1, unit_price: 3.49, total: 3.49 },{ name: 'Bananas (3 lb)', qty: 1, unit_price: 1.29, total: 1.29 },{ name: 'Pasta (16oz)', qty: 3, unit_price: 1.99, total: 5.97 }] },
  { merchant_name: 'CVS Pharmacy', merchant_address: '5678 Peachtree Rd NE, Atlanta GA 30305', receipt_date_str: 'Jul 16, 2026 3:02 PM', payment_method: 'hsa', payment_last4: '8888', card_network: 'Visa', wallet_type: null, subtotal: 44.97, tax_amount: 0, tip_amount: 0, total_amount: 44.97, line_items: [{ name: 'Lisinopril 10mg (30ct)', qty: 1, unit_price: 12.99, total: 12.99 },{ name: 'Vitamin D3 2000IU (60ct)', qty: 1, unit_price: 8.99, total: 8.99 },{ name: 'Bandage Assortment (40ct)', qty: 2, unit_price: 5.99, total: 11.98 },{ name: 'Antacid Tablets (50ct)', qty: 1, unit_price: 7.49, total: 7.49 }] },
  { merchant_name: 'Shell Station', merchant_address: 'I-285 & Peachtree Industrial, Atlanta GA', receipt_date_str: 'Jul 16, 2026 4:30 PM', payment_method: 'google_pay', payment_last4: '1337', card_network: 'Mastercard', wallet_type: 'google_pay', subtotal: 62.10, tax_amount: 0, tip_amount: 0, total_amount: 62.10, line_items: [{ name: 'Regular Unleaded (12.42 gal @ $5.00)', qty: 1, unit_price: 62.10, total: 62.10 }] },
  { merchant_name: 'Chipotle Mexican Grill', merchant_address: '890 West Peachtree St, Atlanta GA 30309', receipt_date_str: 'Jul 16, 2026 12:45 PM', payment_method: 'visa', payment_last4: '5566', card_network: 'Visa', wallet_type: null, subtotal: 29.48, tax_amount: 2.36, tip_amount: 4.00, total_amount: 35.84, line_items: [{ name: 'Burrito Bowl - Chicken', qty: 2, unit_price: 10.75, total: 21.50 },{ name: 'Chips & Guacamole', qty: 1, unit_price: 5.25, total: 5.25 },{ name: 'Fountain Drink', qty: 2, unit_price: 1.00, total: 2.00 }] },
  { merchant_name: 'Target', merchant_address: '375 18th St NW, Atlanta GA 30363', receipt_date_str: 'Jul 15, 2026 11:20 AM', payment_method: 'debit', payment_last4: '3344', card_network: 'Visa', wallet_type: null, subtotal: 67.43, tax_amount: 5.39, tip_amount: 0, total_amount: 72.82, line_items: [{ name: 'Paper Towels (6-pack)', qty: 2, unit_price: 8.99, total: 17.98 },{ name: 'Laundry Detergent (92 loads)', qty: 1, unit_price: 14.99, total: 14.99 },{ name: "Men's T-Shirts (3-pack)", qty: 1, unit_price: 19.99, total: 19.99 },{ name: 'Dish Soap (3-pack)', qty: 1, unit_price: 7.49, total: 7.49 }] },
]

function getWalletLabel(w) {
  return w === 'apple_pay' ? 'Apple Pay' : w === 'google_pay' ? 'Google Pay' : null
}
function getWalletIcon(w) {
  return w === 'apple_pay' ? '📱' : w === 'google_pay' ? '🤖' : null
}
function getPaymentDisplay(item) {
  const wallet = getWalletLabel(item.wallet_type)
  const card = `${item.card_network || ''} ••${item.payment_last4 || '----'}`
  if (wallet) return `${getWalletIcon(item.wallet_type)} ${wallet} → ${card}`
  if (item.payment_method === 'hsa') return `💊 HSA Card ••${item.payment_last4}`
  if (item.payment_method === 'cash') return '💵 Cash'
  return `💳 ${card}`
}

const TAB_IDS = [
  { id: 'multi', icon: 'ti-photos', key: 'scan_tab_receipts' },
  { id: 'list',  icon: 'ti-list-check', key: 'scan_tab_list'  },
  { id: 'email', icon: 'ti-mail',       key: 'scan_tab_email' },
]

export default function ScanPrices() {
  const { user, profile } = useAuth()
  const t = useT()
  const [activeTab, setActiveTab] = useState('multi')

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>{t('scan_title')}</h1>
      <div style={{ display: 'flex', marginBottom: 20, background: '#fff', border: '1px solid #E8E6E0', borderRadius: 12, overflow: 'hidden' }}>
        {TAB_IDS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            flex: 1, padding: '11px 8px', border: 'none', borderRight: '1px solid #E8E6E0', cursor: 'pointer', fontFamily: 'inherit',
            background: activeTab === tab.id ? '#FFD93D' : '#fff',
            color: activeTab === tab.id ? '#7A5C00' : '#5C5A54',
            fontWeight: activeTab === tab.id ? 600 : 400, fontSize: 13,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.15s',
          }}>
            <i className={`ti ${tab.icon}`} style={{ fontSize: 15 }} /> {t(tab.key)}
          </button>
        ))}
      </div>
      {activeTab === 'multi' && <MultiReceiptScan user={user} profile={profile} t={t} />}
      {activeTab === 'list'  && <ListScan  user={user} profile={profile} t={t} />}
      {activeTab === 'email' && <EmailReceipts user={user} t={t} />}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// MULTI-PHOTO RECEIPT SCAN
// Each photo = one receipt. Batch submit, process individually.
// ══════════════════════════════════════════════════════════════
function MultiReceiptScan({ user, profile }) {
  const fileRef = useRef()
  const [stage, setStage]     = useState('idle')    // idle | queued | processing | review | done
  const [queue, setQueue]     = useState([])         // [{file, previewUrl, status, result}]
  const [processingIdx, setProcessingIdx] = useState(0)
  const [contacts, setContacts] = useState([])
  const [saving, setSaving]   = useState(false)
  const [toast, setToast]     = useState('')

  useEffect(() => { sharing.listRecipients(user.id).then(r => setContacts(r.data || [])) }, [user.id])

  // ── Step 1: user picks photos ──
  function handleFileSelect(e) {
    const files = Array.from(e.target.files)
    if (!files.length) return
    const previews = files.map(file => ({
      file,
      previewUrl: URL.createObjectURL(file),
      status: 'queued',   // queued | processing | done | error
      result: null,       // parsed receipt data
      expanded: false,
    }))
    setQueue(previews)
    setStage('queued')
  }

  function removeFromQueue(idx) {
    setQueue(prev => prev.filter((_, i) => i !== idx))
    if (queue.length === 1) setStage('idle')
  }

  // ── Step 2: submit batch → process each one ──
  async function processBatch() {
    setStage('processing')
    const updated = [...queue]
    for (let i = 0; i < updated.length; i++) {
      setProcessingIdx(i)
      updated[i] = { ...updated[i], status: 'processing' }
      setQueue([...updated])

      // Simulate OCR per photo (real: upload → Edge Function → Claude Vision)
      await new Promise(r => setTimeout(r, 1100 + Math.random() * 600))

      const mockData = MOCK_RECEIPTS[i % MOCK_RECEIPTS.length]
      updated[i] = {
        ...updated[i],
        status: 'done',
        result: {
          ...mockData,
          receipt_date: new Date(Date.now() - (queue.length - i) * 3600000).toISOString(),
          photo_taken_at: new Date().toISOString(),
          purchaser_type: 'self',
          purchaser_name: profile?.full_name || 'Me',
          purchaser_user_id: null,
          review_status: 'pending',
          match_status: mockData.payment_method === 'cash' ? 'cash' : 'searching',
        }
      }
      setQueue([...updated])
    }
    setStage('review')
  }

  // ── Item-level updates ──
  function updateResult(idx, field, value) {
    setQueue(prev => {
      const n = [...prev]
      n[idx] = { ...n[idx], result: { ...n[idx].result, [field]: value } }
      return n
    })
  }
  function toggleExpand(idx) {
    setQueue(prev => { const n=[...prev]; n[idx]={...n[idx],expanded:!n[idx].expanded}; return n })
  }

  // ── Confirm all ──
  async function confirmAll() {
    setSaving(true)
    // In production: calls confirm_multi_receipt_item() per item
    await new Promise(r => setTimeout(r, 900))
    setSaving(false)
    setStage('done')
  }

  async function confirmOne(idx) {
    await new Promise(r => setTimeout(r, 500))
    setQueue(prev => { const n=[...prev]; n[idx].result.review_status='confirmed'; return n })
    showToast(`✅ ${queue[idx].result?.merchant_name} saved!`)
  }

  function showToast(m) { setToast(m); setTimeout(() => setToast(''), 2500) }

  const confirmed = queue.filter(q => q.result?.review_status === 'confirmed').length
  const skipped   = queue.filter(q => q.result?.review_status === 'rejected').length
  const pending   = queue.filter(q => q.result?.review_status === 'pending').length

  return (
    <div>
      {/* ── IDLE: drop zone ── */}
      {stage === 'idle' && (
        <>
          <DropZone
            onClick={() => fileRef.current?.click()}
            icon="ti-photos"
            title={t('scan_drop_title')}
            sub={t('scan_drop_sub')}
            extra={t('scan_drop_extra')}
          />
          <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleFileSelect} style={{ display: 'none' }} />
          <InfoBox>{t('scan_drop_extra')}</InfoBox>
        </>
      )}

      {/* ── QUEUED: show thumbnails before processing ── */}
      {stage === 'queued' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{queue.length} photo{queue.length > 1 ? 's' : ''} ready</div>
              <div style={{ fontSize: 12, color: '#9C9A94', marginTop: 1 }}>Add more or tap Submit to process all at once</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => fileRef.current?.click()} style={secondaryBtn}>
                <i className="ti ti-plus" style={{ fontSize: 13 }} /> Add more
              </button>
              <button onClick={processBatch} style={primaryBtn}>
                Submit {queue.length} receipt{queue.length > 1 ? 's' : ''} →
              </button>
            </div>
          </div>

          {/* Photo grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, marginBottom: 14 }}>
            {queue.map((item, idx) => (
              <div key={idx} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid #E8E6E0', aspectRatio: '3/4', background: '#F5F4F0' }}>
                <img src={item.previewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button onClick={() => removeFromQueue(idx)} style={{ position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent,rgba(0,0,0,0.5))', padding: '18px 8px 6px', color: '#fff', fontSize: 10 }}>Receipt {idx + 1}</div>
              </div>
            ))}
            {/* Add more tile */}
            <div onClick={() => fileRef.current?.click()} style={{ borderRadius: 10, border: '2px dashed #D0CEC8', aspectRatio: '3/4', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#9C9A94', gap: 4, transition: 'border-color 0.15s' }}
              onMouseEnter={e=>e.currentTarget.style.borderColor='#E6BE00'} onMouseLeave={e=>e.currentTarget.style.borderColor='#D0CEC8'}>
              <i className="ti ti-plus" style={{ fontSize: 24 }} />
              <span style={{ fontSize: 11 }}>Add photo</span>
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleFileSelect} style={{ display: 'none' }} />
        </>
      )}

      {/* ── PROCESSING: live progress per photo ── */}
      {stage === 'processing' && (
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Processing receipts…</div>
          <div style={{ fontSize: 12, color: '#9C9A94', marginBottom: 16 }}>Reading dates, amounts, and items from each photo</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {queue.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', background: '#fff', border: '1px solid #E8E6E0', borderRadius: 10 }}>
                {/* Thumbnail */}
                <div style={{ width: 40, height: 54, borderRadius: 6, overflow: 'hidden', flexShrink: 0, background: '#F5F4F0' }}>
                  <img src={item.previewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>Receipt {idx + 1}</div>
                  <div style={{ fontSize: 11, color: '#9C9A94', marginTop: 1 }}>
                    {item.status === 'queued'      ? t('scan_waiting')
                    : item.status === 'processing' ? t('scan_scanning')
                    : item.status === 'done'       ? `✅ ${item.result?.merchant_name} · $${item.result?.total_amount?.toFixed(2)}`
                    : 'Error'}
                  </div>
                </div>
                <div style={{ flexShrink: 0 }}>
                  {item.status === 'processing' ? <Spinner size={18} />
                  : item.status === 'done'      ? <span style={{ fontSize: 18 }}>✅</span>
                  : item.status === 'queued'    ? <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#F5F4F0', display: 'block' }} />
                  : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── REVIEW: expand each receipt card ── */}
      {stage === 'review' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{queue.length} receipt{queue.length > 1?'s':''} — review before saving</div>
              <div style={{ fontSize: 11, color: '#9C9A94', marginTop: 2 }}>
                {confirmed > 0 && <span style={{ color: '#1A4D1F' }}>✓ {confirmed} saved</span>}
                {pending > 0   && <span style={{ color: '#7A5C00', marginLeft: 8 }}>⏳ {pending} pending</span>}
                {skipped > 0   && <span style={{ color: '#9C9A94', marginLeft: 8 }}>{skipped} skipped</span>}
              </div>
            </div>
            {pending > 0 && (
              <button onClick={confirmAll} disabled={saving} style={primaryBtn}>
                {saving ? 'Saving…' : `✓ Save all ${pending} remaining`}
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {queue.map((item, idx) => {
              const r = item.result
              if (!r) return null
              const isConfirmed = r.review_status === 'confirmed'
              const isRejected  = r.review_status === 'rejected'

              return (
                <div key={idx} style={{ background: '#fff', border: `1px solid ${isConfirmed?'#6BCB77':isRejected?'#FFD0D0':'#E8E6E0'}`, borderRadius: 14, overflow: 'hidden', opacity: isRejected ? 0.55 : 1, transition: 'opacity 0.2s' }}>
                  {/* Header row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', cursor: 'pointer' }} onClick={() => toggleExpand(idx)}>
                    {/* Thumbnail */}
                    <div style={{ width: 38, height: 52, borderRadius: 6, overflow: 'hidden', flexShrink: 0, background: '#F5F4F0' }}>
                      <img src={item.previewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{r.merchant_name}</div>
                      <div style={{ fontSize: 11, color: '#9C9A94', marginTop: 2 }}>{getPaymentDisplay(r)}</div>
                      <div style={{ fontSize: 10, color: '#9C9A94', marginTop: 2, display: 'flex', gap: 8 }}>
                        {r.receipt_date && <span>🗓 Receipt: {new Date(r.receipt_date).toLocaleString()}</span>}
                        {r.photo_taken_at && <span>📸 Scanned: {new Date(r.photo_taken_at).toLocaleString()}</span>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 700 }}>${r.total_amount?.toFixed(2)}</div>
                      <div style={{ fontSize: 10, color: '#9C9A94' }}>{r.line_items?.length} items</div>
                    </div>
                    <i className={`ti ti-chevron-${item.expanded?'up':'down'}`} style={{ color: '#9C9A94', fontSize: 14, flexShrink: 0 }} />
                  </div>

                  {/* Expanded detail */}
                  {item.expanded && !isRejected && (
                    <div style={{ borderTop: '1px solid #F0EEE8', padding: 14 }}>

                      {/* Purchaser */}
                      <div style={{ marginBottom: 14 }}>
                        <label style={labelStyle}>Who made this purchase?</label>
                        <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                          <Chip label={`Me (${profile?.full_name?.split(' ')[0] || 'You'})`} active={r.purchaser_type==='self'} onClick={() => updateResult(idx,'purchaser_type','self')} />
                          {contacts.map(c => <Chip key={c.id} label={c.nickname||c.recipient_name} active={r.purchaser_type==='app_user'&&r.purchaser_user_id===c.recipient_user_id} onClick={() => { updateResult(idx,'purchaser_type','app_user'); updateResult(idx,'purchaser_user_id',c.recipient_user_id); updateResult(idx,'purchaser_name',c.recipient_name) }} />)}
                          <Chip label={t('scan_other')} active={r.purchaser_type==='named_person'} onClick={() => updateResult(idx,'purchaser_type','named_person')} />
                        </div>
                        {r.purchaser_type==='named_person' && (
                          <input value={r.purchaser_name||''} onChange={e=>updateResult(idx,'purchaser_name',e.target.value)} placeholder={t('scan_other_ph')} style={{ ...inputStyle, marginTop: 8 }} />
                        )}
                      </div>

                      {/* Editable amounts */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
                        {[['subtotal',t('scan_subtotal')],['tax_amount',t('scan_tax')],['total_amount',t('scan_total')]].map(([f,l]) => (
                          <div key={f}>
                            <label style={labelStyle}>{l}</label>
                            <div style={{ display: 'flex', alignItems: 'center', background: '#F5F4F0', border: '1px solid #E8E6E0', borderRadius: 7, padding: '0 8px', marginTop: 4 }}>
                              <span style={{ color: '#9C9A94', fontSize: 12 }}>$</span>
                              <input type="number" value={r[f]||''} step="0.01" onChange={e=>updateResult(idx,f,parseFloat(e.target.value)||0)} style={{ border: 'none', background: 'transparent', fontSize: 13, fontWeight: 600, padding: '7px 4px', width: '100%', outline: 'none', fontFamily: 'inherit' }} />
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Line items */}
                      {r.line_items?.length > 0 && (
                        <div style={{ background: '#FAFAF8', borderRadius: 10, overflow: 'hidden', marginBottom: 12 }}>
                          <div style={{ padding: '8px 12px', fontSize: 11, fontWeight: 600, color: '#5C5A54', borderBottom: '1px solid #F0EEE8', background: '#F5F4F0' }}>
                            Line items ({r.line_items.length})
                          </div>
                          {r.line_items.map((li, j) => (
                            <div key={j} style={{ display: 'flex', gap: 8, padding: '7px 12px', borderBottom: j < r.line_items.length-1 ? '1px solid #F0EEE8' : 'none', fontSize: 12, alignItems: 'center' }}>
                              <span style={{ flex: 1 }}>{li.qty > 1 ? `${li.qty}× ` : ''}{li.name}</span>
                              <span style={{ fontWeight: 600, flexShrink: 0 }}>${li.total?.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Payment detail */}
                      <div style={{ background: '#F5F4F0', borderRadius: 8, padding: '9px 12px', fontSize: 12, color: '#5C5A54', marginBottom: 12 }}>
                        <span style={{ fontWeight: 600 }}>Payment: </span>{getPaymentDisplay(r)}
                        {r.merchant_address && <span style={{ color: '#9C9A94', marginLeft: 10 }}>{r.merchant_address}</span>}
                      </div>

                      {/* Bank match status */}
                      <div style={{ background: r.match_status==='matched'?'#E8F5E9':r.match_status==='cash'?'#FFF8DC':'#F0F7FF', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: '#5C5A54', marginBottom: 12 }}>
                        {r.match_status==='cash'    ? '💵 Cash payment — no bank or wallet link needed'
                        :r.match_status==='matched' ? '✅ Matched to a bank/wallet transaction'
                        :                             '🔍 Will search for matching bank/wallet transaction on save'}
                      </div>

                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => updateResult(idx,'review_status','rejected')} style={{ flex: 1, padding: '8px', background: '#FFEBEE', color: '#8B0000', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                          Skip
                        </button>
                        <button onClick={() => confirmOne(idx)} disabled={isConfirmed} style={{ flex: 2, padding: '8px', background: isConfirmed?'#E8F5E9':'#FFD93D', color: isConfirmed?'#1A4D1F':'#7A5C00', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: isConfirmed?'default':'pointer', fontFamily: 'inherit' }}>
                          {isConfirmed ? t('scan_confirmed') : t('scan_confirm_this')}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Status bar */}
                  <div style={{ padding: '6px 14px', background: isConfirmed?'#E8F5E9':isRejected?'#FFEBEE':'#FFF8DC', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: isConfirmed?'#6BCB77':isRejected?'#FF6B6B':'#FFD93D', flexShrink: 0 }} />
                    <span style={{ fontSize: 11, fontWeight: 500, color: isConfirmed?'#1A4D1F':isRejected?'#8B0000':'#7A5C00' }}>
                      {isConfirmed ? t('scan_saved_linked') : isRejected ? t('scan_skipped') : t('scan_pending')}
                    </span>
                    {r.purchaser_type!=='self' && r.purchaser_name && (
                      <span style={{ fontSize: 11, color: '#9C9A94', marginLeft: 8 }}>· Purchased by {r.purchaser_name}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={() => { setStage('idle'); setQueue([]) }} style={secondaryBtn}>Start over</button>
            {pending > 0 && <button onClick={confirmAll} disabled={saving} style={primaryBtn}>{saving?'Saving…':`✓ Save all ${pending} remaining`}</button>}
          </div>
        </div>
      )}

      {/* ── DONE ── */}
      {stage === 'done' && (
        <div style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>All done!</div>
          <div style={{ fontSize: 13, color: '#9C9A94', marginBottom: 6 }}>
            {queue.filter(q=>q.result?.review_status==='confirmed').length} receipt{queue.filter(q=>q.result?.review_status==='confirmed').length!==1?'s':''} saved and linked to your transactions
          </div>
          <div style={{ fontSize: 12, color: '#9C9A94', marginBottom: 24 }}>Check Expenses to see them — each linked to the right bank, Apple Pay, or Google Pay charge</div>
          <button onClick={() => { setStage('idle'); setQueue([]) }} style={primaryBtn}>Scan more receipts</button>
        </div>
      )}

      {toast && <Toast msg={toast} />}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// LIST SCAN
// ══════════════════════════════════════════════════════════════
function ListScan({ user, profile }) {
  const fileRef = useRef()
  const [stage, setStage] = useState('idle')
  const [previewUrl, setPreviewUrl] = useState(null)
  const [items, setItems] = useState([])
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [contacts, setContacts] = useState([])
  const [listName, setListName] = useState(t('scan_list_default_name'))
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const chatEnd = useRef()

  useEffect(() => { sharing.listRecipients(user.id).then(r => setContacts(r.data || [])) }, [user.id])
  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  function addMsg(role, text) { setMessages(p => [...p, { role, text }]) }

  async function handlePhoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPreviewUrl(URL.createObjectURL(file))
    setStage('processing')
    await new Promise(r => setTimeout(r, 1800))
    const extracted = [
      { item_name: 'Milk', quantity: 1, unit: 'gallon', confidence: 0.98, assignee_type: 'self', assignee_name: profile?.full_name||'Me' },
      { item_name: 'Eggs', quantity: 2, unit: 'dozen', confidence: 0.95, assignee_type: 'self', assignee_name: profile?.full_name||'Me' },
      { item_name: 'Bread', quantity: 1, unit: null, confidence: 0.97, assignee_type: 'self', assignee_name: profile?.full_name||'Me' },
      { item_name: 'Chicken breast', quantity: 2, unit: 'lb', confidence: 0.89, assignee_type: 'self', assignee_name: profile?.full_name||'Me' },
      { item_name: 'Apples', quantity: 6, unit: null, confidence: 0.92, assignee_type: 'self', assignee_name: profile?.full_name||'Me' },
      { item_name: 'Pasta', quantity: 2, unit: null, confidence: 0.85, assignee_type: 'self', assignee_name: profile?.full_name||'Me' },
    ]
    setItems(extracted)
    setMessages([{ role: 'ai', text: `I found **${extracted.length} items** on your list. Let me know if anything needs correcting, or say **"looks good"** to save it!` }])
    setStage('chat')
  }

  function sendChat() {
    const text = input.trim(); if (!text) return
    setInput(''); addMsg('user', text)
    const lower = text.toLowerCase()
    setTimeout(() => {
      if (lower.includes('looks good')||lower.includes('correct')||lower.includes('perfect')||lower.includes('confirm')) { addMsg('ai', "Perfect! Name your list, assign items if needed, then tap Save. ✅"); return }
      if (lower.match(/remove|delete/)) { const m=text.match(/(?:remove|delete)\s+(.+)/i); if(m){const t=m[1].toLowerCase(); setItems(p=>p.filter(i=>!i.item_name.toLowerCase().includes(t))); addMsg('ai',`Removed! Updated list looks good.`); return } }
      if (lower.match(/^add\s/)) { const m=text.match(/^add\s+(.+)/i); if(m){const newItems=m[1].split(/,|\band\b/i).map(s=>({item_name:s.trim(),quantity:1,unit:null,assignee_type:'self',assignee_name:profile?.full_name||'Me'})).filter(i=>i.item_name); setItems(p=>[...p,...newItems]); addMsg('ai',`Added! Anything else?`); return } }
      addMsg('ai', t('voice_anything_else'))
    }, 400)
  }

  async function saveList() {
    setSaving(true)
    await new Promise(r => setTimeout(r, 700))
    setSaving(false); setStage('done')
    setToast(`✅ "${listName}" saved to Shopping List!`)
  }

  return (
    <div>
      {stage === 'idle' && (
        <>
          <DropZone onClick={() => fileRef.current?.click()} icon="ti-list" title={t('scan_list_title')} sub={t('scan_list_sub')} />
          <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} style={{ display: 'none' }} />
          <InfoBox>✏️ After scanning, chat with the AI to add, remove, or fix items. Assign each item to yourself or anyone you share with.</InfoBox>
        </>
      )}
      {stage === 'processing' && <ProcessingScreen icon="📝" title={t('scan_list_reading')} sub={t('scan_list_reading_sub')} />}
      {stage === 'chat' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 14 }}>
          <div style={{ background: '#fff', border: '1px solid #E8E6E0', borderRadius: 14, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid #E8E6E0', fontSize: 12, fontWeight: 600, color: '#5C5A54' }}>Confirm your list</div>
            <div style={{ flex: 1, padding: 14, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 220, maxHeight: 340 }}>
              {messages.map((m, i) => (
                <div key={i} style={{ maxWidth: '88%', alignSelf: m.role==='ai'?'flex-start':'flex-end' }}>
                  <div style={{ padding: '8px 12px', fontSize: 13, lineHeight: 1.5, borderRadius: m.role==='ai'?'4px 12px 12px 12px':'12px 4px 12px 12px', background: m.role==='ai'?'#F5F4F0':'#FFD93D', color: m.role==='ai'?'#1A1A18':'#7A5C00' }}
                    dangerouslySetInnerHTML={{ __html: m.text.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>') }} />
                </div>
              ))}
              <div ref={chatEnd} />
            </div>
            <div style={{ borderTop: '1px solid #E8E6E0', padding: '10px 12px', display: 'flex', gap: 8 }}>
              <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendChat()} placeholder='"looks good", "remove milk", "add butter"…' style={{ flex:1, padding:'7px 11px', border:'1px solid #D0CEC8', borderRadius:20, fontSize:13, outline:'none', fontFamily:'inherit' }} />
              <button onClick={sendChat} style={{ padding:'7px 12px', background:'#FFD93D', color:'#7A5C00', border:'none', borderRadius:20, cursor:'pointer' }}><i className="ti ti-send" /></button>
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #E8E6E0', borderRadius: 14, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '10px 12px', borderBottom: '1px solid #E8E6E0' }}>
              <label style={labelStyle}>List name</label>
              <input value={listName} onChange={e=>setListName(e.target.value)} style={{ ...inputStyle, marginTop: 5, fontSize: 12 }} />
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {items.map((item, idx) => (
                <div key={idx} style={{ padding: '9px 12px', borderBottom: '1px solid #F0EEE8' }}>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 5 }}>
                    <input value={item.item_name} onChange={e=>{const n=[...items];n[idx]={...n[idx],item_name:e.target.value};setItems(n)}} style={{ flex:1, border:'none', fontSize:13, fontWeight:500, outline:'none', background:'transparent', fontFamily:'inherit' }} />
                    <input type="number" value={item.quantity} min={1} onChange={e=>{const n=[...items];n[idx]={...n[idx],quantity:parseInt(e.target.value)||1};setItems(n)}} style={{ width:34, border:'1px solid #E8E6E0', borderRadius:6, padding:'2px 4px', fontSize:11, textAlign:'center', fontFamily:'inherit' }} />
                    {item.unit && <span style={{ fontSize:10, color:'#9C9A94', alignSelf:'center' }}>{item.unit}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    <Chip label={t("scan_me")} active={item.assignee_type==='self'} small onClick={()=>{const n=[...items];n[idx]={...n[idx],assignee_type:'self',assignee_name:profile?.full_name||'Me'};setItems(n)}} />
                    {contacts.slice(0,3).map(c=><Chip key={c.id} label={c.nickname||c.recipient_name} active={item.assignee_type==='app_user'&&item.assignee_user_id===c.recipient_user_id} small onClick={()=>{const n=[...items];n[idx]={...n[idx],assignee_type:'app_user',assignee_user_id:c.recipient_user_id,assignee_name:c.recipient_name};setItems(n)}} />)}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: 10, borderTop: '1px solid #E8E6E0' }}>
              <button onClick={saveList} disabled={saving} style={{ ...primaryBtn, width:'100%', justifyContent:'center' }}>
                {saving?'Saving…':`✓ Save (${items.length} items)`}
              </button>
            </div>
          </div>
        </div>
      )}
      {stage === 'done' && <DoneScreen title={t('scan_list_saved')} sub="Find it in Shopping List — items assigned and ready" onReset={() => { setStage('idle'); setItems([]); setMessages([]) }} resetLabel={t('scan_list_scan_another')} />}
      {toast && <Toast msg={toast} />}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// EMAIL RECEIPTS
// ══════════════════════════════════════════════════════════════
function EmailReceipts({ user }) {
  const mailhook = `receipts+${user?.id?.replace(/-/g,'')}@moneybio.app`
  const [copied, setCopied] = useState(false)

  function copy() { navigator.clipboard?.writeText(mailhook); setCopied(true); setTimeout(()=>setCopied(false),2000) }

  const demo = [
    { id:1, from:'Amazon',        subject:'Your order of "Apple AirPods Pro"',      received:'2h ago', status:'parsed',     amount:249.00, method:'Visa ••4242' },
    { id:2, from:'Delta Airlines',subject:'Your eReceipt for Flight DL404',          received:'1d ago', status:'parsed',     amount:387.40, method:'MC ••8811'  },
    { id:3, from:'Uber',          subject:'Your Tuesday trip with Uber',             received:'3d ago', status:'processing', amount:null,   method:null         },
    { id:4, from:'Spotify',       subject:'Your receipt from Spotify',               received:'5d ago', status:'parsed',     amount:9.99,   method:'Visa ••4242' },
    { id:5, from:'Whole Foods',   subject:'Amazon Fresh order — your receipt',       received:'6d ago', status:'parsed',     amount:127.43, method:'AP ••4242'  },
  ]

  return (
    <div>
      <div style={{ background: '#FFF8DC', border: '1px solid #FFD93D40', borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#7A5C00', marginBottom: 6 }}>Your receipt email address</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          <code style={{ flex: 1, background: '#fff', padding: '8px 12px', borderRadius: 8, fontSize: 12, color: '#1A1A18', border: '1px solid #E8E6E0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mailhook}</code>
          <button onClick={copy} style={{ padding: '8px 14px', background: copied?'#6BCB77':'#FFD93D', color: copied?'#fff':'#7A5C00', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, transition: 'all 0.2s' }}>
            {copied ? t('scan_email_copied') : t('scan_email_copy')}
          </button>
        </div>
        <div style={{ fontSize: 11, color: '#7A5C00', opacity: 0.8, lineHeight: 1.6 }}>
          <strong>Two ways to use it:</strong><br />
          1. Forward any receipt email to this address<br />
          2. Give it to merchants as your receipt email — they send directly to MoneyBio<br />
          Both email body text <em>and</em> attachments (PDF, images) are processed automatically.
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #E8E6E0', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #E8E6E0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Received receipts</div>
          <span style={{ fontSize: 11, color: '#9C9A94' }}>{demo.length} emails</span>
        </div>
        {demo.map(e => (
          <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid #F0EEE8' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: e.status==='parsed'?'#E8F5E9':'#FFF8DC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
              {e.status==='parsed' ? '✅' : '⏳'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.subject}</div>
              <div style={{ fontSize: 11, color: '#9C9A94', display: 'flex', gap: 6, marginTop: 1 }}>
                <span>{e.from}</span><span>·</span><span>{e.received}</span>
                {e.method && <><span>·</span><span>{e.method}</span></>}
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              {e.amount ? <div style={{ fontSize: 14, fontWeight: 700 }}>${e.amount.toFixed(2)}</div> : <div style={{ fontSize: 11, color: '#9C9A94' }}>Processing…</div>}
              <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, fontWeight: 500, background: e.status==='parsed'?'#E8F5E9':'#FFF8DC', color: e.status==='parsed'?'#1A4D1F':'#7A5C00' }}>
                {e.status==='parsed' ? t('scan_email_processed') : 'Processing'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Shared small components ───────────────────────────────────
function DropZone({ onClick, icon, title, sub, extra }) {
  const [hov, setHov] = useState(false)
  return (
    <div onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ border: `2px dashed ${hov?'#E6BE00':'#D0CEC8'}`, borderRadius: 14, padding: '44px 24px', textAlign: 'center', cursor: 'pointer', marginBottom: 14, transition: 'border-color 0.15s', background: hov?'#FFFBF0':'transparent' }}>
      <i className={`ti ${icon}`} style={{ fontSize: 40, color: hov?'#E6BE00':'#D0CEC8', display: 'block', marginBottom: 10, transition: 'color 0.15s' }} />
      <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12, color: '#9C9A94' }}>{sub}</div>
      {extra && <div style={{ fontSize: 11, color: '#9C9A94', marginTop: 6 }}>{extra}</div>}
    </div>
  )
}
function InfoBox({ children }) {
  return <div style={{ background: '#F5F4F0', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#5C5A54', lineHeight: 1.6, marginBottom: 12 }}>{children}</div>
}
function ProcessingScreen({ icon, title, sub }) {
  return (
    <div style={{ textAlign: 'center', padding: '56px 24px' }}>
      <div style={{ fontSize: 36, marginBottom: 14 }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, color: '#9C9A94', marginBottom: 20 }}>{sub}</div>
      <Spinner size={28} />
    </div>
  )
}
function DoneScreen({ title, sub, onReset, resetLabel }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px' }}>
      <div style={{ fontSize: 44, marginBottom: 12 }}>✅</div>
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 13, color: '#9C9A94', marginBottom: 24 }}>{sub}</div>
      <button onClick={onReset} style={primaryBtn}>{resetLabel}</button>
    </div>
  )
}
function Chip({ label, active, onClick, small }) {
  return (
    <button onClick={onClick} style={{ padding: small?'3px 8px':'5px 12px', border: '1.5px solid', borderRadius: 20, fontSize: small?10:12, cursor: 'pointer', fontFamily: 'inherit', borderColor: active?'#E6BE00':'#E8E6E0', background: active?'#FFF8DC':'#fff', color: active?'#7A5C00':'#5C5A54', fontWeight: active?600:400, transition: 'all 0.12s' }}>{label}</button>
  )
}
function Spinner({ size=20 }) {
  return <div style={{ width:size, height:size, border:'2.5px solid #E8E6E0', borderTopColor:'#FFD93D', borderRadius:'50%', animation:'spin 0.7s linear infinite', display:'inline-block' }}><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>
}
function Toast({ msg }) {
  return <div style={{ position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', background:'#1A1A18', color:'#fff', padding:'10px 20px', borderRadius:20, fontSize:13, fontWeight:500, zIndex:200 }}>{msg}</div>
}

const labelStyle = { fontSize:11, fontWeight:500, color:'#5C5A54', display:'block' }
const inputStyle = { width:'100%', padding:'8px 10px', border:'1px solid #D0CEC8', borderRadius:7, fontSize:13, outline:'none', fontFamily:'inherit', display:'block' }
const primaryBtn = { display:'inline-flex', alignItems:'center', gap:6, padding:'9px 18px', background:'#FFD93D', color:'#7A5C00', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }
const secondaryBtn = { display:'inline-flex', alignItems:'center', gap:6, padding:'8px 14px', background:'#fff', color:'#5C5A54', border:'1px solid #D0CEC8', borderRadius:8, fontSize:13, cursor:'pointer', fontFamily:'inherit' }
