import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { db } from '../lib/db'
import { S } from '../constants/theme'
import { Card, Btn, StatusBadge, FamilyBadge } from '../components/ui'

export default function PageList({ onSelect, onCreate }) {
  const [formulas,    setFormulas]    = useState([])
  const [materials,   setMaterials]   = useState([])
  const [allVersions, setAllVersions] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [notes,       setNotes]       = useState([])

  useEffect(() => {
    Promise.all([
      db.getFormulas(),
      db.getMaterials(),
      supabase.from('formula_versions').select('*').order('created_at', { ascending: false }),
      supabase.from('quick_notes').select('*').order('created_at', { ascending: false }).limit(10),
    ]).then(([f, m, { data: v }, { data: n }]) => {
      setFormulas(f)
      setMaterials(m)
      setAllVersions(v || [])
      setNotes(n || [])
      setLoading(false)
    })
  }, [])

  async function deleteNote(id) {
    await supabase.from('quick_notes').delete().eq('id', id)
    setNotes(prev => prev.filter(n => n.id !== id))
  }

  const successCount  = allVersions.filter(v => v.status === 'Success').length
  const lowStock      = materials.filter(m => (m.stock || 0) < 10)
  const latestVersion = allVersions[0]
  const latestFormula = latestVersion ? formulas.find(f => f.id === latestVersion.formula_id) : null

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:32, color:S.ink,
          fontStyle:'italic', lineHeight:1, marginBottom:4 }}>Formula Lab</div>
        <div style={{ fontSize:13, color:S.textLt }}>
          {new Date().toLocaleDateString('th-TH', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:20 }}>
        {[
          { label:'Formulas', val:formulas.length,  icon:'◈' },
          { label:'Versions', val:allVersions.length, icon:'◎' },
          { label:'Success',  val:successCount, icon:'✓', color:S.green },
        ].map(s => (
          <div key={s.label} style={{ background:S.white, borderRadius:12,
            border:`1px solid ${S.border}`, padding:'14px 0', textAlign:'center' }}>
            <div style={{ fontSize:10, color:S.textLt, marginBottom:4 }}>{s.icon}</div>
            <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:26,
              color:s.color || S.ink, fontWeight:300 }}>{s.val}</div>
            <div style={{ fontSize:10, color:S.textLt, letterSpacing:.5,
              textTransform:'uppercase', marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <Btn onClick={onCreate} style={{ width:'100%', marginBottom:20 }}>+ New Formula</Btn>

      {loading && <div style={{ textAlign:'center', padding:40, color:S.textLt }}>Loading...</div>}

      {!loading && (
        <>
          {/* Quick Notes from Line */}
          {notes.length > 0 && (
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:11, color:S.textLt, letterSpacing:1,
                textTransform:'uppercase', marginBottom:10 }}>💬 Quick Notes</div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {notes.map(n => (
                  <div key={n.id} style={{ background:S.white, borderRadius:12,
                    border:`1px solid ${S.border}`, padding:'12px 14px',
                    display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, color:S.ink, lineHeight:1.5 }}>{n.content}</div>
                      <div style={{ fontSize:10, color:S.textLt, marginTop:4 }}>
                        {new Date(n.created_at).toLocaleDateString('th-TH', {
                          day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'
                        })}
                      </div>
                    </div>
                    <button onClick={() => deleteNote(n.id)}
                      style={{ background:'none', border:'none', cursor:'pointer',
                        color:S.textLt, fontSize:14, padding:'2px 4px', flexShrink:0 }}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Latest Activity */}
          {latestVersion && latestFormula && (
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:11, color:S.textLt, letterSpacing:1,
                textTransform:'uppercase', marginBottom:10 }}>Latest Activity</div>
              <Card onClick={() => onSelect(latestFormula)} style={{ cursor:'pointer',
                borderLeft:`3px solid ${latestVersion.status==='Success'?S.green:latestVersion.status==='Failed'?S.red:S.gold}` }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div>
                    <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:18,
                      fontStyle:'italic', color:S.ink }}>{latestFormula.name}</div>
                    <div style={{ fontSize:11, color:S.textLt, marginTop:2 }}>
                      V{latestVersion.ver} · {latestVersion.blend_date}
                      {latestVersion.batch_ml && ` · ${latestVersion.batch_ml}ml`}
                    </div>
                    {latestVersion.notes && (
                      <div style={{ fontSize:12, color:S.textMid, marginTop:4,
                        fontStyle:'italic', lineHeight:1.5 }}>"{latestVersion.notes}"</div>
                    )}
                  </div>
                  <StatusBadge status={latestVersion.status}/>
                </div>
              </Card>
            </div>
          )}

          {/* Low Stock Alert */}
          {lowStock.length > 0 && (
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:11, color:S.red, letterSpacing:1,
                textTransform:'uppercase', marginBottom:10 }}>⚠ Low Stock</div>
              <div style={{ background:'#fdf0ee', borderRadius:12, padding:'14px 16px',
                border:`1px solid ${S.red}33` }}>
                {lowStock.map((m,i) => (
                  <div key={m.id} style={{ display:'flex', justifyContent:'space-between',
                    paddingBottom: i < lowStock.length-1 ? 8 : 0,
                    marginBottom:  i < lowStock.length-1 ? 8 : 0,
                    borderBottom:  i < lowStock.length-1 ? `1px solid ${S.red}22` : 'none' }}>
                    <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                      <FamilyBadge family={m.family}/>
                      <span style={{ fontSize:13, color:S.ink }}>{m.name}</span>
                    </div>
                    <span style={{ fontSize:12, color: m.stock < 5 ? S.red : S.amber,
                      fontWeight:500 }}>{m.stock}g</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Formula list */}
          <div style={{ fontSize:11, color:S.textLt, letterSpacing:1,
            textTransform:'uppercase', marginBottom:10 }}>All Formulas</div>

          {formulas.length === 0 ? (
            <div style={{ textAlign:'center', padding:'40px 0', color:S.textLt }}>
              <div style={{ fontSize:20, fontFamily:'Cormorant Garamond,serif',
                fontStyle:'italic', marginBottom:6 }}>ยังไม่มีสูตรน้ำหอม</div>
              <div style={{ fontSize:13 }}>กด New Formula เพื่อเริ่มบันทึก</div>
            </div>
          ) : (
            formulas.map(f => {
              const fVers      = allVersions.filter(v => v.formula_id === f.id)
              const latest     = fVers[0]
              const bestRating = fVers.filter(v => v.rating).sort((a,b) => b.rating - a.rating)[0]
              return (
                <Card key={f.id} onClick={() => onSelect(f)} style={{ cursor:'pointer' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                    <div style={{ flex:1, paddingRight:10 }}>
                      <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:20,
                        fontStyle:'italic', color:S.ink, marginBottom:2 }}>{f.name}</div>
                      {f.name_meaning && (
                        <div style={{ fontSize:11, color:S.gold, fontStyle:'italic', marginBottom:4 }}>
                          ✦ {f.name_meaning}
                        </div>
                      )}
                      <div style={{ fontSize:12, color:S.textMid }}>{f.vibe}</div>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      {latest && <StatusBadge status={latest.status}/>}
                      {bestRating && (
                        <div style={{ fontSize:11, color:S.gold, marginTop:4,
                          fontFamily:'Inter,sans-serif', fontWeight:500 }}>
                          {bestRating.rating}/10
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between',
                    marginTop:10, paddingTop:8, borderTop:`1px solid ${S.border}` }}>
                    <span style={{ fontSize:11, color:S.textLt }}>
                      {fVers.length} version{fVers.length !== 1 ? 's' : ''}
                      {latest?.batch_ml ? ` · latest ${latest.batch_ml}ml` : ''}
                    </span>
                    <span style={{ fontSize:11, color:S.gold, fontWeight:500 }}>Open →</span>
                  </div>
                </Card>
              )
            })
          )}
        </>
      )}
    </div>
  )
}
