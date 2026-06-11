import { S } from '../constants/theme'

// category multiplier เทียบกับ leave-on (base 1.0)
// rinse-off ใช้ได้มากกว่า, fragrance ใช้ได้น้อยกว่า leave-on ทั่วไป
const CATEGORY_FACTOR = {
  'leave-on':   1.0,
  'rinse-off':  2.0,
  'fragrance':  0.5,   // fine fragrance — limit เข้มกว่า
}

// คำนวณ % ของ ingredient ใน final formula
// formula = concentrate ใน bottle
// concentration_pct = สัดส่วน concentrate ใน bottle (SOFT~5%, SIGNATURE~12%, DEEP~20%)
// default: คำนวณเฉพาะ % ใน concentrate (conservative)
export default function IFRAWarning({ items, concentration = 'SIGNATURE' }) {
  if (!items || items.length === 0) return null

  const concPct = { SOFT: 5, SIGNATURE: 12, DEEP: 20 }[concentration] || 12

  // total grams ของ concentrate
  const totalG = items.reduce((s, i) => s + parseFloat(i.grams || 0), 0)
  if (totalG === 0) return null

  // หา items ที่มี ifra_limit และเกิน limit
  const warnings = items
    .filter(i => i.material?.ifra_limit != null)
    .map(i => {
      const pctInConc    = (parseFloat(i.grams) / totalG) * 100
      const pctInFormula = pctInConc * (concPct / 100)  // % ใน final product
      const limit        = parseFloat(i.material.ifra_limit)
      const category     = i.material.ifra_category || 'leave-on'
      const factor       = CATEGORY_FACTOR[category] || 1.0
      const adjustedLimit = limit * factor
      const ratio        = pctInFormula / adjustedLimit
      return {
        name:           i.material.name,
        pctInConc:      pctInConc.toFixed(2),
        pctInFormula:   pctInFormula.toFixed(3),
        limit,
        adjustedLimit:  adjustedLimit.toFixed(2),
        category,
        ratio,
        over:           ratio > 1,
        warning:        ratio > 0.8 && ratio <= 1,
      }
    })
    .filter(w => w.over || w.warning)
    .sort((a, b) => b.ratio - a.ratio)

  if (warnings.length === 0) return null

  const overs    = warnings.filter(w => w.over)
  const nearings = warnings.filter(w => w.warning)

  return (
    <div style={{ marginTop:12, borderRadius:10, overflow:'hidden',
      border:`1px solid ${overs.length > 0 ? S.red+'55' : '#e8c040'}` }}>

      {/* Header */}
      <div style={{ padding:'8px 14px',
        background: overs.length > 0 ? S.redBg : S.amberBg,
        display:'flex', alignItems:'center', gap:6 }}>
        <span style={{ fontSize:14 }}>{overs.length > 0 ? '⚠' : '⚡'}</span>
        <span style={{ fontSize:11, fontWeight:700,
          color: overs.length > 0 ? S.red : S.amber,
          textTransform:'uppercase', letterSpacing:.8 }}>
          IFRA Warning
          {overs.length > 0 && ` · ${overs.length} รายการเกิน limit`}
          {overs.length === 0 && ` · ${nearings.length} รายการใกล้ limit`}
        </span>
        <span style={{ fontSize:10, color:S.textLt, marginLeft:'auto' }}>
          คำนวณที่ {concentration} ({concPct}%)
        </span>
      </div>

      {/* Rows */}
      <div style={{ background:S.white, padding:'4px 0' }}>
        {warnings.map((w, i) => (
          <div key={i} style={{ padding:'8px 14px',
            borderBottom: i < warnings.length-1 ? `1px solid ${S.border}` : 'none' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <span style={{ fontSize:13, fontFamily:'Cormorant Garamond,serif',
                  color:S.text, fontStyle:'italic' }}>{w.name}</span>
                <span style={{ fontSize:10, color:S.textLt, marginLeft:6 }}>{w.category}</span>
              </div>
              <span style={{ fontSize:11, fontWeight:700,
                color: w.over ? S.red : S.amber,
                background: w.over ? S.redBg : S.amberBg,
                padding:'2px 8px', borderRadius:12 }}>
                {w.over ? 'เกิน' : 'ใกล้ limit'}
              </span>
            </div>
            {/* progress bar */}
            <div style={{ marginTop:6 }}>
              <div style={{ display:'flex', justifyContent:'space-between',
                fontSize:10, color:S.textMid, marginBottom:3 }}>
                <span>ใช้ {w.pctInFormula}% ใน final product</span>
                <span>limit {w.adjustedLimit}%</span>
              </div>
              <div style={{ background:S.border, borderRadius:3, height:5 }}>
                <div style={{
                  width:`${Math.min(w.ratio * 100, 100)}%`,
                  height:'100%', borderRadius:3,
                  background: w.over ? S.red : S.amber,
                  transition:'width .4s'
                }}/>
              </div>
              <div style={{ fontSize:10, color:S.textLt, marginTop:2 }}>
                {(w.ratio * 100).toFixed(0)}% ของ limit
                {w.over && ` · เกิน ${((w.ratio - 1) * 100).toFixed(0)}%`}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding:'6px 14px', background:S.bg,
        fontSize:10, color:S.textLt, borderTop:`1px solid ${S.border}` }}>
        คำนวณจาก % ใน final product · ปรับ Concentration เพื่อดูผลต่างค่ะ
      </div>
    </div>
  )
}
