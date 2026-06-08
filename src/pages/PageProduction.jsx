import { useState, useEffect } from 'react'
import { db } from '../lib/db'
import AgingLog from '../components/AgingLog'

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
  const color = remaining <= 0 ? S.red : remaining <= 5 ? '#c07820' : S.green
  return (
    <span style={{ fontSize:12, fontWeight:700, color,
      background: remaining <= 0 ? '#faeaea' : remaining <= 5 ? '#fef3e2' : '#eef4f0',
      padding:'2px 10px', borderRadius:20 }}>
      {remaining <= 0 ? 'หมด' : `${remaining} ขวด`}
    </span>
  )
}

function BatchForm({ formulaId, onSave }) {
  const [concentration, setConcentration] = useState('SIGNATURE')
  const [bottle_ml,     setBottleMl]      = useState(15)
  const [qty,           setQty]           = useState('')
  const [date,          setDate]          = useState(new Date().toISOString().split('T')[0])
  const [notes,         setNotes]         = useState('')
  const [saving,        setSaving]        = useState(false)
  const [deductResult,  setDeductResult]  = useState(null)


  async function save() {
    if (!qty || parseInt(qty) <= 0) return
    setSaving(true)
    const totalMl = parseInt(bottle_ml) * parseInt(qty)
    const batch = await db.createBatch(formulaId, {
      concentration, bottle_ml, qty_produced: qty, produced_at: date, notes
    })
    // หัก stock อัตโนมัติ
    const result = await db.deductStockFromBatch(formulaId, totalMl)
    setDeductResult(result)
    setQty(''); setNotes('')
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
          <div style={{ display:'flex', gap:8 }}>
            {[15,30].map(ml => (
              <button key={ml} onClick={() => setBottleMl(ml)}
                style={{ flex:1, padding:'8px 0', borderRadius:8, cursor:'pointer',
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
  const [selected,  setSelected]  = useState(null)
  const [batches,   setBatches]   = useState([])
  const [stock,     setStock]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [showForm,  setShowForm]  = useState(false)

  useEffect(() => {
    db.getFormulas().then(d => { setFormulas(d); setLoading(false) })
  }, [])

  async function selectFormula(f) {
    setSelected(f)
    setShowForm(false)
    const [b, s] = await Promise.all([db.getBatches(f.id), db.getStock(f.id)])
    setBatches(b); setStock(s)
  }

  async function reload() {
    if (!selected) return
    const [b, s] = await Promise.all([db.getBatches(selected.id), db.getStock(selected.id)])
    setBatches(b); setStock(s)
    setShowForm(false)
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
            ) : formulas.map(f => (
              <button key={f.id} onClick={() => selectFormula(f)}
                style={{ textAlign:'left', padding:'12px 16px', borderRadius:10,
                  cursor:'pointer', fontFamily:'Inter,sans-serif',
                  border:`1.5px solid ${selected?.id===f.id ? S.gold : S.border}`,
                  background: selected?.id===f.id ? S.goldLt : S.white,
                  color:S.ink }}>
                <div style={{ fontSize:14, fontWeight:600,
                  fontFamily:'Cormorant Garamond,serif' }}>{f.name}</div>
                {f.concentration_type && (
                  <span style={{ fontSize:10, color:CONC_COLOR[f.concentration_type]?.c || S.textMid,
                    background:CONC_COLOR[f.concentration_type]?.bg, padding:'1px 8px',
                    borderRadius:10, marginTop:2, display:'inline-block' }}>
                    {f.concentration_type}
                  </span>
                )}
              </button>
            ))}
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
                            {b.produced_at}
                            {b.notes && ` · ${b.notes}`}
                          </div>
                          {b.qty_sold > 0 && (
                            <div style={{ fontSize:11, color:S.textMid, marginTop:2 }}>
                              ขายแล้ว {b.qty_sold} · เหลือ {b.qty_produced - b.qty_sold}
                            </div>
                          )}
                        </div>
                        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                          <StockBadge remaining={b.qty_produced - b.qty_sold}/>
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
    </div>
  )
}
