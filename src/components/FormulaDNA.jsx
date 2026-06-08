import { useState } from 'react'
import { S } from '../constants/theme'
import {
  PROJECTION_OPTS, TEXTURE_OPTS, TEMPERATURE_OPTS,
  FEELING_OPTS, OPENING_OPTS, AVOID_PRESETS,
  WEIGHT_LABELS, WEIGHT_PCTS, LONGEVITY_OPTS, COMPLEXITY_OPTS
} from '../constants/formulaDNA'

// ── Weighted Multi-Select ──────────────────────────────────────────────────────
function WeightedPicker({ opts, value = '', onChange, max = 3, showEmoji = false, showWeight = true }) {
  const selected = value ? value.split(',').filter(Boolean) : []
  const pcts     = WEIGHT_PCTS[selected.length] || []

  function toggle(val) {
    if (selected.includes(val)) {
      // deselect
      onChange(selected.filter(v => v !== val).join(','))
    } else if (selected.length < max) {
      // select
      onChange([...selected, val].join(','))
    }
    // if at max, ignore click (or deselect first)
  }

  return (
    <div>
      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
        {opts.map(o => {
          const idx      = selected.indexOf(o.value)
          const isActive = idx !== -1
          const label    = isActive && showWeight ? WEIGHT_LABELS[idx] : null
          const pct      = isActive && showWeight && pcts[idx] ? pcts[idx] : null
          const atMax    = !isActive && selected.length >= max

          return (
            <button key={o.value} onClick={() => toggle(o.value)}
              disabled={atMax}
              style={{ padding:'7px 12px', borderRadius:20, cursor: atMax ? 'not-allowed' : 'pointer',
                fontFamily:'Inter,sans-serif', fontSize:12, fontWeight:500,
                border:`1.5px solid ${isActive ? S.gold : atMax ? S.border+'88' : S.border}`,
                background: isActive ? S.goldLt : 'transparent',
                color: isActive ? S.gold : atMax ? S.textLt : S.textMid,
                opacity: atMax ? 0.5 : 1,
                transition:'all .15s', position:'relative' }}>
              {showEmoji && o.emoji} {o.label}
              {isActive && showWeight && (
                <span style={{ marginLeft:5, fontSize:9, fontWeight:700,
                  background:S.gold, color:'#fff', padding:'1px 5px',
                  borderRadius:20 }}>
                  {label} {pct}%
                </span>
              )}
            </button>
          )
        })}
      </div>
      {selected.length > 0 && showWeight && (
        <div style={{ marginTop:6, display:'flex', gap:6, flexWrap:'wrap' }}>
          {selected.map((v, i) => {
            const opt = opts.find(o => o.value === v)
            return (
              <div key={v} style={{ display:'flex', alignItems:'center', gap:4,
                fontSize:10, color:S.textMid }}>
                <span style={{ width:8, height:8, borderRadius:'50%',
                  background: i===0 ? S.gold : i===1 ? S.goldBd : S.textLt,
                  display:'inline-block' }}/>
                {opt?.label} {pcts[i]}%
                {i < selected.length-1 && <span style={{ color:S.textLt }}>→</span>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Simple Multi-Select (no weight) ───────────────────────────────────────────
function SimplePicker({ opts, value = '', onChange, max = 2, showEmoji = false }) {
  const selected = value ? value.split(',').filter(Boolean) : []

  function toggle(val) {
    if (selected.includes(val)) {
      onChange(selected.filter(v => v !== val).join(','))
    } else if (selected.length < max) {
      onChange([...selected, val].join(','))
    }
  }

  return (
    <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
      {opts.map(o => {
        const isActive = selected.includes(o.value)
        const atMax    = !isActive && selected.length >= max
        return (
          <button key={o.value} onClick={() => toggle(o.value)}
            disabled={atMax}
            style={{ padding:'7px 14px', borderRadius:20, cursor: atMax ? 'not-allowed' : 'pointer',
              fontFamily:'Inter,sans-serif', fontSize:12, fontWeight:500,
              border:`1.5px solid ${isActive ? S.gold : S.border}`,
              background: isActive ? S.goldLt : 'transparent',
              color: isActive ? S.gold : atMax ? S.textLt : S.textMid,
              opacity: atMax ? 0.5 : 1 }}>
            {showEmoji && o.emoji} {o.label}
            {o.desc && <span style={{ fontSize:10, color: isActive ? S.gold+'88' : S.textLt,
              display:'block', marginTop:1 }}>{o.desc}</span>}
          </button>
        )
      })}
    </div>
  )
}

// ── Best For Section ──────────────────────────────────────────────────────────
const BEST_FOR_PRESETS = [
  'Daily Wear', 'Office Day', 'Casual Date', 'Romantic Date',
  'Weekend Brunch', 'Evening Out', 'Spring & Summer', 'Fall & Winter',
  'Skin Scent Lover', 'Minimalist', 'Quiet Luxury', 'Gift',
  'After Shower', 'Travel', 'Night Out', 'Self Care Day',
]

function BestForPicker({ value = '', onChange }) {
  const [custom, setCustom] = useState('')
  // store as JSON array
  let selected = []
  try {
    selected = Array.isArray(value) ? value : JSON.parse(value || '[]')
  } catch { selected = [] }

  function toggle(item) {
    const next = selected.includes(item)
      ? selected.filter(v => v !== item)
      : selected.length < 6 ? [...selected, item] : selected
    onChange(JSON.stringify(next))
  }

  function addCustom() {
    const trimmed = custom.trim()
    if (!trimmed || selected.includes(trimmed) || selected.length >= 6) return
    onChange(JSON.stringify([...selected, trimmed]))
    setCustom('')
  }

  return (
    <div>
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:10 }}>
        {BEST_FOR_PRESETS.map(item => {
          const isActive = selected.includes(item)
          const atMax    = !isActive && selected.length >= 6
          return (
            <button key={item} onClick={() => toggle(item)} disabled={atMax}
              style={{ padding:'6px 12px', borderRadius:20, cursor: atMax ? 'not-allowed' : 'pointer',
                fontFamily:'Inter,sans-serif', fontSize:11, fontWeight:500,
                border:`1.5px solid ${isActive ? S.gold : S.border}`,
                background: isActive ? S.goldLt : 'transparent',
                color: isActive ? S.gold : atMax ? S.textLt : S.textMid,
                opacity: atMax ? 0.5 : 1 }}>
              {isActive ? '✓ ' : ''}{item}
            </button>
          )
        })}
      </div>
      {/* Custom input */}
      <div style={{ display:'flex', gap:8 }}>
        <input value={custom} onChange={e => setCustom(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addCustom()}
          placeholder="เพิ่มเองได้ เช่น Beach Day, Meditation..."
          style={{ flex:1, background:'#fff', border:`1px solid ${S.border}`,
            borderRadius:10, padding:'8px 12px', fontSize:12,
            fontFamily:'Inter,sans-serif', color:S.text, outline:'none' }}/>
        <button onClick={addCustom}
          style={{ padding:'8px 14px', borderRadius:10, cursor:'pointer',
            fontFamily:'Inter,sans-serif', fontSize:12, fontWeight:500,
            border:`1.5px solid ${S.gold}`, background:S.goldLt, color:S.gold }}>
          + เพิ่ม
        </button>
      </div>
      {/* Selected chips */}
      {selected.length > 0 && (
        <div style={{ marginTop:8, display:'flex', gap:6, flexWrap:'wrap' }}>
          {selected.map((item, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:4,
              padding:'4px 10px', borderRadius:20, background:S.goldLt,
              border:`1px solid ${S.goldBd}`, fontSize:11, color:S.gold }}>
              {item}
              <span onClick={() => toggle(item)}
                style={{ cursor:'pointer', fontSize:13, lineHeight:1, color:S.gold, marginLeft:2 }}>×</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Avoid Section ─────────────────────────────────────────────────────────────
function AvoidPicker({ value = '', onChange }) {
  const [custom, setCustom] = useState('')
  // value = comma-separated preset values + custom text
  // store as JSON: {presets: [], custom: ""}
  let parsed = { presets: [], custom: '' }
  try { parsed = JSON.parse(value) } catch { parsed = { presets: [], custom: value || '' } }

  function togglePreset(val) {
    const next = parsed.presets.includes(val)
      ? parsed.presets.filter(v => v !== val)
      : [...parsed.presets, val]
    onChange(JSON.stringify({ ...parsed, presets: next }))
  }

  function updateCustom(v) {
    setCustom(v)
    onChange(JSON.stringify({ ...parsed, custom: v }))
  }

  return (
    <div>
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:10 }}>
        {AVOID_PRESETS.map(o => {
          const isActive = parsed.presets.includes(o.value)
          return (
            <button key={o.value} onClick={() => togglePreset(o.value)}
              style={{ padding:'5px 12px', borderRadius:20, cursor:'pointer',
                fontFamily:'Inter,sans-serif', fontSize:11, fontWeight:500,
                border:`1.5px solid ${isActive ? S.red+'88' : S.border}`,
                background: isActive ? '#fdf0ee' : 'transparent',
                color: isActive ? S.red : S.textMid }}>
              {isActive ? '✗ ' : ''}{o.label}
              <span style={{ fontSize:9, color: isActive ? S.red+'88' : S.textLt,
                display:'block' }}>{o.desc}</span>
            </button>
          )
        })}
      </div>
      <input value={parsed.custom || ''} onChange={e => updateCustom(e.target.value)}
        placeholder="เพิ่มเองได้ เช่น กลิ่นยาหม่อง, หนักเกินไป..."
        style={{ width:'100%', background:'#fff', border:`1px solid ${S.border}`,
          borderRadius:10, padding:'9px 14px', fontSize:13,
          fontFamily:'Inter,sans-serif', color:S.text, outline:'none',
          boxSizing:'border-box' }}/>
    </div>
  )
}

// ── DNA Field wrapper ─────────────────────────────────────────────────────────
function DNAField({ label, sub, children }) {
  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ fontSize:11, color:S.textMid, fontWeight:600, letterSpacing:.5,
        textTransform:'uppercase', marginBottom:6, fontFamily:'Inter,sans-serif' }}>
        {label}
        {sub && <span style={{ fontWeight:400, textTransform:'none', marginLeft:6,
          color:S.textLt, fontSize:10 }}>{sub}</span>}
      </div>
      {children}
    </div>
  )
}

// ── Main Selector ─────────────────────────────────────────────────────────────
export function FormulaDNASelector({ values = {}, onChange }) {
  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
        <div style={{ height:1, flex:1, background:S.goldBd+'55' }}/>
        <span style={{ fontSize:11, fontWeight:600, color:S.gold, letterSpacing:1.5,
          textTransform:'uppercase', fontFamily:'Inter,sans-serif' }}>Formula DNA</span>
        <div style={{ height:1, flex:1, background:S.goldBd+'55' }}/>
      </div>

      {/* Complexity — single */}
      <DNAField label="ความซับซ้อนของสูตร" sub="กี่ ingredients">
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
          {COMPLEXITY_OPTS.map(o => {
            const isActive = (values.complexity || 'standard') === o.value
            return (
              <button key={o.value}
                onClick={() => onChange('complexity', o.value)}
                style={{ padding:'12px 8px', borderRadius:10, cursor:'pointer', textAlign:'center',
                  border:`1.5px solid ${isActive ? S.gold : S.border}`,
                  background: isActive ? S.goldLt : S.white,
                  position:'relative' }}>
                <div style={{ fontSize:13, fontWeight:700, fontFamily:'Inter,sans-serif',
                  color: isActive ? S.gold : S.ink, marginBottom:2 }}>{o.label}</div>
                <div style={{ fontSize:10, fontWeight:500, color: isActive ? S.gold : S.textMid,
                  marginBottom:4 }}>{o.tooltip}</div>
                <div style={{ fontSize:9, color:S.textLt, lineHeight:1.7 }}>
                  Top {o.top} · Heart {o.heart} · Base {o.base}
                </div>
                <div style={{ fontSize:11, fontWeight:700,
                  color: isActive ? S.gold : S.textMid, marginTop:4 }}>
                  {o.total} ตัว
                </div>
                {o.value === 'standard' && !values.complexity && (
                  <div style={{ position:'absolute', top:-8, right:8, fontSize:9,
                    background:S.gold, color:'#fff', padding:'1px 6px',
                    borderRadius:20, fontWeight:600 }}>default</div>
                )}
              </button>
            )
          })}
        </div>
      </DNAField>

      {/* Projection — single */}
      <DNAField label="Projection" sub="กระจายกลิ่นแค่ไหน">
        <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8 }}>
          {PROJECTION_OPTS.map(o => {
            const isActive = values.projection === o.value
            return (
              <button key={o.value}
                onClick={() => onChange('projection', isActive ? '' : o.value)}
                style={{ padding:'10px 12px', borderRadius:10, cursor:'pointer', textAlign:'left',
                  border:`1.5px solid ${isActive ? S.gold : S.border}`,
                  background: isActive ? S.goldLt : S.white }}>
                <div style={{ fontSize:13, fontWeight:600, fontFamily:'Inter,sans-serif',
                  color: isActive ? S.gold : S.ink }}>{o.icon} {o.label}</div>
                <div style={{ fontSize:10, color:S.textLt, marginTop:2 }}>{o.desc}</div>
              </button>
            )
          })}
        </div>
      </DNAField>

      {/* Texture — multi max 3, weighted */}
      <DNAField label="Texture" sub="เนื้อกลิ่น · เลือกได้ถึง 3 (จากมากไปน้อย)">
        <WeightedPicker opts={TEXTURE_OPTS} value={values.texture}
          onChange={v => onChange('texture', v)} max={3} showEmoji showWeight/>
      </DNAField>

      {/* Temperature — multi max 2, no weight */}
      <DNAField label="Temperature" sub="อุณหภูมิกลิ่น · เลือกได้ 2">
        <SimplePicker opts={TEMPERATURE_OPTS} value={values.temperature}
          onChange={v => onChange('temperature', v)} max={2} showEmoji/>
      </DNAField>

      {/* Feeling — multi max 6, weighted */}
      <DNAField label="Feeling" sub="ความรู้สึก · เลือกได้ถึง 6 (จากแก่ไปจาง)">
        <WeightedPicker opts={FEELING_OPTS} value={values.feeling}
          onChange={v => onChange('feeling', v)} max={6} showEmoji showWeight/>
      </DNAField>

      {/* Opening Style — multi max 2, no weight */}
      <DNAField label="Opening Style" sub="กลิ่นเปิดตัว · เลือกได้ 2">
        <SimplePicker opts={OPENING_OPTS} value={values.opening_style}
          onChange={v => onChange('opening_style', v)} max={2}/>
      </DNAField>

      {/* Best For */}
      <DNAField label="Best For" sub="เหมาะกับโอกาสไหน · เลือกหรือพิมพ์เองได้">
        <BestForPicker value={values.best_for} onChange={v => onChange('best_for', v)}/>
      </DNAField>

      {/* Avoid */}
      <DNAField label="Avoid" sub="สิ่งที่ไม่อยากให้มี">
        <AvoidPicker value={values.avoid} onChange={v => onChange('avoid', v)}/>
      </DNAField>
    </div>
  )
}

// ── Actual DNA (after test) ───────────────────────────────────────────────────
export function FormulaDNAActual({ values = {}, onChange }) {
  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
        <div style={{ height:1, flex:1, background:S.goldBd+'55' }}/>
        <span style={{ fontSize:11, fontWeight:600, color:S.gold, letterSpacing:1.5,
          textTransform:'uppercase', fontFamily:'Inter,sans-serif' }}>ผลการทดสอบจริง</span>
        <div style={{ height:1, flex:1, background:S.goldBd+'55' }}/>
      </div>

      <DNAField label="Projection จริง">
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {PROJECTION_OPTS.map(o => {
            const isActive = values.projection_actual === o.value
            return (
              <button key={o.value}
                onClick={() => onChange('projection_actual', isActive ? '' : o.value)}
                style={{ padding:'6px 14px', borderRadius:20, cursor:'pointer',
                  fontFamily:'Inter,sans-serif', fontSize:12, fontWeight:500,
                  border:`1.5px solid ${isActive ? S.gold : S.border}`,
                  background: isActive ? S.goldLt : 'transparent',
                  color: isActive ? S.gold : S.textMid }}>
                {o.icon} {o.label}
              </button>
            )
          })}
        </div>
      </DNAField>

      <DNAField label="ติดทนจริง">
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {LONGEVITY_OPTS.map(l => {
            const isActive = values.longevity_actual === l
            return (
              <button key={l} onClick={() => onChange('longevity_actual', isActive ? '' : l)}
                style={{ padding:'6px 14px', borderRadius:20, cursor:'pointer',
                  fontFamily:'Inter,sans-serif', fontSize:12, fontWeight:500,
                  border:`1.5px solid ${isActive ? S.gold : S.border}`,
                  background: isActive ? S.goldLt : 'transparent',
                  color: isActive ? S.gold : S.textMid }}>
                {l}
              </button>
            )
          })}
        </div>
      </DNAField>

      <DNAField label="Note ส่วนตัว — บรรยายแบบไหนก็ได้">
        <textarea value={values.personal_note || ''}
          onChange={e => onChange('personal_note', e.target.value)}
          rows={2} placeholder="เช่น กลิ่นเหมือนน้ำยาล้างจาน, หอมแบบคุณยาย..."
          style={{ width:'100%', background:'#fff', border:`1px solid ${S.border}`,
            borderRadius:10, padding:'10px 14px', fontSize:14, resize:'none',
            fontFamily:'Inter,sans-serif', color:S.text, outline:'none',
            boxSizing:'border-box' }}/>
        <div style={{ fontSize:10, color:S.textLt, marginTop:4 }}>
          AI จะแปลงเป็นภาษา perfumer ให้อัตโนมัติค่ะ
        </div>
      </DNAField>
    </div>
  )
}
