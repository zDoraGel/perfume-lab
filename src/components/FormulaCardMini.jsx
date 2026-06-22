import { useState, useRef, useEffect } from 'react'
import { db } from '../lib/db'

// 5.4×9 cm @ 96dpi → 204×340 px
const W    = 204
const H    = 340
const BG   = '#f8f5f0'
const INK  = '#2a1f14'
const GOLD = '#8a6f4e'
const MID  = '#b0a090'
const LIGHT= '#d4c4b0'

const CONC_STYLE = {
  SOFT:      { label:'SOFT',      c:'#5a8a6a' },
  SIGNATURE: { label:'SIGNATURE', c:GOLD      },
  DEEP:      { label:'DEEP',      c:'#8a4a4a' },
}

const feelingMap = {
  quietly_clean:'calm', effortless_luxury:'elegant', approachable:'approachable',
  warm:'warm', soft_smooth:'soft', comforting:'comforting', relaxing:'relaxing',
  soft_romantic:'romantic', natural_charm:'natural', minimal_luxury:'refined',
  airy:'airy', clean_neat:'clean', modern_mature:'modern', slightly_mysterious:'mysterious',
  soft_sexy:'sensual', fresh_bright:'fresh', confident:'confident', gentle:'gentle',
  calm:'calm', sophisticated:'sophisticated', cozy:'cozy', skin_scent:'skin',
  clean_laundry:'clean', soft_glow:'luminous', quiet_luxury:'quiet luxury',
  whisper_scent:'whisper', second_skin:'skin', understated:'understated',
  naturally_fragrant:'naturally fragrant', intimate:'intimate', artistic_niche:'artistic',
  second_skin:'second skin', airy_bloom:'airy bloom',
}

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

function getFeelingLabels(formula) {
  if (formula.feeling) {
    return toArray(formula.feeling).map(v => {
      const k = v.trim().toLowerCase().replace(/-/g,'_').replace(/\s+/g,'_')
      return feelingMap[k] || v.trim().toLowerCase().replace(/_/g,' ')
    }).filter(Boolean).slice(0,3)
  }
  if (formula.vibe) return toArray(formula.vibe).slice(0,3)
  return []
}

function matchAlias(aliases, materialId) {
  // ใช้ parseInt เทียบทั้งสองฝั่ง — material_id เป็น int8 ใน Supabase
  // บางครั้งถูก return เป็น string ทำให้ === เทียบไม่ตรง (alias หาไม่เจอเลย)
  const mid = parseInt(materialId, 10)
  if (isNaN(mid)) return null
  const ma = aliases.filter(a => parseInt(a.material_id, 10) === mid)
  if (!ma.length) return null
  const preferred = ma.find(a => ['poetic','customer','market'].includes(a.context))
  return (preferred || ma[0])?.market_name || null
}

// ── Card Component ────────────────────────────────────────────────────────────
function MiniCard({ formula, items, aliases, concentration }) {
  const cs = CONC_STYLE[concentration] || CONC_STYLE.SIGNATURE
  const feelings = getFeelingLabels(formula)
  const feelingStr = feelings.join('  ·  ')

  // all notes deduped
  const notes = []
  console.log('[DEBUG MiniCard] aliases loaded:', aliases)
  items.forEach(item => {
    const alias = matchAlias(aliases, item.material_id) || item.material?.name
    console.log('[DEBUG MiniCard] material_id:', item.material_id, typeof item.material_id,
      '→ matched alias:', alias, '| fallback name:', item.material?.name)
    if (alias && !notes.includes(alias)) notes.push(alias)
  })

  return (
    <div style={{
      width:W, height:H, background:BG, overflow:'hidden',
      fontFamily:'Inter,sans-serif', boxSizing:'border-box',
      display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'space-between',
      padding:'18px 28px 14px',
    }}>
      {/* Brand */}
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:6.5, fontWeight:500, color:GOLD,
          letterSpacing:2.5, textTransform:'uppercase', marginBottom:2 }}>
          LINEN THEORY
        </div>
        <div style={{ fontSize:5.5, color:MID, letterSpacing:2, textTransform:'uppercase' }}>
          EAU DE PARFUM
        </div>
      </div>

      {/* Name */}
      <div style={{ textAlign:'center' }}>
        <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:22,
          whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
          color:INK, lineHeight:1.15, marginBottom:6 }}>
          {formula.name}
        </div>
        {/* short divider */}
        <div style={{ width:24, height:0.5, background:GOLD, margin:'0 auto' }}/>
      </div>

      {/* Feeling */}
      {feelings.length > 0 && (
        <div style={{ textAlign:'center', fontSize:9.5,
          color:INK, letterSpacing:0.2, fontFamily:'Cormorant Garamond,serif',
          lineHeight:1.6 }}>
          {feelings.slice(0,3).map((f, i) => (
            <span key={i}>
              {i > 0 && <span style={{ color:LIGHT }}> · </span>}
              <span style={{ whiteSpace:'nowrap' }}>{f}</span>
            </span>
          ))}
        </div>
      )}

      {/* ✦ + Notes + ✦ */}
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:8, color:GOLD, marginBottom:5 }}>✦</div>
        {notes.slice(0,5).map((n,i) => (
          <div key={i} style={{
            fontFamily:'Cormorant Garamond,serif', fontSize:11,
            fontStyle:'italic', color:INK, lineHeight:1.7,
          }}>{n}</div>
        ))}
        <div style={{ fontSize:8, color:GOLD, marginTop:5 }}>✦</div>
      </div>

      {/* Footer */}
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:7, color:MID, letterSpacing:1 }}>
          the art of scent
        </div>
      </div>
    </div>
  )
}

// ── Concentration Picker ──────────────────────────────────────────────────────
function ConcPicker({ onSelect, onClose }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)',
      display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 }}>
      <div style={{ background:'#fff', borderRadius:16, padding:24, width:290 }}>
        <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:19,
          fontStyle:'italic', color:INK, marginBottom:16, textAlign:'center' }}>
          เลือก Concentration
        </div>
        {Object.entries(CONC_STYLE).map(([key, cs]) => (
          <button key={key} onClick={() => onSelect(key)}
            style={{ width:'100%', padding:'12px 16px', borderRadius:10, cursor:'pointer',
              fontFamily:'Inter,sans-serif', fontSize:13, fontWeight:600,
              background:'#f8f5f0', border:`1.5px solid ${cs.c}`, color:cs.c,
              marginBottom:8, display:'flex', justifyContent:'space-between' }}>
            <span>{cs.label}</span>
            <span style={{ fontWeight:400, fontSize:11 }}>
              {key==='SOFT'?'12%':key==='SIGNATURE'?'18%':'25%'}
              {' · '}
              {key==='SOFT'?'4–6hrs':key==='SIGNATURE'?'6–8hrs':'10–14hrs'}
            </span>
          </button>
        ))}
        <button onClick={onClose}
          style={{ width:'100%', padding:'9px 0', borderRadius:10, cursor:'pointer',
            fontFamily:'Inter,sans-serif', fontSize:12,
            background:'transparent', border:`1px solid ${LIGHT}`, color:MID }}>
          ยกเลิก
        </button>
      </div>
    </div>
  )
}

// ── Main Export ───────────────────────────────────────────────────────────────
export default function FormulaCardMini({ formula, onClose }) {
  const cardRef = useRef()
  const [concentration, setConc]    = useState('SIGNATURE')
  const [items,         setItems]   = useState([])
  const [aliases,       setAliases] = useState([])
  const [saving,        setSaving]  = useState(false)

  useEffect(() => {
    async function load() {
      const versions = await db.getVersions(formula.id)
      if (!versions.length) return
      const latest = versions[versions.length - 1]
      const its = await db.getItems(latest.id)
      setItems(its)
      const ids = its.map(i => i.material_id).filter(Boolean)
      if (ids.length) {
        const al = db.getAliasesByIds ? await db.getAliasesByIds(ids) : []
        setAliases(Array.isArray(al) ? al : [])
      }
    }
    load()
  }, [formula.id])

  async function savePNG() {
    setSaving(true)
    try {
      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(cardRef.current, {
        scale:4, useCORS:true, backgroundColor:BG, width:W, height:H,
      })
      const a = document.createElement('a')
      a.download = `${formula.name.replace(/\s+/g,'-')}-mini-${concentration}.png`
      a.href = canvas.toDataURL('image/png')
      a.click()
    } catch(e) { alert('Save failed: '+e.message) }
    setSaving(false)
  }

  async function savePDF() {
    setSaving(true)
    try {
      const { default: html2canvas } = await import('html2canvas')
      const { default: jsPDF }       = await import('jspdf')
      const canvas = await html2canvas(cardRef.current, {
        scale:4, useCORS:true, backgroundColor:BG, width:W, height:H,
      })
      // A4 portrait — 3 col × 3 row = 8 cards (5.4×9 cm each)
      const pdf = new jsPDF({ orientation:'portrait', unit:'cm', format:'a4' })
      for (let col=0; col<3; col++) {
        for (let row=0; row<3; row++) {
          pdf.addImage(canvas.toDataURL('image/png'), 'PNG',
            1 + col*6, 1 + row*9.5, 5.4, 9)
        }
      }
      pdf.save(`${formula.name.replace(/\s+/g,'-')}-mini-cards.pdf`)
    } catch(e) { alert('PDF failed: '+e.message) }
    setSaving(false)
  }

  if (!concentration) return null

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)',
      display:'flex', flexDirection:'column', alignItems:'center',
      justifyContent:'center', zIndex:100, gap:14 }}>

      <div ref={cardRef} style={{ boxShadow:'0 8px 32px rgba(0,0,0,0.35)', borderRadius:4 }}>
        <MiniCard formula={formula} items={items} aliases={aliases} concentration={concentration}/>
      </div>

      <div style={{ fontSize:10.5, color:'rgba(255,255,255,0.5)' }}>
        5.4×9 cm · PDF ใส่ได้ 8 ใบ/แผ่น A4
      </div>

      <div style={{ display:'flex', gap:8, flexWrap:'wrap', justifyContent:'center' }}>
        <button onClick={savePNG} disabled={saving}
          style={{ padding:'9px 20px', borderRadius:20, cursor:'pointer',
            fontFamily:'Inter,sans-serif', fontSize:12, fontWeight:600,
            background:GOLD, border:'none', color:'#fff', opacity:saving?0.6:1 }}>
          {saving?'⏳...':'🖼 Save PNG'}
        </button>
        <button onClick={savePDF} disabled={saving}
          style={{ padding:'9px 20px', borderRadius:20, cursor:'pointer',
            fontFamily:'Inter,sans-serif', fontSize:12, fontWeight:600,
            background:'#5a4a3a', border:'none', color:'#fff', opacity:saving?0.6:1 }}>
          {saving?'⏳...':'📄 PDF (8 ใบ/A4)'}
        </button>
        <button onClick={onClose}
          style={{ padding:'9px 14px', borderRadius:20, cursor:'pointer',
            fontFamily:'Inter,sans-serif', fontSize:12,
            background:'transparent', border:'1px solid rgba(255,255,255,0.25)',
            color:'rgba(255,255,255,0.6)' }}>✕</button>
      </div>
    </div>
  )
}
