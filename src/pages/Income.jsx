import { useT } from '../lib/i18n.jsx'
import { useEffect, useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { income as incomeLib } from '../lib/supabase'

export default function Income() {
  const { user } = useAuth()
  const [incomeData, setIncomeData] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ source_name: '', amount: '', income_type: 'salary', is_taxable: true })

  useEffect(() => { if (user) load() }, [user])
  async function load() {
    setLoading(true)
    const { data } = await incomeLib.list(user.id)
    setIncomeData(data || [])
    setLoading(false)
  }
  async function add() {
    await incomeLib.insert({ ...form, amount: parseFloat(form.amount), user_id: user.id, received_date: new Date().toISOString() })
    setShowAdd(false); setForm({ source_name: '', amount: '', income_type: 'salary', is_taxable: true }); load()
  }
  const total = incomeData.reduce((s, i) => s + i.amount, 0)
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>Income & Gifts</h1>
        <button onClick={() => setShowAdd(true)} style={{ padding: '7px 14px', background: '#FFD93D', color: '#7A5C00', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
          <i className="ti ti-plus" /> Log income
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
        {[{ label: t('income_total_label'), value: `$${total.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, bg: '#6BCB77', fg: '#1A4D1F' },
          { label: t('income_taxable'), value: `$${incomeData.filter(i=>i.is_taxable).reduce((s,i)=>s+i.amount,0).toLocaleString('en-US',{maximumFractionDigits:0})}`, bg: '#FFD93D', fg: '#7A5C00' },
          { label: 'Non-taxable', value: `$${incomeData.filter(i=>!i.is_taxable).reduce((s,i)=>s+i.amount,0).toLocaleString('en-US',{maximumFractionDigits:0})}`, bg: '#4ECDC4', fg: '#0D4D4A' }
        ].map(k => (
          <div key={k.label} style={{ background: k.bg, color: k.fg, borderRadius: 14, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, fontWeight: 500, opacity: 0.72, marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{k.value}</div>
          </div>
        ))}
      </div>
      {showAdd && (
        <div style={{ background: '#fff', border: '1px solid #E8E6E0', borderRadius: 14, padding: 16, marginBottom: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div><label style={{ fontSize: 11, fontWeight: 500, color: '#5C5A54', display: 'block', marginBottom: 4 }}>Source</label>
              <input value={form.source_name} onChange={e => setForm(p=>({...p,source_name:e.target.value}))} placeholder="Salary, freelance..." style={{ width: '100%', padding: '8px 10px', border: '1px solid #D0CEC8', borderRadius: 7, fontSize: 13 }} /></div>
            <div><label style={{ fontSize: 11, fontWeight: 500, color: '#5C5A54', display: 'block', marginBottom: 4 }}>Amount</label>
              <input type="number" value={form.amount} onChange={e => setForm(p=>({...p,amount:e.target.value}))} placeholder="0.00" style={{ width: '100%', padding: '8px 10px', border: '1px solid #D0CEC8', borderRadius: 7, fontSize: 13 }} /></div>
            <div><label style={{ fontSize: 11, fontWeight: 500, color: '#5C5A54', display: 'block', marginBottom: 4 }}>Type</label>
              <select value={form.income_type} onChange={e => setForm(p=>({...p,income_type:e.target.value}))} style={{ width: '100%', padding: '8px 10px', border: '1px solid #D0CEC8', borderRadius: 7, fontSize: 13 }}>
                <option value="salary">{t('income_salary')}</option><option value="freelance">{t('income_freelance')}</option><option value="gift">{t('income_gift')}</option><option value="other">{t('income_other')}</option>
              </select></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 20 }}>
              <input type="checkbox" checked={form.is_taxable} onChange={e => setForm(p=>({...p,is_taxable:e.target.checked}))} id="taxable" />
              <label htmlFor="taxable" style={{ fontSize: 13 }}>Taxable income</label>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowAdd(false)} style={{ flex: 1, padding: '8px', background: '#fff', border: '1px solid #D0CEC8', borderRadius: 7, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
            <button onClick={add} style={{ flex: 1, padding: '8px', background: '#FFD93D', color: '#7A5C00', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Save</button>
          </div>
        </div>
      )}
      <div style={{ background: '#fff', border: '1px solid #E8E6E0', borderRadius: 14, padding: 16 }}>
        {loading ? <div style={{ textAlign: 'center', padding: 32, color: '#9C9A94' }}>Loading…</div>
          : incomeData.length === 0 ? <div style={{ textAlign: 'center', padding: 32, color: '#9C9A94' }}>No income logged yet.</div>
          : incomeData.map(i => (
          <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid #F0EEE8' }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: '#E8F5E9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className={i.income_type === 'gift' ? 'ti ti-gift' : 'ti ti-cash'} style={{ color: '#1A4D1F', fontSize: 16 }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{i.source_name}</div>
              <div style={{ fontSize: 11, color: '#9C9A94' }}>{new Date(i.received_date).toLocaleDateString()} · {i.income_type} · {i.is_taxable ? 'Taxable' : 'Non-taxable'}</div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1A4D1F' }}>+${i.amount.toFixed(2)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
