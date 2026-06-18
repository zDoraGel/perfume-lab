import { S, FC, FAMILIES } from '../constants/theme'

// ── Helpers ────────────────────────────────────────────────────────────────
// คำนวณ % ของแต่ละ family จาก items (ตาม grams) แล้วกรองเฉพาะ family ที่มีใช้จริง
function computeFamilyPercents(items = []) {
  const totals = {}
  let totalG = 0

  items.forEach(it => {
    const family = it.material?.family || it.family
    const grams  = parseFloat(it.grams || 0)
    if (!family || !grams) return
    totals[family] = (totals[family] || 0) + grams
    totalG += grams
  })

  if (!totalG) return []

  // เรียงตาม FAMILIES order เดิม แต่เอาเฉพาะตัวที่มีค่า > 0
  return FAMILIES
    .filter(f => totals[f] > 0)
    .map(f => ({
      family: f,
      pct: (totals[f] / totalG) * 100,
      color: FC[f]?.c  || S.gold,
      bg:    FC[f]?.bg || S.goldLt,
    }))
}

// แปลงพิกัด polar -> cartesian รอบจุดศูนย์กลาง (cx, cy)
function point(cx, cy, radius, angle) {
  return {
    x: cx + radius * Math.cos(angle - Math.PI / 2),
    y: cy + radius * Math.sin(angle - Math.PI / 2),
  }
}

export default function FormulaRadarChart({ formula, items = [] }) {
  const data = computeFamilyPercents(items)

  if (!data.length) return null

  // ต้องมีอย่างน้อย 3 แกนถึงจะวาด polygon ได้อย่างมีความหมาย — ถ้าน้อยกว่านั้นโชว์เป็น breakdown แทน
  if (data.length < 3) {
    return (
      <div style={{ marginTop:14, paddingTop:14, borderTop:`1px solid ${S.border}` }}>
        <div style={{ fontSize:10, fontWeight:700, color:S.gold, letterSpacing:1.2,
          textTransform:'uppercase', marginBottom:10, fontFamily:'Inter,sans-serif' }}>
          ✦ Scent Profile
        </div>
        <div style={{ fontSize:11, color:S.textLt, marginBottom:8 }}>
          ต้องมีอย่างน้อย 3 families ถึงจะแสดงเป็น radar chart ได้ — ตอนนี้มี {data.length} family
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
          {[...data].sort((a, b) => b.pct - a.pct).map((d, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:7 }}>
              <span style={{ width:8, height:8, borderRadius:'50%',
                background:d.color, flexShrink:0 }} />
              <span style={{ fontSize:11, color:S.textMid, flex:1 }}>{d.family}</span>
              <span style={{ fontSize:11, fontWeight:600, color:S.text }}>
                {d.pct.toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const SIZE   = 220
  const CX     = SIZE / 2
  const CY     = SIZE / 2
  const R_MAX  = SIZE / 2 - 36 // เว้นที่ไว้สำหรับ label
  const N      = data.length
  const STEP   = (Math.PI * 2) / N
  const RINGS  = [0.25, 0.5, 0.75, 1]

  // หา max % เพื่อ scale แกน (ขั้นต่ำ 30% กันกราฟดูเล็กเกินไปตอนมี family เดียวเด่น)
  const maxPct = Math.max(30, ...data.map(d => d.pct))

  const axisPoints = data.map((d, i) => point(CX, CY, R_MAX, i * STEP))
  const dataPoints  = data.map((d, i) => point(CX, CY, (d.pct / maxPct) * R_MAX, i * STEP))
  const polygonPath = dataPoints.map(p => `${p.x},${p.y}`).join(' ')

  return (
    <div style={{ marginTop:14, paddingTop:14, borderTop:`1px solid ${S.border}` }}>
      <div style={{ fontSize:10, fontWeight:700, color:S.gold, letterSpacing:1.2,
        textTransform:'uppercase', marginBottom:10, fontFamily:'Inter,sans-serif' }}>
        ✦ Scent Profile
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:18, flexWrap:'wrap' }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          {/* Background rings */}
          {RINGS.map((r, ri) => {
            const ringPts = Array.from({ length: N }, (_, i) =>
              point(CX, CY, R_MAX * r, i * STEP))
            const ringPath = ringPts.map(p => `${p.x},${p.y}`).join(' ')
            return (
              <polygon key={ri} points={ringPath} fill="none"
                stroke={S.border} strokeWidth={ri === RINGS.length - 1 ? 1.2 : 0.8} />
            )
          })}

          {/* Axis lines */}
          {axisPoints.map((p, i) => (
            <line key={i} x1={CX} y1={CY} x2={p.x} y2={p.y}
              stroke={S.border} strokeWidth={0.8} />
          ))}

          {/* Data polygon */}
          <polygon points={polygonPath} fill={S.gold} fillOpacity={0.18}
            stroke={S.gold} strokeWidth={1.6} strokeLinejoin="round" />

          {/* Data points */}
          {dataPoints.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={3} fill={data[i].color} />
          ))}

          {/* Axis labels */}
          {axisPoints.map((p, i) => {
            const labelPt = point(CX, CY, R_MAX + 18, i * STEP)
            const anchor  = Math.abs(labelPt.x - CX) < 4 ? 'middle'
              : labelPt.x > CX ? 'start' : 'end'
            return (
              <text key={i} x={labelPt.x} y={labelPt.y}
                textAnchor={anchor} dominantBaseline="middle"
                fontSize={9.5} fontFamily="Inter,sans-serif" fontWeight={600}
                fill={data[i].color}>
                {data[i].family}
              </text>
            )
          })}
        </svg>

        {/* % breakdown list */}
        <div style={{ display:'flex', flexDirection:'column', gap:5, flex:1, minWidth:120 }}>
          {[...data].sort((a, b) => b.pct - a.pct).map((d, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:7 }}>
              <span style={{ width:8, height:8, borderRadius:'50%',
                background:d.color, flexShrink:0 }} />
              <span style={{ fontSize:11, color:S.textMid, flex:1 }}>{d.family}</span>
              <span style={{ fontSize:11, fontWeight:600, color:S.text }}>
                {d.pct.toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
