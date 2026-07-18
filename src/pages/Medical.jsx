import { useState, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import { medical } from '../lib/supabase'

const DEMO = [
  { id:'1', provider_name:'CVS Pharmacy', expense_type:'prescription', amount:24.99, expense_date:new Date(Date.now()-86400000*7).toISOString(), is_hsa_eligible:true, hsa_submitted:false, hsa_reimbursed:false },
  { id:'2', provider_name:'Dr. Patel — Co-pay', expense_type:'copay', amount:45.00, expense_date:new Date(Date.now()-86400000*18).toISOString(), is_hsa_eligible:true, hsa_submitted:true, hsa_reimbursed:false },
  { id:'3', provider_name:'LensCrafters', expense_type:'vision', amount:94.00, expense_date:new Date(Date.now()-86400000*30).toISOString(), is_hsa_eligible:true, hsa_submitted:true, hsa_reimbursed:true, hsa_reimbursed_amount:94.00 },
  { id:'4', provider_name:'Quest Diagnostics', expense_type:'lab', amount:19.00, expense_date:new Date(Date.now()-86400000*35).toISOString(), is_hsa_eligible:true, hsa_submitted:false, hsa_reimbursed:false },
]

const TYPE_LABELS = { prescription:'💊 Prescription', copay:'🩺 Co-pay', dental:'🦷 Dental', vision:'👓 Vision', lab:'🔬 Lab work', other:'🏥 Other' }
// statusBadge moved inside component

export default function Medical() {
  const { user } = useAuth()
  const t = useT()
  function statusBadge(exp) {
    if (exp.hsa_reimbursed) return { label:t('medical_reimbursed_badge'), bg:'#E8F5E9', fg:'#1A4D1F' }
    if (exp.hsa_submitted)  return { label:t('medical_submitted'),        bg:'#FFF8DC', fg:'#7A5C00' }
    if (exp.is_hsa_eligible) return { label:t('medical_ready'),           bg:'#E0F7FA', fg:'#0D4D4A' }
    return { label:t('medical_not_eligible'), bg:'#F5F4F0', fg:'#9C9A94' }
  }
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ provider_name:'', expense_type:'copay', amount:'', is_hsa_eligible:true })
  const [toast, setToast] = useState('')

  useEffect(() => {
    medical.list(user?.id).then(r => {
      setExpenses(r.data?.length ? r.data : DEMO); setLoading(false)
    }).catch(() => { setExpenses(DEMO); setLoading(false) })
  }, [user])

  const ready = expenses.filter(e=>e.is_hsa_eligible&&!e.hsa_submitted)
  const hsaBalance = 1480
  const readyTotal = ready.reduce((s,e)=>s+e.amount,0)
  const reimbursedTotal = expenses.filter(e=>e.hsa_reimbursed).reduce((s,e)=>s+(e.hsa_reimbursed_amount||e.amount),0)

  function showToast(m){setToast(m);setTimeout(()=>setToast(''),2500)}

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <h1 style={{fontSize:20,fontWeight:600}}>{t('medical_title')}</h1>
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>showToast('📤 HSA claim submitted! You\'ll receive an email confirmation.')} style={{...primaryBtn,background:'#4ECDC4',color:'#0D4D4A'}}>Submit HSA claim</button>
          <button onClick={()=>setShowAdd(true)} style={primaryBtn}>＋ Add expense</button>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:14}}>
        <div style={{background:'#4ECDC4',color:'#0D4D4A',borderRadius:14,padding:'12px 14px'}}><div style={{fontSize:11,fontWeight:500,opacity:.72,marginBottom:4}}>HSA balance</div><div style={{fontSize:22,fontWeight:700}}>${hsaBalance.toLocaleString()}</div><div style={{fontSize:10,opacity:.6}}>Available</div></div>
        <div style={{background:'#FFD93D',color:'#7A5C00',borderRadius:14,padding:'12px 14px'}}><div style={{fontSize:11,fontWeight:500,opacity:.72,marginBottom:4}}>Ready to claim</div><div style={{fontSize:22,fontWeight:700}}>${readyTotal.toFixed(2)}</div><div style={{fontSize:10,opacity:.6}}>{ready.length} receipts</div></div>
        <div style={{background:'#6BCB77',color:'#1A4D1F',borderRadius:14,padding:'12px 14px'}}><div style={{fontSize:11,fontWeight:500,opacity:.72,marginBottom:4}}>Reimbursed YTD</div><div style={{fontSize:22,fontWeight:700}}>${reimbursedTotal.toFixed(2)}</div><div style={{fontSize:10,opacity:.6}}>Approved</div></div>
      </div>

      {ready.length > 0 && (
        <div style={{background:'#E0F7FA',border:'1px solid #4ECDC440',borderRadius:12,padding:'12px 14px',marginBottom:12,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div><div style={{fontSize:13,fontWeight:600,color:'#0D4D4A'}}>💊 {ready.length} expense{ready.length>1?'s':''} ready to submit — ${readyTotal.toFixed(2)}</div><div style={{fontSize:11,color:'#0D4D4A',opacity:.7,marginTop:2}}>Submit now to get reimbursed from your HSA balance</div></div>
          <button onClick={()=>showToast('📤 Claim submitted!')} style={{padding:'7px 14px',background:'#4ECDC4',color:'#0D4D4A',border:'none',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Submit claim →</button>
        </div>
      )}

      {showAdd && (
        <div style={{background:'#fff',border:'1px solid #E8E6E0',borderRadius:14,padding:16,marginBottom:12}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
            <div><label style={lbl}>Provider / Store</label><input value={form.provider_name} onChange={e=>setForm(p=>({...p,provider_name:e.target.value}))} placeholder='e.g. CVS, Dr. Smith' style={inp}/></div>
            <div><label style={lbl}>Amount</label><input type="number" value={form.amount} onChange={e=>setForm(p=>({...p,amount:e.target.value}))} placeholder="0.00" style={inp}/></div>
            <div><label style={lbl}>Expense type</label><select value={form.expense_type} onChange={e=>setForm(p=>({...p,expense_type:e.target.value}))} style={inp}>{Object.entries(TYPE_LABELS).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div>
            <div style={{display:'flex',alignItems:'center',gap:8,paddingTop:18}}><input type="checkbox" checked={form.is_hsa_eligible} onChange={e=>setForm(p=>({...p,is_hsa_eligible:e.target.checked}))} id="hsa"/><label htmlFor="hsa" style={{fontSize:13,cursor:'pointer'}}>HSA eligible</label></div>
          </div>
          <div style={{display:'flex',gap:8}}><button onClick={()=>setShowAdd(false)} style={cancelBtn}>Cancel</button><button onClick={()=>{setExpenses(p=>[{id:Date.now().toString(),provider_name:form.provider_name,expense_type:form.expense_type,amount:parseFloat(form.amount)||0,expense_date:new Date().toISOString(),is_hsa_eligible:form.is_hsa_eligible,hsa_submitted:false,hsa_reimbursed:false},...p]);setShowAdd(false);showToast('✅ Expense saved!')}} style={primaryBtn}>Save expense</button></div>
        </div>
      )}

      <div style={{background:'#fff',border:'1px solid #E8E6E0',borderRadius:14,padding:16}}>
        <div style={{fontSize:12,fontWeight:600,color:'#5C5A54',marginBottom:12}}>All medical expenses</div>
        {loading ? <div style={{textAlign:'center',padding:24,color:'#9C9A94'}}>Loading…</div>
        : expenses.map(exp => {
          const badge = statusBadge(exp)
          return (
            <div key={exp.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:'1px solid #F0EEE8'}}>
              <div style={{width:36,height:36,borderRadius:10,background:'#E0F7FA',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>
                {exp.expense_type==='prescription'?'💊':exp.expense_type==='copay'?'🩺':exp.expense_type==='vision'?'👓':exp.expense_type==='lab'?'🔬':'🏥'}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{exp.provider_name}</div>
                <div style={{fontSize:11,color:'#9C9A94',display:'flex',gap:6,alignItems:'center',marginTop:2}}>
                  <span>{TYPE_LABELS[exp.expense_type]||exp.expense_type}</span>
                  <span>·</span>
                  <span>{new Date(exp.expense_date).toLocaleDateString()}</span>
                </div>
              </div>
              <div style={{textAlign:'right',flexShrink:0}}>
                <div style={{fontSize:14,fontWeight:700}}>${exp.amount.toFixed(2)}</div>
                <span style={{fontSize:10,padding:'2px 8px',borderRadius:10,fontWeight:500,background:badge.bg,color:badge.fg}}>{badge.label}</span>
              </div>
            </div>
          )
        })}
      </div>
      {toast && <div style={{position:'fixed',bottom:24,left:'50%',transform:'translateX(-50%)',background:'#1A1A18',color:'#fff',padding:'10px 20px',borderRadius:20,fontSize:13,fontWeight:500,zIndex:200}}>{toast}</div>}
    </div>
  )
}
const lbl={fontSize:11,fontWeight:500,color:'#5C5A54',display:'block',marginBottom:4}
const inp={width:'100%',padding:'8px 10px',border:'1px solid #D0CEC8',borderRadius:7,fontSize:13,outline:'none',fontFamily:'inherit'}
const primaryBtn={display:'inline-flex',alignItems:'center',gap:6,padding:'8px 16px',background:'#FFD93D',color:'#7A5C00',border:'none',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}
const cancelBtn={padding:'8px 16px',background:'#fff',border:'1px solid #D0CEC8',borderRadius:8,fontSize:13,cursor:'pointer',fontFamily:'inherit'}
