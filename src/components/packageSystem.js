/**
 * Package System — Soft / Signature / Deep
 * 
 * แนวคิด: blend concentrate ครั้งเดียว แล้วแบ่งเติม alcohol ตาม variant
 * ไม่ได้ scale ingredients ใหม่ทุกขวด
 */

export const CONCENTRATIONS = {
  EdP_Soft: {
    label:       'Eau de Parfum Soft',
    shortLabel:  'Soft',
    concentration: 0.12,
    longevity:   '4–6 hrs',
    icon:        '○',
    description: 'กลิ่นอ่อนโยน เบาสบาย ใส่ทุกวัน',
  },
  EdP_Signature: {
    label:       'Eau de Parfum',
    shortLabel:  'Signature',
    concentration: 0.18,
    longevity:   '6–8 hrs',
    icon:        '◎',
    description: 'กลิ่นชัดเจน เป็นเอกลักษณ์ สูตรมาตรฐาน',
  },
  EdP_Deep: {
    label:       'Parfum Intense',
    shortLabel:  'Deep',
    concentration: 0.25,
    longevity:   '10–14 hrs',
    icon:        '◈',
    description: 'เข้มข้นเต็มที่ ติดทน สำหรับผู้ชื่นชอบกลิ่นจัด',
  },
}

export const PACKAGE_SIZES = [5, 10, 15, 30, 50, 100]

export const BOTTLE_COSTS = {
  5: 35, 10: 55, 15: 65, 30: 90, 50: 130, 100: 200,
}

export const ALCOHOL_COST_PER_ML = 0.35

/**
 * คำนวณการเติมขวดสำหรับแต่ละ variant
 * @param {number} concentrateGrams  - น้ำหนัก concentrate ทั้งหมดที่ blend ไว้ (g)
 * @param {string} variant           - 'EdP_Soft' | 'EdP_Signature' | 'EdP_Deep'
 * @param {number} targetMl          - ขนาดขวด (ml)
 * @param {number} concentrateCost   - ต้นทุน concentrate รวม (฿)
 */
export function calcBottleFill(concentrateGrams, variant, targetMl, concentrateCost = 0) {
  const conc = CONCENTRATIONS[variant]
  if (!conc) return null

  // concentrate ที่ต้องใส่ในขวดนี้
  const concInBottle   = targetMl * conc.concentration  // grams
  const alcoholInBottle = targetMl * (1 - conc.concentration) // ml

  // ต้นทุนต่อ gram ของ concentrate
  const costPerGram    = concentrateGrams > 0 ? concentrateCost / concentrateGrams : 0
  const concCost       = concInBottle * costPerGram
  const alcoholCost    = alcoholInBottle * ALCOHOL_COST_PER_ML
  const bottleCost     = BOTTLE_COSTS[targetMl] || BOTTLE_COSTS[30]
  const totalCost      = concCost + alcoholCost + bottleCost
  const suggestedPrice = totalCost * 3.5

  return {
    variant,
    variantLabel:     conc.shortLabel,
    concentration:    conc.concentration,
    concentrationPct: Math.round(conc.concentration * 100),
    targetMl,
    longevity:        conc.longevity,
    description:      conc.description,
    // สิ่งที่ต้องเตรียม
    concInBottle:     parseFloat(concInBottle.toFixed(3)),
    alcoholInBottle:  parseFloat(alcoholInBottle.toFixed(2)),
    costs: {
      concentrate: parseFloat(concCost.toFixed(2)),
      alcohol:     parseFloat(alcoholCost.toFixed(2)),
      bottle:      bottleCost,
      total:       parseFloat(totalCost.toFixed(2)),
      suggested:   parseFloat(suggestedPrice.toFixed(0)),
    },
  }
}

/**
 * สร้างทั้ง 3 variants สำหรับ 1 bottle size
 */
export function buildBottleFills(concentrateGrams, targetMl, concentrateCost = 0) {
  return {
    soft:      calcBottleFill(concentrateGrams, 'EdP_Soft',      targetMl, concentrateCost),
    signature: calcBottleFill(concentrateGrams, 'EdP_Signature', targetMl, concentrateCost),
    deep:      calcBottleFill(concentrateGrams, 'EdP_Deep',      targetMl, concentrateCost),
  }
}
