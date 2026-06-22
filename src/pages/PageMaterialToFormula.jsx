import { useState, useEffect, useRef } from 'react'
import { db } from '../lib/db'
import { callAI, parseAIJson } from '../lib/ai'
import { S, FC } from '../constants/theme'
import { Btn, BackBtn } from '../components/ui'

// ── Multi-select material chips ────────────────────────────────────────────────
function MultiMaterialPicker({ materials, selected, onAdd, onRemove }) {
  const [query, setQuery] = useState('')
  const [open,  setOpen]  = useState(false)
  const wrapRef = useRef()

  const filtered = query.trim()
    ? materials.filter(m =>
        !selected.find(s => s.id === m.id) &&
        (m.name.toLowerCase().includes(query.toLowerCase()) ||
         (m.family||'').toLowerCase().includes(query.toLowerCase()))
      ).slice(0, 8)
    : materials.filter(m => !selected.find(s => s.id === m.id)).slice(0, 8)

  useEffect(() => {
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={wrapRef} style={{ position:'relative' }}>
      {/* selected chips */}
      {selected.length > 0 && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:8 }}>
          {selected.map(m => {
            const fc = FC[m.family] || { c:S.textMid, bg:S.border }
            return (
              <div key={m.id} style={{ display:'flex', alignItems:'center', gap:6,
                padding:'5px 8px 5px 12px', borderRadius:20, background:fc.bg }}>
                <span style={{ fontFamily:'Cormorant Garamond,serif', fontStyle:'italic',
                  fontSize:13, color:fc.c }}>{m.name}</span>
                <button onClick={() => onRemove(m.id)}
                  style={{ background:'none', border:'none', cursor:'pointer',
                    color:fc.c, fontSize:14, lineHeight:1, padding:0 }}>×</button>
              </div>
            )
          })}
        </div>
      )}

      <input value={query} onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder="ค้นหา material ที่อยากใช้..."
        style={{ width:'100%', background:S.white,
          border:`1.5px solid ${open ? S.gold : S.border}`,
          borderRadius: open ? '10px 10px 0 0' : 10,
          padding:'12px 14px', fontSize:14,
          fontFamily:'Cormorant Garamond,serif', fontStyle:'italic',
          color:S.ink, outline:'none', boxSizing:'border-box' }}/>

      {open && (
        <div style={{ position:'absolute', top:'100%', left:0, right:0, zIndex:50,
          background:S.white, border:`1.5px solid ${S.gold}`, borderTop:'none',
          borderRadius:'0 0 12px 12px', boxShadow:'0 8px 24px rgba(0,0,0,0.08)',
          maxHeight:260, overflowY:'auto' }}>
          {filtered.length === 0 ? (
            <div style={{ padding:'14px 16px', fontSize:13, color:S.textLt,
              fontStyle:'italic', textAlign:'center' }}>ไม่พบ "{query}"</div>
          ) : filtered.map(mat => {
            const fc = FC[mat.family] || { c:S.textMid, bg:S.border }
            return (
              <div key={mat.id}
                onMouseDown={() => { onAdd(mat); setQuery(''); setOpen(false) }}
                style={{ padding:'10px 14px', cursor:'pointer',
                  borderBottom:`1px solid ${S.border}` }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:15,
                      fontStyle:'italic', color:S.ink }}>{mat.name}</div>
                    <div style={{ display:'flex', gap:6, marginTop:3 }}>
                      {mat.family && <span style={{ fontSize:9, fontWeight:500, padding:'1px 6px',
                        borderRadius:20, color:fc.c, background:fc.bg }}>{mat.family}</span>}
                    </div>
                  </div>
                  {mat.stock != null && (
                    <div style={{ fontSize:11, fontWeight:500,
                      color: mat.stock < 10 ? S.red : S.green }}>{mat.stock}g</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Idea card ───────────────────────────────────────────────────────────────────
function IdeaCard({ idea, onGetFull, fullState }) {
  return (
    <div style={{ padding:'14px 16px', background:S.white, borderRadius:12,
      border:`1px solid ${S.goldBd}`, marginBottom:12 }}>
      <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:18,
        fontStyle:'italic', color:S.ink, marginBottom:4 }}>{idea.name}</div>
      <div style={{ fontSize:12, color:S.gold, fontWeight:500, marginBottom:6 }}>
        {idea.vibe_en}
      </div>
      <div style={{ fontSize:12, color:S.textMid, lineHeight:1.6, marginBottom:8 }}>
        {idea.reason_th}
      </div>
      {idea.suited_for_th && (
        <div style={{ fontSize:12, color:S.ink, lineHeight:1.6, marginBottom:10,
          padding:'8px 10px', background:S.bg, borderRadius:8,
          borderLeft:`3px solid ${S.gold}` }}>
          <span style={{ fontSize:9, fontWeight:700, color:S.gold, letterSpacing:.6,
            textTransform:'uppercase', display:'block', marginBottom:3 }}>เหมาะกับใคร</span>
          {idea.suited_for_th}
        </div>
      )}
      {idea.role_hint && (
        <div style={{ fontSize:11, color:S.textLt, marginBottom:10, fontStyle:'italic' }}>
          💡 {idea.role_hint}
        </div>
      )}

      {!fullState && (
        <Btn variant="outline" onClick={() => onGetFull(idea)} style={{ width:'100%' }}>
          ✦ ขอสูตรเต็ม
        </Btn>
      )}
      {fullState === 'loading' && (
        <div style={{ textAlign:'center', fontSize:12, color:S.textMid, padding:'8px 0' }}>
          ⏳ กำลังสร้างสูตร...
        </div>
      )}
    </div>
  )
}

// ── Full formula result ─────────────────────────────────────────────────────────
function FullFormulaResult({ formula, idea, onSave, savingState }) {
  if (formula.error) {
    return (
      <div style={{ fontSize:12, color:S.red, padding:12, background:'#fdf0ee', borderRadius:10 }}>
        AI ตอบไม่ถูก format — ลองขอสูตรเต็มใหม่อีกครั้ง
      </div>
    )
  }
  return (
    <div style={{ padding:'14px 16px', background:S.goldLt, borderRadius:12,
      border:`1px solid ${S.goldBd}`, marginTop:8 }}>
      {formula.ingredients?.map((ing, i) => (
        <div key={i} style={{ display:'flex', justifyContent:'space-between',
          alignItems:'center', padding:'7px 0',
          borderBottom: i < formula.ingredients.length-1 ? `1px solid ${S.border}` : 'none' }}>
          <div>
            <span style={{ fontSize:9, fontWeight:600, color:S.textMid,
              textTransform:'uppercase', marginRight:8 }}>{ing.role}</span>
            <span style={{ fontFamily:'Cormorant Garamond,serif', fontStyle:'italic',
              fontSize:14, color:S.ink }}>{ing.primary?.name}</span>
            {ing._matched === false && (
              <span style={{ fontSize:9, color:S.red, marginLeft:6 }}>⚠ ไม่พบใน Materials</span>
            )}
          </div>
          <span style={{ fontSize:12, color:S.gold }}>
            {ing.primary?.grams}g / {ing.primary?.ml}ml
          </span>
        </div>
      ))}
      {formula.notes && (
        <div style={{ fontSize:12, color:S.textMid, fontStyle:'italic', marginTop:10, lineHeight:1.6 }}>
          {formula.notes}
        </div>
      )}

      {savingState === 'saved' ? (
        <div style={{ textAlign:'center', fontSize:12, color:S.green, fontWeight:600,
          padding:'10px 0' }}>
          ✓ บันทึกเป็นสูตรใหม่แล้ว — ไปดูที่ Formula list ได้เลยค่ะ
        </div>
      ) : (
        <Btn onClick={() => onSave(formula, idea)} disabled={savingState === 'saving'}
          style={{ width:'100%', marginTop:12 }}>
          {savingState === 'saving' ? '⏳ กำลังบันทึก...' : '💾 บันทึกเป็นสูตรใหม่เลย'}
        </Btn>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function PageMaterialToFormula({ onBack, onSaved, initialMaterial }) {
  const [materials, setMaterials] = useState([])
  const [selected,   setSelected] = useState([]) // array of material objects
  const [ideas,      setIdeas]    = useState(null)
  const [ideaLoading,setIdeaLoading] = useState(false)
  const [fullStates, setFullStates] = useState({}) // ideaIndex -> 'loading' | result obj
  const [savingStates, setSavingStates] = useState({}) // ideaIndex -> 'saving' | 'saved'
  const [error,      setError]    = useState('')

  useEffect(() => {
    db.getMaterials().then(mats => {
      setMaterials(mats)
      if (initialMaterial) {
        const m = mats.find(x => x.id === initialMaterial.id || x.id === initialMaterial)
        if (m) setSelected([m])
      }
    })
  }, [])

  function addMat(m) { setSelected(p => [...p, m]) }
  function removeMat(id) { setSelected(p => p.filter(m => m.id !== id)) }

  // ── Step 1: เบาๆ — ขอแค่ไอเดีย vibe ───────────────────────────────────────────
  async function getIdeas() {
    if (selected.length === 0) return
    setIdeaLoading(true); setIdeas(null); setFullStates({}); setError('')

    const matDesc = selected.map(m =>
      `${m.name} (${m.family}, ${m.evaporation || '?'}${m.scent_profile ? ', ' + m.scent_profile : ''})`
    ).join(', ')

    const sysPrompt = 'You are a world-class perfumer brainstorming partner. Reply with RAW JSON only. No markdown. No backticks. Format: {"ideas":[{"name":"short evocative name (English)","vibe_en":"3-5 word vibe tag","reason_th":"Thai 1-2 sentences explaining why these materials suit this direction","suited_for_th":"Thai 2-3 sentences describing the kind of person/lifestyle/occasion this fragrance suits — e.g. personality, how they want to be perceived, when they would wear it","role_hint":"Thai short note on what role these materials would play (top/heart/base)"}]} — give exactly 3 ideas, each a genuinely different direction.'

    const userPrompt = `Materials to build around: ${matDesc}\n\nSuggest 3 distinct fragrance concept directions that would showcase these material(s) well. Each idea should feel different in mood/season/occasion from the others.`

    try {
      const r = await callAI(sysPrompt, userPrompt)
      const p = parseAIJson(r)
      if (!p.ideas?.length) throw new Error('no ideas')
      setIdeas(p.ideas)
    } catch (e) {
      setError('AI ไม่ตอบ หรือ format ผิด — ลองใหม่อีกครั้ง')
    }
    setIdeaLoading(false)
  }

  // ── Step 2: หนักขึ้น — ขอสูตรเต็มจากไอเดียที่เลือก ──────────────────────────────
  async function getFullFormula(idea, ideaIdx) {
    setFullStates(p => ({ ...p, [ideaIdx]: 'loading' }))

    const inStockMats  = materials.filter(m => (m.stock || 0) > 0.1)
    const outStockMats = materials.filter(m => !((m.stock || 0) > 0.1))
    const inStockList  = inStockMats.map(m => `${m.name} (${m.family}, stock: ${m.stock}g, evap: ${m.evaporation||'?'})`).join(', ') || '(ไม่มี)'
    const outStockList = outStockMats.map(m => `${m.name} (${m.family}, evap: ${m.evaporation||'?'})`).join(', ') || '(ไม่มี)'
    const mustUse = selected.map(m => m.name).join(', ')

    const sysPrompt = 'You are a world-class perfumer. Reply with RAW JSON only. No markdown. No backticks. JSON format: {"ingredients":[{"role":"top","primary":{"name":"Bergamot","family":"Citrus","grams":0.5,"ml":0.6,"reason":"Thai 1 sentence"}}],"notes":"Thai 2 sentences"}'

    const userPrompt = [
      `Concept: "${idea.name}" — ${idea.vibe_en}`,
      `Concept reasoning (Thai): ${idea.reason_th}`,
      '',
      `MUST INCLUDE these materials (the whole point of this formula): ${mustUse}`,
      '',
      '✅ MATERIALS ALREADY IN STOCK (use these FIRST for the rest of the pyramid):',
      inStockList,
      '',
      '🛒 MATERIALS NOT IN STOCK (use only if truly necessary):',
      outStockList,
      '',
      'Build a complete top/heart/base pyramid around the MUST INCLUDE materials.',
      '- ต้องมี Top note อย่างน้อย 1 ตัว',
      '- ต้องมี Heart note อย่างน้อย 2 ตัว',
      '- ต้องมี Base note อย่างน้อย 2 ตัว',
      'Batch size: 15ml. Include grams AND ml. Reason in Thai 1 sentence per ingredient.',
    ].join('\n')

    try {
      const r = await callAI(sysPrompt, userPrompt)
      let clean = r.replace(/^﻿/, '').replace(/```json\s*/gi, '').replace(/```/g, '').trim()
      const fb = clean.indexOf('{'), lb = clean.lastIndexOf('}')
      if (fb > 0) clean = clean.substring(fb, lb + 1)
      const p = parseAIJson(clean)
      if (!p.ingredients) throw new Error('no ingredients')
      setFullStates(prev => ({ ...prev, [ideaIdx]: p }))
    } catch (e) {
      setFullStates(prev => ({ ...prev, [ideaIdx]: { error: true } }))
    }
  }

  // ── จับคู่ชื่อ ingredient จาก AI กับ material จริงใน DB ────────────────────────
  function matchMaterial(name) {
    const n = (name || '').trim().toLowerCase()
    if (!n) return null
    let m = materials.find(x => x.name.trim().toLowerCase() === n)
    if (!m) m = materials.find(x => x.name.trim().toLowerCase().includes(n) || n.includes(x.name.trim().toLowerCase()))
    return m || null
  }

  // ── บันทึกเป็นสูตรใหม่ลง Database ตรง (Formula + Version 1 + Items) ────────────
  async function saveAsNewFormula(formula, idea, ideaIdx) {
    setSavingStates(p => ({ ...p, [ideaIdx]: 'saving' }))
    try {
      const matched = (formula.ingredients || []).map(ing => {
        const mat = matchMaterial(ing.primary?.name)
        return { ing, mat }
      })
      const skipped = matched.filter(x => !x.mat)

      const newFormula = await db.createFormula(
        idea.name, idea.vibe_en, idea.suited_for_th || idea.reason_th, null, {}
      )
      const version = await db.createVersion(
        newFormula.id, 1, 'Pending', null, formula.notes || '', null, 15, {}
      )
      const itemsToCreate = matched
        .filter(x => x.mat)
        .map(x => ({
          materialId: x.mat.id,
          grams: parseFloat(x.ing.primary?.grams) || 0,
          ml: x.ing.primary?.ml != null ? parseFloat(x.ing.primary.ml) : null,
          family: x.mat.family,
        }))
      if (itemsToCreate.length) {
        await db.createItems(version.id, itemsToCreate)
      }

      setSavingStates(p => ({ ...p, [ideaIdx]: 'saved' }))
      if (skipped.length) {
        setError(`บันทึกสำเร็จ แต่ข้าม ${skipped.length} ingredient ที่หาไม่เจอใน Materials: ${skipped.map(x=>x.ing.primary?.name).join(', ')} (ต้องไปเพิ่มเองทีหลัง)`)
      }
      onSaved?.(newFormula)
    } catch (e) {
      console.error('[saveAsNewFormula]', e)
      setSavingStates(p => ({ ...p, [ideaIdx]: null }))
      setError('บันทึกไม่สำเร็จ — ลองใหม่อีกครั้ง')
    }
  }

  return (
    <div style={{ maxWidth:520, margin:'0 auto', padding:'0 16px 40px' }}>
      <BackBtn onClick={onBack} label="ย้อนกลับ"/>

      <div style={{ textAlign:'center', margin:'16px 0 20px' }}>
        <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:22,
          fontStyle:'italic', color:S.ink }}>มี material นี้ ทำกลิ่นอะไรได้บ้าง?</div>
        <div style={{ fontSize:12, color:S.textMid, marginTop:4 }}>
          เลือก material ที่อยากใช้ ให้ AI ช่วยคิดทิศทางกลิ่นที่เหมาะ
        </div>
      </div>

      <div style={{ marginBottom:16 }}>
        <MultiMaterialPicker materials={materials} selected={selected}
          onAdd={addMat} onRemove={removeMat}/>
      </div>

      <Btn onClick={getIdeas} disabled={selected.length===0 || ideaLoading} style={{ width:'100%' }}>
        {ideaLoading ? '⏳ กำลังคิด...' : '✦ ดูไอเดีย (ใช้ AI เบาๆ)'}
      </Btn>

      {error && (
        <div style={{ fontSize:12, color:S.red, padding:'10px 12px', background:'#fdf0ee',
          borderRadius:10, marginTop:12 }}>{error}</div>
      )}

      {ideas && (
        <div style={{ marginTop:20 }}>
          <div style={{ fontSize:10, fontWeight:700, color:S.gold, letterSpacing:.8,
            textTransform:'uppercase', marginBottom:10 }}>✦ ไอเดียที่เหมาะกับ material นี้</div>
          {ideas.map((idea, i) => (
            <div key={i}>
              <IdeaCard idea={idea} onGetFull={() => getFullFormula(idea, i)}
                fullState={fullStates[i] === 'loading' ? 'loading' : null}/>
              {fullStates[i] && fullStates[i] !== 'loading' && (
                <FullFormulaResult formula={fullStates[i]} idea={idea}
                  onSave={(f, idea) => saveAsNewFormula(f, idea, i)}
                  savingState={savingStates[i]}/>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
