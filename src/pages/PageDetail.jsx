import { useState, useEffect } from 'react'
import { db } from '../lib/db'
import { supabase } from '../lib/supabase'
import { S } from '../constants/theme'
import { Card, Btn, BackBtn, StatusBadge, RatingBar, FamilyBadge } from '../components/ui'
import {
  exportFormulaToPDF,
} from '../lib/exportUtils'
import StockRecommendations from '../components/StockRecommendations'
import FormulaImage from '../components/FormulaImage'
import BlendGuide from '../components/BlendGuide'
import FormulaDNASummary from '../components/FormulaDNASummary'
import { FormulaDNASelector } from '../components/FormulaDNA'
import FormulaCard from '../components/FormulaCard'
import FormulaCardMini from '../components/FormulaCardMini'
import PageNewVersion from './PageNewVersion'
import PageAI from './PageAI'
import PackageSelector from '../components/PackageSelector'
import LabelGenerator from '../components/LabelGenerator'
import IFRAWarning from '../components/IFRAWarning'

// ── Version Card ───────────────────────────────────────────────────────────────
function VersionCard({ ver, isLatest, formula, materials, versions = [], setVersions }) {
  const [open,       setOpen]       = useState(isLatest)
  const [items,      setItems]      = useState([])
  const [loaded,     setLoaded]     = useState(false)
  const [showPkg,    setShowPkg]    = useState(false)
  const [scaleMl,    setScaleMl]    = useState(null)
  const [activeTab,  setActiveTab]  = useState('ingredients')
  const [concentration, setConcentration] = useState('SIGNATURE') // 'ingredients' | 'blend'
  const [showFinal,  setShowFinal]  = useState(false)
  const [agingDays,  setAgingDays]  = useState(14)
  const [showRevise, setShowRevise] = useState(false)
  const [revNote,    setRevNote]    = useState('')
  const [verData,    setVerData]    = useState(ver)

  // aging countdown
  const agingDaysLeft = verData.is_final && verData.final_date
    ? (() => {
        const done = new Date(verData.final_date)
        done.setDate(done.getDate() + (verData.aging_days || 14))
        const diff = Math.ceil((done - new Date()) / 86400000)
        return diff
      })()
    : null

  function toggle() {
    if (!open && !loaded) db.getItems(ver.id).then(d => { setItems(d); setLoaded(true) })
    setOpen(p => !p)
  }

  useEffect(() => {
    if (isLatest) db.getItems(ver.id).then(d => { setItems(d); setLoaded(true) })
  }, [])

  const batchMl  = ver.batch_ml || 15
  const scale    = scaleMl ? scaleMl / batchMl : 1
  const total    = items.reduce((s,i) => s + parseFloat(i.grams||0), 0) * scale
  const rc       = { Top:S.green, Heart:'#8a3a68', Base:'#7a5c2e' }
  const pyramid  = { Top:[], Heart:[], Base:[] }
  items.forEach(x => {
    const fam  = x.material?.family
    const role = (fam==='Citrus'||fam==='Fresh') ? 'Top'
               : (fam==='Floral'||fam==='Spicy') ? 'Heart' : 'Base'
    pyramid[role].push({ ...x, pct: total > 0
      ? ((parseFloat(x.grams) * scale / total) * 100).toFixed(1) : 0 })
  })

  // density estimate by family
  function getDensity(family) {
    if (['Citrus','Fresh'].includes(family)) return 0.88
    if (['Woody','Ambery','Gourmand'].includes(family)) return 1.05
    return 0.95
  }

  const SCALE_SIZES = [5, 10, 15, 30, 50, 100]

  return (
    <Card style={{ padding:0, overflow:'hidden', marginBottom:10 }}>
      <div onClick={toggle} style={{ padding:'16px 18px', cursor:'pointer',
        display:'flex', alignItems:'flex-start', gap:14 }}>
        <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:28,
          color:isLatest?S.gold:S.textLt, fontWeight:300, lineHeight:1, minWidth:36 }}>
          V{ver.ver}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:6 }}>
            <StatusBadge status={ver.status}/>
            {isLatest && (
              <span style={{ fontSize:11, color:S.gold, fontWeight:500,
                padding:'3px 9px', borderRadius:20, background:S.goldLt }}>Latest</span>
            )}
            {verData.is_final && (
              <span style={{ fontSize:11, color:'#fff', fontWeight:600,
                padding:'3px 9px', borderRadius:20, background:'#5a7a5a' }}>🔒 Final</span>
            )}
            {verData.is_final && agingDaysLeft !== null && (
              agingDaysLeft > 0
                ? <span style={{ fontSize:11, color:S.gold, padding:'3px 9px',
                    borderRadius:20, background:S.goldLt }}>
                    ⏳ หมักอีก {agingDaysLeft} วัน
                  </span>
                : <span style={{ fontSize:11, color:'#5a7a5a', fontWeight:600, padding:'3px 9px',
                    borderRadius:20, background:'#e8f0e8' }}>
                    ✓ พร้อมแล้ว!
                  </span>
            )}
            {ver.projection_actual && (
              <span style={{ fontSize:11, color:S.textMid, padding:'3px 9px',
                borderRadius:20, background:S.bg }}>
                {ver.projection_actual}
              </span>
            )}
            {ver.longevity_actual && (
              <span style={{ fontSize:11, color:S.green, padding:'3px 9px',
                borderRadius:20, background:S.greenBg }}>
                ⏱ {ver.longevity_actual}
              </span>
            )}
          </div>
          <div style={{ fontSize:13, color:S.textMid, lineHeight:1.5 }}>{ver.notes}</div>
          {verData.revision_note && (
            <div style={{ fontSize:11, color:S.gold, background:S.goldLt,
              border:`1px solid ${S.goldBd}`, borderRadius:8,
              padding:'6px 10px', marginTop:4 }}>
              📝 {verData.revision_note}
            </div>
          )}
          {ver.personal_note && (
            <div style={{ fontSize:12, color:S.gold, fontStyle:'italic', marginTop:4 }}>
              "{ver.personal_note}"
            </div>
          )}
          <div style={{ marginTop:8 }}><RatingBar rating={ver.rating}/></div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
          <div style={{ color:S.textLt, fontSize:18 }}>{open ? '▲' : '▼'}</div>
          {/* ปุ่มลบ — ซ่อนถ้า Final */}
          {!verData.is_final && (
            <button onClick={async (e) => {
              e.stopPropagation()
              if (versions.length <= 1) {
                alert('ไม่สามารถลบได้ — นี่คือ version เดียวที่มีอยู่\nถ้าอยากลบทั้งหมด ให้ใช้ปุ่ม "ลบสูตรนี้" แทนค่ะ')
                return
              }
              if (!confirm(`ลบ V${ver.ver} ออกถาวร?\n(เหลือ ${versions.length - 1} version)`)) return
              await db.deleteItems(ver.id)
              await supabase.from('formula_versions').delete().eq('id', ver.id)
              const updated = await db.getVersions(formula.id)
              setVersions(updated)
            }} style={{ fontSize:10,
              color: versions.length <= 1 ? S.textLt : S.red,
              background:'none',
              border:`1px solid ${versions.length <= 1 ? S.border : S.red+'33'}`,
              borderRadius:10, padding:'2px 7px', cursor: versions.length <= 1 ? 'not-allowed' : 'pointer',
              fontFamily:'Inter,sans-serif', opacity: versions.length <= 1 ? 0.4 : 1 }}>
              ลบ
            </button>
          )}
          {!verData.is_final ? (
            <button onClick={(e) => { e.stopPropagation(); setShowFinal(true) }}
              style={{ fontSize:10, color:'#5a7a5a', background:'none',
                border:'1px solid #5a7a5a44', borderRadius:10,
                padding:'2px 7px', cursor:'pointer', fontFamily:'Inter,sans-serif' }}>
              Final
            </button>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
              <button onClick={(e) => { e.stopPropagation(); setShowRevise(true) }}
                style={{ fontSize:10, color:S.gold, background:'none',
                  border:`1px solid ${S.goldBd}`, borderRadius:10,
                  padding:'2px 7px', cursor:'pointer', fontFamily:'Inter,sans-serif' }}>
                ปรับ
              </button>
              <button onClick={async (e) => {
                e.stopPropagation()
                if (!confirm(`Unlock V${ver.ver} ออกจาก Final?\nจะสามารถแก้ไขและลบได้อีกครั้ง`)) return
                await supabase.from('formula_versions')
                  .update({ is_final: false, final_date: null, aging_days: null })
                  .eq('id', ver.id)
                const updated = await db.getVersions(formula.id)
                setVersions(updated)
                const me = updated.find(v => v.id === ver.id)
                if (me) setVerData(me)
              }} style={{ fontSize:10, color:S.textMid, background:'none',
                border:`1px solid ${S.border}`, borderRadius:10,
                padding:'2px 7px', cursor:'pointer', fontFamily:'Inter,sans-serif' }}>
                Unlock
              </button>
            </div>
          )}

        </div>
      </div>

      {/* Final modal */}
      {showFinal && (
        <div onClick={e=>e.stopPropagation()} style={{
          position:'fixed', inset:0, background:'#00000066', zIndex:999,
          display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#fff', borderRadius:16, padding:24, width:300, margin:16 }}>
            <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:20,
              fontStyle:'italic', marginBottom:4 }}>Lock เป็น Final</div>
            <div style={{ fontSize:12, color:S.textMid, marginBottom:16 }}>
              V{ver.ver} จะถูก lock — ไม่สามารถแก้ ingredients ได้อีก
            </div>
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:11, color:S.textMid, marginBottom:6 }}>หมักกี่วัน?</div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {[7,14,21,30].map(d => (
                  <button key={d} onClick={() => setAgingDays(d)}
                    style={{ padding:'6px 14px', borderRadius:20, cursor:'pointer',
                      fontSize:12, fontFamily:'Inter,sans-serif',
                      border:`1.5px solid ${agingDays===d ? '#5a7a5a' : S.border}`,
                      background: agingDays===d ? '#5a7a5a' : 'transparent',
                      color: agingDays===d ? '#fff' : S.textMid }}>
                    {d} วัน
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={async () => {
                await db.setFinal(ver.id, agingDays)
                const updated = await db.getVersions(formula.id)
                setVersions(updated)
                const me = updated.find(v => v.id === ver.id)
                if (me) setVerData(me)
                setShowFinal(false)
              }} style={{ flex:1, padding:'9px 0', borderRadius:10, cursor:'pointer',
                fontFamily:'Inter,sans-serif', fontSize:13, fontWeight:600,
                background:'#5a7a5a', border:'none', color:'#fff' }}>
                🔒 Lock Final
              </button>
              <button onClick={() => setShowFinal(false)}
                style={{ padding:'9px 16px', borderRadius:10, cursor:'pointer',
                  fontFamily:'Inter,sans-serif', fontSize:12,
                  background:'transparent', border:`1px solid ${S.border}`, color:S.textMid }}>
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revision note modal */}
      {showRevise && (
        <div onClick={e=>e.stopPropagation()} style={{
          position:'fixed', inset:0, background:'#00000066', zIndex:999,
          display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#fff', borderRadius:16, padding:24, width:300, margin:16 }}>
            <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:20,
              fontStyle:'italic', marginBottom:4 }}>อยากปรับสูตร?</div>
            <div style={{ fontSize:12, color:S.textMid, marginBottom:12 }}>
              บันทึก note ไว้ก่อน แล้วสร้าง V{ver.ver + 1} ใหม่
            </div>
            <textarea value={revNote} onChange={e=>setRevNote(e.target.value)}
              placeholder="เช่น ลด Hedione ลง 10%, เพิ่ม Sandalwood..."
              rows={3}
              style={{ width:'100%', padding:'10px 12px', borderRadius:10, fontSize:13,
                fontFamily:'Inter,sans-serif', color:S.ink, background:'#fafaf8',
                border:`1px solid ${S.border}`, outline:'none',
                resize:'none', boxSizing:'border-box', marginBottom:12 }}/>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={async () => {
                if (revNote.trim()) await db.setRevisionNote(ver.id, revNote.trim())
                setShowRevise(false)
                setRevNote('')
              }} style={{ flex:1, padding:'9px 0', borderRadius:10, cursor:'pointer',
                fontFamily:'Inter,sans-serif', fontSize:13, fontWeight:600,
                background:S.gold, border:'none', color:'#fff' }}>
                บันทึก Note
              </button>
              <button onClick={() => { setShowRevise(false); setRevNote('') }}
                style={{ padding:'9px 16px', borderRadius:10, cursor:'pointer',
                  fontFamily:'Inter,sans-serif', fontSize:12,
                  background:'transparent', border:`1px solid ${S.border}`, color:S.textMid }}>
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {open && (
        <div style={{ borderTop:`1px solid ${S.border}`, padding:'16px 18px 18px', background:'#fdfcfa' }}>
          {!loaded && <div style={{ color:S.textLt, fontSize:13 }}>Loading...</div>}

          {/* Tab switcher */}
          {loaded && items.length > 0 && (
            <div style={{ display:'flex', gap:8, marginBottom:14 }}>
              {[
                { key:'ingredients', label:'Ingredients' },
                { key:'blend',       label:'🧪 Blend Guide' },
              ].map(t => (
                <button key={t.key} onClick={() => setActiveTab(t.key)}
                  style={{ flex:1, padding:'8px 0', borderRadius:10, cursor:'pointer',
                    fontFamily:'Inter,sans-serif', fontSize:12, fontWeight:500,
                    border:`1.5px solid ${activeTab===t.key ? S.gold : S.border}`,
                    background: activeTab===t.key ? S.goldLt : 'transparent',
                    color: activeTab===t.key ? S.gold : S.textMid }}>
                  {t.label}
                </button>
              ))}
            </div>
          )}
          {loaded && items.length > 0 && activeTab === 'ingredients' && (
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:10, fontWeight:600, color:S.textMid, letterSpacing:.8,
                textTransform:'uppercase', marginBottom:6 }}>
                Scale batch
              </div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {SCALE_SIZES.map(ml => (
                  <button key={ml} onClick={() => setScaleMl(ml === batchMl ? null : ml)}
                    style={{ padding:'5px 12px', borderRadius:20, cursor:'pointer',
                      fontFamily:'Inter,sans-serif', fontSize:11, fontWeight:500,
                      border:`1.5px solid ${(scaleMl||batchMl)===ml ? S.gold : S.border}`,
                      background: (scaleMl||batchMl)===ml ? S.gold : 'transparent',
                      color: (scaleMl||batchMl)===ml ? '#fff' : S.textMid }}>
                    {ml}ml{ml===batchMl ? ' (base)' : ''}
                  </button>
                ))}
              </div>
              {scaleMl && scaleMl !== batchMl && (
                <div style={{ fontSize:11, color:S.gold, marginTop:4 }}>
                  ×{(scaleMl/batchMl).toFixed(2)} จาก base {batchMl}ml
                </div>
              )}
            </div>
          )}

          {/* Ingredients */}
          {loaded && activeTab === 'ingredients' && ['Top','Heart','Base'].map(role => {
            const ri = pyramid[role]; if (!ri.length) return null
            return (
              <div key={role} style={{ marginBottom:14 }}>
                <div style={{ fontSize:10, fontWeight:600, color:rc[role],
                  letterSpacing:1.5, textTransform:'uppercase', marginBottom:8 }}>
                  {role} Note
                </div>
                {ri.map((x,i) => {
                  const scaledG  = parseFloat(x.grams) * scale
                  const density  = getDensity(x.material?.family)
                  const scaledMl = x.ml
                    ? parseFloat(x.ml) * scale
                    : scaledG / density
                  return (
                    <div key={i} style={{ marginBottom:8 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                          <span style={{ fontSize:14, fontFamily:'Cormorant Garamond,serif',
                            fontStyle:'italic' }}>{x.material?.name}</span>
                          <FamilyBadge family={x.material?.family}/>
                        </div>
                        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                          <span style={{ fontSize:12, color:S.textMid }}>
                            {scaledG.toFixed(3)}g
                          </span>
                          <span style={{ fontSize:12, color:S.gold, fontWeight:500 }}>
                            {scaledMl.toFixed(2)}ml
                          </span>
                          <span style={{ fontSize:11, color:S.textLt }}>
                            {x.pct}%
                          </span>
                        </div>
                      </div>
                      <div style={{ height:3, background:S.border, borderRadius:2 }}>
                        <div style={{ height:3, width:`${x.pct}%`, background:rc[role],
                          borderRadius:2, maxWidth:'100%' }}/>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}

          {loaded && activeTab === 'ingredients' && (
            <div style={{ borderTop:`1px solid ${S.border}`, paddingTop:10,
              fontSize:12, color:S.textMid }}>
              Total: <strong>{total.toFixed(3)}g</strong> · {items.length} ingredients
              {ver.blend_date && ` · ${ver.blend_date}`}
              {scaleMl && scaleMl !== batchMl && (
                <span style={{ color:S.gold }}> · scaled to {scaleMl}ml</span>
              )}
            </div>
          )}

          {/* Cost per Gram / Drop */}
          {loaded && activeTab === 'ingredients' && (() => {
            const totalCostG = items.reduce((s, x) => {
              const cost = x.material?.cost
              return cost != null ? s + parseFloat(x.grams||0) * scale * parseFloat(cost) : s
            }, 0)
            const hasCost = items.some(x => x.material?.cost != null)
            if (!hasCost) return null
            const totalG   = total  // grams already scaled
            const costPerG = totalG > 0 ? totalCostG / totalG : 0
            // 1 drop ≈ 0.05 ml ≈ 0.05 × 0.95 g (avg density)
            const costPerDrop = costPerG * 0.05 * 0.95
            const batchMlFinal = scaleMl || batchMl
            const costPerMl    = totalG > 0 ? totalCostG / batchMlFinal : 0
            return (
              <div style={{ marginTop:10, padding:'10px 14px', borderRadius:10,
                background:S.goldLt, border:`1px solid ${S.goldBd}` }}>
                <div style={{ fontSize:10, fontWeight:700, color:S.gold,
                  textTransform:'uppercase', letterSpacing:.8, marginBottom:8 }}>
                  ต้นทุน concentrate
                </div>
                <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
                  <div>
                    <div style={{ fontSize:18, fontWeight:700, color:S.gold,
                      fontFamily:'Cormorant Garamond,serif' }}>
                      ฿{totalCostG.toFixed(2)}
                    </div>
                    <div style={{ fontSize:10, color:S.textMid }}>รวม {batchMlFinal}ml</div>
                  </div>
                  <div>
                    <div style={{ fontSize:18, fontWeight:700, color:S.text,
                      fontFamily:'Cormorant Garamond,serif' }}>
                      ฿{costPerMl.toFixed(2)}
                    </div>
                    <div style={{ fontSize:10, color:S.textMid }}>ต่อ ml</div>
                  </div>
                  <div>
                    <div style={{ fontSize:18, fontWeight:700, color:S.textMid,
                      fontFamily:'Cormorant Garamond,serif' }}>
                      ฿{costPerDrop.toFixed(3)}
                    </div>
                    <div style={{ fontSize:10, color:S.textMid }}>ต่อ drop</div>
                  </div>
                </div>
                {items.some(x => x.material?.cost == null) && (
                  <div style={{ fontSize:10, color:S.textLt, marginTop:6 }}>
                    * บาง ingredient ยังไม่มีราคา — ตัวเลขนี้อาจไม่ครบค่ะ
                  </div>
                )}
              </div>
            )
          })()}

          {/* Concentration selector สำหรับ IFRA */}
          {loaded && activeTab === 'ingredients' && items.some(i => i.material?.ifra_limit != null) && (
            <div style={{ marginTop:10, display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:10, color:S.textMid, textTransform:'uppercase',
                letterSpacing:.5, fontWeight:600 }}>IFRA คำนวณที่</span>
              <div style={{ display:'flex', gap:6 }}>
                {['SOFT','SIGNATURE','DEEP'].map(c => (
                  <button key={c} onClick={() => setConcentration(c)}
                    style={{ padding:'4px 12px', borderRadius:16, cursor:'pointer',
                      fontSize:10, fontFamily:'Inter,sans-serif', fontWeight:600,
                      border:`1.5px solid ${concentration===c ? S.gold : S.border}`,
                      background: concentration===c ? S.goldLt : 'transparent',
                      color: concentration===c ? S.gold : S.textMid }}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Blend Guide tab */}
          {loaded && activeTab === 'blend' && (
            <BlendGuide
              items={items}
              materials={materials}
              scaleMl={scaleMl}
              batchMl={batchMl}
              onSaveNewVersion={async (draft, extraIngs) => {
                // สร้าง items ใหม่จาก draft
                const removeIds = draft.filter(d=>d.action==='remove').map(d=>d.originalId)
                const newItems = items
                  .filter(i => !removeIds.includes(i.material_id))
                  .map(i => {
                    const sw = draft.find(d => d.originalId === i.material_id && (d.action === 'swap' || d.action === 'rebalance'))
                    return {
                      materialId: sw?.action === 'swap' ? sw.newMaterial.id : i.material_id,
                      grams:      sw && sw.newGrams != null ? sw.newGrams : i.grams,
                      ml:         sw?.newMl != null ? sw.newMl : i.ml,
                      family:     sw?.action === 'swap' ? sw.newMaterial?.family : i.material?.family,
                    }
                  })
                // เพิ่ม extra ingredients
                const extras = (extraIngs || []).filter(e => e.matId && e.grams).map(e => {
                  const mat = materials.find(m => m.id === parseInt(e.matId))
                  return { materialId: parseInt(e.matId), grams: parseFloat(e.grams), ml: null, family: mat?.family }
                })
                const allNewItems = [...newItems, ...extras]

                // สร้าง note อธิบาย changes
                const swaps   = draft.filter(d=>d.action==='swap').map(d=>`${d.originalName}→${d.newMaterial?.name}`)
                const removes = draft.filter(d=>d.action==='remove').map(d=>`ลบ${d.originalName}`)
                const noteStr = [...swaps, ...removes, ...(extras.length?[`+${extras.length}ตัว`]:[])].join(', ')

                const latestVer = Math.max(...versions.map(v => v.ver))
                const newV = await db.createVersion(
                  formula.id,
                  latestVer + 1,
                  'Pending', null,
                  noteStr || 'แก้ไขสูตร',
                  new Date().toISOString().slice(0,10),
                  ver.batch_ml || 15,
                  {}
                )
                await db.createItems(newV.id, allNewItems)
                const updated = await db.getVersions(formula.id)
                setVersions(updated)
                setActiveTab('ingredients')
                setOpen(false)
                setTimeout(() => setOpen(true), 100)
              }}
            />
          )}

          {/* IFRA Warning */}
          {loaded && activeTab === 'ingredients' && items.length > 0 && (
            <IFRAWarning items={items} concentration={concentration}/>
          )}

          {/* Package System toggle */}
          {loaded && items.length > 0 && (
            <div style={{ marginTop:14 }}>
              <button onClick={() => setShowPkg(p => !p)}
                style={{ width:'100%', padding:'9px 0', borderRadius:10, cursor:'pointer',
                  fontFamily:'Inter,sans-serif', fontSize:12, fontWeight:500,
                  border:`1.5px solid ${showPkg ? S.gold : S.goldBd}`,
                  background: showPkg ? S.goldLt : 'transparent',
                  color: showPkg ? S.gold : S.textMid }}>
                {showPkg ? '▲ ซ่อน Package System' : '◈ Package System — Soft / Signature / Deep'}
              </button>
              {showPkg && (
                <div style={{ marginTop:12 }}>
                  <PackageSelector
                    items={items}
                    batchBaseMl={ver.batch_ml || 15}
                    materials={materials}
                    formulaName={formula?.name || ''}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

// ── Page Detail ────────────────────────────────────────────────────────────────
export default function PageDetail({ formula, onBack }) {
  const [versions,  setVersions]  = useState([])
  const [materials, setMaterials] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [view,      setView]      = useState('list')
  const [imageUrl,  setImageUrl]  = useState(formula.image_url || null)
  const [formulaData, setFormulaData] = useState(formula)
  const [deleting,  setDeleting]  = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [deleteText,  setDeleteText]  = useState('')
  const [latestItems, setLatestItems] = useState([])
  const [editDna,     setEditDna]     = useState(false)
  const [dnaValues,   setDnaValues]   = useState({})

  useEffect(() => {
    Promise.all([
      db.getVersions(formula.id),
      db.getMaterials(),
      db.getFormulas(),
    ]).then(([v, m, all]) => {
      setVersions(v)
      setMaterials(m)
      const fresh = all.find(f => f.id === formula.id)
      if (fresh) { setFormulaData(fresh); setDnaValues(fresh) }
      // load latest version items for radar chart
      if (v.length > 0) {
        const latest = v[v.length - 1]
        db.getItems(latest.id).then(its => setLatestItems(its))
      }
      setLoading(false)
    })
  }, [formula.id])

  async function handleDelete() {
    setDeleting(true)
    // ลบรูปจาก Storage ก่อน
    if (imageUrl) {
      try {
        const path = imageUrl.split('/formula-images/')[1]
        if (path) await supabase.storage.from('formula-images').remove([path])
      } catch (e) { console.warn('storage delete failed', e) }
    }
    // ลบ items ทุก version
    for (const v of versions) {
      await db.deleteItems(v.id)
    }
    // ลบ versions
    await supabase.from('formula_versions').delete().eq('formula_id', formula.id)
    // ลบ formula
    await supabase.from('formulas').delete().eq('id', formula.id)
    setDeleting(false)
    onBack()
  }

  const [exporting,   setExporting]   = useState(false)
  const [showCard,    setShowCard]    = useState(false)
  const [showMini,    setShowMini]    = useState(false)
  const [showLabel,   setShowLabel]   = useState(false)
  const [cardItems,   setCardItems]   = useState([])

  async function handleExportPDF() {
    setExporting(true)
    const itemsByVersion = {}
    for (const v of versions) {
      itemsByVersion[v.id] = await db.getItems(v.id)
    }
    await exportFormulaToPDF(formula, versions, itemsByVersion)
    setExporting(false)
  }

  if (view === 'newVersion') return (
    <PageNewVersion formula={formula} versions={versions} onBack={() => setView('list')}
      onSave={async (status, rating, notes, date, batchMl, ings, dnaActual) => {
        const nextVer = versions.length ? Math.max(...versions.map(v=>v.ver)) + 1 : 1
        const v = await db.createVersion(formula.id, nextVer, status, rating, notes, date, batchMl, dnaActual)
        await db.createItems(v.id, ings)
        const updated = await db.getVersions(formula.id)
        setVersions(updated); setView('list')
      }}/>
  )

  if (view === 'ai') return (
    <PageAI formula={formula} versions={versions} onBack={() => setView('list')}
      onVersionSaved={async () => {
        const updated = await db.getVersions(formula.id)
        setVersions(updated); setView('list')
      }}/>
  )

  return (
    <div>
      {/* Formula Card Modal */}
      {showCard && (
        <FormulaCard
          formula={formulaData}
          latestVersion={versions[versions.length - 1]}
          items={cardItems}
          onClose={() => setShowCard(false)}/>
      )}
      {/* Mini Card Modal */}
      {showMini && (
        <FormulaCardMini
          formula={formulaData}
          onClose={() => setShowMini(false)}/>
      )}

      {/* Confirmation Modal — พิมพ์ชื่อสูตรยืนยัน */}
      {showConfirm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', zIndex:100,
          display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div style={{ background:S.white, borderRadius:16, padding:24, maxWidth:320, width:'100%' }}>
            <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:20,
              fontStyle:'italic', color:S.red, marginBottom:8 }}>ลบสูตรนี้ถาวร</div>
            <div style={{ fontSize:13, color:S.textMid, lineHeight:1.7, marginBottom:16 }}>
              จะลบ <strong>{versions.length} version</strong> และรูปทั้งหมดออกถาวร
              <br/>ไม่สามารถกู้คืนได้ค่ะ
            </div>
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:11, color:S.textMid, marginBottom:6 }}>
                พิมพ์ชื่อสูตร <strong style={{ color:S.ink }}>"{formula.name}"</strong> เพื่อยืนยัน
              </div>
              <input
                value={deleteText}
                onChange={e => setDeleteText(e.target.value)}
                placeholder={formula.name}
                style={{ width:'100%', padding:'10px 12px', borderRadius:10,
                  border:`1.5px solid ${deleteText === formula.name ? S.red : S.border}`,
                  fontSize:13, fontFamily:'Inter,sans-serif', color:S.ink,
                  outline:'none', boxSizing:'border-box',
                  background: deleteText === formula.name ? '#fff5f5' : S.white }}
              />
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => { setShowConfirm(false); setDeleteText('') }}
                style={{ flex:1, padding:'11px 0', borderRadius:10, cursor:'pointer',
                  fontFamily:'Inter,sans-serif', fontSize:13, fontWeight:500,
                  border:`1.5px solid ${S.border}`, background:'transparent', color:S.textMid }}>
                ยกเลิก
              </button>
              <button onClick={handleDelete}
                disabled={deleting || deleteText !== formula.name}
                style={{ flex:1, padding:'11px 0', borderRadius:10, cursor:'pointer',
                  fontFamily:'Inter,sans-serif', fontSize:13, fontWeight:600,
                  border:'none', background:S.red, color:'#fff',
                  opacity: (deleting || deleteText !== formula.name) ? 0.4 : 1 }}>
                {deleting ? 'กำลังลบ...' : 'ลบถาวร'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <BackBtn onClick={onBack}/>
        <button onClick={() => setShowConfirm(true)}
          style={{ background:'none', border:`1px solid ${S.red}44`, color:S.red,
            borderRadius:8, padding:'6px 14px', cursor:'pointer',
            fontFamily:'Inter,sans-serif', fontSize:12, fontWeight:500,
            marginBottom:20 }}>
          ลบสูตรนี้
        </button>
      </div>

      <div style={{ marginBottom:20 }}>
        <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:28, color:S.ink,
          fontStyle:'italic', lineHeight:1 }}>{formula.name}</div>
        {formula.name_meaning && (
          <div style={{ fontSize:13, color:S.gold, fontStyle:'italic', marginTop:3 }}>
            ✦ {formula.name_meaning}
          </div>
        )}
        <div style={{ fontSize:13, color:S.textMid, marginTop:4 }}>{formula.vibe}</div>
      </div>

      {/* Mood Image + Prompt */}
      <FormulaImage
        formula={{ ...formula, image_url: imageUrl }}
        onImageUpdated={url => setImageUrl(url)}
      />

      {/* DNA Summary */}
      <FormulaDNASummary formula={formulaData} items={latestItems}/>

      {/* DNA Edit */}
      <div style={{ marginTop:8 }}>
        <button onClick={() => setEditDna(p => !p)}
          style={{ width:'100%', padding:'9px 0', borderRadius:10, cursor:'pointer',
            fontFamily:'Inter,sans-serif', fontSize:12, fontWeight:500,
            border:`1.5px solid ${editDna ? S.gold : S.border}`,
            background: editDna ? S.goldLt : S.white,
            color: editDna ? S.gold : S.textMid }}>
          {editDna ? '▲ ซ่อน' : '✎ แก้ไข DNA (Feeling, Best For, ฯลฯ)'}
        </button>
        {editDna && (
          <div style={{ marginTop:12 }}>
            <FormulaDNASelector
              values={dnaValues}
              onChange={(k, v) => setDnaValues(p => ({ ...p, [k]: v }))}/>
            <button onClick={async () => {
              await db.updateFormula(formula.id, {
                projection:    dnaValues.projection,
                texture:       dnaValues.texture,
                temperature:   dnaValues.temperature,
                feeling:       dnaValues.feeling,
                opening_style: dnaValues.opening_style,
                best_for:      typeof dnaValues.best_for === 'string'
                  ? dnaValues.best_for
                  : JSON.stringify(dnaValues.best_for || []),
                avoid:         dnaValues.avoid,
                avoid_custom:  dnaValues.avoid_custom,
              })
              const fresh = await db.getFormulas().then(all => all.find(f => f.id === formula.id))
              if (fresh) setFormulaData(fresh)
              setEditDna(false)
            }}
              style={{ width:'100%', padding:'11px 0', borderRadius:10, border:'none',
                cursor:'pointer', background:S.gold, color:S.white, marginTop:12,
                fontFamily:'Inter,sans-serif', fontSize:13, fontWeight:600 }}>
              บันทึก DNA
            </button>
          </div>
        )}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:20 }}>
        {[
          { label:'Versions', val:versions.length },
          { label:'Success',  val:versions.filter(v=>v.status==='Success').length, c:S.green },
          { label:'Best', c:S.gold,
            val:versions.filter(v=>v.rating).length
              ? Math.max(...versions.filter(v=>v.rating).map(v=>v.rating))+'/10' : '—' },
        ].map(s => (
          <Card key={s.label} style={{ textAlign:'center', padding:'14px 0', marginBottom:0 }}>
            <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:24,
              color:s.c||S.text, fontWeight:300 }}>{s.val}</div>
            <div style={{ fontSize:10, color:S.textLt, letterSpacing:.5,
              marginTop:2, textTransform:'uppercase' }}>{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Stock Recommendations — ดูก่อนตัดสินใจ blend */}
      <StockRecommendations vibe={formula.vibe} materials={materials} formulaId={formula.id}/>

      <div style={{ display:'flex', gap:10, marginBottom:20 }}>
        <Btn onClick={() => setView('newVersion')} style={{ flex:1 }}>+ New Version</Btn>
        {versions.length > 0 && (
          <Btn variant="outline" onClick={() => setView('ai')} style={{ flex:1 }}>AI Analysis</Btn>
        )}
      </div>

      {/* Export buttons */}
      {versions.length > 0 && (
        <div style={{ display:'flex', gap:8, marginBottom:20 }}>
          <button onClick={handleExportPDF} disabled={exporting}
            style={{ flex:1, padding:'9px 0', borderRadius:10, cursor:'pointer',
              fontFamily:'Inter,sans-serif', fontSize:11, fontWeight:500,
              border:`1px solid ${S.goldBd}`, background:S.goldLt,
              color:S.gold, opacity: exporting ? 0.5 : 1 }}>
            {exporting ? '⏳...' : '📄 Export PDF'}
          </button>
          <button
            onClick={async () => {
              const latest = versions[versions.length - 1]
              if (!latest) return
              const its = await db.getItems(latest.id)
              setCardItems(its)
              setShowCard(true)
            }}
            style={{ flex:1, padding:'9px 0', borderRadius:10, cursor:'pointer',
              fontFamily:'Inter,sans-serif', fontSize:11, fontWeight:500,
              border:`1px solid ${S.gold}`, background:S.goldLt,
              color:S.gold }}>
            ✦ Formula Card
          </button>
          <button
            onClick={() => setShowMini(true)}
            style={{ flex:1, padding:'9px 0', borderRadius:10, cursor:'pointer',
              fontFamily:'Inter,sans-serif', fontSize:11, fontWeight:500,
              border:`1px solid ${S.gold}`, background:S.goldLt,
              color:S.gold }}>
            ▭ Mini Card
          </button>
          <button
            onClick={() => setShowLabel(true)}
            style={{ flex:1, padding:'9px 0', borderRadius:10, cursor:'pointer',
              fontFamily:'Inter,sans-serif', fontSize:11, fontWeight:500,
              border:`1px solid ${S.border}`, background:'transparent',
              color:S.textMid }}>
            🏷 Label
          </button>
        </div>
      )}

      {/* Label Generator Modal */}
      {showLabel && (
        <LabelGenerator
          formula={formula}
          latestVersion={versions[versions.length - 1]}
          onClose={() => setShowLabel(false)}/>
      )}

      {loading && <div style={{ color:S.textLt, textAlign:'center', padding:20 }}>Loading...</div>}
      {!loading && versions.length === 0 && (
        <div style={{ textAlign:'center', padding:'40px 0', color:S.textLt }}>
          <div style={{ fontSize:20, fontFamily:'Cormorant Garamond,serif', fontStyle:'italic' }}>
            ยังไม่มี version
          </div>
          <div style={{ fontSize:13, marginTop:4 }}>กด New Version เพื่อบันทึกสูตร</div>
        </div>
      )}

      {(() => {
        const finalVer = versions.find(v => v.is_final)
        const visibleVersions = finalVer ? versions.filter(v => v.is_final) : versions
        return visibleVersions.map((v, idx) => (
          <VersionCard
            key={v.id}
            ver={v}
            isLatest={idx === versions.length - 1}
            formula={formula}
            materials={materials}
            versions={versions}
            setVersions={setVersions}
          />
        ))
      })()}
    </div>
  )
}
