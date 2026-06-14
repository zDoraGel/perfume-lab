import { useState } from 'react'
import { S, FC } from '../constants/theme'
import { callAI } from '../lib/ai'
import MaterialPicker from './MaterialPicker'

function isEssential(item, allItems) {
  const fam  = item.material?.family
  const role = item.material?.evaporation || 'Heart'
  const sameFamily = allItems.filter(i => i.material?.family === fam)
  if (sameFamily.length === 1) return true
  if (role === 'Base' && ['Musk','Woody','Ambery'].includes(fam)) return true
  const hearts = allItems.filter(i => i.material?.evaporation === 'Heart')
  if (hearts.length > 0) {
    const maxHeart = hearts.reduce((a,b) =>
      parseFloat(a.grams) > parseFloat(b.grams) ? a : b)
    if (item.id === maxHeart.id) return true
  }
  return false
}

function findSubstitute(item, ownedMaterials) {
  const fam  = item.material?.family
  const name = item.material?.name?.toLowerCase() || ''
  return ownedMaterials.find(m =>
    m.family === fam &&
    m.id !== item.material_id &&
    m.name.toLowerCase() !== name &&
    (m.stock || 0) > 0
  )
}

function getDensity(family) {
  if (['Citrus','Fresh'].includes(family)) return 0.88
  if (['Woody','Ambery','Gourmand'].includes(family)) return 1.05
  return 0.95
}

// ── Swap Panel ─────────────────────────────────────────────────────────────────
function SwapPanel({ item, materials, scaledMl, onClose, onAddToDraft, draft }) {
  const [selected,  setSelected]  = useState(null)
  const [query,     setQuery]     = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiLines,   setAiLines]   = useState([])
  const [newGrams,  setNewGrams]  = useState('')   // override grams; '' = use original
  const [unit,      setUnit]      = useState('g')   // 'g' | 'ml'

  // check if this item already has a draft swap
  const existingDraft = draft.find(d => d.originalId === item.material_id)

  // auto-fill grams when candidate selected
  function selectCandidate(candidate) {
    setSelected(candidate)
    setNewGrams(String(item.grams ?? ''))   // default = keep original grams
    getAIOpinion(candidate)
  }

  const candidates = materials.filter(m =>
    m.id !== item.material_id &&
    (m.stock || 0) > 0 &&
    (query.trim()
      ? m.name.toLowerCase().includes(query.toLowerCase()) ||
        (m.family||'').toLowerCase().includes(query.toLowerCase())
      : m.family === item.material?.family)
  ).slice(0, 10)

  async function getAIOpinion(candidate) {
    setAiLines([])
    setAiLoading(true)
    const r = await callAI(
      `You are a master perfumer AND fragrance educator.
Reply ONLY with bullet points. No intro, no outro, no extra text.
Each bullet MUST follow this exact format:
* [English perfumer term] — [Thai explanation for beginner/customer, 1 short sentence]
Give 4-5 bullets only.`,
      `Swap "${item.material?.name}" (${item.material?.family}) → "${candidate.name}" (${candidate.family}) in a perfume. What changes?`
    )
    const lines = r.split('\n')
      .map(l => l.replace(/^[*\-•·]\s*/, '').trim())
      .filter(l => l.length > 5)
    setAiLines(lines)
    setAiLoading(false)
  }

  function addToDraft() {
    if (!selected) return
    const gramsToUse = newGrams.trim() !== '' ? parseFloat(newGrams) : parseFloat(item.grams)
    const origName = item.material?.name || item.material?.alias || `#${item.material_id}`
    onAddToDraft({
      originalId:   item.material_id,
      originalName: origName,
      newMaterial:  selected,
      newGrams:     isNaN(gramsToUse) ? parseFloat(item.grams) : gramsToUse,
      item,
      action: 'swap',
    })
    onClose()
  }

  function addRemoveToDraft() {
    const name = item.material?.name || item.material?.alias || `#${item.material_id}` || '(unknown)'
    onAddToDraft({
      originalId:   item.material_id,
      originalName: name,
      newMaterial:  null,
      item,
      action: 'remove',
    })
    onClose()
  }

  return (
    <div style={{ padding:'12px 14px', background:S.white,
      borderRadius:'0 0 10px 10px', border:`1.5px solid ${S.gold}`,
      borderTop:`1px solid ${S.goldBd}` }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
        <div style={{ fontSize:11, fontWeight:700, color:S.gold, letterSpacing:.8, textTransform:'uppercase' }}>
          ⇄ สลับ {item.material?.name || item.material?.alias || `#${item.material_id}`}
        </div>
        <button onClick={onClose}
          style={{ background:'none', border:'none', color:S.textLt, fontSize:18, cursor:'pointer' }}>×</button>
      </div>

      {existingDraft && (
        <div style={{ padding:'5px 10px', background:S.amberBg, borderRadius:7,
          fontSize:11, color:S.amber, marginBottom:8 }}>
          📝 Draft: เปลี่ยนเป็น {existingDraft.newMaterial?.name ?? '(removed)'} อยู่แล้ว
        </div>
      )}

      {/* Remove button — ขึ้นมาอยู่บนสุด */}
      <button onClick={addRemoveToDraft}
        style={{ width:'100%', padding:'8px 0', borderRadius:10, cursor:'pointer',
          fontFamily:'Inter,sans-serif', fontSize:12, fontWeight:500,
          background:'transparent', border:`1px solid ${S.red}44`, color:S.red,
          marginBottom:8 }}>
        🗑 ลบ {item.material?.name} ออกจากสูตร
      </button>

      <input value={query} onChange={e => setQuery(e.target.value)}
        placeholder="ค้นหา material..."
        style={{ width:'100%', background:S.bg, border:`1px solid ${S.border}`,
          borderRadius:8, padding:'8px 12px', fontSize:13,
          fontFamily:'Cormorant Garamond,serif', fontStyle:'italic',
          color:S.ink, outline:'none', boxSizing:'border-box', marginBottom:8 }}/>

      <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:180, overflowY:'auto', marginBottom:10 }}>
        {candidates.map(mat => {
          const fc       = FC[mat.family] || { c:S.textMid, bg:S.border }
          const isChosen = selected?.id === mat.id
          return (
            <div key={mat.id} onClick={() => selectCandidate(mat)}
              style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                padding:'8px 10px', borderRadius:8, cursor:'pointer',
                border:`1.5px solid ${isChosen ? S.gold : S.border}`,
                background: isChosen ? S.goldLt : S.bg }}>
              <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                <span style={{ fontFamily:'Cormorant Garamond,serif', fontSize:14,
                  fontStyle:'italic', color: isChosen ? S.gold : S.ink }}>{mat.name}</span>
                <span style={{ fontSize:9, padding:'1px 6px', borderRadius:20,
                  color:fc.c, background:fc.bg }}>{mat.family}</span>
                <span style={{ fontSize:9, color:S.green }}>stock {mat.stock}g</span>
              </div>
              <span style={{ fontSize:12, color:S.gold, fontWeight:500 }}>{scaledMl.toFixed(2)}ml</span>
            </div>
          )
        })}
        {candidates.length === 0 && (
          <div style={{ fontSize:12, color:S.textLt, textAlign:'center', padding:12 }}>
            ไม่พบ — ลองพิมพ์ค้นหาค่ะ
          </div>
        )}
      </div>

      {/* AI analysis */}
      {selected && (
        <div style={{ padding:'10px 12px', background:S.goldLt,
          borderRadius:8, border:`1px solid ${S.goldBd}`, marginBottom:10 }}>
          <div style={{ fontSize:12, fontWeight:600, color:S.ink, marginBottom:8,
            fontFamily:'Cormorant Garamond,serif', fontStyle:'italic' }}>
            {item.material?.name} → {selected.name}
          </div>
          {aiLoading ? (
            <div style={{ fontSize:12, color:S.textLt, fontStyle:'italic' }}>AI กำลังวิเคราะห์...</div>
          ) : aiLines.length > 0 ? (
            <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
              {aiLines.map((line, i) => {
                const parts = line.split(/\s*[—–-]{1,2}\s*/)
                const term  = parts[0] || line
                const thai  = parts[1] || ''
                return (
                  <div key={i} style={{ display:'flex', gap:8, alignItems:'flex-start',
                    padding:'6px 8px', background:'rgba(255,255,255,0.6)',
                    borderRadius:7, border:`1px solid ${S.goldBd}` }}>
                    <span style={{ color:S.gold, fontWeight:700, flexShrink:0 }}>·</span>
                    <div>
                      <div style={{ fontSize:12, fontWeight:600, color:S.ink }}>{term}</div>
                      {thai && <div style={{ fontSize:11, color:S.textMid }}>{thai}</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : null}
        </div>
      )}

      {/* Amount override — g / ml toggle */}
      {selected && (() => {
        const density    = getDensity(selected?.family || item.material?.family)
        const origG      = parseFloat(item.grams) || 0
        const origMl     = parseFloat(item.ml) || (origG / density)
        // derive display value
        const inputVal   = newGrams === '' ? '' : (
          unit === 'ml'
            ? String(parseFloat((parseFloat(newGrams) / density).toFixed(3)))
            : newGrams
        )
        const isChanged  = newGrams !== '' && Math.abs(parseFloat(newGrams) - origG) > 0.001

        function handleAmountChange(val) {
          if (!val) { setNewGrams(''); return }
          const n = parseFloat(val)
          if (isNaN(n)) return
          // always store as grams internally
          setNewGrams(unit === 'ml' ? String(parseFloat((n * density).toFixed(3))) : val)
        }

        return (
          <div style={{ marginBottom:8, padding:'8px 10px', background:S.bg,
            borderRadius:8, border:`1px solid ${isChanged ? S.gold : S.goldBd}` }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              {/* Unit toggle */}
              <div style={{ display:'flex', borderRadius:6, overflow:'hidden',
                border:`1px solid ${S.border}`, flexShrink:0 }}>
                {['g','ml'].map(u => (
                  <button key={u} onClick={() => setUnit(u)}
                    style={{ padding:'4px 10px', fontSize:11, fontWeight:600,
                      cursor:'pointer', border:'none', fontFamily:'Inter,sans-serif',
                      background: unit===u ? S.gold : S.white,
                      color: unit===u ? '#fff' : S.textMid }}>
                    {u}
                  </button>
                ))}
              </div>
              <input
                type="number"
                value={unit === 'ml' && newGrams
                  ? parseFloat((parseFloat(newGrams) / density).toFixed(3))
                  : newGrams}
                onChange={e => handleAmountChange(e.target.value)}
                placeholder={unit === 'ml' ? origMl.toFixed(2) : String(origG)}
                style={{ flex:1, padding:'5px 8px', borderRadius:6, fontSize:14,
                  fontFamily:'Inter,sans-serif', fontWeight:700,
                  border:`1px solid ${isChanged ? S.gold : S.border}`,
                  color: isChanged ? S.gold : S.ink,
                  background:S.white, outline:'none', textAlign:'center' }}/>
              {/* Cross-display */}
              <span style={{ fontSize:10, color:S.textLt, flexShrink:0, minWidth:48, textAlign:'right' }}>
                {unit === 'ml' && newGrams
                  ? `${newGrams}g`
                  : newGrams
                  ? `${parseFloat((parseFloat(newGrams)/density).toFixed(2))}ml`
                  : unit === 'ml' ? `${origG}g` : `${origMl.toFixed(2)}ml`}
              </span>
            </div>
            {isChanged && (
              <div style={{ fontSize:10, color:S.gold, marginTop:4 }}>
                เปลี่ยนจาก {origG}g ({origMl.toFixed(2)}ml)
              </div>
            )}
          </div>
        )
      })()}

      {/* Add to Draft button */}
      {selected && (
        <button onClick={addToDraft}
          style={{ width:'100%', padding:'10px 0', borderRadius:10, cursor:'pointer',
            fontFamily:'Inter,sans-serif', fontSize:12, fontWeight:600,
            background:S.gold, border:'none', color:'#fff', marginBottom:8 }}>
          + เพิ่มใน Draft ({item.material?.name} → {selected.name})
        </button>
      )}
    </div>
  )
}

// ── Guide Row ──────────────────────────────────────────────────────────────────
function GuideRow({ item, state, materials, onSaveNewVersion, allItems, draft, onAddToDraft }) {
  const [showSwap,  setShowSwap]  = useState(false)
  const [editAmt,   setEditAmt]   = useState(false)
  const [editG,     setEditG]     = useState('')
  const [editMl,    setEditMl]    = useState('')
  const fc          = FC[item.material?.family] || { c: S.textMid, bg: S.border }
  const bgColor     = state === 'must-buy' ? '#fffbf8'
    : state === 'use-sub' ? '#fffdf5'
    : state === 'ready'   ? S.greenBg
    : S.bg
  const borderColor = state === 'must-buy' ? S.red+'44'
    : state === 'use-sub' ? S.goldBd
    : state === 'ready'   ? '#c5dfc8'
    : S.border

  // Check if in draft
  const inDraft = draft?.find(d => d.originalId === item.material_id)

  return (
    <div style={{ marginBottom:8 }}>
      <div style={{ padding:'8px 12px', borderRadius: showSwap ? '10px 10px 0 0' : 10,
        background: inDraft ? S.amberBg : bgColor,
        border:`1px solid ${inDraft ? S.goldBd : borderColor}` }}>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
          marginBottom: state === 'use-sub' ? 6 : 0 }}>
          <div style={{ display:'flex', gap:6, alignItems:'center', flex:1, minWidth:0 }}>
            {state === 'must-buy' && (
              <span style={{ fontSize:9, color:S.red, fontWeight:700,
                background:'#fdf0ee', padding:'1px 6px', borderRadius:20, flexShrink:0 }}>ขาดไม่ได้</span>
            )}
            {state === 'skip' && (
              <span style={{ fontSize:9, color:S.textLt, fontWeight:600,
                background:S.bg, padding:'1px 6px', borderRadius:20, flexShrink:0 }}>ขาดได้</span>
            )}
            <span style={{ fontFamily:'Cormorant Garamond,serif', fontSize:14, fontStyle:'italic',
              color: inDraft ? S.amber : (state === 'ready' ? S.ink : S.textMid),
              textDecoration: (state === 'use-sub' || state === 'must-buy') && !inDraft ? 'line-through' : 'none' }}>
              {item.material?.name || item.material?.alias || `#${item.material_id}`}
            </span>
            {inDraft && (
              <span style={{ fontSize:10, color:S.amber }}>
                → {inDraft.newMaterial?.name ?? '(removed)'}
              </span>
            )}
            <span style={{ fontSize:9, padding:'1px 6px', borderRadius:20,
              color: fc.c, background: fc.bg, flexShrink:0 }}>{item.material?.family}</span>
          </div>

          <div style={{ display:'flex', gap:6, alignItems:'center', flexShrink:0 }}>
            {editAmt ? (
              <>
                <input type="number" step="0.01" value={editG}
                  onChange={e => setEditG(e.target.value)}
                  style={{ width:52, padding:'3px 6px', borderRadius:6, fontSize:12,
                    border:`1px solid ${S.goldBd}`, textAlign:'right', outline:'none',
                    fontFamily:'Inter,sans-serif' }}/>
                <span style={{ fontSize:11, color:S.textMid }}>g</span>
                <input type="number" step="0.01" value={editMl}
                  onChange={e => setEditMl(e.target.value)}
                  style={{ width:52, padding:'3px 6px', borderRadius:6, fontSize:12,
                    border:`1px solid ${S.border}`, textAlign:'right', outline:'none',
                    color:S.green, fontFamily:'Inter,sans-serif' }}/>
                <span style={{ fontSize:11, color:S.green }}>ml</span>
                <button onClick={() => {
                  const density = getDensity(item.material?.family)
                  const finalG  = editMl
                    ? parseFloat((parseFloat(editMl) * density).toFixed(4))
                    : parseFloat(parseFloat(editG).toFixed(4))
                  const finalMl = editMl
                    ? parseFloat(parseFloat(editMl).toFixed(4))
                    : editG ? parseFloat((parseFloat(editG) / density).toFixed(4)) : null
                  if (finalG) onAddToDraft({
                    originalId:   item.material_id,
                    originalName: item.material?.name,
                    newMaterial:  inDraft?.action === 'swap' ? inDraft.newMaterial : item.material,
                    newGrams:     finalG,
                    newMl:        finalMl,
                    action:       inDraft?.action === 'swap' ? 'swap' : 'rebalance',
                    item,
                  })
                  setEditAmt(false)
                }}
                  style={{ padding:'3px 8px', borderRadius:6, border:'none',
                    background:S.gold, color:'#fff', cursor:'pointer',
                    fontSize:11, fontFamily:'Inter,sans-serif' }}>✓</button>
                <button onClick={() => setEditAmt(false)}
                  style={{ padding:'3px 6px', borderRadius:6,
                    border:`1px solid ${S.border}`, background:'none',
                    cursor:'pointer', fontSize:11, color:S.textMid }}>✕</button>
              </>
            ) : (
              <>
                <span onClick={() => { setEditG(item.scaledG.toFixed(3)); setEditMl(item.scaledMl.toFixed(2)); setEditAmt(true) }}
                  style={{ fontSize:12, color:S.textMid, cursor:'pointer',
                    textDecoration:'underline dotted', textUnderlineOffset:2 }}>
                  {item.scaledG.toFixed(3)}g
                </span>
                <span onClick={() => { setEditG(item.scaledG.toFixed(3)); setEditMl(item.scaledMl.toFixed(2)); setEditAmt(true) }}
                  style={{ fontSize:13, fontWeight:600, cursor:'pointer',
                    textDecoration:'underline dotted', textUnderlineOffset:2,
                    color: state === 'ready' ? S.green : S.textMid }}>
                  {item.scaledMl.toFixed(2)}ml
                </span>
              </>
            )}
            {!editAmt && (state === 'ready' || state === 'use-sub' || state === 'must-buy') && (
              <button onClick={() => setShowSwap(p => !p)}
                style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:20,
                  cursor:'pointer', fontFamily:'Inter,sans-serif',
                  border:`1px solid ${showSwap ? S.gold : (inDraft ? S.goldBd : S.border)}`,
                  background: showSwap ? S.goldLt : (inDraft ? S.amberBg : 'transparent'),
                  color: showSwap ? S.gold : (inDraft ? S.amber : S.textLt) }}>
                {showSwap ? '▲' : inDraft ? '✎ แก้' : '⇄ สลับ'}
              </button>
            )}
          </div>
        </div>

        {state === 'use-sub' && item.sub && !inDraft && (
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
            padding:'5px 8px', background:S.amberBg, borderRadius:7 }}>
            <div style={{ display:'flex', gap:6, alignItems:'center' }}>
              <span style={{ fontSize:10, color:S.amber, fontWeight:700 }}>→ ใช้แทน</span>
              <span style={{ fontFamily:'Cormorant Garamond,serif', fontSize:14,
                fontStyle:'italic', color:S.ink }}>{item.sub.name}</span>
            </div>
            <span style={{ fontSize:13, fontWeight:600, color:S.amber }}>
              {item.scaledMl.toFixed(2)}ml
            </span>
          </div>
        )}
      </div>

      {showSwap && (
        <SwapPanel
          item={item}
          materials={materials}
          scaledMl={item.scaledMl}
          draft={draft || []}
          onClose={() => setShowSwap(false)}
          onAddToDraft={onAddToDraft}
        />
      )}
    </div>
  )
}

function GuideSection({ label, color, children }) {
  return (
    <div style={{ marginBottom:12 }}>
      <div style={{ fontSize:10, fontWeight:700, color, letterSpacing:.8,
        textTransform:'uppercase', marginBottom:6, fontFamily:'Inter,sans-serif' }}>
        {label}
      </div>
      {children}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function BlendGuide({ items = [], materials = [], scaleMl, batchMl = 15, onSaveNewVersion, formula = {} }) {
  const [draft,     setDraft]     = useState([])
  const [saving,    setSaving]    = useState(false)
  const [extraIngs, setExtraIngs] = useState([]) // manual add-on
  const [showExtra, setShowExtra] = useState(false)

  // ── Rebalance: คง Top:Heart:Base ratio แล้วคำนวณ g ใหม่ทุกตัว ──────────────────
  function rebalance() {
    const removeIds = draft.filter(d=>d.action==='remove').map(d=>d.originalId)

    const activeItems = items
      .filter(i => !removeIds.includes(i.material_id))
      .map(i => {
        const sw  = draft.find(d=>d.originalId===i.material_id && d.action==='swap')
        const mat = sw ? sw.newMaterial : i.material
        const fam  = mat?.family || i.material?.family
        const evap = mat?.evaporation || i.material?.evaporation
          || (fam==='Citrus'||fam==='Fresh' ? 'Top'
            : fam==='Floral'||fam==='Spicy' ? 'Heart' : 'Base')
        const grams = sw?.newGrams ?? parseFloat(i.grams)
        return { type:'item', materialId: i.material_id, evap, grams, sw, item: i }
      })

    const activeExtras = extraIngs.filter(e=>e.matId&&e.grams).map((e,idx) => {
      const mat  = materials.find(m=>m.id===parseInt(e.matId))
      const fam  = mat?.family
      const evap = mat?.evaporation
        || (fam==='Citrus'||fam==='Fresh' ? 'Top'
          : fam==='Floral'||fam==='Spicy' ? 'Heart' : 'Base')
      return { type:'extra', idx, evap, grams: parseFloat(e.grams)||0 }
    })

    const all = [...activeItems, ...activeExtras]
    if (all.length === 0) return

    const roleG = { Top:0, Heart:0, Base:0 }
    all.forEach(x => { roleG[x.evap] = (roleG[x.evap]||0) + x.grams })
    const totalG = Object.values(roleG).reduce((s,v)=>s+v, 0)
    if (totalG === 0) return

    const roleRatio = {}
    Object.keys(roleG).forEach(r => { roleRatio[r] = roleG[r] / totalG })
    const roleCount = { Top:0, Heart:0, Base:0 }
    all.forEach(x => { roleCount[x.evap] = (roleCount[x.evap]||0) + 1 })

    function calcG(evap) {
      return parseFloat(((roleRatio[evap] * totalG) / (roleCount[evap]||1)).toFixed(3))
    }

    // อัปเดต draft สำหรับ original items
    setDraft(prev => {
      let next = [...prev]
      activeItems.forEach(x => {
        const ng = calcG(x.evap)
        const existing = next.find(d=>d.originalId===x.materialId)
        if (existing) {
          next = next.map(d => d.originalId===x.materialId ? { ...d, newGrams: ng } : d)
        } else {
          next = [...next.filter(d=>d.originalId!==x.materialId), {
            originalId:   x.materialId,
            originalName: x.item.material?.name,
            newMaterial:  x.item.material,
            newGrams:     ng,
            item:         x.item,
            action:       'rebalance',
          }]
        }
      })
      return next
    })

    // อัปเดต extraIngs
    setExtraIngs(prev => prev.map((e,i) => {
      const ex = activeExtras.find(x=>x.idx===i)
      if (!ex) return e
      return { ...e, grams: String(calcG(ex.evap)) }
    }))
  }


  if (items.length === 0) return null

  const scale    = scaleMl ? scaleMl / batchMl : 1
  const owned    = materials.filter(m => (m.stock || 0) > 0)
  const targetMl = scaleMl || batchMl

  const guide = items.map(item => {
    const inStock   = owned.some(m => m.id === item.material_id)
    const essential = isEssential(item, items)
    const sub       = !inStock ? findSubstitute(item, owned) : null
    const scaledG   = parseFloat(item.grams) * scale
    const density   = getDensity(item.material?.family)
    const scaledMl  = item.ml ? parseFloat(item.ml) * scale : scaledG / density
    return { ...item, inStock, essential, sub, scaledG, scaledMl }
  })

  const canBlend = guide.every(g => g.inStock || g.sub || !g.essential)
  const mustBuy  = guide.filter(g => !g.inStock && !g.sub && g.essential)
  const useSub   = guide.filter(g => !g.inStock && g.sub)
  const ready    = guide.filter(g => g.inStock)
  const skipOk   = guide.filter(g => !g.inStock && !g.sub && !g.essential)

  function addToDraft(change) {
    setDraft(prev => {
      const filtered = prev.filter(d => d.originalId !== change.originalId)
      return [...filtered, change]
    })
  }

  function removeFromDraft(originalId) {
    setDraft(prev => prev.filter(d => d.originalId !== originalId))
  }

  async function saveDraftAsVersion() {
    if (draft.length === 0 && extraIngs.filter(e=>e.matId&&e.grams).length === 0 || !onSaveNewVersion) return
    setSaving(true)
    await onSaveNewVersion(draft, extraIngs.filter(e=>e.matId&&e.grams))
    setDraft([]); setExtraIngs([]); setShowExtra(false)
    setSaving(false)
  }

  const commonProps = { materials, allItems: items, draft, onAddToDraft: addToDraft }

  return (
    <div style={{ marginTop:14 }}>
      {/* Status header */}
      <div style={{ padding:'10px 14px', borderRadius:12, marginBottom:12,
        background: canBlend ? S.greenBg : '#fdf0ee',
        border:`1px solid ${canBlend ? '#c5dfc8' : S.red+'44'}` }}>
        <div style={{ fontSize:13, fontWeight:600, fontFamily:'Inter,sans-serif',
          color: canBlend ? S.green : S.red }}>
          {canBlend ? '✓ Blend ได้เลย' : `✗ ยังขาด ${mustBuy.length} ตัวสำคัญ`}
        </div>
        <div style={{ fontSize:11, color:S.textMid, marginTop:2 }}>
          batch {targetMl}ml · กด <strong>⇄ สลับ</strong> แล้ว <strong>+ เพิ่มใน Draft</strong> หลายตัวได้
        </div>
      </div>

      {/* Draft summary */}
      {draft.length > 0 && (
        <div style={{ padding:'12px 14px', background:S.amberBg, borderRadius:12,
          border:`1px solid ${S.goldBd}`, marginBottom:12 }}>
          <div style={{ fontSize:11, fontWeight:700, color:S.amber,
            textTransform:'uppercase', letterSpacing:.8, marginBottom:8 }}>
            📝 Draft — {draft.length} การเปลี่ยนแปลง
          </div>
          {draft.map((d, i) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between',
              alignItems:'center', marginBottom:6 }}>
              <span style={{ fontSize:12,
                color: d.action==='remove' ? S.red : d.action==='rebalance' ? S.gold : S.ink,
                fontFamily:'Cormorant Garamond,serif', fontStyle:'italic' }}>
                {d.action === 'remove'
                  ? `🗑 ลบ ${d.originalName} ออก`
                  : d.action === 'rebalance'
                  ? `⚖ ${d.originalName}: ${d.item?.scaledG?.toFixed(3) ?? parseFloat(d.item?.grams)}g → ${d.newGrams}g`
                  : `${d.originalName} → ${d.newMaterial?.name ?? '(removed)'}${
                      d.newGrams && d.newGrams !== parseFloat(d.item?.grams)
                        ? ` (${d.newGrams}g)` : ''
                    }`}
              </span>
              <button onClick={() => removeFromDraft(d.originalId)}
                style={{ fontSize:11, color:S.red, background:'none', border:'none',
                  cursor:'pointer' }}>ยกเลิก</button>
            </div>
          ))}
          <button onClick={saveDraftAsVersion} disabled={saving}
            style={{ width:'100%', marginTop:8, padding:'10px 0', borderRadius:10,
              cursor:'pointer', fontFamily:'Inter,sans-serif', fontSize:13, fontWeight:700,
              background: saving ? S.textLt : S.gold, border:'none', color:'#fff' }}>
            {saving ? 'กำลัง Save...' : `✦ Save เป็น Version ใหม่ (${draft.length} changes${extraIngs.filter(e=>e.matId&&e.grams).length ? ` + ${extraIngs.filter(e=>e.matId&&e.grams).length} เพิ่ม` : ''})`}
          </button>
        </div>
      )}

      {mustBuy.length > 0 && (
        <GuideSection label="🛒 ต้องซื้อก่อน blend" color={S.red}>
          {mustBuy.map((g,i) => <GuideRow key={i} item={g} state="must-buy" {...commonProps}/>)}
        </GuideSection>
      )}

      {useSub.length > 0 && (
        <GuideSection label="🔄 ใช้ตัวแทนได้ก่อน" color={S.amber}>
          {useSub.map((g,i) => <GuideRow key={i} item={g} state="use-sub" {...commonProps}/>)}
        </GuideSection>
      )}

      {ready.length > 0 && (
        <GuideSection label="✓ พร้อมใช้" color={S.green}>
          {ready.map((g,i) => <GuideRow key={i} item={g} state="ready" {...commonProps}/>)}
        </GuideSection>
      )}

      {skipOk.length > 0 && (
        <GuideSection label="○ ข้ามได้ก่อน" color={S.textLt}>
          {skipOk.map((g,i) => <GuideRow key={i} item={g} state="skip" {...commonProps}/>)}
        </GuideSection>
      )}

      {/* ── เพิ่ม ingredient เอง ── */}
      {(() => {
        const maxMap = { simple:6, standard:10, complex:15 }
        const max    = maxMap[formula.complexity || 'standard'] || 10
        const removedCount = draft.filter(d=>d.action==='remove').length
        const current = items.length - removedCount + extraIngs.length
        const canAdd  = current < max
        return (
          <div style={{ marginBottom:12, padding:'12px 14px', borderRadius:12,
            background:S.goldLt, border:`1px solid ${S.goldBd}` }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
              marginBottom: showExtra ? 10 : 0 }}>
              <div style={{ fontSize:10, fontWeight:700, color:S.gold,
                letterSpacing:.8, textTransform:'uppercase' }}>
                + เพิ่ม Ingredient เอง
              </div>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <span style={{ fontSize:10, color: current>=max ? S.red : S.textMid }}>
                  {current}/{max} ตัว
                </span>
                {canAdd && (
                  <button onClick={() => setShowExtra(p=>!p)}
                    style={{ fontSize:11, color:S.gold, background:'none',
                      border:`1px solid ${S.goldBd}`, borderRadius:16,
                      padding:'3px 10px', cursor:'pointer',
                      fontFamily:'Inter,sans-serif', fontWeight:500 }}>
                    {showExtra ? '▲ ซ่อน' : '▼ เพิ่ม'}
                  </button>
                )}
                {!canAdd && (
                  <span style={{ fontSize:10, color:S.red }}>ถึง max แล้ว</span>
                )}
              </div>
            </div>

            {showExtra && (
              <div>
                {extraIngs.map((e, i) => {
                  const mat     = materials.find(m=>m.id===parseInt(e.matId))
                  const density = getDensity(mat?.family)
                  const unitKey = e.unit || 'g'
                  const displayVal = e.grams
                    ? (unitKey === 'ml' ? parseFloat((parseFloat(e.grams)/density).toFixed(3)) : e.grams)
                    : ''
                  function setAmount(val) {
                    if (!val) { setExtraIngs(p=>p.map((x,j)=>j===i?{...x,grams:''}:x)); return }
                    const n = parseFloat(val)
                    if (isNaN(n)) return
                    const g = unitKey === 'ml' ? String(parseFloat((n*density).toFixed(3))) : val
                    setExtraIngs(p=>p.map((x,j)=>j===i?{...x,grams:g}:x))
                  }
                  return (
                    <div key={i} style={{ display:'flex', gap:8, alignItems:'center', marginBottom:8 }}>
                      <div style={{ flex:1 }}>
                        <MaterialPicker
                          materials={materials.filter(m=>(m.stock||0)>0)}
                          value={e.matId}
                          onChange={id => {
                            const intId = parseInt(id)
                            const mat   = materials.find(m=>m.id===intId)
                            const matName = mat?.name?.toLowerCase()

                            // check ซ้ำกับ items เดิม (same name, same dilution)
                            const dupInItems = items.some(it => {
                              const iName = it.material?.name?.toLowerCase()
                              return it.material_id === intId ||
                                (iName && iName === matName &&
                                 (it.material?.dilution||100) === (mat?.dilution||100))
                            })
                            // check ซ้ำกับ extraIngs อื่น
                            const dupInExtra = extraIngs.some((x,j) => j!==i && (
                              parseInt(x.matId) === intId ||
                              (materials.find(m=>m.id===parseInt(x.matId))?.name?.toLowerCase() === matName &&
                               (materials.find(m=>m.id===parseInt(x.matId))?.dilution||100) === (mat?.dilution||100))
                            ))

                            if (dupInItems || dupInExtra) {
                              alert(`"${mat?.name}" มีอยู่แล้วในสูตร\nถ้าต้องการ supplier/dilution ต่างกัน ชื่อต้องต่างกันด้วยค่ะ`)
                              return
                            }
                            setExtraIngs(p=>p.map((x,j)=>j===i?{...x,matId:id}:x))
                          }}
                          placeholder="ค้นหา ingredient..."/>
                      </div>
                      {/* unit toggle */}
                      <div style={{ display:'flex', borderRadius:6, overflow:'hidden',
                        border:`1px solid ${S.border}`, flexShrink:0 }}>
                        {['g','ml'].map(u => (
                          <button key={u}
                            onClick={() => setExtraIngs(p=>p.map((x,j)=>j===i?{...x,unit:u}:x))}
                            style={{ padding:'4px 7px', fontSize:10, fontWeight:600,
                              cursor:'pointer', border:'none', fontFamily:'Inter,sans-serif',
                              background: unitKey===u ? S.gold : S.white,
                              color: unitKey===u ? '#fff' : S.textMid }}>
                            {u}
                          </button>
                        ))}
                      </div>
                      <input type="number" placeholder={unitKey} value={displayVal}
                        onChange={ev => setAmount(ev.target.value)}
                        style={{ width:64, padding:'8px 8px', borderRadius:8, fontSize:13,
                          fontFamily:'Inter,sans-serif', border:`1px solid ${e.grams ? S.gold : S.border}`,
                          color:S.ink, background:S.white, outline:'none',
                          textAlign:'center', fontWeight: e.grams ? 600 : 400 }}/>
                      <button onClick={() => setExtraIngs(p=>p.filter((_,j)=>j!==i))}
                        style={{ color:S.textLt, background:'none', border:'none',
                          cursor:'pointer', fontSize:18, flexShrink:0 }}>×</button>
                    </div>
                  )
                })}

                {/* Rebalance button */}
                {extraIngs.some(e=>e.matId) && (
                  <button onClick={rebalance}
                    style={{ width:'100%', padding:'7px 0', borderRadius:8, cursor:'pointer',
                      fontFamily:'Inter,sans-serif', fontSize:11, fontWeight:600,
                      background:S.white, border:`1.5px solid ${S.gold}`, color:S.gold,
                      marginTop:4, marginBottom:4 }}>
                    ⚖ Rebalance — คำนวณ g ตาม Top:Heart:Base ratio
                  </button>
                )}
                {canAdd && (
                  <button onClick={() => setExtraIngs(p=>[...p,{matId:'',grams:''}])}
                    style={{ fontSize:12, color:S.gold, background:'none',
                      border:`1px solid ${S.goldBd}`, borderRadius:16,
                      padding:'5px 14px', cursor:'pointer',
                      fontFamily:'Inter,sans-serif', fontWeight:500 }}>
                    + เพิ่ม ({max-current} slots เหลือ)
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })()}

      {/* Summary */}
      <div style={{ marginTop:10, padding:'10px 12px', background:S.goldLt,
        borderRadius:8, fontSize:11, color:S.textMid, lineHeight:1.8 }}>
        <strong style={{ color:S.gold }}>สรุป blend {targetMl}ml:</strong><br/>
        {guide.filter(g => g.inStock || g.sub).map((g,i) => {
          const draftChange = draft.find(d => d.originalId === g.material_id)
          const isRemoved   = draftChange?.action === 'remove'
          if (isRemoved) return null
          const name = draftChange?.action === 'swap' && draftChange.newMaterial
            ? draftChange.newMaterial?.name ?? ''
            : g.inStock ? g.material?.name : g.sub?.name
          return (
            <span key={i}>
              {i > 0 && ' + '}
              <strong style={{ color: draftChange ? S.amber : S.ink }}>{name}</strong>
              {' '}{g.scaledMl.toFixed(2)}ml
              {draftChange?.action === 'swap' && (
                <span style={{ color:S.amber }}> (draft)</span>
              )}
            </span>
          )
        })}
      </div>
    </div>
  )
}
