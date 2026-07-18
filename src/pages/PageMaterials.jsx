import { useState, useEffect, useRef } from 'react'
import { db } from '../lib/db'
import { S, FC, FAMILIES, EVAP, inputStyle } from '../constants/theme'
import { Card, Btn, Field, TextInput } from '../components/ui'

// ── NumInput — numbers only ──────────────────────────────────────────────────
function fmtShortDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const months = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
  return `${d.getDate()} ${months[d.getMonth()]}`
}
function isToday(dateStr) {
  if (!dateStr) return false
  return dateStr === new Date().toISOString().slice(0, 10)
}

function NumInput({ label, value, onChange, placeholder, decimal = false }) {
  function handleChange(e) {
    let v = e.target.value
    if (decimal) v = v.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1')
    else v = v.replace(/[^0-9]/g, '')
    onChange(v)
  }
  return (
    <div style={{ marginBottom:14 }}>
      {label && (
        <div style={{ fontSize:12, fontFamily:'Inter,sans-serif', fontWeight:500,
          color:'#6b6560', letterSpacing:.5, textTransform:'uppercase', marginBottom:4 }}>
          {label}
        </div>
      )}
      <input
        type="text"
        inputMode={decimal ? 'decimal' : 'numeric'}
        pattern={decimal ? '[0-9]*\.?[0-9]*' : '[0-9]*'}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        style={{ width:'100%', background:'#fff', border:'1px solid #e8e4dc',
          borderRadius:10, padding:'12px 14px', fontSize:16,
          fontFamily:'Inter,sans-serif', color:'#1a1814', outline:'none',
          boxSizing:'border-box' }}/>
    </div>
  )
}

// ── Material Documents (SDS / IFRA Cert / COA) ─────────────────────────────────
const DOC_TYPES = [
  { v:'sds',  l:'SDS',  icon:'🧪' },
  { v:'ifra', l:'IFRA', icon:'📋' },
  { v:'coa',  l:'COA',  icon:'📄' },
  { v:'other',l:'อื่นๆ', icon:'📎' },
]

function MaterialDocsSection({ materialId }) {
  const [docs,     setDocs]     = useState([])
  const [loading,  setLoading]  = useState(true)
  const [docType,  setDocType]  = useState('sds')
  const [uploading,setUploading]= useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error,    setError]    = useState('')
  const fileInputRef = useRef()

  async function load() {
    setLoading(true)
    setDocs(await db.getMaterialDocuments(materialId))
    setLoading(false)
  }
  useEffect(() => { load() }, [materialId])

  async function handleFiles(fileList) {
    const files = Array.from(fileList || [])
    if (files.length === 0) return
    setUploading(true)
    setError('')
    try {
      for (const f of files) {
        await db.uploadMaterialDocument(materialId, f, docType)
      }
      await load()
    } catch (e) {
      console.error('[MaterialDocsSection]', e)
      setError('อัปโหลดไม่สำเร็จ — เช็คว่าสร้าง bucket "material-documents" (public) ใน Supabase Storage แล้วหรือยัง')
    }
    setUploading(false)
  }

  async function handleDelete(doc) {
    if (!window.confirm(`ลบ "${doc.file_name}" ?`)) return
    await db.deleteMaterialDocument(doc.id, doc.storage_path)
    await load()
  }

  return (
    <div style={{ marginTop:14, padding:'14px 16px', background:S.bg,
      borderRadius:12, border:`1px solid ${S.border}` }}>
      <div style={{ fontSize:11, color:S.gold, fontWeight:700, letterSpacing:.8,
        textTransform:'uppercase', marginBottom:10, fontFamily:'Inter,sans-serif' }}>
        ✦ Supplier Documents
      </div>

      <div style={{ display:'flex', gap:6, marginBottom:10, flexWrap:'wrap' }}>
        {DOC_TYPES.map(t => (
          <button key={t.v} type="button" onClick={() => setDocType(t.v)}
            style={{ padding:'6px 12px', borderRadius:8, cursor:'pointer',
              fontSize:11, fontFamily:'Inter,sans-serif',
              border:`1.5px solid ${docType === t.v ? S.gold : S.border}`,
              background: docType === t.v ? S.goldLt : S.white,
              color: docType === t.v ? S.gold : S.textMid,
              fontWeight: docType === t.v ? 600 : 400 }}>
            {t.icon} {t.l}
          </button>
        ))}
      </div>

      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
        style={{ padding:'18px 12px', textAlign:'center', borderRadius:10, cursor:'pointer',
          border:`1.5px dashed ${dragOver ? S.gold : S.border}`,
          background: dragOver ? S.goldLt : S.white, fontSize:12, color:S.textLt, marginBottom:10 }}>
        {uploading ? '⏳ กำลังอัปโหลด...' : `ลากไฟล์มาวาง หรือคลิกเพื่อเลือก (${DOC_TYPES.find(t=>t.v===docType)?.l})`}
      </div>
      <input ref={fileInputRef} type="file" multiple accept="application/pdf,image/*"
        onChange={e => handleFiles(e.target.files)} style={{ display:'none' }}/>

      {error && <div style={{ fontSize:11, color:S.red, marginBottom:8 }}>{error}</div>}

      {loading ? (
        <div style={{ fontSize:12, color:S.textLt }}>กำลังโหลด...</div>
      ) : docs.length === 0 ? (
        <div style={{ fontSize:12, color:S.textLt }}>ยังไม่มีเอกสาร</div>
      ) : (
        <div>
          {docs.map(d => (
            <div key={d.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
              padding:'8px 10px', background:S.white, borderRadius:8, marginBottom:6,
              border:`1px solid ${S.border}` }}>
              <a href={d.file_url} target="_blank" rel="noopener noreferrer"
                style={{ fontSize:12, color:S.ink, textDecoration:'none', flex:1, minWidth:0,
                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {DOC_TYPES.find(t => t.v === d.doc_type)?.icon || '📎'}{' '}
                <span style={{ fontWeight:600 }}>{DOC_TYPES.find(t => t.v === d.doc_type)?.l || 'อื่นๆ'}</span>
                {' — '}{d.file_name}
              </a>
              <button type="button" onClick={() => handleDelete(d)}
                style={{ background:'none', border:'none', color:S.textLt, cursor:'pointer',
                  fontSize:14, padding:'0 4px' }}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Material Modal ─────────────────────────────────────────────────────────────
function MatModal({ mat, allMasterIngredients, allSuppliers, onClose, onSave }) {
  const editing  = !!mat?.id
  const FAMILIES_EXT = [
    'Woody','Floral','Citrus','Ambery','Musk','Fresh','Spicy','Gourmand',
    'Marine','Ozonic','Aquatic','Fresh Air','Green','Aromatic','Chypre','Fougere',
    'White Floral',
  ]

  const [name,          setName]          = useState(mat?.name || '')
  // ── Supplier picker (normalized suppliers table) ──
  const [supplierId,        setSupplierId]        = useState(mat?.supplier_id ?? mat?.supplier_info?.id ?? null)
  const [supplierSearch,    setSupplierSearch]    = useState('')
  const [showCreateSupplier,setShowCreateSupplier]= useState(false)
  const [newSupplierName,    setNewSupplierName]    = useState('')
  const [newSupplierWebsite, setNewSupplierWebsite] = useState('')
  const [newSupplierEmail,   setNewSupplierEmail]   = useState('')
  const [newSupplierCountry, setNewSupplierCountry] = useState('')
  const selectedSupplier = allSuppliers?.find(s => s.id === supplierId) ||
    (supplierId === mat?.supplier_info?.id ? mat?.supplier_info : null)
  const supplierMatches = supplierSearch.trim()
    ? (allSuppliers || []).filter(s => s.name.toLowerCase().includes(supplierSearch.trim().toLowerCase())).slice(0, 8)
    : []
  // ── Master Ingredient (INCI/CAS/IFRA/SDS ผูกจากตาราง master_ingredients) ──
  const [miId,        setMiId]        = useState(mat?.master_ingredient_id ?? mat?.master_ingredient?.id ?? null)
  const [miSearch,    setMiSearch]    = useState('')
  const [showCreateMi,setShowCreateMi]= useState(false)
  const [showEditMi,  setShowEditMi]  = useState(false)
  const [miSaving,    setMiSaving]    = useState(false)
  const [newMiName,       setNewMiName]       = useState('')
  const [newMiInci,       setNewMiInci]       = useState('')
  const [newMiCas,        setNewMiCas]        = useState('')
  const [newMiSdsUrl,     setNewMiSdsUrl]     = useState('')
  const [newMiIfraLimit,  setNewMiIfraLimit]  = useState('')
  const [newMiIfraCategory, setNewMiIfraCategory] = useState('leave-on')
  const selectedMaster = allMasterIngredients?.find(m => m.id === miId) || (miId === mat?.master_ingredient?.id ? mat?.master_ingredient : null)
  const [editMiInci,      setEditMiInci]      = useState(selectedMaster?.inci || '')
  const [editMiCas,       setEditMiCas]       = useState(selectedMaster?.cas || '')
  const [editMiSdsUrl,    setEditMiSdsUrl]    = useState(selectedMaster?.sds_url || '')
  const [editMiIfraLimit, setEditMiIfraLimit] = useState(selectedMaster?.ifra_limit ?? '')
  const [editMiIfraCategory, setEditMiIfraCategory] = useState(selectedMaster?.ifra_category || 'leave-on')
  const miMatches = miSearch.trim()
    ? (allMasterIngredients || []).filter(m =>
        m.name.toLowerCase().includes(miSearch.trim().toLowerCase()) ||
        (m.cas || '').toLowerCase().includes(miSearch.trim().toLowerCase())
      ).slice(0, 8)
    : []

  async function saveMiEdit() {
    if (!selectedMaster) return
    setMiSaving(true)
    await db.updateMasterIngredient(selectedMaster.id, {
      inci:          editMiInci.trim() || null,
      cas:           editMiCas.trim() || null,
      sds_url:       editMiSdsUrl.trim() || null,
      ifra_limit:    editMiIfraLimit !== '' ? parseFloat(editMiIfraLimit) : null,
      ifra_category: editMiIfraCategory || 'leave-on',
    })
    selectedMaster.inci = editMiInci.trim() || null
    selectedMaster.cas = editMiCas.trim() || null
    selectedMaster.sds_url = editMiSdsUrl.trim() || null
    selectedMaster.ifra_limit = editMiIfraLimit !== '' ? parseFloat(editMiIfraLimit) : null
    selectedMaster.ifra_category = editMiIfraCategory || 'leave-on'
    setMiSaving(false)
    setShowEditMi(false)
  }
  const [families, setFamilies] = useState(() => {
    const f = mat?.families
    let arr = []
    if (!f) arr = mat?.family ? [mat.family] : []
    else if (Array.isArray(f)) arr = f
    else try { arr = JSON.parse(f) } catch { arr = mat?.family ? [mat.family] : [] }
    // filter เฉพาะที่อยู่ใน FAMILIES list
    const ALL_FAM = ['Woody','Floral','Citrus','Ambery','Musk','Fresh','Spicy','Gourmand','Marine','Ozonic','Aquatic','Fresh Air','Green','Aromatic','Chypre','Fougere']
    return arr.filter(x => ALL_FAM.includes(x))
  })
  const [stock,         setStock]         = useState(mat?.stock ?? '')
  const [cost,          setCost]          = useState(mat?.cost ?? '')
  const [dilution,      setDilution]      = useState(mat?.dilution ?? '')
  const [evap,          setEvap]          = useState(mat?.evaporation || 'Heart')
  const [purchasePrice, setPurchasePrice] = useState(mat?.purchase_price ?? '')
  const [purchaseSize,  setPurchaseSize]  = useState(mat?.purchase_size ?? '')
  const [notes,         setNotes]         = useState(mat?.notes || '')
  const [scentProfile,  setScentProfile]  = useState(mat?.scent_profile || '')
  const [performance,   setPerformance]   = useState(mat?.performance || '')
  const [effect,        setEffect]        = useState(mat?.effect || '')
  const [isKey,         setIsKey]         = useState(mat?.is_key ?? false)
  const [stockAlertAt,  setStockAlertAt]  = useState(mat?.stock_alert_at ?? '')
  const [saving,        setSaving]        = useState(false)

  // คำนวณ cost/g อัตโนมัติเมื่อมี purchase_price และ purchase_size
  const autoCost = purchasePrice !== '' && purchaseSize !== '' && parseFloat(purchaseSize) > 0
    ? (parseFloat(purchasePrice) / parseFloat(purchaseSize)).toFixed(2)
    : null

  async function save() {
    if (!name.trim()) return
    setSaving(true)
    let finalMiId = miId
    if (!finalMiId && showCreateMi) {
      const newMi = await db.createMasterIngredient({
        name:          (newMiName.trim() || name.trim()),
        inci:          newMiInci.trim() || null,
        cas:           newMiCas.trim() || null,
        sds_url:       newMiSdsUrl.trim() || null,
        ifra_limit:    newMiIfraLimit !== '' ? parseFloat(newMiIfraLimit) : null,
        ifra_category: newMiIfraCategory || 'leave-on',
      })
      finalMiId = newMi?.id || null
    }
    let finalSupplierId = supplierId
    if (!finalSupplierId && showCreateSupplier && newSupplierName.trim()) {
      const newSup = await db.createSupplier({
        name:    newSupplierName.trim(),
        website: newSupplierWebsite.trim() || null,
        email:   newSupplierEmail.trim() || null,
        country: newSupplierCountry.trim() || null,
      })
      finalSupplierId = newSup?.id || null
    }
    const finalCost = autoCost ? parseFloat(autoCost) : (cost !== '' ? parseFloat(cost) : null)
    const payload = {
      name: name.trim(),
      master_ingredient_id: finalMiId,
      supplier_id: finalSupplierId,
      family: families[0] || null,
      families:       families.length > 0 ? families : null,
      stock:          stock         !== '' ? parseFloat(stock)         : 0,
      cost:           finalCost,
      dilution:       dilution      !== '' ? parseFloat(dilution)      : null,
      evaporation:    evap,
      purchase_price: purchasePrice !== '' ? parseFloat(purchasePrice) : null,
      purchase_size:  purchaseSize  !== '' ? parseFloat(purchaseSize)  : null,
      notes:          notes.trim() || null,
      scent_profile:  scentProfile.trim() || null,
      performance:    performance.trim() || null,
      effect:         effect.trim() || null,
      is_key:         isKey,
      stock_alert_at: stockAlertAt !== '' ? parseFloat(stockAlertAt) : null,
    }
    await onSave(payload)
    setSaving(false)
    onClose()
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:100,
      display:'flex', alignItems:'flex-end', justifyContent:'center' }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:S.white, borderRadius:'20px 20px 0 0', width:'100%',
        maxWidth:600, padding:'24px 20px 40px', maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:22, fontStyle:'italic', color:S.ink }}>
            {editing ? 'Edit Material' : 'New Material'}
          </div>
          <button onClick={onClose}
            style={{ background:'none', border:'none', fontSize:22, color:S.textLt, cursor:'pointer' }}>×</button>
        </div>

        <TextInput label="ชื่อ *" value={name} onChange={setName} placeholder="เช่น Bergamot EO"/>
        <Field label="Supplier / ร้านที่ซื้อ">
          {selectedSupplier ? (
            <div style={{ padding:'10px 12px', background:S.bg, borderRadius:10,
              border:`1px solid ${S.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:S.ink }}>🏪 {selectedSupplier.name}</div>
                {(selectedSupplier.website || selectedSupplier.country) && (
                  <div style={{ fontSize:11, color:S.textLt }}>
                    {selectedSupplier.country || ''}{selectedSupplier.website ? ` · ${selectedSupplier.website}` : ''}
                  </div>
                )}
              </div>
              <button type="button" onClick={() => setSupplierId(null)}
                style={{ fontSize:11, color:S.textMid, background:'none', border:`1px solid ${S.border}`,
                  borderRadius:8, padding:'5px 10px', cursor:'pointer' }}>
                เปลี่ยน
              </button>
            </div>
          ) : (
            <div>
              <TextInput placeholder="ค้นหา supplier เดิม..." value={supplierSearch} onChange={setSupplierSearch}/>
              {supplierMatches.length > 0 && (
                <div style={{ border:`1px solid ${S.border}`, borderRadius:10, marginBottom:8, overflow:'hidden' }}>
                  {supplierMatches.map(s => (
                    <div key={s.id}
                      onClick={() => { setSupplierId(s.id); setSupplierSearch(''); setShowCreateSupplier(false) }}
                      style={{ padding:'9px 12px', cursor:'pointer', fontSize:13, color:S.ink,
                        borderBottom:`1px solid ${S.border}`, background:S.white }}>
                      {s.name}{s.country && <span style={{ color:S.textLt, fontSize:11 }}> · {s.country}</span>}
                    </div>
                  ))}
                </div>
              )}
              {!showCreateSupplier ? (
                <button type="button" onClick={() => { setShowCreateSupplier(true); setNewSupplierName(supplierSearch) }}
                  style={{ fontSize:12, color:S.gold, background:'none', border:`1px dashed ${S.goldBd}`,
                    borderRadius:8, padding:'9px 12px', cursor:'pointer', width:'100%' }}>
                  + เพิ่ม Supplier ใหม่
                </button>
              ) : (
                <div style={{ padding:'12px 14px', background:S.bg, borderRadius:10, border:`1px solid ${S.border}` }}>
                  <TextInput label="ชื่อ Supplier" value={newSupplierName} onChange={setNewSupplierName} placeholder="เช่น Thalia, อ.วิทย์, iHerb"/>
                  <TextInput label="Website" value={newSupplierWebsite} onChange={setNewSupplierWebsite} placeholder="https://..."/>
                  <TextInput label="Email" value={newSupplierEmail} onChange={setNewSupplierEmail} placeholder="เช่น sales@thalia.com"/>
                  <TextInput label="ประเทศ" value={newSupplierCountry} onChange={setNewSupplierCountry} placeholder="เช่น Thailand"/>
                </div>
              )}
            </div>
          )}
        </Field>

        <Field label="Family" sub="เลือกได้ถึง 4 (จากหลักไปรอง)">
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {FAMILIES_EXT.map(f => {
              const FC_EXT = {
                Marine:        { c:'#1a6a8a', bg:'#e0f0f8' },
                Ozonic:        { c:'#2a7a9a', bg:'#e4f2f8' },
                Aquatic:       { c:'#1a7080', bg:'#e0f5f5' },
                'Fresh Air':   { c:'#3a8a6a', bg:'#e4f5ee' },
                Green:         { c:'#3a7a2a', bg:'#e8f5e0' },
                Aromatic:      { c:'#6a6a2a', bg:'#f5f5e0' },
                Chypre:        { c:'#7a5a3a', bg:'#f5eee0' },
                Fougere:       { c:'#5a6a3a', bg:'#eef0e0' },
                'White Floral':{ c:'#8a5a7a', bg:'#f8eef5' },
              }
              const fc = FC[f] || FC_EXT[f] || { c:S.textMid, bg:S.border }
              return (
                <button key={f} onClick={() => {
                    if (families.includes(f)) {
                      setFamilies(families.filter(x => x !== f))
                    } else if (families.length < 4) {
                      setFamilies([...families, f])
                    }
                  }}
                  style={{ padding:'6px 14px', borderRadius:20, cursor:'pointer', fontSize:12,
                    fontFamily:'Inter,sans-serif', fontWeight:500, transition:'all .15s',
                    border:'1.5px solid ' + (families.includes(f) ? fc.c : S.border),
                    background: families.includes(f) ? fc.bg : 'transparent',
                    color: families.includes(f) ? fc.c : S.textMid }}>
                  {families.includes(f) && <span style={{marginRight:4}}>✓</span>}
                  {f}
                  {families.indexOf(f) > 0 && (
                    <span style={{fontSize:9, marginLeft:4, opacity:.6}}>
                      {families.indexOf(f)===1?'2nd':families.indexOf(f)===2?'3rd':'4th'}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </Field>

        <Field label="Evaporation Rate" style={{ marginTop:14 }}>
          <div style={{ display:'flex', gap:8 }}>
            {EVAP.map(e => {
              const ec = { Top:S.green, Heart:'#8a3a68', Base:'#7a5c2e' }[e]
              return (
                <button key={e} onClick={() => setEvap(e)}
                  style={{ flex:1, padding:'9px 0', borderRadius:10, cursor:'pointer',
                    fontFamily:'Inter,sans-serif', fontSize:13, fontWeight:500,
                    border:'1.5px solid ' + (evap===e ? ec : S.border),
                    background: evap===e ? ec+'18' : 'transparent',
                    color: evap===e ? ec : S.textMid }}>{e}</button>
              )
            })}
          </div>
        </Field>

        {/* ── ราคาซื้อ ── */}
        <div style={{ marginTop:14, padding:'12px 14px', background:S.goldLt,
          borderRadius:12, border:`1px solid ${S.goldBd}` }}>
          <div style={{ fontSize:11, color:S.gold, fontWeight:600, letterSpacing:.8,
            textTransform:'uppercase', marginBottom:10 }}>ราคาที่ซื้อมา</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <NumInput label="ราคาต่อขวด/ล็อต (฿)" value={purchasePrice}
              onChange={v => { setPurchasePrice(v); setCost('') }}
              placeholder="เช่น 110" decimal/>
            <NumInput label="ขนาดที่ซื้อ (g)" value={purchaseSize}
              onChange={v => { setPurchaseSize(v); setCost('') }}
              placeholder="เช่น 30" decimal/>
          </div>
          {autoCost && (
            <div style={{ fontSize:12, color:S.gold, fontWeight:600, marginTop:4 }}>
              ✦ Cost อัตโนมัติ = ฿{autoCost}/g
            </div>
          )}
        </div>

        {/* ── หรือใส่ cost เองถ้าไม่รู้ราคาต่อขวด ── */}
        {!autoCost && (
          <div style={{ marginTop:12 }}>
            <NumInput label="Cost (฿/g) — ใส่เองถ้าไม่มีราคาขวด"
              value={cost} onChange={setCost} placeholder="0.00" decimal/>
          </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginTop:12 }}>
          <NumInput label="Stock (g)" value={stock} onChange={setStock} placeholder="0" decimal/>
          <NumInput label="Dilution (%)" value={dilution} onChange={setDilution} placeholder="100"/>
        </div>

        {/* ml → g converter */}
        <div style={{ marginTop:8, padding:'10px 12px', borderRadius:10,
          background:S.goldLt, border:`1px solid ${S.goldBd}` }}>
          <div style={{ fontSize:10, color:S.gold, fontWeight:600, letterSpacing:.8,
            textTransform:'uppercase', marginBottom:8 }}>ซื้อมาเป็น ml? แปลงเป็น g</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, alignItems:'flex-end' }}>
            <div>
              <div style={{ fontSize:10, color:S.textMid, marginBottom:4 }}>ปริมาณ (ml)</div>
              <input type="number" placeholder="เช่น 30"
                onChange={e => {
                  const ml = parseFloat(e.target.value)
                  if (!ml) return
                  const densityMap = { Citrus:0.88, Fresh:0.88, Woody:1.05, Ambery:1.05, Gourmand:1.05 }
                  const d = densityMap[families[0]] || 0.95
                  setStock((ml * d).toFixed(2))
                }}
                style={{ ...inputStyle, padding:'8px 10px', fontSize:13 }}/>
            </div>
            <div>
              <div style={{ fontSize:10, color:S.textMid, marginBottom:4 }}>Density</div>
              <div style={{ padding:'8px 10px', borderRadius:10, border:`1px solid ${S.border}`,
                fontSize:13, background:S.white, color:S.textMid }}>
                {({ Citrus:0.88, Fresh:0.88, Woody:1.05, Ambery:1.05, Gourmand:1.05 }[families[0]] || 0.95)} g/ml
              </div>
            </div>
            <div>
              <div style={{ fontSize:10, color:S.gold, marginBottom:4 }}>→ Stock (g)</div>
              <div style={{ padding:'8px 10px', borderRadius:10, border:`1px solid ${S.goldBd}`,
                fontSize:13, fontWeight:600, background:S.white, color:S.gold }}>
                {stock || '—'} g
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop:12 }}>
          <div style={{ fontSize:12, color:S.textMid, fontWeight:500, letterSpacing:.5,
            textTransform:'uppercase', marginBottom:6 }}>Notes / Scent Profile</div>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
            placeholder="เช่น bergamot, jasmine, sandalwood, musk — หรือ ซื้อมา batch ไหน"
            style={{ ...inputStyle, resize:'none' }}/>
        </div>

        <div style={{ marginTop:12 }}>
          <div style={{ fontSize:12, color:S.textMid, fontWeight:500, letterSpacing:.5,
            textTransform:'uppercase', marginBottom:6 }}>Scent Profile Keywords</div>
          <textarea value={scentProfile} onChange={e => setScentProfile(e.target.value)} rows={2}
            placeholder="เช่น Clean, Soft, Airy, Elegant, Skin-like"
            style={{ ...inputStyle, resize:'none' }}/>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginTop:12 }}>
          <div>
            <div style={{ fontSize:12, color:S.textMid, fontWeight:500, letterSpacing:.5,
              textTransform:'uppercase', marginBottom:6 }}>Performance</div>
            <textarea value={performance} onChange={e => setPerformance(e.target.value)} rows={2}
              placeholder="เช่น Fixative, Diffusive, Booster"
              style={{ ...inputStyle, resize:'none' }}/>
          </div>
          <div>
            <div style={{ fontSize:12, color:S.textMid, fontWeight:500, letterSpacing:.5,
              textTransform:'uppercase', marginBottom:6 }}>Effect</div>
            <textarea value={effect} onChange={e => setEffect(e.target.value)} rows={2}
              placeholder="เช่น Smooths blend, adds diffusion"
              style={{ ...inputStyle, resize:'none' }}/>
          </div>
        </div>

        {/* ── Master Ingredient (INCI / CAS / IFRA / SDS) ── */}
        <div style={{ marginTop:14, padding:'14px 16px', background:S.bg,
          borderRadius:12, border:`1px solid ${S.border}` }}>
          <div style={{ fontSize:11, color:S.gold, fontWeight:700, letterSpacing:.8,
            textTransform:'uppercase', marginBottom:4,
            fontFamily:'Inter,sans-serif' }}>✦ Master Ingredient</div>
          <div style={{ fontSize:11, color:S.textLt, marginBottom:12 }}>
            สารเคมีจริง (INCI/CAS/IFRA/SDS) — ผูก Trade Name นี้เข้ากับสารตัวเดียวกันได้ แม้ซื้อจาก supplier คนละเจ้า
          </div>

          {selectedMaster ? (
            <div>
              <div style={{ fontWeight:600, color:S.ink, marginBottom:4 }}>{selectedMaster.name}</div>
              <div style={{ fontSize:11, color:S.textLt, marginBottom:6 }}>
                {selectedMaster.inci && `INCI: ${selectedMaster.inci}`}
                {selectedMaster.cas && `${selectedMaster.inci ? ' · ' : ''}CAS: ${selectedMaster.cas}`}
                {selectedMaster.ifra_limit != null && ` · IFRA ≤${selectedMaster.ifra_limit}%`}
              </div>
              {selectedMaster.sds_url && (
                <a href={selectedMaster.sds_url} target="_blank" rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  style={{ fontSize:11, color:S.gold, textDecoration:'underline' }}>📄 SDS</a>
              )}
              <div style={{ display:'flex', gap:8, marginTop:10 }}>
                <button type="button" onClick={() => { setMiId(null); setShowEditMi(false) }}
                  style={{ fontSize:11, color:S.textMid, background:'none', border:`1px solid ${S.border}`,
                    borderRadius:8, padding:'6px 10px', cursor:'pointer' }}>
                  เปลี่ยน / ยกเลิกผูก
                </button>
                <button type="button" onClick={() => setShowEditMi(v => !v)}
                  style={{ fontSize:11, color:S.gold, background:'none', border:`1px solid ${S.goldBd}`,
                    borderRadius:8, padding:'6px 10px', cursor:'pointer' }}>
                  แก้ไขข้อมูลเคมี
                </button>
              </div>

              {showEditMi && (
                <div style={{ marginTop:12, paddingTop:12, borderTop:`1px solid ${S.border}` }}>
                  <TextInput label="INCI" value={editMiInci} onChange={setEditMiInci}/>
                  <TextInput label="CAS Number" value={editMiCas} onChange={setEditMiCas} placeholder="เช่น 8007-75-8"/>
                  <TextInput label="SDS Link" value={editMiSdsUrl} onChange={setEditMiSdsUrl} placeholder="https://..."/>
                  <div style={{ display:'flex', gap:10, marginBottom:10 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:11, color:S.textMid, fontWeight:500, letterSpacing:.5,
                        marginBottom:5, textTransform:'uppercase', fontFamily:'Inter,sans-serif' }}>IFRA Max %</div>
                      <input type="number" step="0.01" value={editMiIfraLimit}
                        onChange={e => setEditMiIfraLimit(e.target.value)} placeholder="เช่น 0.5"
                        style={{ width:'100%', padding:'10px 12px', borderRadius:10,
                          border:`1.5px solid ${S.border}`, fontSize:14, fontFamily:'Inter,sans-serif',
                          color:S.ink, background:S.white, outline:'none', boxSizing:'border-box' }}/>
                    </div>
                    <div style={{ flex:2 }}>
                      <div style={{ fontSize:11, color:S.textMid, fontWeight:500, letterSpacing:.5,
                        marginBottom:5, textTransform:'uppercase', fontFamily:'Inter,sans-serif' }}>ประเภท</div>
                      <div style={{ display:'flex', gap:6 }}>
                        {[
                          { v:'leave-on',       l:'น้ำหอม' },
                          { v:'fine-fragrance', l:'Fine Frag' },
                          { v:'rinse-off',      l:'Rinse-off' },
                        ].map(opt => (
                          <button key={opt.v} type="button" onClick={() => setEditMiIfraCategory(opt.v)}
                            style={{ flex:1, padding:'10px 4px', borderRadius:10, cursor:'pointer',
                              fontSize:11, fontFamily:'Inter,sans-serif',
                              border:`1.5px solid ${editMiIfraCategory === opt.v ? S.gold : S.border}`,
                              background: editMiIfraCategory === opt.v ? S.goldLt : S.white,
                              color: editMiIfraCategory === opt.v ? S.gold : S.textMid,
                              fontWeight: editMiIfraCategory === opt.v ? 600 : 400 }}>
                            {opt.l}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button type="button" onClick={saveMiEdit} disabled={miSaving}
                    style={{ width:'100%', padding:'10px', borderRadius:10, border:'none',
                      background:S.gold, color:S.white, fontSize:13, fontWeight:600, cursor:'pointer' }}>
                    {miSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูลเคมี'}
                  </button>
                  <div style={{ fontSize:10, color:S.textLt, marginTop:6 }}>
                    * จะกระทบวัตถุดิบอื่นทุกตัวที่ผูกกับ Master Ingredient นี้
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <TextInput placeholder="ค้นหา Master Ingredient เดิม (ชื่อ/CAS)..." value={miSearch} onChange={setMiSearch}/>
              {miMatches.length > 0 && (
                <div style={{ border:`1px solid ${S.border}`, borderRadius:10, marginBottom:10, overflow:'hidden' }}>
                  {miMatches.map(m => (
                    <div key={m.id}
                      onClick={() => { setMiId(m.id); setMiSearch(''); setShowCreateMi(false) }}
                      style={{ padding:'9px 12px', cursor:'pointer', fontSize:13, color:S.ink,
                        borderBottom:`1px solid ${S.border}`, background:S.white }}>
                      {m.name}
                      {m.cas && <span style={{ color:S.textLt, fontSize:11 }}> · CAS {m.cas}</span>}
                    </div>
                  ))}
                </div>
              )}

              {!showCreateMi ? (
                <button type="button" onClick={() => { setShowCreateMi(true); setNewMiName(name) }}
                  style={{ fontSize:12, color:S.gold, background:'none', border:`1px dashed ${S.goldBd}`,
                    borderRadius:8, padding:'10px 12px', cursor:'pointer', width:'100%' }}>
                  + สร้าง Master Ingredient ใหม่
                </button>
              ) : (
                <div style={{ padding:'12px 14px', background:S.white, borderRadius:10, border:`1px solid ${S.border}` }}>
                  <TextInput label="ชื่อ Master Ingredient" value={newMiName} onChange={setNewMiName} placeholder="เช่น Ambroxan"/>
                  <TextInput label="INCI" value={newMiInci} onChange={setNewMiInci} placeholder="เช่น Ambroxide"/>
                  <TextInput label="CAS Number" value={newMiCas} onChange={setNewMiCas} placeholder="เช่น 8007-75-8"/>
                  <TextInput label="SDS Link" value={newMiSdsUrl} onChange={setNewMiSdsUrl} placeholder="https://..."/>
                  <div style={{ display:'flex', gap:10 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:11, color:S.textMid, fontWeight:500, letterSpacing:.5,
                        marginBottom:5, textTransform:'uppercase', fontFamily:'Inter,sans-serif' }}>IFRA Max %</div>
                      <input type="number" step="0.01" value={newMiIfraLimit}
                        onChange={e => setNewMiIfraLimit(e.target.value)} placeholder="เช่น 0.5"
                        style={{ width:'100%', padding:'10px 12px', borderRadius:10,
                          border:`1.5px solid ${S.border}`, fontSize:14, fontFamily:'Inter,sans-serif',
                          color:S.ink, background:S.bg, outline:'none', boxSizing:'border-box' }}/>
                    </div>
                    <div style={{ flex:2 }}>
                      <div style={{ fontSize:11, color:S.textMid, fontWeight:500, letterSpacing:.5,
                        marginBottom:5, textTransform:'uppercase', fontFamily:'Inter,sans-serif' }}>ประเภท</div>
                      <div style={{ display:'flex', gap:6 }}>
                        {[
                          { v:'leave-on',       l:'น้ำหอม' },
                          { v:'fine-fragrance', l:'Fine Frag' },
                          { v:'rinse-off',      l:'Rinse-off' },
                        ].map(opt => (
                          <button key={opt.v} type="button" onClick={() => setNewMiIfraCategory(opt.v)}
                            style={{ flex:1, padding:'10px 4px', borderRadius:10, cursor:'pointer',
                              fontSize:11, fontFamily:'Inter,sans-serif',
                              border:`1.5px solid ${newMiIfraCategory === opt.v ? S.gold : S.border}`,
                              background: newMiIfraCategory === opt.v ? S.goldLt : S.bg,
                              color: newMiIfraCategory === opt.v ? S.gold : S.textMid,
                              fontWeight: newMiIfraCategory === opt.v ? 600 : 400 }}>
                            {opt.l}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {editing ? (
          <MaterialDocsSection materialId={mat.id}/>
        ) : (
          <div style={{ marginTop:14, padding:'12px 14px', background:S.bg, borderRadius:10,
            border:`1px dashed ${S.border}`, fontSize:11, color:S.textLt, textAlign:'center' }}>
            บันทึกวัตถุดิบนี้ก่อน แล้วค่อยกลับมาแก้ไขเพื่ออัปโหลดเอกสาร SDS/IFRA/COA
          </div>
        )}

        {/* ── Key Material ── */}
        <div style={{ marginTop:14, padding:'12px 14px', background:isKey ? '#eef5f0' : S.bg,
          borderRadius:12, border:`1px solid ${isKey ? '#a8d4b4' : S.border}` }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: isKey ? 10 : 0 }}>
            <div>
              <div style={{ fontSize:11, color: isKey ? '#3d6b4a' : S.textMid, fontWeight:600,
                letterSpacing:.8, textTransform:'uppercase' }}>⭐ Key Material</div>
              <div style={{ fontSize:10, color:S.textLt, marginTop:2 }}>วัตถุดิบสำคัญ — แจ้งเตือนเมื่อ stock ต่ำ</div>
            </div>
            <button onClick={() => setIsKey(p => !p)}
              style={{ width:40, height:24, borderRadius:12, border:'none', cursor:'pointer',
                background: isKey ? '#3d6b4a' : S.border, transition:'background .2s',
                position:'relative' }}>
              <span style={{ position:'absolute', top:3, left: isKey ? 18 : 3,
                width:18, height:18, borderRadius:'50%', background:'#fff',
                transition:'left .2s', display:'block' }}/>
            </button>
          </div>
          {isKey && (
            <NumInput label="แจ้งเตือนเมื่อ stock ≤ (g)"
              value={stockAlertAt} onChange={setStockAlertAt} placeholder="เช่น 10" decimal/>
          )}
        </div>

        <Btn onClick={save} disabled={!name.trim() || saving} style={{ width:'100%', marginTop:16 }}>
          {saving ? 'Saving...' : editing ? 'Update' : 'Add Material'}
        </Btn>

        {/* ── Aliases section (only when editing) ── */}
        {editing && <AliasSection materialId={mat.id}/>}

        {/* ── Traits section (only when editing) ── */}
        {editing && <TraitsSection materialId={mat.id}/>}
      </div>
    </div>
  )
}

// ── Alias Section ─────────────────────────────────────────────────────────────
function AliasSection({ materialId }) {
  const [aliases,    setAliases]    = useState([])
  const [showAdd,    setShowAdd]    = useState(false)
  const [newName,    setNewName]    = useState('')
  const [newDesc,    setNewDesc]    = useState('')
  const [newKw,      setNewKw]      = useState('')
  const [newCtx,     setNewCtx]     = useState('')
  const [saving,     setSaving]     = useState(false)

  useEffect(() => {
    db.getAliases(materialId).then(setAliases)
  }, [materialId])

  async function addAlias() {
    if (!newName.trim()) return
    setSaving(true)
    const a = await db.createAlias(materialId, newName.trim(), newDesc, newKw, newCtx)
    setAliases(p => [...p, a])
    setNewName(''); setNewDesc(''); setNewKw(''); setNewCtx('')
    setShowAdd(false)
    setSaving(false)
  }

  async function removeAlias(id) {
    await db.deleteAlias(id)
    setAliases(p => p.filter(a => a.id !== id))
  }

  return (
    <div style={{ marginTop:20, borderTop:`1px solid ${S.border}`, paddingTop:16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
        <div style={{ fontSize:11, fontWeight:700, color:S.gold, letterSpacing:1,
          textTransform:'uppercase' }}>✦ Market Names / Aliases</div>
        <button onClick={() => setShowAdd(p => !p)}
          style={{ fontSize:11, color:S.gold, background:'none',
            border:`1px solid ${S.goldBd}`, borderRadius:20, padding:'3px 12px',
            cursor:'pointer' }}>
          {showAdd ? '▲' : '+ Add'}
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div style={{ padding:'12px', background:S.goldLt, borderRadius:10,
          border:`1px solid ${S.goldBd}`, marginBottom:10 }}>
          <input value={newName} onChange={e => setNewName(e.target.value)}
            placeholder="Market name เช่น Soft Cedar *"
            style={{ ...inputStyle, marginBottom:8, width:'100%', boxSizing:'border-box' }}/>
          <input value={newDesc} onChange={e => setNewDesc(e.target.value)}
            placeholder="Description เช่น ไม้ซีดาร์สะอาด โปร่ง เบา"
            style={{ ...inputStyle, marginBottom:8, width:'100%', boxSizing:'border-box' }}/>
          <input value={newKw} onChange={e => setNewKw(e.target.value)}
            placeholder="Keywords เช่น woody, airy, clean, cedar"
            style={{ ...inputStyle, marginBottom:8, width:'100%', boxSizing:'border-box' }}/>
          <input value={newCtx} onChange={e => setNewCtx(e.target.value)}
            placeholder="Context เช่น floral, tea, clean, skin"
            style={{ ...inputStyle, marginBottom:8, width:'100%', boxSizing:'border-box' }}/>
          <button onClick={addAlias} disabled={!newName.trim() || saving}
            style={{ width:'100%', padding:'8px 0', borderRadius:8, cursor:'pointer',
              fontFamily:'Inter,sans-serif', fontSize:12, fontWeight:600,
              background:S.gold, border:'none', color:'#fff',
              opacity: !newName.trim() || saving ? 0.5 : 1 }}>
            {saving ? 'Saving...' : '+ Add Alias'}
          </button>
        </div>
      )}

      {/* Aliases list */}
      {aliases.length === 0 ? (
        <div style={{ fontSize:11, color:S.textLt, fontStyle:'italic', textAlign:'center', padding:8 }}>
          ยังไม่มี alias — กด + Add เพื่อเพิ่มชื่อตลาดค่ะ
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {aliases.filter(a => a && a.market_name).map(a => (
            <AliasCard key={a.id} a={a}
              onRemove={removeAlias}
              onUpdated={updated => setAliases(p => p.map(x => x.id === updated.id ? updated : x))}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function AliasCard({ a, onRemove, onUpdated }) {
  const [editing, setEditing] = useState(false)
  const [name,    setName]    = useState(a.market_name)
  const [desc,    setDesc]    = useState(a.description || '')
  const [kw,      setKw]      = useState(a.keywords || '')
  const [ctx,     setCtx]     = useState(a.context || '')
  const [saving,  setSaving]  = useState(false)

  async function save() {
    if (!name.trim()) return
    setSaving(true)
    await db.updateAlias(a.id, name.trim(), desc, kw, ctx)
    onUpdated({ ...a, market_name: name.trim(), description: desc, keywords: kw, context: ctx })
    setEditing(false)
    setSaving(false)
  }

  const iStyle = { width:'100%', padding:'7px 10px', borderRadius:8,
    border:`1px solid ${S.border}`, fontSize:12, fontFamily:'Inter,sans-serif',
    color:S.ink, background:S.white, outline:'none', boxSizing:'border-box', marginBottom:6 }

  if (editing) return (
    <div style={{ padding:'12px', borderRadius:10, background:S.goldLt, border:`1px solid ${S.goldBd}` }}>
      <input value={name} onChange={e => setName(e.target.value)}
        placeholder="Market name" style={{ ...iStyle, fontFamily:'Cormorant Garamond,serif',
          fontStyle:'italic', fontSize:14 }}/>
      <input value={desc} onChange={e => setDesc(e.target.value)}
        placeholder="Description" style={iStyle}/>
      <input value={kw} onChange={e => setKw(e.target.value)}
        placeholder="Keywords (comma separated)" style={iStyle}/>
      <input value={ctx} onChange={e => setCtx(e.target.value)}
        placeholder="Context" style={{ ...iStyle, marginBottom:10 }}/>
      <div style={{ display:'flex', gap:8 }}>
        <button onClick={save} disabled={saving || !name.trim()}
          style={{ flex:1, padding:'7px 0', borderRadius:8, cursor:'pointer',
            fontFamily:'Inter,sans-serif', fontSize:12, fontWeight:600,
            background:S.gold, border:'none', color:'#fff', opacity: saving ? .6 : 1 }}>
          {saving ? 'Saving...' : '✓ บันทึก'}
        </button>
        <button onClick={() => setEditing(false)}
          style={{ padding:'7px 14px', borderRadius:8, cursor:'pointer',
            fontFamily:'Inter,sans-serif', fontSize:12,
            background:'transparent', border:`1px solid ${S.border}`, color:S.textMid }}>
          ยกเลิก
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ padding:'10px 12px', borderRadius:10, background:S.white, border:`1px solid ${S.border}` }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:15,
          fontStyle:'italic', color:S.gold, fontWeight:600 }}>
          {a.market_name}
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => setEditing(true)}
            style={{ fontSize:11, color:S.gold, background:'none', border:'none', cursor:'pointer' }}>
            ✎ แก้ไข
          </button>
          <button onClick={() => onRemove(a.id)}
            style={{ fontSize:11, color:S.red, background:'none', border:'none', cursor:'pointer' }}>
            ลบ
          </button>
        </div>
      </div>
      {a.description && <div style={{ fontSize:11, color:S.textMid, marginTop:2 }}>{a.description}</div>}
      {a.keywords && <div style={{ fontSize:10, color:S.textLt, marginTop:2 }}>🏷 {a.keywords}</div>}
      {a.context && <div style={{ fontSize:10, color:S.gold, marginTop:2 }}>📌 context: {a.context}</div>}
    </div>
  )
}
const TRAIT_AXES = [
  { key:'freshness', label:'Freshness', desc:'สดชื่น / citrus / green' },
  { key:'softness',  label:'Softness',  desc:'นุ่ม / powdery / skin'   },
  { key:'sweetness', label:'Sweetness', desc:'หวาน / gourmand / fruity' },
  { key:'airiness',  label:'Airiness',  desc:'โปร่ง / airy / transparent' },
  { key:'warmth',    label:'Warmth',    desc:'อุ่น / woody / amber / musk' },
]

function TraitsSection({ materialId }) {
  const [traits,  setTraits]  = useState(null)   // null = ยังไม่โหลด
  const [vals,    setVals]    = useState({ freshness:0, softness:0, sweetness:0, airiness:0, warmth:0 })
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)

  useEffect(() => {
    db.getMaterialTraits([materialId]).then(rows => {
      if (rows[0]) {
        setVals({
          freshness: rows[0].freshness || 0,
          softness:  rows[0].softness  || 0,
          sweetness: rows[0].sweetness || 0,
          airiness:  rows[0].airiness  || 0,
          warmth:    rows[0].warmth    || 0,
        })
      }
      setTraits(rows[0] || null)
    })
  }, [materialId])

  async function saveTrait() {
    setSaving(true)
    await db.upsertTrait(materialId, vals)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setSaving(false)
  }

  function setVal(key, v) {
    setVals(p => ({ ...p, [key]: v }))
    setSaved(false)
  }

  return (
    <div style={{ marginTop:16, borderTop:`1px solid ${S.border}`, paddingTop:16 }}>
      <div style={{ fontSize:11, fontWeight:700, color:S.gold, letterSpacing:1,
        textTransform:'uppercase', marginBottom:12 }}>✦ Scent Traits</div>

      {TRAIT_AXES.map(({ key, label, desc }) => (
        <div key={key} style={{ marginBottom:12 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
            <span style={{ fontSize:12, color:S.ink, fontWeight:500 }}>{label}</span>
            <span style={{ fontSize:10, color:S.textLt }}>{desc}</span>
          </div>
          {/* Dot picker 0–5 */}
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            {[0,1,2,3,4,5].map(n => (
              <button key={n} onClick={() => setVal(key, n)}
                style={{
                  width:28, height:28, borderRadius:'50%', cursor:'pointer',
                  border: `1.5px solid ${n <= vals[key] && vals[key] > 0 ? S.gold : S.border}`,
                  background: n <= vals[key] && vals[key] > 0 ? S.gold : 'transparent',
                  color: n <= vals[key] && vals[key] > 0 ? '#fff' : S.textLt,
                  fontSize:11, fontWeight:600, fontFamily:'Inter,sans-serif',
                  transition:'all .1s',
                }}>
                {n}
              </button>
            ))}
            <div style={{ marginLeft:4, display:'flex', gap:3 }}>
              {[1,2,3,4,5].map(i => (
                <div key={i} style={{
                  width:7, height:7, borderRadius:'50%',
                  background: i <= vals[key] ? S.gold : 'transparent',
                  border: `1px solid ${i <= vals[key] ? S.gold : S.border}`,
                }}/>
              ))}
            </div>
          </div>
        </div>
      ))}

      <button onClick={saveTrait} disabled={saving}
        style={{ width:'100%', padding:'9px 0', borderRadius:8, cursor:'pointer',
          fontFamily:'Inter,sans-serif', fontSize:12, fontWeight:600, marginTop:4,
          background: saved ? S.green : S.gold,
          border:'none', color:'#fff',
          opacity: saving ? 0.6 : 1, transition:'background .3s' }}>
        {saved ? '✓ Saved' : saving ? 'Saving...' : 'Save Traits'}
      </button>
    </div>
  )
}

// ── Quick Traits Inline ───────────────────────────────────────────────────────
const TKEYS   = ['freshness','softness','sweetness','airiness','warmth']
const TLABELS = ['Fresh','Soft','Sweet','Airy','Warm']

function QuickTraits({ materialId, onDone }) {
  const [vals,   setVals]   = useState({ freshness:0, softness:0, sweetness:0, airiness:0, warmth:0 })
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)

  useEffect(() => {
    db.getMaterialTraits([materialId]).then(rows => {
      if (rows[0]) setVals({
        freshness: rows[0].freshness||0, softness: rows[0].softness||0,
        sweetness: rows[0].sweetness||0, airiness: rows[0].airiness||0,
        warmth:    rows[0].warmth||0,
      })
    })
  }, [materialId])

  async function save() {
    setSaving(true)
    await db.upsertTrait(materialId, vals)
    setSaved(true)
    setTimeout(() => { setSaved(false); onDone?.() }, 1200)
    setSaving(false)
  }

  return (
    <div style={{ marginTop:10, padding:'12px 14px', background:S.goldLt,
      borderRadius:10, border:`1px solid ${S.goldBd}` }}>
      <div style={{ fontSize:10, color:S.gold, fontWeight:700, letterSpacing:1,
        textTransform:'uppercase', marginBottom:10 }}>SCENT TRAITS</div>

      {TKEYS.map((key, ki) => (
        <div key={key} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
          <div style={{ width:36, fontSize:10, color:S.textMid, fontWeight:500,
            flexShrink:0 }}>{TLABELS[ki]}</div>
          <div style={{ display:'flex', gap:5 }}>
            {[1,2,3,4,5].map(n => (
              <button key={n} onClick={() => setVals(p => ({ ...p, [key]: p[key]===n ? 0 : n }))}
                style={{
                  width:24, height:24, borderRadius:'50%', cursor:'pointer',
                  border:`1.5px solid ${n <= vals[key] && vals[key] > 0 ? S.gold : '#b8a898'}`,
                  background: n <= vals[key] && vals[key] > 0 ? S.gold : 'rgba(255,255,255,0.6)',
                  fontSize:0, padding:0, transition:'all .1s',
                }}/>
            ))}
            <button onClick={() => setVals(p => ({ ...p, [key]: 0 }))}
              title="reset"
              style={{ width:18, height:18, borderRadius:'50%', cursor:'pointer',
                border:`1px solid ${S.border}`, background:'transparent',
                fontSize:8, color:S.textLt, padding:0, lineHeight:1,
                opacity: vals[key] === 0 ? 0.3 : 0.6 }}>✕</button>
          </div>
          <div style={{ fontSize:11, color: vals[key] ? S.gold : S.textLt, fontWeight:600, minWidth:12 }}>
            {vals[key] || '—'}
          </div>
        </div>
      ))}

      <div style={{ display:'flex', gap:8, marginTop:6 }}>
        <button onClick={save} disabled={saving}
          style={{ flex:1, padding:'7px 0', borderRadius:8, cursor:'pointer',
            fontFamily:'Inter,sans-serif', fontSize:11, fontWeight:600,
            background: saved ? S.green : S.gold, border:'none', color:'#fff',
            opacity: saving ? .6 : 1 }}>
          {saved ? '✓ Saved!' : saving ? '...' : 'Save Traits'}
        </button>
        <button onClick={onDone}
          style={{ padding:'7px 14px', borderRadius:8, cursor:'pointer',
            fontFamily:'Inter,sans-serif', fontSize:11,
            background:'none', border:`1px solid ${S.border}`, color:S.textMid }}>✕</button>
      </div>
    </div>
  )
}

// ── Page Materials ─────────────────────────────────────────────────────────────
export default function PageMaterials() {
  const [materials, setMaterials] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [filterFam, setFilterFam] = useState('All')
  const [modal,       setModal]       = useState(null)
  const [openTraits,  setOpenTraits]  = useState(null) // materialId ที่ expand อยู่
  const [purchaseModal, setPurchaseModal] = useState(null) // material ที่กำลังบันทึกการซื้อ
  const [purchaseSaving, setPurchaseSaving] = useState(false)
  const purchaseSavingRef = useRef(false) // กันกดซ้ำแบบ synchronous — ไม่ต้องรอ React re-render
  const [purchaseGroups, setPurchaseGroups] = useState(['material']) // default ติ๊ก material ไว้ก่อน เพิ่มกลุ่มอื่นได้
  const [masterIngredients, setMasterIngredients] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [sdsMaterialIds, setSdsMaterialIds] = useState(new Set())

  async function load() {
    setLoading(true)
    const [d, mi, sup, sdsIds] = await Promise.all([
      db.getMaterials(), db.getMasterIngredients(), db.getSuppliers(), db.getSdsMaterialIds(),
    ])
    setMaterials(d); setMasterIngredients(mi); setSuppliers(sup); setSdsMaterialIds(sdsIds); setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function handleSave(payload) {
    if (modal?.id) await db.updateMaterial(modal.id, payload)
    else await db.createMaterial(payload)
    await load()
  }

  async function handleDelete(mat) {
    if (!window.confirm('ลบ "' + mat.name + '" ออกจาก stock?')) return
    await db.deleteMaterial(mat.id)
    await load()
  }

  async function handleRecordPurchase(mat, forGroups) {
    if (purchaseSavingRef.current) return // กันกดซ้ำ — เช็คทันทีไม่รอ React re-render
    purchaseSavingRef.current = true
    setPurchaseSaving(true)
    try {
      const today = new Date().toISOString().slice(0, 10)
      await db.createExpense({
        expense_date: today,
        category: 'material',
        amount: mat.purchase_price,
        note: `${mat.name} ${mat.purchase_size}g`,
        for_groups: forGroups,
      })
      await db.updateMaterial(mat.id, { last_purchased_at: today })
      setPurchaseModal(null)
      setPurchaseGroups(['material'])
      await load() // refresh เพื่อให้ badge "ซื้อล่าสุด" อัปเดตทันที
    } catch (e) {
      alert('บันทึกไม่สำเร็จ: ' + e.message)
    }
    purchaseSavingRef.current = false
    setPurchaseSaving(false)
  }

  const families   = ['All', ...FAMILIES]
  const filtered   = materials
    .filter(m => filterFam === 'All' || m.family === filterFam)
    .filter(m => !search || m.name.toLowerCase().includes(search.toLowerCase()))
  const totalValue = materials.reduce((s,m) => s + (m.stock||0)*(m.cost||0), 0)
  const lowStockCount = materials.filter(m => (m.stock||0) < 10).length

  return (
    <div>
      {modal && (
        <MatModal
          mat={modal === 'new' ? null : modal}
          allMasterIngredients={masterIngredients}
          allSuppliers={suppliers}
          onClose={() => { setModal(null); load() }}
          onSave={handleSave}
        />
      )}

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
        <div>
          <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:28, fontStyle:'italic',
            color:S.ink, lineHeight:1 }}>Materials</div>
          <div style={{ fontSize:12, color:S.textLt, marginTop:3 }}>
            {materials.length} items · มูลค่าสต็อก ฿{totalValue.toFixed(0)}
            {lowStockCount > 0 && (
              <span style={{ color:S.red, marginLeft:8 }}>⚠ {lowStockCount} low</span>
            )}
          </div>
        </div>
        <Btn onClick={() => setModal('new')} style={{ padding:'10px 18px', fontSize:13 }}>+ Add</Btn>
      </div>

      {/* Search */}
      <div style={{ position:'relative', marginBottom:12 }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ค้นหา..."
          style={{ ...inputStyle, paddingLeft:36 }}/>
        <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)',
          color:S.textLt, fontSize:16, pointerEvents:'none' }}>⌕</span>
      </div>

      {/* Family filter */}
      <div style={{ display:'flex', gap:6, overflowX:'auto', paddingBottom:4, marginBottom:16 }}>
        {families.map(f => (
          <button key={f} onClick={() => setFilterFam(f)}
            style={{ padding:'5px 14px', borderRadius:20, cursor:'pointer', whiteSpace:'nowrap',
              fontFamily:'Inter,sans-serif', fontSize:11, fontWeight:500, flexShrink:0,
              border:'1.5px solid ' + (filterFam===f ? S.gold : S.border),
              background: filterFam===f ? S.goldLt : 'transparent',
              color: filterFam===f ? S.gold : S.textMid }}>{f}</button>
        ))}
      </div>

      {loading && <div style={{ textAlign:'center', padding:40, color:S.textLt }}>Loading...</div>}

      {!loading && filtered.length === 0 && (
        <div style={{ textAlign:'center', padding:'40px 0', color:S.textLt }}>
          <div style={{ fontSize:20, fontFamily:'Cormorant Garamond,serif', fontStyle:'italic' }}>
            {search ? 'ไม่พบวัตถุดิบ' : 'ยังไม่มีวัตถุดิบ'}
          </div>
          {!search && (
            <div style={{ fontSize:13, marginTop:6, color:S.textMid, lineHeight:1.8 }}>
              เริ่มจาก Bergamot EO, Rose Absolute,<br/>Cedarwood EO หรืออะไรที่มีใน lab
            </div>
          )}
        </div>
      )}

      {filtered.map(m => {
        const evapColor = { Top:S.green, Heart:'#8a3a68', Base:'#7a5c2e' }[m.evaporation] || S.textLt
        const isLow     = (m.stock||0) < 10
        const mi        = m.master_ingredient
        const hasIfra   = mi?.ifra_limit != null
        const hasSds    = !!mi?.sds_url || sdsMaterialIds.has(m.id)
        return (
          <Card key={m.id}
            style={{ padding:'14px 16px',
              borderLeft: isLow ? '3px solid ' + S.red : '3px solid transparent' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', marginBottom:4 }}>
                  <span style={{ fontFamily:'Cormorant Garamond,serif', fontSize:17,
                    fontStyle:'italic', color:S.ink }}>{m.name}</span>
                  {(m.families?.length ? m.families : m.family ? [m.family] : []).map((f, i) => (
                    <span key={i} style={{ fontSize:10, fontFamily:'Inter,sans-serif', fontWeight:500,
                      padding:'2px 8px', borderRadius:20,
                      color: (FC[f]||{c:S.textMid}).c,
                      background: (FC[f]||{bg:S.border}).bg }}>
                      {f}
                    </span>
                  ))}
                  {m.evaporation && (
                    <span style={{ fontSize:10, color:evapColor, fontWeight:600, letterSpacing:.5 }}>
                      {m.evaporation}
                    </span>
                  )}
                </div>
                {(m.supplier_info?.name || m.supplier) && (
                  <div style={{ fontSize:11, color:S.gold, marginBottom:3, fontWeight:500 }}>
                    🏪 {m.supplier_info?.name || m.supplier}
                    {m.purchase_price && m.purchase_size && (
                      <span style={{ color:S.textMid, fontWeight:400 }}>
                        {` · ฿${m.purchase_price}/${m.purchase_size}g`}
                      </span>
                    )}
                  </div>
                )}
                {mi?.cas && <div style={{ fontSize:11, color:S.textLt, marginBottom:3 }}>CAS: {mi.cas}</div>}
                {mi?.inci && <div style={{ fontSize:11, color:S.textLt, marginBottom:3 }}>INCI: {mi.inci}</div>}
                {mi?.sds_url && (
                  <div style={{ fontSize:11, marginBottom:3 }}>
                    <a href={mi.sds_url} target="_blank" rel="noopener noreferrer"
                      style={{ color:S.gold, textDecoration:'underline' }}
                      onClick={e => e.stopPropagation()}>
                      📄 SDS
                    </a>
                  </div>
                )}
                {m.notes && (
                  <div style={{ fontSize:11, color:S.textMid, marginBottom:4,
                    fontStyle:'italic' }}>♪ {m.notes}</div>
                )}
                <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
                  <span style={{ fontSize:13, color: isLow ? S.red : S.green, fontWeight:500 }}>
                    {(m.stock||0).toFixed(1)}g{isLow && ' ⚠'}
                  </span>
                  {m.cost != null && (
                    <span style={{ fontSize:12, color:S.textMid }}>฿{m.cost}/g</span>
                  )}
                  {hasIfra && (
                    <span style={{ fontSize:11, color:'#c07820', fontWeight:600,
                      background:'#fff8f0', padding:'1px 7px', borderRadius:10,
                      border:'1px solid #e8c88a' }}>
                      IFRA ≤{mi.ifra_limit}%
                    </span>
                  )}
                  {m.dilution != null && (
                    <span style={{ fontSize:12, color:S.textMid }}>{m.dilution}%</span>
                  )}
                  {!hasSds && (
                    <span style={{ fontSize:11, color:'#b0402a', fontWeight:600,
                      background:'#fdf0ec', padding:'1px 7px', borderRadius:10,
                      border:'1px solid #f0c4b4' }}>
                      ⚠️ ไม่มี SDS
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display:'flex', gap:8, flexShrink:0, marginLeft:8 }}>
                {m.purchase_price && m.purchase_size && (
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
                    <button onClick={() => setPurchaseModal(m)}
                      style={{ background: isToday(m.last_purchased_at) ? '#fdf5e6' : '#f0f5ee',
                        border:`1px solid ${isToday(m.last_purchased_at) ? '#e0c896' : '#c8ddc0'}`,
                        color: isToday(m.last_purchased_at) ? '#9a7520' : '#3b6d11',
                        borderRadius:8, padding:'6px 12px', cursor:'pointer',
                        fontSize:12, fontFamily:'Inter,sans-serif', fontWeight:600 }}>
                      💰 ซื้อ
                    </button>
                    {m.last_purchased_at && (
                      <span style={{ fontSize:9, color: isToday(m.last_purchased_at) ? '#9a7520' : S.textLt,
                        fontFamily:'Inter,sans-serif', whiteSpace:'nowrap' }}>
                        {isToday(m.last_purchased_at) ? '✓ ซื้อวันนี้แล้ว' : `ซื้อล่าสุด ${fmtShortDate(m.last_purchased_at)}`}
                      </span>
                    )}
                  </div>
                )}
                <button onClick={() => setOpenTraits(openTraits===m.id ? null : m.id)}
                  style={{ background: openTraits===m.id ? S.goldLt : 'none',
                    border:'1px solid ' + (openTraits===m.id ? S.gold : S.border),
                    color: openTraits===m.id ? S.gold : S.textMid,
                    borderRadius:8, padding:'6px 12px', cursor:'pointer',
                    fontSize:12, fontFamily:'Inter,sans-serif', fontWeight: openTraits===m.id ? 600 : 400 }}>
                  Traits
                </button>
                <button onClick={() => setModal(m)}
                  style={{ background:'none', border:'1px solid ' + S.border, color:S.textMid,
                    borderRadius:8, padding:'6px 12px', cursor:'pointer',
                    fontSize:12, fontFamily:'Inter,sans-serif' }}>Edit</button>
                <button onClick={() => handleDelete(m)}
                  style={{ background:'none', border:'1px solid ' + S.red + '44', color:S.red,
                    borderRadius:8, padding:'6px 12px', cursor:'pointer',
                    fontSize:12, fontFamily:'Inter,sans-serif' }}>×</button>
              </div>
            </div>
            {openTraits === m.id && (
              <QuickTraits materialId={m.id} onDone={() => setOpenTraits(null)}/>
            )}
          </Card>
        )
      })}

      {/* Modal บันทึกการซื้อ — ดึงราคา+ขนาดที่ตั้งไว้แล้วมาเติมอัตโนมัติ ไม่ต้องพิมพ์ใหม่ */}
      {purchaseModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)',
          display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, padding:20 }}
          onClick={() => !purchaseSaving && setPurchaseModal(null)}>
          <div onClick={e => e.stopPropagation()}
            style={{ background:S.white, borderRadius:14, padding:20, width:'100%', maxWidth:360 }}>
            <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:18,
              fontStyle:'italic', color:S.ink, marginBottom:4 }}>
              บันทึกการซื้อ
            </div>
            <div style={{ fontSize:13, color:S.textMid, marginBottom:16 }}>
              {purchaseModal.name} · {purchaseModal.purchase_size}g · ฿{purchaseModal.purchase_price}
            </div>
            {isToday(purchaseModal.last_purchased_at) && (
              <div style={{ background:'#fdf5e6', border:'1px solid #e0c896', borderRadius:8,
                padding:'8px 12px', marginBottom:14, fontSize:11.5, color:'#9a7520' }}>
                ⚠ ซื้อ "{purchaseModal.name}" ไปแล้ววันนี้ — กดบันทึกซ้ำจะสร้างรายการเพิ่มอีก 1 รายการ
              </div>
            )}
            <div style={{ fontSize:11, color:S.textMid, marginBottom:6 }}>
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
            <button onClick={() => handleRecordPurchase(purchaseModal, purchaseGroups)} disabled={purchaseSaving}
              style={{ width:'100%', padding:'10px 0', borderRadius:10, cursor: purchaseSaving ? 'default' : 'pointer',
                border:'none', background: purchaseSaving ? S.border : S.gold, color:'#fff',
                fontSize:13, fontWeight:600, fontFamily:'Inter,sans-serif', marginBottom:8,
                opacity: purchaseSaving ? 0.6 : 1 }}>
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
