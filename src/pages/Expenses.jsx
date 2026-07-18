import { useT } from '../lib/i18n.jsx'
import { useEffect, useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { transactions, categories } from '../lib/supabase'

export default function Expenses() {
  const { user } = useAuth()
  const t = useT()
  const [txns, setTxns] = useState([])
  const [cats, setCats] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ description: '', amount: '', category_id: '', payment_method: 'card', type: 'expense' })
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState(null)

  useEffect(() => { if (user) loadData() }, [user])

  async function loadData() {
    setLoading(true)
    const [txRes, catRes] = await Promise.all([
      transactions.list(user.id, { limit: 100 }),
      categories.list(user.id),
    ])
    setTxns(txRes.data || [])
    setCats(catRes.data || [])
    setLoading(false)
  }

  async function addExpense() {
    if (!form.description || !form.amount) return
    setSaving(true)
    const { error } = await transactions.insert({
      user_id: user.id,
      description: form.description,
      amount: -Math.abs(parseFloat(form.amount)),
      type: 'expense',
      category_id: form.category_id || null,
      payment_method: form.payment_method,
      merchant_name: form.description,
      transaction_date: new Date().toISOString(),
      source: 'manual',
    })
    if (!error) {
      setShowAdd(false)
      setForm({ description: '', amount: '', category_id: '', payment_method: 'card', type: 'expense' })
      loadData()
    }
    setSaving(false)
  }


  function exportCSV() {
    const headers = ['Date', 'Merchant', 'Description', 'Amount', 'Category', 'Payment Method', 'Notes']
    const rows = filtered.map(t => [
      new Date(t.transaction_date).toLocaleDateString(),
      t.merchant_name || '',
      t.description || '',
      Math.abs(parseFloat(t.amount || 0)).toFixed(2),
      t.categories?.name || '',
      (t.payment_method || '').replace(/_/g, ' '),
      t.notes || '',
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `moneybio-expenses-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const filtered = txns.filter(t => {
    if (filter === 'all') return true
    if (filter === 'hsa') return t.is_hsa_eligible
    return t.categories?.name?.toLowerCase() === filter
  })

  const filterOptions = [
    { id: 'all', label: t('expenses_filter_all') },
    { id: 'groceries', label: t('expenses_filter_groceries') },
    { id: 'dining', label: t('expenses_filter_dining') },
    { id: 'gas', label: t('expenses_filter_gas') },
    { id: 'medical', label: t('expenses_filter_medical') },
    { id: 'hsa', label: 'HSA eligible' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>{t('expenses_title')}</h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <a href="/scan" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: '#FFD93D', color: '#7A5C00', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}>
            <i className="ti ti-camera" style={{ fontSize: 15 }} /> {t('expenses_scan')}
          </a>
          <button onClick={() => setShowAdd(p => !p)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', background: '#fff', color: '#5C5A54', border: '1px solid #D0CEC8', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            <i className="ti ti-plus" style={{ fontSize: 14 }} /> {t('expenses_manual')}
          </button>
          <button onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', background: '#fff', color: '#5C5A54', border: '1px solid #D0CEC8', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            <i className="ti ti-download" style={{ fontSize: 14 }} /> Export
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {filterOptions.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            padding: '5px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
            border: '1px solid', fontFamily: 'inherit',
            borderColor: filter === f.id ? 'transparent' : '#E8E6E0',
            background: filter === f.id ? '#FFD93D' : '#fff',
            color: filter === f.id ? '#7A5C00' : '#5C5A54',
            fontWeight: filter === f.id ? 500 : 400,
          }}>{f.label}</button>
        ))}
      </div>

      {/* Add form */}
      {showAdd && (
        <div style={{ background: '#fff', border: '1px solid #E8E6E0', borderRadius: 14, padding: 16, marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>{t('expenses_add')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 500, color: '#5C5A54', display: 'block', marginBottom: 4 }}>{t('expenses_description')}</label>
              <input value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))}
                placeholder="e.g. Kroger groceries" style={{ width: '100%', padding: '8px 10px', border: '1px solid #D0CEC8', borderRadius: 7, fontSize: 13 }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 500, color: '#5C5A54', display: 'block', marginBottom: 4 }}>{t('expenses_amount')}</label>
              <input type="number" value={form.amount} onChange={e => setForm(p => ({...p, amount: e.target.value}))}
                placeholder="0.00" style={{ width: '100%', padding: '8px 10px', border: '1px solid #D0CEC8', borderRadius: 7, fontSize: 13 }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 500, color: '#5C5A54', display: 'block', marginBottom: 4 }}>{t('expenses_category')}</label>
              <select value={form.category_id} onChange={e => setForm(p => ({...p, category_id: e.target.value}))}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #D0CEC8', borderRadius: 7, fontSize: 13 }}>
                <option value="">{t('expenses_select_category')}</option>
                {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 500, color: '#5C5A54', display: 'block', marginBottom: 4 }}>{t('expenses_payment')}</label>
              <select value={form.payment_method} onChange={e => setForm(p => ({...p, payment_method: e.target.value}))}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #D0CEC8', borderRadius: 7, fontSize: 13 }}>
                <option value="visa">Visa</option>
                <option value="debit">{t('expenses_debit')}</option>
                <option value="cash">{t('expenses_cash')}</option>
                <option value="apple_pay">Apple Pay</option>
                <option value="google_pay">Google Pay</option>
                <option value="hsa">HSA Card</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowAdd(false)} style={{ flex: 1, padding: '8px', background: '#fff', border: '1px solid #D0CEC8', borderRadius: 7, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
            <button onClick={addExpense} disabled={saving} style={{ flex: 1, padding: '8px', background: '#FFD93D', color: '#7A5C00', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
              {saving ? t('expenses_saving') : t('expenses_save')}
            </button>
          </div>
        </div>
      )}

      <div style={{ background: '#fff', border: '1px solid #E8E6E0', borderRadius: 14, padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#5C5A54' }}>July 2026</span>
          <span style={{ fontSize: 12, color: '#9C9A94' }}>{filtered.length} transactions</span>
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 32, color: '#9C9A94' }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32, color: '#9C9A94' }}>
            <i className="ti ti-receipt" style={{ fontSize: 28, display: 'block', marginBottom: 8 }} />
            No transactions yet. Add your first expense above!
          </div>
        ) : filtered.map(t => (
          <div key={t.id} onClick={() => setSelected(selected?.id === t.id ? null : t)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid #F0EEE8', cursor: 'pointer' }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: (t.categories?.color || '#9C9A94') + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className={`ti ${t.categories?.icon || 'ti-tag'}`} style={{ color: t.categories?.color || '#9C9A94', fontSize: 16 }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {t.merchant_name || t.description}
              </div>
              <div style={{ fontSize: 11, color: '#9C9A94', display: 'flex', gap: 6, alignItems: 'center' }}>
                <span>{t.categories?.name || t('expenses_uncategorized')}</span>
                <span>·</span>
                <span>{new Date(t.transaction_date).toLocaleDateString()}</span>
                {t.payment_method && <><span>·</span><span style={{ textTransform: 'capitalize' }}>{t.payment_method.replace('_', ' ')}</span></>}
                {t.is_hsa_eligible && <span style={{ background: '#E0F7FA', color: '#0D4D4A', borderRadius: 10, padding: '1px 6px', fontSize: 10, fontWeight: 500 }}>HSA</span>}
                {t.is_reconciled && <span style={{ background: '#E8F5E9', color: '#1A4D1F', borderRadius: 10, padding: '1px 6px', fontSize: 10, fontWeight: 500 }}>✓ Reconciled</span>}
              </div>
              {/* 360 detail panel */}
              {selected?.id === t.id && (
                <div style={{ marginTop: 8, background: '#FAFAF8', borderRadius: 8, padding: '10px 12px', fontSize: 12 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6, color: '#5C5A54' }}>Transaction detail</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}>
                    {t.connected_accounts && <>
                      <div style={{ color: '#9C9A94' }}>Bank</div>
                      <div>{t.connected_accounts.institution_name} ••{t.connected_accounts.last_four}</div>
                    </>}
                    {t.connected_accounts?.wallet_type && <>
                      <div style={{ color: '#9C9A94' }}>Via</div>
                      <div style={{ textTransform: 'capitalize' }}>{t.connected_accounts.wallet_type.replace('_', ' ')}</div>
                    </>}
                    <div style={{ color: '#9C9A94' }}>Source</div>
                    <div style={{ textTransform: 'capitalize' }}>{t.source}</div>
                    <div style={{ color: '#9C9A94' }}>Amount</div>
                    <div style={{ fontWeight: 600 }}>${Math.abs(t.amount).toFixed(2)}</div>
                  </div>
                </div>
              )}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#8B0000', flexShrink: 0 }}>
              -${Math.abs(t.amount).toFixed(2)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
