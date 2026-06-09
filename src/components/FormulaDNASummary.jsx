import { S } from '../constants/theme'
import {
  PROJECTION_OPTS, TEXTURE_OPTS, TEMPERATURE_OPTS,
  FEELING_OPTS, OPENING_OPTS, AVOID_PRESETS, WEIGHT_PCTS
} from '../constants/formulaDNA'

function getLabel(opts, value) {
  return opts.find(o => o.value === value)?.label || value
}

function getEmoji(opts, value) {
  return opts.find(o => o.value === value)?.emoji || ''
}

export default function FormulaDNASummary({ formula }) {
  const dna = formula

  const hasAny = dna.projection || dna.texture || dna.temperature ||
                 dna.feeling || dna.opening_style || dna.avoid

  if (!hasAny) return null

  // parse avoid
  let avoidPresets = [], avoidCustom = ''
  if (dna.avoid) {
    try {
      const p = JSON.parse(dna.avoid)
      avoidPresets = p.presets || []
      avoidCustom  = p.custom  || ''
    } catch { avoidCustom = dna.avoid }
  }

  // parse weighted fields
  function parseWeighted(value = '', opts = [], maxPcts = {}) {
    const vals = value ? value.split(',').filter(Boolean) : []
    const pcts = maxPcts[vals.length] || [100]
    return vals.map((v, i) => ({
      label: getLabel(opts, v),
      emoji: getEmoji(opts, v),
      pct:   pcts[i],
    }))
  }

  const textures     = parseWeighted(dna.texture,       TEXTURE_OPTS, WEIGHT_PCTS)
  const feelings     = parseWeighted(dna.feeling,       FEELING_OPTS, { 1:[100], 2:[70,30], 3:[60,25,15], 4:[50,25,15,10] })
  const temperatures = dna.temperature ? dna.temperature.split(',').filter(Boolean) : []
  const openings     = dna.opening_style ? dna.opening_style.split(',').filter(Boolean) : []
  const projection   = dna.projection ? PROJECTION_OPTS.find(o => o.value === dna.projection) : null

  return (
    <div style={{ marginBottom:16, padding:'12px 16px', background:S.white,
      borderRadius:12, border:`1px solid ${S.border}` }}>

      <div style={{ fontSize:10, fontWeight:700, color:S.gold, letterSpacing:1.2,
        textTransform:'uppercase', marginBottom:10, fontFamily:'Inter,sans-serif' }}>
        ✦ Formula DNA
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>

        {/* Projection */}
        {projection && (
          <Row icon={projection.icon} label="Projection">
            <span style={{ fontSize:12, fontWeight:600, color:S.ink }}>{projection.label}</span>
            <span style={{ fontSize:11, color:S.textMid, marginLeft:6 }}>{projection.desc}</span>
          </Row>
        )}

        {/* Texture */}
        {textures.length > 0 && (
          <Row icon="◻" label="Texture">
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {textures.map((t, i) => (
                <span key={i} style={{ fontSize:11, padding:'2px 9px', borderRadius:20,
                  background: i===0 ? S.goldLt : i===1 ? S.bg : S.border+'44',
                  color: i===0 ? S.gold : S.textMid,
                  border:`1px solid ${i===0 ? S.goldBd : S.border}`,
                  fontFamily:'Inter,sans-serif', fontWeight: i===0 ? 600 : 400 }}>
                  {t.emoji} {t.label}
                  {textures.length > 1 && (
                    <span style={{ fontSize:9, marginLeft:4, opacity:.7 }}>{t.pct}%</span>
                  )}
                </span>
              ))}
            </div>
          </Row>
        )}

        {/* Temperature */}
        {temperatures.length > 0 && (
          <Row icon="🌡" label="Temperature">
            <div style={{ display:'flex', gap:6 }}>
              {temperatures.map((v, i) => {
                const opt = TEMPERATURE_OPTS.find(o => o.value === v)
                return (
                  <span key={i} style={{ fontSize:11, padding:'2px 9px', borderRadius:20,
                    background:S.bg, border:`1px solid ${S.border}`,
                    color:S.textMid }}>
                    {opt?.emoji} {opt?.label || v}
                  </span>
                )
              })}
            </div>
          </Row>
        )}

        {/* Feeling */}
        {feelings.length > 0 && (
          <Row icon="🤍" label="Feeling">
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {feelings.map((f, i) => (
                <span key={i} style={{ fontSize:11, padding:'2px 9px', borderRadius:20,
                  background: i===0 ? '#fef0f5' : S.bg,
                  color: i===0 ? '#8a3a5a' : S.textMid,
                  border:`1px solid ${i===0 ? '#e8c0cc' : S.border}`,
                  fontWeight: i===0 ? 600 : 400 }}>
                  {f.label}
                  {feelings.length > 1 && (
                    <span style={{ fontSize:9, marginLeft:4, opacity:.7 }}>{f.pct}%</span>
                  )}
                </span>
              ))}
            </div>
          </Row>
        )}

        {/* Opening Style */}
        {openings.length > 0 && (
          <Row icon="◐" label="Opening">
            <div style={{ display:'flex', gap:6 }}>
              {openings.map((v, i) => {
                const opt = OPENING_OPTS.find(o => o.value === v)
                return (
                  <span key={i} style={{ fontSize:11, padding:'2px 9px', borderRadius:20,
                    background:S.bg, border:`1px solid ${S.border}`, color:S.textMid }}>
                    {opt?.label || v}
                  </span>
                )
              })}
            </div>
          </Row>
        )}

        {/* Avoid */}
        {(avoidPresets.length > 0 || avoidCustom) && (
          <Row icon="✗" label="Avoid">
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {avoidPresets.map((v, i) => {
                const opt = AVOID_PRESETS.find(o => o.value === v)
                return (
                  <span key={i} style={{ fontSize:11, padding:'2px 9px', borderRadius:20,
                    background:'#fdf0ee', border:`1px solid ${S.red}33`,
                    color:S.red }}>
                    {opt?.label || v}
                  </span>
                )
              })}
              {avoidCustom && (
                <span style={{ fontSize:11, padding:'2px 9px', borderRadius:20,
                  background:'#fdf0ee', border:`1px solid ${S.red}33`,
                  color:S.red, fontStyle:'italic' }}>
                  {avoidCustom}
                </span>
              )}
            </div>
          </Row>
        )}
      </div>
    </div>
  )
}

function Row({ icon, label, children }) {
  return (
    <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
      <div style={{ fontSize:11, color:S.textLt, minWidth:80, flexShrink:0, paddingTop:3,
        fontFamily:'Inter,sans-serif', fontSize:10, letterSpacing:.5,
        textTransform:'uppercase', fontWeight:600, color:S.textMid }}>
        {label}
      </div>
      <div style={{ flex:1 }}>{children}</div>
    </div>
  )
}
