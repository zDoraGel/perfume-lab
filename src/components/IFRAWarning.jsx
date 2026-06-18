import { S } from '../constants/theme'

// % ความเข้มข้นของ concentrate ในผลิตภัณฑ์สำเร็จรูป (EDP) ต่อระดับ
// ตรงกับค่าที่ใช้ใน FormulaCardMini.jsx / PageProduction.jsx
const DILUTION_PCT = {
  SOFT:      12,
  SIGNATURE: 18,
  DEEP:      25,
}

const CATEGORY_LABEL = {
  'leave-on':       'Leave-on (น้ำหอม)',
  'fine-fragrance':  'Fine Fragrance',
  'rinse-off':       'Rinse-off',
}

/**
 * คำนวณ % ของวัตถุดิบแต่ละตัวในผลิตภัณฑ์สำเร็จรูป (หลังเจือจางตาม concentration ที่เลือก)
 * แล้วเทียบกับ ifra_limit ของวัตถุดิบนั้น
 */
function checkIFRA(items, concentration) {
  const dilution = DILUTION_PCT[concentration] ?? DILUTION_PCT.SIGNATURE

  const validItems = items.filter(i => i.material?.name && i.material?.ifra_limit != null)
  if (!validItems.length) return []

  // ใช้ grams ดิบ (ก่อน scale) เพราะสัดส่วน % ในสูตรไม่เปลี่ยนตาม scale อยู่แล้ว
  const totalG = items.reduce((s, i) => s + parseFloat(i.grams || 0), 0)
  if (!totalG) return []

  return validItems.map(item => {
    const pctInConcentrate = (parseFloat(item.grams || 0) / totalG) * 100
    const pctInProduct      = pctInConcentrate * (dilution / 100)
    const limit              = parseFloat(item.material.ifra_limit)
    const ratio               = limit > 0 ? pctInProduct / limit : 0
    return {
      name:     item.material.name,
      category: item.material.ifra_category || 'leave-on',
      pctInConcentrate,
      pctInProduct,
      limit,
      ratio, // > 1 = เกิน limit
    }
  }).sort((a, b) => b.ratio - a.ratio)
}

export default function IFRAWarning({ items = [], concentration = 'SIGNATURE' }) {
  const results = checkIFRA(items, concentration)
  if (!results.length) return null

  const overLimit = results.filter(r => r.ratio > 1)
  const nearLimit  = results.filter(r => r.ratio > 0.8 && r.ratio <= 1)
  const dilution   = DILUTION_PCT[concentration] ?? DILUTION_PCT.SIGNATURE

  // ไม่มีอะไรน่าห่วง — ไม่ต้องโชว์อะไรเลยเพื่อไม่ให้รก UI
  if (!overLimit.length && !nearLimit.length) return null

  return (
    <div style={{ marginTop:10, padding:'12px 14px', borderRadius:10,
      background: overLimit.length ? '#fdf0ee' : '#fdf5e6',
      border:`1px solid ${overLimit.length ? S.red + '55' : S.amber + '55'}` }}>

      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
        <span style={{ fontSize:13 }}>{overLimit.length ? '⚠️' : '⚡'}</span>
        <span style={{ fontSize:11, fontWeight:700,
          color: overLimit.length ? S.red : S.amber,
          textTransform:'uppercase', letterSpacing:.6 }}>
          IFRA {overLimit.length ? 'เกิน Limit' : 'ใกล้ Limit'}
        </span>
        <span style={{ fontSize:10, color:S.textLt, marginLeft:'auto' }}>
          คำนวณที่ {concentration} ({dilution}% dilution)
        </span>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {[...overLimit, ...nearLimit].map((r, i) => (
          <div key={i} style={{ display:'flex', justifyContent:'space-between',
            alignItems:'center', gap:10, fontSize:11.5 }}>
            <div style={{ flex:1, minWidth:0 }}>
              <span style={{ color:S.ink, fontWeight:600 }}>{r.name}</span>
              <span style={{ color:S.textLt, marginLeft:6, fontSize:10 }}>
                {CATEGORY_LABEL[r.category] || r.category}
              </span>
            </div>
            <div style={{ flexShrink:0, textAlign:'right', fontFamily:'Inter,sans-serif' }}>
              <span style={{ fontWeight:700, color: r.ratio > 1 ? S.red : S.amber }}>
                {r.pctInProduct.toFixed(3)}%
              </span>
              <span style={{ color:S.textLt }}> / {r.limit}%</span>
            </div>
          </div>
        ))}
      </div>

      {overLimit.length > 0 && (
        <div style={{ fontSize:10, color:S.textMid, marginTop:8, lineHeight:1.5 }}>
          * ตัวเลข % คำนวณจากความเข้มข้นของวัตถุดิบในสูตร × % concentrate ที่เจือจางแล้ว
          ลองลด grams ของวัตถุดิบที่เกิน limit หรือเปลี่ยนไปใช้ concentration ที่เจือจางน้อยกว่า
        </div>
      )}
    </div>
  )
}
