import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const INK  = '#2a1f14'
const GOLD = '#8a6f4e'
const BG   = '#f8f5f0'
const LT   = '#b0a090'

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

export default function PagePublicScent({ formulaId }) {
  const [formula, setFormula] = useState(null)
  const [notes,   setNotes]   = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound,setNotFound]= useState(false)

  useEffect(() => {
    async function load() {
      const { data: f } = await supabase.from('formulas').select('*').eq('id', formulaId).single()
      if (!f) { setNotFound(true); setLoading(false); return }
      setFormula(f)

      // หา version ล่าสุดที่ final ก่อน ถ้าไม่มีเอา version ล่าสุดเฉยๆ
      const { data: versions } = await supabase.from('formula_versions')
        .select('*').eq('formula_id', formulaId).order('ver')
      const finalV = versions?.find(v => v.is_final || v.status === 'Success')
      const v = finalV || versions?.[versions.length - 1]

      if (v) {
        const { data: items } = await supabase.from('formula_items')
          .select('*, material:materials(*, material_aliases(market_name, context))')
          .eq('version_id', v.id)
        const list = []
        items?.forEach(item => {
          const aliases = item.material?.material_aliases || []
          const name = matchAlias(aliases, item.material_id) || item.material?.name
          if (name && !list.includes(name)) list.push(name)
        })
        setNotes(list)
      }
      setLoading(false)
    }
    load()
  }, [formulaId])

  if (loading) {
    return (
      <div style={pageWrap}>
        <div style={{ color:LT, fontSize:13 }}>กำลังโหลด...</div>
      </div>
    )
  }

  if (notFound || !formula) {
    return (
      <div style={pageWrap}>
        <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:20,
          fontStyle:'italic', color:INK }}>ไม่พบกลิ่นนี้</div>
      </div>
    )
  }

  const feelings = toArray(formula.feeling).slice(0,3)

  return (
    <div style={pageWrap}>
      <div style={{ maxWidth:420, margin:'0 auto', textAlign:'center', padding:'48px 24px' }}>
        <div style={{ fontSize:11, fontWeight:500, color:GOLD,
          letterSpacing:3, textTransform:'uppercase', marginBottom:6 }}>
          LINEN THEORY
        </div>
        <div style={{ fontSize:10, color:LT, letterSpacing:2, textTransform:'uppercase',
          marginBottom:32 }}>EAU DE PARFUM</div>

        <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:34,
          fontStyle:'italic', color:INK, lineHeight:1.15, marginBottom:10 }}>
          {formula.name}
        </div>

        {feelings.length > 0 && (
          <div style={{ fontSize:13, color:INK, fontFamily:'Cormorant Garamond,serif',
            fontStyle:'italic', marginBottom:24 }}>
            {feelings.join('  ·  ')}
          </div>
        )}

        <div style={{ width:32, height:1, background:GOLD, margin:'0 auto 24px' }}/>

        {formula.description && (
          <div style={{ fontSize:14, color:'#5a5048', lineHeight:1.8, marginBottom:28,
            fontFamily:'Inter,sans-serif' }}>
            {formula.description}
          </div>
        )}

        {notes.length > 0 && (
          <div style={{ marginBottom:32 }}>
            <div style={{ fontSize:9, fontWeight:600, color:GOLD, letterSpacing:1.5,
              textTransform:'uppercase', marginBottom:14, fontFamily:'Inter,sans-serif' }}>
              ✦ Notes
            </div>
            {notes.slice(0,6).map((n,i) => (
              <div key={i} style={{ fontFamily:'Cormorant Garamond,serif', fontSize:16,
                fontStyle:'italic', color:INK, lineHeight:1.9 }}>{n}</div>
            ))}
          </div>
        )}

        <div style={{ fontSize:10, color:LT, letterSpacing:1, marginTop:40 }}>
          the art of scent
        </div>
      </div>
    </div>
  )
}

const pageWrap = {
  minHeight:'100vh', background:BG,
  display:'flex', alignItems:'center', justifyContent:'center',
}
