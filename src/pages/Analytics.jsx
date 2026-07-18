import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { useT } from '../lib/i18n.jsx'
import Chart from 'chart.js/auto'

const SPENDING = [
  { label:'Housing',   val:1200, pct:51, color:'#C77DFF', sub:['Rent $1,100','Electricity $60','Internet $40'] },
  { label:'Groceries', val:487,  pct:21, color:'#F5A800', sub:['Kroger $210','Costco $187','Publix $90'] },
  { label:'Dining',    val:318,  pct:14, color:'#FF6B6B', sub:['Chipotle $74','Starbucks $58','Other $186'] },
  { label:'Gas',       val:124,  pct:5,  color:'#FF9A3C', sub:['Shell $62','BP $40','Exxon $22'] },
  { label:'Medical',   val:89,   pct:4,  color:'#4ECDC4', sub:['CVS $25','Dr. Patel $45','Lab $19'] },
  { label:'Other',     val:123,  pct:5,  color:'#6BCB77', sub:['Amazon $67','Misc $56'] },
]
const MONTHLY_DATA = [
  { key:'analytics_month_feb', spend:2100, income:5200 },
  { key:'analytics_month_mar', spend:2450, income:5200 },
  { key:'analytics_month_apr', spend:1980, income:5700 },
  { key:'analytics_month_may', spend:2200, income:5200 },
  { key:'analytics_month_jun', spend:2180, income:5400 },
  { key:'analytics_month_jul', spend:2341, income:5200 },
]

export default function Analytics() {
  const t = useT()
  const MONTHLY = MONTHLY_DATA.map(m => ({ ...m, month: t(m.key) }))
  const donutRef = useRef()
  const barRef = useRef()
  const chartD = useRef()
  const chartB = useRef()
  const [active, setActive] = useState(null)

  useEffect(() => {
    if (chartD.current) chartD.current.destroy()
    chartD.current = new Chart(donutRef.current, {
      type: 'doughnut',
      data: { labels: SPENDING.map(s=>s.label), datasets: [{ data: SPENDING.map(s=>s.val), backgroundColor: SPENDING.map(s=>s.color), borderWidth: 3, borderColor: '#fff', hoverOffset: 8 }] },
      options: { responsive:false, cutout:'64%', plugins:{legend:{display:false},tooltip:{enabled:true}},
        onClick: (e,els) => { setActive(els.length ? SPENDING[els[0].index] : null) }
      }
    })
    if (chartB.current) chartB.current.destroy()
    chartB.current = new Chart(barRef.current, {
      type: 'bar',
      data: { labels: MONTHLY.map(m=>m.month), datasets: [
        { label:'Income', data: MONTHLY.map(m=>m.income), backgroundColor: '#6BCB77CC', borderRadius: 4 },
        { label:'Spending', data: MONTHLY.map(m=>m.spend), backgroundColor: '#FF6B6BCC', borderRadius: 4 },
      ]},
      options: { responsive:false, plugins:{legend:{position:'bottom'}}, scales:{y:{beginAtZero:true}} }
    })
    return () => { chartD.current?.destroy(); chartB.current?.destroy() }
  }, [])

  return (
    <div>
      <h1 style={{fontSize:20,fontWeight:600,marginBottom:16}}>Analytics</h1>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:14}}>
        {[
          {label:t('analytics_net'),bg:'#6BCB77',fg:'#1A4D1F',val:'+$2,859',sub:t('analytics_this_month')},
          {label:t('analytics_biggest'),bg:'#FFD93D',fg:'#7A5C00',val:t('cat_housing'),sub:'$1,200 · 51%'},
          {label:t('analytics_daily'),bg:'#4ECDC4',fg:'#0D4D4A',val:'$75',sub:'vs $82'},
          {label:t('analytics_savings'),bg:'#C77DFF',fg:'#6B21C8',val:'$34',sub:t('analytics_via_compare')},
        ].map(k=>(
          <div key={k.label} style={{background:k.bg,color:k.fg,borderRadius:14,padding:'12px 14px'}}>
            <div style={{fontSize:11,fontWeight:500,opacity:.72,marginBottom:4}}>{k.label}</div>
            <div style={{fontSize:20,fontWeight:700,lineHeight:1}}>{k.val}</div>
            <div style={{fontSize:10,marginTop:4,opacity:.6}}>{k.sub}</div>
          </div>
        ))}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'260px 1fr',gap:12,marginBottom:12}}>
        <div style={{background:'#fff',border:'1px solid #E8E6E0',borderRadius:14,padding:16}}>
          <div style={{fontSize:12,fontWeight:600,color:'#5C5A54',marginBottom:12}}>Spending breakdown <span style={{fontSize:10,color:'#9C9A94',fontWeight:400}}>tap to drill down</span></div>
          <div style={{position:'relative',width:200,height:200,margin:'0 auto'}}>
            <canvas ref={donutRef} width={200} height={200} />
            <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',textAlign:'center',pointerEvents:'none'}}>
              <div style={{fontSize:active?15:16,fontWeight:700}}>{active?`$${active.val}`:'$2,341'}</div>
              <div style={{fontSize:10,color:'#9C9A94'}}>{active?active.label:t('analytics_total')}</div>
            </div>
          </div>
          {active && (
            <div style={{marginTop:10,background:'#F5F4F0',borderRadius:8,padding:'8px 12px'}}>
              {active.sub.map(s=><div key={s} style={{fontSize:12,color:'#5C5A54',padding:'3px 0'}}>{s}</div>)}
            </div>
          )}
          <div style={{display:'flex',flexWrap:'wrap',gap:5,marginTop:10}}>
            {SPENDING.map(s=>(
              <button key={s.label} onClick={()=>setActive(active?.label===s.label?null:s)} style={{display:'flex',alignItems:'center',gap:4,padding:'3px 8px',borderRadius:20,border:`1.5px solid`,borderColor:active?.label===s.label?s.color:'#E8E6E0',background:active?.label===s.label?s.color+'22':'#fff',cursor:'pointer',fontSize:11,fontFamily:'inherit'}}>
                <div style={{width:7,height:7,borderRadius:'50%',background:s.color}} />{s.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{background:'#fff',border:'1px solid #E8E6E0',borderRadius:14,padding:16}}>
          <div style={{fontSize:12,fontWeight:600,color:'#5C5A54',marginBottom:12}}>Income vs Spending — 6 months</div>
          <canvas ref={barRef} width={420} height={220} />
        </div>
      </div>
      <div style={{background:'#fff',border:'1px solid #E8E6E0',borderRadius:14,padding:16}}>
        <div style={{fontSize:12,fontWeight:600,color:'#5C5A54',marginBottom:12}}>Category breakdown</div>
        {SPENDING.map(s=>{
          const pct=Math.round(s.val/2341*100)
          return(
            <div key={s.label} style={{marginBottom:10}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:3}}>
                <span style={{fontWeight:500}}>{s.label}</span>
                <span style={{fontWeight:600}}>${s.val} <span style={{color:'#9C9A94',fontWeight:400}}>· {s.pct}%</span></span>
              </div>
              <div style={{height:6,background:'#F0EEE8',borderRadius:3,overflow:'hidden'}}>
                <div style={{height:'100%',width:`${pct}%`,background:s.color,borderRadius:3,transition:'width 0.5s'}} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
