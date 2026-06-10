import { useState, useRef, useEffect } from 'react'
import { db } from '../lib/db'
import { FEELING_OPTS } from '../constants/formulaDNA'
import LabelGenerator from './LabelGenerator'

const CARD_W = 340
const CARD_H = 610
const BG     = '#f8f5f0'
const INK    = '#2a1f14'
const GOLD   = '#8a6f4e'
const MID    = '#b0a090'
const LIGHT  = '#d4c4b0'

// ── SVG icons (generic, ไม่ specific species) ───────────────────────────────────
const IconDrop = ({size=16}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 3C12 3 6 9.5 6 14a6 6 0 0012 0C18 9.5 12 3 12 3Z"
      stroke={GOLD} strokeWidth="1.2" fill="none"/>
  </svg>
)
const IconWave = ({size=16}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M3 12 Q6 8 9 12 Q12 16 15 12 Q18 8 21 12"
      stroke={GOLD} strokeWidth="1.3" strokeLinecap="round" fill="none"/>
    <path d="M3 16 Q6 12 9 16 Q12 20 15 16 Q18 12 21 16"
      stroke={GOLD} strokeWidth=".8" strokeLinecap="round" fill="none" opacity=".5"/>
  </svg>
)
const IconLeaf = ({size=16}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 21C12 21 5 15 5 9C5 5.7 8.1 3 12 3C15.9 3 19 5.7 19 9C19 15 12 21 12 21Z"
      stroke={GOLD} strokeWidth="1.2" fill="none"/>
    <line x1="12" y1="21" x2="12" y2="9" stroke={GOLD} strokeWidth=".8" strokeDasharray="2 2"/>
  </svg>
)
const IconCircles = ({size=16}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke={GOLD} strokeWidth="1.2" fill="none"/>
    <circle cx="12" cy="12" r="5.5" stroke={GOLD} strokeWidth=".9" fill="none"/>
    <circle cx="12" cy="12" r="2" stroke={GOLD} strokeWidth=".8" fill="none"/>
  </svg>
)
const IconCloud = ({size=16}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M6 17a4 4 0 010-8 4.5 4.5 0 018.9-1A3.5 3.5 0 0119 11.5 3.5 3.5 0 0118 17Z"
      stroke={GOLD} strokeWidth="1.2" fill="none"/>
  </svg>
)
const IconSpiral = ({size=16}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" stroke={GOLD} strokeWidth="1" fill="none"/>
    <path d="M12 11C12 8 9 6 7 8C5 10 7 14 11 14C15 14 18 10 16 6C14 2 8 2 5 5"
      stroke={GOLD} strokeWidth="1.2" fill="none" strokeLinecap="round"/>
  </svg>
)

// mood map: feeling → { icon component fn, label }
const MOOD_MAP = {
  quietly_clean:       { I: IconCloud,   label: 'Air'     },
  effortless_luxury:   { I: IconCircles, label: 'Depth'   },
  approachable:        { I: IconDrop,    label: 'Soft'    },
  warm:                { I: IconWave,    label: 'Warm'    },
  soft_smooth:         { I: IconDrop,    label: 'Smooth'  },
  comforting:          { I: IconWave,    label: 'Cozy'    },
  relaxing:            { I: IconCloud,   label: 'Calm'    },
  soft_romantic:       { I: IconDrop,    label: 'Soft'    },
  natural_charm:       { I: IconLeaf,    label: 'Green'   },
  minimal_luxury:      { I: IconCircles, label: 'Quiet'   },
  airy:                { I: IconCloud,   label: 'Air'     },
  clean_neat:          { I: IconDrop,    label: 'Clean'   },
  modern_mature:       { I: IconCircles, label: 'Wood'    },
  slightly_mysterious: { I: IconSpiral,  label: 'Mystery' },
  soft_sexy:           { I: IconWave,    label: 'Sensual' },
  fresh_bright:        { I: IconCloud,   label: 'Fresh'   },
  confident:           { I: IconCircles, label: 'Bold'    },
  gentle:              { I: IconDrop,    label: 'Gentle'  },
  calm:                { I: IconCloud,   label: 'Calm'    },
  sophisticated:       { I: IconCircles, label: 'Refined' },
  cozy:                { I: IconWave,    label: 'Cozy'    },
  skin_scent:          { I: IconDrop,    label: 'Skin'    },
  clean_laundry:       { I: IconCloud,   label: 'Linen'   },
  soft_glow:           { I: IconDrop,    label: 'Glow'    },
  korean_soft:         { I: IconDrop,    label: 'Soft'    },
  quiet_luxury:        { I: IconCircles, label: 'Quiet'   },
  self_care:           { I: IconWave,    label: 'Care'    },
  huggable:            { I: IconDrop,    label: 'Hug'     },
  artistic_niche:      { I: IconSpiral,  label: 'Niche'   },
  whisper_scent:       { I: IconCloud,   label: 'Whisper' },
}

// ── Scent Profile: weighted avg จาก material_traits × amount_g ──────────────────
const PROFILE_AXES = ['Freshness','Softness','Sweetness','Airiness','Warmth']
const TRAIT_KEYS   = ['freshness','softness','sweetness','airiness','warmth']

// ── Radar Chart ──────────────────────────────────────────────────────────────
function RadarChart({ dots, size = 80 }) {
  const cx = size / 2, cy = size / 2
  const r  = size * 0.38
  const n  = 5
  const axes = PROFILE_AXES.map((label, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2
    return { label, angle, x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
  })

  // polygon points from dots (0-5 scale)
  const points = axes.map((ax, i) => {
    const val = (dots[i] || 0) / 5
    const x = cx + r * val * Math.cos(ax.angle)
    const y = cy + r * val * Math.sin(ax.angle)
    return `${x},${y}`
  }).join(' ')

  // grid rings
  const rings = [1,2,3,4,5].map(ring => {
    const rr = r * ring / 5
    return axes.map((ax, i) => {
      const x = cx + rr * Math.cos(ax.angle)
      const y = cy + rr * Math.sin(ax.angle)
      return `${i===0?'M':'L'}${x},${y}`
    }).join(' ') + 'Z'
  })

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* grid */}
      {rings.map((d, i) => (
        <path key={i} d={d} fill="none" stroke={LIGHT} strokeWidth={0.5}/>
      ))}
      {/* axes */}
      {axes.map((ax, i) => (
        <line key={i} x1={cx} y1={cy} x2={ax.x} y2={ax.y}
          stroke={LIGHT} strokeWidth={0.5}/>
      ))}
      {/* data */}
      <polygon points={points} fill={GOLD} fillOpacity={0.2}
        stroke={GOLD} strokeWidth={1}/>
      {/* axis labels */}
      {axes.map((ax, i) => {
        const lx = cx + (r + 8) * Math.cos(ax.angle)
        const ly = cy + (r + 8) * Math.sin(ax.angle)
        return (
          <text key={i} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
            fontSize={5} fill={MID} fontFamily="Inter,sans-serif">
            {ax.label.slice(0,4)}
          </text>
        )
      })}
    </svg>
  )
}

// ── Cost Calculator ──────────────────────────────────────────────────────────
function calcCost(items) {
  let totalG = 0, totalCost = 0, hasCost = false
  items.forEach(item => {
    const g    = parseFloat(item.grams ?? item.amount_g ?? 0)
    const cost = parseFloat(item.material?.cost ?? 0)
    totalG += g
    if (cost > 0) { totalCost += g * cost; hasCost = true }
  })
  if (!totalG || !hasCost) return null
  const perG    = totalCost / totalG
  const perDrop = perG * 0.05 // 1 drop ≈ 0.05g
  return { perG, perDrop, totalCost, totalG }
}

function calcDots(items, traits) {
  let sumW = 0
  const totals = [0,0,0,0,0]
  items.forEach(item => {
    const t = traits[item.material_id]
    if (!t) return
    const w = parseFloat(item.grams ?? item.amount_g) || 0
    TRAIT_KEYS.forEach((k,i) => { totals[i] += (t[k] || 0) * w })
    sumW += w
  })
  if (!sumW) return [0,0,0,0,0]
  return totals.map(s => Math.min(5, Math.round(s / sumW)))
}

// ── Quote จาก vibe/feeling ───────────────────────────────────────────────────────
function deriveQuote(formula) {
  if (formula.vibe) {
    const vibe = formula.vibe.trim()
    const dot = vibe.search(/[.。!?]/)
    const first = dot > 10 && dot < 80 ? vibe.slice(0, dot+1) : vibe.slice(0, 60).trimEnd()
    if (first.length > 12) return first
  }
  if (formula.name_meaning) return formula.name_meaning
  const feel = formula.feeling?.split(',')[0]
  const fallbacks = {
    quietly_clean: 'Like morning light on clean linen.',
    effortless_luxury: 'Worn like a second skin.',
    warm: 'A quiet warmth that lingers.',
    airy: 'Light as the space between things.',
    soft_smooth: 'Softness without apology.',
    relaxing: 'Breathe. Be still.',
    fresh_bright: 'Bright and unhurried.',
    clean_laundry: 'Like sheets dried in open air.',
    skin_scent: 'Your skin, only softer.',
  }
  return fallbacks[feel] || 'A fragrance that quietly stays.'
}

// ── Alias lookup ─────────────────────────────────────────────────────────────────
function matchAlias(aliases, materialId, ctx) {
  const ma = aliases.filter(a => a.material_id === materialId)
  if (!ma.length) return null
  if (ctx) {
    const cw  = ctx.toLowerCase().split(/[,\s]+/)
    const hit = ma.find(a => a.context && a.context.toLowerCase().split(/[,\s]+/).some(c => cw.includes(c)))
    if (hit) return hit.market_name
  }
  const preferred = ma.find(a => ['poetic','customer','market'].includes(a.context))
  return (preferred || ma[0])?.market_name || null
}

// alias keywords สำหรับ Mood (ดึงจาก keywords field)
function aliasKeywords(aliases, items, ctx, max=4) {
  const seen = new Set()
  const out = []
  items.forEach(item => {
    const ma = aliases.filter(a => a.material_id === item.material_id)
    if (!ma.length) return
    // เลือก alias ที่ match context ก่อน
    let best = ma[0]
    if (ctx) {
      const cw = ctx.toLowerCase().split(/[,\s]+/)
      const hit = ma.find(a => a.context && a.context.toLowerCase().split(/[,\s]+/).some(c => cw.includes(c)))
      if (hit) best = hit
    }
    // ดึง keywords field แยกด้วย comma/+
    if (best.keywords) {
      best.keywords.split(/[,+]+/).map(k => k.trim()).filter(Boolean).forEach(k => {
        if (!seen.has(k.toLowerCase()) && out.length < max) {
          seen.add(k.toLowerCase())
          out.push(k)
        }
      })
    }
  })
  return out
}

const feelingMap = {
  'quietly_clean':'calm','effortless_luxury':'elegant','approachable':'approachable',
  'warm':'warm','soft_smooth':'soft','comforting':'comforting','relaxing':'relaxing',
  'soft_romantic':'romantic','natural_charm':'natural','minimal_luxury':'refined',
  'airy':'airy','clean_neat':'clean','modern_mature':'modern','slightly_mysterious':'mysterious',
  'soft_sexy':'sensual','fresh_bright':'fresh','confident':'confident','gentle':'gentle',
  'calm':'calm','sophisticated':'sophisticated','cozy':'cozy','skin_scent':'skin',
  'clean_laundry':'clean','soft_glow':'luminous','korean_soft':'soft',
  'quiet_luxury':'quiet luxury','self_care':'caring','huggable':'cozy',
  'artistic_niche':'niche','whisper_scent':'whisper',
  'sukum':'sukum','open_window':'airy','morning_dew':'dewy','clean_room':'clean',
  'fresh_linen':'fresh linen','after_rain':'after rain','second_skin':'skin',
  'naturally_fragrant':'naturally fragrant','close_proximity':'intimate',
  'subtle_signature':'subtle','understated':'understated',
  'low_profile_luxury':'low-key luxury','connoisseur':'refined','classic':'classic',
  'garden_fresh':'garden fresh','white_garden':'white garden','airy_bloom':'airy bloom',
}

function getFeelingLabel(raw) {
  if (!raw) return ''
  const k = raw.trim().toLowerCase().replace(/-/g,'_')
  return feelingMap[k] || k.replace(/_/g,' ')
}

// ── Dot row ──────────────────────────────────────────────────────────────────────
function DotRow({ label, value, max=5 }) {
  return (
    <div style={{ display:'flex', alignItems:'center', marginBottom:4 }}>
      <div style={{ width:54, fontSize:7.5, color:MID, letterSpacing:.3,
        textAlign:'right', paddingRight:8, flexShrink:0 }}>{label}</div>
      <div style={{ display:'flex', gap:3.5 }}>
        {Array.from({length:max}).map((_,i) => (
          <div key={i} style={{
            width:6, height:6, borderRadius:'50%',
            background: i < value ? GOLD : 'transparent',
            border: `1px solid ${i < value ? GOLD : LIGHT}`,
          }}/>
        ))}
      </div>
    </div>
  )
}

// ── Divider ──────────────────────────────────────────────────────────────────────
const Div = ({my=6}) => (
  <div style={{ display:'flex', alignItems:'center', gap:6, margin:`${my}px 0` }}>
    <div style={{ height:1, flex:1, background:LIGHT }}/>
    <span style={{ color:LIGHT, fontSize:8 }}>✦</span>
    <div style={{ height:1, flex:1, background:LIGHT }}/>
  </div>
)

// ── Card Front ──────────────────────────────────────────────────────────────────
function CardFront({ formula, latestVersion, items, aliases, concentration }) {
  const ctx = [formula.feeling, formula.texture, formula.vibe].filter(Boolean).join(', ')

  const feelingVals = formula.feeling ? formula.feeling.split(',').filter(Boolean) : []
  const feelingEn   = feelingVals.slice(0,3).map(v => getFeelingLabel(v))
  const feelingTh   = feelingVals.slice(0,3).map(v => FEELING_OPTS.find(o => o.value===v.trim())?.label || '')

  const grouped = { Top:[], Heart:[], Base:[] }
  items.forEach(item => {
    const role  = item.material?.evaporation || 'Base'
    const alias = matchAlias(aliases, item.material_id, ctx) || item.material?.name
    if (grouped[role] && alias && !grouped[role].includes(alias)) grouped[role].push(alias)
  })

  const NoteIcons = {
    Top:   <IconDrop size={16}/>,
    Heart: <IconWave size={16}/>,
    Base:  <IconCircles size={16}/>,
  }

  return (
    <div style={{ width:CARD_W, height:CARD_H, background:BG, position:'relative',
      fontFamily:'Inter,sans-serif', overflow:'hidden', flexShrink:0 }}>

      {formula.image_url && (
        <div style={{ width:'100%', height:213, overflow:'hidden', position:'relative' }}>
          <img src={formula.image_url} alt={formula.name} crossOrigin="anonymous"
            style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
          <div style={{ position:'absolute', bottom:0, left:0, right:0, height:30,
            background:`linear-gradient(transparent, ${BG})` }}/>
        </div>
      )}

      <div style={{ padding: formula.image_url ? '4px 16px 44px' : '14px 16px 44px' }}>

        <div style={{ fontSize:7, letterSpacing:3, textTransform:'uppercase',
          color:MID, textAlign:'center', marginBottom:6 }}>
          LINEN THEORY · EAU DE PARFUM
        </div>

        <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:20,
          color:INK, textAlign:'center', lineHeight:1.1, marginBottom:3 }}>
          {formula.name}
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:8, margin:'0px 0' }}>
          <div style={{ height:1, flex:1, background:LIGHT }}/>
          <span style={{ color:LIGHT, fontSize:10 }}>♡</span>
          <div style={{ height:1, flex:1, background:LIGHT }}/>
        </div>

        {feelingEn.length > 0 && (
          <div style={{ textAlign:'center', marginBottom:7, paddingTop:0 }}>
            <div style={{ fontSize:6.5, letterSpacing:2, textTransform:'uppercase',
              color:MID, marginBottom:3 }}>THE FEELING</div>
            <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:12,
              color:INK, marginBottom:2 }}>
              {feelingEn.join('  ·  ')}
            </div>
            <div style={{ fontSize:9, color:GOLD, lineHeight:1.5, paddingBottom:8 }}>
              {feelingTh.join('  ·  ')}
            </div>
          </div>
        )}

        <div style={{ height:1, background:LIGHT, margin:'6px 0' }}/>

        <div style={{ marginBottom:6 }}>
          <div style={{ fontSize:6.5, letterSpacing:2, textTransform:'uppercase',
            color:MID, textAlign:'center', marginBottom:6 }}>KEY NOTES</div>
          {(() => {
            const cols = [
              { role:'Top',   label:'TOP'   },
              { role:'Heart', label:'HEART' },
              { role:'Base',  label:'BASE'  },
            ].filter(r => (grouped[r.role]||[]).length > 0)
            if (!cols.length) return (
              <div style={{ fontSize:9, color:LIGHT, textAlign:'center', fontStyle:'italic' }}>
                add aliases to show notes
              </div>
            )
            return (
              <div style={{ display:'grid',
                gridTemplateColumns:`repeat(${cols.length},1fr)`, gap:0 }}>
                {cols.map((r, idx) => (
                  <div key={r.role} style={{ textAlign:'center', padding:'0 6px',
                    borderRight: idx < cols.length-1 ? `1px solid ${LIGHT}` : 'none' }}>
                    <div style={{ display:'flex', justifyContent:'center', marginBottom:4 }}>
                      {NoteIcons[r.role]}
                    </div>
                    <div style={{ fontSize:6, letterSpacing:1.5, textTransform:'uppercase',
                      color:MID, marginBottom:4 }}>{r.label}</div>
                    {(grouped[r.role]||[]).slice(0,3).map((n,i) => (
                      <div key={i} style={{ fontFamily:'Cormorant Garamond,serif',
                        fontSize:11, color:INK, lineHeight:1.7, fontStyle:'italic' }}>{n}</div>
                    ))}
                  </div>
                ))}
              </div>
            )
          })()}
        </div>


      </div>

      {/* bottom bar — ไม่มี ml */}
      <div style={{ position:'absolute', bottom:0, left:0, right:0,
        padding:'7px 16px', borderTop:`1px solid ${LIGHT}`,
        display:'flex', justifyContent:'space-between', alignItems:'flex-end',
        background:BG }}>
        <div>
          <div style={{ fontSize:6.5, letterSpacing:2, textTransform:'uppercase',
            color:GOLD, fontWeight:600 }}>LINEN THEORY</div>
          <div style={{ fontSize:8, color:MID, marginTop:1, letterSpacing:1 }}>the art of scent</div>
        </div>
        {concentration && (
          <div style={{ fontSize:7, fontWeight:700, letterSpacing:1.5,
            color: concentration==='SOFT' ? '#5a8a6a' : concentration==='DEEP' ? '#8a4a4a' : GOLD
          }}>{concentration}</div>
        )}
      </div>
    </div>
  )
}

// ── Card Back ───────────────────────────────────────────────────────────────────
function CardBack({ formula, latestVersion, items, aliases, traits, concentration }) {
  const feelingVals = formula.feeling ? formula.feeling.split(',').map(v=>v.trim()).filter(Boolean) : []
  const ctx = [formula.feeling, formula.texture, formula.vibe].filter(Boolean).join(', ')

  // Scent profile — weighted avg จาก traits DB
  const dots = calcDots(items, traits)
  const hasTraits = items.some(item => traits[item.material_id])

  // Mood — icon จาก feeling + keywords จาก aliases
  const moodFeelings = feelingVals
    .map(v => MOOD_MAP[v] || MOOD_MAP[v.replace(/-/g,'_')] || { I: IconDrop, label: feelingMap[v] || v.replace(/_/g,' ') })
    .filter(Boolean)
    .filter((m, i, arr) => arr.findIndex(x => x.label === m.label) === i)
    .slice(0, 4)

  const keywords = aliasKeywords(aliases, items, ctx, 4)

  // Quote
  const quote = deriveQuote(formula)

  return (
    <div style={{ width:CARD_W, height:CARD_H, background:BG, position:'relative',
      fontFamily:'Inter,sans-serif', overflow:'hidden', flexShrink:0,
      display:'flex', flexDirection:'column', padding:'12px 16px 10px' }}>

      {/* Brand + Name */}
      <div style={{ textAlign:'center', marginBottom:8 }}>
        <div style={{ fontSize:7, letterSpacing:3, textTransform:'uppercase',
          color:MID, marginBottom:6 }}>LINEN THEORY</div>
        <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:12,
          color:INK, lineHeight:1.1, marginBottom:2 }}>
          {formula.name}
        </div>
        {formula.name_meaning && (
          <div style={{ fontSize:8.5, color:GOLD, fontStyle:'italic',
            lineHeight:1.5, padding:'0 6px' }}>
            ✦ {formula.name_meaning}
          </div>
        )}
      </div>

      <Div my={2}/>

      {/* Vibe */}
      {formula.vibe && (
        <div style={{ fontSize:8.5, color:'#6a5a4a', lineHeight:1.65,
          textAlign:'center', padding:'0 4px', marginBottom:2, fontStyle:'italic' }}>
          {(() => {
            const v = formula.vibe
            if (v.length <= 70) return v
            const cut = v.slice(0, 70)
            const last = Math.max(cut.lastIndexOf('.'), cut.lastIndexOf(','), cut.lastIndexOf('!'))
            return last > 30 ? cut.slice(0, last+1) : cut.trimEnd() + '…'
          })()}
        </div>
      )}

      <Div my={2}/>

      {/* Scent Profile — Dots only */}
      <div style={{ margin:'1px 0', flexShrink:0 }}>
        <div style={{ fontSize:6.5, letterSpacing:2, textTransform:'uppercase',
          color:MID, textAlign:'center', marginBottom:3 }}>SCENT PROFILE</div>
        {hasTraits ? (
          <div style={{ paddingLeft:8 }}>
            {PROFILE_AXES.map((axis, i) => <DotRow key={axis} label={axis} value={dots[i]}/>)}
          </div>
        ) : (
          <div style={{ fontSize:8, color:LIGHT, textAlign:'center', fontStyle:'italic' }}>
            add traits to materials
          </div>
        )}
      </div>

      <Div my={1}/>

      {/* Mood — icon เล็ก + text keyword */}
      {moodFeelings.length > 0 && (
        <div style={{ marginBottom:3 }}>
          <div style={{ fontSize:6.5, letterSpacing:2, textTransform:'uppercase',
            color:MID, textAlign:'center', marginBottom:3 }}>MOOD</div>

          {moodFeelings.length > 0 && (
            <div style={{ display:'flex', justifyContent:'center', gap:10, marginBottom:2 }}>
              {moodFeelings.map((m, i) => (
                <div key={i} style={{ textAlign:'center' }}>
                  <div style={{ display:'flex', justifyContent:'center', marginBottom:2 }}>
                    <m.I size={16}/>
                  </div>
                  <div style={{ fontSize:7, color:MID, letterSpacing:.5 }}>{m.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Best For */}
      {(() => {
        let bestFor = []
        try {
          bestFor = Array.isArray(formula.best_for)
            ? formula.best_for
            : JSON.parse(formula.best_for || '[]')
        } catch(e) { bestFor = [] }
        if (!bestFor.length) return null
        return (
          <>
            <Div my={1}/>
            <div style={{ paddingBottom:14, paddingTop:0 }}>
              <div style={{ fontSize:6.5, letterSpacing:2, textTransform:'uppercase',
                color:MID, textAlign:'center', marginBottom:8 }}>BEST FOR</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4px 8px',
                padding:'0 8px' }}>
                {bestFor.slice(0,4).map((item, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" style={{ flexShrink:0 }}>
                      <path d="M6 17a4 4 0 010-8 4.5 4.5 0 018.9-1A3.5 3.5 0 0119 11.5 3.5 3.5 0 0118 17Z"
                        stroke="#8a6f4e" strokeWidth="1.2" fill="none"/>
                    </svg>
                    <span style={{ fontSize:8, color:INK, fontFamily:'Cormorant Garamond,serif',
                      fontStyle:'italic', lineHeight:1.4 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )
      })()}

      {/* Bottom bar — ไม่มี ml */}
      <div style={{ marginTop:'auto' }}>
        <div style={{ height:1, background:LIGHT, marginBottom:6 }}/>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
          <div>
            <div style={{ fontSize:7, letterSpacing:2, textTransform:'uppercase',
              color:GOLD, fontWeight:600 }}>LINEN THEORY</div>
            <div style={{ fontSize:8, color:MID, marginTop:1, letterSpacing:1 }}>the art of scent</div>
          </div>
          {concentration && (
            <div style={{ fontSize:7, fontWeight:700, letterSpacing:1.5,
              color: concentration==='SOFT' ? '#5a8a6a' : concentration==='DEEP' ? '#8a4a4a' : GOLD
            }}>{concentration}</div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Export ─────────────────────────────────────────────────────────────────
export default function FormulaCard({ formula, latestVersion, items, onClose }) {
  const frontRef = useRef()
  const backRef  = useRef()
  const [saving,  setSaving]  = useState(false)
  const [aliases, setAliases] = useState([])
  const [traits,  setTraits]  = useState({})
  const [side,          setSide]          = useState('front')
  const [concentration, setConcentration] = useState(null)
  const [showLabel,     setShowLabel]     = useState(false)

  useEffect(() => {
    db.getAllAliases().then(setAliases)
    // ดึง traits ของทุก material ใน formula นี้
    const ids = [...new Set(items.map(i => i.material_id).filter(Boolean))]
    if (ids.length) {
      db.getMaterialTraits(ids).then(rows => {
        const map = {}
        rows.forEach(r => { map[r.material_id] = r })
        setTraits(map)
      })
    }
  }, [])

  async function saveAsImage(ref, filename) {
    setSaving(true)
    try {
      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(ref.current, { scale:3, useCORS:true, backgroundColor:BG })
      const link = document.createElement('a')
      link.download = filename
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch(e) { alert('Save failed: ' + e.message) }
    setSaving(false)
  }

  async function saveAll() {
    setSaving(true)
    try {
      const { default: html2canvas } = await import('html2canvas')
      setSide('front')
      await new Promise(r => setTimeout(r, 300))
      const c1 = await html2canvas(frontRef.current, { scale:3, useCORS:true, backgroundColor:BG })
      const l1 = document.createElement('a')
      l1.download = `${formula.name.replace(/\s+/g,'-')}-card-front.png`
      l1.href = c1.toDataURL('image/png')
      l1.click()
      await new Promise(r => setTimeout(r, 400))
      setSide('back')
      await new Promise(r => setTimeout(r, 300))
      const c2 = await html2canvas(backRef.current, { scale:3, useCORS:true, backgroundColor:BG })
      const l2 = document.createElement('a')
      l2.download = `${formula.name.replace(/\s+/g,'-')}-card-back.png`
      l2.href = c2.toDataURL('image/png')
      l2.click()
      setSide('front')
    } catch(e) { alert('Save failed: ' + e.message) }
    setSaving(false)
  }

  async function savePDF() {
    setSaving(true)
    try {
      const { default: html2canvas } = await import('html2canvas')
      const { default: jsPDF }       = await import('jspdf')
      setSide('front')
      await new Promise(r => setTimeout(r, 300))
      const c1 = await html2canvas(frontRef.current, { scale:3, useCORS:true, backgroundColor:BG })
      setSide('back')
      await new Promise(r => setTimeout(r, 300))
      const c2 = await html2canvas(backRef.current, { scale:3, useCORS:true, backgroundColor:BG })
      setSide('front')
      const pdf = new jsPDF({ orientation:'portrait', unit:'cm', format:[6, 9] })
      pdf.addImage(c1.toDataURL('image/png'), 'PNG', 0, 0, 6, 9)
      pdf.addPage([6, 9], 'portrait')
      pdf.addImage(c2.toDataURL('image/png'), 'PNG', 0, 0, 6, 9)
      pdf.save(`${formula.name.replace(/\s+/g,'-')}-card.pdf`)
    } catch(e) { alert('PDF failed: ' + e.message) }
    setSaving(false)
  }


  // ถ้ายังไม่เลือก concentration — แสดง picker ก่อน
  if (!concentration) {
    const CONC = ['SOFT','SIGNATURE','DEEP']
    const CONC_DESC = { SOFT:'กลิ่นอ่อน · ใส่ได้ทุกวัน', SIGNATURE:'กลิ่นกลาง · ประจำตัว', DEEP:'กลิ่นเข้ม · พิเศษ' }
    const CONC_C = { SOFT:'#5a8a6a', SIGNATURE:'#8a6f4e', DEEP:'#8a4a4a' }
    return (
      <>
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.7)', zIndex:200,
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24 }}>
        <div style={{ background:'#f8f5f0', borderRadius:16, padding:28, width:'100%', maxWidth:320 }}>
          <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:20, color:'#2a1f14',
            textAlign:'center', marginBottom:4 }}>{formula.name}</div>
          <div style={{ fontSize:11, color:'#b0a090', textAlign:'center', marginBottom:20 }}>
            เลือก Concentration Tier
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {CONC.map(c => (
              <button key={c} onClick={() => setConcentration(c)}
                style={{ padding:'14px 20px', borderRadius:12, cursor:'pointer',
                  fontFamily:'Inter,sans-serif', border:`1.5px solid ${CONC_C[c]}`,
                  background:'white', textAlign:'left' }}>
                <div style={{ fontSize:14, fontWeight:700, color:CONC_C[c], letterSpacing:1 }}>{c}</div>
                <div style={{ fontSize:11, color:'#b0a090', marginTop:2 }}>{CONC_DESC[c]}</div>
              </button>
            ))}
          </div>
          <button onClick={() => setShowLabel(true)}
            style={{ width:'100%', marginTop:12, padding:'10px 0',
              borderRadius:10, background:'none', border:'1px solid #c8b89a',
              fontSize:12, color:'#8a6f4e', cursor:'pointer', fontFamily:'Inter,sans-serif' }}>
            🏷 Print Label
          </button>
          <button onClick={onClose} style={{ width:'100%', marginTop:8, padding:'10px 0',
            borderRadius:10, background:'none', border:'1px solid #e8ddd0',
            fontSize:12, color:'#b0a090', cursor:'pointer', fontFamily:'Inter,sans-serif' }}>
            ยกเลิก
          </button>
        </div>
      </div>
      {showLabel && (
        <LabelGenerator
          formula={formula}
          latestVersion={latestVersion}
          onClose={() => setShowLabel(false)}/>
      )}
      </>
    )
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.7)', zIndex:200,
      display:'flex', flexDirection:'column', alignItems:'center',
      justifyContent:'center', padding:16, overflowY:'auto' }}>

      <div style={{ display:'flex', gap:8, marginBottom:12 }}>
        {['front','back'].map(s => (
          <button key={s} onClick={() => setSide(s)}
            style={{ padding:'6px 20px', borderRadius:20, cursor:'pointer',
              fontFamily:'Inter,sans-serif', fontSize:12, fontWeight:500,
              background: side===s ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.2)',
              border:'none', color: side===s ? '#2a1f14' : '#fff' }}>
            {s === 'front' ? 'หน้าหน้า' : 'หน้าหลัง'}
          </button>
        ))}
      </div>

      {/* Both always rendered — visibility trick for html2canvas */}
      <div style={{ position:'relative' }}>
        <div style={{ visibility: side==='front' ? 'visible' : 'hidden',
          position: side==='front' ? 'relative' : 'absolute', top:0, left:0 }}
          ref={frontRef}>
          <CardFront formula={formula} items={items} aliases={aliases}
            latestVersion={latestVersion} concentration={concentration}/>
        </div>
        <div style={{ visibility: side==='back' ? 'visible' : 'hidden',
          position: side==='back' ? 'relative' : 'absolute', top:0, left:0 }}
          ref={backRef}>
          <CardBack formula={formula} latestVersion={latestVersion}
            items={items} aliases={aliases} traits={traits} concentration={concentration}/>
        </div>
      </div>

      <div style={{ display:'flex', gap:8, marginTop:14, flexWrap:'wrap', justifyContent:'center' }}>
        <button onClick={saveAll} disabled={saving}
          style={{ padding:'9px 20px', borderRadius:20, cursor:'pointer',
            fontFamily:'Inter,sans-serif', fontSize:12, fontWeight:600,
            background:'#8a6f4e', border:'none', color:'#fff', opacity: saving ? .6 : 1 }}>
          {saving ? '⏳...' : '💾 Save ทั้ง 2 หน้า'}
        </button>
        <button onClick={savePDF} disabled={saving}
          style={{ padding:'9px 20px', borderRadius:20, cursor:'pointer',
            fontFamily:'Inter,sans-serif', fontSize:12, fontWeight:600,
            background:'#5a4a3a', border:'none', color:'#fff', opacity: saving ? .6 : 1 }}>
          {saving ? '⏳...' : '📄 PDF (โรงพิมพ์)'}
        </button>
        <button onClick={() => saveAsImage(side==='front'?frontRef:backRef,
          `${formula.name.replace(/\s+/g,'-')}-card-${side}.png`)} disabled={saving}
          style={{ padding:'9px 20px', borderRadius:20, cursor:'pointer',
            fontFamily:'Inter,sans-serif', fontSize:12, fontWeight:500,
            background:'rgba(255,255,255,0.2)', border:'1px solid rgba(255,255,255,0.3)',
            color:'#fff' }}>
          Save หน้านี้
        </button>
        <button onClick={() => setShowLabel(true)}
          style={{ padding:'9px 20px', borderRadius:20, cursor:'pointer',
            fontFamily:'Inter,sans-serif', fontSize:12, fontWeight:500,
            background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.3)',
            color:'#fff' }}>
          🏷 Label
        </button>
        <button onClick={onClose}
          style={{ padding:'9px 16px', borderRadius:20, cursor:'pointer',
            fontFamily:'Inter,sans-serif', fontSize:12,
            background:'transparent', border:'1px solid rgba(255,255,255,0.3)',
            color:'rgba(255,255,255,0.7)' }}>✕</button>
      </div>

      {showLabel && (
        <LabelGenerator
          formula={formula}
          latestVersion={latestVersion}
          onClose={() => setShowLabel(false)}/>
      )}
    </div>
  )
}
