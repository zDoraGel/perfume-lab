import { useState, useEffect } from 'react'
import { db } from '../lib/db'
import { S, FC, inputStyle } from '../constants/theme'
import { Card, Btn, BackBtn, TextInput, TextArea, Field } from '../components/ui'
import StockRecommendations from '../components/StockRecommendations'
import MaterialPicker from '../components/MaterialPicker'

const ACCORD_CATS = ['Floral','Woody','Citrus','Fresh','Spicy','Ambery','Gourmand','Musk','Oriental','Aquatic']

// ── Accord Version Card ────────────────────────────────────────────────────────
function AccordVersionCard({ ver, isLatest }) {
  const [open,   setOpen]   = useState(isLatest)
  const [items,  setItems]  = useState([])
  const [loaded, setLoaded] = useState(false)

  function toggle() {
    if (!open && !loaded) db.getAccordItems(ver.id).then(d => { setItems(d); setLoaded(true) })
    setOpen(p => !p)
  }
  useEffect(() => {
    if (isLatest) db.getAccordItems(ver.id).then(d => { setItems(d); setLoaded(true) })
  }, [])

  const total = items.reduce((s,i) => s + parseFloat(i.grams||0), 0)

  return (
    <Card style={{ padding:0, overflow:'hidden', marginBottom:10 }}>
      <div onClick={toggle} style={{ padding:'14px 18px', cursor:'pointer',
        display:'flex', alignItems:'center', gap:14 }}>
        <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:26,
          color:isLatest?S.gold:S.textLt, fontWeight:300, lineHeight:1, minWidth:36 }}>
          V{ver.ver}
        </div>
        <div style={{ flex:1 }}>
          {isLatest && (
            <span style={{ fontSize:11, color:S.gold, fontWeight:500, padding:'2px 8px',
              borderRadius:20, background:S.goldLt, marginBottom:4, display:'inline-block' }}>Latest</span>
          )}
          {ver.notes && (
            <div style={{ fontSize:13, color:S.textMid, marginTop:2 }}>{ver.notes}</div>
          )}
        </div>
        <div style={{ color:S.textLt, fontSize:18 }}>{open ? '▲' : '▼'}</div>
      </div>

      {open && (
        <div style={{ borderTop:`1px solid ${S.border}`, padding:'14px 18px', background:'#fdfcfa' }}>
          {!loaded && <div style={{ color:S.textLt, fontSize:13 }}>Loading...</div>}
          {loaded && items.length === 0 && <div style={{ color:S.textLt, fontSize:13 }}>ยังไม่มี ingredients</div>}
          {loaded && items.map((x,i) => (
            <div key={i} style={{ marginBottom:8 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <span style={{ fontSize:14, fontFamily:'Cormorant Garamond,serif', fontStyle:'italic' }}>
                    {x.material?.name}
                  </span>
                  {x.material?.family && (
                    <span style={{ fontSize:10, fontFamily:'Inter,sans-serif', fontWeight:500,
                      padding:'2px 8px', borderRadius:20,
                      color:(FC[x.material.family]||{c:S.textMid}).c,
                      background:(FC[x.material.family]||{bg:S.border}).bg }}>
                      {x.material.family}
                    </span>
                  )}
                </div>
                <div style={{ display:'flex', gap:10 }}>
                  <span style={{ fontSize:12, color:S.textMid }}>{parseFloat(x.grams).toFixed(3)}g</span>
                  <span style={{ fontSize:13, color:S.gold, fontWeight:500 }}>
                    {total>0 ? ((x.grams/total)*100).toFixed(1) : 0}%
                  </span>
                </div>
              </div>
              <div style={{ height:3, background:S.border, borderRadius:2 }}>
                <div style={{ height:3, borderRadius:2, background:S.gold,
                  width:total>0 ? (x.grams/total)*100+'%' : '0%', maxWidth:'100%' }}/>
              </div>
            </div>
          ))}
          {loaded && total > 0 && (
            <div style={{ borderTop:`1px solid ${S.border}`, paddingTop:10,
              fontSize:12, color:S.textMid, marginTop:8 }}>
              Total: <strong>{total.toFixed(3)}g</strong> · {items.length} ingredients
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

// ── Page: New Accord Version ────────────────────────────────────────────────────
function PageNewAccordVersion({ accord, versions, materials, onBack, onSave }) {
  const [notes,  setNotes]  = useState('')
  const [ings,   setIngs]   = useState([{ materialId:'', grams:'' }])
  const [saving, setSaving] = useState(false)
  const nextVer = versions.length ? Math.max(...versions.map(v=>v.ver)) + 1 : 1
  const total   = ings.reduce((s,r) => s + (parseFloat(r.grams)||0), 0)

  useEffect(() => {
    if (versions.length > 0) {
      const latest = versions[versions.length - 1]
      db.getAccordItems(latest.id).then(items => {
        if (items.length > 0) setIngs(items.map(i => ({ materialId: i.material_id, grams: i.grams })))
      })
    }
  }, [])

  function updIng(idx, field, val) {
    setIngs(p => p.map((r,i) => i===idx ? {...r,[field]:val} : r))
  }

  async function save() {
    const valid = ings.filter(r => r.materialId && r.grams)
    if (!valid.length) return
    setSaving(true)
    await onSave(notes, valid.map(r => ({ materialId: parseInt(r.materialId), grams: parseFloat(r.grams) })))
    setSaving(false)
  }

  return (
    <div>
      <BackBtn onClick={onBack}/>
      <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:22, fontStyle:'italic',
        color:S.ink, marginBottom:4 }}>{accord.name}</div>
      <div style={{ fontSize:13, color:S.textLt, marginBottom:24 }}>New Version · V{nextVer}</div>

      {/* Stock Recommendations for accord category */}
      <StockRecommendations
        vibe={(accord.category || '') + ' ' + (accord.vibe || '')}
        materials={materials}
        compact={true}
      />

      <TextArea label="Notes" value={notes} onChange={setNotes}
        placeholder="ปรับอะไรจาก version ก่อนหน้า..." rows={2}/>

      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
        <div style={{ fontSize:12, color:S.textMid, fontWeight:500, textTransform:'uppercase', letterSpacing:.5 }}>
          Ingredients
        </div>
        <span style={{ fontSize:12, color:S.gold, fontWeight:500 }}>Total {total.toFixed(3)}g</span>
      </div>

      {ings.map((row,idx) => (
        <div key={idx} style={{ display:'flex', gap:8, marginBottom:10, alignItems:'flex-start' }}>
          <MaterialPicker
            materials={materials}
            value={row.materialId}
            onChange={(id) => updIng(idx, 'materialId', id)}
          />
          <input type="number" value={row.grams} onChange={e=>updIng(idx,'grams',e.target.value)}
            placeholder="g"
            style={{ flex:1, background:'#fff', border:`1px solid #e8e4dc`,
              borderRadius:10, padding:'12px 14px', fontSize:14,
              fontFamily:'Inter,sans-serif', color:'#1a1814', outline:'none',
              boxSizing:'border-box', maxWidth:80 }}/>
          {ings.length > 1 && (
            <button onClick={() => setIngs(p=>p.filter((_,i)=>i!==idx))}
              style={{ background:'none', border:'none', color:'#b0aba4',
                fontSize:22, cursor:'pointer', flexShrink:0, paddingTop:10 }}>×</button>
          )}
        </div>
      ))}
      <button onClick={() => setIngs(p=>[...p,{materialId:'',grams:''}])}
        style={{ fontSize:13, color:S.gold, background:'none', border:'none',
          cursor:'pointer', fontWeight:500, marginBottom:20 }}>+ Add ingredient</button>

      <Btn onClick={save}
        disabled={!ings.some(r=>r.materialId&&r.grams)||saving}
        style={{ width:'100%' }}>
        {saving ? 'Saving...' : 'Save Version'}
      </Btn>
    </div>
  )
}

// ── Page: Accord Detail ────────────────────────────────────────────────────────
function PageAccordDetail({ accord, onBack }) {
  const [versions,  setVersions]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [view,      setView]      = useState('list')
  const [materials, setMaterials] = useState([])

  async function load() {
    setLoading(true)
    const [v, m] = await Promise.all([db.getAccordVersions(accord.id), db.getMaterials()])
    setVersions(v); setMaterials(m); setLoading(false)
  }
  useEffect(() => { load() }, [accord.id])

  if (view === 'newVersion') return (
    <PageNewAccordVersion accord={accord} versions={versions} materials={materials}
      onBack={() => setView('list')}
      onSave={async (notes, ings) => {
        const nextVer = versions.length ? Math.max(...versions.map(v=>v.ver)) + 1 : 1
        const v = await db.createAccordVersion(accord.id, nextVer, notes)
        await db.createAccordItems(v.id, ings)
        await load(); setView('list')
      }}/>
  )

  return (
    <div>
      <BackBtn onClick={onBack}/>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:26, fontStyle:'italic',
          color:S.ink }}>{accord.name}</div>
        {accord.vibe && (
          <div style={{ fontSize:13, color:S.textMid, marginTop:3 }}>{accord.vibe}</div>
        )}
        <div style={{ display:'flex', gap:8, marginTop:8, flexWrap:'wrap' }}>
          {accord.category && (
            <span style={{ fontSize:11, fontWeight:500, padding:'3px 12px', borderRadius:20,
              color:(FC[accord.category]||{c:S.textMid}).c,
              background:(FC[accord.category]||{bg:S.border}).bg }}>
              {accord.category}
            </span>
          )}
          {accord.strength != null && (
            <span style={{ fontSize:12, color:S.gold, fontWeight:500 }}>
              Strength {accord.strength}/10
            </span>
          )}
        </div>
      </div>

      <Btn onClick={() => setView('newVersion')} style={{ width:'100%', marginBottom:20 }}>
        + New Version
      </Btn>

      {loading && <div style={{ textAlign:'center', padding:40, color:S.textLt }}>Loading...</div>}
      {!loading && versions.length === 0 && (
        <div style={{ textAlign:'center', padding:'40px 0', color:S.textLt }}>
          <div style={{ fontSize:18, fontFamily:'Cormorant Garamond,serif', fontStyle:'italic' }}>
            ยังไม่มี version
          </div>
        </div>
      )}
      {versions.map((v, idx) => (
        <AccordVersionCard key={v.id} ver={v} isLatest={idx===versions.length-1}/>
      ))}
    </div>
  )
}

// ── Page: New Accord ───────────────────────────────────────────────────────────
function PageNewAccord({ onBack, onCreate }) {
  const [name,     setName]     = useState('')
  const [vibe,     setVibe]     = useState('')
  const [desc,     setDesc]     = useState('')
  const [category, setCategory] = useState('Floral')
  const [strength, setStrength] = useState('')
  const [saving,   setSaving]   = useState(false)
  const [materials, setMaterials] = useState([])

  useEffect(() => { db.getMaterials().then(setMaterials) }, [])

  async function save() {
    if (!name.trim()) return
    setSaving(true)
    const a = await db.createAccord(name, vibe, desc, category, strength ? parseFloat(strength) : null)
    setSaving(false)
    if (a) onCreate(a)
  }

  return (
    <div>
      <BackBtn onClick={onBack}/>
      <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:28, fontStyle:'italic',
        color:S.ink, marginBottom:24 }}>New Accord</div>

      <TextInput label="ชื่อ Accord *" value={name} onChange={setName}
        placeholder="เช่น Rose Musk Base"/>
      <TextInput label="Vibe / Concept" value={vibe} onChange={setVibe}
        placeholder="เช่น กุหลาบอุ่นๆ มี musk รองรับ"/>
      <TextArea label="คำอธิบาย" value={desc} onChange={setDesc} placeholder="ใช้ทำอะไร..." rows={2}/>

      <Field label="Category">
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {ACCORD_CATS.map(c => {
            const fc = FC[c] || { c:S.textMid, bg:S.border }
            return (
              <button key={c} onClick={() => setCategory(c)}
                style={{ padding:'6px 14px', borderRadius:20, cursor:'pointer',
                  fontFamily:'Inter,sans-serif', fontSize:12, fontWeight:500,
                  border:'1.5px solid ' + (category===c ? fc.c : S.border),
                  background: category===c ? fc.bg : 'transparent',
                  color: category===c ? fc.c : S.textMid }}>{c}</button>
            )
          })}
        </div>
      </Field>

      {/* Stock Recommendations — แสดงตาม category + vibe */}
      <div style={{ marginTop:14 }}>
        <StockRecommendations
          vibe={category + ' ' + vibe}
          materials={materials}
        />
      </div>

      <TextInput label="Strength (1-10)" value={strength} onChange={setStrength}
        placeholder="ความเข้มของกลิ่น" type="number"/>

      <Btn onClick={save} disabled={!name.trim() || saving} style={{ width:'100%', marginTop:8 }}>
        {saving ? 'Saving...' : 'Create Accord'}
      </Btn>
    </div>
  )
}

// ── Page: Accords List ─────────────────────────────────────────────────────────
export default function PageAccords() {
  const [accords,  setAccords]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [view,     setView]     = useState('list')
  const [selected, setSelected] = useState(null)

  async function load() {
    setLoading(true)
    const d = await db.getAccords()
    setAccords(d); setLoading(false)
  }
  useEffect(() => { load() }, [])

  if (view === 'new') return (
    <PageNewAccord onBack={() => setView('list')}
      onCreate={async a => { await load(); setSelected(a); setView('detail') }}/>
  )
  if (view === 'detail' && selected) return (
    <PageAccordDetail accord={selected} onBack={() => { setView('list'); load() }}/>
  )

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
        <div>
          <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:28, fontStyle:'italic',
            color:S.ink, lineHeight:1 }}>Accords</div>
          <div style={{ fontSize:12, color:S.textLt, marginTop:3 }}>
            {accords.length} accord{accords.length !== 1 ? 's' : ''}
          </div>
        </div>
        <Btn onClick={() => setView('new')} style={{ padding:'10px 18px', fontSize:13 }}>+ New</Btn>
      </div>

      {loading && <div style={{ textAlign:'center', padding:40, color:S.textLt }}>Loading...</div>}
      {!loading && accords.length === 0 && (
        <div style={{ textAlign:'center', padding:'40px 0', color:S.textLt }}>
          <div style={{ fontSize:20, fontFamily:'Cormorant Garamond,serif', fontStyle:'italic' }}>ยังไม่มี accord</div>
          <div style={{ fontSize:13, marginTop:4 }}>Accord คือกลิ่นผสมที่ทำไว้ก่อน เอาไปใช้ใน formula อีกที</div>
        </div>
      )}

      {accords.map(a => (
        <Card key={a.id} onClick={() => { setSelected(a); setView('detail') }} style={{ cursor:'pointer' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div>
              <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:19, fontStyle:'italic',
                color:S.ink, marginBottom:3 }}>{a.name}</div>
              {a.vibe && (
                <div style={{ fontSize:12, color:S.textMid, marginBottom:4 }}>{a.vibe}</div>
              )}
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {a.category && (
                  <span style={{ fontSize:10, fontWeight:500, padding:'2px 10px', borderRadius:20,
                    color:(FC[a.category]||{c:S.textMid}).c,
                    background:(FC[a.category]||{bg:S.border}).bg }}>
                    {a.category}
                  </span>
                )}
                {a.strength != null && (
                  <span style={{ fontSize:11, color:S.gold, fontWeight:500 }}>
                    Strength {a.strength}/10
                  </span>
                )}
              </div>
            </div>
            <span style={{ fontSize:11, color:S.gold, fontWeight:500, flexShrink:0 }}>Open →</span>
          </div>
        </Card>
      ))}
    </div>
  )
}
