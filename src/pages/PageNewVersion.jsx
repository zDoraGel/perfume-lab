import { useState, useEffect } from 'react'
import { db } from '../lib/db'
import { callAI, parseAIJson } from '../lib/ai'
import { S, inputStyle } from '../constants/theme'
import { Btn, BackBtn, TextInput, TextArea, SelectInput, Field } from '../components/ui'
import StockRecommendations from '../components/StockRecommendations'
import MaterialPicker from '../components/MaterialPicker'
import { FormulaDNAActual } from '../components/FormulaDNA'

export default function PageNewVersion({ formula, versions, onBack, onSave }) {
  const [status,      setStatus]      = useState('Pending')
  const [rating,      setRating]      = useState('')
  const [notes,       setNotes]       = useState('')
  const [date,        setDate]        = useState(new Date().toISOString().slice(0,10))
  const [batchMl,     setBatchMl]     = useState('15')
  const [ings,        setIngs]        = useState([{ materialId:'', grams:'' }])
  const [materials,   setMats]        = useState([])
  const [saving,      setSaving]      = useState(false)
  const [dnaActual,   setDnaActual]   = useState({})
  const [autoNoting,  setAutoNoting]  = useState(false)
  const [prefilled,   setPrefilled]   = useState(false)

  const [aiSugg,         setAiSugg]         = useState(null)
  const [aiLoading,      setAiLoading]      = useState(false)
  const [selectedChoice, setSelectedChoice] = useState({})
  const [expandedIng,    setExpandedIng]    = useState(null)
  const [expertMode,     setExpertMode]     = useState(false)
  const [aiApplied,      setAiApplied]      = useState(false)

  const nextVer    = versions.length ? Math.max(...versions.map(v=>v.ver)) + 1 : 1
  const total      = ings.reduce((s,r) => s + (parseFloat(r.grams)||0), 0)
  const roleColors = { top: S.green, heart: '#8a3a68', base: '#7a5c2e' }
  const roleBg     = { top: '#eef5f0', heart: '#fceef7', base: '#f5ede0' }

  useEffect(() => {
    db.getMaterials().then(async mats => {
      setMats(mats)
      if (versions.length > 0) {
        const latest = versions[versions.length - 1]
        if (latest.batch_ml) setBatchMl(String(latest.batch_ml))
        const latestItems = await db.getItems(latest.id)
        if (latestItems.length > 0) {
          setIngs(latestItems.map(i => ({ materialId: i.material_id, grams: i.grams })))
          setPrefilled(true)
        }
      }
    })
  }, [])

  async function genAutoNotes() {
    if (!ings.some(r=>r.materialId&&r.grams)) return
    setAutoNoting(true)
    const prevVer      = versions[versions.length - 1]
    const currentIngs  = ings.filter(r=>r.materialId&&r.grams).map(r => {
      const m = materials.find(x=>x.id===parseInt(r.materialId))
      return (m?.name || '?') + ': ' + r.grams + 'g'
    }).join(', ')
    let prompt = 'Formula: "' + formula.name + '" V' + nextVer + '\nIngredients: ' + currentIngs + '\nBatch: ' + batchMl + 'ml'
    if (prevVer) prompt += '\n\nเทียบกับ V' + prevVer.ver + ' (' + (prevVer.notes || 'ไม่มี notes') + ')'
    prompt += '\n\nเขียน notes สั้นๆ 1-2 ประโยค ภาษาไทย อธิบายว่าปรับอะไรจากครั้งก่อน'
    const r = await callAI('นักปรุงน้ำหอมมืออาชีพ เขียน notes กระชับ ภาษาไทย', prompt)
    setNotes(r.trim()); setAutoNoting(false)
  }

  async function genAISuggest() {
    setAiLoading(true); setAiSugg(null); setSelectedChoice({}); setExpandedIng(null); setAiApplied(false)
    const matList  = materials.map(m => m.name + ' (' + m.family + ', stock: ' + m.stock + 'g, evap: ' + (m.evaporation||'?') + ')').join(', ')
    const prevInfo = versions.length > 0
      ? 'Version ล่าสุด V' + versions[versions.length-1].ver + ': ' + (versions[versions.length-1].notes || 'ไม่มี notes')
      : 'นี่คือ version แรก'
    const sysPrompt = [
      'You are a world-class perfumer. Reply with RAW JSON only. No markdown. No backticks. No explanation.',
      'JSON format: {"ingredients":[{"role":"top","primary":{"name":"Bergamot","family":"Citrus","grams":0.5,"ml":0.6,"reason":"Thai 1 sentence"},"alternatives":[{"name":"Lemon","family":"Citrus","grams":0.4,"ml":0.5,"similarity":"Thai","note":"Thai"},{"name":"Lime","family":"Citrus","grams":0.5,"ml":0.6,"similarity":"Thai","note":"Thai"},{"name":"Grapefruit","family":"Citrus","grams":0.5,"ml":0.6,"similarity":"Thai","note":"Thai"},{"name":"Yuzu","family":"Citrus","grams":0.4,"ml":0.5,"similarity":"Thai","note":"Thai"},{"name":"Petitgrain","family":"Fresh","grams":0.5,"ml":0.6,"similarity":"Thai","note":"Thai"}]}],"notes":"Thai 2 sentences"}',
    ].join(' ')
    const userPrompt = [
      'Formula: "' + formula.name + '" (vibe: ' + (formula.vibe||'ไม่ระบุ') + ')',
      prevInfo,
      'Batch size: ' + batchMl + 'ml',
      'Materials ในสต็อค: ' + matList,
      '',
      'แนะนำสูตรสำหรับ V' + nextVer + ':',
      '- primary: use materials in stock first',
      '- 5 alternatives per ingredient, ranked best to worst',
      '- include grams AND ml for every option',
      '- correct top/heart/base assignment based on evaporation rate',
      '- ต้องมี Top note อย่างน้อย 1 ตัว (Bergamot, Lemon, Lime, Neroli, Petitgrain, Litsea, Green Tea หรือ material ที่ evap=Top)',
      '- ต้องมี Heart note อย่างน้อย 2 ตัว',
      '- ต้องมี Base note อย่างน้อย 2 ตัว',
      '- สัดส่วน: Top 15-25%, Heart 35-45%, Base 35-45% ของ total grams',
      '- reason in Thai (1 sentence), similarity in Thai, note = how to adjust amount',
      (() => {
        const cxPrompt = {
          simple:   'Formula complexity: simple — keep it minimal, 4-6 ingredients max, clean pyramid',
          standard: 'Formula complexity: standard — balanced pyramid, 6-10 ingredients',
          complex:  'Formula complexity: complex — rich layered niche structure, aim for 10-15 ingredients, add supporting notes for depth, diffusion, longevity and smooth transitions. Use as many as naturally needed — do not force minimalism.',
        }[formula.complexity || 'standard']
        return cxPrompt
      })(),
    ].join('\n')
    const r = await callAI(sysPrompt, userPrompt)
    try {
      const p = parseAIJson(r)
      if (!p.ingredients) throw new Error('no ingredients key')
      setAiSugg(p)
    } catch (e) {
      setAiSugg({ error: '⚠ ' + e.message + '\n\nRAW:\n' + String(r).substring(0, 500) })
    }
    setAiLoading(false)
  }

  function findInStock(ingName) {
    if (!ingName) return null
    const n = ingName.toLowerCase()
    return materials.find(m =>
      m.name.toLowerCase().includes(n) || n.includes(m.name.toLowerCase().split(' ')[0])
    )
  }

  function getChosenOpt(ing) {
    const idx = selectedChoice[ing.primary?.name] || 0
    if (idx === 0) return { ...ing.primary, isAlt: false }
    return { ...ing.alternatives[idx-1], isAlt: true }
  }

  async function applyAISuggestion() {
    if (!aiSugg?.ingredients) return
    const applied = await Promise.all(aiSugg.ingredients.map(async ing => {
      const chosen = getChosenOpt(ing)
      let mat = findInStock(chosen.name)
      if (!mat) {
        mat = await db.createMaterial({
          name: chosen.name,
          family: chosen.family || 'Other',
          stock: 0,
          evaporation: ing.role === 'top' ? 'Top' : ing.role === 'heart' ? 'Heart' : 'Base',
        })
        const newMats = await db.getMaterials()
        setMats(newMats)
      }
      return mat ? { materialId: String(mat.id), grams: String(chosen.grams), ml: chosen.ml || null } : null
    }))
    const valid = applied.filter(Boolean)
    if (valid.length > 0) { setIngs(valid); setAiApplied(true) }
  }

  function updIng(idx, field, val) {
    setIngs(p => p.map((r,i) => i===idx ? {...r,[field]:val} : r))
  }

  async function save() {
    const valid = ings.filter(r => r.materialId && r.grams)
    if (!valid.length) return
    setSaving(true)
    await onSave(status, rating ? parseInt(rating) : null, notes, date,
      parseFloat(batchMl)||15,
      valid.map(r => {
        const mat = materials.find(m => m.id === parseInt(r.materialId))
        return {
          materialId: parseInt(r.materialId),
          grams:      parseFloat(r.grams),
          ml:         r.ml ? parseFloat(r.ml) : null,
          family:     mat?.family || '',
        }
      }),
      dnaActual)
    setSaving(false)
  }

  return (
    <div>
      <BackBtn onClick={onBack}/>
      <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:24, color:S.ink,
        fontStyle:'italic', marginBottom:2 }}>{formula.name}</div>
      <div style={{ fontSize:13, color:S.textLt, marginBottom:24 }}>New Version · V{nextVer}</div>

      {/* Stock Recommendations ── ใส่ตรงนี้ก่อนเริ่ม blend */}
      <StockRecommendations vibe={formula.vibe} materials={materials}/>

      {/* Status + Rating */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
        <div>
          <div style={{ fontSize:12, color:S.textMid, fontWeight:500, letterSpacing:.5,
            textTransform:'uppercase', marginBottom:8 }}>Status</div>
          <div style={{ display:'flex', gap:6 }}>
            {[
              { val:'Pending', color:S.amber,  bg:'#fdf5e6', dot:'#f0b429' },
              { val:'Success', color:S.green,  bg:S.greenBg, dot:S.green  },
              { val:'Failed',  color:S.red,    bg:'#fdf0ee', dot:S.red    },
            ].map(s => (
              <button key={s.val} onClick={() => setStatus(s.val)}
                style={{ flex:1, padding:'10px 0', borderRadius:10, cursor:'pointer',
                  fontFamily:'Inter,sans-serif', fontSize:11, fontWeight:600,
                  border:`1.5px solid ${status===s.val ? s.color : S.border}`,
                  background: status===s.val ? s.bg : 'transparent',
                  color: status===s.val ? s.color : S.textMid,
                  display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
                <span style={{ width:7, height:7, borderRadius:'50%',
                  background: status===s.val ? s.dot : S.border,
                  flexShrink:0 }}/>
                {s.val}
              </button>
            ))}
          </div>
        </div>
        <TextInput label="Rating" value={rating} onChange={setRating} placeholder="1–10" type="number"/>
      </div>

      {/* Date + Batch */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
        <TextInput label="Blend Date" value={date} onChange={setDate} type="date"/>
        <div>
          <div style={{ fontSize:12, color:S.textMid, fontWeight:500, letterSpacing:.5,
            textTransform:'uppercase', marginBottom:6 }}>Batch Size</div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {[5,10,15,30,50,100].map(ml => (
              <button key={ml} onClick={() => setBatchMl(String(ml))}
                style={{ padding:'6px 12px', borderRadius:20, cursor:'pointer',
                  fontFamily:'Inter,sans-serif', fontSize:12, fontWeight:500,
                  border:`1.5px solid ${batchMl===String(ml)?S.gold:S.goldBd}`,
                  background: batchMl===String(ml)?S.gold:'transparent',
                  color: batchMl===String(ml)?'#fff':S.gold }}>
                {ml}ml
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Notes */}
      <div style={{ marginBottom:16 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
          <div style={{ fontSize:12, color:S.textMid, fontWeight:500, letterSpacing:.5, textTransform:'uppercase' }}>Notes</div>
          <button onClick={genAutoNotes} disabled={autoNoting}
            style={{ fontSize:11, color:S.gold, background:'none', border:'none',
              cursor:'pointer', fontFamily:'Inter,sans-serif', fontWeight:500 }}>
            {autoNoting ? 'Generating...' : '✦ Auto Notes'}
          </button>
        </div>
        <TextArea label="" value={notes} onChange={setNotes}
          placeholder="เช่น ลด Bergamot เพราะเปรี้ยวไป..." rows={3}/>
      </div>

      {/* AI Suggest Section */}
      <div style={{ background:S.goldLt, borderRadius:14, border:`1px solid ${S.goldBd}`,
        padding:'14px 16px', marginBottom:16 }}>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <div style={{ fontSize:11, color:S.gold, fontWeight:600, letterSpacing:.8, textTransform:'uppercase' }}>
            ✦ AI แนะนำ Ingredients
          </div>
          {aiSugg?.ingredients && (
            <button onClick={() => setExpertMode(p=>!p)}
              style={{ fontSize:11, fontWeight:600, fontFamily:'Inter,sans-serif', cursor:'pointer',
                padding:'4px 12px', borderRadius:20,
                border:`1.5px solid ${expertMode ? S.ink : S.goldBd}`,
                background: expertMode ? S.ink : 'transparent',
                color: expertMode ? '#fff' : S.textMid, transition:'all .15s' }}>
              {expertMode ? '⚗ Expert' : '⚗ Expert Mode'}
            </button>
          )}
        </div>

        <Btn variant="outline" onClick={genAISuggest} disabled={aiLoading} style={{ width:'100%' }}>
          {aiLoading ? '✦ กำลังคิดสูตร...' : `✦ แนะนำสูตรสำหรับ V${nextVer} · ${batchMl}ml`}
        </Btn>

        {aiSugg?.ingredients && !aiSugg.error && (
          <div style={{ marginTop:14 }}>
            <div style={{ fontSize:11, color:S.textMid, marginBottom:12, textAlign:'center' }}>
              {expertMode
                ? 'แตะ ingredient เพื่อดูตัวเลือกทั้งหมด'
                : 'AI เลือก ingredient ที่มีใน stock ให้อัตโนมัติ · เปิด Expert Mode เพื่อเลือกเอง'}
            </div>

            {['top','heart','base'].map(role => {
              const roleIngs = aiSugg.ingredients.filter(i => i.role === role)
              if (!roleIngs.length) return null
              const rc = roleColors[role]
              return (
                <div key={role} style={{ marginBottom:16 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                    <div style={{ height:1, flex:1, background:rc+'33' }}/>
                    <span style={{ fontSize:9, fontWeight:700, color:rc, letterSpacing:2, textTransform:'uppercase' }}>
                      {role} Note
                    </span>
                    <div style={{ height:1, flex:1, background:rc+'33' }}/>
                  </div>

                  {roleIngs.map((ing, ingIdx) => {
                    const chosenIdx = selectedChoice[ing.primary?.name] || 0
                    const chosen    = getChosenOpt(ing)
                    const inStock   = findInStock(chosen.name)
                    const isOpen    = expertMode && expandedIng === (role+ingIdx)

                    return (
                      <div key={ingIdx} style={{ marginBottom:8 }}>
                        <div onClick={() => expertMode && setExpandedIng(isOpen ? null : role+ingIdx)}
                          style={{ background:S.white, borderRadius:12, overflow:'hidden',
                            border:`1.5px solid ${isOpen ? rc : (inStock ? S.border : S.red+'55')}`,
                            cursor: expertMode ? 'pointer' : 'default', transition:'border-color .15s' }}>

                          <div style={{ padding:'12px 14px', display:'flex',
                            justifyContent:'space-between', alignItems:'flex-start' }}>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', marginBottom:4 }}>
                                <span style={{ fontFamily:'Cormorant Garamond,serif', fontSize:17,
                                  fontStyle:'italic', color:S.ink,
                                  textDecoration: inStock ? 'none' : 'line-through' }}>
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
                                {chosen.isAlt && (
                                  <span style={{ fontSize:9, color:S.gold, fontWeight:600,
                                    background:S.goldLt, padding:'1px 8px', borderRadius:20 }}>เลือกเอง</span>
                                )}
                              </div>
                              {chosen.reason && (
                                <div style={{ fontSize:11, color:S.textLt, lineHeight:1.5 }}>{chosen.reason}</div>
                              )}
                            </div>
                            <div style={{ textAlign:'right', flexShrink:0, marginLeft:12 }}>
                              <div style={{ fontSize:14, color:S.ink, fontWeight:500 }}>{chosen.grams}g</div>
                              <div style={{ fontSize:12, color:S.gold }}>{chosen.ml}ml</div>
                              {expertMode && (
                                <div style={{ fontSize:11, color:S.textLt, marginTop:3 }}>
                                  {isOpen ? '▲' : '▼'}
                                </div>
                              )}
                            </div>
                          </div>

                          {isOpen && (
                            <div style={{ borderTop:`1px solid ${S.border}`, background:'#fdfcfa', padding:'10px 14px' }}>
                              <div style={{ fontSize:10, color:S.textMid, fontWeight:600,
                                letterSpacing:.8, textTransform:'uppercase', marginBottom:8 }}>เลือก ingredient</div>
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
                                      border:`1.5px solid ${isChosen ? rc : S.border}`,
                                      transition:'all .12s' }}>
                                    <div style={{ width:22, height:22, borderRadius:'50%', flexShrink:0,
                                      display:'flex', alignItems:'center', justifyContent:'center',
                                      background: isChosen ? rc : S.border }}>
                                      <span style={{ fontSize:10, fontWeight:700, color: isChosen ? '#fff' : S.textMid }}>
                                        {optIdx === 0 ? '★' : optIdx}
                                      </span>
                                    </div>
                                    <div style={{ flex:1, minWidth:0 }}>
                                      <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap', marginBottom:2 }}>
                                        <span style={{ fontFamily:'Cormorant Garamond,serif', fontSize:15, fontStyle:'italic',
                                          color: optInStock ? S.ink : S.textMid,
                                          textDecoration: optInStock ? 'none' : 'line-through' }}>
                                          {opt.name}
                                        </span>
                                        {optInStock
                                          ? <span style={{ fontSize:9, color:S.green, fontWeight:600,
                                              background:S.greenBg, padding:'1px 6px', borderRadius:20 }}>
                                              ✓ {optInStock.stock}g
                                            </span>
                                          : <span style={{ fontSize:9, color:S.textLt, background:S.border, padding:'1px 6px', borderRadius:20 }}>
                                              ต้องหาซื้อ
                                            </span>
                                        }
                                        {optIdx === 0 && (
                                          <span style={{ fontSize:9, color:S.gold, fontWeight:600 }}>AI แนะนำ</span>
                                        )}
                                      </div>
                                      {optIdx > 0 && opt.similarity && (
                                        <div style={{ fontSize:10, color:S.textLt }}>{opt.similarity}</div>
                                      )}
                                      {optIdx > 0 && opt.note && (
                                        <div style={{ fontSize:10, color:S.amber, marginTop:1 }}>{opt.note}</div>
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

            {aiSugg.notes && (
              <div style={{ fontSize:12, color:S.textMid, fontStyle:'italic',
                padding:'12px 16px', background:S.white, borderRadius:12,
                border:`1px solid ${S.goldBd}`, marginTop:4, lineHeight:1.7 }}>
                {aiSugg.notes}
              </div>
            )}

            <button onClick={applyAISuggestion}
              style={{ width:'100%', marginTop:12, padding:'11px 0', borderRadius:10,
                cursor:'pointer', fontFamily:'Inter,sans-serif', fontSize:13, fontWeight:600,
                background: aiApplied ? S.green : S.gold, border:'none', color:'#fff' }}>
              {aiApplied ? '✓ ใส่ Ingredients แล้ว — แก้ไขได้ด้านล่าง' : '↓ ใส่ Ingredients ที่เลือก'}
            </button>
          </div>
        )}

        {aiSugg?.error && (
          <div style={{ fontSize:12, color:S.red, padding:12, background:'#fdf0ee',
            borderRadius:8, marginTop:8, wordBreak:'break-all' }}>
            <div style={{ fontWeight:600, marginBottom:4 }}>⚠ Parse error</div>
            <div style={{ fontSize:10, color:'#a03030', fontFamily:'monospace',
              maxHeight:120, overflowY:'auto', background:'#fff5f5',
              padding:'6px 8px', borderRadius:6, marginBottom:8 }}>
              {String(aiSugg.error).substring(0, 400)}
            </div>
            <button onClick={genAISuggest}
              style={{ fontSize:11, color:S.gold, background:'none',
                border:'1px solid '+S.goldBd, borderRadius:8,
                padding:'4px 12px', cursor:'pointer', fontFamily:'Inter,sans-serif', fontWeight:500 }}>
              ↻ ลอง Generate ใหม่
            </button>
          </div>
        )}
      </div>

      {/* Manual Ingredients */}
      {prefilled && !aiApplied && (
        <div style={{ background:S.goldLt, borderRadius:10, padding:'10px 14px',
          marginBottom:10, fontSize:12, color:S.gold }}>
          ✦ Pre-filled จาก V{versions[versions.length-1]?.ver} — แก้ไขได้เลย
        </div>
      )}

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
        <div style={{ fontSize:12, color:S.textMid, fontWeight:500, textTransform:'uppercase', letterSpacing:.5 }}>
          Ingredients
        </div>
        <span style={{ fontSize:12, color:S.gold, fontWeight:500 }}>Total {total.toFixed(3)}g</span>
      </div>

      {ings.map((row, idx) => {
        const mat = materials.find(m => m.id === parseInt(row.materialId))
        const low = mat && (mat.stock||0) < 10
        return (
          <div key={idx} style={{ display:'flex', gap:8, marginBottom:10, alignItems:'flex-start' }}>
            <MaterialPicker
              materials={materials}
              value={row.materialId}
              onChange={(id) => updIng(idx, 'materialId', id)}
            />
            <input type="number" value={row.grams} onChange={e=>updIng(idx,'grams',e.target.value)}
              placeholder="g"
              style={{ flex:1, background:S.white, border:`1px solid ${low ? S.red+'88' : S.border}`,
                borderRadius:10, padding:'12px 14px', fontSize:14,
                fontFamily:'Inter,sans-serif', color:S.text, outline:'none',
                boxSizing:'border-box', maxWidth:80 }}/>
            {ings.length > 1 && (
              <button onClick={() => setIngs(p=>p.filter((_,i)=>i!==idx))}
                style={{ background:'none', border:'none', color:S.textLt,
                  fontSize:22, cursor:'pointer', flexShrink:0, paddingTop:10 }}>×</button>
            )}
          </div>
        )
      })}

      <button onClick={() => setIngs(p=>[...p,{materialId:'',grams:''}])}
        style={{ fontSize:13, color:S.gold, background:'none', border:'none',
          cursor:'pointer', fontWeight:500, marginBottom:20 }}>+ Add ingredient</button>

      {/* DNA Actual */}
      <FormulaDNAActual values={dnaActual} onChange={(field, val) => setDnaActual(p => ({...p, [field]: val}))}/>

      <Btn onClick={save}
        disabled={!ings.some(r=>r.materialId&&r.grams)||saving}
        style={{ width:'100%' }}>
        {saving ? 'Saving...' : 'Save Version'}
      </Btn>
    </div>
  )
}
