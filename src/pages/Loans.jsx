import { useState, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import { useT } from '../lib/i18n.jsx'
import { loans } from '../lib/supabase'

export default function Loans() {
  const { user } = useAuth()
  const t = useT()
  const [myLoans, setMyLoans] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ title: '', total_amount: '', direction: 'lent', contact_name: '', contact_email: '', due_date: '', repayment_type: 'lump_sum' })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  // Demo data
  const demoLoans = [
    { agreement_id: '1', title: 'Car repair help', total_amount: 1000, remaining_amount: 600, status: 'active', due_date: new Date(Date.now()+28*86400000).toISOString(), issued_date: new Date(Date.now()-60*86400000).toISOString(), role: 'lender', total_paid: 400, pending_payments: 0, other_parties: [{name:'Marcus Johnson',role:'borrower'}] },
    { agreement_id: '2', title: null, total_amount: 250, remaining_amount: 250, status: 'active', due_date: new Date(Date.now()+60*86400000).toISOString(), issued_date: new Date(Date.now()-30*86400000).toISOString(), role: 'lender', total_paid: 0, pending_payments: 0, other_parties: [{name:'Sarah Kim',role:'borrower'}] },
    { agreement_id: '3', title: 'Vacation fund', total_amount: 500, remaining_amount: 0, status: 'paid', due_date: new Date(Date.now()-30*86400000).toISOString(), issued_date: new Date(Date.now()-120*86400000).toISOString(), role: 'borrower', total_paid: 500, pending_payments: 0, other_parties: [{name:'James L.',role:'lender'}] },
  ]

  useEffect(() => {
    if (!user) return
    loans.myLoans().then(r => {
      setMyLoans(r.data?.length ? r.data : demoLoans)
      setLoading(false)
    }).catch(() => { setMyLoans(demoLoans); setLoading(false) })
  }, [user])

  async function createLoan() {
    if (!form.total_amount || !form.contact_name) return
    setSaving(true)
    await new Promise(r => setTimeout(r, 700))
    setSaving(false); setShowAdd(false)
    showToast('✅ Loan created! Invite link ready.')
    setMyLoans(prev => [{
      agreement_id: Date.now().toString(), title: form.title || null,
      total_amount: parseFloat(form.total_amount), remaining_amount: parseFloat(form.total_amount),
      status: 'active', due_date: form.due_date || null, issued_date: new Date().toISOString(),
      role: form.direction === 'lent' ? 'lender' : 'borrower', total_paid: 0, pending_payments: 0,
      other_parties: [{name: form.contact_name, role: form.direction === 'lent' ? 'borrower' : 'lender'}]
    }, ...prev])
    setForm({ title: '', total_amount: '', direction: 'lent', contact_name: '', contact_email: '', due_date: '', repayment_type: 'lump_sum' })
  }

  function showToast(m) { setToast(m); setTimeout(() => setToast(''), 2500) }

  const totalLent = myLoans.filter(l=>l.role==='lender'&&l.status==='active').reduce((s,l)=>s+l.remaining_amount,0)
  const totalBorrowed = myLoans.filter(l=>l.role==='borrower'&&l.status==='active').reduce((s,l)=>s+l.remaining_amount,0)

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <h1 style={{ fontSize:20, fontWeight:600 }}>{t('loans_title')}</h1>
        <button onClick={() => setShowAdd(true)} style={primaryBtn}>＋ New loan</button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:14 }}>
        <KPI label="Lent out (active)" value={`$${totalLent.toLocaleString('en-US',{maximumFractionDigits:0})}`} bg="#FF9A3C" fg="#7A3A00" />
        <KPI label="Borrowed (active)" value={`$${totalBorrowed.toLocaleString('en-US',{maximumFractionDigits:0})}`} bg="#C77DFF" fg="#6B21C8" />
        <KPI label="Closed loans" value={myLoans.filter(l=>l.status==='paid').length.toString()} bg="#6BCB77" fg="#1A4D1F" />
      </div>

      {showAdd && (
        <div style={card}>
          <div style={{ fontSize:14, fontWeight:600, marginBottom:14 }}>New loan</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
            <div><label style={lbl}>Direction</label>
              <select value={form.direction} onChange={e=>setForm(p=>({...p,direction:e.target.value}))} style={sel}>
                <option value="lent">I'm lending money</option>
                <option value="borrowed">I'm borrowing money</option>
              </select></div>
            <div><label style={lbl}>Amount</label>
              <input type="number" value={form.total_amount} onChange={e=>setForm(p=>({...p,total_amount:e.target.value}))} placeholder="0.00" style={inp} /></div>
            <div><label style={lbl}>{form.direction==='lent'?'Borrower':'Lender'} name</label>
              <input value={form.contact_name} onChange={e=>setForm(p=>({...p,contact_name:e.target.value}))} placeholder="Name" style={inp} /></div>
            <div><label style={lbl}>Their email (optional)</label>
              <input type="email" value={form.contact_email} onChange={e=>setForm(p=>({...p,contact_email:e.target.value}))} placeholder="they@example.com" style={inp} /></div>
            <div><label style={lbl}>Label (optional)</label>
              <input value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} placeholder='e.g. "Car repair"' style={inp} /></div>
            <div><label style={lbl}>Due date</label>
              <input type="date" value={form.due_date} onChange={e=>setForm(p=>({...p,due_date:e.target.value}))} style={inp} /></div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={()=>setShowAdd(false)} style={cancelBtn}>Cancel</button>
            <button onClick={createLoan} disabled={saving} style={primaryBtn}>{saving?t('loans_creating'):t('loans_create')}</button>
          </div>
        </div>
      )}

      <div style={card}>
        <div style={{ fontSize:12, fontWeight:600, color:'#5C5A54', marginBottom:12 }}>Active & closed loans</div>
        {loading ? <div style={loading_}>Loading…</div> : myLoans.map(loan => {
          const other = loan.other_parties?.[0]
          const pct = Math.round((loan.total_paid / loan.total_amount) * 100) || 0
          const isLender = loan.role === 'lender'
          const isPaid = loan.status === 'paid'
          const daysLeft = loan.due_date ? Math.ceil((new Date(loan.due_date)-new Date())/86400000) : null
          return (
            <div key={loan.agreement_id} style={{ padding:'13px 0', borderBottom:'1px solid #F0EEE8' }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:6 }}>
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:13, fontWeight:600 }}>{other?.name || 'Unknown'}</span>
                    <span style={{ fontSize:10, padding:'2px 7px', borderRadius:10, fontWeight:500, background: isLender?'#FFF8DC':'#F5EEFF', color: isLender?'#7A5C00':'#6B21C8' }}>{isLender?'You lent':'You borrowed'}</span>
                    {isPaid && <span style={{ fontSize:10, padding:'2px 7px', borderRadius:10, background:'#E8F5E9', color:'#1A4D1F', fontWeight:500 }}>✓ Paid</span>}
                  </div>
                  {loan.title && <div style={{ fontSize:11, color:'#9C9A94', marginTop:2 }}>{loan.title}</div>}
                  <div style={{ fontSize:11, color:'#9C9A94', marginTop:2 }}>
                    Issued {new Date(loan.issued_date).toLocaleDateString()}
                    {daysLeft !== null && !isPaid && <span style={{ color: daysLeft<7?'#8B0000':'#9C9A94', marginLeft:8 }}>{daysLeft>0?`Due in ${daysLeft} days`:'Overdue'}</span>}
                  </div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:16, fontWeight:700, color: isPaid?'#1A4D1F':'#1A1A18' }}>${loan.remaining_amount.toLocaleString('en-US',{minimumFractionDigits:2})}</div>
                  <div style={{ fontSize:10, color:'#9C9A94' }}>of ${loan.total_amount.toLocaleString('en-US',{minimumFractionDigits:2})}</div>
                </div>
              </div>
              <div style={{ height:5, background:'#F0EEE8', borderRadius:3, overflow:'hidden', marginBottom:4 }}>
                <div style={{ height:'100%', width:`${pct}%`, background: isPaid?'#6BCB77':'#FF9A3C', borderRadius:3, transition:'width 0.5s' }} />
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'#9C9A94' }}>
                <span>${loan.total_paid?.toLocaleString('en-US',{minimumFractionDigits:2})} repaid ({pct}%)</span>
                {!isPaid && <button onClick={()=>showToast('💳 Payment flow — coming soon!')} style={{ background:'none', border:'none', cursor:'pointer', fontSize:10, color:'#7A5C00', fontWeight:500, fontFamily:'inherit' }}>+ Record payment →</button>}
              </div>
            </div>
          )
        })}
      </div>
      {toast && <Toast msg={toast} />}
    </div>
  )
}

function KPI({label,value,bg,fg}){return(<div style={{background:bg,color:fg,borderRadius:14,padding:'12px 14px'}}><div style={{fontSize:11,fontWeight:500,opacity:.72,marginBottom:4}}>{label}</div><div style={{fontSize:22,fontWeight:700}}>{value}</div></div>)}
function Toast({msg}){return(<div style={{position:'fixed',bottom:24,left:'50%',transform:'translateX(-50%)',background:'#1A1A18',color:'#fff',padding:'10px 20px',borderRadius:20,fontSize:13,fontWeight:500,zIndex:200}}>{msg}</div>)}
const card={background:'#fff',border:'1px solid #E8E6E0',borderRadius:14,padding:16,marginBottom:12}
const lbl={fontSize:11,fontWeight:500,color:'#5C5A54',display:'block',marginBottom:4}
const inp={width:'100%',padding:'8px 10px',border:'1px solid #D0CEC8',borderRadius:7,fontSize:13,outline:'none',fontFamily:'inherit'}
const sel={...inp}
const loading_={textAlign:'center',padding:24,color:'#9C9A94',fontSize:13}
const primaryBtn={display:'inline-flex',alignItems:'center',gap:6,padding:'8px 16px',background:'#FFD93D',color:'#7A5C00',border:'none',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}
const cancelBtn={padding:'8px 16px',background:'#fff',border:'1px solid #D0CEC8',borderRadius:8,fontSize:13,cursor:'pointer',fontFamily:'inherit'}
