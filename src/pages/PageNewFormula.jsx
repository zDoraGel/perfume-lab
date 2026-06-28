import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { db } from '../lib/db'
import { callAI, parseAIJson } from '../lib/ai'
import { S } from '../constants/theme'
import { Btn, BackBtn } from '../components/ui'
import StockRecommendations from '../components/StockRecommendations'
import MaterialPicker from '../components/MaterialPicker'
import { FC } from '../constants/theme'

// ── Step indicator ────────────────────────────────────────────────────────────
function StepDot({ n, active, done }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
      <div style={{ width:28, height:28, borderRadius:'50%',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:11, fontWeight:700, fontFamily:'Inter,sans-serif',
        background: done ? S.green : active ? S.gold : S.border,
        color: done || active ? '#fff' : S.textLt,
        transition:'all .2s' }}>
        {done ? '✓' : n}
      </div>
    </div>
  )
}

function StepHeader({ step, title, sub, currentStep }) {
  const active = currentStep === step
  const done   = currentStep > step
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom: active ? 16 : 8,
      cursor: done ? 'default' : 'default', opacity: done ? 0.6 : 1 }}>
      <StepDot n={step} active={active} done={done}/>
      <div>
        <div style={{ fontSize: active ? 16 : 13, fontWeight:600,
          color: active ? S.ink : done ? S.textMid : S.textLt,
          fontFamily:'Inter,sans-serif', transition:'all .2s' }}>
          Step {step}: {title}
        </div>
        {active && sub && <div style={{ fontSize:11, color:S.textMid, marginTop:2 }}>{sub}</div>}
      </div>
    </div>
  )
}

// ── Tag picker ────────────────────────────────────────────────────────────────
function TagPicker({ options, selected, onToggle, max = 99 }) {
  return (
    <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
      {options.map(opt => {
        const val    = typeof opt === 'string' ? opt : opt.v
        const th     = typeof opt === 'string' ? null : opt.th
        const active  = selected.includes(val)
        const disabled = !active && selected.length >= max
        return (
          <button key={val} onClick={() => !disabled && onToggle(val)}
            style={{ padding:'6px 14px', borderRadius:20, cursor: disabled ? 'default' : 'pointer',
              fontFamily:'Inter,sans-serif', fontSize:12, fontWeight:500,
              border:`1.5px solid ${active ? S.gold : S.border}`,
              background: active ? S.gold : 'transparent',
              color: active ? '#fff' : disabled ? S.textLt : S.textMid,
              opacity: disabled ? 0.4 : 1, transition:'all .12s',
              textAlign:'center', lineHeight:1.3 }}>
            <div>{active ? '✓ ' : ''}{val}</div>
            {th && <div style={{ fontSize:9, opacity:.75, marginTop:1 }}>{th}</div>}
          </button>
        )
      })}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function PageNewFormula({ onBack, onCreate, initialVibe, initialPreferMats }) {
  const [step,          setStep]          = useState(1)
  const [materials,     setMaterials]     = useState([])

  // Step 1 — Person
  const [person,        setPerson]        = useState('')

  // Step 2 — Vibe
  const [vibeWords,     setVibeWords]     = useState([])
  const [vibeCustom,    setVibeCustom]    = useState(initialVibe || '')

  // Step 3 — DNA Details
  const [dnaProjection, setDnaProjection] = useState('')
  const [dnaTexture,    setDnaTexture]    = useState([])
  const [dnaTemp,       setDnaTemp]       = useState([])
  const [dnaFeeling,    setDnaFeeling]    = useState([])
  const [dnaOpening,    setDnaOpening]    = useState([])
  const [dnaBestFor,    setDnaBestFor]    = useState([])

  // Step 4 — NOT
  const [notWords,      setNotWords]      = useState([])
  const [notCustom,     setNotCustom]     = useState('')

  // Step 5 — Materials
  const [preferMats,    setPreferMats]    = useState(initialPreferMats || [])
  const [avoidMats,     setAvoidMats]     = useState([])
  const [matCustom,     setMatCustom]     = useState('')

  // Step 5 — Generate
  const [batchMl,       setBatchMl]       = useState('15')
  const [complexity,    setComplexity]    = useState('standard')
  const [formulaSugg,   setFormulaSugg]   = useState(null)
  const [formulaLoading,setFormulaLoading]= useState(false)
  const [selectedChoice,setSelectedChoice]= useState({})
  const [expandedIng,   setExpandedIng]   = useState(null)
  const [overrideGrams, setOverrideGrams] = useState({})
  const [overrideMl,    setOverrideMl]    = useState({})
  const [extraIngs,     setExtraIngs]     = useState([]) // manual add-on

  // Step 6 — Name
  const [name,          setName]          = useState('')
  const [formulaType,   setFormulaType]   = useState('original')
  const [nameMeaning,   setNameMeaning]   = useState('')
  const [nameSuggs,     setNameSuggs]     = useState([])
  const [nameLoading,   setNameLoading]   = useState(false)
  const [meaningLoading, setMeaningLoading] = useState(false)
  const [saving,        setSaving]        = useState(false)

  useEffect(() => { db.getMaterials().then(setMaterials) }, [])

  // ── Vibe options (categorized) ──────────────────────────────────────────────
  const VIBE_CATS = [
    {
      cat: 'Clean & Fresh', icon: '🤍', color: '#3d7a5a', bg: '#eef5f0',
      opts: [
        { v:'Clean Skin',          th:'ผิวสะอาดบริสุทธิ์' },
        { v:'Freshly Washed Hair', th:'ผมสดหลังสระ' },
        { v:'Skin Scent',          th:'กลิ่นผิว' },
        { v:'Your Skin But Better',th:'ผิวคุณแต่ดีกว่า' },
        { v:'Second Skin',         th:'เหมือนผิวจริง' },
        { v:'Healthy Skin',        th:'ผิวสุขภาพดี' },
        { v:'Well-Groomed Person', th:'คนดูแลตัวเองดี' },
        { v:'Soft Shampoo',        th:'แชมพูหอมละมุน' },
        { v:'Shower Fresh',        th:'หลังอาบน้ำสดชื่น' },
        { v:'Fresh Out of Bath',   th:'พึ่งออกจากห้องอาบน้ำ' },
        { v:'Fresh Towels',       th:'ผ้าขนหนูสะอาดสด' },
        { v:'Baby Soft',           th:'นุ่มแบบผิวเด็ก' },
      ]
    },
    {
      cat: 'Fabric & Linen', icon: '☁️', color: '#5a7a9a', bg: '#eef2f8',
      opts: [
        { v:'Fresh Linen',         th:'ผ้าปูที่นอนสะอาด' },
        { v:'Clean White Shirt',   th:'เสื้อขาวสะอาด' },
        { v:'Crisp Cotton',        th:'ผ้าฝ้ายกรอบสะอาด' },
        { v:'Silk Fabric',         th:'ผ้าไหมนุ่มลื่น' },
        { v:'Expensive Fabric',    th:'ผ้าแพง' },
        { v:'Soft Glow',           th:'แสงอ่อนๆ รอบตัว' },
        { v:'Hotel Sheets',        th:'ผ้าปูเตียงโรงแรม' },
        { v:'Sun-Dried Linen',     th:'ผ้าตากแดดสะอาด' },
        { v:'Fresh Laundry',       th:'ผ้าซักใหม่สะอาด' },
      ]
    },
    {
      cat: 'Luxury & Elegant', icon: '✦', color: '#8a6f3e', bg: '#f5f0e8',
      opts: [
        { v:'Quiet Luxury',        th:'หรูแบบเงียบๆ' },
        { v:'Luxury Skincare',     th:'สกินแคร์ราคาแพง' },
        { v:'Effortless Elegance', th:'หรูแบบไม่พยายาม' },
        { v:'Natural Elegance',    th:'งามแบบธรรมชาติ' },
        { v:'Modern Minimalism',   th:'มินิมอลทันสมัย' },
        { v:'Soft Aura',           th:'ออร่าอ่อนโยน' },
        { v:'Standing Close',      th:'ต้องเข้าใกล้ถึงได้กลิ่น' },
        { v:'Old Money',           th:'หรูแบบดั้งเดิม ไม่โอ้อวด' },
        { v:'Clean Girl',          th:'สาวสะอาดมินิมอล' },
        { v:'Rich Without Trying', th:'ดูแพงโดยไม่ต้องพยายาม' },
        { v:'Feminine Soft',       th:'อ่อนหวานแบบผู้หญิง' },
      ]
    },
    {
      cat: 'Musk & Woods', icon: '◎', color: '#6a5a8a', bg: '#f0eef8',
      opts: [
        { v:'Soft Musks',          th:'มัสก์นุ่ม' },
        { v:'Transparent Woods',   th:'ไม้โปร่งใส' },
        { v:'Sun-Warmed Skin',     th:'ผิวอุ่นแดดอ่อน' },
        { v:'Cashmere Skin',       th:'ผิวนุ่มแบบแคชเมียร์' },
        { v:'White Musks',         th:'มัสก์ขาวสะอาด' },
        { v:'Velvet Skin',         th:'ผิวนุ่มแบบกำมะหยี่' },
        { v:'Clean Woods',         th:'ไม้สะอาดโปร่ง' },
      ]
    },
    {
      cat: 'Nature & Air', icon: '🌿', color: '#4a7a3a', bg: '#edf5ea',
      opts: [
        { v:'Morning Dew',         th:'น้ำค้างเช้า' },
        { v:'After Rain',          th:'หลังฝนตก' },
        { v:'Cool Air',            th:'อากาศเย็นสดชื่น' },
        { v:'Fresh Air',           th:'อากาศบริสุทธิ์' },
        { v:'Urban Clean',         th:'ความสะอาดแบบเมือง' },
        { v:'Open Window',         th:'เปิดหน้าต่างรับลม' },
        { v:'Breeze Through Curtains', th:'ลมพัดผ่านม้วนผ้าม่าน' },
        { v:'Ocean Air',           th:'อากาศริมทะเล' },
        { v:'Mountain Air',        th:'อากาศบนภูเขา' },
      ]
    },
    {
      cat: 'Floral', icon: '🌸', color: '#8a3a68', bg: '#fceef7',
      opts: [
        { v:'Soft Floral',         th:'ดอกไม้นุ่ม' },
        { v:'Fresh Floral',        th:'ดอกไม้สดชื่น' },
        { v:'Airy Bloom',          th:'ดอกไม้โปร่งเบา' },
        { v:'White Garden',        th:'สวนดอกไม้ขาว' },
        { v:'Spring Petals',       th:'กลีบดอกฤดูใบไม้ผลิ' },
        { v:'Dewy Flowers',        th:'ดอกไม้เปียกน้ำค้าง' },
        { v:'Floral Skin',         th:'ดอกไม้บนผิว' },
        { v:'White Bouquet',       th:'ดอกไม้ขาวรวมช่อ' },
        { v:'Floating Petals',     th:'กลีบดอกลอยเบาๆ' },
        { v:'Sheer Flowers',       th:'ดอกไม้โปร่งแสง' },
      ]
    },
    {
      cat: 'Tea & Infusion', icon: '🍵', color: '#4a7a5a', bg: '#eef5f0',
      opts: [
        { v:'Soft Tea',            th:'ชาอ่อนโยน' },
        { v:'White Tea',           th:'ชาขาว' },
        { v:'Delicate Tea Leaves', th:'ใบชานุ่มละมุน' },
        { v:'Tea Steam',           th:'ไอน้ำชาร้อน' },
        { v:'Tea & Linen',         th:'ชาและผ้าสะอาด' },
        { v:'Airy Tea',            th:'ชาโปร่งเบา' },
        { v:'Elegant Tea',         th:'ชาสุภาพมีระดับ' },
        { v:'Clean Tea Accord',    th:'กลิ่นชาสะอาด' },
        { v:'Gentle Infusion',     th:'ชางนุ่มละมุน' },
        { v:'Whisper of Tea',      th:'กลิ่นชาแผ่วเบา' },
        { v:'Green Tea',           th:'ชาเขียวสด' },
        { v:'Matcha Veil',         th:'มัทฉะม่านบาง' },
        { v:'Tea Ceremony',        th:'พิธีชงชา' },
        { v:'Morning Tea',         th:'ชายามเช้า' },
      ]
    },
  ]
  // flat list for backward compat
  const VIBE_OPTS = VIBE_CATS.flatMap(c => c.opts)

  // ── Vibe combination name ────────────────────────────────────────────────────
  const VIBE_COMBO_NAMES = {
    'Clean Skin+Quiet Luxury':          'กลิ่นผิวที่หรูโดยไม่ต้องพยายาม',
    'Clean Skin+Soft Musks':            'ผิวสะอาดที่มีมิติจากมัสก์',
    'Fresh Linen+Quiet Luxury':         'ผ้าหรูที่สัมผัสได้ทางกลิ่น',
    'Soft Floral+Clean Skin':           'ดอกไม้บนผิวที่สะอาดบริสุทธิ์',
    'Soft Floral+Quiet Luxury':         'ดอกไม้หรูเบาๆ แบบ quiet luxury',
    'Airy Bloom+Fresh Linen':           'ดอกไม้โปร่งบนผ้าสะอาด',
    'Effortless Elegance+Skin Scent':   'ดูแพงแบบไม่รู้ตัว เหมือนกลิ่นตัว',
    'Morning Dew+Soft Floral':          'ดอกไม้เปียกน้ำค้างตอนเช้า',
    'Transparent Woods+Clean Skin':     'ไม้โปร่งใสบนผิวสะอาด',
  }

  function getComboName(vibes) {
    if (!vibes.length) return null
    const key = vibes.slice(0,2).sort().join('+')
    if (VIBE_COMBO_NAMES[key]) return VIBE_COMBO_NAMES[key]

    // นับ category ที่เลือก
    const cats = vibes.map(v =>
      VIBE_CATS.find(c => c.opts.some(o => o.v === v))?.cat
    ).filter(Boolean)
    const catCount = cats.reduce((acc,c) => { acc[c]=(acc[c]||0)+1; return acc }, {})
    const dominant = Object.entries(catCount).sort((a,b)=>b[1]-a[1])[0]?.[0]
    const uniqueCats = [...new Set(cats)]

    const singleMap = {
      'Clean & Fresh':    'ความสะอาดที่เป็นธรรมชาติ',
      'Fabric & Linen':   'กลิ่นผ้าสะอาดหรูหรา',
      'Luxury & Elegant': 'ความหรูหราที่ไม่ตะโกน',
      'Musk & Woods':     'มัสก์และไม้ที่นุ่มลึก',
      'Nature & Air':     'อากาศสดชื่นจากธรรมชาติ',
      'Floral':           'ดอกไม้อ่อนโยนที่ไม่หนัก',
    }

    // cross-category combos
    const crossMap = {
      'Clean & Fresh+Luxury & Elegant': 'ผิวสะอาดที่ดูหรูโดยไม่ต้องพยายาม',
      'Clean & Fresh+Floral':           'ดอกไม้เบาๆ บนผิวที่สะอาดบริสุทธิ์',
      'Clean & Fresh+Musk & Woods':     'มัสก์นุ่มที่เหมือนผิวดีเองตามธรรมชาติ',
      'Clean & Fresh+Fabric & Linen':   'ความสะอาดของผิวและผ้าที่เพิ่งซัก',
      'Luxury & Elegant+Floral':        'ดอกไม้หรูหราแบบ quiet luxury',
      'Luxury & Elegant+Musk & Woods':  'ความหรูหราที่แฝงด้วยไม้และมัสก์',
      'Fabric & Linen+Floral':          'ดอกไม้บนผ้าปูเตียงสะอาด',
      'Floral+Nature & Air':            'ดอกไม้ในอากาศบริสุทธิ์ยามเช้า',
      'Musk & Woods+Luxury & Elegant':  'ความหรูหราที่นุ่มลึกและแฝงมิติ',
    }

    if (uniqueCats.length >= 2) {
      const crossKey = uniqueCats.slice(0,2).sort().join('+')
      if (crossMap[crossKey]) return crossMap[crossKey]
    }

    // fallback จาก dominant category
    if (dominant && singleMap[dominant]) return singleMap[dominant]

    // last resort
    return vibes.slice(0,2).join(' · ')
  }

  // ── NOT options ─────────────────────────────────────────────────────────────
  const NOT_OPTS = [
    { v:'Laundry Detergent',    th:'ผงซักฟอก' },
    { v:'Masculine Cologne',    th:'กลิ่นผู้ชายจัด' },
    { v:'Sweet Candy',          th:'หวานลูกกวาด' },
    { v:'Gourmand',             th:'กลิ่นอาหาร/ขนม' },
    { v:'Heavy Floral',         th:'ดอกไม้หนักจัด' },
    { v:'Sharp Citrus',         th:'เปรี้ยวแหลม' },
    { v:'Metallic Fresh',       th:'สดแบบโลหะ' },
    { v:'Aquatic / Marine',     th:'ทะเล/น้ำ' },
    { v:'Smoky / Oud',          th:'ควัน/อู้ด' },
    { v:'Baby Powder',          th:'แป้งเด็ก' },
    { v:'Overly Perfumey',      th:'รู้เลยว่าใส่น้ำหอม' },
    { v:'Loud Projection',      th:'ฟุ้งแรงเกิน' },
    { v:'Synthetic',            th:'กลิ่นเคมีปลอม' },
    { v:'Bitter Tea',           th:'ชาขม/ฝาด' },
    { v:'Creamy / Milky',       th:'ครีม/นม' },
    { v:'Lotion-like',          th:'เหมือนโลชั่น' },
    { v:'Skincare Cream',       th:'กลิ่นครีมบำรุงผิว' },
    { v:'Powdery Floral',       th:'ดอกไม้แป้ง' },
    { v:'White Floral Dominant',th:'ดอกไม้ขาวครอบงำ' },
    { v:'Rice Milk',            th:'น้ำนมข้าว' },
    { v:'Spicy / Pepper',       th:'เผ็ดร้อน/พริกไทย' },
    { v:'Mossy / Earthy',       th:'ดินชื้น/มอส' },
    { v:'Tobacco',              th:'ยาสูบ' },
    { v:'Animalic',             th:'กลิ่นสัตว์' },
    { v:'Soapy Clean',          th:'สะอาดแบบสบู่จัด' },
    { v:'Over-sweetened',       th:'หวานเกินไป' },
    { v:'Too Sweet',            th:'หวานเกิน ไม่อยากใส่' },
    { v:'Too Masculine',        th:'ดูผู้ชายเกินไป' },
    { v:'Harsh Aquatic',        th:'ทะเลแรง/เคมี' },
    { v:'Overwhelming Musk',    th:'มัสก์หนักอึดอัด' },
    { v:'Sour / Fermented',     th:'เปรี้ยวหมัก' },
    { v:'Rubber / Plastic',     th:'ยาง/พลาสติก' },
    { v:'Incense Heavy',        th:'กำยานหนัก' },
    { v:'Aldehydic',            th:'โซปี้แบบวินเทจ' },
    { v:'Medicinal',            th:'กลิ่นยา' },
    { v:'Greasy / Fatty',       th:'มันเยิ้ม' },
    // Green
    { v:'Green Bitter',         th:'เขียวขม' },
    { v:'Crushed Leaves',       th:'ใบไม้บี้แตก' },
    { v:'Herbal',               th:'สมุนไพรจัด' },
    { v:'Vegetal',              th:'พืชผักดิบ' },
    // White Floral (แยกชัด)
    { v:'Indolic Jasmine',      th:'มะลิอินโดลิกแรง' },
    { v:'Tuberose',             th:'ดอกซ่อนกลิ่นจัด' },
    { v:'Orange Blossom Heavy', th:'ดอกส้มหนักจัด' },
    { v:'Screechy White Floral',th:'ดอกไม้ขาวแสบจมูก' },
    // Musk (เฉพาะแบบไม่ต้องการ)
    { v:'Laundry Musk',         th:'มัสก์ผงซักฟอก' },
    { v:'Detergent Musk',       th:'มัสก์น้ำยาซัก' },
    { v:'Cleaning Product',     th:'กลิ่นน้ำยาทำความสะอาด' },
    // Synthetic (เฉพาะ)
    { v:'Aroma Chemical Heavy', th:'เคมีหอมหนักจัด' },
    { v:'Molecule Heavy',       th:'โมเลกุลเดี่ยวหนัก' },
    { v:'Ambroxan Bomb',        th:'แอมบรอกซานจัดมาก' },
    { v:'Iso E Overdose',       th:'ไอโซอีเกินขนาด' },
    // Modern Clean Killer
    { v:'Aldehydes Heavy',      th:'อัลดีไฮด์จัด' },
    { v:'Calone Heavy',         th:'คาโลนจัด' },
    { v:'Metallic Notes',       th:'กลิ่นโลหะ' },
    { v:'Ozone Overdose',       th:'โอโซนเกินขนาด' },
    { v:'Green Notes Overdose', th:'กลิ่นเขียวเกินขนาด' },
  ]

  // ── Preferred material categories ──────────────────────────────────────────
  const PREFER_OPTS = [
    // Musk & Skin
    { v:'White Musk',          th:'มัสก์ขาวสะอาด' },
    { v:'Clean Musks',         th:'มัสก์สะอาด' },
    { v:'Skin Musk',           th:'มัสก์กลิ่นผิว' },
    { v:'Ambrette Seed',       th:'แอมเบรตซีด (มัสก์ธรรมชาติ)' },
    { v:'Habanolide',          th:'มัสก์แมคโครไซคลิก' },
    { v:'Galaxolide',          th:'มัสก์วงแหวน' },
    { v:'Cashmeran',           th:'แคชเมียร์นุ่ม' },
    { v:'Clean Urban Skin',    th:'มัสก์ผิวแบบเมือง' },
    // Wood & Amber
    { v:'Iso E Super',         th:'ไม้โปร่งใส พุ่ง' },
    { v:'Transparent Woods',   th:'ไม้โปร่งใส' },
    { v:'Sandalwood',          th:'ไม้จันทน์' },
    { v:'Ambroxan',            th:'แอมบร็อกซาน' },
    { v:'Amber',               th:'อำพัน' },
    { v:'Vetiver',             th:'เวทิเวอร์ (รากหญ้า)' },
    { v:'Patchouli',           th:'แพทชูลี' },
    { v:'Oud',                 th:'อู้ด' },
    { v:'Leather',             th:'หนัง' },
    // Resin & Incense
    { v:'Frankincense',        th:'กำยาน' },
    { v:'Labdanum',            th:'ลาบดานัม (อำพัน)' },
    { v:'Coumarin',            th:'คูมาริน (หวานหญ้าแห้ง)' },
    // Floral
    { v:'Hedione',             th:'เฮดิโอน (ดอกไม้เบา)' },
    { v:'Soft Peony',          th:'พีโอนี่อ่อนโยน' },
    { v:'Muguet',              th:'ลิลลี่ออฟเดอะวัลลี่' },
    { v:'Magnolia',            th:'แมกโนเลีย' },
    { v:'Neroli',              th:'ส้มดอกไม้' },
    { v:'Iris',                th:'ไอริส (แป้งหอม)' },
    { v:'Heliotrope',          th:'เฮลิโอโทรป (หวานแป้ง)' },
    // Citrus & Fresh
    { v:'Bergamot',            th:'เบอร์กามอต' },
    { v:'Petitgrain',          th:'ใบส้มสดสะอาด' },
    { v:'Lemon Verbena',       th:'มะนาวสมุนไพร' },
    // Tea & Green
    { v:'White Tea',           th:'ชาขาว' },
    { v:'Green Tea',           th:'ชาเขียวสด' },
    // Spice & Warmth
    { v:'Cardamom',            th:'กระวาน' },
    { v:'Black Pepper',        th:'พริกไทยดำ' },
    { v:'Ginger',              th:'ขิงสด' },
    { v:'Cinnamon',            th:'อบเชย' },
    // Sweet
    { v:'Vanilla',             th:'วานิลลา' },
    { v:'Tonka Bean',          th:'ตองก้าหวานครีม' },
    // Aquatic
    { v:'Sea Salt',            th:'เกลือทะเล' },
    // Fruity
    { v:'Pear',                th:'ลูกแพร์' },
    { v:'Apple',               th:'แอปเปิ้ลสด' },
    { v:'Peach',               th:'พีช' },
    // Accords
    { v:'Clean Musk',          th:'มัสก์สะอาด (accord)' },
    { v:'Tea Accord',          th:'แอคคอร์ดชา' },
    { v:'Clean Linen',         th:'ผ้าสะอาด (accord)' },
    { v:'Soft Floral',         th:'ดอกไม้นุ่ม (accord)' },
    { v:'Citrus Lift',         th:'ซิตรัสยกความสดชื่น' },
    // Tea (เพิ่มชนิด)
    { v:'Matcha',              th:'มัทฉะ' },
    { v:'Oolong',              th:'ชาอูหลง' },
    { v:'Black Tea',           th:'ชาดำ' },
    { v:'Earl Grey',           th:'ชาเอิร์ลเกรย์' },
    { v:'Mate',                th:'ชามาเต้' },
    // Fruits
    { v:'Fig',                 th:'มะเดื่อ' },
    { v:'Lychee',              th:'ลิ้นจี่' },
    { v:'Grapefruit',          th:'เกรปฟรุต' },
    { v:'Yuzu',                th:'ยูซุ' },
    { v:'Apricot',             th:'แอปริคอต' },
    // Woods (เพิ่ม)
    { v:'Cedarwood',           th:'ไม้ซีดาร์' },
    { v:'Hinoki',              th:'ไม้ฮิโนกิ' },
    { v:'Guaiac Wood',         th:'ไม้กวยแอค' },
    { v:'Driftwood',           th:'ไม้ลอยน้ำ' },
    // Air & Water
    { v:'Ozonic',              th:'โอโซนสดชื่น' },
    { v:'Aldehydes',           th:'อัลดีไฮด์เบา' },
    { v:'Rain Accord',         th:'แอคคอร์ดสายฝน' },
    { v:'Fresh Air Accord',    th:'แอคคอร์ดอากาศสด' },
    { v:'Mineral Accord',      th:'แอคคอร์ดแร่ธาตุ' },
    // Floral (เพิ่ม)
    { v:'Rose',                th:'กุหลาบ' },
    { v:'Osmanthus',           th:'หอมหมื่นลี้' },
    { v:'Freesia',             th:'ฟรีเซีย' },
    { v:'Violet',              th:'ไวโอเล็ต' },
    { v:'Lily',                th:'ลิลลี่' },
    // Bergamot Tea Family
    { v:'Orange Blossom',      th:'ดอกส้ม' },
    { v:'Lavender',            th:'ลาเวนเดอร์' },
    // Modern Clean (musk molecules)
    { v:'Helvetolide',         th:'มัสก์โมเลกุลนุ่ม' },
    { v:'Ethylene Brassylate', th:'มัสก์โมเลกุลกลม' },
    // Green
    { v:'Violet Leaf',         th:'ใบไวโอเล็ต' },
    { v:'Bamboo',              th:'ไผ่' },
    // Citrus
    { v:'Mandarin',            th:'แมนดาริน' },
    { v:'Lemon',               th:'เลมอน' },
    // White Floral (สำหรับ AI เรียนรู้ ไม่ใช่ preference)
    { v:'Jasmine',             th:'มะลิ' },
    { v:'Tuberose',            th:'ดอกซ่อนกลิ่น' },
  ]
  const AVOID_MAT_OPTS = [
    { v:'Heavy Ambroxan',       th:'แอมบร็อกซานหนัก' },
    { v:'Amberwood Overdose',   th:'แอมเบอร์วู้ดเกินขนาด' },
    { v:'Vanilla',              th:'วานิลลา' },
    { v:'Tonka',                th:'ตองก้า (หวานครีม)' },
    { v:'Patchouli',            th:'แพทชูลี (ดินเปียก)' },
    { v:'Leather',              th:'หนัง' },
    { v:'Oud',                  th:'อู้ด' },
    { v:'Labdanum',             th:'ลาบดานัม (อำพัน)' },
    { v:'Civet',                th:'ชะมด' },
    { v:'Costus',               th:'คอสตัส (ดินสาด)' },
    { v:'Caramel',              th:'คาราเมล' },
    { v:'Calone',               th:'คาโลน (ทะเลเคมี)' },
    { v:'Ylang Ylang',          th:'กระดังงา' },
    { v:'Rice Milk Overdose',   th:'น้ำนมข้าวเกินขนาด' },
    { v:'Creamy Notes',         th:'กลิ่นครีมทุกชนิด' },
    { v:'Milky Notes',          th:'กลิ่นนม' },
    // Green Overdose
    { v:'Violet Leaf',          th:'ใบไวโอเล็ต' },
    { v:'Galbanum',             th:'กัลบานัม (เขียวจัด)' },
    { v:'Green Notes Overdose', th:'กลิ่นเขียวเกินขนาด' },
    // White Floral Heavy
    { v:'Tuberose',             th:'ดอกซ่อนกลิ่น' },
    { v:'Indolic Jasmine',      th:'มะลิอินโดลิก' },
    { v:'Orange Blossom Heavy', th:'ดอกส้มหนักจัด' },
    // Metallic / Aldehydic
    { v:'Heavy Aldehydes',      th:'อัลดีไฮด์หนัก' },
    { v:'Metallic Notes',       th:'กลิ่นโลหะ' },
    // Spice
    { v:'Clove',                th:'กานพลู' },
    { v:'Nutmeg',               th:'จันทน์เทศ' },
    { v:'Cinnamon Overdose',    th:'อบเชยเกินขนาด' },
  ]

  // ── Build vibe string ───────────────────────────────────────────────────────
  function buildVibeString() {
    const all = [...vibeWords, ...(vibeCustom.trim() ? vibeCustom.split(',').map(v=>v.trim()).filter(Boolean) : [])]
    return all.join(', ')
  }

  // ── Vibe → Material mapping ─────────────────────────────────────────────────
  const VIBE_MAPPING = {
    'Clean Skin':          { role:'base',  mats:['White Musk','Galaxolide','Iso E Super','Ethylene Brassylate'], pct:50 },
    'Your Skin But Better':{ role:'base',  mats:['Iso E Super','Cashmeran','White Musk','Habanolide'],           pct:50 },
    'Skin Scent':          { role:'base',  mats:['Ambrette Seed','White Musk','Hedione','Iso E Super'],          pct:45 },
    'Second Skin':         { role:'base',  mats:['Cashmeran','Ambrette Seed','White Musk'],                      pct:45 },
    'Healthy Skin':        { role:'base',  mats:['White Musk','Hedione','Linalool'],                             pct:40 },
    'Freshly Washed Hair': { role:'heart', mats:['Linalool','Hedione','Apple','Freesia','Pear Blossom'],         pct:35 },
    'Soft Shampoo':        { role:'heart', mats:['Linalool','Lilial','Hedione','Floralozone'],                   pct:35 },
    'Fresh Linen':         { role:'base',  mats:['Galaxolide','Habanolide','Ambrettolide','White Musk'],         pct:45 },
    'Clean White Shirt':   { role:'base',  mats:['Galaxolide','Ethylene Brassylate','White Musk'],               pct:45 },
    'Crisp Cotton':        { role:'base',  mats:['Habanolide','Galaxolide','White Musk'],                        pct:40 },
    'Silk Fabric':         { role:'base',  mats:['Cashmeran','Iso E Super','White Musk'],                        pct:40 },
    'Expensive Fabric':    { role:'base',  mats:['Cashmeran','Ambroxan','Iso E Super'],                          pct:40 },
    'Quiet Luxury':        { role:'base',  mats:['Ambroxan','Iso E Super','Cashmeran','White Tea'],               pct:45 },
    'Effortless Elegance': { role:'base',  mats:['Ambroxan','Cashmeran','Sandalwood','White Musk'],              pct:45 },
    'Luxury Skincare':     { role:'base',  mats:['Iso E Super','Cashmeran','White Tea','Hedione'],               pct:40 },
    'Natural Elegance':    { role:'base',  mats:['Sandalwood','Cashmeran','White Musk'],                         pct:40 },
    'Modern Minimalism':   { role:'base',  mats:['Iso E Super','White Musk','Cashmeran'],                        pct:45 },
    'Soft Aura':           { role:'heart', mats:['Hedione','Linalool','White Musk'],                             pct:35 },
    'Soft Musks':          { role:'base',  mats:['Habanolide','Ambrettolide','Galaxolide','Cashmeran'],          pct:50 },
    'Transparent Woods':   { role:'base',  mats:['Iso E Super','Ambroxan','Cashmeran','Cedarwood'],              pct:45 },
    'Sun-Warmed Skin':     { role:'base',  mats:['Ambroxan','Sandalwood','White Musk'],                          pct:40 },
    'Standing Close':      { role:'base',  mats:['Ambrette Seed','White Musk','Hedione'],                        pct:50 },
    'Feminine Soft':       { role:'heart', mats:['Soft Peony','Hedione','White Musk'],                          pct:35 },
    'Morning Dew':         { role:'top',   mats:['Lemon','Bergamot','Petitgrain','Green Tea'],                   pct:20 },
    'After Rain':          { role:'top',   mats:['Geosmin','Calone','Petitgrain','Green Leaves'],                pct:20 },
    'Cool Air':            { role:'top',   mats:['Calone','Floralozone','Petitgrain','Lemon'],                   pct:20 },
    'Fresh Air':           { role:'top',   mats:['Calone','Linalool','Bergamot','Green Leaves'],                 pct:20 },
    'Urban Clean':         { role:'base',  mats:['Iso E Super','White Musk','Galaxolide','Petitgrain','Ambrette Seed'], pct:40 },
    'Soft Floral':         { role:'heart', mats:['Hedione','Pear Blossom','Linalool','Floralozone'],             pct:30 },
    'Airy Bloom':          { role:'heart', mats:['Hedione','Floralozone','Muguet','White Peony'],                pct:25 },
    'White Garden':        { role:'heart', mats:['Hedione','Muguet','White Peony','Linalool'],                   pct:30 },
    'Spring Petals':       { role:'top',   mats:['Pear Blossom','Apple','Freesia','Linalool'],                   pct:25 },
    'Dewy Flowers':        { role:'top',   mats:['Floralozone','Hedione','Linalool','Green Tea'],                pct:20 },
    'Fresh Floral':        { role:'heart', mats:['Hedione','Muguet','Linalool','Green Tea'],                    pct:30 },
    'Floral Skin':         { role:'heart', mats:['Hedione','White Musk','Linalool'],                             pct:30 },
    'Soft Glow':           { role:'heart', mats:['Hedione','Linalool','White Musk'],                             pct:30 },
  }

  // ── Build vibe context for AI ───────────────────────────────────────────────
  function buildVibeContext(vibes) {
    if (!vibes.length) return ''

    // นับ category weights
    const catCount = {}
    vibes.forEach(v => {
      const cat = VIBE_CATS.find(c => c.opts.some(o => o.v === v))?.cat || 'Other'
      catCount[cat] = (catCount[cat] || 0) + 1
    })

    // หา dominant category
    const sorted = Object.entries(catCount).sort((a,b) => b[1]-a[1])
    const dominant = sorted[0]?.[0]

    // role ratios จาก category
    const roleRules = {
      'Clean & Fresh':    { top:20, heart:30, base:50 },
      'Fabric & Linen':   { top:15, heart:25, base:60 },
      'Luxury & Elegant': { top:15, heart:30, base:55 },
      'Musk & Woods':     { top:15, heart:25, base:60 },
      'Nature & Air':     { top:30, heart:40, base:30 },
      'Floral':           { top:25, heart:45, base:30 },
    }

    // weighted average ratio
    const totalVibes = vibes.length
    let ratio = { top:0, heart:0, base:0 }
    vibes.forEach(v => {
      const cat = VIBE_CATS.find(c => c.opts.some(o => o.v === v))?.cat
      const r   = roleRules[cat] || { top:20, heart:35, base:45 }
      ratio.top   += r.top   / totalVibes
      ratio.heart += r.heart / totalVibes
      ratio.base  += r.base  / totalVibes
    })
    ratio = {
      top:   Math.round(ratio.top),
      heart: Math.round(ratio.heart),
      base:  Math.round(ratio.base),
    }

    // key materials จาก mapping
    const keyMats = [...new Set(
      vibes.flatMap(v => VIBE_MAPPING[v]?.mats || []).slice(0, 8)
    )]

    const lines = [
      '--- VIBE INTELLIGENCE ---',
      `Dominant category: ${dominant}`,
      `Target pyramid ratio: Top ${ratio.top}% / Heart ${ratio.heart}% / Base ${ratio.base}%`,
      `Key materials for this vibe: ${keyMats.join(', ')}`,
    ]

    // per-vibe role hints
    vibes.forEach(v => {
      const m = VIBE_MAPPING[v]
      if (m) lines.push(`"${v}" → ${m.role.toUpperCase()} note focus (${m.mats.slice(0,3).join(', ')})`)
    })

    // Floral + Clean contrast rule
    const hasFloral  = vibes.some(v => ['Soft Floral','Airy Bloom','White Garden','Spring Petals','Dewy Flowers','Floral Skin'].includes(v))
    const hasClean   = vibes.some(v => ['Clean Skin','Fresh Linen','Quiet Luxury','Skin Scent'].includes(v))
    if (hasFloral && hasClean) {
      lines.push('BALANCE RULE: Floral = Top/Heart only (max 25-30%), Clean Musk = Base anchor (min 40%)')
    }

    lines.push('--- END VIBE INTELLIGENCE ---')
    return lines.join('\n')
  }

  // ── Build compiled prompt ───────────────────────────────────────────────────
  function buildPrompt() {
    const lines = []

    if (person.trim()) {
      lines.push('THE PERSON WHO WEARS THIS:')
      lines.push(person.trim())
      lines.push('')
    }

    const vibe = buildVibeString()
    if (vibe) {
      lines.push('VIBE / EMOTIONAL DIRECTION:')
      lines.push(vibe)
      lines.push('')
    }

    // Vibe intelligence — mapping + ratio
    const vibeCtx = buildVibeContext(vibeWords)
    if (vibeCtx) {
      lines.push(vibeCtx)
      lines.push('')
    }

    const notAll = [...notWords, ...(notCustom.trim() ? notCustom.split(',').map(v=>v.trim()).filter(Boolean) : [])]
    if (notAll.length) {
      lines.push('THIS FRAGRANCE IS NOT:')
      notAll.forEach(n => lines.push(`- ${n}`))
      lines.push('')
    }

    if (preferMats.length) {
      lines.push('PREFERRED MATERIALS:')
      lines.push(preferMats.join(', '))
      lines.push('')
    }

    const avoidAll = [...avoidMats, ...(matCustom.trim() ? matCustom.split(',').map(v=>v.trim()).filter(Boolean) : [])]
    if (avoidAll.length) {
      lines.push('STRICTLY AVOID THESE MATERIALS:')
      lines.push(avoidAll.join(', '))
      lines.push('')
    }

    return lines.join('\n')
  }

  // ── Generate formula ────────────────────────────────────────────────────────
  async function genFormula() {
    setFormulaLoading(true); setFormulaSugg(null); setSelectedChoice({}); setExpandedIng(null); setExtraIngs([{matId:'',grams:'',ml:''}]); setOverrideGrams({}); setOverrideMl({})
    const inStockMats  = materials.filter(m => (m.stock || 0) > 0.1)
    const outStockMats = materials.filter(m => !((m.stock || 0) > 0.1))
    const inStockList  = inStockMats.map(m => m.name + ' (' + m.family + ', stock: ' + m.stock + 'g, evap: ' + (m.evaporation||'?') + ')').join(', ') || '(ไม่มี)'
    const outStockList = outStockMats.map(m => m.name + ' (' + m.family + ', evap: ' + (m.evaporation||'?') + ')').join(', ') || '(ไม่มี)'
    const compiledPrompt = buildPrompt()
    const cxPrompt = {
      simple:   'Formula complexity: simple — keep it minimal, 4-6 ingredients max, clean pyramid',
      standard: 'Formula complexity: standard — balanced pyramid, 6-10 ingredients',
      complex:  'Formula complexity: complex — rich layered niche structure, aim for 10-15 ingredients, add supporting notes for depth, diffusion, longevity and smooth transitions.',
    }[complexity]

    const sysPrompt = 'You are a world-class perfumer. Reply with RAW JSON only. No markdown. No backticks. No explanation. JSON format: {"ingredients":[{"role":"top","primary":{"name":"Bergamot","family":"Citrus","grams":0.5,"ml":0.6,"reason":"Thai 1 sentence"},"alternatives":[{"name":"Lemon","family":"Citrus","grams":0.4,"ml":0.5,"similarity":"Thai","note":"Thai"},{"name":"Lime","family":"Citrus","grams":0.5,"ml":0.6,"similarity":"Thai","note":"Thai"},{"name":"Grapefruit","family":"Citrus","grams":0.5,"ml":0.6,"similarity":"Thai","note":"Thai"},{"name":"Yuzu","family":"Citrus","grams":0.4,"ml":0.5,"similarity":"Thai","note":"Thai"},{"name":"Petitgrain","family":"Fresh","grams":0.5,"ml":0.6,"similarity":"Thai","note":"Thai"}]}],"notes":"Thai 2 sentences"}'

    const userPrompt = [
      compiledPrompt,
      cxPrompt,
      'Batch size: ' + batchMl + 'ml',
      '',
      '✅ MATERIALS ALREADY IN STOCK (use these FIRST — strongly preferred, no need to buy):',
      inStockList,
      '',
      '🛒 MATERIALS NOT IN STOCK (would require new purchase — use ONLY if no suitable in-stock material exists for that role):',
      outStockList,
      '',
      'Create a formula that EXACTLY matches the person and vibe description above.',
      'STRICTLY follow the Target pyramid ratio from VIBE INTELLIGENCE section.',
      'PRIORITY RULE: Build the formula primarily from "MATERIALS ALREADY IN STOCK". Only pick from "NOT IN STOCK" list when truly necessary for the vibe (e.g. a defining note that nothing in-stock can substitute) — and when you do, say so briefly in the Thai reason ("ต้องซื้อใหม่เพราะ...").',
      'For "alternatives" of each ingredient: list in-stock options BEFORE out-of-stock options whenever quality/relevance is comparable.',
      '5 alternatives per ingredient, ranked best to worst (in-stock first when comparable).',
      'Include grams AND ml for every option.',
      'Correct top/heart/base by evaporation rate.',
      '- ต้องมี Top note อย่างน้อย 1 ตัว',
      '- ต้องมี Heart note อย่างน้อย 2 ตัว',
      '- ต้องมี Base note อย่างน้อย 2 ตัว',
      'Reason in Thai 1 sentence.',
    ].join('\n')

    const r = await callAI(sysPrompt, userPrompt)
    try {
      let clean = r.replace(/^﻿/, '').replace(/```json\s*/gi, '').replace(/```/g, '').trim()
      const firstBrace = clean.indexOf('{')
      const lastBrace  = clean.lastIndexOf('}')
      if (firstBrace > 0) clean = clean.substring(firstBrace, lastBrace + 1)
      const p = parseAIJson(clean)
      if (!p.ingredients) throw new Error('no ingredients key')
      setFormulaSugg(p)
      setStep(7)
    } catch (e) {
      setFormulaSugg({ error: r || 'AI ไม่ตอบ — ลอง Generate ใหม่' })
    }
    setFormulaLoading(false)
  }

  // ── Gen name suggestions ────────────────────────────────────────────────────
  async function genNames() {
    setNameLoading(true); setNameSuggs([])
    const vibe = buildVibeString()
    const r = await callAI(
      'creative director น้ำหอมลักชัวรี่ ตอบ JSON เท่านั้น: {"names":[{"name":"...","meaning":"..."}]} 5 ชื่อ',
      `ชื่อน้ำหอมจาก vibe: "${vibe}" — สวย กระชับ English/French/ผสม แต่ละชื่อให้ความหมายเป็นภาษาไทย 1 ประโยค`
    )
    try { const p = JSON.parse(r.replace(/```json|```/g,'').trim()); setNameSuggs(p.names||[]) } catch {}
    setNameLoading(false)
  }

  async function genMeaning() {
    if (!name.trim()) return
    setMeaningLoading(true)
    const vibe = buildVibeString()
    const r = await callAI(
      'creative director น้ำหอมลักชัวรี่ ตอบเป็นข้อความล้วน ไม่ต้อง JSON ไม่ต้องมีคำนำหรือเครื่องหมายคำพูด',
      `ชื่อน้ำหอม "${name.trim()}" จาก vibe: "${vibe}" — เขียนความหมายของชื่อนี้เป็นภาษาไทย 1 ประโยคสั้นๆ ให้เชื่อมโยงกับ vibe ที่ให้มา`
    )
    const cleaned = r.replace(/```json|```/g,'').trim().replace(/^["']|["']$/g,'')
    setNameMeaning(cleaned)
    setMeaningLoading(false)
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function findInStock(ingName) {
    if (!ingName) return null
    const n = ingName.toLowerCase().trim()
    // 1. exact match
    const exact = materials.find(m => m.name.toLowerCase().trim() === n)
    if (exact) return exact
    // 2. material name fully contained in ingredient name
    const contained = materials.find(m => n.includes(m.name.toLowerCase().trim()))
    if (contained) return contained
    // 3. ingredient name fully contained in material name
    return materials.find(m => m.name.toLowerCase().trim().includes(n)) || null
  }

  function getChosenOption(ing) {
    const idx = selectedChoice[ing.primary?.name] || 0
    if (idx === 0) return { ...ing.primary, isAlt: false }
    return { ...ing.alternatives[idx - 1], isAlt: true }
  }

  // ── Save ────────────────────────────────────────────────────────────────────
  async function saveWithFormula() {
    if (!name.trim()) { alert('ใส่ชื่อสูตรก่อนนะคะ'); return }
    setSaving(true)
    const vibe = buildVibeString()
    const dna  = {
      complexity,
      avoid: JSON.stringify({ presets: notWords, custom: notCustom }),
      projection: dnaProjection,
      texture: dnaTexture.join(','),
      temperature: dnaTemp.join(','),
      feeling: dnaFeeling.join(','),
      opening_style: dnaOpening.join(','),
      best_for: dnaBestFor,
    }
    const f    = await db.createFormula(name, vibe, person, nameMeaning, dna)
    if (f) await supabase.from('formulas').update({ formula_type: formulaType }).eq('id', f.id)
    if (f && formulaSugg?.ingredients) {
      const matchedIngs = await Promise.all([
        ...formulaSugg.ingredients.map(async ing => {
          const chosen = getChosenOption(ing)
          let mat = findInStock(chosen.name)
          if (!mat) {
            mat = await db.createMaterial({
              name: chosen.name, family: chosen.family || 'Other', stock: 0,
              evaporation: ing.role === 'top' ? 'Top' : ing.role === 'heart' ? 'Heart' : 'Base',
            })
          }
          return mat ? {
            materialId: mat.id,
            grams: parseFloat(overrideGrams[chosen.name] ?? chosen.grams),
            ml: overrideMl[chosen.name] ? parseFloat(overrideMl[chosen.name]) : (chosen.ml || null),
            family: mat.family || ''
          } : null
        }),
        ...extraIngs.filter(e => e.matId && e.grams).map(async e => {
          const mat = materials.find(m => m.id === parseInt(e.matId))
          return mat ? { materialId: mat.id, grams: parseFloat(e.grams), ml: e.ml ? parseFloat(e.ml) : null, family: mat.family || '' } : null
        }),
      ])
      const validIngs = matchedIngs.filter(Boolean)
      if (validIngs.length > 0) {
        const v = await db.createVersion(f.id, 1, 'Pending', null,
          'AI แนะนำสูตรเริ่มต้น batch ' + batchMl + 'ml — ' + (formulaSugg.notes || ''),
          new Date().toISOString().slice(0,10), parseInt(batchMl))
        await db.createItems(v.id, validIngs)
      }
    }
    setSaving(false)
    if (f) onCreate(f)
  }

  async function saveBasic() {
    if (!name.trim()) { alert('ใส่ชื่อสูตรก่อนนะคะ'); return }
    setSaving(true)
    const vibe = buildVibeString()
    const dna  = {
      complexity,
      avoid: JSON.stringify({ presets: notWords, custom: notCustom }),
      projection: dnaProjection,
      texture: dnaTexture.join(','),
      temperature: dnaTemp.join(','),
      feeling: dnaFeeling.join(','),
      opening_style: dnaOpening.join(','),
      best_for: dnaBestFor,
    }
    const f    = await db.createFormula(name, vibe, person, nameMeaning, dna)
    if (f) await supabase.from('formulas').update({ formula_type: formulaType }).eq('id', f.id)
    setSaving(false)
    if (f) onCreate(f)
  }

  const roleColors = { top: S.green, heart: '#8a3a68', base: '#7a5c2e' }
  const iStyle = { width:'100%', padding:'12px 14px', borderRadius:10, fontSize:14,
    fontFamily:'Inter,sans-serif', color:S.ink, background:S.white,
    border:`1px solid ${S.border}`, outline:'none', boxSizing:'border-box' }

  return (
    <div>
      <BackBtn onClick={() => step > 1 ? setStep(step - 1) : onBack()}/>
      <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:28, color:S.ink,
        fontStyle:'italic', marginBottom:24 }}>New Formula</div>

      {/* ── Step 1: Define Person ── */}
      <div style={{ marginBottom:20 }}>
        <StepHeader step={1} title="Define Person" currentStep={step}
          sub="คนที่จะใส่กลิ่นนี้เป็นใคร — ยังไม่ต้องตั้งชื่อ"/>
        {step === 1 && (
          <div>
            <textarea value={person} onChange={e => setPerson(e.target.value)}
              placeholder={'เช่น:\nA well-groomed person who naturally smells clean.\nFreshly washed hair. Healthy skin.\nPeople often compliment how good they smell.\nThe scent feels like part of them, not something sprayed on top.'}
              rows={5} style={{ ...iStyle, resize:'none', marginBottom:12, lineHeight:1.7 }}/>
            <Btn onClick={() => setStep(2)} disabled={!person.trim()} style={{ width:'100%' }}>
              ถัดไป →
            </Btn>
          </div>
        )}
        {step > 1 && person && (
          <div style={{ fontSize:12, color:S.textMid, padding:'8px 12px',
            background:S.bg, borderRadius:8, marginBottom:4, lineHeight:1.7 }}>
            {person.slice(0,80)}{person.length>80?'...':''}
            <button onClick={() => setStep(1)} style={{ marginLeft:8, fontSize:10,
              color:S.gold, background:'none', border:'none', cursor:'pointer' }}>แก้ไข</button>
          </div>
        )}
      </div>

      {/* ── Step 2: Define Vibe ── */}
      {step >= 2 && (
        <div style={{ marginBottom:20 }}>
          <StepHeader step={2} title="Define Vibe" currentStep={step}
            sub="กลิ่นนี้ให้ความรู้สึกอะไร — เลือกได้หลายอย่าง"/>
          {step === 2 && (
            <div>
              {/* Categorized vibe chips */}
              {VIBE_CATS.map(cat => (
                <div key={cat.cat} style={{ marginBottom:12 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:7 }}>
                    <span style={{ fontSize:13 }}>{cat.icon}</span>
                    <span style={{ fontSize:10, fontWeight:700, color:cat.color,
                      letterSpacing:.8, textTransform:'uppercase',
                      fontFamily:'Inter,sans-serif' }}>{cat.cat}</span>
                  </div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
                    {cat.opts.map(opt => {
                      const active = vibeWords.includes(opt.v)
                      return (
                        <button key={opt.v}
                          onClick={() => setVibeWords(p => p.includes(opt.v) ? p.filter(x=>x!==opt.v) : [...p, opt.v])}
                          style={{ padding:'5px 12px', borderRadius:20, cursor:'pointer',
                            fontFamily:'Inter,sans-serif', fontSize:11, fontWeight: active?600:400,
                            border:`1.5px solid ${active ? cat.color : S.border}`,
                            background: active ? cat.bg : 'transparent',
                            color: active ? cat.color : S.textMid,
                            textAlign:'center', lineHeight:1.3, transition:'all .1s' }}>
                          <div>{active ? '✓ ' : ''}{opt.v}</div>
                          <div style={{ fontSize:9, opacity:.7, marginTop:1 }}>{opt.th}</div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}

              {/* Smart custom input */}
              <div style={{ marginTop:4, marginBottom:12 }}>
                <input value={vibeCustom} onChange={e => setVibeCustom(e.target.value)}
                  placeholder="พิมพ์เองได้ เช่น 'เดินเล่นในสวนตอนฝนเพิ่งตก' หรือ 'Spa Morning, Green Leaves'"
                  style={{ ...iStyle, fontSize:12 }}/>
                <div style={{ fontSize:10, color:S.textLt, marginTop:4 }}>
                  💡 พิมพ์เป็นภาษาธรรมชาติได้ — AI จะแปลให้เป็นกลิ่นอัตโนมัติ
                </div>
              </div>

              {/* Vibe combination name */}
              {vibeWords.length > 0 && (() => {
                const combo = getComboName(vibeWords)
                return (
                  <div style={{ padding:'10px 14px', borderRadius:10, marginBottom:12,
                    background:S.goldLt, border:`1px solid ${S.goldBd}` }}>
                    <div style={{ fontSize:9, color:S.gold, fontWeight:700,
                      letterSpacing:.8, textTransform:'uppercase',
                      fontFamily:'Inter,sans-serif', marginBottom:4 }}>
                      ✦ คุณกำลังสร้างกลิ่น
                    </div>
                    <div style={{ fontSize:13, color:S.ink,
                      fontFamily:'Cormorant Garamond,serif', fontStyle:'italic' }}>
                      {combo || vibeWords.slice(0,3).join(' · ')}
                    </div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginTop:6 }}>
                      {vibeWords.map(v => (
                        <span key={v} style={{ fontSize:10, color:S.gold,
                          background:S.white, padding:'2px 8px', borderRadius:20,
                          border:`1px solid ${S.goldBd}` }}>{v}</span>
                      ))}
                    </div>
                  </div>
                )
              })()}

              <Btn onClick={() => setStep(3)}
                disabled={!vibeWords.length && !vibeCustom.trim()}
                style={{ width:'100%' }}>
                ถัดไป →
              </Btn>
            </div>
          )}
          {step > 2 && (
            <div style={{ fontSize:12, color:S.textMid, padding:'8px 12px',
              background:S.bg, borderRadius:8, marginBottom:4 }}>
              {(() => {
                const combo = getComboName(vibeWords)
                return combo || buildVibeString().slice(0,80)
              })()}
              <button onClick={() => setStep(2)} style={{ marginLeft:8, fontSize:10,
                color:S.gold, background:'none', border:'none', cursor:'pointer' }}>แก้ไข</button>
            </div>
          )}
        </div>
      )}

      {/* ── Step 3: DNA Details ── */}
      {step >= 3 && (
        <div style={{ marginBottom:20 }}>
          <StepHeader step={3} title="DNA Details" currentStep={step}
            sub="กำหนด character ของกลิ่น — ข้ามได้ถ้ายังไม่แน่ใจ"/>
          {step === 3 && (
            <div>
              {/* PROJECTION */}
              <div style={{ fontSize:11, fontWeight:700, color:S.textMid, letterSpacing:.8,
                textTransform:'uppercase', marginBottom:8, fontFamily:'Inter,sans-serif' }}>
                PROJECTION <span style={{ fontWeight:400, textTransform:'none', letterSpacing:0 }}>กระจายกลิ่นแค่ไหน</span>
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:16 }}>
                {[
                  { v:'Whisper',   label:'Skin Scent',     th:'Skin close — ใกล้ตัวเองเข้าใกล' },
                  { v:'Aura',      label:'Personal Space', th:'Moderate — personal space ~1 เมตร' },
                  { v:'Presence',  label:'Room Presence',  th:'Strong — ได้กลิ่นทั่วห้อง' },
                  { v:'Signature', label:'Statement',      th:'Beast mode — ได้กลิ่นก่อนเข้าห้อง' },
                ].map(opt => (
                  <button key={opt.v} onClick={() => setDnaProjection(p => p === opt.v ? '' : opt.v)}
                    style={{ padding:'8px 14px', borderRadius:10, cursor:'pointer',
                      border:`1.5px solid ${dnaProjection === opt.v ? S.gold : S.border}`,
                      background: dnaProjection === opt.v ? S.goldLt : 'transparent',
                      textAlign:'left', minWidth:140 }}>
                    <div style={{ fontSize:12, fontWeight:600, color: dnaProjection === opt.v ? S.gold : S.ink }}>
                      {dnaProjection === opt.v ? '◈ ' : '○ '}{opt.label}
                    </div>
                    <div style={{ fontSize:10, color:S.textMid, marginTop:2 }}>{opt.th}</div>
                  </button>
                ))}
              </div>

              {/* TEXTURE */}
              <div style={{ fontSize:11, fontWeight:700, color:S.textMid, letterSpacing:.8,
                textTransform:'uppercase', marginBottom:8, fontFamily:'Inter,sans-serif' }}>
                TEXTURE <span style={{ fontWeight:400, textTransform:'none', letterSpacing:0 }}>เนื้อกลิ่น · เลือกได้ถึง 3</span>
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:16 }}>
                {['Powdery','Creamy','Watery','Dry','Resinous','Fizzy','Velvety','Airy','Silky','Smoky','Earthy','Mossy'].map(v => (
                  <button key={v} onClick={() => setDnaTexture(p => p.includes(v) ? p.filter(x=>x!==v) : p.length < 3 ? [...p,v] : p)}
                    style={{ padding:'6px 14px', borderRadius:20, cursor:'pointer', fontSize:12,
                      border:`1.5px solid ${dnaTexture.includes(v) ? S.gold : S.border}`,
                      background: dnaTexture.includes(v) ? S.goldLt : 'transparent',
                      color: dnaTexture.includes(v) ? S.gold : S.textMid, fontWeight: dnaTexture.includes(v) ? 600 : 400 }}>
                    {v}
                  </button>
                ))}
              </div>

              {/* TEMPERATURE */}
              <div style={{ fontSize:11, fontWeight:700, color:S.textMid, letterSpacing:.8,
                textTransform:'uppercase', marginBottom:8, fontFamily:'Inter,sans-serif' }}>
                TEMPERATURE <span style={{ fontWeight:400, textTransform:'none', letterSpacing:0 }}>อุณหภูมิกลิ่น · เลือกได้ 2</span>
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:16 }}>
                {[
                  { v:'Icy', th:'เย็นจัด' }, { v:'Cool', th:'เย็นสบาย' },
                  { v:'Neutral', th:'กลางๆ' }, { v:'Warm', th:'อบอุ่น' }, { v:'Hot', th:'ร้อน' },
                ].map(opt => (
                  <button key={opt.v} onClick={() => setDnaTemp(p => p.includes(opt.v) ? p.filter(x=>x!==opt.v) : p.length < 2 ? [...p,opt.v] : p)}
                    style={{ padding:'6px 14px', borderRadius:20, cursor:'pointer', fontSize:12,
                      border:`1.5px solid ${dnaTemp.includes(opt.v) ? S.gold : S.border}`,
                      background: dnaTemp.includes(opt.v) ? S.goldLt : 'transparent',
                      color: dnaTemp.includes(opt.v) ? S.gold : S.textMid, fontWeight: dnaTemp.includes(opt.v) ? 600 : 400 }}>
                    <div>{opt.v}</div>
                    <div style={{ fontSize:9, opacity:.7 }}>{opt.th}</div>
                  </button>
                ))}
              </div>

              {/* FEELING */}
              <div style={{ fontSize:11, fontWeight:700, color:S.textMid, letterSpacing:.8,
                textTransform:'uppercase', marginBottom:8, fontFamily:'Inter,sans-serif' }}>
                FEELING <span style={{ fontWeight:400, textTransform:'none', letterSpacing:0 }}>ความรู้สึก · เลือกได้ถึง 6</span>
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:7, marginBottom:16 }}>
                {['สะอาดแบบเนียบๆ','ดูแพงแบบไม่พยายาม','น่าเข้าใกล้','อบอุ่น','นุ่มละมุน','สบายใจ',
                  'ผ่อนคลาย','โรแมนติกเบาๆ','มีเสน่ห์แบบธรรมชาติ','หรูหราแบบมินิมอล','โปร่งสบาย',
                  'ดูเรียบร้อยสะอาด','ดูโตแบบทันสมัย','ลึกลับนิดๆ','เซ็กซี่เบาๆ','สดใส','ดูมั่นใจ',
                  'ดูอ่อนโยน','ดู calm','ดู sophisticated','ดู cozy',
                  'หอมเหมือนผิวจริง','สะอาดเหมือนผ้าพึ่งซัก','ละมุนแบบเกาหลี',
                  'luxury แบบ quiet','หอมแบบคนดูแลตัวเอง','น่ากอด',
                  'หวานอ่อนๆ','ดูเป็นผู้ใหญ่','ดูเป็นธรรมชาติ','อบอวลแบบ cozy','ดู artsy','กลิ่นผิวแท้ๆ'].map(v => (
                  <button key={v} onClick={() => setDnaFeeling(p => p.includes(v) ? p.filter(x=>x!==v) : p.length < 6 ? [...p,v] : p)}
                    style={{ padding:'5px 11px', borderRadius:20, cursor:'pointer', fontSize:11,
                      border:`1.5px solid ${dnaFeeling.includes(v) ? S.gold : S.border}`,
                      background: dnaFeeling.includes(v) ? S.goldLt : 'transparent',
                      color: dnaFeeling.includes(v) ? S.gold : S.textMid, fontWeight: dnaFeeling.includes(v) ? 600 : 400 }}>
                    {v}
                  </button>
                ))}
              </div>

              {/* OPENING STYLE */}
              <div style={{ fontSize:11, fontWeight:700, color:S.textMid, letterSpacing:.8,
                textTransform:'uppercase', marginBottom:8, fontFamily:'Inter,sans-serif' }}>
                OPENING STYLE <span style={{ fontWeight:400, textTransform:'none', letterSpacing:0 }}>กลิ่นเปิดตัว · เลือกได้ 2</span>
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:16 }}>
                {[
                  { v:'Soft', th:'เปิดเบาๆ ค่อยๆ ออกมา' },
                  { v:'Burst', th:'พุ่งออกมาแรงตั้งแต่แรก' },
                  { v:'Slow Bloom', th:'ค่อยๆ บาน ดีขึ้นเรื่อยๆ' },
                  { v:'Sharp', th:'คมชัด แทงจมูก' },
                  { v:'Diffused', th:'กระจายเบาๆ รอบตัว' },
                  { v:'Quiet', th:'เรียบนิ่ง ค่อยๆ ปรากฏ' },
                  { v:'Skin Close', th:'แนบผิว ใกล้ชิด' },
                  { v:'Glow', th:'ฟุ้งเรืองๆ อบอุ่น' },
                  { v:'Clean Lift', th:'สะอาด ยกขึ้นเบาๆ' },
                  { v:'Watery', th:'เหมือนน้ำไหล เบาใส' },
                  { v:'Powdery Open', th:'เปิดด้วยแป้งอ่อนๆ' },
                  { v:'Citrus Pop', th:'เปรี้ยวพุ่งสดชื่น' },
                  { v:'Warm Embrace', th:'อบอุ่นโอบรอบตัว' },
                ].map(opt => (
                  <button key={opt.v} onClick={() => setDnaOpening(p => p.includes(opt.v) ? p.filter(x=>x!==opt.v) : p.length < 2 ? [...p,opt.v] : p)}
                    style={{ padding:'6px 14px', borderRadius:10, cursor:'pointer',
                      border:`1.5px solid ${dnaOpening.includes(opt.v) ? S.gold : S.border}`,
                      background: dnaOpening.includes(opt.v) ? S.goldLt : 'transparent',
                      textAlign:'left' }}>
                    <div style={{ fontSize:12, fontWeight: dnaOpening.includes(opt.v) ? 600 : 400,
                      color: dnaOpening.includes(opt.v) ? S.gold : S.ink }}>{opt.v}</div>
                    <div style={{ fontSize:9, color:S.textMid, marginTop:1 }}>{opt.th}</div>
                  </button>
                ))}
              </div>

              {/* BEST FOR */}
              <div style={{ fontSize:11, fontWeight:700, color:S.textMid, letterSpacing:.8,
                textTransform:'uppercase', marginBottom:8, fontFamily:'Inter,sans-serif' }}>
                BEST FOR <span style={{ fontWeight:400, textTransform:'none', letterSpacing:0 }}>เหมาะกับโอกาสไหน</span>
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:7, marginBottom:16 }}>
                {['Daily Wear','Office Day','Work from Home','Meeting / Presentation',
                  'Casual Date','First Date','Romantic Date','Evening Out','Night Out',
                  'Weekend Brunch','Beach Day','Travel','Study Session','Lazy Sunday',
                  'Self Care Day','Meditation / Yoga','Gym / Active','Bedtime / Sleep',
                  'Spring & Summer','Fall & Winter','Hot & Humid Weather','Rainy Season','Cool Season',
                  'Skin Scent Lover','Minimalist','Quiet Luxury','Gift',
                  'After Shower','Clean Girl Aesthetic','Effortless Chic',
                  'The One Who Smells Amazing','Signature Scent',
                  'Wedding Guest','Date Night In','Everyday Luxury','Just Because'].map(v => (
                  <button key={v} onClick={() => setDnaBestFor(p => p.includes(v) ? p.filter(x=>x!==v) : [...p,v])}
                    style={{ padding:'5px 12px', borderRadius:20, cursor:'pointer', fontSize:11,
                      border:`1.5px solid ${dnaBestFor.includes(v) ? S.gold : S.border}`,
                      background: dnaBestFor.includes(v) ? S.goldLt : 'transparent',
                      color: dnaBestFor.includes(v) ? S.gold : S.textMid,
                      fontWeight: dnaBestFor.includes(v) ? 600 : 400 }}>
                    {dnaBestFor.includes(v) ? '✓ ' : ''}{v}
                  </button>
                ))}
              </div>

              <div style={{ display:'flex', gap:8 }}>
                <Btn variant="outline" onClick={() => setStep(4)} style={{ flex:1 }}>
                  ข้าม →
                </Btn>
                <Btn onClick={() => setStep(4)} style={{ flex:2 }}>
                  ถัดไป →
                </Btn>
              </div>
            </div>
          )}
          {step > 3 && (
            <div style={{ fontSize:12, color:S.textMid, padding:'8px 12px',
              background:S.bg, borderRadius:8, marginBottom:4 }}>
              {[dnaProjection, ...dnaTexture, ...dnaTemp].filter(Boolean).join(' · ').slice(0,80) || 'ไม่ได้ระบุ'}
              <button onClick={() => setStep(3)} style={{ marginLeft:8, fontSize:10,
                color:S.gold, background:'none', border:'none', cursor:'pointer' }}>แก้ไข</button>
            </div>
          )}
        </div>
      )}

      {/* ── Step 4: Define NOT ── */}
      {step >= 4 && (
        <div style={{ marginBottom:20 }}>
          <StepHeader step={4} title="Define What It Is NOT" currentStep={step}
            sub="อันนี้สำคัญมาก — กลิ่นนี้ต้องไม่เป็นอะไร"/>
          {step === 4 && (
            <div>
              <TagPicker options={NOT_OPTS} selected={notWords}
                onToggle={v => setNotWords(p => p.includes(v) ? p.filter(x=>x!==v) : [...p,v])}/>
              <input value={notCustom} onChange={e => setNotCustom(e.target.value)}
                placeholder="เพิ่มเองได้ เช่น 'Not Another 13 clone, Not powdery' (คั่นด้วย ,)"
                style={{ ...iStyle, marginTop:10, marginBottom:12, fontSize:12 }}/>
              <Btn onClick={() => setStep(5)}
                style={{ width:'100%' }}>
                ถัดไป →
              </Btn>
            </div>
          )}
          {step > 4 && (
            <div style={{ fontSize:12, color:S.textMid, padding:'8px 12px',
              background:S.bg, borderRadius:8, marginBottom:4 }}>
              {notWords.length ? notWords.join(', ').slice(0,80) : 'ไม่ได้ระบุ'}
              <button onClick={() => setStep(4)} style={{ marginLeft:8, fontSize:10,
                color:S.gold, background:'none', border:'none', cursor:'pointer' }}>แก้ไข</button>
            </div>
          )}
        </div>
      )}

      {/* ── Step 5: Define Materials ── */}
      {step >= 5 && (
        <div style={{ marginBottom:20 }}>
          <StepHeader step={5} title="Define Materials" currentStep={step}
            sub="ตรงนี้ AI จะเริ่มเข้าใจว่าควรเลือกอะไร"/>
          {step === 5 && (
            <div>
              <div style={{ fontSize:11, fontWeight:600, color:S.green, letterSpacing:.8,
                textTransform:'uppercase', marginBottom:8 }}>Preferred Materials</div>
              <TagPicker options={PREFER_OPTS} selected={preferMats}
                onToggle={v => setPreferMats(p => p.includes(v) ? p.filter(x=>x!==v) : [...p,v])}/>

              <div style={{ fontSize:11, fontWeight:600, color:S.red, letterSpacing:.8,
                textTransform:'uppercase', margin:'14px 0 8px' }}>Avoid Materials</div>
              <TagPicker options={AVOID_MAT_OPTS} selected={avoidMats}
                onToggle={v => setAvoidMats(p => p.includes(v) ? p.filter(x=>x!==v) : [...p,v])}/>

              <input value={matCustom} onChange={e => setMatCustom(e.target.value)}
                placeholder="Avoid เพิ่มเติม เช่น 'Iso E Super, Ambroxan' (คั่นด้วย ,)"
                style={{ ...iStyle, marginTop:10, marginBottom:12, fontSize:12 }}/>
              <Btn onClick={() => setStep(6)} style={{ width:'100%' }}>
                ถัดไป →
              </Btn>
            </div>
          )}
          {step > 5 && (
            <div style={{ fontSize:12, color:S.textMid, padding:'8px 12px',
              background:S.bg, borderRadius:8, marginBottom:4 }}>
              {preferMats.length ? `Preferred: ${preferMats.join(', ').slice(0,50)}` : 'ไม่ได้ระบุ preferred'}
              <button onClick={() => setStep(5)} style={{ marginLeft:8, fontSize:10,
                color:S.gold, background:'none', border:'none', cursor:'pointer' }}>แก้ไข</button>
            </div>
          )}
        </div>
      )}

      {/* ── Step 6: Generate ── */}
      {step >= 6 && (
        <div style={{ marginBottom:20 }}>
          <StepHeader step={6} title="Generate Formula" currentStep={step}
            sub="ค่อยกด — AI จะ compile ทุกอย่างที่กรอกมาเป็นสูตร"/>
          {step >= 6 && (
            <div>
              {/* Complexity */}
              <div style={{ fontSize:11, color:S.textMid, fontWeight:500,
                textTransform:'uppercase', letterSpacing:.5, marginBottom:8 }}>Complexity</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:12 }}>
                {[
                  { v:'simple',   l:'Simple',   d:'4–6 ตัว',   s:'Clean & Minimal' },
                  { v:'standard', l:'Standard', d:'6–10 ตัว',  s:'Balanced' },
                  { v:'complex',  l:'Complex',  d:'10–15 ตัว', s:'Rich & Layered' },
                ].map(cx => (
                  <button key={cx.v} onClick={() => setComplexity(cx.v)}
                    style={{ padding:'10px 6px', borderRadius:10, cursor:'pointer', textAlign:'center',
                      border:`2px solid ${complexity===cx.v ? S.gold : S.border}`,
                      background: complexity===cx.v ? S.goldLt : S.white }}>
                    <div style={{ fontSize:12, fontWeight:600,
                      color: complexity===cx.v ? S.gold : S.ink, marginBottom:2 }}>{cx.l}</div>
                    <div style={{ fontSize:10, color:S.textMid }}>{cx.s}</div>
                    <div style={{ fontSize:11, fontWeight:600,
                      color: complexity===cx.v ? S.gold : S.textLt }}>{cx.d}</div>
                  </button>
                ))}
              </div>

              {/* Batch */}
              <div style={{ fontSize:11, color:S.textMid, fontWeight:500,
                textTransform:'uppercase', letterSpacing:.5, marginBottom:8 }}>Batch Size</div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:16 }}>
                {[5,10,15,30,50,100].map(ml => (
                  <button key={ml} onClick={() => setBatchMl(String(ml))}
                    style={{ padding:'7px 15px', borderRadius:20, cursor:'pointer',
                      fontFamily:'Inter,sans-serif', fontSize:13, fontWeight:500,
                      border:`1.5px solid ${batchMl===String(ml)?S.gold:S.goldBd}`,
                      background: batchMl===String(ml)?S.gold:'transparent',
                      color: batchMl===String(ml)?'#fff':S.gold }}>
                    {ml}ml
                  </button>
                ))}
              </div>

              <StockRecommendations vibe={buildVibeString()} materials={materials} compact={true}/>

              <Btn onClick={genFormula} disabled={formulaLoading} style={{ width:'100%' }}>
                {formulaLoading ? '✦ กำลังสร้างสูตร...' : formulaSugg ? '↻ Generate ใหม่' : '✦ Generate Formula'}
              </Btn>

              {/* Result */}
              {formulaSugg && !formulaSugg.error && formulaSugg.ingredients && (
                <div style={{ marginTop:16 }}>
                  <div style={{ fontSize:11, color:S.textMid, marginBottom:12,
                    textAlign:'center', letterSpacing:.3 }}>
                    แตะ ingredient เพื่อดู/สลับตัวเลือก
                  </div>
                  {['top','heart','base'].map(role => {
                    const ings = formulaSugg.ingredients.filter(i => i.role === role)
                    if (!ings.length) return null
                    const rc = roleColors[role]
                    return (
                      <div key={role} style={{ marginBottom:16 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                          <div style={{ height:1, flex:1, background:rc+'33' }}/>
                          <span style={{ fontSize:9, fontWeight:700, color:rc, letterSpacing:2, textTransform:'uppercase' }}>{role} Note</span>
                          <div style={{ height:1, flex:1, background:rc+'33' }}/>
                        </div>
                        {ings.map((ing, ingIdx) => {
                          const chosen  = getChosenOption(ing)
                          const inStock = findInStock(chosen.name)
                          const isOpen  = expandedIng === (role+ingIdx)
                          const chosenIdx = selectedChoice[ing.primary?.name] || 0
                          return (
                            <div key={ingIdx} style={{ marginBottom:8 }}>
                              <div onClick={() => setExpandedIng(isOpen ? null : role+ingIdx)}
                                style={{ background:S.white, borderRadius:12, overflow:'hidden',
                                  border:`1.5px solid ${isOpen ? rc : (inStock ? S.border : S.red+'55')}`,
                                  cursor:'pointer' }}>
                                <div style={{ padding:'12px 14px', display:'flex',
                                  justifyContent:'space-between', alignItems:'flex-start' }}>
                                  <div style={{ flex:1, minWidth:0 }}>
                                    <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', marginBottom:4 }}>
                                      <span style={{ fontFamily:'Cormorant Garamond,serif', fontSize:17,
                                        fontStyle:'italic', color:S.ink }}>
                                        {chosen.name}
                                      </span>
                                      {inStock
                                        ? <span style={{ fontSize:10, color:S.green, fontWeight:600,
                                            background:S.greenBg, padding:'1px 8px', borderRadius:20 }}>
                                            ✓ {inStock.stock}g
                                          </span>
                                        : <span style={{ fontSize:10, color:S.red, fontWeight:600,
                                            background:'#fdf0ee', padding:'1px 8px', borderRadius:20 }}>
                                            ✗ ต้องหาซื้อ
                                          </span>
                                      }
                                    </div>
                                    {chosen.reason && (
                                      <div style={{ fontSize:11, color:S.textLt, lineHeight:1.5 }}>{chosen.reason}</div>
                                    )}
                                  </div>
                                  <div style={{ textAlign:'right', flexShrink:0, marginLeft:12 }}>
                                    <div style={{ display:'flex', gap:4, alignItems:'center', justifyContent:'flex-end' }}>
                                      <input type="number" step="0.1"
                                        value={overrideGrams?.[ing.primary.name] ?? chosen.grams}
                                        onChange={ev => setOverrideGrams(p => ({...p, [ing.primary.name]: ev.target.value}))}
                                        onClick={e => e.stopPropagation()}
                                        style={{ width:52, padding:'4px 6px', borderRadius:6, fontSize:13,
                                          border:`1px solid ${S.goldBd}`, color:S.ink, fontFamily:'Inter,sans-serif',
                                          textAlign:'right', outline:'none', background:S.white }}/>
                                      <span style={{ fontSize:11, color:S.textMid }}>g</span>
                                    </div>
                                    <div style={{ display:'flex', gap:4, alignItems:'center', justifyContent:'flex-end', marginTop:3 }}>
                                      <input type="number" step="0.1"
                                        value={overrideMl?.[ing.primary.name] ?? chosen.ml ?? ''}
                                        onChange={ev => setOverrideMl(p => ({...p, [ing.primary.name]: ev.target.value}))}
                                        onClick={e => e.stopPropagation()}
                                        style={{ width:52, padding:'4px 6px', borderRadius:6, fontSize:13,
                                          border:`1px solid ${S.border}`, color:S.gold, fontFamily:'Inter,sans-serif',
                                          textAlign:'right', outline:'none', background:S.white }}/>
                                      <span style={{ fontSize:11, color:S.gold }}>ml</span>
                                    </div>
                                    <div style={{ fontSize:11, color:S.textLt, marginTop:4 }}>{isOpen ? '▲' : '▼'}</div>
                                  </div>
                                </div>
                                {isOpen && (
                                  <div style={{ borderTop:`1px solid ${S.border}`, background:'#fdfcfa', padding:'10px 14px' }}>
                                    {[ing.primary, ...(ing.alternatives||[])].map((opt, optIdx) => {
                                      if (!opt) return null
                                      const optInStock = findInStock(opt.name)
                                      const isChosen   = chosenIdx === optIdx
                                      return (
                                        <div key={optIdx}
                                          onClick={e => {
                                            e.stopPropagation()
                                            setSelectedChoice(p => ({ ...p, [ing.primary.name]: optIdx }))
                                            setExpandedIng(null)
                                          }}
                                          style={{ display:'flex', alignItems:'center', gap:10,
                                            padding:'10px 12px', borderRadius:10, marginBottom:6,
                                            cursor:'pointer',
                                            background: isChosen ? rc+'15' : S.white,
                                            border:`1.5px solid ${isChosen ? rc : S.border}` }}>
                                          <div style={{ width:22, height:22, borderRadius:'50%',
                                            flexShrink:0, display:'flex', alignItems:'center',
                                            justifyContent:'center',
                                            background: isChosen ? rc : S.border }}>
                                            <span style={{ fontSize:10, fontWeight:700,
                                              color: isChosen ? '#fff' : S.textMid }}>
                                              {optIdx === 0 ? '★' : optIdx}
                                            </span>
                                          </div>
                                          <div style={{ flex:1, minWidth:0 }}>
                                            <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap', marginBottom:2 }}>
                                              <span style={{ fontFamily:'Cormorant Garamond,serif',
                                                fontSize:15, fontStyle:'italic',
                                                color: optInStock ? S.ink : S.textMid }}>
                                                {opt.name}
                                              </span>
                                              {optInStock
                                                ? <span style={{ fontSize:9, color:S.green, fontWeight:600,
                                                    background:S.greenBg, padding:'1px 6px', borderRadius:20 }}>
                                                    ✓ {optInStock.stock}g
                                                  </span>
                                                : <span style={{ fontSize:9, color:S.textLt,
                                                    background:S.border, padding:'1px 6px', borderRadius:20 }}>
                                                    ต้องหาซื้อ
                                                  </span>
                                              }
                                            </div>
                                            {optIdx > 0 && opt.similarity && (
                                              <div style={{ fontSize:10, color:S.textLt }}>{opt.similarity}</div>
                                            )}
                                          </div>
                                          <div style={{ textAlign:'right', flexShrink:0 }}>
                                            <div style={{ fontSize:13, color:S.ink, fontWeight:500 }}>{opt.grams}g</div>
                                            <div style={{ fontSize:11, color:S.gold }}>{opt.ml}ml</div>
                                          </div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}

                  {formulaSugg.notes && (
                    <div style={{ fontSize:12, color:S.textMid, fontStyle:'italic',
                      padding:'12px 16px', background:S.white, borderRadius:12,
                      border:`1px solid ${S.goldBd}`, marginBottom:8, lineHeight:1.7 }}>
                      {formulaSugg.notes}
                    </div>
                  )}

                  {/* ── Add-on ingredients ── */}
                  {(() => {
                    const maxMap = { simple:6, standard:10, complex:15 }
                    const max    = maxMap[complexity] || 10
                    const current = formulaSugg.ingredients.length + extraIngs.length
                    const canAdd  = current < max
                    return (
                      <div style={{ marginTop:4, padding:'12px 14px', borderRadius:12,
                        background:S.goldLt, border:`1px solid ${S.goldBd}` }}>
                        <div style={{ display:'flex', justifyContent:'space-between',
                          alignItems:'center', marginBottom: extraIngs.length ? 10 : 0 }}>
                          <div style={{ fontSize:10, fontWeight:700, color:S.gold,
                            letterSpacing:.8, textTransform:'uppercase' }}>
                            เพิ่ม Ingredient เอง
                          </div>
                          <div style={{ fontSize:10, color: current >= max ? S.red : S.textMid }}>
                            {current}/{max} ตัว
                          </div>
                        </div>

                        {extraIngs.map((e, i) => (
                          <div key={i} style={{ display:'flex', gap:8, alignItems:'center', marginBottom:8 }}>
                            <div style={{ flex:1 }}>
                              <MaterialPicker materials={materials} value={e.matId}
                                onChange={id => setExtraIngs(p => p.map((x,j)=>j===i?{...x,matId:id}:x))}
                                placeholder="ค้นหา ingredient..."/>
                            </div>
                            <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                              <input type="number" placeholder="g" value={e.grams}
                                onChange={ev => setExtraIngs(p => p.map((x,j)=>j===i?{...x,grams:ev.target.value}:x))}
                                style={{ width:52, padding:'10px 6px', borderRadius:10, fontSize:13,
                                  fontFamily:'Inter,sans-serif', border:`1px solid ${S.border}`,
                                  color:S.ink, background:S.white, outline:'none', textAlign:'right' }}/>
                              <span style={{ fontSize:11, color:S.textMid }}>g</span>
                              <input type="number" placeholder="ml" value={e.ml||''}
                                onChange={ev => setExtraIngs(p => p.map((x,j)=>j===i?{...x,ml:ev.target.value}:x))}
                                style={{ width:52, padding:'10px 6px', borderRadius:10, fontSize:13,
                                  fontFamily:'Inter,sans-serif', border:`1px solid ${S.border}`,
                                  color:S.gold, background:S.white, outline:'none', textAlign:'right' }}/>
                              <span style={{ fontSize:11, color:S.gold }}>ml</span>
                            </div>
                            <button onClick={() => setExtraIngs(p=>p.filter((_,j)=>j!==i))}
                              style={{ color:S.textLt, background:'none', border:'none',
                                cursor:'pointer', fontSize:18, flexShrink:0 }}>×</button>
                          </div>
                        ))}

                        {canAdd && (
                          <button onClick={() => setExtraIngs(p=>[...p,{matId:'',grams:'',ml:''}])}
                            style={{ fontSize:12, color:S.gold, background:'none',
                              border:`1px solid ${S.goldBd}`, borderRadius:16,
                              padding:'5px 14px', cursor:'pointer',
                              fontFamily:'Inter,sans-serif', fontWeight:500, marginTop: extraIngs.length?4:0 }}>
                            + เพิ่ม ingredient ({max - current} slots เหลือ)
                          </button>
                        )}
                        {!canAdd && (
                          <div style={{ fontSize:11, color:S.red, marginTop:4 }}>
                            ถึง max สำหรับ {complexity} แล้วค่ะ ({max} ตัว)
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
              )}

              {formulaSugg?.error && (
                <div style={{ fontSize:12, color:S.red, padding:12, background:'#fdf0ee',
                  borderRadius:10, marginTop:8 }}>
                  Parse error — ลอง Generate ใหม่อีกครั้ง
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Step 7: Name ── */}
      {step >= 7 && (
        <div style={{ marginBottom:24 }}>
          <StepHeader step={7} title="ตั้งชื่อทีหลัง" currentStep={step}
            sub="เพราะถ้าตั้งชื่อก่อน AI แต่ละตัวตีความไม่เหมือนกัน"/>
          <div>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="พิมพ์ชื่อเอง..."
              style={{ ...iStyle, marginBottom:8,
                fontFamily:'Cormorant Garamond,serif', fontStyle:'italic', fontSize:16 }}/>

            {name.trim() && (
              <input value={nameMeaning} onChange={e => setNameMeaning(e.target.value)}
                placeholder="ความหมายของชื่อ (ไม่บังคับ)"
                style={{ ...iStyle, marginBottom:12, fontSize:13 }}/>
            )}

            {/* ประเภทกลิ่น: Original / Inspired */}
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:11, color:S.textMid, marginBottom:6, fontWeight:500,
                textTransform:'uppercase', letterSpacing:.5 }}>ประเภทกลิ่น</div>
              <div style={{ display:'flex', gap:8 }}>
                {[{v:'original', label:'Original'}, {v:'inspired', label:'Inspired'}].map(opt => (
                  <button key={opt.v} onClick={() => setFormulaType(opt.v)}
                    style={{ flex:1, padding:'10px 0', borderRadius:10, cursor:'pointer',
                      fontSize:13, fontWeight:600,
                      border: `1.5px solid ${formulaType === opt.v ? S.gold : S.border}`,
                      background: formulaType === opt.v ? S.goldLt : S.white,
                      color: formulaType === opt.v ? S.gold : S.textMid }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {name.trim() ? (
              <Btn variant="outline" onClick={genMeaning} disabled={meaningLoading}
                style={{ width:'100%', marginBottom:12 }}>
                {meaningLoading ? 'Generating...' : '✦ ให้ AI อธิบายความหมายชื่อ'}
              </Btn>
            ) : (
              <Btn variant="outline" onClick={genNames} disabled={nameLoading}
                style={{ width:'100%', marginBottom:12 }}>
                {nameLoading ? 'Generating...' : '✦ ให้ AI เสนอชื่อ'}
              </Btn>
            )}

            {nameSuggs.length > 0 && (
              <div style={{ marginBottom:14 }}>
                {nameSuggs.map((s,i) => (
                  <div key={i}
                    onClick={() => { setName(s.name); setNameMeaning(s.meaning); setNameSuggs([]) }}
                    style={{ padding:'12px 14px', background:S.white,
                      border:`1.5px solid ${S.border}`, borderRadius:12,
                      cursor:'pointer', marginBottom:8 }}>
                    <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:18,
                      fontStyle:'italic', color:S.ink, marginBottom:3 }}>{s.name}</div>
                    <div style={{ fontSize:12, color:S.textMid }}>{s.meaning}</div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display:'flex', gap:10 }}>
              {formulaSugg?.ingredients && !formulaSugg?.error && (
                <Btn onClick={saveWithFormula} disabled={saving || !name.trim()} style={{ flex:2 }}>
                  {saving ? 'Saving...' : 'Save + บันทึกสูตร V1'}
                </Btn>
              )}
              <Btn onClick={saveBasic} disabled={!name.trim() || saving}
                variant={formulaSugg?.ingredients ? 'outline' : 'primary'}
                style={{ flex:1 }}>
                {saving ? 'Saving...' : 'Save เปล่าๆ'}
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* Allow saving without completing all steps */}
      {step < 7 && step >= 2 && (
        <div style={{ marginTop:8, textAlign:'center' }}>
          <button onClick={() => setStep(7)}
            style={{ fontSize:11, color:S.textLt, background:'none', border:'none',
              cursor:'pointer', textDecoration:'underline' }}>
            ข้ามไปตั้งชื่อและ save เลย
          </button>
        </div>
      )}
    </div>
  )
}
