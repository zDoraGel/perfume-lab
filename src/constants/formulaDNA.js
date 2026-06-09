export const PROJECTION_OPTS = [
  { value: 'whisper',   label: 'Whisper',   icon: '○', desc: 'Skin close — ได้กลิ่นต่อเมื่อเข้าใกล้' },
  { value: 'aura',      label: 'Aura',      icon: '◎', desc: 'Moderate — personal space ~1 เมตร' },
  { value: 'presence',  label: 'Presence',  icon: '◈', desc: 'Strong — ได้กลิ่นทั่วห้อง' },
  { value: 'signature', label: 'Signature', icon: '❋', desc: 'Beast mode — ได้กลิ่นก่อนเข้าห้อง' },
]

export const TEXTURE_OPTS = [
  { value: 'powdery',  label: 'Powdery',  emoji: '🌸', desc: 'แป้ง นุ่ม อบอุ่น' },
  { value: 'creamy',   label: 'Creamy',   emoji: '🍦', desc: 'ครีม มัน เนียน' },
  { value: 'watery',   label: 'Watery',   emoji: '💧', desc: 'ชุ่ม สด โปร่ง' },
  { value: 'dry',      label: 'Dry',      emoji: '🪵', desc: 'แห้ง กรอบ คม' },
  { value: 'resinous', label: 'Resinous', emoji: '🍯', desc: 'เหนียว อุ่น หนัก' },
  { value: 'fizzy',    label: 'Fizzy',    emoji: '✨', desc: 'ฟู้ สดชื่น เด้ง' },
  { value: 'velvety',  label: 'Velvety',  emoji: '🪶', desc: 'กำมะหยี่ นุ่มลึก' },
  { value: 'airy',     label: 'Airy',     emoji: '☁️', desc: 'เบา ลอย โปร่ง' },
]

export const TEMPERATURE_OPTS = [
  { value: 'icy',     label: 'Icy',     emoji: '🧊', desc: 'เย็นจัด' },
  { value: 'cool',    label: 'Cool',    emoji: '🌊', desc: 'เย็นสบาย' },
  { value: 'neutral', label: 'Neutral', emoji: '☁️', desc: 'กลางๆ' },
  { value: 'warm',    label: 'Warm',    emoji: '🌤',  desc: 'อบอุ่น' },
  { value: 'hot',     label: 'Hot',     emoji: '🔥', desc: 'ร้อน' },
]

export const FEELING_OPTS = [
  { value: 'quietly_clean',     label: 'สะอาดแบบเงียบๆ',         emoji: '🤍' },
  { value: 'effortless_luxury', label: 'ดูแพงแบบไม่พยายาม',       emoji: '🤍' },
  { value: 'approachable',      label: 'น่าเข้าใกล้',               emoji: '🤍' },
  { value: 'warm',              label: 'อบอุ่น',                    emoji: '🤍' },
  { value: 'soft_smooth',       label: 'นุ่มละมุน',                 emoji: '🤍' },
  { value: 'comforting',        label: 'สบายใจ',                    emoji: '🤍' },
  { value: 'relaxing',          label: 'ผ่อนคลาย',                  emoji: '🤍' },
  { value: 'soft_romantic',     label: 'โรแมนติกเบาๆ',             emoji: '🤍' },
  { value: 'natural_charm',     label: 'มีเสน่ห์แบบธรรมชาติ',      emoji: '🤍' },
  { value: 'minimal_luxury',    label: 'หรูหราแบบมินิมอล',         emoji: '🤍' },
  { value: 'airy',              label: 'โปร่งสบาย',                 emoji: '🤍' },
  { value: 'clean_neat',        label: 'ดูเรียบร้อยสะอาด',         emoji: '🤍' },
  { value: 'modern_mature',     label: 'ดูโตแบบทันสมัย',           emoji: '🤍' },
  { value: 'slightly_mysterious', label: 'ลึกลับนิดๆ',             emoji: '🤍' },
  { value: 'soft_sexy',         label: 'เซ็กซี่เบาๆ',              emoji: '🤍' },
  { value: 'fresh_bright',      label: 'สดใส',                      emoji: '🤍' },
  { value: 'confident',         label: 'ดูมั่นใจ',                  emoji: '🤍' },
  { value: 'gentle',            label: 'ดูอ่อนโยน',                 emoji: '🤍' },
  { value: 'calm',              label: 'ดู calm',                    emoji: '🤍' },
  { value: 'sophisticated',     label: 'ดู sophisticated',           emoji: '🤍' },
  { value: 'cozy',              label: 'ดู cozy',                    emoji: '🤍' },
  { value: 'skin_scent',        label: 'หอมเหมือนผิวจริง',         emoji: '🤍' },
  { value: 'clean_laundry',     label: 'สะอาดเหมือนผ้าพึ่งซัก',   emoji: '🤍' },
  { value: 'soft_glow',         label: 'เหมือนแสงอ่อนๆ รอบตัว',   emoji: '🤍' },
  { value: 'korean_soft',       label: 'ละมุนแบบเกาหลี',           emoji: '🤍' },
  { value: 'quiet_luxury',      label: 'luxury แบบ quiet',          emoji: '🤍' },
  { value: 'self_care',         label: 'หอมแบบคนดูแลตัวเอง',      emoji: '🤍' },
  { value: 'huggable',          label: 'น่ากอด',                    emoji: '🤍' },
  { value: 'artistic_niche',    label: 'ดูเป็น artistic / niche',   emoji: '🤍' },
  { value: 'whisper_scent',     label: 'หอมแบบไม่ตะโกน',           emoji: '🤍' },
  { value: 'sukum',             label: 'สุขุม',                      emoji: '🤍' },
  // Linen / White Tea
  { value: 'open_window',       label: 'เหมือนเปิดหน้าต่างรับลม',   emoji: '🤍' },
  { value: 'morning_dew',       label: 'เหมือนแดดเช้าอ่อนๆ',        emoji: '🤍' },
  { value: 'clean_room',        label: 'เหมือนห้องสะอาดหลังจัดใหม่', emoji: '🤍' },
  { value: 'fresh_linen',       label: 'เหมือนผ้าปูเตียงใหม่',      emoji: '🤍' },
  { value: 'after_rain',        label: 'เหมือนอากาศหลังฝน',         emoji: '🤍' },
  // Skin Scent
  { value: 'second_skin',       label: 'เหมือนกลิ่นตัวที่ดีอยู่แล้ว', emoji: '🤍' },
  { value: 'naturally_fragrant',label: 'เหมือนคนตัวหอมโดยธรรมชาติ', emoji: '🤍' },
  { value: 'close_proximity',   label: 'หอมแบบต้องเข้าใกล้',        emoji: '🤍' },
  { value: 'subtle_signature',  label: 'หอมแบบจำไม่ได้ว่าใส่น้ำหอม', emoji: '🤍' },
  // Luxury
  { value: 'understated',       label: 'แพงแบบ understated',         emoji: '🤍' },
  { value: 'low_profile_luxury',label: 'หรูแบบไม่ติดโลโก้',         emoji: '🤍' },
  { value: 'connoisseur',       label: 'เหมือนคนรสนิยมดี',          emoji: '🤍' },
  { value: 'classic',           label: 'ดูมีคลาส',                   emoji: '🤍' },
  // Floral
  { value: 'garden_fresh',      label: 'สดใสแบบฤดูใบไม้ผลิ',        emoji: '🤍' },
  { value: 'white_garden',      label: 'เหมือนสวนดอกไม้ขาว',        emoji: '🤍' },
  { value: 'airy_bloom',        label: 'ละมุนแบบดอกไม้โปร่ง',       emoji: '🤍' },
]

export const OPENING_OPTS = [
  { value: 'soft',        label: 'Soft',        desc: 'เปิดเบาๆ ค่อยๆ ออกมา' },
  { value: 'burst',       label: 'Burst',       desc: 'พุ่งออกมาแรงตั้งแต่แรก' },
  { value: 'slow_bloom',  label: 'Slow Bloom',  desc: 'ค่อยๆ บาน ดีขึ้นเรื่อยๆ' },
  { value: 'sharp',       label: 'Sharp',       desc: 'คมชัด แทงจมูก' },
  { value: 'diffused',    label: 'Diffused',    desc: 'กระจายเบาๆ รอบตัว' },
  { value: 'quiet',        label: 'Quiet',        desc: 'เงียบงัน ค่อยๆ ปรากฏ' },
  { value: 'skin_close',   label: 'Skin Close',   desc: 'แนบผิว ใกล้ชิด' },
  { value: 'floating',     label: 'Floating',     desc: 'ลอยรอบตัว เบา' },
  { value: 'layered',      label: 'Layered',      desc: 'เปิดหลายชั้น ซับซ้อน' },
  { value: 'glow',         label: 'Glow',         desc: 'ฟุ้งเรืองๆ อบอุ่น' },
  { value: 'creamy_bloom', label: 'Creamy Bloom', desc: 'ค่อยๆ นุ่มขึ้น' },
  { value: 'clean_lift',   label: 'Clean Lift',   desc: 'สดขึ้นแล้วยกตัว' },
]

export const AVOID_PRESETS = [
  { value: 'sharp_citrus',         label: 'Sharp Citrus',        desc: 'เปรี้ยวจัด แหลม' },
  { value: 'syrupy_fruits',        label: 'Syrupy Fruits',       desc: 'ผลไม้หวานเลี่ยน' },
  { value: 'candy_sweetness',      label: 'Candy Sweetness',     desc: 'หวานลูกกวาด' },
  { value: 'gourmand_notes',       label: 'Gourmand Notes',      desc: 'กลิ่นอาหาร ขนม' },
  { value: 'heavy_white_florals',  label: 'Heavy White Florals', desc: 'ดอกไม้ขาวหนักจัด' },
  { value: 'loud_projection',      label: 'Loud Projection',     desc: 'ฟุ้งแรง ตะโกนกลิ่น' },
  { value: 'metallic_fresh',       label: 'Metallic Fresh',      desc: 'สดแบบโลหะ เย็นจัด' },
  { value: 'bitter_tea',           label: 'Bitter Tea',          desc: 'ชาขม ฝาด' },
  { value: 'harsh_aquatic',        label: 'Harsh Aquatic',       desc: 'ทะเลแรง รุนแรง' },
  { value: 'masculine_cologne',    label: 'Masculine Cologne',   desc: 'กลิ่นผู้ชายจัดๆ' },
  { value: 'powder_bomb',          label: 'Powder Bomb',         desc: 'แป้งจัด หนักมาก' },
  { value: 'heavy_sweetness',      label: 'Heavy Sweetness',     desc: 'หวานมาก อึดอัด' },
  { value: 'spicy_woods',          label: 'Spicy Woods',         desc: 'ไม้เผ็ด แรง' },
  { value: 'dark_amber',           label: 'Dark Amber',          desc: 'amber เข้มทึบ หนัก' },
  { value: 'smoky_notes',          label: 'Smoky Notes',         desc: 'ควัน รมควัน จัด' },
  { value: 'aggressive_projection',label: 'Aggressive Projection', desc: 'กระจายแรง ตะโกนกลิ่น' },
  { value: 'soapy',                label: 'Soapy',               desc: 'เหมือนสบู่/น้ำยาล้างจาน' },
  { value: 'cold_floral',          label: 'Cold Floral',         desc: 'ดอกไม้เย็นชา' },
  { value: 'boozy',                label: 'Boozy',               desc: 'กลิ่นแอลกอฮอล์' },
  // Linen Theory
  { value: 'green_bitter',         label: 'Green Bitter',        desc: 'เขียวจัด ขม' },
  { value: 'animalic_musk',        label: 'Animalic Musk',       desc: 'มัสก์สัตว์ รุนแรง' },
  { value: 'dirty_patchouli',      label: 'Dirty Patchouli',     desc: 'ดินชื้น หนักมาก' },
  { value: 'overly_floral',        label: 'Overly Floral',       desc: 'ดอกไม้แน่นเกิน' },
  { value: 'synthetic_candy',      label: 'Synthetic Candy',     desc: 'หวานลูกกวาด ปลอม' },
  { value: 'detergent_laundry',    label: 'Detergent Laundry',   desc: 'ผงซักฟอก เคมี' },
  { value: 'baby_powder',          label: 'Baby Powder',         desc: 'แป้งเด็ก หนักอุ้ยอ้าย' },
  { value: 'hotel_lobby',          label: 'Hotel Lobby',         desc: 'โรงแรมจัดเกิน' },
  { value: 'overly_perfumey',      label: 'Overly Perfumey',     desc: 'รู้เลยว่าใส่น้ำหอม' },
  // White Tea
  { value: 'tea_tannins',          label: 'Tea Tannins',         desc: 'ชาฝาด ขม' },
  { value: 'citrus_peel',          label: 'Citrus Peel',         desc: 'เปลือกส้มแรง' },
  { value: 'medicinal',            label: 'Medicinal',           desc: 'กลิ่นยา ร้านขายยา' },
  { value: 'herbal_green',         label: 'Herbal Green',        desc: 'สมุนไพรจัด' },
  { value: 'sharp_neroli',         label: 'Sharp Neroli',        desc: 'เนโรลีแหลม' },
  // Skin Scent
  { value: 'too_sweet',            label: 'Too Sweet',           desc: 'หวานเกิน' },
  { value: 'too_loud',             label: 'Too Loud',            desc: 'ฟุ้งแรงเกิน' },
  { value: 'too_sexy',             label: 'Too Sexy',            desc: 'ย้วยวนเกิน' },
  { value: 'too_cold',             label: 'Too Cold',            desc: 'เย็นเกิน ชา' },
  { value: 'too_masculine',        label: 'Too Masculine',       desc: 'แมนเกิน' },
]

export const COMPLEXITY_OPTS = [
  {
    value: 'simple',
    label: 'Simple',
    tooltip: 'Clean & Minimal',
    desc: 'สูตรง่าย สะอาด',
    top: '1–2', heart: '1–2', base: '2–3', total: '4–6',
  },
  {
    value: 'standard',
    label: 'Standard',
    tooltip: 'Balanced & Signature',
    desc: 'สูตรมาตรฐาน มี depth',
    top: '2–3', heart: '2–3', base: '3–4', total: '6–10',
  },
  {
    value: 'complex',
    label: 'Complex',
    tooltip: 'Rich & Layered',
    desc: 'สูตรละเอียด niche style',
    top: '3–5', heart: '4–7', base: '5–8', total: '12–20',
  },
]

export const LONGEVITY_OPTS = ['1–2 hrs', '2–4 hrs', '4–6 hrs', '6–8 hrs', '8–10 hrs', '10+ hrs']

// Weight labels by selection order
export const WEIGHT_LABELS = ['Primary', 'Secondary', 'Accent', 'Accent', 'Note', 'Note']
export const WEIGHT_PCTS   = {
  1: [100],
  2: [70, 30],
  3: [60, 30, 10],
  4: [50, 25, 15, 10],
  5: [40, 25, 15, 12, 8],
  6: [35, 22, 15, 12, 9, 7],
}

/**
 * แปลง weighted selections เป็น prompt string
 * input: "creamy,powdery,watery" → "Creamy (Primary 60%), Powdery (Secondary 30%), Watery (Accent 10%)"
 */
export function weightedToPrompt(valueStr = '', opts = []) {
  if (!valueStr) return ''
  const vals   = valueStr.split(',').filter(Boolean)
  const pcts   = WEIGHT_PCTS[vals.length] || WEIGHT_PCTS[1]
  const labels = WEIGHT_LABELS
  return vals.map((v, i) => {
    const opt = opts.find(o => o.value === v)
    return `${opt?.label || v} (${labels[i]} ${pcts[i]}%)`
  }).join(', ')
}
