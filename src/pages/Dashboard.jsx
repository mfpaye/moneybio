import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { useT } from '../lib/i18n.jsx'
import { dashboard } from '../lib/supabase'
import Chart from 'chart.js/auto'

const DEMO_CATS_RAW = [
  { key:'cat_housing',   color:'#C77DFF', total:1200 },
  { key:'cat_groceries', color:'#F5A800', total:487  },
  { key:'cat_dining',    color:'#FF6B6B', total:318  },
  { key:'cat_gas',       color:'#FF9A3C', total:124  },
  { key:'cat_medical',   color:'#4ECDC4', total:89   },
  { key:'cat_other',     color:'#6BCB77', total:123  },
]
const DEMO_TXNS = [
  { id:'d1', merchant_name:'Whole Foods',    description:'Groceries', amount:-87.42,  type:'expense', transaction_date:new Date().toISOString(),              payment_method:'apple_pay',      category_name:'Groceries', category_color:'#F5A800', category_icon:'ti-building-store' },
  { id:'d2', merchant_name:'Shell Station',  description:'Gas',       amount:-62.10,  type:'expense', transaction_date:new Date(Date.now()-86400000).toISOString(),    payment_method:'google_pay',     category_name:'Gas',       category_color:'#FF9A3C', category_icon:'ti-gas-station'    },
  { id:'d3', merchant_name:'Salary deposit', description:'Income',    amount:4500,    type:'income',  transaction_date:new Date(Date.now()-86400000*6).toISOString(),  payment_method:'direct_deposit', category_name:'Income',    category_color:'#6BCB77', category_icon:'ti-cash'           },
  { id:'d4', merchant_name:'CVS Pharmacy',   description:'Medical',   amount:-24.99,  type:'expense', transaction_date:new Date(Date.now()-86400000*7).toISOString(),  payment_method:'hsa',            category_name:'Medical',   category_color:'#4ECDC4', category_icon:'ti-pill'           },
  { id:'d5', merchant_name:'Chipotle',       description:'Dining',    amount:-32.00,  type:'expense', transaction_date:new Date(Date.now()-86400000*8).toISOString(),  payment_method:'visa',           category_name:'Dining',    category_color:'#FF6B6B', category_icon:'ti-tools-kitchen-2'},
]

export default function Dashboard() {
  const { user, profile } = useAuth()
  const t = useT()
  const navigate = useNavigate()
  const DEMO_CATS = DEMO_CATS_RAW.map(c => ({...c, category: t(c.key)}))
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [isDemo, setIsDemo] = useState(false)
  const donutRef = useRef()
  const chartRef = useRef()

  useEffect(() => { if (user) load() }, [user])

  async function load() {
    setLoading(true)
    try {
      const { data: d, error } = await dashboard.getData(user.id)
      if (error) throw error
      const hasData = d?.recent_transactions?.length > 0
      if (!hasData) {
        setIsDemo(true)
        setData({ recent_transactions: DEMO_TXNS, monthly_spend: 2341, monthly_income: 5200, spending_by_category: DEMO_CATS, hsa_pending_count: 3, hsa_pending_amount: 89, loans_due_soon: [], unread_notifications: 0 })
      } else {
        setIsDemo(false)
        setData(d)
      }
    } catch {
      setIsDemo(true)
      setData({ recent_transactions: DEMO_TXNS, monthly_spend: 2341, monthly_income: 5200, spending_by_category: DEMO_CATS, hsa_pending_count: 3, hsa_pending_amount: 89, loans_due_soon: [], unread_notifications: 0 })
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!data || !donutRef.current) return
    if (chartRef.current) chartRef.current.destroy()
    const cats = data.spending_by_category || []
    if (!cats.length) return
    chartRef.current = new Chart(donutRef.current, {
      type: 'doughnut',
      data: { labels: cats.map(c=>c.category), datasets: [{ data: cats.map(c=>c.total), backgroundColor: cats.map(c=>c.color), borderWidth: 3, borderColor: '#fff', hoverOffset: 6 }] },
      options: { responsive: true, cutout:'64%', plugins:{ legend:{display:false}, tooltip:{enabled:true} } },
    })
    return () => { if (chartRef.current) chartRef.current.destroy() }
  }, [data])

  if (loading) return <div style={{ textAlign:'center', padding:40, color:'#9C9A94' }}>Loading…</div>

  const spend  = parseFloat(data?.monthly_spend  || 0)
  const income = parseFloat(data?.monthly_income || 0)
  const net    = income - spend

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>

      {/* Sample data banner */}
      {isDemo && (
        <div style={{ background:'#FFF8DC', border:'1px solid #FFD93D', borderRadius:10, padding:'10px 14px', marginBottom:12, fontSize:12, color:'#7A5C00', display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
          <span style={{ flex:1 }}>{t('dashboard_sample_banner')}</span>
          <button onClick={()=>navigate('/expenses')} style={{ padding:'5px 12px', background:'#FFD93D', color:'#7A5C00', border:'none', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>{t('dashboard_add_expense')}</button>
        </div>
      )}

      {/* Voice strip */}
      <button onClick={()=>navigate('/voice')} style={{ display:'flex', alignItems:'center', gap:10, background:'#FFD93D', border:'none', borderRadius:12, padding:'11px 14px', cursor:'pointer', width:'100%', marginBottom:12, fontFamily:'inherit', boxSizing:'border-box' }}>
        <div style={{ width:10, height:10, borderRadius:'50%', background:'#FF6B6B', flexShrink:0 }} />
        <span style={{ fontSize:13, color:'#7A5C00', flex:1, textAlign:'left' }}>{t('dashboard_voice_placeholder')}</span>
        <i className="ti ti-microphone" style={{ color:'#7A5C00', fontSize:16, flexShrink:0 }} />
      </button>

      {/* KPIs — 2x2 grid on mobile */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
        <KPI label={t('dashboard_spent')}  value={`$${spend.toLocaleString('en-US',{maximumFractionDigits:0})}`}          sub={`${t('month_' + ['january','february','march','april','may','june','july','august','september','october','november','december'][new Date().getMonth()])} ${new Date().getFullYear()}`} bg="#FFD93D" fg="#7A5C00" />
        <KPI label={t('dashboard_income')} value={`$${income.toLocaleString('en-US',{maximumFractionDigits:0})}`}          sub={t('common_this_month')}  bg="#6BCB77" fg="#1A4D1F" />
        <KPI label={t('dashboard_net')}    value={`${net>=0?'+':''}$${Math.abs(net).toLocaleString('en-US',{maximumFractionDigits:0})}`} sub={net>=0?t('dashboard_great_job'):t('dashboard_over_budget')} bg="#4ECDC4" fg="#0D4D4A" />
        <KPI label={t('dashboard_hsa')}    value={`$${parseFloat(data?.hsa_pending_amount||0).toFixed(0)}`}                sub={`${data?.hsa_pending_count||0} receipts`} bg="#C77DFF" fg="#6B21C8" onClick={()=>navigate('/medical')} />
      </div>

      {/* Spending donut — full width on mobile */}
      <div style={{ background:'#fff', border:'1px solid #E8E6E0', borderRadius:14, padding:16, marginBottom:12 }}>
        <div style={{ fontSize:12, fontWeight:600, color:'#5C5A54', marginBottom:12 }}>{t('dashboard_spending')} <span style={{ fontSize:10, color:'#9C9A94', fontWeight:400 }}>{t('dashboard_tap_explore')}</span></div>
        <div style={{ position:'relative', width:'100%', maxWidth:200, margin:'0 auto' }}>
          <canvas ref={donutRef} />
          <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', textAlign:'center', pointerEvents:'none' }}>
            <div style={{ fontSize:16, fontWeight:600 }}>${spend.toLocaleString('en-US',{maximumFractionDigits:0})}</div>
            <div style={{ fontSize:10, color:'#9C9A94' }}>{t('dashboard_total_spend')}</div>
          </div>
        </div>
        {/* Category legend */}
        <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:12, justifyContent:'center' }}>
          {(data?.spending_by_category||[]).map(c=>(
            <div key={c.category} style={{ display:'flex', alignItems:'center', gap:4, fontSize:11 }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:c.color, flexShrink:0 }} />
              <span style={{ color:'#5C5A54' }}>{c.category}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent transactions — full width */}
      <div style={{ background:'#fff', border:'1px solid #E8E6E0', borderRadius:14, padding:16, marginBottom:12 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <span style={{ fontSize:12, fontWeight:600, color:'#5C5A54' }}>{t('dashboard_recent')}</span>
          <button onClick={()=>navigate('/expenses')} style={{ fontSize:12, color:'#7A5C00', background:'none', border:'none', cursor:'pointer', fontWeight:500, fontFamily:'inherit' }}>{t('dashboard_view_all')}</button>
        </div>
        {(data?.recent_transactions||[]).slice(0,5).map(tx => (
          <div key={tx.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 0', borderBottom:'1px solid #F0EEE8' }}>
            <div style={{ width:34, height:34, borderRadius:10, background:(tx.category_color||'#9C9A94')+'22', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <i className={`ti ${tx.category_icon||'ti-tag'}`} style={{ color:tx.category_color||'#9C9A94', fontSize:16 }} />
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{tx.merchant_name||tx.description}</div>
              <div style={{ fontSize:11, color:'#9C9A94', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {tx.category_name} · {new Date(tx.transaction_date).toLocaleDateString()}
              </div>
            </div>
            <div style={{ fontSize:13, fontWeight:600, color:tx.type==='income'?'#1A4D1F':'#8B0000', flexShrink:0 }}>
              {tx.type==='income'?'+':'-'}${Math.abs(parseFloat(tx.amount)||0).toFixed(2)}
            </div>
          </div>
        ))}
      </div>

      {/* Price savings */}
      <div style={{ background:'#fff', border:'1px solid #E8E6E0', borderRadius:14, padding:16 }}>
        <div style={{ fontSize:12, fontWeight:600, color:'#5C5A54', marginBottom:10 }}>{t('dashboard_savings')}</div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {[
            { item:t('save_chicken'), save:'$2.40/lb', store:'Costco vs Kroger', color:'#E8F5E9', tc:'#1A4D1F' },
            { item:t('save_olive'), save:'$2.40', store:'Aldi vs Whole Foods', color:'#FFF8DC', tc:'#7A5C00' },
            { item:t('save_milk'), save:'$0.80', store:'Walmart vs Publix', color:'#E0F7FA', tc:'#0D4D4A' },
          ].map(s=>(
            <div key={s.item} onClick={()=>navigate('/compare')} style={{ background:s.color, borderRadius:10, padding:'10px 12px', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontSize:12, fontWeight:600, color:s.tc }}>t('dashboard_save') + ' ' + s.save</div>
                <div style={{ fontSize:13, margin:'1px 0', fontWeight:500 }}>{s.item}</div>
              </div>
              <div style={{ fontSize:10, color:'#9C9A94', textAlign:'right' }}>{s.store}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function KPI({label,value,sub,bg,fg,onClick}){
  return(
    <div onClick={onClick} style={{ background:bg, color:fg, borderRadius:14, padding:'12px 14px', cursor:onClick?'pointer':'default' }}>
      <div style={{ fontSize:11, fontWeight:500, opacity:.72, marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:20, fontWeight:700, lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:10, marginTop:4, opacity:.6 }}>{sub}</div>
    </div>
  )
}
