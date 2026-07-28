// ── Global Token Tracker ──────────────────────────────────────────────────────
export let sessionTokens = { input: 0, output: 0, calls: 0 }

// ── Linen Theory — Formula Design Guideline ───────────────────────────────────
// ลดความ "อั้ล" ของจมูกจากการ stack musk หลายตัวซ้อนกัน + คุมความซับซ้อนของสูตร — ใส่ในทุก prompt ที่ AI แต่งสูตรใหม่
export const MUSK_GUIDELINE = [
  'CORE RULE (สำคัญที่สุด — เช็คก่อนใส่วัตถุดิบทุกตัว): Less is More.',
  'ก่อนเพิ่มวัตถุดิบตัวไหนเข้าสูตร ต้องตอบคำถามนี้ก่อนเสมอ: "ตัวนี้แก้ปัญหาอะไร / ทำหน้าที่อะไรที่ตัวอื่นยังไม่ได้ทำ?"',
  'ถ้าคำตอบคือ "ไม่มีหน้าที่ชัดเจน" → ห้ามใส่ตัวนั้น',
  '',
  'FUNCTION RULE — ทุกวัตถุดิบต้องมีหน้าที่หลักไม่ซ้ำกัน (no duplicated functions) — Material Function Matrix ตัวอย่าง:',
  'White Musk → Skin scent · Pear Blossom → Floral Heart · White Tea → Freshness · Hedione → Diffusion · Iso E Super → Transparency · Sandalwood → Warm Base · Cashmeran → Texture · Ambroxan → Longevity · Vanilla → Comfort',
  'ถ้า 2 ตัวมีหน้าที่ซ้ำกัน (identical role) ให้ตัดออก 1 ตัวเสมอ',
  '',
  'BRAND SCORING — ให้คะแนนทิศทางกลิ่นตามนี้ (0-10, ยิ่งใกล้เป้าหมายยิ่งดี):',
  'Transparency: เป้าหมาย 9/10 · Comfort: เป้าหมาย 10/10 · Quiet Luxury: เป้าหมาย 9/10',
  'Projection: เป้าหมาย 3/10 (เบาไว้ก่อน) · Powder: เป้าหมาย 0/10 (ห้ามมีกลิ่นแป้ง) · Gourmand: เป้าหมาย 1/10 · Laundry: เป้าหมาย 2/10',
  '',
  'COMPLEXITY — จำนวนวัตถุดิบต่อสูตร:',
  'Ideal: 6-8 ตัว · Maximum: 10 ตัว',
  'ถ้าเกิน 10 ตัว ต้องอธิบายเหตุผลว่าทำไมแต่ละตัวถึงจำเป็นต้องมี',
  '',
  'MUSK RULES (Linen Theory brand DNA — ต้องทำตามเสมอ ห้ามฝ่าฝืน):',
  '- Primary Musk Accord: เลือกได้แค่ 1 ตัวเท่านั้นจากกลุ่มนี้ (White Musk, Clean Musk, Skin Musk, Galaxolide, Habanolide, Helvetolide, Cosmone ฯลฯ) — ห้ามใช้ primary musk accord มากกว่า 1 ตัวพร้อมกัน เว้นแต่มีเหตุผลทางเทคนิคชัดเจนจริงๆ',
  '- Second Musk Material: อนุญาตให้มีตัวที่ 2 ได้ ถ้ามันทำหน้าที่โครงสร้างที่ต่างจากตัวแรกจริงๆ (ไม่ใช่ใส่ซ้ำเพื่อความเนียน) — ห้าม redundant musk layering',
  '- Maximum Total Musk Materials: 2 ตัวต่อสูตร เด็ดขาด',
  '- Prioritize transparent skin scent over dense musk เสมอ — ถ้าต้องการความโปร่ง เบา หรือ airy ให้ใช้ Hedione หรือ Iso E Super แทนการเพิ่ม musk ตัวที่ 3',
  '',
  'DRYDOWN VALIDATION — เช็คก่อนส่งสูตรทุกครั้งว่าปลายกลิ่นให้ความรู้สึกเหล่านี้:',
  '✓ Clean skin  ✓ Soft fabric  ✓ Warm skin  ✓ Airy  ✓ Transparent',
  'และต้องไม่ใช่แบบนี้เด็ดขาด:',
  '✗ Musty  ✗ Muddy  ✗ Damp cloth  ✗ Heavy laundry  ✗ Dense musk cloud',
  '',
  'เป้าหมายกลิ่นของแบรนด์: Clean, Airy, Quiet Luxury, Transparent, Skin Scent',
  'หลีกเลี่ยง: heavy musk base, thick laundry accord, animalic musk, powder overload',
  '',
  'Materials ที่เข้ากับแนวแบรนด์มาก (ใช้บ่อยได้ ไม่ต้องกลัวซ้ำ): Iso E Super, Pear Blossom, White Tea, Tender Love',
  '',
  'Avoid Materials (ห้ามใช้ เพราะดันกลิ่นไปทางที่แบรนด์ไม่ต้องการ): Animalic Musk, Dirty Musk, Cumin, Honey, Leather, Smoke, Earthy, Wet Moss',
  '',
  'WHITE FLORAL RULE — หลีกเลี่ยงการให้ white floral ตัวใดตัวหนึ่ง dominant เกินไป — ถ้าวัตถุดิบ white floral ตัวเดียว (เช่น White Flower, Jasmine, Tuberose) มีน้ำหนักเกิน 35% ของสูตรทั้งหมด ต้องอธิบายเหตุผลใน "reason" ว่าทำไมจึงจำเป็นต้องหนักขนาดนั้น (ไม่ใช่แค่ตั้งเพดานตายตัวเป็นกรัม เพราะแต่ละสูตรขนาดไม่เท่ากัน)',
  '',
  'WHY THIS FEELS EXPENSIVE — สูตรที่ดีต้องอธิบายได้ว่าทำไมถึงให้ความรู้สึกหรูหรา: ไม่ใช่เพราะกลิ่นแรงกว่า ไม่ใช่เพราะใช้วัตถุดิบแพงกว่า แต่เพราะทุกตัวมีหน้าที่ชัดเจน และไม่มีตัวไหนรู้สึกเกินความจำเป็น',
].join('\n')

export async function callAI(system, user) {
  try {
    const r = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/clever-task`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ system, user }),
    })
    const d = await r.json()
    console.log('[callAI raw d]', JSON.stringify(d).substring(0, 300))
    if (d.inputTokens || d.outputTokens) {
      sessionTokens.input  += d.inputTokens  || 0
      sessionTokens.output += d.outputTokens || 0
      sessionTokens.calls  += 1
      window._tokenUpdate && window._tokenUpdate({ ...sessionTokens })
    }
    const text = d.text ?? d.result ?? d.content ?? d.response ?? d.message ?? ''
    return typeof text === 'string' ? text : JSON.stringify(text)
  } catch (e) {
    console.error('[callAI error]', e)
    return ''
  }
}

export function parseAIJson(raw) {
  if (!raw) throw new Error('empty response')
  let s = String(raw)
  s = s.replace(/```json/gi, '').replace(/```/g, '').trim()
  let depth = 0, start = -1, end = -1
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '{') { if (depth === 0) start = i; depth++ }
    else if (s[i] === '}') { depth--; if (depth === 0) { end = i; break } }
  }
  if (start >= 0 && end > start) s = s.substring(start, end + 1)
  try { return JSON.parse(s) } catch (e1) {}
  try {
    const fixed = s.replace(/,([\s\n]*[}\]])/g, '$1')
    return JSON.parse(fixed)
  } catch (e2) {
    throw new Error('parse failed: ' + e2.message)
  }
}

// self-test
try {
  const _t = parseAIJson('{"ingredients":[{"role":"top"}],"notes":"ok"}')
  console.log('[parseAIJson self-test]', _t ? 'PASS' : 'FAIL')
} catch (e) {
  console.error('[parseAIJson self-test FAIL]', e.message)
}
