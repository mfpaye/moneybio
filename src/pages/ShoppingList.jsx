import { useT } from '../lib/i18n.jsx'
import { useState, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import { shoppingLists } from '../lib/supabase'

const DEMO_ITEMS = [
  { id:'1', item_name:'Organic whole milk (1 gal)', is_checked:true,  best_price_store:'Walmart',  best_price:4.29, assigned_to_name:'Me',    save:'$0.80 vs Publix' },
  { id:'2', item_name:'Chicken breast (2 lb)',      is_checked:false, best_price_store:'Costco',   best_price:7.58, assigned_to_name:'Me',    save:'$2.40 vs Kroger' },
  { id:'3', item_name:'Large eggs (dozen)',          is_checked:false, best_price_store:'Aldi',     best_price:2.89, assigned_to_name:'Marcus',save:null },
  { id:'4', item_name:'Olive oil (16oz)',            is_checked:false, best_price_store:'Aldi',     best_price:5.99, assigned_to_name:'Me',    save:'$2.40 vs WF' },
  { id:'5', item_name:'Sourdough bread',             is_checked:false, best_price_store:'Kroger',   best_price:3.49, assigned_to_name:'Me',    save:null },
  { id:'6', item_name:'Laundry detergent',           is_checked:false, best_price_store:'Target',   best_price:14.99,assigned_to_name:'Marcus',save:'$3.00 vs CVS' },
]

export default function ShoppingList()
 {
  const { user } = useAuth()
  const t = useT()
  const [items, setItems] = useState(DEMO_ITEMS)
  const [newItem, setNewItem] = useState('')
  const [toast, setToast] = useState('')

  function toggle(id) { setItems(p=>p.map(i=>i.id===id?{...i,is_checked:!i.is_checked}:i)) }
  function addItem() {
    if (!newItem.trim()) return
    setItems(p=>[...p,{id:Date.now().toString(),item_name:newItem.trim(),is_checked:false,best_price_store:null,best_price:null,assigned_to_name:'Me',save:null}])
    setNewItem('')
  }
  function showToast(m){setToast(m);setTimeout(()=>setToast(''),2200)}

  const checked = items.filter(i=>i.is_checked).length
  const total = items.filter(i=>i.best_price).reduce((s,i)=>s+i.best_price,0)
  const savings = items.filter(i=>i.save).length

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
        <h1 style={{fontSize:20,fontWeight:600}}>{t('list_title')}</h1>
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>showToast('📋 Share link copied! Send to anyone.')} style={secBtn}>Share list</button>
          <button onClick={()=>showToast('📷 Opens camera to scan a handwritten list')} style={primBtn}>📷 Scan list</button>
        </div>
      </div>

      {/* Voice add */}
      <button onClick={()=>showToast('🎙️ Listening… say "add eggs and milk"')} style={{display:'flex',alignItems:'center',gap:10,background:'#FFD93D',border:'none',borderRadius:12,padding:'10px 14px',cursor:'pointer',width:'100%',marginBottom:14,fontFamily:'inherit'}}>
        <div style={{width:10,height:10,borderRadius:'50%',background:'#FF6B6B',animation:'pulse 2s infinite'}} />
        <span style={{fontSize:13,color:'#7A5C00',flex:1,textAlign:'left'}}>Say "Add eggs and bread to my list"</span>
        <i className="ti ti-microphone" style={{color:'#7A5C00',fontSize:16}} />
      </button>

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:14}}>
        <div style={{background:'#fff',border:'1px solid #E8E6E0',borderRadius:12,padding:'10px 14px',textAlign:'center'}}><div style={{fontSize:18,fontWeight:700}}>{checked}/{items.length}</div><div style={{fontSize:11,color:'#9C9A94'}}>Checked off</div></div>
        <div style={{background:'#fff',border:'1px solid #E8E6E0',borderRadius:12,padding:'10px 14px',textAlign:'center'}}><div style={{fontSize:18,fontWeight:700}}>${total.toFixed(2)}</div><div style={{fontSize:11,color:'#9C9A94'}}>Est. total</div></div>
        <div style={{background:'#E8F5E9',border:'1px solid #6BCB7740',borderRadius:12,padding:'10px 14px',textAlign:'center'}}><div style={{fontSize:18,fontWeight:700,color:'#1A4D1F'}}>{savings} deals</div><div style={{fontSize:11,color:'#1A4D1F'}}>Price savings found</div></div>
      </div>

      {/* Add item */}
      <div style={{display:'flex',gap:8,marginBottom:14}}>
        <input value={newItem} onChange={e=>setNewItem(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addItem()} placeholder="Add an item…" style={{flex:1,padding:'9px 12px',border:'1px solid #D0CEC8',borderRadius:10,fontSize:13,outline:'none',fontFamily:'inherit'}} />
        <button onClick={addItem} style={primBtn}>Add</button>
      </div>

      {/* List */}
      <div style={{background:'#fff',border:'1px solid #E8E6E0',borderRadius:14,padding:16}}>
        <div style={{fontSize:12,fontWeight:600,color:'#5C5A54',marginBottom:12,display:'flex',justifyContent:'space-between'}}>
          <span>Weekly shop · {items.length} items</span>
          {checked > 0 && <button onClick={()=>{setItems(p=>p.filter(i=>!i.is_checked));showToast(`✅ Removed ${checked} checked items`)}} style={{background:'none',border:'none',cursor:'pointer',fontSize:11,color:'#9C9A94',fontFamily:'inherit'}}>Clear checked ({checked})</button>}
        </div>
        {items.map(item => (
          <div key={item.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:'1px solid #F0EEE8',opacity:item.is_checked?0.5:1,transition:'opacity 0.2s'}}>
            <button onClick={()=>toggle(item.id)} style={{width:24,height:24,borderRadius:'50%',border:`1.5px solid`,borderColor:item.is_checked?'#6BCB77':'#D0CEC8',background:item.is_checked?'#6BCB77':'transparent',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0,transition:'all 0.15s'}}>
              {item.is_checked && <i className="ti ti-check" style={{fontSize:12,color:'#fff'}} />}
            </button>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:500,textDecoration:item.is_checked?'line-through':'none',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.item_name}</div>
              <div style={{fontSize:11,color:'#9C9A94',display:'flex',gap:6,alignItems:'center',marginTop:2,flexWrap:'wrap'}}>
                {item.best_price_store && <span>Best: {item.best_price_store}</span>}
                {item.save && <span style={{background:'#E8F5E9',color:'#1A4D1F',padding:'1px 6px',borderRadius:8,fontSize:10}}>Save {item.save}</span>}
                <span style={{background:'#F5F4F0',color:'#5C5A54',padding:'1px 6px',borderRadius:8,fontSize:10}}>👤 {item.assigned_to_name}</span>
              </div>
            </div>
            {item.best_price && <div style={{fontSize:13,fontWeight:700,flexShrink:0}}>${item.best_price.toFixed(2)}</div>}
          </div>
        ))}
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(1.2)}}`}</style>
      {toast && <div style={{position:'fixed',bottom:24,left:'50%',transform:'translateX(-50%)',background:'#1A1A18',color:'#fff',padding:'10px 20px',borderRadius:20,fontSize:13,fontWeight:500,zIndex:200}}>{toast}</div>}
    </div>
  )
}
const primBtn={display:'inline-flex',alignItems:'center',gap:6,padding:'8px 16px',background:'#FFD93D',color:'#7A5C00',border:'none',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}
const secBtn={padding:'8px 16px',background:'#fff',color:'#5C5A54',border:'1px solid #D0CEC8',borderRadius:8,fontSize:13,cursor:'pointer',fontFamily:'inherit'}
