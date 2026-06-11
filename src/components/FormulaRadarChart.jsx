import { S } from '../constants/theme'

// map DNA values → numeric scores 0–100
function scoreProjection(v) {
  return { whisper:20, aura:50, presence:75, signature:100 }[v] ?? 0
}
function scoreTexture(v) {
  // heaviness: powdery=60, creamy=75, watery=25, dry=50, resinous=90, fizzy=30, velvety=70, airy=20
  return { powdery:60, creamy:75, watery:25, dry:50, resinous:90, fizzy:30, velvety:70, airy:20 }[v] ?? 50
}
function scoreTemperature(v) {
  return { icy:5, cool:25, neutral:50, warm:75, hot:100 }[v] ?? 50
}

// Radar axes
const AXES = [
  { key:'projection',   label:'Projection'  },
  { key:'texture',      label:'Richness'    },
  { key:'temperature',  label:'Warmth'      },
  { key:'complexity',   label:'Complexity'  },
  { key:'brightness',   label:'Brightness'  },
]

function polarToXY(angleDeg, r, cx, cy) {
  const rad = (angleDeg - 90) * (Math.PI / 180)
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

export default function FormulaRadarChart({ formula, items = [] }) {
  const cx = 110, cy = 110, maxR = 80

  // derive scores from DNA
  const projScore    = scoreProjection(formula.projection)
  const textureScore = formula.texture
    ? scoreTexture(formula.texture.split(',')[0])
    : 50
  const tempScore    = formula.temperature
    ? scoreTemperature(formula.temperature.split(',')[0])
    : 50

  // complexity from ingredient count
  const complexityScore = Math.min(100, (items.length / 12) * 100)

  // brightness: citrus/fresh heavy = bright, woody/ambery = dark
  const brightFamilies = ['Citrus','Fresh']
  const darkFamilies   = ['Woody','Ambery','Gourmand','Musk']
  const totalG = items.reduce((s,i) => s + parseFloat(i.grams||0), 0)
  const brightG = items.filter(i => brightFamilies.includes(i.material?.family))
    .reduce((s,i) => s + parseFloat(i.grams||0), 0)
  const darkG = items.filter(i => darkFamilies.includes(i.material?.family))
    .reduce((s,i) => s + parseFloat(i.grams||0), 0)
  const brightnessScore = totalG > 0
    ? Math.round(50 + ((brightG - darkG * 0.5) / totalG) * 50)
    : 50

  const scores = [projScore, textureScore, tempScore, complexityScore, brightnessScore]

  // check if anything meaningful
  const hasDNA = formula.projection || formula.texture || formula.temperature
  const hasItems = items.length > 0
  if (!hasDNA && !hasItems) return null

  // polygon points
  const n = AXES.length
  const dataPoints = scores.map((s, i) => {
    const angle = (360 / n) * i
    const r     = (s / 100) * maxR
    return polarToXY(angle, r, cx, cy)
  })
  const dataPath = dataPoints.map((p, i) => `${i===0?'M':'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ' Z'

  // grid rings
  const rings = [0.25, 0.5, 0.75, 1]

  return (
    <div style={{ marginTop:14, marginBottom:4 }}>
      <div style={{ fontSize:10, fontWeight:700, color:S.gold, letterSpacing:1.2,
        textTransform:'uppercase', marginBottom:8, fontFamily:'Inter,sans-serif' }}>
        ✦ Formula Profile
      </div>
      <div style={{ display:'flex', justifyContent:'center' }}>
        <svg viewBox="0 0 220 220" style={{ width:200, height:200 }}>
          {/* grid rings */}
          {rings.map(f => {
            const pts = Array.from({ length:n }, (_, i) => {
              const angle = (360 / n) * i
              return polarToXY(angle, f * maxR, cx, cy)
            })
            const d = pts.map((p,i) => `${i===0?'M':'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ' Z'
            return <path key={f} d={d} fill="none" stroke={S.border} strokeWidth={f===1?1:.5}/>
          })}

          {/* axis lines */}
          {AXES.map((_, i) => {
            const angle = (360 / n) * i
            const end   = polarToXY(angle, maxR, cx, cy)
            return <line key={i} x1={cx} y1={cy} x2={end.x} y2={end.y}
              stroke={S.border} strokeWidth=".5"/>
          })}

          {/* data polygon */}
          <path d={dataPath} fill={S.gold} fillOpacity={.18} stroke={S.gold} strokeWidth={1.5}/>

          {/* data points */}
          {dataPoints.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={3} fill={S.gold}/>
          ))}

          {/* axis labels */}
          {AXES.map((ax, i) => {
            const angle   = (360 / n) * i
            const labelR  = maxR + 18
            const pos     = polarToXY(angle, labelR, cx, cy)
            const anchor  = pos.x < cx - 5 ? 'end' : pos.x > cx + 5 ? 'start' : 'middle'
            return (
              <text key={i} x={pos.x} y={pos.y + 4} textAnchor={anchor}
                fontSize={9} fill={S.textMid} fontFamily="Inter,sans-serif">
                {ax.label}
              </text>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
