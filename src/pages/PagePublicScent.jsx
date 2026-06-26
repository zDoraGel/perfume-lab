import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const INK   = '#2a1f14'
const GOLD  = '#8a6f4e'
const BG    = '#f8f5f0'
const BG2   = '#f1ece3'
const LT    = '#b0a090'
const BORDER= '#e8e0d4'

const CONTACTS = [
  { key:'tiktok',  label:'TikTok',        url:'https://www.tiktok.com/@linentheory',
    icon:'M9 2h2.2c.2 1.6 1.3 2.9 2.8 3.3v2.2c-1-.1-2-.4-2.8-1v5.6c0 2.5-2 4.4-4.4 4.4S2.4 14.6 2.4 12.1c0-2.4 1.9-4.3 4.2-4.4v2.2c-1.1.1-2 1.1-2 2.2 0 1.2 1 2.2 2.2 2.2s2.2-1 2.2-2.2V2z' },
  { key:'instagram', label:'Instagram',  url:'https://www.instagram.com/linentheory.official/?hl=en',
    icon:'M8 2.2c1.6 0 1.8 0 2.4.05 1.2.06 2 .26 2.6.5.66.27 1.13.6 1.6 1.1.5.5.85.95 1.1 1.6.24.6.44 1.4.5 2.6.04.6.05.8.05 2.4s0 1.8-.05 2.4c-.06 1.2-.26 2-.5 2.6-.27.66-.6 1.13-1.1 1.6-.5.5-.95.85-1.6 1.1-.6.24-1.4.44-2.6.5-.6.04-.8.05-2.4.05s-1.8 0-2.4-.05c-1.2-.06-2-.26-2.6-.5-.66-.27-1.13-.6-1.6-1.1-.5-.5-.85-.95-1.1-1.6-.24-.6-.44-1.4-.5-2.6C2.2 9.8 2.2 9.6 2.2 8s0-1.8.05-2.4c.06-1.2.26-2 .5-2.6.27-.66.6-1.13 1.1-1.6.5-.5.95-.85 1.6-1.1.6-.24 1.4-.44 2.6-.5C6.2 2.2 6.4 2.2 8 2.2zm0 1.4c-1.56 0-1.74 0-2.36.05-.94.04-1.46.2-1.8.34-.45.18-.78.39-1.1.72-.33.32-.54.65-.72 1.1-.13.34-.3.86-.34 1.8C1.63 8.26 1.63 8.44 1.63 10s0 1.74.05 2.36c.04.94.2 1.46.34 1.8.18.45.39.78.72 1.1.32.33.65.54 1.1.72.34.13.86.3 1.8.34.62.05.8.05 2.36.05s1.74 0 2.36-.05c.94-.04 1.46-.2 1.8-.34.45-.18.78-.39 1.1-.72.33-.32.54-.65.72-1.1.13-.34.3-.86.34-1.8.05-.62.05-.8.05-2.36s0-1.74-.05-2.36c-.04-.94-.2-1.46-.34-1.8a2.9 2.9 0 0 0-.72-1.1 2.9 2.9 0 0 0-1.1-.72c-.34-.13-.86-.3-1.8-.34C9.74 3.63 9.56 3.63 8 3.63zM8 5.8a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4zm0 1.4a.8.8 0 1 0 0 1.6.8.8 0 0 0 0-1.6zm3.9-2.4a.8.8 0 1 1-1.6 0 .8.8 0 0 1 1.6 0z' },
  { key:'facebook', label:'Facebook',    url:'https://www.facebook.com/Linentheory',
    icon:'M14 8a6 6 0 1 0-6.9 5.93V9.9H5.6V8h1.5V6.7c0-1.5.9-2.3 2.2-2.3.6 0 1.2.05 1.4.07v1.6h-.97c-.76 0-.9.36-.9.89V8h1.8l-.24 1.9H8.85v4.03A6 6 0 0 0 14 8z' },
  { key:'line',     label:'LINE Official', url:'https://line.me/R/ti/p/@807kmyan',
    icon:'M8 1.5c-3.6 0-6.5 2.4-6.5 5.4 0 2.7 2.3 4.9 5.4 5.3-.1.4-.5 1.6-.6 1.9-.1.3.1.3.3.2.1-.1 1.7-1.1 2.4-1.6.3 0 .6.05.9.05 3.6 0 6.5-2.4 6.5-5.4S11.6 1.5 8 1.5z' },
]

function toArray(value) {
  if (!value) return []
  if (Array.isArray(value)) return value
  const s = String(value).trim()
  if (s.startsWith('[')) {
    try {
      const arr = JSON.parse(s)
      return Array.isArray(arr) ? arr.map(v => String(v).replace(/^"|"$/g, '')) : []
    } catch { /* fall through */ }
  }
  return s.split(',').map(v => v.trim().replace(/^"|"$/g, '')).filter(Boolean)
}

function matchAlias(aliases, materialId) {
  const mid = parseInt(materialId, 10)
  const ma = aliases.filter(a => parseInt(a.material_id, 10) === mid)
  if (!ma.length) return null
  const preferred = ma.find(a => ['poetic','customer','market'].includes(a.context))
  return (preferred || ma[0])?.market_name || null
}

const BEST_FOR_ICONS = {
  daily_wear:    { label:'Daily Wear',     path:'M8 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM8 .5v2M8 13.5v2M2.4 2.4l1.4 1.4M12.2 12.2l1.4 1.4M.5 8h2M13.5 8h2M2.4 13.6l1.4-1.4M12.2 3.8l1.4-1.4' },
  office_day:    { label:'Office Day',     path:'M2 4h12v7H2V4zM5 4V2.5A1 1 0 0 1 6 1.5h4A1 1 0 0 1 11 2.5V4M.5 13h15' },
  casual_date:   { label:'Casual Date',    path:'M4 6h8M4.5 3h7l1 3-1 7h-7l-1-7 1-3z' },
  spring_summer: { label:'Spring & Summer',path:'M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM8 1.5c1 1 1 2.2 0 3M8 14.5c-1-1-1-2.2 0-3M1.5 8c1-1 2.2-1 3 0M14.5 8c-1 1-2.2 1-3 0M3 3c1.3.2 2 1 2.3 2.3M13 3c-1.3.2-2 1-2.3 2.3M3 13c1.3-.2 2-1 2.3-2.3M13 13c-1.3-.2-2-1-2.3-2.3' },
  night_out:     { label:'Night Out',      path:'M13.5 9.3A6 6 0 1 1 6.7 2.5a5 5 0 0 0 6.8 6.8z' },
  romantic:      { label:'Romantic',       path:'M8 13.8s-6-3.7-6-7.8A3.2 3.2 0 0 1 8 4.3 3.2 3.2 0 0 1 14 6c0 4.1-6 7.8-6 7.8z' },
  cozy_night:    { label:'Cozy Night',     path:'M8 2v2M8 12v2M2 8h2M12 8h2M4.2 4.2l1.4 1.4M10.4 10.4l1.4 1.4M4.2 11.8l1.4-1.4M10.4 5.6l1.4-1.4' },
}

export default function PagePublicScent({ formulaId }) {
  const [formula,  setFormula]  = useState(null)
  const [notesByRole, setNotesByRole] = useState({ Top:[], Heart:[], Base:[] })
  const [others,   setOthers]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: f } = await supabase.from('formulas').select('*').eq('id', formulaId).single()
      if (!f) { setNotFound(true); setLoading(false); return }
      setFormula(f)

      const { data: versions } = await supabase.from('formula_versions')
        .select('*').eq('formula_id', formulaId).order('ver')
      const finalV = versions?.find(v => v.is_final || v.status === 'Success')
      const v = finalV || versions?.[versions.length - 1]

      if (v) {
        const { data: items } = await supabase.from('formula_items')
          .select('*, material:materials(*, material_aliases(market_name, context))')
          .eq('version_id', v.id)
        const grouped = { Top:[], Heart:[], Base:[] }
        items?.forEach(item => {
          const aliases = item.material?.material_aliases || []
          const name = matchAlias(aliases, item.material_id) || item.material?.name
          const role = item.material?.evaporation || 'Heart'
          if (name && grouped[role] && !grouped[role].includes(name)) grouped[role].push(name)
        })
        setNotesByRole(grouped)
      }

      const { data: othersData } = await supabase.from('formulas')
        .select('id, name, bottle_image_url').eq('lot_status', 'active')
        .neq('id', formulaId).limit(4)
      setOthers(othersData || [])

      setLoading(false)
    }
    load()
  }, [formulaId])

  if (loading) {
    return <div style={pageWrap}><div style={{ color:LT, fontSize:13 }}>กำลังโหลด...</div></div>
  }
  if (notFound || !formula) {
    return <div style={pageWrap}>
      <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:20, fontStyle:'italic', color:INK }}>
        ไม่พบกลิ่นนี้
      </div>
    </div>
  }

  const feelings = toArray(formula.feeling).slice(0,3)
  const bestFor   = toArray(formula.best_for)
  const hasNotes  = notesByRole.Top.length || notesByRole.Heart.length || notesByRole.Base.length

  return (
    <div style={{ minHeight:'100vh', background:BG, fontFamily:'Inter,sans-serif' }}>
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div style={{ textAlign:'center', padding:'28px 20px 0' }}>
        <div style={{ fontSize:18, fontWeight:600, color:INK, letterSpacing:4 }}>LINEN THEORY</div>
        <div style={{ fontSize:11, color:GOLD, fontStyle:'italic', marginTop:2 }}>the art of scent</div>
      </div>

      {/* ── Hero: รูป + ชื่อ/feeling/description ────────────────────────────── */}
      <div style={{ maxWidth:760, margin:'28px auto 0', padding:'0 20px',
        display:'flex', flexWrap:'wrap', gap:28, alignItems:'center', justifyContent:'center' }}>

        <div style={{ width:260, aspectRatio:'4/5', borderRadius:14, overflow:'hidden',
          background: formula.bottle_image_url ? '#fff' : `linear-gradient(150deg, #ece3d3, #f8f3ea)`,
          flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
          {formula.bottle_image_url ? (
            <img src={formula.bottle_image_url} alt={formula.name}
              style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
          ) : (
            <span style={{ fontSize:11, color:LT, fontStyle:'italic' }}>Linen Theory</span>
          )}
        </div>

        <div style={{ flex:1, minWidth:240, maxWidth:380, textAlign:'center' }}>
          <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:32,
            fontStyle:'italic', color:INK, lineHeight:1.15 }}>{formula.name}</div>
          {feelings.length > 0 && (
            <div style={{ fontSize:13, color:'#6b5648', marginTop:8 }}>{feelings.join('  ·  ')}</div>
          )}
          <div style={{ width:28, height:1, background:GOLD, margin:'16px auto' }}/>
          {formula.description && (
            <div style={{ fontSize:13.5, color:'#5a5048', lineHeight:1.8 }}>{formula.description}</div>
          )}
        </div>
      </div>

      {/* ── Notes pyramid ─────────────────────────────────────────────────── */}
      {hasNotes && (
        <div style={{ background:BG2, marginTop:40, padding:'32px 20px' }}>
          <div style={{ maxWidth:480, margin:'0 auto' }}>
            <div style={{ fontSize:10, fontWeight:700, color:GOLD, letterSpacing:1.5,
              textTransform:'uppercase', marginBottom:18 }}>Notes</div>
            {['Top','Heart','Base'].map((role, ri) => notesByRole[role].length > 0 && (
              <div key={role} style={{ marginBottom: ri<2 ? 16 : 0,
                paddingBottom: ri<2 ? 14 : 0,
                borderBottom: ri<2 ? `1px dashed ${BORDER}` : 'none' }}>
                <div style={{ fontSize:9, fontWeight:700, color:GOLD, letterSpacing:1,
                  textTransform:'uppercase', marginBottom:6 }}>{role}</div>
                {notesByRole[role].map((n,i) => (
                  <div key={i} style={{ fontSize:14, color:INK }}>{n}</div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Best For ───────────────────────────────────────────────────────── */}
      {bestFor.length > 0 && (
        <div style={{ padding:'36px 20px 0', textAlign:'center' }}>
          <div style={{ fontSize:10, fontWeight:700, color:GOLD, letterSpacing:1.5,
            textTransform:'uppercase', marginBottom:18 }}>Best For</div>
          <div style={{ display:'flex', justifyContent:'center', gap:24, flexWrap:'wrap',
            maxWidth:480, margin:'0 auto' }}>
            {bestFor.slice(0,4).map((bf,i) => {
              const opt = BEST_FOR_ICONS[bf]
              return (
                <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:'center',
                  gap:8, width:80 }}>
                  <svg width="26" height="26" viewBox="0 0 16 16" fill="none">
                    <path d={opt?.path || 'M3 8h10'} stroke={GOLD} strokeWidth="0.9"/>
                  </svg>
                  <div style={{ fontSize:11, color:'#6b5648' }}>{opt?.label || bf}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Contact links — สีเดียวกันทั้งหมด ไม่โดด ──────────────────────────── */}
      <div style={{ padding:'36px 20px 0', textAlign:'center' }}>
        <div style={{ fontSize:10, fontWeight:700, color:GOLD, letterSpacing:1.5,
          textTransform:'uppercase', marginBottom:14 }}>Explore Linen Theory</div>
        <div style={{ maxWidth:380, margin:'0 auto', display:'flex',
          flexDirection:'column', gap:8 }}>
          {CONTACTS.map(c => (
            <a key={c.key} href={c.url} target="_blank" rel="noreferrer"
              style={{ display:'flex', alignItems:'center', gap:10,
                padding:'12px 16px', borderRadius:10, border:`1px solid ${BORDER}`,
                background:'#fff', textDecoration:'none', color:INK }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill={GOLD}><path d={c.icon}/></svg>
              <span style={{ fontSize:13, flex:1, textAlign:'left' }}>{c.label}</span>
              <span style={{ color:LT, fontSize:14 }}>›</span>
            </a>
          ))}
        </div>
      </div>

      {/* ── Discover more scents ──────────────────────────────────────────── */}
      {others.length > 0 && (
        <div style={{ padding:'40px 20px 0', textAlign:'center' }}>
          <div style={{ fontSize:10, fontWeight:700, color:GOLD, letterSpacing:1.5,
            textTransform:'uppercase', marginBottom:16 }}>Discover More Scents</div>
          <div style={{ display:'flex', gap:14, flexWrap:'wrap', justifyContent:'center',
            maxWidth:600, margin:'0 auto' }}>
            {others.map(o => (
              <a key={o.id} href={`/scent/${o.id}`}
                style={{ width:110, textDecoration:'none', color:INK }}>
                <div style={{ width:'100%', aspectRatio:'4/5', borderRadius:10, overflow:'hidden',
                  background: o.bottle_image_url ? '#fff' : '#ece3d3', marginBottom:8 }}>
                  {o.bottle_image_url && (
                    <img src={o.bottle_image_url} alt={o.name}
                      style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                  )}
                </div>
                <div style={{ fontSize:12 }}>{o.name}</div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <div style={{ textAlign:'center', padding:'48px 20px 50px' }}>
        <div style={{ fontSize:14, fontWeight:600, color:INK, letterSpacing:2 }}>LINEN THEORY</div>
        <div style={{ fontSize:10, color:GOLD, fontStyle:'italic', marginBottom:18 }}>the art of scent</div>
        <a href="https://line.me/R/ti/p/@807kmyan" target="_blank" rel="noreferrer"
          style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'12px 32px',
            borderRadius:24, background:'#5a4a3a', color:'#fff', fontSize:13, fontWeight:600,
            textDecoration:'none' }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M4 5.5h8l-.6 7.2a1 1 0 0 1-1 .8H5.6a1 1 0 0 1-1-.8L4 5.5z"
              stroke="#fff" strokeWidth="1.1" fill="none"/>
            <path d="M6 5.2V4a2 2 0 0 1 4 0v1.2" stroke="#fff" strokeWidth="1.1" fill="none"/>
          </svg>
          Shop Now
        </a>
      </div>
    </div>
  )
}

const pageWrap = {
  minHeight:'100vh', background:BG,
  display:'flex', alignItems:'center', justifyContent:'center',
}
