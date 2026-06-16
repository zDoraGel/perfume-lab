import { useState } from 'react'
import { S } from '../constants/theme'

const CATEGORY_FACTOR = {
  'leave-on':  1.0,
  'rinse-off': 2.0,
  'fragrance': 0.5,
}

const CONC_OPTIONS = [
  { label: 'SOFT',      pct: 5  },
  { label: 'SIGNATURE', pct: 12 },
  { label: 'DEEP',      pct: 20 },
]

export default function IFRAWarning({ items, concentration: defaultConc = 'SIGNATURE' }) {
  const [concentration, setConcentration] = useState(defaultConc)

  if (!items || items.length === 0) return null

  const concPct = CONC_OPTIONS.find(o => o.label === concentration)?.pct || 12
  const totalG  = items.reduce((s, i) => s + parseFloat(i.grams || 0), 0)
  if (totalG === 0) return null

  const warnings = items
    .filter(i => i.material?.ifra_limit != null)
    .map(i => {
      const pctInConc     = (parseFloat(i.grams) / totalG) * 100
      const pctInFormula  = pctInConc * (concPct / 100)
      const limit         = parseFloat(i.material.ifra_limit)
      const category      = i.material.ifra_category || 'leave-on'
      const factor        = CATEGORY_FACTOR[category] || 1.0
      const adjustedLimit = limit * factor
      const ratio         = pctInFormula / adjustedLimit
      return {
        name: i.material.name,
        pctInFormula: pctInFormula.toFixed(3),
        limit, adjustedLimit: adjustedLimit.toFixed(2),
        category, ratio,
        over:    ratio > 1,
        warning: ratio > 0.8 && ratio <= 1,
      }
    })
    .filter(w => w.over || w.warning)
    .sort((a, b) => b.ratio - a.ratio)

  const overs    = warnings.filter(w => w.over)
  const nearings = warnings.filter(w => w.warning)

  // ถ้าไม่มี warning ในทุก concentration ไม่โชว่ — แต่ถ้าเปลี่ยน conc แล้วหาย ให้โชว์ปุ่ม toggle อยู่
  const hasAnyMaterial = items.some(i => i.material?.ifra_limit != null)
  if (!hasAnyMaterial) return null

  return (
    <div style={{ marginTop: 12, borderRadius: 10, overflow: 'hidden',
      border: `1px solid ${overs.length > 0 ? S.red+'55' : warnings.length > 0 ? '#e8c040' : S.border}` }}>

      {/* Header */}
      <div style={{ padding: '8px 14px',
        background: overs.length > 0 ? S.redBg : warnings.length > 0 ? S.amberBg : S.bg,
        display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 14 }}>
          {overs.length > 0 ? '⚠' : warnings.length > 0 ? '⚡' : '✓'}
        </span>
        <span style={{ fontSize: 11, fontWeight: 700,
          color: overs.length > 0 ? S.red : warnings.length > 0 ? S.amber : S.textMid,
          textTransform: 'uppercase', letterSpacing: .8 }}>
          IFRA
          {overs.length > 0 && ` · ${overs.length} รายการเกิน limit`}
          {overs.length === 0 && nearings.length > 0 && ` · ${nearings.length} รายการใกล้ limit`}
          {warnings.length === 0 && ' · ผ่านทุก limit'}
        </span>
      </div>

      {/* Concentration toggle */}
      <div style={{ padding: '10px 14px', background: S.white,
        borderBottom: `1px solid ${S.border}`, display: 'flex', gap: 6, alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: S.textLt, marginRight: 4 }}>คำนวณที่</span>
        {CONC_OPTIONS.map(o => (
          <button key={o.label} onClick={() => setConcentration(o.label)}
            style={{ padding: '4px 12px', borderRadius: 20, cursor: 'pointer',
              fontSize: 11, fontWeight: 600, fontFamily: 'Inter,sans-serif',
              border: `1.5px solid ${concentration === o.label ? S.gold : S.border}`,
              background: concentration === o.label ? S.goldLt : 'transparent',
              color: concentration === o.label ? S.gold : S.textMid }}>
            {o.label}
            <span style={{ fontSize: 10, fontWeight: 400, marginLeft: 3, opacity: .7 }}>
              {o.pct}%
            </span>
          </button>
        ))}
      </div>

      {/* Rows */}
      {warnings.length > 0 ? (
        <div style={{ background: S.white, padding: '4px 0' }}>
          {warnings.map((w, i) => (
            <div key={i} style={{ padding: '8px 14px',
              borderBottom: i < warnings.length - 1 ? `1px solid ${S.border}` : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: 13, fontFamily: 'Cormorant Garamond,serif',
                    color: S.text, fontStyle: 'italic' }}>{w.name}</span>
                  <span style={{ fontSize: 10, color: S.textLt, marginLeft: 6 }}>{w.category}</span>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700,
                  color: w.over ? S.red : S.amber,
                  background: w.over ? S.redBg : S.amberBg,
                  padding: '2px 8px', borderRadius: 12 }}>
                  {w.over ? 'เกิน' : 'ใกล้ limit'}
                </span>
              </div>
              <div style={{ marginTop: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between',
                  fontSize: 10, color: S.textMid, marginBottom: 3 }}>
                  <span>ใช้ {w.pctInFormula}% ใน final product</span>
                  <span>limit {w.adjustedLimit}%</span>
                </div>
                <div style={{ background: S.border, borderRadius: 3, height: 5 }}>
                  <div style={{
                    width: `${Math.min(w.ratio * 100, 100)}%`,
                    height: '100%', borderRadius: 3,
                    background: w.over ? S.red : S.amber,
                    transition: 'width .4s'
                  }}/>
                </div>
                <div style={{ fontSize: 10, color: S.textLt, marginTop: 2 }}>
                  {(w.ratio * 100).toFixed(0)}% ของ limit
                  {w.over && ` · เกิน ${((w.ratio - 1) * 100).toFixed(0)}%`}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: '12px 14px', background: S.white,
          fontSize: 12, color: S.textLt, textAlign: 'center' }}>
          ไม่มีรายการเกินหรือใกล้ limit ที่ {concentration} ({concPct}%)
        </div>
      )}

      <div style={{ padding: '6px 14px', background: S.bg,
        fontSize: 10, color: S.textLt, borderTop: `1px solid ${S.border}` }}>
        คำนวณจาก % ใน final product · เปลี่ยน concentration ด้านบนเพื่อดูผลต่างค่ะ
      </div>
    </div>
  )
}
