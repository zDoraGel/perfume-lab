import { useState, useEffect } from 'react'
import { db } from '../lib/db'
import { callAI, parseAIJson } from '../lib/ai'
import { S } from '../constants/theme'
import { Card, Btn, BackBtn } from '../components/ui'

// ── Preset Personalities ───────────────────────────────────────────────────────
const PERSONALITIES = [
  {
    id: 'clean_skin',
    label: 'Clean Skin',
    th: 'ผิวสะอาด',
    emoji: '🤍',
    desc: 'หอมเหมือนผิวดี สระผม ผ้าสะอาด',
    brief: {
      vibes: ['Clean Skin','Freshly Washed Hair','Skin Scent','Your Skin But Better'],
      nots:  ['Gourmand','Heavy Floral','Creamy','Milky','Rice Milk','Jasmine','Powdery'],
      preferMats: 'White Tea\nHedione\nIso E Super\nWhite Musk\nGalaxolide\nCashmeran',
      avoidMats:  'Rose Absolute, Jasmine Absolute, Ylang Ylang, Rice Milk, Patchouli, Vanilla',
      person: 'The person everyone thinks naturally smells good.\nFreshly washed hair, healthy skin, clean clothing.\nPeople notice it only when standing close.\nNot perfume — expensive fabric and clean skin.',
    }
  },
  {
    id: 'quiet_luxury',
    label: 'Quiet Luxury',
    th: 'หรูแบบเงียบๆ',
    emoji: '✦',
    desc: 'ดูแพงโดยไม่ต้องบอก ไม่ตะโกนกลิ่น',
    brief: {
      vibes: ['Quiet Luxury','Effortless Elegance','Expensive Fabric','Transparent Woods'],
      nots:  ['Sweet Candy','Gourmand','Heavy Floral','Loud Projection','Powdery'],
      preferMats: 'Iso E Super\nCashmeran\nAmbroxan\nWhite Musk\nSandalwood\nCedarmoss',
      avoidMats:  'Vanilla, Tonka, Rose Absolute, Ylang Ylang, Heavy Citrus',
      person: 'Elegant, understated, and expensive without trying.\nWears quality fabrics, minimal jewelry.\nThe scent is noticed only as "something nice" — never identified as perfume.',
    }
  },
  {
    id: 'fresh_linen',
    label: 'Fresh Linen',
    th: 'ผ้าปูเตียงใหม่',
    emoji: '☁️',
    desc: 'สะอาด โปร่ง เหมือนผ้าพึ่งซัก',
    brief: {
      vibes: ['Fresh Linen','Clean Cotton','After Rain','Morning Dew'],
      nots:  ['Gourmand','Heavy Floral','Creamy','Milky','Patchouli','Vetiver'],
      preferMats: 'Hedione\nLinalool\nGalaxolide\nAmbrettolide\nWhite Musk\nFloralozone',
      avoidMats:  'Patchouli, Vetiver, Oud, Labdanum, Rose, Jasmine',
      person: 'Soft cotton, fresh air, clean fabric.\nCalm, approachable, always put-together.\nThe scent feels like just-laundered sheets on a sunny morning.',
    }
  },
  {
    id: 'modern_musk',
    label: 'Modern Musk',
    th: 'มัสก์ทันสมัย',
    emoji: '◎',
    desc: 'มัสก์นุ่ม ทันสมัย ไม่หวาน',
    brief: {
      vibes: ['Modern Musk','Soft Musks','Skin Scent','Second Skin'],
      nots:  ['Sweet Candy','Gourmand','Heavy Floral','Powdery','Animalic'],
      preferMats: 'White Musk\nGalaxolide\nHabanolide\nAmbrettolide\nIso E Super\nCashmeran',
      avoidMats:  'Vanilla, Tonka, Rose, Jasmine, Ylang Ylang, Civet',
      person: 'Modern, clean, subtly sensual.\nThe musk is transparent — fresh, not heavy.\nWorn by someone who values simplicity and quality.',
    }
  },
  {
    id: 'soft_floral',
    label: 'Soft Floral',
    th: 'ดอกไม้นุ่ม',
    emoji: '🌸',
    desc: 'ดอกไม้อ่อนๆ ไม่แน่น ไม่หวาน',
    brief: {
      vibes: ['Soft Glow','Morning Dew','Quiet Luxury','Clean Skin'],
      nots:  ['Heavy Floral','Sweet Candy','Gourmand','Powdery','Rice Milk','Jasmine'],
      preferMats: 'Hedione\nPear Blossom\nLinalool\nWhite Musk\nIso E Super\nFloralozone',
      avoidMats:  'Rose Absolute, Jasmine Absolute, Ylang Ylang, Tuberose, Vanilla, Tonka',
      person: 'Softly floral, never shouty.\nLike standing in a garden at dawn — light, fresh, delicate.\nFeminine but modern, never old-fashioned.',
    }
  },
  {
    id: 'cozy_comfort',
    label: 'Cozy Comfort',
    th: 'อบอุ่น น่ากอด',
    emoji: '🤎',
    desc: 'อบอุ่น นุ่ม น่ากอด ติดทน',
    brief: {
      vibes: ['Standing Close','Soft Musks','Expensive Fabric'],
      nots:  ['Sharp Citrus','Heavy Floral','Harsh Aquatic','Metallic'],
      preferMats: 'Cashmeran\nCedarmoss\nSandalwood\nWhite Musk\nAmbroxan\nVanilla',
      avoidMats:  'Sharp Citrus, Neroli, Bergamot, Ozonic, Aquatic, Heavy Spice',
      person: 'Warm, inviting, comforting.\nLike a cashmere blanket on a cold day.\nThe scent stays close to skin — cozy and intimate.',
    }
  },
  {
    id: 'minimalist',
    label: 'Minimalist',
    th: 'มินิมอล',
    emoji: '○',
    desc: 'เรียบ น้อย แต่ครบ จำได้',
    brief: {
      vibes: ['Clean Skin','Transparent Woods','Quiet Luxury'],
      nots:  ['Sweet Candy','Gourmand','Heavy Floral','Powdery','Loud Projection'],
      preferMats: 'Iso E Super\nCashmeran\nWhite Musk\nHedione\nCedar',
      avoidMats:  'Vanilla, Tonka, Rose, Jasmine, Heavy Amber, Oud',
      person: 'Less is more.\nOne sentence that says everything.\nThe fragrance is almost imperceptible — but unforgettable.',
    }
  },
  {
    id: 'luxury_spa',
    label: 'Luxury Spa',
    th: 'สปาหรู',
    emoji: '◈',
    desc: 'ผ่อนคลาย สะอาด มีคลาส',
    brief: {
      vibes: ['Luxury Skincare','Quiet Luxury','Fresh Linen','Soft Glow'],
      nots:  ['Sweet Candy','Gourmand','Heavy Floral','Loud Projection'],
      preferMats: 'White Tea\nEucalyptus\nCedar\nSandalwood\nWhite Musk\nHedione',
      avoidMats:  'Vanilla, Tonka, Rose Absolute, Ylang Ylang, Heavy Musk',
      person: 'Calm, polished, wellness-focused.\nSmells like an expensive hotel bathroom.\nClean, serene, and sophisticated.',
    }
  },
]

// ── Brief constants ────────────────────────────────────────────────────────────
const VIBE_PRESETS = [
  { v:'Clean Skin',          th:'ผิวสะอาด' },
  { v:'Quiet Luxury',        th:'หรูแบบเงียบๆ' },
  { v:'Freshly Washed Hair', th:'ผมสระใหม่' },
  { v:'Luxury Skincare',     th:'สกินแคร์แพง' },
  { v:'Effortless Elegance', th:'เอเลแกนท์ไม่พยายาม' },
  { v:'Modern Musk',         th:'มัสก์ทันสมัย' },
  { v:'Skin Scent',          th:'กลิ่นผิว' },
  { v:'Soft Musks',          th:'มัสก์นุ่ม' },
  { v:'Transparent Woods',   th:'ไม้โปร่งใส' },
  { v:'Your Skin But Better',th:'ผิวคุณแต่ดีกว่า' },
  { v:'Clean Cotton',        th:'ผ้าฝ้ายสะอาด' },
  { v:'Fresh Linen',         th:'ผ้าปูเตียงใหม่' },
  { v:'After Rain',          th:'หลังฝนตก' },
  { v:'Morning Dew',         th:'น้ำค้างเช้า' },
  { v:'Soft Glow',           th:'แสงอ่อนๆ' },
  { v:'Expensive Fabric',    th:'ผ้าแพง' },
  { v:'Second Skin',         th:'เหมือนผิวจริง' },
  { v:'Standing Close',      th:'ต้องเข้าใกล้ถึงได้กลิ่น' },
  { v:'Soft Floral',          th:'ดอกไม้นุ่ม' },
  { v:'Airy Bloom',           th:'ดอกไม้โปร่งเบา' },
  { v:'White Garden',         th:'สวนดอกไม้ขาว' },
  { v:'Spring Petals',        th:'กลีบดอกฤดูใบไม้ผลิ' },
  { v:'Dewy Flowers',         th:'ดอกไม้เปียกน้ำค้าง' },
  { v:'Floral Skin',          th:'ดอกไม้บนผิว' },
  { v:'Soft Tea',             th:'ชาอ่อนโยน' },
  { v:'White Tea',            th:'ชาขาว' },
  { v:'Delicate Tea Leaves',  th:'ใบชานุ่มละมุน' },
  { v:'Tea Steam',            th:'ไอน้ำชาร้อน' },
  { v:'Tea & Linen',          th:'ชาและผ้าสะอาด' },
  { v:'Airy Tea',             th:'ชาโปร่งเบา' },
  { v:'Elegant Tea',          th:'ชาสุภาพมีระดับ' },
  { v:'Clean Tea Accord',     th:'กลิ่นชาสะอาด' },
  { v:'Gentle Infusion',      th:'ชางนุ่มละมุน' },
  { v:'Whisper of Tea',       th:'กลิ่นชาแผ่วเบา' },
]
const NOT_PRESETS = [
  'Sweet Candy','Gourmand','Heavy Floral','Creamy','Milky',
  'Rice Milk','Heavy Citrus','Juicy Citrus','White Flower Bouquet',
  'Rose','Jasmine','Powdery','Soap Bar','Ylang Ylang',
  'Patchouli','Vetiver','Vanilla','Tonka',
  'White Flower','Floral Bouquet',
]
const TA_STYLE = {
  width:'100%', padding:'8px 10px', borderRadius:8, fontSize:12,
  fontFamily:'Inter,sans-serif', background:'#fff', color:'#2c2820',
  outline:'none', resize:'none', boxSizing:'border-box',
}

// ── Step 0: Personality Picker ─────────────────────────────────────────────────
function PersonalityPicker({ onSelect, onSkip }) {
  const [sel, setSel] = useState([])

  function toggle(id) {
    setSel(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : prev.length < 3 ? [...prev, id] : prev
    )
  }

  function confirm() {
    if (!sel.length) return
    const selected = PERSONALITIES.filter(p => sel.includes(p.id))
    // merge หลาย personality เข้าด้วยกัน
    const merged = selected.reduce((acc, p) => ({
      vibes:      [...new Set([...acc.vibes,      ...(p.brief.vibes||[])])],
      nots:       [...new Set([...acc.nots,       ...(p.brief.nots||[])])],
      preferMats: [...new Set([...acc.preferMats, ...p.brief.preferMats.split('\n').filter(Boolean)])],
      avoidMats:  [...new Set([...acc.avoidMats,  ...p.brief.avoidMats.split(',').map(s=>s.trim()).filter(Boolean)])],
      persons:    [...acc.persons, p.brief.person],
    }), { vibes:[], nots:[], preferMats:[], avoidMats:[], persons:[] })

    onSelect({
      label: selected.map(p=>p.label).join(' + '),
      brief: {
        vibes:      merged.vibes,
        nots:       merged.nots,
        preferMats: merged.preferMats.join('\n'),
        avoidMats:  merged.avoidMats.join(', '),
        person:     merged.persons.join('\n\n---\n'),
      }
    })
  }

  return (
    <div style={{ marginBottom:12 }}>
      <div style={{ fontSize:13, fontWeight:600, color:S.ink,
        fontFamily:'Inter,sans-serif', marginBottom:4 }}>
        เริ่มจาก Preset Personality
      </div>
      <div style={{ fontSize:11, color:S.textMid, marginBottom:12 }}>
        เลือกได้ 1–3 อัน — AI จะ fill brief ให้เลย แก้เพิ่มได้ภายหลัง
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
        {PERSONALITIES.map((p,i) => {
          const on      = sel.includes(p.id)
          const order   = sel.indexOf(p.id)
          const maxed   = !on && sel.length >= 3
          return (
            <button key={p.id} onClick={() => toggle(p.id)}
              style={{ padding:'12px 14px', borderRadius:12, cursor: maxed ? 'not-allowed' : 'pointer',
                textAlign:'left', position:'relative',
                border:`1.5px solid ${on ? S.gold : S.border}`,
                background: on ? S.goldLt : S.white,
                opacity: maxed ? 0.45 : 1,
                fontFamily:'Inter,sans-serif', transition:'all .15s' }}>
              {/* order badge */}
              {on && (
                <div style={{ position:'absolute', top:8, right:8, width:18, height:18,
                  borderRadius:'50%', background:S.gold, color:'#fff',
                  fontSize:10, fontWeight:700, display:'flex',
                  alignItems:'center', justifyContent:'center' }}>
                  {order+1}
                </div>
              )}
              <div style={{ fontSize:18, marginBottom:4 }}>{p.emoji}</div>
              <div style={{ fontSize:13, fontWeight:600, color: on ? S.gold : S.ink,
                marginBottom:2 }}>{p.label}</div>
              <div style={{ fontSize:10, color:S.gold, marginBottom:4 }}>{p.th}</div>
              <div style={{ fontSize:11, color:S.textMid, lineHeight:1.4 }}>{p.desc}</div>
            </button>
          )
        })}
      </div>

      {/* selected summary */}
      {sel.length > 0 && (
        <div style={{ padding:'8px 12px', borderRadius:8, background:S.goldLt,
          border:`1px solid ${S.goldBd}`, marginBottom:10, fontSize:11, color:S.gold }}>
          เลือก {sel.length}/3: {PERSONALITIES.filter(p=>sel.includes(p.id)).map(p=>p.label).join(' + ')}
        </div>
      )}

      <div style={{ display:'flex', gap:8 }}>
        <Btn onClick={confirm} disabled={!sel.length} style={{ flex:1 }}>
          {sel.length ? `ใช้ ${PERSONALITIES.filter(p=>sel.includes(p.id)).map(p=>p.label).join(' + ')} →` : 'เลือก Preset ก่อน'}
        </Btn>
        <button onClick={onSkip}
          style={{ padding:'12px 16px', borderRadius:12, cursor:'pointer', fontSize:12,
            fontFamily:'Inter,sans-serif', background:'transparent',
            border:`1px solid ${S.border}`, color:S.textMid }}>
          กรอกเอง
        </button>
      </div>
    </div>
  )
}

// ── Step 1: Brief Panel ────────────────────────────────────────────────────────
function BriefPanel({ brief, onChange, presetLabel }) {
  const [open, setOpen] = useState(true)

  function toggle(key, v) {
    const cur = brief[key] || []
    onChange({ ...brief, [key]: cur.includes(v) ? cur.filter(x=>x!==v) : [...cur,v] })
  }

  const filled = (brief.vibes||[]).length + (brief.nots||[]).length > 0

  return (
    <div style={{ marginBottom:12, borderRadius:12,
      border:`1.5px solid ${filled ? S.gold : S.border}`,
      background: filled ? S.goldLt : S.white, overflow:'hidden' }}>

      <div onClick={() => setOpen(p=>!p)}
        style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
          padding:'10px 14px', cursor:'pointer' }}>
        <div>
          <span style={{ fontSize:11, fontWeight:700, letterSpacing:.8,
            textTransform:'uppercase', fontFamily:'Inter,sans-serif',
            color: filled ? S.gold : S.textMid }}>
            1 · Creative Brief
          </span>
          {presetLabel && (
            <span style={{ fontSize:10, color:S.gold, marginLeft:8,
              background:'#fff', padding:'1px 8px', borderRadius:20,
              border:`1px solid ${S.goldBd}` }}>
              {presetLabel}
            </span>
          )}
          {filled && (
            <span style={{ fontSize:10, color:S.textMid, marginLeft:6 }}>
              {(brief.vibes||[]).length} vibe · {(brief.nots||[]).length} not
              {brief.person ? ' · person ✓' : ''}
            </span>
          )}
        </div>
        <span style={{ color:S.textLt, fontSize:12 }}>{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div style={{ padding:'0 14px 14px', borderTop:`1px solid ${S.goldBd}` }}>

          <BriefSection num="Vibe" label="Define Vibe — สิ่งที่อยากให้เป็น">
            <ChipGroup opts={VIBE_PRESETS} selected={brief.vibes||[]}
              onToggle={v=>toggle('vibes',v)} color={S.green} bg='#eef5f0'/>
            <input value={brief.vibeCustom||''} placeholder="เพิ่มเองอีกช่อง..."
              onChange={e=>onChange({...brief,vibeCustom:e.target.value})}
              style={{...TA_STYLE, marginTop:6, border:`1px solid ${S.border}`,
                resize:'none', height:'auto', padding:'8px 10px'}}/>
          </BriefSection>

          <BriefSection num="Not" label="Define What It Is NOT — สำคัญมาก">
            <ChipGroup opts={NOT_PRESETS} selected={brief.nots||[]}
              onToggle={v=>toggle('nots',v)} color={S.red} bg='#fdf0ee'/>
            <input value={brief.notCustom||''} placeholder="เพิ่มเอง..."
              onChange={e=>onChange({...brief,notCustom:e.target.value})}
              style={{...TA_STYLE, marginTop:6, border:`1px solid ${S.border}`,
                resize:'none', height:'auto', padding:'8px 10px'}}/>
          </BriefSection>

          <BriefSection num="Mat+" label="Preferred Materials — materials ที่ต้องการ">
            <textarea value={brief.preferMats||''} rows={3}
              placeholder="White Tea, Hedione, Iso E Super, White Musk..."
              onChange={e=>onChange({...brief,preferMats:e.target.value})}
              style={{...TA_STYLE, border:`1px solid ${brief.preferMats ? S.gold : S.border}`}}/>
            {brief.preferMats ? (
              <div style={{ fontSize:9, color:S.gold, marginTop:3 }}>
                ✦ ดึงมาจาก Version ล่าสุด · พิมพ์เพิ่ม/แก้ได้เลย
              </div>
            ) : (
              <div style={{ fontSize:9, color:S.textLt, marginTop:3 }}>
                จะดึง materials จาก version ล่าสุดมาให้อัตโนมัติ
              </div>
            )}
          </BriefSection>

          <BriefSection num="Mat–" label="Avoid Materials — materials ที่ไม่ต้องการ">
            <textarea value={brief.avoidMats||''} rows={2}
              placeholder="Rose Absolute, Jasmine, Ylang Ylang, Patchouli..."
              onChange={e=>onChange({...brief,avoidMats:e.target.value})}
              style={{...TA_STYLE, border:`1px solid ${brief.avoidMats ? S.gold : S.border}`}}/>
            {brief.avoidMats ? (
              <div style={{ fontSize:9, color:S.gold, marginTop:3 }}>
                ✦ ดึงมาจาก Formula DNA · แก้ได้เลย
              </div>
            ) : (
              <div style={{ fontSize:9, color:S.textLt, marginTop:3 }}>
                ถ้ากรอก Avoid ใน Formula DNA ไว้ จะดึงมาให้อัตโนมัติ
              </div>
            )}
          </BriefSection>

          <BriefSection num="Who" label="Define Person — คนที่ใส่น้ำหอมนี้เป็นใคร">
            <textarea value={brief.person||''} rows={5}
              placeholder={"A naturally elegant person who always smells clean without trying.\n\nFreshly washed hair. Healthy skin. Soft laundry-fresh clothing.\nPeople notice it only when standing close.\nNot perfume — expensive fabric and clean skin."}
              onChange={e=>onChange({...brief,person:e.target.value})}
              style={{...TA_STYLE, border:`1px solid ${brief.person ? S.gold : S.border}`}}/>
            {brief.person ? (
              <div style={{ fontSize:9, color:S.gold, marginTop:3 }}>
                ✦ ดึงมาจาก Preset / Formula DNA · แก้ได้เลย
              </div>
            ) : (
              <div style={{ fontSize:9, color:S.textLt, marginTop:3 }}>
                เขียนบรรยายคนที่ใส่ — ยิ่งชัดยิ่งดี
              </div>
            )}
          </BriefSection>

        </div>
      )}
    </div>
  )
}

function ChipGroup({ opts, selected, onToggle, color, bg }) {
  return (
    <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
      {opts.map(item => {
        const val = typeof item === 'string' ? item : item.v
        const th  = typeof item === 'string' ? null  : item.th
        const on  = selected.includes(val)
        return (
          <button key={val} onClick={() => onToggle(val)}
            style={{ padding:'4px 10px', borderRadius:20, cursor:'pointer',
              fontFamily:'Inter,sans-serif', fontWeight: on?600:400,
              border:`1px solid ${on ? color : S.border}`,
              background: on ? bg : 'transparent',
              color: on ? color : S.textMid,
              display:'flex', flexDirection:'column', alignItems:'center', gap:1 }}>
            <span style={{ fontSize:11 }}>{on ? (color===S.green?'✅ ':'❌ ') : ''}{val}</span>
            {th && <span style={{ fontSize:9, opacity:.7 }}>{th}</span>}
          </button>
        )
      })}
    </div>
  )
}

function BriefSection({ num, label, children }) {
  return (
    <div style={{ marginTop:14 }}>
      <div style={{ fontSize:10, fontWeight:700, color:S.textMid, marginBottom:7,
        letterSpacing:.5, textTransform:'uppercase', fontFamily:'Inter,sans-serif' }}>
        {num} · {label}
      </div>
      {children}
    </div>
  )
}

// ── Step 2: Target Profile ─────────────────────────────────────────────────────
function parseProfile(text) {
  const sections = { person:[], vibe:[], materials:[], avoid:[], summary:[] }
  const keyMap = {
    'PERSON': 'person', 'VIBE': 'vibe', 'MATERIALS': 'materials',
    'AVOID': 'avoid', 'SUMMARY': 'summary',
  }
  let current = null
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    const header = keyMap[line.toUpperCase()]
    if (header) { current = header; continue }
    if (current) sections[current].push(line)
    else sections.summary.push(line)
  }
  return sections
}

function ProfilePanel({ profile, onChange, onConfirm, loading }) {
  const [editMode, setEditMode] = useState(false)
  const sections = parseProfile(profile)

  const sectionDefs = [
    { key:'person',    label:'Person',    icon:'👤', color:'#5a6a8a', bg:'#eef0f8', border:'#c8d0e8' },
    { key:'vibe',      label:'Vibe',      icon:'✦',  color:S.gold,    bg:S.goldLt,  border:S.goldBd },
    { key:'materials', label:'Materials', icon:'◎',  color:S.green,   bg:S.greenBg, border:'#c5dfc8' },
    { key:'avoid',     label:'Avoid',     icon:'✗',  color:S.red,     bg:S.redBg,   border:S.red+'33' },
    { key:'summary',   label:'Summary',   icon:'◈',  color:S.ink,     bg:S.bg,      border:S.border },
  ]

  return (
    <div style={{ marginBottom:12, borderRadius:12,
      border:`1.5px solid ${S.gold}`, background:S.goldLt, overflow:'hidden' }}>

      {/* Header */}
      <div style={{ padding:'10px 14px', borderBottom:`1px solid ${S.goldBd}`,
        display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <span style={{ fontSize:11, fontWeight:700, color:S.gold, letterSpacing:.8,
            textTransform:'uppercase', fontFamily:'Inter,sans-serif' }}>
            2 · Target Profile
          </span>
          <span style={{ fontSize:10, color:S.textMid, marginLeft:8 }}>AI draft ให้แล้ว</span>
        </div>
        <button onClick={() => setEditMode(p=>!p)}
          style={{ fontSize:11, color: editMode ? S.gold : S.textMid,
            background: editMode ? S.white : 'transparent',
            border:`1px solid ${editMode ? S.goldBd : S.border}`,
            borderRadius:16, padding:'3px 10px', cursor:'pointer',
            fontFamily:'Inter,sans-serif' }}>
          {editMode ? '✓ ดูผล' : '✎ แก้ไข'}
        </button>
      </div>

      <div style={{ padding:'12px 14px' }}>
        {editMode ? (
          <textarea value={profile} rows={14}
            onChange={e => onChange(e.target.value)}
            style={{...TA_STYLE, border:`1px solid ${S.goldBd}`,
              lineHeight:1.8, fontSize:12, marginBottom:8}}/>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:8 }}>
            {sectionDefs.map(({ key, label, icon, color, bg, border }) => {
              const items = sections[key]
              if (!items.length) return null
              return (
                <div key={key} style={{ borderRadius:10, overflow:'hidden',
                  border:`1px solid ${border}`, background:S.white }}>
                  {/* section header */}
                  <div style={{ padding:'5px 12px', background:bg,
                    display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ fontSize:11, color }}>{icon}</span>
                    <span style={{ fontSize:9, fontWeight:700, color,
                      letterSpacing:1.2, textTransform:'uppercase',
                      fontFamily:'Inter,sans-serif' }}>{label}</span>
                  </div>
                  {/* items */}
                  <div style={{ padding:'8px 12px', display:'flex',
                    flexDirection:'column', gap:4 }}>
                    {items.map((line, i) => (
                      <div key={i} style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
                        <span style={{ fontSize:10, color, flexShrink:0, marginTop:2 }}>
                          {key==='avoid' ? '✗' : key==='materials' ? '✓' : '·'}
                        </span>
                        <span style={{ fontSize:12, color:S.ink, lineHeight:1.6,
                          fontFamily:'Cormorant Garamond,serif', fontStyle:'italic' }}>
                          {line}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div style={{ fontSize:10, color:S.textMid, marginBottom:10, textAlign:'center' }}>
          {editMode
            ? '✎ แก้ข้อความ แล้วกด "ดูผล" เพื่อ preview'
            : '💡 กด ✎ แก้ไข ถ้าอยากปรับ — AI จะใช้ข้อความนี้ทั้งหมด'}
        </div>

        <Btn onClick={onConfirm} disabled={loading || !profile.trim()}
          style={{ width:'100%' }}>
          {loading ? '✦ Generating formula...' : '✨ Generate Formula จาก Profile นี้'}
        </Btn>
      </div>
    </div>
  )
}

// ── Build brief string ────────────────────────────────────────────────────────
function briefToText(brief) {
  const parts = []
  const vibes = [...(brief.vibes||[]), ...(brief.vibeCustom?[brief.vibeCustom]:[]) ]
  const nots  = [...(brief.nots||[]),  ...(brief.notCustom?[brief.notCustom]:[]) ]
  if (vibes.length)     parts.push('Target Vibe: '+vibes.join(', '))
  if (nots.length)      parts.push('Must NOT be: '+nots.join(', '))
  if (brief.preferMats) parts.push('Preferred materials: '+brief.preferMats)
  if (brief.avoidMats)  parts.push('Avoid materials: '+brief.avoidMats)
  if (brief.person)     parts.push('Target person:\n'+brief.person)
  return parts.join('\n')
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PageAI({ formula, versions, onBack, onVersionSaved }) {
  const [tab,         setTab]         = useState('analyze')
  const [step,        setStep]        = useState('preset') // preset|brief|profile|result
  const [loading,     setLoading]     = useState(false)
  const [brief,       setBrief]       = useState({})
  const [presetLabel, setPresetLabel] = useState('')
  const [profile,     setProfile]     = useState('')
  const [result,      setResult]      = useState('')
  const [parsed,      setParsed]      = useState(null)
  const [saving,      setSaving]      = useState(false)
  const [saved,       setSaved]       = useState(false)
  const [materials,   setMaterials]   = useState([])
  const latest = versions[versions.length-1]

  useEffect(() => {
    async function init() {
      const mats = await db.getMaterials()
      setMaterials(mats)

      // parse avoid field
      let avoidMats = '', avoidNots = []
      if (formula.avoid) {
        try {
          const p = JSON.parse(formula.avoid)
          avoidMats = p.custom || ''
          avoidNots = p.presets || []
        } catch { avoidMats = formula.avoid }
      }

      // parse feeling
      const feelings = formula.feeling
        ? formula.feeling.split(',').filter(Boolean).join(', ')
        : ''

      // vibe → match presets
      const vibeWords = (formula.vibe||'').split(/[,，]+/).map(s=>s.trim()).filter(Boolean)
      const matchedVibes = vibeWords
        .map(w => VIBE_PRESETS.find(p =>
          p.v.toLowerCase().includes(w.toLowerCase()) ||
          w.toLowerCase().includes(p.v.toLowerCase())
        )?.v).filter(Boolean)
      const unmatchedVibes = vibeWords.filter(w =>
        !VIBE_PRESETS.some(p =>
          p.v.toLowerCase().includes(w.toLowerCase()) ||
          w.toLowerCase().includes(p.v.toLowerCase())
        )
      )

      // materials จาก version ล่าสุด
      let preferMats = ''
      if (versions.length > 0) {
        const items = await db.getItems(versions[versions.length-1].id)
        preferMats = items.map(i=>i.material?.name).filter(Boolean).join('\n')
      }

      setBrief({
        vibes:      [...new Set(matchedVibes)],
        vibeCustom: unmatchedVibes.join(', '),
        nots:       avoidNots,
        notCustom:  '',
        preferMats,
        avoidMats,
        person:     feelings || '',
      })
    }
    init()
  }, [formula.id])

  // ── Select personality preset ──────────────────────────────────────────────
  function applyPersonality(p) {
    // p.brief ถูก merge มาแล้วจาก PersonalityPicker
    // merge กับ DNA ที่ดึงมาก่อนหน้า (preferMats จาก version ล่าสุด)
    setBrief(prev => ({
      vibes:      [...new Set([...(prev.vibes||[]), ...(p.brief.vibes||[])])],
      nots:       [...new Set([...(prev.nots||[]),  ...(p.brief.nots||[])])],
      preferMats: [prev.preferMats, p.brief.preferMats].filter(Boolean).join('\n'),
      avoidMats:  [prev.avoidMats,  p.brief.avoidMats ].filter(Boolean).join(', '),
      person:     p.brief.person || prev.person || '',
      vibeCustom: prev.vibeCustom || '',
      notCustom:  prev.notCustom  || '',
    }))
    setPresetLabel(p.label)
    setStep('brief')
  }

  async function buildHistory() {
    return Promise.all(versions.map(async v => {
      const items = await db.getItems(v.id)
      const tot   = items.reduce((s,i) => s + parseFloat(i.grams||0), 0)
      const ings  = items.map(x =>
        (x.material?.name||'?')+'('+x.material?.family+'):'+x.grams+'g='
        +(tot>0?((x.grams/tot)*100).toFixed(1):0)+'%'
      ).join(', ')
      return 'V'+v.ver+'['+v.status+','+(v.rating||'?')+'/10] '+ings+' Notes:"'+(v.notes||'')+'"'
    }))
  }

  async function generateProfile() {
    setLoading(true)
    const briefText = briefToText(brief)
    const hists     = await buildHistory()
    const r = await callAI(
      `คุณคือนักปรุงน้ำหอมมืออาชีพ สร้าง Target Profile แบบ structured
ตอบในรูปแบบนี้เท่านั้น (ห้ามเปลี่ยน format):

PERSON
[2-3 บรรทัด บรรยายคนที่ใส่ — ใครเป็นคนนั้น รู้สึกยังไง]

VIBE
[3-5 keywords/phrases ที่ capture กลิ่นนี้]

MATERIALS
[materials หลักที่ควรใช้ บรรทัดละ 1 ตัว]

AVOID
[สิ่งที่ต้องหลีกเลี่ยง บรรทัดละ 1 ข้อ]

SUMMARY
[2-3 บรรทัด สรุป contrast เช่น "Fresh but not citrus. Soft but not powdery."]`,
      `Formula: "${formula.name}"\nVibe: ${formula.vibe||''}\n\n${briefText}\n\nVersion history:\n${hists.join('\n')}`
    )
    setProfile(r.trim())
    setLoading(false)
    setStep('profile')
  }

  async function generateFormula() {
    setLoading(true); setResult(''); setParsed(null); setSaved(false)
    const stockList = materials.filter(m=>(m.stock||0)>0).map(m=>m.name+'('+m.family+')').join(', ')
    const nextVer   = Math.max(...versions.map(v=>v.ver)) + 1
    const hists     = await buildHistory()
    const jsonSchema = `\nตอบด้วย JSON เท่านั้น ไม่มี markdown:\n{"analysis":"วิเคราะห์ภาษาไทย 3-5 บรรทัด","improvements":["..."],"ingredients":[{"name":"ชื่อตรงกับ stock","grams":2.5,"role":"Top|Heart|Base","reason":"เหตุผล"}],"total_grams":15.0,"expected_character":"opening → heart → base","notes":"หมายเหตุ"}

กฎที่ต้องทำตาม:
- ต้องมี Top note อย่างน้อย 1 ตัว (เช่น Bergamot, Lemon, Lime, Neroli, Petitgrain, Litsea, Green Tea หรือ material ที่ evaporation=Top)
- ต้องมี Heart note อย่างน้อย 2 ตัว
- ต้องมี Base note อย่างน้อย 2 ตัว
- สัดส่วนโดยรวม: Top 15-25%, Heart 35-45%, Base 35-45%
- total_grams รวมกันต้องได้ประมาณ 15g`
    const prompt = tab === 'analyze'
      ? `Formula: "${formula.name}"\n\nTarget Profile:\n${profile}\n\nHistory:\n${hists.join('\n')}\n\nStock: ${stockList}\n\nแนะนำ V${nextVer} ที่ตรง Target Profile ใช้เฉพาะ material ใน stock`
      : `Formula: "${formula.name}" V${latest.ver}(${latest.status})\n\nTarget Profile:\n${profile}\n\nHistory:\n${hists.join('\n')}\n\nStock: ${stockList}\n\nแนะนำ V${nextVer} ปรับปรุงจาก V${latest.ver} ให้ตรง Target Profile`
    const r = await callAI('คุณคือนักปรุงน้ำหอมมืออาชีพ แนะนำสูตรที่ตรง Target Profile' + jsonSchema, prompt)
    showResult(r)
    setStep('result')
    setLoading(false)
  }

  function showResult(raw) {
    try {
      const json = parseAIJson(raw)
      setParsed(json)
      const nextVer = Math.max(...versions.map(v=>v.ver)) + 1
      const lines = [
        '✦ Analysis', json.analysis||'', '',
        ...(json.improvements||[]).map(s=>'✅ '+s), '',
        '── V'+nextVer+' Formula ──',
        ...(json.ingredients||[]).map(ing=>
          `  ${ing.role||'?'} · ${ing.name}: ${ing.grams}g — ${ing.reason||''}`
        ), '',
        'Total: '+(json.total_grams||'?')+'g', '',
        json.expected_character ? '✦ Expected: '+json.expected_character : '',
      ].filter(l=>l!==undefined)
      setResult(lines.join('\n'))
    } catch { setParsed(null); setResult(raw) }
  }

  async function saveAsVersion() {
    if (saving) return
    setSaving(true)
    const nextVer = Math.max(...versions.map(v=>v.ver)) + 1
    let items = []
    if (parsed?.ingredients?.length) {
      for (const ing of parsed.ingredients) {
        const name = (ing.name||'').toLowerCase().trim()
        const mat  = materials.find(m => {
          const mn = m.name.toLowerCase()
          return mn===name || mn.includes(name) || name.includes(mn.split(' ')[0])
        })
        if (mat && parseFloat(ing.grams)>0)
          items.push({ materialId:mat.id, grams:parseFloat(ing.grams), family:mat.family })
      }
    }
    if (items.length===0) {
      alert('ไม่พบ ingredients ที่ match — ลอง Run ใหม่ หรือ + New Version เองค่ะ')
      setSaving(false); return
    }
    const deduped = Object.values(
      items.reduce((acc,i) => {
        if (acc[i.materialId]) acc[i.materialId].grams += i.grams
        else acc[i.materialId] = {...i}
        return acc
      }, {})
    )
    const v = await db.createVersion(
      formula.id, nextVer, 'Pending', null,
      parsed?.notes || 'AI แนะนำ V'+nextVer,
      new Date().toISOString().slice(0,10), 15
    )
    await db.createItems(v.id, deduped)
    setSaving(false); setSaved(true)
    onVersionSaved && onVersionSaved()
  }

  const STEPS = ['preset','brief','profile','result']
  const STEP_LABELS = { preset:'0 Preset', brief:'1 Brief', profile:'2 Profile', result:'3 Formula' }

  return (
    <div>
      <BackBtn onClick={onBack}/>
      <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:24, color:'#2c2820',
        fontStyle:'italic', marginBottom:20 }}>AI Perfumer</div>

      {/* Tab */}
      <div style={{ display:'flex', gap:10, marginBottom:16 }}>
        {['analyze','suggest'].map(t => (
          <button key={t} onClick={() => { setTab(t); setStep('preset'); setResult(''); setSaved(false) }}
            style={{ flex:1, padding:'11px 0', borderRadius:10,
              border:'1.5px solid '+(tab===t?S.gold:S.goldBd),
              background:tab===t?S.gold:'transparent', color:tab===t?'#fff':S.gold,
              fontFamily:'Inter,sans-serif', fontWeight:500, fontSize:13, cursor:'pointer' }}>
            {t==='analyze' ? 'Analyze Patterns' : 'Suggest V'+(latest.ver+1)}
          </button>
        ))}
      </div>

      {/* Step indicator */}
      <div style={{ display:'flex', gap:6, alignItems:'center', marginBottom:16, flexWrap:'wrap' }}>
        {STEPS.map((s,i) => {
          const done = STEPS.indexOf(step) > i
          const cur  = step === s
          return (
            <div key={s} style={{ display:'flex', alignItems:'center', gap:6 }}>
              <div style={{ padding:'4px 10px', borderRadius:20, fontSize:10,
                fontFamily:'Inter,sans-serif', fontWeight:600,
                background: cur ? S.gold : done ? S.greenBg : S.bg,
                color: cur ? '#fff' : done ? S.green : S.textLt,
                border:`1px solid ${cur ? S.gold : done ? '#c5dfc8' : S.border}` }}>
                {done ? '✓ ' : ''}{STEP_LABELS[s]}
              </div>
              {i < STEPS.length-1 && <span style={{ color:S.textLt, fontSize:10 }}>→</span>}
            </div>
          )
        })}
      </div>

      {/* Step 0: Preset */}
      {step==='preset' && (
        <PersonalityPicker onSelect={applyPersonality} onSkip={() => setStep('brief')}/>
      )}

      {/* Step 1: Brief */}
      {step==='brief' && (
        <>
          <button onClick={() => setStep('preset')}
            style={{ fontSize:11, color:S.textMid, background:'none',
              border:`1px solid ${S.border}`, borderRadius:16, padding:'4px 12px',
              cursor:'pointer', marginBottom:12, fontFamily:'Inter,sans-serif' }}>
            ← เปลี่ยน Preset
          </button>
          <BriefPanel brief={brief} onChange={setBrief} presetLabel={presetLabel}/>
          <Btn onClick={generateProfile} disabled={loading} style={{ width:'100%', marginBottom:16 }}>
            {loading ? '✦ สร้าง Target Profile...' : '→ สร้าง Target Profile'}
          </Btn>
        </>
      )}

      {/* Step 2: Profile */}
      {step==='profile' && (
        <>
          <button onClick={() => setStep('brief')}
            style={{ fontSize:11, color:S.textMid, background:'none',
              border:`1px solid ${S.border}`, borderRadius:16, padding:'4px 12px',
              cursor:'pointer', marginBottom:12, fontFamily:'Inter,sans-serif' }}>
            ← แก้ Brief
          </button>
          <ProfilePanel profile={profile} onChange={setProfile}
            onConfirm={generateFormula} loading={loading}/>
        </>
      )}

      {/* Step 3: Result */}
      {step==='result' && result && (
        <>
          <button onClick={() => setStep('profile')}
            style={{ fontSize:11, color:S.textMid, background:'none',
              border:`1px solid ${S.border}`, borderRadius:16, padding:'4px 12px',
              cursor:'pointer', marginBottom:12, fontFamily:'Inter,sans-serif' }}>
            ← แก้ Target Profile
          </button>
          <Card style={{ fontSize:13, color:'#1a1814', lineHeight:1.9, whiteSpace:'pre-wrap',
            marginBottom:12, maxHeight:500, overflowY:'auto' }}>
            {result}
          </Card>
          <button onClick={() => setStep('profile')}
            style={{ width:'100%', padding:'10px', borderRadius:10, cursor:'pointer',
              marginBottom:8, fontFamily:'Inter,sans-serif', fontSize:12, fontWeight:500,
              background:'transparent', border:`1px solid ${S.goldBd}`, color:S.gold }}>
            ↺ ไม่โดนใจ — แก้ Profile แล้ว Generate ใหม่
          </button>
          {saved ? (
            <div style={{ textAlign:'center', padding:12, background:'#eef5f0',
              borderRadius:12, color:S.green, fontSize:13, fontWeight:500 }}>
              ✓ Save เป็น V{Math.max(...versions.map(v=>v.ver))+1} แล้วค่ะ
            </div>
          ) : (
            <Btn onClick={saveAsVersion} disabled={saving} style={{ width:'100%' }} variant="outline">
              {saving ? 'Saving...' : '+ Save as New Version'}
            </Btn>
          )}
        </>
      )}
    </div>
  )
}
