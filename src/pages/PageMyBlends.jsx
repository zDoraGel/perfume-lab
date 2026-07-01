import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { db } from '../lib/db'
import { S } from '../constants/theme'
import { BackBtn } from '../components/ui'
import MaterialPicker from '../components/MaterialPicker'
import AgingLogSection from '../components/AgingLogSection'
import LabelGenerator from '../components/LabelGenerator'

// ── helpers ───────────────────────────────────────────────────────────────────
function readyDate(blendedAt, restDays) {
  if (!blendedAt) return null
  const d = new Date(blendedAt)
  d.setDate(d.getDate() + (restDays || 14))
  return d
}

function daysLeft(blendedAt, restDays) {
  const rd = readyDate(blendedAt, restDays)
  if (!rd) return null
  const diff = Math.ceil((rd - new Date()) / 86400000)
  return diff
}

function StatusBadge({ status, blendedAt, restDays }) {
  const dl = daysLeft(blendedAt, restDays)
  let label, bg, color, border

  if (status === 'Sold Out') {
    label='Sold Out'; bg='#f0f0f0'; color=S.textLt; border=S.border
  } else if (dl === null || dl <= 0) {
    label='Ready to Sell'; bg=S.greenBg; color=S.green; border='#c5dfc8'
  } else {
    label=`Resting · ${dl}d`; bg='#f0f4ff'; color='#4a6aa8'; border='#c0cce8'
  }

  return (
    <span style={{ fontSize:10, fontWeight:600, padding:'3px 10px', borderRadius:20,
      background:bg, color, border:`1px solid ${border}`,
      fontFamily:'Inter,sans-serif', letterSpacing:.3 }}>
      {label}
    </span>
  )
}

// ── DB helpers ─────────────────────────────────────────────────────────────────
async function getAdaptations() {
  const { data } = await supabase.from('adaptations').select('*').order('created_at', { ascending:false })
  return data || []
}
async function getVersions(adaptationId) {
  const { data } = await supabase.from('adaptation_versions').select('*')
    .eq('adaptation_id', adaptationId).order('ver')
  return data || []
}
async function getItems(versionId) {
  const { data } = await supabase.from('adaptation_items')
    .select('*, material:materials(*)').eq('adaptation_version_id', versionId)
  return data || []
}

// ── VersionForm ───────────────────────────────────────────────────────────────
function VersionForm({ adaptationId, ver, materials, onSaved, onCancel }) {
  const [sourcePct,  setSourcePct]  = useState('20')
  const [alcohols,   setAlcohols]   = useState([{ name:'DEB', ml:'' }])
  const [batchMl,    setBatchMl]    = useState('30')
  const [qty,        setQty]        = useState('1')
  const [blendedAt,  setBlendedAt]  = useState(new Date().toISOString().split('T')[0])
  const [restDays,   setRestDays]   = useState('14')
  const [notes,      setNotes]      = useState('')
  const [items,      setItems]      = useState([{ matId:'', grams:'' }])
  const [sellPrice,  setSellPrice]  = useState('')
  const [saving,     setSaving]     = useState(false)

  const iStyle = { width:'100%', padding:'8px 12px', borderRadius:8, fontSize:14,
    fontFamily:'Inter,sans-serif', color:S.ink, background:S.white,
    border:`1px solid ${S.border}`, outline:'none', boxSizing:'border-box' }

  async function save() {
    setSaving(true)
    const { data: v } = await supabase.from('adaptation_versions').insert({
      adaptation_id: adaptationId, ver,
      source_pct:    parseFloat(sourcePct) || 0,
      alcohol_pct:   alcohols.reduce((s,a) => s + (parseFloat(a.ml)||0), 0) / (parseFloat(batchMl)||30) * 100,
      alcohol_notes: JSON.stringify(alcohols.filter(a=>a.name&&a.ml)),
      batch_ml:      parseInt(batchMl) || 30,
      qty_bottles:   parseInt(qty) || 1,
      blended_at:    blendedAt,
      rest_days:     parseInt(restDays) || 14,
      notes:         notes || null,
      sell_price:    sellPrice ? parseFloat(sellPrice) : null,
      status:        'Resting', qty_sold: 0,
    }).select().single()

    if (v) {
      const validItems = items.filter(i => i.matId && i.grams)
      if (validItems.length) {
        await supabase.from('adaptation_items').insert(
          validItems.map(i => ({
            adaptation_version_id: v.id,
            material_id: parseInt(i.matId),
            grams: parseFloat(i.grams),
          }))
        )
      }
    }
    setSaving(false)
    onSaved()
  }

  return (
    <div style={{ background:S.goldLt, border:`1px solid ${S.goldBd}`,
      borderRadius:12, padding:16, marginBottom:12 }}>
      <div style={{ fontSize:12, fontWeight:700, color:S.gold, letterSpacing:1,
        textTransform:'uppercase', marginBottom:12 }}>V{ver} — บันทึกการผสม</div>

      {/* สัดส่วน */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
        <div>
          <div style={{ fontSize:10, color:S.textMid, marginBottom:6, textTransform:'uppercase', letterSpacing:.5 }}>หัวเชื้อ (ml)</div>
          <input type="number" value={sourcePct} onChange={e=>setSourcePct(e.target.value)} style={iStyle} placeholder="เช่น 6"/>
        </div>
        <div>
          <div style={{ fontSize:10, color:S.textMid, marginBottom:6, textTransform:'uppercase', letterSpacing:.5 }}>Alcohol (ml)</div>
          {alcohols.map((alc, i) => (
            <div key={i} style={{ marginBottom:8 }}>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:4 }}>
                {['DEB','BLISS','Ethanol 95%','IPM','DPG','Fixateur','Cétiol CC'].map(n => (
                  <button key={n} onClick={() => setAlcohols(p => p.map((x,j) => j===i ? {...x, name:n} : x))}
                    style={{ padding:'4px 10px', borderRadius:16, cursor:'pointer',
                      fontSize:11, fontFamily:'Inter,sans-serif', fontWeight:500,
                      border:`1.5px solid ${alc.name===n?S.gold:S.goldBd}`,
                      background: alc.name===n?S.gold:'transparent',
                      color: alc.name===n?'#fff':S.gold }}>
                    {n}
                  </button>
                ))}
              </div>
              {/* custom name ถ้าไม่อยู่ใน preset */}
              {!['DEB','BLISS','Ethanol 95%','IPM','DPG','Fixateur','Cétiol CC'].includes(alc.name) && (
                <input placeholder="ชื่อ alcohol..." value={alc.name}
                  onChange={e => setAlcohols(p => p.map((x,j) => j===i ? {...x, name:e.target.value} : x))}
                  style={{ ...iStyle, marginBottom:4 }}/>
              )}
              <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                <button onClick={() => setAlcohols(p => p.map((x,j) => j===i ? {...x, name:''} : x))}
                  style={{ fontSize:10, color:S.textLt, background:'none', border:`1px solid ${S.border}`,
                    borderRadius:12, padding:'3px 8px', cursor:'pointer' }}>
                  + อื่นๆ
                </button>
                <input type="number" placeholder="ml" value={alc.ml}
                  onChange={e => setAlcohols(p => p.map((x,j) => j===i ? {...x, ml:e.target.value} : x))}
                  style={{ ...iStyle, width:80 }}/>
                <span style={{ fontSize:11, color:S.textMid }}>ml</span>
                {alcohols.length > 1 && (
                  <button onClick={() => setAlcohols(p => p.filter((_,j)=>j!==i))}
                    style={{ color:S.textLt, background:'none', border:'none', cursor:'pointer', fontSize:16 }}>×</button>
                )}
              </div>
            </div>
          ))}
          {alcohols.length < 3 && (
            <button onClick={() => setAlcohols(p => [...p, { name:'DEB', ml:'' }])}
              style={{ fontSize:11, color:S.gold, background:'none', border:'none', cursor:'pointer', padding:'4px 0' }}>
              + เพิ่ม alcohol
            </button>
          )}
        </div>
      </div>

      {/* batch + qty */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
        <div>
          <div style={{ fontSize:10, color:S.textMid, marginBottom:4, textTransform:'uppercase', letterSpacing:.5 }}>Batch (ml)</div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {[5,10,15,30,50,100].map(ml => (
              <button key={ml} onClick={() => setBatchMl(String(ml))}
                style={{ padding:'5px 10px', borderRadius:16, cursor:'pointer',
                  fontSize:12, fontFamily:'Inter,sans-serif', fontWeight:500,
                  border:`1.5px solid ${batchMl===String(ml)?S.gold:S.goldBd}`,
                  background: batchMl===String(ml)?S.gold:'transparent',
                  color: batchMl===String(ml)?'#fff':S.gold }}>
                {ml}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize:10, color:S.textMid, marginBottom:4, textTransform:'uppercase', letterSpacing:.5 }}>จำนวน (ขวด)</div>
          <input type="number" value={qty} onChange={e=>setQty(e.target.value)} style={iStyle} placeholder="1"/>
        </div>
      </div>

      {/* วันที่ + rest */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
        <div>
          <div style={{ fontSize:10, color:S.textMid, marginBottom:4, textTransform:'uppercase', letterSpacing:.5 }}>วันที่ผสม</div>
          <input type="date" value={blendedAt} onChange={e=>setBlendedAt(e.target.value)} style={iStyle}/>
        </div>
        <div>
          <div style={{ fontSize:10, color:S.textMid, marginBottom:4, textTransform:'uppercase', letterSpacing:.5 }}>Rest (วัน)</div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {[3,7,14,21,30].map(d => (
              <button key={d} onClick={() => setRestDays(String(d))}
                style={{ padding:'5px 10px', borderRadius:16, cursor:'pointer',
                  fontSize:12, fontFamily:'Inter,sans-serif', fontWeight:500,
                  border:`1.5px solid ${restDays===String(d)?S.gold:S.goldBd}`,
                  background: restDays===String(d)?S.gold:'transparent',
                  color: restDays===String(d)?'#fff':S.gold }}>
                {d}d
              </button>
            ))}
          </div>
          {blendedAt && (
            <div style={{ fontSize:10, color:S.green, marginTop:4 }}>
              ขายได้: {readyDate(blendedAt, parseInt(restDays))?.toLocaleDateString('th-TH')}
            </div>
          )}
        </div>
      </div>

      {/* Materials เพิ่ม */}
      <div style={{ marginBottom:10 }}>
        <div style={{ fontSize:10, color:S.textMid, marginBottom:6, textTransform:'uppercase', letterSpacing:.5 }}>
          Materials ที่เพิ่ม (Iso E, Musk ฯลฯ)
        </div>
        {items.map((item, i) => {
          const mat = materials.find(m => String(m.id) === String(item.matId))
          const family = mat?.family || ''
          const density = ['Citrus','Fresh'].includes(family) ? 0.88
            : ['Woody','Ambery','Gourmand'].includes(family) ? 1.05 : 0.95
          return (
          <div key={i} style={{ display:'flex', gap:6, alignItems:'center', marginBottom:6 }}>
            <div style={{ flex:1, minWidth:0 }}>
              <MaterialPicker materials={materials} value={item.matId}
                onChange={(id) => setItems(p => p.map((x,j) => j===i ? {...x, matId:id} : x))}
                placeholder="ค้นหา ingredient..."/>
            </div>
            <input type="number" placeholder="g" value={item.grams}
              onChange={e => {
                const g = e.target.value
                const ml = g ? (parseFloat(g) / density).toFixed(3) : ''
                setItems(p => p.map((x,j) => j===i ? {...x, grams:g, ml} : x))
              }}
              style={{ ...iStyle, width:52, flex:'none', padding:'8px 6px' }}/>
            <input type="number" placeholder="ml" value={item.ml||''}
              onChange={e => {
                const ml = e.target.value
                const g = ml ? (parseFloat(ml) * density).toFixed(3) : ''
                setItems(p => p.map((x,j) => j===i ? {...x, ml, grams:g} : x))
              }}
              style={{ ...iStyle, width:52, flex:'none', padding:'8px 6px' }}/>
            <button onClick={() => setItems(p => p.filter((_,j)=>j!==i))}
              style={{ color:S.textLt, background:'none', border:'none', cursor:'pointer', fontSize:16, flexShrink:0 }}>×</button>
          </div>
          )
        })}
        <button onClick={() => setItems(p => [...p, { matId:'', grams:'' }])}
          style={{ fontSize:12, color:S.gold, background:'none', border:'none', cursor:'pointer', padding:'4px 0' }}>
          + เพิ่ม material
        </button>
      </div>

      {/* Notes */}
      <div style={{ marginBottom:12 }}>
        <div style={{ fontSize:10, color:S.textMid, marginBottom:4, textTransform:'uppercase', letterSpacing:.5 }}>Notes</div>
        <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={2}
          placeholder="เช่น เพิ่ม Iso E 5% เพื่อให้พุ่งขึ้น, ลด source เพราะแรงไป..."
          style={{ ...iStyle, resize:'none' }}/>
      </div>

      {/* ราคาขาย */}
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:10, color:S.textMid, marginBottom:4, textTransform:'uppercase', letterSpacing:.5 }}>
          ราคาขาย (฿/ขวด)
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <input type="number" inputMode="decimal" value={sellPrice}
            onChange={e => setSellPrice(e.target.value)}
            placeholder="เช่น 490"
            style={{ ...iStyle, marginBottom:0, flex:1 }}/>
          {sellPrice && qty && (
            <div style={{ fontSize:12, color:S.green, fontWeight:600, flexShrink:0 }}>
              รวม ฿{(parseFloat(sellPrice) * parseInt(qty || 1)).toLocaleString()}
            </div>
          )}
        </div>
        <div style={{ fontSize:10, color:S.textLt, marginTop:4 }}>
          * ราคาที่กำหนดเองต่อขวด — ใช้คำนวณกำไรใน My Blends
        </div>
      </div>

      <div style={{ display:'flex', gap:8 }}>
        <button onClick={save} disabled={saving}
          style={{ flex:1, padding:'10px 0', borderRadius:10, cursor:'pointer',
            fontFamily:'Inter,sans-serif', fontSize:13, fontWeight:600,
            background:S.gold, border:'none', color:'#fff', opacity: saving ? 0.6 : 1 }}>
          {saving ? 'Saving...' : '✓ บันทึก'}
        </button>
        <button onClick={onCancel}
          style={{ padding:'10px 16px', borderRadius:10, cursor:'pointer',
            fontFamily:'Inter,sans-serif', fontSize:12,
            background:'transparent', border:`1px solid ${S.border}`, color:S.textMid }}>
          ยกเลิก
        </button>
      </div>
    </div>
  )
}

// ── VersionCard ───────────────────────────────────────────────────────────────
function VersionCard({ v, materials, onUpdate, blendName }) {
  const [items,      setItems]      = useState([])
  const [expanded,   setExpanded]   = useState(false)
  const [soldInput,  setSoldInput]  = useState(String(v.qty_sold || 0))
  const [saving,     setSaving]     = useState(false)
  const [showGiveaway, setShowGiveaway] = useState(false)
  const [giveawayMl,   setGiveawayMl]  = useState('')
  const [giveawayNote, setGiveawayNote] = useState('')
  const [giveawaySaving, setGiveawaySaving] = useState(false)
  const [giveawayLogs, setGiveawayLogs] = useState([])
  const [showLabel, setShowLabel] = useState(false)

  useEffect(() => {
    loadGiveawayLogs()
  }, [v.id])

  async function loadGiveawayLogs() {
    const { data } = await supabase.from('blend_giveaway_logs')
      .select('*').eq('version_id', v.id).order('created_at', { ascending: false })
    setGiveawayLogs(data || [])
  }
  const [editing,    setEditing]    = useState(false)

  // edit states
  const [eSrcPct,  setESrcPct]  = useState(String(v.source_pct  || ''))
  const [eAlcohols, setEAlcohols] = useState(() => {
    try { return JSON.parse(v.alcohol_notes || '[]').length ? JSON.parse(v.alcohol_notes) : [{ name:'DEB', ml:'' }] }
    catch { return [{ name:'DEB', ml: String(v.alcohol_pct || '') }] }
  })
  const [eBatchMl, setEBatchMl] = useState(String(v.batch_ml    || ''))
  const [eQty,     setEQty]     = useState(String(v.qty_bottles || ''))
  const [eDate,    setEDate]    = useState(v.blended_at || '')
  const [eRest,    setERest]    = useState(String(v.rest_days   || '14'))
  const [eNotes,   setENotes]   = useState(v.notes || '')
  const [ePrice,   setEPrice]   = useState(String(v.sell_price  || ''))
  const [eItems,   setEItems]   = useState([])

  useEffect(() => {
    if (expanded || editing) getItems(v.id).then(d => {
      setItems(d)
      setEItems(d.map(i => ({ id: i.id, matId: String(i.material_id), grams: String(i.grams) })))
    })
  }, [expanded, editing])

  const remaining = (v.qty_bottles || 0) - (v.qty_sold || 0)
  const dl = daysLeft(v.blended_at, v.rest_days)
  const isReady = !dl || dl <= 0

  const iStyle = { width:'100%', padding:'7px 10px', borderRadius:8, fontSize:13,
    fontFamily:'Inter,sans-serif', color:S.ink, background:S.white,
    border:`1px solid ${S.border}`, outline:'none', boxSizing:'border-box' }

  async function saveEdit() {
    setSaving(true)
    const newQtyBottles = parseInt(eQty) || 1
    const stillFullySold = (v.qty_sold || 0) >= newQtyBottles && newQtyBottles > 0
    const newStatus = stillFullySold ? 'Sold Out' : (v.status === 'Sold Out' ? null : v.status)
    await supabase.from('adaptation_versions').update({
      source_pct:  parseFloat(eSrcPct)  || 0,
      alcohol_pct:   eAlcohols.reduce((s,a) => s + (parseFloat(a.ml)||0), 0) / (parseInt(eBatchMl)||30) * 100,
      alcohol_notes: JSON.stringify(eAlcohols.filter(a=>a.name&&a.ml)),
      batch_ml:    parseInt(eBatchMl)   || 30,
      qty_bottles: newQtyBottles,
      blended_at:  eDate,
      rest_days:   parseInt(eRest)      || 14,
      notes:       eNotes || null,
      sell_price:  ePrice ? parseFloat(ePrice) : null,
      status:      newStatus,
    }).eq('id', v.id)

    // update items — delete all then re-insert
    await supabase.from('adaptation_items').delete().eq('adaptation_version_id', v.id)
    const validItems = eItems.filter(i => i.matId && i.grams)
    if (validItems.length) {
      await supabase.from('adaptation_items').insert(
        validItems.map(i => ({
          adaptation_version_id: v.id,
          material_id: parseInt(i.matId),
          grams: parseFloat(i.grams),
        }))
      )
    }
    setSaving(false)
    setEditing(false)
    onUpdate()
  }

  async function updateSold() {
    setSaving(true)
    const sold = parseInt(soldInput) || 0
    const isFullySold = sold >= (v.qty_bottles || 0) && (v.qty_bottles || 0) > 0
    // ขายครบ → Sold Out / ขายไม่ครบ (รวมถึงกรณีแก้ยอดขายลดลงทีหลัง) → เคลียร์ status พิเศษ
    // กลับไปให้ daysLeft() คำนวณ Resting/Ready ตามวันที่จริง
    const newStatus = isFullySold ? 'Sold Out' : null
    await supabase.from('adaptation_versions').update({ qty_sold: sold, status: newStatus }).eq('id', v.id)
    setSaving(false)
    onUpdate()
  }

  async function saveGiveaway() {
    const ml = parseFloat(giveawayMl)
    if (!ml || ml <= 0) return alert('กรอกจำนวน ml ที่แจกก่อนค่ะ')
    setGiveawaySaving(true)
    const { error } = await supabase.from('blend_giveaway_logs').insert({
      version_id: v.id,
      ml_given: ml,
      note: giveawayNote.trim() || null,
      given_at: new Date().toISOString().split('T')[0],
    })
    setGiveawaySaving(false)
    if (error) {
      alert('บันทึกไม่สำเร็จ: ' + error.message)
      return
    }
    setShowGiveaway(false)
    setGiveawayMl('')
    setGiveawayNote('')
    loadGiveawayLogs()
    onUpdate()
  }

  async function markReady() {
    await supabase.from('adaptation_versions').update({ status:'Ready' }).eq('id', v.id)
    onUpdate()
  }

  return (
    <div style={{ background:S.white, border:`1px solid ${S.border}`, borderRadius:12,
      marginBottom:8, overflow:'hidden' }}>
      <div onClick={() => !editing && setExpanded(p=>!p)}
        style={{ padding:'12px 14px', cursor:'pointer',
          display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:4 }}>
            <span style={{ fontSize:13, fontWeight:600, color:S.ink,
              fontFamily:'Inter,sans-serif' }}>V{v.ver}</span>
            <StatusBadge status={v.status} blendedAt={v.blended_at} restDays={v.rest_days}/>
          </div>
          <div style={{ fontSize:11, color:S.textMid }}>
            {v.blended_at} · {v.batch_ml}ml · {v.qty_bottles} ขวด · เหลือ {remaining} ขวด
          </div>
          <div style={{ fontSize:11, color:S.textLt, marginTop:2 }}>
            หัวเชื้อ {v.source_pct}ml · {(() => {
              try {
                const alcs = JSON.parse(v.alcohol_notes || '[]')
                if (alcs.length) return alcs.map(a => `${a.name} ${a.ml}ml`).join(' + ')
              } catch {}
              return `Alcohol ${v.alcohol_pct?.toFixed(0)}%`
            })()}
          </div>
          {v.sell_price != null && (
            <div style={{ display:'flex', gap:10, alignItems:'center', marginTop:5, flexWrap:'wrap' }}>
              <span style={{ fontSize:12, fontWeight:700, color:S.green }}>
                ฿{Number(v.sell_price).toLocaleString()} / ขวด
              </span>
              <span style={{ fontSize:10, color:S.textLt }}>
                รวม ฿{(v.sell_price * (v.qty_bottles || 1)).toLocaleString()}
              </span>
              {v.qty_sold > 0 && (
                <span style={{ fontSize:10, color:S.green, fontWeight:600 }}>
                  · ขายแล้ว ฿{(v.sell_price * v.qty_sold).toLocaleString()}
                </span>
              )}
            </div>
          )}
        </div>
        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
          <button onClick={e => { e.stopPropagation(); setShowLabel(true) }}
            style={{ fontSize:11, color:S.textMid, background:S.white,
              border:`1px solid ${S.border}`, borderRadius:16,
              padding:'3px 10px', cursor:'pointer',
              fontFamily:'Inter,sans-serif', fontWeight:500 }}>
            🏷 Label
          </button>
          <button onClick={e => { e.stopPropagation(); setEditing(p=>!p); setExpanded(false) }}
            style={{ fontSize:11, color: editing ? S.red : S.gold,
              background: editing ? '#faeaea' : S.goldLt,
              border:`1px solid ${editing ? S.red+'33' : S.goldBd}`,
              borderRadius:16, padding:'3px 10px', cursor:'pointer',
              fontFamily:'Inter,sans-serif', fontWeight:500 }}>
            {editing ? '✕ ยกเลิก' : '✎ แก้ไข'}
          </button>
          {!editing && <span style={{ color:S.textLt, fontSize:14 }}>{expanded ? '▲' : '▼'}</span>}
        </div>
      </div>

      {/* ── Label Generator ── */}
      {showLabel && (
        <LabelGenerator
          formula={{ name: blendName || '' }}
          latestVersion={{ bottle_ml: v.batch_ml || 15 }}
          defaultCollection="INSPIRED COLLECTION"
          onClose={() => setShowLabel(false)}/>
      )}

      {/* ── Edit Form ── */}
      {editing && (
        <div style={{ borderTop:`1px solid ${S.border}`, padding:'14px 14px',
          background:S.goldLt }}>
          <div style={{ fontSize:11, fontWeight:700, color:S.gold, letterSpacing:1,
            textTransform:'uppercase', marginBottom:12 }}>แก้ไข V{v.ver}</div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
            <div>
              <div style={{ fontSize:10, color:S.textMid, marginBottom:4, textTransform:'uppercase', letterSpacing:.5 }}>หัวเชื้อ (ml)</div>
              <input type="number" value={eSrcPct} onChange={e=>setESrcPct(e.target.value)} style={iStyle}/>
            </div>
            <div>
              <div style={{ fontSize:10, color:S.textMid, marginBottom:4, textTransform:'uppercase', letterSpacing:.5 }}>Alcohol (ml)</div>
              {eAlcohols.map((alc, i) => (
                <div key={i} style={{ marginBottom:8 }}>
                  <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:4 }}>
                    {['DEB','BLISS','Ethanol 95%','IPM','DPG','Fixateur','Cétiol CC'].map(n => (
                      <button key={n} onClick={() => setEAlcohols(p => p.map((x,j) => j===i ? {...x, name:n} : x))}
                        style={{ padding:'3px 9px', borderRadius:14, cursor:'pointer',
                          fontSize:10, fontFamily:'Inter,sans-serif', fontWeight:500,
                          border:`1.5px solid ${alc.name===n?S.gold:S.goldBd}`,
                          background: alc.name===n?S.gold:'transparent',
                          color: alc.name===n?'#fff':S.gold }}>
                        {n}
                      </button>
                    ))}
                  </div>
                  {!['DEB','BLISS','Ethanol 95%','IPM','DPG','Fixateur','Cétiol CC'].includes(alc.name) && (
                    <input placeholder="ชื่อ alcohol..." value={alc.name}
                      onChange={e => setEAlcohols(p => p.map((x,j) => j===i ? {...x, name:e.target.value} : x))}
                      style={{ ...iStyle, marginBottom:4 }}/>
                  )}
                  <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                    <button onClick={() => setEAlcohols(p => p.map((x,j) => j===i ? {...x, name:''} : x))}
                      style={{ fontSize:10, color:S.textLt, background:'none', border:`1px solid ${S.border}`,
                        borderRadius:12, padding:'3px 8px', cursor:'pointer' }}>
                      + อื่นๆ
                    </button>
                    <input type="number" placeholder="ml" value={alc.ml}
                      onChange={e => setEAlcohols(p => p.map((x,j) => j===i ? {...x, ml:e.target.value} : x))}
                      style={{ ...iStyle, width:80 }}/>
                    <span style={{ fontSize:11, color:S.textMid }}>ml</span>
                    {eAlcohols.length > 1 && (
                      <button onClick={() => setEAlcohols(p => p.filter((_,j)=>j!==i))}
                        style={{ color:S.textLt, background:'none', border:'none', cursor:'pointer', fontSize:16 }}>×</button>
                    )}
                  </div>
                </div>
              ))}
              {eAlcohols.length < 3 && (
                <button onClick={() => setEAlcohols(p => [...p, { name:'DEB', ml:'' }])}
                  style={{ fontSize:11, color:S.gold, background:'none', border:'none', cursor:'pointer', padding:'4px 0' }}>
                  + เพิ่ม alcohol
                </button>
              )}
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
            <div>
              <div style={{ fontSize:10, color:S.textMid, marginBottom:4, textTransform:'uppercase', letterSpacing:.5 }}>Batch (ml)</div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {[5,10,15,30,50,100].map(ml => (
                  <button key={ml} onClick={() => setEBatchMl(String(ml))}
                    style={{ padding:'4px 9px', borderRadius:14, cursor:'pointer',
                      fontSize:11, fontFamily:'Inter,sans-serif', fontWeight:500,
                      border:`1.5px solid ${eBatchMl===String(ml)?S.gold:S.goldBd}`,
                      background: eBatchMl===String(ml)?S.gold:'transparent',
                      color: eBatchMl===String(ml)?'#fff':S.gold }}>
                    {ml}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize:10, color:S.textMid, marginBottom:4, textTransform:'uppercase', letterSpacing:.5 }}>จำนวน (ขวด)</div>
              <input type="number" value={eQty} onChange={e=>setEQty(e.target.value)} style={iStyle}/>
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
            <div>
              <div style={{ fontSize:10, color:S.textMid, marginBottom:4, textTransform:'uppercase', letterSpacing:.5 }}>วันที่ผสม</div>
              <input type="date" value={eDate} onChange={e=>setEDate(e.target.value)} style={iStyle}/>
            </div>
            <div>
              <div style={{ fontSize:10, color:S.textMid, marginBottom:4, textTransform:'uppercase', letterSpacing:.5 }}>Rest (วัน)</div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {[3,7,14,21,30].map(d => (
                  <button key={d} onClick={() => setERest(String(d))}
                    style={{ padding:'4px 9px', borderRadius:14, cursor:'pointer',
                      fontSize:11, fontFamily:'Inter,sans-serif', fontWeight:500,
                      border:`1.5px solid ${eRest===String(d)?S.gold:S.goldBd}`,
                      background: eRest===String(d)?S.gold:'transparent',
                      color: eRest===String(d)?'#fff':S.gold }}>
                    {d}d
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Materials */}
          <div style={{ marginBottom:10 }}>
            <div style={{ fontSize:10, color:S.textMid, marginBottom:6, textTransform:'uppercase', letterSpacing:.5 }}>
              Materials ที่เพิ่ม
            </div>
            {eItems.map((item, i) => {
              const mat = materials.find(m => String(m.id) === String(item.matId))
              const family = mat?.family || ''
              const density = ['Citrus','Fresh'].includes(family) ? 0.88
                : ['Woody','Ambery','Gourmand'].includes(family) ? 1.05 : 0.95
              return (
              <div key={i} style={{ display:'flex', gap:6, alignItems:'center', marginBottom:6 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <MaterialPicker materials={materials} value={item.matId}
                    onChange={(id) => setEItems(p => p.map((x,j) => j===i ? {...x, matId:id} : x))}
                    placeholder="ค้นหา ingredient..."/>
                </div>
                <input type="number" placeholder="g" value={item.grams}
                  onChange={e => {
                    const g = e.target.value
                    const ml = g ? (parseFloat(g) / density).toFixed(3) : ''
                    setEItems(p => p.map((x,j) => j===i ? {...x, grams:g, ml} : x))
                  }}
                  style={{ ...iStyle, width:52, flex:'none', padding:'8px 6px' }}/>
                <input type="number" placeholder="ml" value={item.ml||''}
                  onChange={e => {
                    const ml = e.target.value
                    const g = ml ? (parseFloat(ml) * density).toFixed(3) : ''
                    setEItems(p => p.map((x,j) => j===i ? {...x, ml, grams:g} : x))
                  }}
                  style={{ ...iStyle, width:52, flex:'none', padding:'8px 6px' }}/>
                <button onClick={() => setEItems(p => p.filter((_,j)=>j!==i))}
                  style={{ color:S.textLt, background:'none', border:'none', cursor:'pointer', fontSize:16, flexShrink:0 }}>×</button>
              </div>
              )
            })}
            <button onClick={() => setEItems(p => [...p, { matId:'', grams:'' }])}
              style={{ fontSize:12, color:S.gold, background:'none', border:'none', cursor:'pointer', padding:'4px 0' }}>
              + เพิ่ม material
            </button>
          </div>

          {/* Notes */}
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:10, color:S.textMid, marginBottom:4, textTransform:'uppercase', letterSpacing:.5 }}>Notes</div>
            <textarea value={eNotes} onChange={e=>setENotes(e.target.value)} rows={2}
              style={{ ...iStyle, resize:'none' }}/>
          </div>

          {/* ราคาขาย */}
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:10, color:S.textMid, marginBottom:4, textTransform:'uppercase', letterSpacing:.5 }}>
              ราคาขาย (฿/ขวด)
            </div>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <input type="number" inputMode="decimal" value={ePrice}
                onChange={e => setEPrice(e.target.value)}
                placeholder="เช่น 490"
                style={{ ...iStyle, marginBottom:0, flex:1 }}/>
              {ePrice && eQty && (
                <div style={{ fontSize:12, color:S.green, fontWeight:600, flexShrink:0 }}>
                  รวม ฿{(parseFloat(ePrice) * parseInt(eQty || 1)).toLocaleString()}
                </div>
              )}
            </div>
          </div>

          <button onClick={saveEdit} disabled={saving}
            style={{ width:'100%', padding:'10px 0', borderRadius:10, cursor:'pointer',
              fontFamily:'Inter,sans-serif', fontSize:13, fontWeight:600,
              background:S.gold, border:'none', color:'#fff', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving...' : '✓ บันทึกการแก้ไข'}
          </button>
        </div>
      )}

      {expanded && (
        <div style={{ borderTop:`1px solid ${S.border}`, padding:'12px 14px' }}>
          {/* Materials */}
          {items.length > 0 && (
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:10, fontWeight:700, color:S.gold, letterSpacing:.8,
                textTransform:'uppercase', marginBottom:6 }}>Materials ที่เพิ่ม</div>
              {items.map((item,i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between',
                  fontSize:12, marginBottom:4 }}>
                  <span style={{ color:S.ink, fontFamily:'Cormorant Garamond,serif',
                    fontStyle:'italic' }}>{item.material?.name || '—'}</span>
                  <span style={{ color:S.gold, fontWeight:500 }}>{item.grams}g</span>
                </div>
              ))}
            </div>
          )}

          {/* Notes */}
          {v.notes && (
            <div style={{ fontSize:12, color:S.textMid, fontStyle:'italic',
              padding:'8px 10px', background:S.bg, borderRadius:8, marginBottom:12, lineHeight:1.6 }}>
              "{v.notes}"
            </div>
          )}

          {/* Ready date */}
          <div style={{ fontSize:11, color: isReady ? S.green : '#4a6aa8', marginBottom:10 }}>
            {isReady
              ? '✓ พร้อมขายแล้ว'
              : `⏱ ขายได้: ${readyDate(v.blended_at, v.rest_days)?.toLocaleDateString('th-TH')} (อีก ${dl} วัน)`}
          </div>

          {/* ขายแล้ว */}
          <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:8 }}>
            <div style={{ fontSize:11, color:S.textMid, flexShrink:0 }}>ขายแล้ว:</div>
            <input type="number" value={soldInput} onChange={e=>setSoldInput(e.target.value)}
              min="0" max={v.qty_bottles}
              style={{ width:60, padding:'5px 8px', borderRadius:8, fontSize:13,
                fontFamily:'Inter,sans-serif', border:`1px solid ${S.border}`,
                color:S.ink, background:S.white, outline:'none' }}/>
            <span style={{ fontSize:11, color:S.textMid }}>/ {v.qty_bottles} ขวด</span>
            <button onClick={updateSold} disabled={saving}
              style={{ padding:'5px 14px', borderRadius:16, cursor:'pointer',
                fontFamily:'Inter,sans-serif', fontSize:11, fontWeight:600,
                background:S.gold, border:'none', color:'#fff' }}>
              {saving ? '...' : 'Update'}
            </button>
          </div>

          {!isReady && (
            <div style={{ fontSize:11, color:'#4a6aa8' }}>
              ⏱ ขายได้: {readyDate(v.blended_at, v.rest_days)?.toLocaleDateString('th-TH')} (อีก {dl} วัน)
            </div>
          )}

          {/* Aging Log */}
          <AgingLogSection versionId={v.id}/>

          {/* ── แจก giveaway/sample ── */}
          {!showGiveaway ? (
            <button onClick={() => setShowGiveaway(true)}
              style={{ marginTop:10, fontSize:11, color:S.gold, background:S.goldLt,
                border:`1px solid ${S.goldBd}`, borderRadius:16,
                padding:'5px 14px', cursor:'pointer', fontWeight:600,
                fontFamily:'Inter,sans-serif' }}>
              + แจก giveaway / sample
            </button>
          ) : (
            <div style={{ marginTop:10, padding:'12px 14px', background:S.goldLt,
              borderRadius:10, border:`1px solid ${S.goldBd}` }}>
              <div style={{ fontSize:12, fontWeight:700, color:S.gold, marginBottom:10 }}>
                + แจก giveaway / sample
              </div>
              <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:8 }}>
                <input type="number" step="0.1" value={giveawayMl}
                  onChange={e => setGiveawayMl(e.target.value)}
                  placeholder="ml ที่แจก"
                  style={{ width:90, padding:'6px 10px', borderRadius:8, fontSize:13,
                    border:`1px solid ${S.border}`, fontFamily:'Inter,sans-serif',
                    color:S.ink, background:S.white, outline:'none' }}/>
                <span style={{ fontSize:11, color:S.textMid }}>ml</span>
              </div>
              <input value={giveawayNote} onChange={e => setGiveawayNote(e.target.value)}
                placeholder="ใครได้ไป / เหตุผล (optional)"
                style={{ width:'100%', padding:'6px 10px', borderRadius:8, fontSize:13,
                  border:`1px solid ${S.border}`, fontFamily:'Inter,sans-serif',
                  color:S.ink, background:S.white, outline:'none', boxSizing:'border-box',
                  marginBottom:10 }}/>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => { setShowGiveaway(false); setGiveawayMl(''); setGiveawayNote('') }}
                  style={{ padding:'6px 14px', borderRadius:16, cursor:'pointer',
                    fontSize:11, fontWeight:600, fontFamily:'Inter,sans-serif',
                    background:'transparent', border:`1px solid ${S.border}`, color:S.textMid }}>
                  ยกเลิก
                </button>
                <button onClick={saveGiveaway} disabled={giveawaySaving || !giveawayMl}
                  style={{ flex:1, padding:'6px 0', borderRadius:16, cursor:'pointer',
                    fontSize:11, fontWeight:600, fontFamily:'Inter,sans-serif',
                    background:S.gold, border:'none', color:'#fff',
                    opacity: giveawaySaving || !giveawayMl ? .6 : 1 }}>
                  {giveawaySaving ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
              </div>
            </div>
          )}

          {/* ── ประวัติการแจก ── */}
          {giveawayLogs.length > 0 && (
            <div style={{ marginTop:10 }}>
              <div style={{ fontSize:10, fontWeight:700, color:S.gold,
                letterSpacing:.8, textTransform:'uppercase', marginBottom:6 }}>
                🎁 แจกไปแล้ว
              </div>
              {giveawayLogs.map(log => (
                <div key={log.id} style={{ display:'flex', justifyContent:'space-between',
                  alignItems:'center', padding:'6px 10px', marginBottom:4,
                  background:S.bg, borderRadius:8, border:`1px solid ${S.border}` }}>
                  <div>
                    <span style={{ fontSize:12, fontWeight:600, color:S.ink }}>
                      {log.ml_given} ml
                    </span>
                    {log.note && (
                      <span style={{ fontSize:11, color:S.textMid, marginLeft:8 }}>
                        · {log.note}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize:10, color:S.textLt }}>{log.given_at}</span>
                </div>
              ))}
              {(() => {
                const totalGiven = giveawayLogs.reduce((s, l) => s + (l.ml_given || 0), 0)
                const batchMlTotal = v.batch_ml || 0
                const remaining = batchMlTotal - totalGiven
                return (
                  <div style={{ marginTop:6, padding:'6px 10px', borderRadius:8,
                    background: remaining < 0 ? '#faeaea' : S.goldLt,
                    border:`1px solid ${remaining < 0 ? S.red+'44' : S.goldBd}` }}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:11 }}>
                      <span style={{ color:S.textMid }}>รวมแจกไป</span>
                      <span style={{ fontWeight:600, color:S.gold }}>{totalGiven.toFixed(1)} ml</span>
                    </div>
                    {batchMlTotal > 0 && (
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginTop:2 }}>
                        <span style={{ color:S.textMid }}>คงเหลือ (จาก {batchMlTotal}ml)</span>
                        <span style={{ fontWeight:700, color: remaining < 0 ? S.red : S.green }}>
                          {remaining.toFixed(1)} ml
                        </span>
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
function BlendForm({ onSaved, onCancel, existingGroups = [] }) {
  const [name,       setName]       = useState('')
  const [blendGroup, setBlendGroup] = useState('')
  const [sourceName, setSourceName] = useState('')
  const [supplier,   setSupplier]   = useState('')
  const [bottleSize, setBottleSize] = useState('')  // ขนาดขวดที่ซื้อ (g)
  const [bottlePrice,setBottlePrice]= useState('')  // ราคารวมทั้งขวด (บาท)
  const [goal,       setGoal]       = useState('')
  const [saving,     setSaving]     = useState(false)

  // คำนวณราคา/กรัมจาก ขนาดขวด + ราคารวม — ไม่ต้องหารเองแล้ว กันกรอกผิดแบบ "110 บาท" ทั้งที่หมายถึงราคาทั้งขวด
  const sourceCost = (bottleSize && bottlePrice)
    ? parseFloat(bottlePrice) / parseFloat(bottleSize) : null

  const iStyle = { width:'100%', padding:'10px 14px', borderRadius:10, fontSize:14,
    fontFamily:'Inter,sans-serif', color:S.ink, background:S.white,
    border:`1px solid ${S.border}`, outline:'none', boxSizing:'border-box', marginBottom:10 }

  async function save() {
    if (!name.trim() || !sourceName.trim()) return
    setSaving(true)
    await supabase.from('adaptations').insert({
      name:            name.trim(),
      blend_group:     blendGroup.trim() || name.trim(),
      source_name:     sourceName.trim(),
      source_supplier: supplier.trim() || null,
      source_cost:     sourceCost,
      source_purchase_size: bottleSize ? parseFloat(bottleSize) : null,
      goal:            goal.trim() || null,
      is_winner:       false,
    })
    setSaving(false)
    onSaved()
  }

  return (
    <div style={{ background:S.goldLt, border:`1px solid ${S.goldBd}`,
      borderRadius:14, padding:18, marginBottom:16 }}>
      <div style={{ fontSize:12, fontWeight:700, color:S.gold, letterSpacing:1,
        textTransform:'uppercase', marginBottom:14 }}>+ Blend ใหม่</div>

      {/* Blend Group */}
      <div style={{ fontSize:10, color:S.textMid, marginBottom:4, textTransform:'uppercase', letterSpacing:.5 }}>
        Blend Group — ใส่ชื่อเดียวกันถ้าเทส supplier ต่างกัน
      </div>
      <input value={blendGroup} onChange={e=>setBlendGroup(e.target.value)}
        placeholder="เช่น Noir Lumière (จะ group รวมกัน)"
        style={iStyle}/>
      {existingGroups.length > 0 && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:10, marginTop:-6 }}>
          <span style={{ fontSize:10, color:S.textLt }}>group ที่มี:</span>
          {existingGroups.map(g => (
            <button key={g} onClick={() => setBlendGroup(g)}
              style={{ fontSize:11, color:S.gold, background:S.white,
                border:`1px solid ${S.goldBd}`, borderRadius:16,
                padding:'2px 10px', cursor:'pointer' }}>
              {g}
            </button>
          ))}
        </div>
      )}

      <div style={{ fontSize:10, color:S.textMid, marginBottom:4, textTransform:'uppercase', letterSpacing:.5 }}>ชื่อที่ตั้งเอง</div>
      <input value={name} onChange={e=>setName(e.target.value)}
        placeholder="เช่น Noir Lumière — PW, Noir Lumière — Thai Aroma"
        style={{ ...iStyle, fontFamily:'Cormorant Garamond,serif', fontStyle:'italic', fontSize:16 }}/>

      <div style={{ fontSize:10, color:S.textMid, marginBottom:4, textTransform:'uppercase', letterSpacing:.5 }}>หัวเชื้อเดิม / ที่มา</div>
      <input value={sourceName} onChange={e=>setSourceName(e.target.value)}
        placeholder="เช่น Aventus Clone, Black Oud Accord..."
        style={iStyle}/>

      <div style={{ display:'grid', gridTemplateColumns:'1fr' }}>
        <div>
          <div style={{ fontSize:10, color:S.textMid, marginBottom:4, textTransform:'uppercase', letterSpacing:.5 }}>Supplier</div>
          <input value={supplier} onChange={e=>setSupplier(e.target.value)}
            placeholder="เช่น Perfume World"
            style={iStyle}/>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <div>
          <div style={{ fontSize:10, color:S.textMid, marginBottom:4, textTransform:'uppercase', letterSpacing:.5 }}>ซื้อมา (กรัม)</div>
          <input type="number" value={bottleSize} onChange={e=>setBottleSize(e.target.value)}
            placeholder="เช่น 30"
            style={{ ...iStyle, marginBottom:0 }}/>
        </div>
        <div>
          <div style={{ fontSize:10, color:S.textMid, marginBottom:4, textTransform:'uppercase', letterSpacing:.5 }}>ราคารวมทั้งขวด (฿)</div>
          <input type="number" value={bottlePrice} onChange={e=>setBottlePrice(e.target.value)}
            placeholder="เช่น 110"
            style={{ ...iStyle, marginBottom:0 }}/>
        </div>
      </div>

      {/* Cost per bottle */}
      {sourceCost != null && (
        <div style={{ marginTop:8, padding:'10px 14px', borderRadius:10,
          background:'#f0ece4', border:`1px solid ${S.goldBd}`,
          display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ fontSize:11, color:S.textMid }}>
            ราคาหัวเชื้อ (คำนวณอัตโนมัติ)
          </div>
          <div style={{ fontSize:14, fontWeight:700, color:S.gold,
            fontFamily:'Cormorant Garamond,serif' }}>
            ฿{sourceCost.toFixed(2)}/g
          </div>
        </div>
      )}

      <div style={{ marginTop:10 }}>
        <div style={{ fontSize:10, color:S.textMid, marginBottom:4, textTransform:'uppercase', letterSpacing:.5 }}>เป้าหมาย</div>
        <textarea value={goal} onChange={e=>setGoal(e.target.value)} rows={2}
          placeholder="เช่น ให้ติดทนขึ้น พุ่งกว่าเดิม แต่ยังมีกลิ่นดอกไม้ของต้นฉบับ"
          style={{ ...iStyle, resize:'none' }}/>
      </div>

      <div style={{ display:'flex', gap:8, marginTop:4 }}>
        <button onClick={save} disabled={saving || !name.trim() || !sourceName.trim()}
          style={{ flex:1, padding:'10px 0', borderRadius:10, cursor:'pointer',
            fontFamily:'Inter,sans-serif', fontSize:13, fontWeight:600,
            background:S.gold, border:'none', color:'#fff',
            opacity: (!name.trim()||!sourceName.trim()||saving) ? 0.6 : 1 }}>
          {saving ? 'Saving...' : '✓ สร้าง Blend'}
        </button>
        <button onClick={onCancel}
          style={{ padding:'10px 16px', borderRadius:10, cursor:'pointer',
            fontFamily:'Inter,sans-serif', fontSize:12,
            background:'transparent', border:`1px solid ${S.border}`, color:S.textMid }}>
          ยกเลิก
        </button>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function PageMyBlends() {
  const [blends,      setBlends]      = useState([])
  const [materials,   setMaterials]   = useState([])
  const [loading,     setLoading]     = useState(true)
  const [showNew,     setShowNew]     = useState(false)
  const [selected,    setSelected]    = useState(null)
  const [versions,    setVersions]    = useState([])
  const [showVerForm, setShowVerForm] = useState(false)
  const [editingBlend, setEditingBlend] = useState(false)
  const [eName,       setEName]       = useState('')
  const [eSourceName, setESourceName] = useState('')
  const [eSupplier,   setESupplier]   = useState('')
  const [eSourceCost, setESourceCost] = useState('') // เก็บค่า fallback ถ้าไม่กรอกขนาด/ราคาขวดใหม่
  const [eBottleSize, setEBottleSize] = useState('')
  const [eBottlePrice, setEBottlePrice] = useState('')
  const [eGoal,       setEGoal]       = useState('')
  const [myBlendsExpenses, setMyBlendsExpenses] = useState(0)
  const [purchaseModal, setPurchaseModal] = useState(null) // blend ที่กำลังบันทึกการซื้อหัวเชื้อ
  const [purchaseSize, setPurchaseSize] = useState('')
  const [purchaseGroups, setPurchaseGroups] = useState(['myblends']) // default ติ๊ก myblends ไว้ก่อน
  const [purchaseSaving, setPurchaseSaving] = useState(false)
  const purchaseSavingRef = useRef(false) // กันกดซ้ำแบบ synchronous — ไม่ต้องรอ React re-render

  useEffect(() => {
    if (!selected?.id) { setMyBlendsExpenses(0); return }
    db.getExpensesByAdaptation(selected.id).then(setMyBlendsExpenses).catch(() => {})
  }, [selected?.id])

  useEffect(() => {
    Promise.all([getAdaptations(), db.getMaterials()]).then(([b, m]) => {
      setBlends(b); setMaterials(m); setLoading(false)
    })
  }, [])

  async function selectBlend(b) {
    setSelected(b); setShowVerForm(false)
    const v = await getVersions(b.id)
    setVersions(v)
  }

  async function reload() {
    if (selected) {
      const v = await getVersions(selected.id)
      setVersions(v)
    }
    const b = await getAdaptations()
    setBlends(b)
  }

  function startEditBlend() {
    setEName(selected.name || '')
    setESourceName(selected.source_name || '')
    setESupplier(selected.source_supplier || '')
    setESourceCost(selected.source_cost ? String(selected.source_cost) : '')
    // ถ้ามีบันทึกขนาดขวดที่ซื้อล่าสุดไว้ ให้คำนวณราคารวมกลับมาเป็นค่าเริ่มต้น (กรอกง่ายกว่าราคา/กรัม)
    if (selected.source_purchase_size && selected.source_cost) {
      setEBottleSize(String(selected.source_purchase_size))
      setEBottlePrice(String(Math.round(selected.source_purchase_size * selected.source_cost)))
    } else {
      setEBottleSize('')
      setEBottlePrice('')
    }
    setEGoal(selected.goal || '')
    setEditingBlend(true)
  }

  // ราคา/กรัมที่จะบันทึกจริง — คำนวณจากขนาดขวด+ราคารวมถ้ากรอกใหม่ ไม่งั้น fallback ใช้ค่าราคา/กรัมเดิม
  const eSourceCostComputed = (eBottleSize && eBottlePrice)
    ? parseFloat(eBottlePrice) / parseFloat(eBottleSize)
    : (eSourceCost ? parseFloat(eSourceCost) : null)

  async function saveBlendEdit() {
    await supabase.from('adaptations').update({
      name:            eName.trim(),
      source_name:     eSourceName.trim(),
      source_supplier: eSupplier.trim() || null,
      source_cost:     eSourceCostComputed,
      source_purchase_size: eBottleSize ? parseFloat(eBottleSize) : null,
      goal:            eGoal.trim() || null,
    }).eq('id', selected.id)
    setSelected(s => ({ ...s,
      name: eName.trim(), source_name: eSourceName.trim(),
      source_supplier: eSupplier.trim() || null,
      source_cost: eSourceCostComputed,
      source_purchase_size: eBottleSize ? parseFloat(eBottleSize) : null,
      goal: eGoal.trim() || null,
    }))
    setEditingBlend(false)
    reload()
  }

  async function deleteBlend(id) {
    if (!confirm('ลบ blend นี้?')) return
    await supabase.from('adaptations').delete().eq('id', id)
    setSelected(null); setVersions([])
    reload()
  }

  async function handleRecordSourcePurchase(blend, sizeG, groups) {
    if (purchaseSavingRef.current) return // กันกดซ้ำ — เช็คทันทีไม่รอ React re-render
    const size = parseFloat(sizeG)
    if (!size || size <= 0) { alert('กรอกจำนวนกรัมที่ซื้อ'); return }
    const total = size * (blend.source_cost || 0)
    purchaseSavingRef.current = true
    setPurchaseSaving(true)
    try {
      await db.createExpense({
        expense_date: new Date().toISOString().slice(0, 10),
        category: 'material',
        amount: total,
        note: `${blend.source_name}${blend.source_supplier ? ' ('+blend.source_supplier+')' : ''} ${size}g`,
        for_groups: groups,
        adaptation_id: blend.id,
      })
      // เก็บขนาดล่าสุดที่ซื้อไว้ดูย้อนหลังได้ (ไม่กระทบ source_cost ที่ใช้คำนวณต้นทุนต่อกรัมในสูตร)
      await supabase.from('adaptations').update({ source_purchase_size: size }).eq('id', blend.id)
      setPurchaseModal(null)
      setPurchaseSize('')
      setPurchaseGroups(['myblends'])
      reload()
      db.getExpensesByAdaptation(blend.id).then(setMyBlendsExpenses).catch(() => {})
    } catch (e) {
      alert('บันทึกไม่สำเร็จ: ' + e.message)
    }
    purchaseSavingRef.current = false
    setPurchaseSaving(false)
  }

  const totalReady   = versions.filter(v => v.status!=='Sold Out' && daysLeft(v.blended_at, v.rest_days)<=0).reduce((s,v)=>(s+(v.qty_bottles||0)-(v.qty_sold||0)),0)
  const totalResting = versions.filter(v => v.status!=='Sold Out' && daysLeft(v.blended_at, v.rest_days)>0).reduce((s,v)=>(s+(v.qty_bottles||0)-(v.qty_sold||0)),0)
  const totalRevenue = versions.reduce((s,v) => s + (v.sell_price != null ? v.sell_price * (v.qty_sold||0) : 0), 0)
  const netProfit = totalRevenue - myBlendsExpenses

  return (
    <div style={{ fontFamily:'Inter,sans-serif' }}>

      {/* Header */}
      <div style={{ marginBottom:20 }}>
        <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:28,
          color:S.ink, fontStyle:'italic', lineHeight:1 }}>My Blends</div>
        <div style={{ fontSize:12, color:S.textLt, marginTop:4 }}>
          Adapt จากหัวเชื้อ · เก็บ record การผสม · ติดตาม stock
        </div>
      </div>

      {/* New blend form */}
      {showNew ? (
        <BlendForm
          onSaved={() => { setShowNew(false); reload() }}
          onCancel={() => setShowNew(false)}
          existingGroups={[...new Set(blends.map(b => b.blend_group || b.name).filter(Boolean))]}/>
      ) : (
        <button onClick={() => setShowNew(true)}
          style={{ width:'100%', padding:'12px 0', borderRadius:12, cursor:'pointer',
            fontFamily:'Inter,sans-serif', fontSize:13, fontWeight:600,
            background:S.gold, border:'none', color:'#fff', marginBottom:16 }}>
          + Blend ใหม่
        </button>
      )}

      {loading && <div style={{ textAlign:'center', padding:40, color:S.textLt }}>Loading...</div>}

      {!loading && !selected && (
        <div>
          {blends.length === 0 ? (
            <div style={{ textAlign:'center', padding:'40px 0', color:S.textLt }}>
              <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:20,
                fontStyle:'italic', marginBottom:6 }}>ยังไม่มี blend</div>
              <div style={{ fontSize:13 }}>กด "+ Blend ใหม่" เพื่อเริ่มค่ะ</div>
            </div>
          ) : (() => {
            const groups = {}
            blends.forEach(b => {
              const g = b.blend_group || b.name
              if (!groups[g]) groups[g] = []
              groups[g].push(b)
            })
            return Object.entries(groups).map(([groupName, groupBlends]) => (
              <div key={groupName} style={{ marginBottom:16 }}>
                {groupBlends.length > 1 && (
                  <div style={{ fontSize:10, fontWeight:700, color:S.textMid,
                    letterSpacing:1, textTransform:'uppercase', marginBottom:8 }}>
                    ◎ {groupName} — เทส {groupBlends.length} suppliers
                  </div>
                )}
                {groupBlends.map(b => (
                  <div key={b.id} onClick={() => selectBlend(b)}
                    style={{ background: b.is_winner ? S.greenBg : S.white,
                      border:`1.5px solid ${b.is_winner ? '#c5dfc8' : S.border}`,
                      borderRadius:12, padding:'14px 16px', marginBottom:8, cursor:'pointer' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                      <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:18,
                        fontStyle:'italic', color:S.ink }}>{b.name}</div>
                      {b.is_winner && (
                        <span style={{ fontSize:11, fontWeight:700, color:S.green,
                          background:'#fff', border:`1px solid #c5dfc8`,
                          borderRadius:20, padding:'2px 10px' }}>🏆 Winner</span>
                      )}
                    </div>
                    <div style={{ fontSize:12, color:S.gold, marginTop:3 }}>
                      {b.source_supplier || b.source_name}
                      {b.source_cost && ` · ฿${b.source_cost}/g`}
                    </div>
                    {b.goal && <div style={{ fontSize:11, color:S.textMid, marginTop:4 }}>{b.goal}</div>}
                    <div style={{ fontSize:11, color:S.gold, fontWeight:500, marginTop:8 }}>ดู record →</div>
                  </div>
                ))}
              </div>
            ))
          })()}
        </div>
      )}

      {/* Selected blend detail */}
      {selected && (
        <div>
          {/* Back */}
          <button onClick={() => { setSelected(null); setVersions([]); setShowVerForm(false) }}
            style={{ background:'none', border:'none', color:S.gold, cursor:'pointer',
              fontSize:24, marginBottom:16, padding:0, display:'block' }}>
            ‹ Back
          </button>

          {/* Blend header */}
          <div style={{ background:S.goldLt, border:`1px solid ${S.goldBd}`,
            borderRadius:14, padding:'16px 18px', marginBottom:16 }}>

            {editingBlend ? (
              /* ── Edit mode ── */
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:S.gold, letterSpacing:1,
                  textTransform:'uppercase', marginBottom:12 }}>แก้ไข Blend</div>
                {[
                  { label:'ชื่อ', val:eName, set:setEName, placeholder:'ชื่อ blend' },
                  { label:'หัวเชื้อ / ที่มา', val:eSourceName, set:setESourceName, placeholder:'เช่น Aventus Clone' },
                  { label:'Supplier', val:eSupplier, set:setESupplier, placeholder:'เช่น Perfume World' },
                ].map(f => (
                  <div key={f.label} style={{ marginBottom:8 }}>
                    <div style={{ fontSize:10, color:S.textMid, marginBottom:3, textTransform:'uppercase', letterSpacing:.5 }}>{f.label}</div>
                    <input value={f.val} onChange={e=>f.set(e.target.value)} placeholder={f.placeholder}
                      style={{ width:'100%', padding:'8px 12px', borderRadius:8, fontSize:13,
                        fontFamily:'Inter,sans-serif', color:S.ink, background:S.white,
                        border:`1px solid ${S.border}`, outline:'none', boxSizing:'border-box' }}/>
                  </div>
                ))}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
                  <div>
                    <div style={{ fontSize:10, color:S.textMid, marginBottom:3, textTransform:'uppercase', letterSpacing:.5 }}>ซื้อมา (กรัม)</div>
                    <input type="number" value={eBottleSize} onChange={e=>setEBottleSize(e.target.value)} placeholder="เช่น 30"
                      style={{ width:'100%', padding:'8px 12px', borderRadius:8, fontSize:13,
                        fontFamily:'Inter,sans-serif', color:S.ink, background:S.white,
                        border:`1px solid ${S.border}`, outline:'none', boxSizing:'border-box' }}/>
                  </div>
                  <div>
                    <div style={{ fontSize:10, color:S.textMid, marginBottom:3, textTransform:'uppercase', letterSpacing:.5 }}>ราคารวมทั้งขวด (฿)</div>
                    <input type="number" value={eBottlePrice} onChange={e=>setEBottlePrice(e.target.value)} placeholder="เช่น 110"
                      style={{ width:'100%', padding:'8px 12px', borderRadius:8, fontSize:13,
                        fontFamily:'Inter,sans-serif', color:S.ink, background:S.white,
                        border:`1px solid ${S.border}`, outline:'none', boxSizing:'border-box' }}/>
                  </div>
                </div>
                {eSourceCostComputed != null && (
                  <div style={{ fontSize:11, color:S.gold, marginBottom:8 }}>
                    = ฿{eSourceCostComputed.toFixed(2)}/g
                  </div>
                )}
                <div style={{ marginBottom:12 }}>
                  <div style={{ fontSize:10, color:S.textMid, marginBottom:3, textTransform:'uppercase', letterSpacing:.5 }}>เป้าหมาย</div>
                  <textarea value={eGoal} onChange={e=>setEGoal(e.target.value)} rows={2}
                    style={{ width:'100%', padding:'8px 12px', borderRadius:8, fontSize:13,
                      fontFamily:'Inter,sans-serif', color:S.ink, background:S.white,
                      border:`1px solid ${S.border}`, outline:'none', boxSizing:'border-box', resize:'none' }}/>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={saveBlendEdit}
                    style={{ flex:1, padding:'9px 0', borderRadius:10, cursor:'pointer',
                      fontFamily:'Inter,sans-serif', fontSize:13, fontWeight:600,
                      background:S.gold, border:'none', color:'#fff' }}>
                    ✓ บันทึก
                  </button>
                  <button onClick={() => setEditingBlend(false)}
                    style={{ padding:'9px 16px', borderRadius:10, cursor:'pointer',
                      fontFamily:'Inter,sans-serif', fontSize:12,
                      background:'transparent', border:`1px solid ${S.border}`, color:S.textMid }}>
                    ยกเลิก
                  </button>
                </div>
              </div>
            ) : (
              /* ── View mode ── */
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div>
                  <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:24,
                    fontStyle:'italic', color:S.ink, marginBottom:4 }}>{selected.name}</div>
                  <div style={{ fontSize:12, color:S.gold, marginBottom:2 }}>
                    จาก: <strong>{selected.source_name}</strong>
                    {selected.source_supplier && ` · ${selected.source_supplier}`}
                    {selected.source_cost && ` · ฿${selected.source_cost}/g`}
                  </div>
                  {selected.goal && (
                    <div style={{ fontSize:11, color:S.textMid, marginTop:4, lineHeight:1.6,
                      fontStyle:'italic' }}>{selected.goal}</div>
                  )}
                </div>
                <div style={{ display:'flex', gap:8, flexShrink:0, marginLeft:8, flexWrap:'wrap' }}>
                  {selected.source_cost != null && (
                    <button onClick={() => setPurchaseModal(selected)}
                      style={{ fontSize:11, fontWeight:600, color:'#3b6d11', background:'#f0f5ee',
                        border:'1px solid #c8ddc0', borderRadius:16,
                        padding:'3px 10px', cursor:'pointer', fontFamily:'Inter,sans-serif' }}>
                      💰 ซื้อ
                    </button>
                  )}
                  <button onClick={startEditBlend}
                    style={{ fontSize:11, color:S.gold, background:S.white,
                      border:`1px solid ${S.goldBd}`, borderRadius:16,
                      padding:'3px 10px', cursor:'pointer', fontFamily:'Inter,sans-serif' }}>
                    ✎ แก้ไข
                  </button>
                  <button onClick={async () => {
                    await supabase.from('adaptations').update({ is_winner: !selected.is_winner }).eq('id', selected.id)
                    if (!selected.is_winner && selected.blend_group) {
                      await supabase.from('adaptations')
                        .update({ is_winner: false })
                        .eq('blend_group', selected.blend_group)
                        .neq('id', selected.id)
                    }
                    reload()
                    setSelected(s => ({ ...s, is_winner: !s.is_winner }))
                  }}
                    style={{ fontSize:11, fontWeight:600,
                      color: selected.is_winner ? S.green : S.textMid,
                      background: selected.is_winner ? S.greenBg : 'transparent',
                      border:`1px solid ${selected.is_winner ? '#c5dfc8' : S.border}`,
                      borderRadius:16, padding:'3px 10px', cursor:'pointer' }}>
                    {selected.is_winner ? '🏆 Winner' : '○ เลือกเป็น Winner'}
                  </button>
                  <button onClick={() => deleteBlend(selected.id)}
                    style={{ fontSize:11, color:S.red, background:'none', border:`1px solid ${S.red}33`,
                      borderRadius:16, padding:'3px 10px', cursor:'pointer' }}>ลบ</button>
                </div>
              </div>
            )}

            {/* Stock summary */}
            {versions.length > 0 && (
              <div style={{ display:'flex', gap:12, marginTop:12 }}>
                <div style={{ background:S.white, borderRadius:10, padding:'8px 14px',
                  border:`1px solid ${S.border}`, textAlign:'center' }}>
                  <div style={{ fontSize:18, fontWeight:600, color:S.green }}>{totalReady}</div>
                  <div style={{ fontSize:10, color:S.textMid }}>พร้อมขาย</div>
                </div>
                <div style={{ background:S.white, borderRadius:10, padding:'8px 14px',
                  border:`1px solid ${S.border}`, textAlign:'center' }}>
                  <div style={{ fontSize:18, fontWeight:600, color:'#4a6aa8' }}>{totalResting}</div>
                  <div style={{ fontSize:10, color:S.textMid }}>กำลัง rest</div>
                </div>
                {totalRevenue > 0 && (
                  <div style={{ background:S.white, borderRadius:10, padding:'8px 14px',
                    border:`1px solid ${S.border}`, textAlign:'center' }}>
                    <div style={{ fontSize:18, fontWeight:600,
                      color: netProfit >= 0 ? S.green : S.red }}>
                      ฿{netProfit.toLocaleString()}
                    </div>
                    <div style={{ fontSize:10, color:S.textMid }}>กำไรสุทธิ</div>
                    {myBlendsExpenses > 0 && (
                      <div style={{ fontSize:9, color:S.textLt, marginTop:2 }}>
                        (รายได้ ฿{totalRevenue.toLocaleString()} − ค่าใช้จ่าย ฿{myBlendsExpenses.toLocaleString()})
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Version form */}
          {showVerForm ? (
            <VersionForm
              adaptationId={selected.id}
              ver={(versions.length || 0) + 1}
              materials={materials}
              onSaved={() => { setShowVerForm(false); reload() }}
              onCancel={() => setShowVerForm(false)}/>
          ) : (
            <button onClick={() => setShowVerForm(true)}
              style={{ width:'100%', padding:'10px 0', borderRadius:10, cursor:'pointer',
                fontFamily:'Inter,sans-serif', fontSize:12, fontWeight:600,
                background:'transparent', border:`1.5px solid ${S.gold}`,
                color:S.gold, marginBottom:12 }}>
              + บันทึกการผสม V{(versions.length||0)+1}
            </button>
          )}

          {/* Version list */}
          {versions.length > 0 && (
            <div>
              <div style={{ fontSize:11, color:S.textLt, letterSpacing:1,
                textTransform:'uppercase', marginBottom:10 }}>ประวัติการผสม</div>
              {[...versions].reverse().map(v => (
                <VersionCard key={v.id} v={v} materials={materials} onUpdate={reload} blendName={selected?.name}/>
              ))}
            </div>
          )}

          {versions.length === 0 && !showVerForm && (
            <div style={{ textAlign:'center', padding:'24px 0', color:S.textLt, fontSize:13,
              fontStyle:'italic' }}>
              ยังไม่มี record — กด "+ บันทึกการผสม" เพื่อเริ่มค่ะ
            </div>
          )}
        </div>
      )}

      {/* Modal บันทึกการซื้อหัวเชื้อ — กรอกกี่กรัม คำนวณยอดรวมจาก source_cost (฿/g) อัตโนมัติ */}
      {purchaseModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)',
          display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, padding:20 }}
          onClick={() => !purchaseSaving && setPurchaseModal(null)}>
          <div onClick={e => e.stopPropagation()}
            style={{ background:S.white, borderRadius:14, padding:20, width:'100%', maxWidth:360 }}>
            <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:18,
              fontStyle:'italic', color:S.ink, marginBottom:4 }}>
              บันทึกการซื้อหัวเชื้อ
            </div>
            <div style={{ fontSize:13, color:S.textMid, marginBottom:14 }}>
              {purchaseModal.source_name}
              {purchaseModal.source_supplier && ` · ${purchaseModal.source_supplier}`}
              {' · ฿'}{purchaseModal.source_cost}/g
            </div>

            <div style={{ fontSize:11, color:S.textMid, marginBottom:5 }}>ซื้อกี่กรัม</div>
            <input type="number" inputMode="decimal" value={purchaseSize}
              onChange={e => setPurchaseSize(e.target.value)}
              placeholder="เช่น 50"
              style={{ width:'100%', padding:'10px 12px', borderRadius:10, fontSize:14,
                border:`1px solid ${S.border}`, outline:'none', boxSizing:'border-box', marginBottom:6 }}/>
            {purchaseSize && parseFloat(purchaseSize) > 0 && (
              <div style={{ fontSize:12, color:S.green, fontWeight:600, marginBottom:14 }}>
                รวม ฿{(parseFloat(purchaseSize) * (purchaseModal.source_cost || 0)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </div>
            )}

            <div style={{ fontSize:11, color:S.textMid, marginBottom:6, marginTop:8 }}>
              สำหรับกลุ่ม (เลือกได้หลายกลุ่ม)
            </div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:18 }}>
              {[
                { v:'production', label:'Production', icon:'⚗️' },
                { v:'myblends',   label:'My Blends',   icon:'🧪' },
                { v:'retail',     label:'Retail',      icon:'🛍️' },
                { v:'material',   label:'Material',    icon:'🧴' },
              ].map(g => {
                const active = purchaseGroups.includes(g.v)
                return (
                  <button key={g.v}
                    onClick={() => setPurchaseGroups(prev =>
                      prev.includes(g.v) ? prev.filter(x => x !== g.v) : [...prev, g.v])}
                    disabled={purchaseSaving}
                    style={{ padding:'6px 14px', borderRadius:20, cursor: purchaseSaving ? 'default' : 'pointer',
                      fontSize:12, border:`1.5px solid ${active ? S.gold : S.border}`,
                      background: active ? S.goldLt : 'transparent',
                      color: active ? S.gold : S.textMid,
                      fontWeight: active ? 600 : 400,
                      opacity: purchaseSaving ? 0.6 : 1 }}>
                    {g.icon} {g.label}
                  </button>
                )
              })}
            </div>

            <button onClick={() => handleRecordSourcePurchase(purchaseModal, purchaseSize, purchaseGroups)}
              disabled={purchaseSaving || !purchaseSize || parseFloat(purchaseSize) <= 0}
              style={{ width:'100%', padding:'10px 0', borderRadius:10,
                cursor: (purchaseSaving || !purchaseSize) ? 'default' : 'pointer',
                border:'none', background: (purchaseSaving || !purchaseSize) ? S.border : S.gold, color:'#fff',
                fontSize:13, fontWeight:600, fontFamily:'Inter,sans-serif', marginBottom:8,
                opacity: (purchaseSaving || !purchaseSize) ? 0.6 : 1 }}>
              {purchaseSaving ? 'กำลังบันทึก...' : '✓ บันทึก'}
            </button>
            <button onClick={() => setPurchaseModal(null)} disabled={purchaseSaving}
              style={{ width:'100%', padding:'8px 0', borderRadius:10, cursor:'pointer',
                border:'none', background:'transparent', color:S.textLt,
                fontSize:12, fontFamily:'Inter,sans-serif' }}>
              ยกเลิก
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
