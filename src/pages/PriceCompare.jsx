import { useT } from '../lib/i18n.jsx'
import { useState } from 'react'
export default function PriceCompare() {
  const t = useT()
  const [query, setQuery] = useState('')
  const [searched, setSearched] = useState('Whole milk (1 gallon)')
  const [toast, setToast] = useState('')
  const results = [
    { store:'Aldi',          distance:'2.8 mi', price:3.99, updated:'4 days ago',  cheapest:true  },
    { store:'Walmart',       distance:'0.8 mi', price:4.29, updated:'2 days ago',  cheapest:false },
    { store:'Kroger',        distance:'1.2 mi', price:4.89, updated:'today',       cheapest:false },
    { store:'Publix',        distance:'1.5 mi', price:5.19, updated:'1 week ago',  cheapest:false },
    { store:'Whole Foods',   distance:'2.4 mi', price:5.49, updated:'3 days ago',  cheapest:false },
  ]
  function showToast(m){setToast(m);setTimeout(()=>setToast(''),2000)}
  function doSearch(){if(query.trim()){setSearched(query.trim());setQuery('');showToast(`🔍 Searching for "${query}"…`)}}
  const maxP = Math.max(...results.map(r=>r.price))
  return (
    <div>
      <h1 style={{fontSize:20,fontWeight:600,marginBottom:16}}>{t('compare_title')}</h1>
      <div style={{background:'#fff',border:'1px solid #E8E6E0',borderRadius:14,padding:14,marginBottom:12}}>
        <div style={{display:'flex',gap:8}}>
          <input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&doSearch()} placeholder="Search any item to compare prices nearby…" style={{flex:1,padding:'9px 12px',border:'1px solid #D0CEC8',borderRadius:10,fontSize:13,outline:'none',fontFamily:'inherit'}} />
          <button onClick={doSearch} style={{padding:'9px 16px',background:'#FFD93D',color:'#7A5C00',border:'none',borderRadius:10,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Compare</button>
        </div>
        <div style={{display:'flex',gap:6,marginTop:10,flexWrap:'wrap'}}>
          {['Chicken breast','Eggs (dozen)','Olive oil','Orange juice','Greek yogurt'].map(s=>(
            <button key={s} onClick={()=>{setSearched(s);showToast(`🔍 Searching "${s}"…`)}} style={{padding:'4px 10px',background:'#F5F4F0',border:'1px solid #E8E6E0',borderRadius:20,fontSize:11,cursor:'pointer',color:'#5C5A54',fontFamily:'inherit'}}>{s}</button>
          ))}
        </div>
      </div>
      <div style={{background:'#fff',border:'1px solid #E8E6E0',borderRadius:14,overflow:'hidden'}}>
        <div style={{padding:'12px 16px',borderBottom:'1px solid #E8E6E0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div><div style={{fontSize:13,fontWeight:600}}>{searched}</div><div style={{fontSize:11,color:'#9C9A94'}}>Prices within 5 miles · 847 community reports</div></div>
          <span style={{fontSize:10,color:'#9C9A94'}}>📍 Atlanta, GA</span>
        </div>
        {results.map((r,i)=>{
          const pct = (r.price/maxP)*100
          return(
          <div key={r.store} style={{display:'flex',alignItems:'center',gap:12,padding:'13px 16px',borderBottom:i<results.length-1?'1px solid #F0EEE8':'none'}}>
            <div style={{width:10,height:10,borderRadius:'50%',background:r.cheapest?'#6BCB77':'#D0CEC8',flexShrink:0}} />
            <div style={{flex:1}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontSize:13,fontWeight:500}}>{r.store}</span>
                {r.cheapest && <span style={{fontSize:10,padding:'2px 8px',borderRadius:10,background:'#E8F5E9',color:'#1A4D1F',fontWeight:500}}>Cheapest</span>}
              </div>
              <div style={{fontSize:11,color:'#9C9A94',marginTop:2}}>{r.distance} · Updated {r.updated}</div>
              <div style={{height:4,background:'#F0EEE8',borderRadius:2,marginTop:5,overflow:'hidden'}}>
                <div style={{height:'100%',width:`${pct}%`,background:r.cheapest?'#6BCB77':'#D0CEC8',borderRadius:2}} />
              </div>
            </div>
            <div style={{fontSize:18,fontWeight:700,color:r.cheapest?'#1A4D1F':'#1A1A18',flexShrink:0}}>${r.price.toFixed(2)}</div>
            <button onClick={()=>showToast(`📋 Added to shopping list at ${r.store}`)} style={{padding:'5px 10px',background:'#FFF8DC',color:'#7A5C00',border:'none',borderRadius:7,fontSize:11,cursor:'pointer',fontFamily:'inherit',flexShrink:0}}>+ List</button>
          </div>
        )})}
      </div>
      {toast && <div style={{position:'fixed',bottom:24,left:'50%',transform:'translateX(-50%)',background:'#1A1A18',color:'#fff',padding:'10px 20px',borderRadius:20,fontSize:13,fontWeight:500,zIndex:200}}>{toast}</div>}
    </div>
  )
}
