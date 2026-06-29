import { useState, useEffect } from 'react'
import { db } from '../lib/db'
import AgingLog from '../components/AgingLog'
import { calcBottleFill } from '../constants/packageSystem'

const S = {
  bg:      '#f8f5f0',
  ink:     '#2a1f14',
  gold:    '#8a6f4e',
  goldLt:  '#f5f0e8',
  border:  '#e8ddd0',
  textMid: '#6a5a4a',
  textLt:  '#b0a090',
  green:   '#5a8a6a',
  red:     '#c0544a',
  white:   '#ffffff',
}

const CONC = ['SOFT','SIGNATURE','DEEP']
const CONC_DESC = {
  SOFT:      'กลิ่นอ่อน · ใส่ได้ทุกวัน',
  SIGNATURE: 'กลิ่นกลาง · ประจำตัว',
  DEEP:      'กลิ่นเข้ม · พิเศษ',
}
const CONC_COLOR = {
  SOFT:      { bg:'#eef4f0', c:'#5a8a6a' },
  SIGNATURE: { bg:'#f5f0e8', c:'#8a6f4e' },
  DEEP:      { bg:'#f0eaea', c:'#8a4a4a' },
}

function StockBadge({ remaining }) {
  const r = Math.round(remaining * 10) / 10
  const color = r <= 0 ? S.red : r <= 5 ? '#c07820' : S.green
  return (
    <span style={{ fontSize:12, fontWeight:700, color,
      background: r <= 0 ? '#faeaea' : r <= 5 ? '#fef3e2' : '#eef4f0',
      padding:'2px 10px', borderRadius:20 }}>
      {r <= 0 ? 'หมด' : `${r} ขวด`}
    </span>
  )
}

function BatchForm({ formulaId, onSave }) {
  const [concentration, setConcentration] = useState('SIGNATURE')
  const [bottle_ml,     setBottleMl]      = useState(15)
  const [qty,           setQty]           = useState('')
  const [date,          setDate]          = useState(new Date().toISOString().split('T')[0])
  const [concentrateDate, setConcentrateDate] = useState('')
  const [notes,         setNotes]         = useState('')
  const [saving,        setSaving]        = useState(false)
  const [deductResult,  setDeductResult]  = useState(null)
  const [alcoholMix,    setAlcoholMix]    = useState([{ brand:'', ml:'', isCustom:false }])
  const [concentrateMl, setConcentrateMl] = useState('')
  const [sellPrice,     setSellPrice]     = useState('')
  const [overridden,    setOverridden]    = useState(false) // true ถ้า user แก้ ml เอง ไม่ auto-fill ทับแล้ว

  // auto-fill หัวเชื้อ + alcohol แถวแรก จาก calcBottleFill ทุกครั้งที่เปลี่ยน concentration/ขนาดขวด (จนกว่าจะแก้เอง)
  useEffect(() => {
    if (overridden) return
    const concMap = { SOFT:'EdP_Soft', SIGNATURE:'EdP_Signature', DEEP:'EdP_Deep' }
    const fill = calcBottleFill(0, concMap[concentration], bottle_ml, 0)
    if (fill) {
      setConcentrateMl(fill.concInBottle != null ? String(fill.concInBottle) : '')
      setAlcoholMix(prev => {
        const ml = fill.alcoholInBottle != null ? String(fill.alcoholInBottle) : ''
        if (prev.length === 1 && !prev[0].brand) {
          return [{ ...prev[0], ml }]
        }
        return prev
      })
    }
  }, [concentration, bottle_ml, overridden])


  const ALCOHOL_PRESETS = ['DEB', 'BLISS', 'Ethanol 95%', 'Thailai']

  function addAlcoholRow() {
    setAlcoholMix(prev => [...prev, { brand:'', ml:'', isCustom:false }])
  }
  function removeAlcoholRow(idx) {
    setAlcoholMix(prev => prev.filter((_, i) => i !== idx))
  }
  function updateAlcoholRow(idx, field, value) {
    setAlcoholMix(prev => prev.map((row, i) => i === idx ? { ...row, [field]: value } : row))
  }
  const alcoholMixTotalMl = alcoholMix.reduce((s, r) => s + (parseFloat(r.ml) || 0), 0)


  async function save() {
    if (!qty || parseInt(qty) <= 0) return
    setSaving(true)
    const { data: batch, deduction, error } = await db.createBatch(formulaId, {
      concentration, bottle_ml, qty_produced: qty, produced_at: date, notes,
      concentrate_made_at: concentrateDate || null,
      alcohol_mix: alcoholMix.filter(r => r.brand && r.ml).map(r => ({ brand: r.brand, ml: r.ml })),
      concentrate_ml: concentrateMl ? parseFloat(concentrateMl) : null,
      alcohol_ml_per_bottle: alcoholMixTotalMl ? alcoholMixTotalMl : null,
      sell_price: sellPrice ? parseFloat(sellPrice) : null,
    })
    if (error) {
      alert('บันทึก batch ไม่สำเร็จ: ' + error.message)
      setSaving(false)
      return
    }
    // หัก stock อัตโนมัติ (createBatch เรียกให้แล้วข้างใน — ไม่ต้องเรียกซ้ำ)
    setDeductResult(deduction)
    setQty(''); setNotes(''); setSellPrice('')
    setAlcoholMix([{ brand:'', ml:'', isCustom:false }]); setOverridden(false)
    onSave?.()
    setSaving(false)
  }

  const inputStyle = {
    width:'100%', padding:'8px 12px', borderRadius:8, border:`1px solid ${S.border}`,
    fontSize:13, fontFamily:'Inter,sans-serif', color:S.ink, background:S.white,
    outline:'none', boxSizing:'border-box',
  }

  return (
    <div style={{ background:S.goldLt, border:`1px solid ${S.border}`,
      borderRadius:12, padding:16, marginBottom:16 }}>
      <div style={{ fontSize:12, fontWeight:700, color:S.gold, letterSpacing:1,
        textTransform:'uppercase', marginBottom:12 }}>+ บันทึกการผลิต</div>

      {/* Concentration */}
      <div style={{ marginBottom:10 }}>
        <div style={{ fontSize:11, color:S.textMid, marginBottom:6,
          fontWeight:500, textTransform:'uppercase', letterSpacing:.5 }}>Concentration</div>
        <div style={{ display:'flex', gap:8 }}>
          {CONC.map(c => (
            <button key={c} onClick={() => setConcentration(c)}
              style={{ flex:1, padding:'8px 0', borderRadius:8, cursor:'pointer',
                fontFamily:'Inter,sans-serif', fontSize:12, fontWeight:600,
                border:`1.5px solid ${concentration===c ? CONC_COLOR[c].c : S.border}`,
                background: concentration===c ? CONC_COLOR[c].bg : S.white,
                color: concentration===c ? CONC_COLOR[c].c : S.textMid }}>
              {c}
            </button>
          ))}
        </div>
        <div style={{ fontSize:10, color:S.textLt, marginTop:4 }}>
          {CONC_DESC[concentration]}
        </div>
      </div>

      {/* Bottle size + qty */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
        <div>
          <div style={{ fontSize:11, color:S.textMid, marginBottom:6,
            fontWeight:500, textTransform:'uppercase', letterSpacing:.5 }}>ขนาดขวด</div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {[5,10,15,30,50,100].map(ml => (
              <button key={ml} onClick={() => setBottleMl(ml)}
                style={{ flex:'1 1 27%', minWidth:56, padding:'8px 0', borderRadius:8, cursor:'pointer',
                  fontFamily:'Inter,sans-serif', fontSize:13, fontWeight:600,
                  border:`1.5px solid ${bottle_ml===ml ? S.gold : S.border}`,
                  background: bottle_ml===ml ? S.goldLt : S.white,
                  color: bottle_ml===ml ? S.gold : S.textMid }}>
                {ml} ml
              </button>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize:11, color:S.textMid, marginBottom:6,
            fontWeight:500, textTransform:'uppercase', letterSpacing:.5 }}>จำนวน (ขวด)</div>
          <input type="number" min="1" value={qty}
            onChange={e => setQty(e.target.value)}
            placeholder="เช่น 10"
            style={{ ...inputStyle }}/>
        </div>
      </div>

      {/* Alcohol Mix — ผสมได้หลายยี่ห้อ */}
      <div style={{ marginBottom:10 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
          <div style={{ fontSize:11, color:S.textMid,
            fontWeight:500, textTransform:'uppercase', letterSpacing:.5 }}>
            Alcohol ที่ใช้ผสม
          </div>
          <button onClick={addAlcoholRow}
            style={{ fontSize:11, color:S.gold, background:'none', border:'none',
              cursor:'pointer', fontWeight:600, padding:0 }}>
            + เพิ่มยี่ห้อ
          </button>
        </div>

        {alcoholMix.map((row, idx) => (
          <div key={idx} style={{ background:S.white, border:`1px solid ${S.border}`,
            borderRadius:10, padding:10, marginBottom:8 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {ALCOHOL_PRESETS.map(b => (
                  <button key={b}
                    onClick={() => setAlcoholMix(prev => prev.map((r, i) =>
                      i === idx ? { ...r, brand: b, isCustom: false } : r))}
                    style={{ padding:'5px 12px', borderRadius:16, cursor:'pointer',
                      fontFamily:'Inter,sans-serif', fontSize:11, fontWeight:600,
                      border:`1.5px solid ${!row.isCustom && row.brand === b ? S.gold : S.border}`,
                      background: !row.isCustom && row.brand === b ? S.goldLt : 'transparent',
                      color: !row.isCustom && row.brand === b ? S.gold : S.textMid }}>
                    {b}
                  </button>
                ))}
                <button
                  onClick={() => setAlcoholMix(prev => prev.map((r, i) =>
                    i === idx ? { ...r, brand: r.isCustom ? r.brand : '', isCustom: true } : r))}
                  style={{ padding:'5px 12px', borderRadius:16, cursor:'pointer',
                    fontFamily:'Inter,sans-serif', fontSize:11, fontWeight:600,
                    border:`1.5px solid ${row.isCustom ? S.gold : S.border}`,
                    background: row.isCustom ? S.goldLt : 'transparent',
                    color: row.isCustom ? S.gold : S.textMid }}>
                  อื่นๆ
                </button>
              </div>
              {alcoholMix.length > 1 && (
                <button onClick={() => removeAlcoholRow(idx)}
                  style={{ fontSize:13, color:S.textLt, background:'none', border:'none',
                    cursor:'pointer', padding:'2px 4px', flexShrink:0 }}>×</button>
              )}
            </div>
            <div style={{ display:'flex', gap:6 }}>
              {row.isCustom && (
                <input value={row.brand} onChange={e => updateAlcoholRow(idx, 'brand', e.target.value)}
                  placeholder="พิมพ์ยี่ห้อเอง"
                  style={{ ...inputStyle, flex:1.4 }}/>
              )}
              <input type="number" step="0.01" value={row.ml}
                onChange={e => updateAlcoholRow(idx, 'ml', e.target.value)}
                placeholder="ml"
                style={{ ...inputStyle, flex:1 }}/>
            </div>
          </div>
        ))}

        {alcoholMixTotalMl > 0 && (
          <div style={{ fontSize:10, color:S.textLt, marginTop:2 }}>
            รวม Alcohol {alcoholMixTotalMl.toFixed(2)} ml/ขวด
          </div>
        )}
      </div>

      <div style={{ marginBottom:10 }}>
        <div style={{ fontSize:11, color:S.textMid, marginBottom:6,
          fontWeight:500, textTransform:'uppercase', letterSpacing:.5 }}>
          หัวเชื้อ (ml/ขวด)
        </div>
        <input type="number" step="0.01" value={concentrateMl}
          onChange={e => { setConcentrateMl(e.target.value); setOverridden(true) }}
          placeholder="0.00"
          style={{ ...inputStyle }}/>
      </div>

      {/* วันทำหัวเชื้อ — แยกจากวันผลิต/ผสมแอลกอฮอล์ */}
      <div style={{ marginBottom:10 }}>
        <div style={{ fontSize:11, color:S.textMid, marginBottom:6,
          fontWeight:500, textTransform:'uppercase', letterSpacing:.5 }}>
          วันทำหัวเชื้อ
        </div>
        <input type="date" value={concentrateDate} onChange={e => setConcentrateDate(e.target.value)}
          style={{ ...inputStyle }}/>
        <div style={{ fontSize:10, color:S.textLt, marginTop:4 }}>
          ไม่ใส่ก็ได้ ถ้าทำหัวเชื้อ+ผสมแอลกอฮอล์วันเดียวกัน
        </div>
      </div>
      {overridden && (
        <div style={{ fontSize:10, color:S.textLt, marginTop:-6, marginBottom:10 }}>
          * แก้ไขเองแล้ว — ไม่ auto-fill ทับจนกว่าจะกดรีเซ็ต{' '}
          <button onClick={() => setOverridden(false)}
            style={{ color:S.gold, textDecoration:'underline', background:'none',
              border:'none', cursor:'pointer', fontSize:10, padding:0 }}>
            รีเซ็ตเป็นค่าคำนวณ
          </button>
        </div>
      )}

      {/* ราคาขาย */}
      <div style={{ marginBottom:10 }}>
        <div style={{ fontSize:11, color:S.textMid, marginBottom:6,
          fontWeight:500, textTransform:'uppercase', letterSpacing:.5 }}>
          ราคาขาย (฿/ขวด)
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <input type="number" inputMode="decimal" value={sellPrice}
            onChange={e => setSellPrice(e.target.value)}
            placeholder="เช่น 690"
            style={{ ...inputStyle, flex:1 }}/>
          {sellPrice && qty && (
            <div style={{ fontSize:12, color:S.green, fontWeight:600, flexShrink:0, whiteSpace:'nowrap' }}>
              รวม ฿{(parseFloat(sellPrice) * parseInt(qty || 1)).toLocaleString()}
            </div>
          )}
        </div>
      </div>

      {/* Date */}
      <div style={{ marginBottom:10 }}>
        <div style={{ fontSize:11, color:S.textMid, marginBottom:6,
          fontWeight:500, textTransform:'uppercase', letterSpacing:.5 }}>วันที่ผลิต</div>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          style={{ ...inputStyle }}/>
      </div>

      {/* Notes */}
      <div style={{ marginBottom:12 }}>
        <div style={{ fontSize:11, color:S.textMid, marginBottom:6,
          fontWeight:500, textTransform:'uppercase', letterSpacing:.5 }}>หมายเหตุ</div>
        <input value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="เช่น batch ที่ 2, ใช้ formula v3"
          style={{ ...inputStyle }}/>
      </div>

      {/* Cost preview */}
      {qty && parseInt(qty) > 0 && (() => {
        const alcoholMlEach = alcoholMixTotalMl
        const alcoholCost = alcoholMlEach * parseInt(qty) * 0.35
        const bottleCostEach = { 5:35, 10:55, 15:65, 30:90, 50:130, 100:200 }[bottle_ml] || 90
        const bottleCostTotal = bottleCostEach * parseInt(qty)
        const totalCost = alcoholCost + bottleCostTotal
        const costPerBottle = totalCost / parseInt(qty)
        const profitPerBottle = sellPrice ? parseFloat(sellPrice) - costPerBottle : null
        const validMix = alcoholMix.filter(r => r.brand && r.ml)
        return (
          <div style={{ background:S.white, border:`1px solid ${S.border}`,
            borderRadius:10, padding:'10px 14px', marginBottom:12 }}>
            <div style={{ fontSize:10, fontWeight:700, color:S.gold, letterSpacing:1,
              textTransform:'uppercase', marginBottom:8 }}>ต้นทุน batch นี้ (ไม่รวม concentrate)</div>
            {validMix.length > 0 ? validMix.map((r, i) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
                <span style={{ color:S.textMid }}>Alcohol ({r.brand})</span>
                <span>฿{(parseFloat(r.ml) * parseInt(qty) * 0.35).toFixed(2)}</span>
              </div>
            )) : (
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
                <span style={{ color:S.textMid }}>Alcohol</span>
                <span>฿{alcoholCost.toFixed(2)}</span>
              </div>
            )}
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
              <span style={{ color:S.textMid }}>ขวด × {qty}</span>
              <span>฿{bottleCostTotal.toFixed(0)}</span>
            </div>
            <div style={{ borderTop:`1px solid ${S.border}`, marginTop:6, paddingTop:6,
              display:'flex', justifyContent:'space-between', fontSize:13, fontWeight:600 }}>
              <span>รวม</span>
              <span style={{ color:S.gold }}>฿{totalCost.toFixed(0)}</span>
            </div>
            {profitPerBottle != null && (
              <div style={{ borderTop:`1px solid ${S.border}`, marginTop:6, paddingTop:6,
                display:'flex', justifyContent:'space-between', fontSize:12, fontWeight:600 }}>
                <span style={{ color:S.textMid }}>กำไร/ขวด (ไม่รวม concentrate)</span>
                <span style={{ color: profitPerBottle >= 0 ? S.green : S.red }}>
                  ฿{profitPerBottle.toFixed(0)}
                </span>
              </div>
            )}
          </div>
        )
      })()}

      <button onClick={save} disabled={!qty || saving}
        style={{ width:'100%', padding:'10px 0', borderRadius:10, cursor:'pointer',
          fontFamily:'Inter,sans-serif', fontSize:13, fontWeight:600,
          background:S.gold, border:'none', color:'#fff',
          opacity: !qty || saving ? .6 : 1 }}>
        {saving ? 'กำลังบันทึก...' : '✓ บันทึก Batch'}
      </button>
      {deductResult?.ok && (
        <div style={{ marginTop:8, padding:'8px 12px', borderRadius:8,
          background:'#eef4f0', border:'1px solid #5a8a6a',
          fontSize:11, color:'#5a8a6a', fontWeight:500 }}>
          ✓ หัก stock วัตถุดิบ {deductResult.itemsDeducted} รายการแล้ว
          {' '}(×{deductResult.ratio?.toFixed(2)})
        </div>
      )}
      {deductResult?.ok === false && (
        <div style={{ marginTop:8, padding:'8px 12px', borderRadius:8,
          background:'#faeaea', border:'1px solid #c0544a',
          fontSize:11, color:'#c0544a' }}>
          ⚠ หัก stock ไม่ได้: {deductResult.reason}
        </div>
      )}
    </div>
  )
}

function StockSummary({ stock }) {
  if (!stock.length) return null
  return (
    <div style={{ marginBottom:20 }}>
      <div style={{ fontSize:12, fontWeight:700, color:S.gold, letterSpacing:1,
        textTransform:'uppercase', marginBottom:10 }}>Stock ปัจจุบัน</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:8 }}>
        {stock.map((s,i) => (
          <div key={i} style={{ background:CONC_COLOR[s.concentration]?.bg || S.white,
            border:`1px solid ${S.border}`, borderRadius:10, padding:'10px 12px' }}>
            <div style={{ fontSize:10, fontWeight:700, color:CONC_COLOR[s.concentration]?.c || S.gold,
              letterSpacing:1, marginBottom:2 }}>{s.concentration}</div>
            <div style={{ fontSize:11, color:S.textMid, marginBottom:6 }}>{s.bottle_ml} ml</div>
            <StockBadge remaining={s.remaining}/>
            <div style={{ fontSize:10, color:S.textLt, marginTop:4 }}>
              ผลิต {s.produced} · ขาย {s.sold}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function PageProduction() {
  const [formulas,  setFormulas]  = useState([])
  const [batchSummary, setBatchSummary] = useState({}) // formula_id -> { produced, sold, batchCount, lastProducedAt }
  const [selected,  setSelected]  = useState(null)
  const [batches,   setBatches]   = useState([])
  const [stock,     setStock]     = useState([])
  const [versions,  setVersions]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [showForm,  setShowForm]  = useState(false)
  const [giveawayBatch, setGiveawayBatch] = useState(null) // batch ที่กำลังกรอก giveaway

  useEffect(() => {
    Promise.all([db.getFormulas(), db.getBatchSummaryByFormula()]).then(([f, bs]) => {
      setFormulas(f)
      setBatchSummary(bs)
      setLoading(false)
    })
  }, [])

  async function selectFormula(f) {
    setSelected(f)
    setShowForm(false)
    const [b, s, v] = await Promise.all([db.getBatches(f.id), db.getStock(f.id), db.getVersions(f.id)])
    setBatches(b); setStock(s); setVersions(v)
  }

  async function reload() {
    if (!selected) return
    const [b, s, bs, v] = await Promise.all([
      db.getBatches(selected.id), db.getStock(selected.id), db.getBatchSummaryByFormula(), db.getVersions(selected.id)
    ])
    setBatches(b); setStock(s); setBatchSummary(bs); setVersions(v)
    setShowForm(false)
  }

  // version สำหรับคำนวณต้นทุน — ใช้ตัวที่เป็น Final ก่อน ไม่งั้นใช้ตัวล่าสุด
  function activeVersionId() {
    const final = versions.find(v => v.is_final)
    if (final) return final.id
    return versions[versions.length - 1]?.id || null
  }

  async function deleteBatch(id) {
    if (!confirm('ลบ batch นี้?')) return
    await db.deleteBatch(id)
    reload()
  }

  return (
    <div style={{ background:S.bg, minHeight:'100vh', padding:'24px 16px',
      fontFamily:'Inter,sans-serif' }}>

      {/* Header */}
      <div style={{ maxWidth:600, margin:'0 auto' }}>
        <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:28,
          color:S.ink, marginBottom:4 }}>Production</div>
        <div style={{ fontSize:13, color:S.textMid, marginBottom:20 }}>
          บันทึก batch การผลิต · ติดตาม stock
        </div>

        {/* Formula selector */}
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:11, fontWeight:700, color:S.gold, letterSpacing:1,
            textTransform:'uppercase', marginBottom:10 }}>เลือกสูตร</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {loading ? (
              <div style={{ color:S.textLt, fontSize:13 }}>Loading...</div>
            ) : formulas.map(f => {
              const summary = batchSummary[f.id]
              return (
                <button key={f.id} onClick={() => selectFormula(f)}
                  style={{ textAlign:'left', padding:'12px 16px', borderRadius:10,
                    cursor:'pointer', fontFamily:'Inter,sans-serif',
                    border:`1.5px solid ${selected?.id===f.id ? S.gold : S.border}`,
                    background: selected?.id===f.id ? S.goldLt : S.white,
                    color:S.ink }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8 }}>
                    <div>
                      <div style={{ fontSize:14, fontWeight:600,
                        fontFamily:'Cormorant Garamond,serif' }}>{f.name}</div>
                      {f.concentration_type && (
                        <span style={{ fontSize:10, color:CONC_COLOR[f.concentration_type]?.c || S.textMid,
                          background:CONC_COLOR[f.concentration_type]?.bg, padding:'1px 8px',
                          borderRadius:10, marginTop:2, display:'inline-block' }}>
                          {f.concentration_type}
                        </span>
                      )}
                    </div>
                    {summary ? (
                      <span style={{ fontSize:10, fontWeight:700, color:S.green, background:'#eef4ee',
                        padding:'3px 9px', borderRadius:20, whiteSpace:'nowrap', flexShrink:0 }}>
                        ✓ ผลิตแล้ว {summary.produced} ขวด
                      </span>
                    ) : (
                      <span style={{ fontSize:10, color:S.textLt, background:S.bg,
                        padding:'3px 9px', borderRadius:20, whiteSpace:'nowrap', flexShrink:0 }}>
                        ยังไม่ผลิต
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Selected formula detail */}
        {selected && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between',
              alignItems:'center', marginBottom:12 }}>
              <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:20,
                color:S.ink }}>{selected.name}</div>
              <button onClick={() => setShowForm(v => !v)}
                style={{ padding:'8px 16px', borderRadius:20, cursor:'pointer',
                  fontFamily:'Inter,sans-serif', fontSize:12, fontWeight:600,
                  background: showForm ? S.border : S.gold,
                  border:'none', color: showForm ? S.textMid : '#fff' }}>
                {showForm ? 'ยกเลิก' : '+ ผลิตใหม่'}
              </button>
            </div>

            {/* Stock summary */}
            <StockSummary stock={stock}/>

            {/* Batch form */}
            {showForm && (
              <BatchForm formulaId={selected.id} onSave={reload}/>
            )}

            {/* Batch history */}
            {batches.length > 0 && (
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:S.gold, letterSpacing:1,
                  textTransform:'uppercase', marginBottom:10 }}>ประวัติการผลิต</div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {batches.map(b => (
                    <div key={b.id}>
                      <div style={{ background:S.white, border:`1px solid ${S.border}`,
                        borderRadius:10, padding:'12px 14px',
                        display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <div>
                          <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:4 }}>
                            <span style={{ fontSize:11, fontWeight:700,
                              color:CONC_COLOR[b.concentration]?.c || S.gold,
                              background:CONC_COLOR[b.concentration]?.bg,
                              padding:'2px 8px', borderRadius:10 }}>{b.concentration}</span>
                            <span style={{ fontSize:13, color:S.ink, fontWeight:600 }}>
                              {b.bottle_ml} ml × {b.qty_produced} ขวด
                            </span>
                          </div>
                          <div style={{ fontSize:11, color:S.textLt }}>
                            {b.concentrate_made_at && (
                              <span>หัวเชื้อ {b.concentrate_made_at} → </span>
                            )}
                            ผลิต {b.produced_at}
                            {b.notes && ` · ${b.notes}`}
                          </div>
                          {(b.alcohol_mix?.length > 0 || b.alcohol_brand || b.concentrate_ml != null) && (
                            <div style={{ fontSize:11, color:S.textLt, marginTop:2 }}>
                              {b.concentrate_ml != null && `หัวเชื้อ ${b.concentrate_ml}ml/ขวด`}
                              {b.alcohol_mix?.length > 0
                                ? ` · ${b.alcohol_mix.map(r => `${r.brand} ${r.ml}ml`).join(' + ')}`
                                : (b.alcohol_brand && ` · ${b.alcohol_brand}`)}
                            </div>
                          )}
                          {(() => {
                            const bottleCostEach = { 5:35,10:55,15:65,30:90,50:130,100:200 }[b.bottle_ml] || 90
                            let alcoholMlEach = b.alcohol_ml_per_bottle
                            if (alcoholMlEach == null) {
                              const concMap = { SOFT:'EdP_Soft', SIGNATURE:'EdP_Signature', DEEP:'EdP_Deep' }
                              const fill = calcBottleFill(0, concMap[b.concentration] || 'EdP_Signature', b.bottle_ml, 0)
                              alcoholMlEach = fill ? fill.alcoholInBottle : 0
                            }
                            const alcoholCost = alcoholMlEach * b.qty_produced * 0.35
                            const totalCost = (bottleCostEach * b.qty_produced) + alcoholCost
                            const costPerBottle = totalCost / b.qty_produced
                            const profitPerBottle = b.sell_price != null ? b.sell_price - costPerBottle : null
                            return (
                              <>
                                <div style={{ fontSize:11, color:S.textMid, marginTop:2 }}>
                                  ต้นทุน (ขวด+alcohol) ฿{totalCost.toFixed(0)}
                                  {' · '}฿{costPerBottle.toFixed(0)}/ขวด
                                </div>
                                {b.sell_price != null && (
                                  <div style={{ fontSize:11, marginTop:2, display:'flex', gap:8 }}>
                                    <span style={{ color:S.green, fontWeight:600 }}>
                                      ขาย ฿{Number(b.sell_price).toLocaleString()}/ขวด
                                    </span>
                                    <span style={{ color: profitPerBottle >= 0 ? S.green : S.red }}>
                                      กำไร ฿{profitPerBottle.toFixed(0)}/ขวด
                                    </span>
                                  </div>
                                )}
                              </>
                            )
                          })()}
                          {(b.qty_sold > 0 || b.giveaway_ml > 0) && (
                            <div style={{ fontSize:11, color:S.textMid, marginTop:2 }}>
                              ขายแล้ว {b.qty_sold}
                              {b.giveaway_ml > 0 && ` · แจกไป ${b.giveaway_ml}ml (≈${b.giveaway_bottles_equivalent.toFixed(1)} ขวด)`}
                              {' · '}เหลือ {(b.qty_produced - b.qty_sold - (b.giveaway_bottles_equivalent || 0)).toFixed(1)}
                            </div>
                          )}
                        </div>
                        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                          <StockBadge remaining={b.qty_produced - b.qty_sold - (b.giveaway_bottles_equivalent || 0)}/>
                          <button onClick={() => setGiveawayBatch(b)}
                            style={{ fontSize:11, color:S.gold, background:S.goldLt,
                              border:`1px solid ${S.goldBd}`, borderRadius:14,
                              padding:'4px 10px', cursor:'pointer', fontWeight:600,
                              whiteSpace:'nowrap' }}>
                            + แจก
                          </button>
                          <button onClick={() => deleteBatch(b.id)}
                            style={{ fontSize:12, color:S.textLt, background:'none',
                              border:'none', cursor:'pointer', padding:'4px 8px' }}>×</button>
                        </div>
                      </div>
                      {/* Aging Log ใต้แต่ละ batch */}
                      <div style={{ marginTop:4, marginBottom:8 }}>
                        <AgingLog
                          batchId={b.id}
                          formulaId={selected.id}
                          producedAt={b.produced_at}
                          formulaName={selected.name}/>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {batches.length === 0 && !showForm && (
              <div style={{ textAlign:'center', padding:'32px 0',
                color:S.textLt, fontSize:13, fontStyle:'italic' }}>
                ยังไม่มี batch — กด "+ ผลิตใหม่" เพื่อเริ่มค่ะ
              </div>
            )}
          </div>
        )}
      </div>

      {giveawayBatch && (
        <GiveawayModal
          batch={giveawayBatch}
          versionId={activeVersionId()}
          onClose={() => setGiveawayBatch(null)}
          onSaved={() => { setGiveawayBatch(null); reload() }}/>
      )}
    </div>
  )
}

// ── Modal บันทึกการแจก giveaway/sample ───────────────────────────────────────────
function GiveawayModal({ batch, versionId, onClose, onSaved }) {
  const [ml,     setMl]     = useState('')
  const [note,   setNote]   = useState('')
  const [cost,   setCost]   = useState(null) // preview ต้นทุนแบบ real-time
  const [saving, setSaving] = useState(false)
  const [err,    setErr]    = useState('')

  useEffect(() => {
    if (!versionId || !ml || isNaN(parseFloat(ml))) { setCost(null); return }
    let cancelled = false
    db.getCostPerUnit(versionId, batch).then(unit => {
      if (!cancelled) setCost(unit.costPerMl * parseFloat(ml))
    })
    return () => { cancelled = true }
  }, [ml, versionId, batch])

  async function handleSave() {
    const mlGiven = parseFloat(ml)
    if (!mlGiven || mlGiven <= 0) { setErr('กรอกจำนวน ml ที่แจกก่อนค่ะ'); return }
    if (!versionId) { setErr('ไม่พบสูตร version สำหรับคำนวณต้นทุน — เช็คว่าสูตรนี้มี version หรือยัง'); return }
    setSaving(true)
    setErr('')
    const result = await db.logGiveaway(batch.id, versionId, mlGiven, note.trim() || null)
    setSaving(false)
    if (!result.success) {
      setErr('บันทึกไม่สำเร็จ: ' + result.error)
      return
    }
    onSaved?.()
  }

  return (
    <div onClick={onClose}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:60,
        display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background:S.white, borderRadius:14, padding:20, width:'100%',
          maxWidth:360 }}>
        <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:19, fontStyle:'italic',
          color:S.ink, marginBottom:4 }}>+ แจก giveaway / sample</div>
        <div style={{ fontSize:12, color:S.textLt, marginBottom:14 }}>
          {batch.bottle_ml}ml × {batch.qty_produced} ขวด — {batch.concentration}
        </div>

        <label style={{ fontSize:11, color:S.textLt }}>จำนวนที่แจก (ml)</label>
        <input type="number" min="0" step="0.1" value={ml}
          onChange={e => setMl(e.target.value)} autoFocus
          placeholder="เช่น 2 (สำหรับตัวอย่าง 2ml)"
          style={{ width:'100%', marginTop:4, marginBottom:10, padding:'9px 12px',
            fontSize:13, border:`1px solid ${S.border}`, borderRadius:8, boxSizing:'border-box' }}/>

        <label style={{ fontSize:11, color:S.textLt }}>หมายเหตุ (ใครได้ไป/เหตุผล)</label>
        <input value={note} onChange={e => setNote(e.target.value)}
          placeholder="เช่น แจกลูกค้า VIP, ใช้รีวิว"
          style={{ width:'100%', marginTop:4, marginBottom:10, padding:'9px 12px',
            fontSize:13, border:`1px solid ${S.border}`, borderRadius:8, boxSizing:'border-box' }}/>

        {cost != null && (
          <div style={{ fontSize:12, color:S.gold, background:S.goldLt, borderRadius:8,
            padding:'8px 10px', marginBottom:10 }}>
            ต้นทุนที่ใช้ไปประมาณ ฿{cost.toFixed(2)}
          </div>
        )}
        {err && (
          <div style={{ fontSize:12, color:S.red, marginBottom:10 }}>{err}</div>
        )}

        <div style={{ display:'flex', gap:8 }}>
          <button onClick={onClose}
            style={{ flex:1, padding:'10px 0', borderRadius:8, border:`1px solid ${S.border}`,
              background:'transparent', color:S.textMid, fontWeight:600, cursor:'pointer' }}>
            ยกเลิก
          </button>
          <button onClick={handleSave} disabled={saving}
            style={{ flex:1, padding:'10px 0', borderRadius:8, border:'none',
              background:S.gold, color:'#fff', fontWeight:600,
              cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
      </div>
    </div>
  )
}
