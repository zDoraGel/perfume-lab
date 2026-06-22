import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { S } from '../constants/theme'

// ── helpers ───────────────────────────────────────────────────────────────────
function daysSince(dateStr) {
  if (!dateStr) return 0
  const diff = Date.now() - new Date(dateStr).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

function agingStage(days) {
  if (days < 3)   return { label:'Day 1–2',    desc:'แอลกอฮอลยังแรง กลิ่นโดด', color:'#8a3a2e', bg:'#fdf0ee' }
  if (days < 14)  return { label:'Week 1',     desc:'กลิ่นเริ่มรวมตัว', color:'#7a5c20', bg:'#fdf5e6' }
  if (days < 30)  return { label:'Week 2–3',   desc:'กลิ่นนวลขึ้น กลมกลืนกันดี', color:'#3a7a5a', bg:'#eef7f0' }
  if (days < 90)  return { label:'Month 1',    desc:'กลิ่นเต็มที่ หรูหราตามวิบ', color:'#3d6b4a', bg:'#eef5f0' }
  if (days < 180) return { label:'Month 3',    desc:'Deep & complex', color:'#5a4a8a', bg:'#f0eef8' }
  return              { label:'6+ months', desc:'Fully matured', color:'#8a6f3e', bg:'#f5f0e8' }
}

const MILESTONES = [
  { days:1,   label:'Day 1',     icon:'🧪' },
  { days:3,   label:'Day 3',     icon:'⏳' },
  { days:7,   label:'Week 1',    icon:'📅' },
  { days:14,  label:'Week 2',    icon:'✨' },
  { days:30,  label:'Month 1',   icon:'🌿' },
  { days:90,  label:'Month 3',   icon:'🏆' },
  { days:180, label:'6 Months',  icon:'💎' },
]

// ── Star Rating ───────────────────────────────────────────────────────────────
function StarRating({ value, onChange }) {
  return (
    <div style={{ display:'flex', gap:4 }}>
      {Array.from({length:5}, (_,i) => (
        <button key={i} onClick={() => onChange(i+1)}
          style={{ fontSize:18, background:'none', border:'none', cursor:'pointer',
            color: i < value ? '#d4a020' : S.border, padding:0, lineHeight:1 }}>
          {i < value ? '★' : '☆'}
        </button>
      ))}
    </div>
  )
}

// ── Add Log Modal ─────────────────────────────────────────────────────────────
function AddLogModal({ batchId, formulaId, producedAt, onSave, onClose }) {
  const days    = daysSince(producedAt)
  const stage   = agingStage(days)
  const [rating, setRating]   = useState(3)
  const [note,   setNote]     = useState('')
  const [saving, setSaving]   = useState(false)

  // suggest nearest milestone
  const nearest = MILESTONES.reduce((best, m) =>
    Math.abs(m.days - days) < Math.abs(best.days - days) ? m : best
  )

  async function save() {
    if (!note.trim()) { alert('กรอก note สั้นๆ ด้วยนะคะ'); return }
    setSaving(true)
    const { data } = await supabase.from('aging_logs').insert({
      batch_id:   batchId,
      formula_id: formulaId,
      day_number: days,
      rating,
      note:       note.trim(),
      logged_at:  new Date().toISOString(),
    }).select().single()
    setSaving(false)
    if (data) { onSave(data); onClose() }
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)',
      zIndex:200, display:'flex', alignItems:'center', justifyContent:'center',
      padding:16 }}>
      <div style={{ background:S.white, borderRadius:16, padding:24,
        width:'100%', maxWidth:400 }}>

        {/* Header */}
        <div style={{ marginBottom:16 }}>
          <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:20,
            fontStyle:'italic', color:S.ink, marginBottom:4 }}>
            {nearest.icon} Aging Note
          </div>
          <div style={{ display:'inline-flex', alignItems:'center', gap:6,
            padding:'4px 12px', borderRadius:20, fontSize:12,
            background:stage.bg, color:stage.color, fontWeight:600 }}>
            {stage.label} · วันที่ {days}
          </div>
          <div style={{ fontSize:11, color:S.textMid, marginTop:4 }}>{stage.desc}</div>
        </div>

        {/* Rating */}
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:11, color:S.textMid, fontWeight:600,
            textTransform:'uppercase', letterSpacing:.5, marginBottom:8,
            fontFamily:'Inter,sans-serif' }}>Rating</div>
          <StarRating value={rating} onChange={setRating}/>
        </div>

        {/* Note */}
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:11, color:S.textMid, fontWeight:600,
            textTransform:'uppercase', letterSpacing:.5, marginBottom:6,
            fontFamily:'Inter,sans-serif' }}>Note</div>
          <textarea value={note} onChange={e=>setNote(e.target.value)} rows={3}
            placeholder={'เช่น: แอลกอฮอลลดลง กลิ่นชาเริ่มชัดขึ้น มัสก์ยังเบา...'}
            style={{ width:'100%', padding:'10px 12px', borderRadius:10, fontSize:13,
              border:`1px solid ${S.border}`, fontFamily:'Inter,sans-serif',
              color:S.ink, background:S.white, outline:'none', resize:'none', boxSizing:'border-box' }}/>
        </div>

        <div style={{ display:'flex', gap:8 }}>
          <button onClick={onClose}
            style={{ flex:1, padding:'11px 0', borderRadius:10, cursor:'pointer',
              fontFamily:'Inter,sans-serif', fontSize:13,
              border:`1px solid ${S.border}`, background:'transparent', color:S.textMid }}>
            ยกเลิก
          </button>
          <button onClick={save} disabled={saving || !note.trim()}
            style={{ flex:2, padding:'11px 0', borderRadius:10, cursor:'pointer',
              fontFamily:'Inter,sans-serif', fontSize:13, fontWeight:600,
              border:'none', background:S.gold, color:'#fff',
              opacity: saving || !note.trim() ? 0.5 : 1 }}>
            {saving ? '⏳...' : '✦ บันทึก'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AgingLog({ batchId, formulaId, producedAt, formulaName }) {
  const [logs,     setLogs]     = useState([])
  const [showAdd,  setShowAdd]  = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (!batchId) return
    supabase.from('aging_logs')
      .select('*').eq('batch_id', batchId)
      .order('day_number', { ascending: true })
      .then(({ data }) => setLogs(data || []))
  }, [batchId])

  const days  = daysSince(producedAt)
  const stage = agingStage(days)

  // next milestone
  const nextMilestone = MILESTONES.find(m => m.days > days)
  const daysToNext    = nextMilestone ? nextMilestone.days - days : null

  return (
    <div style={{ marginBottom:8 }}>

      {/* Header row */}
      <div onClick={() => setExpanded(p=>!p)}
        style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
          padding:'10px 14px', borderRadius: expanded ? '12px 12px 0 0' : 12,
          background:stage.bg, border:`1px solid ${stage.color}33`,
          cursor:'pointer' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:stage.color,
              fontFamily:'Inter,sans-serif' }}>
              ⏱ Aging · {stage.label}
            </div>
            <div style={{ fontSize:10, color:S.textMid, marginTop:1 }}>
              {stage.desc}
              {daysToNext && (
                <span style={{ marginLeft:6, color:stage.color }}>
                  · อีก {daysToNext} วัน → {nextMilestone.label}
                </span>
              )}
            </div>
          </div>
          {logs.length > 0 && (
            <div style={{ fontSize:10, color:stage.color, background:S.white,
              padding:'2px 8px', borderRadius:20, fontWeight:600 }}>
              {logs.length} notes
            </div>
          )}
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <button onClick={e => { e.stopPropagation(); setShowAdd(true) }}
            style={{ fontSize:11, color:stage.color, background:S.white,
              border:`1px solid ${stage.color}55`, borderRadius:16,
              padding:'4px 10px', cursor:'pointer', fontFamily:'Inter,sans-serif',
              fontWeight:600 }}>
            + Note
          </button>
          <span style={{ color:stage.color, fontSize:12 }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Timeline */}
      {expanded && (
        <div style={{ border:`1px solid ${stage.color}33`, borderTop:'none',
          borderRadius:'0 0 12px 12px', background:S.white, padding:'14px 14px 10px' }}>

          {/* Milestone progress bar */}
          <div style={{ marginBottom:14 }}>
            <div style={{ display:'flex', gap:0, position:'relative' }}>
              {MILESTONES.map((m, i) => {
                const reached = days >= m.days
                const current = i === MILESTONES.findIndex(x => x.days > days) - 1
                return (
                  <div key={m.days} style={{ flex:1, textAlign:'center', position:'relative' }}>
                    <div style={{ width:10, height:10, borderRadius:'50%', margin:'0 auto 4px',
                      background: reached ? stage.color : S.border,
                      border:`2px solid ${reached ? stage.color : S.border}`,
                      position:'relative', zIndex:1,
                      boxShadow: current ? `0 0 0 3px ${stage.color}33` : 'none' }}/>
                    <div style={{ fontSize:7, color: reached ? stage.color : S.textLt,
                      fontWeight: reached ? 600 : 400 }}>{m.label}</div>
                    {i < MILESTONES.length-1 && (
                      <div style={{ position:'absolute', top:4, left:'50%', right:'-50%',
                        height:2, background: reached ? stage.color : S.border, zIndex:0 }}/>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Log entries */}
          {logs.length === 0 ? (
            <div style={{ textAlign:'center', padding:'16px 0',
              fontSize:12, color:S.textLt, fontStyle:'italic' }}>
              ยังไม่มี note — กด + Note เพื่อบันทึกครั้งแรกค่ะ
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {logs.map(log => (
                <div key={log.id} style={{ display:'flex', gap:10, alignItems:'flex-start',
                  padding:'10px 12px', borderRadius:10,
                  background:S.bg, border:`1px solid ${S.border}` }}>
                  <div style={{ flexShrink:0, textAlign:'center', width:44 }}>
                    <div style={{ fontSize:9, fontWeight:700, color:stage.color,
                      textTransform:'uppercase', fontFamily:'Inter,sans-serif' }}>
                      Day {log.day_number}
                    </div>
                    <div style={{ display:'flex', justifyContent:'center', gap:1, marginTop:2 }}>
                      {Array.from({length:5}, (_,i) => (
                        <span key={i} style={{ fontSize:9,
                          color: i < log.rating ? '#d4a020' : S.border }}>
                          {i < log.rating ? '★' : '☆'}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, color:S.ink, lineHeight:1.6 }}>{log.note}</div>
                    <div style={{ fontSize:10, color:S.textLt, marginTop:3 }}>
                      {new Date(log.logged_at).toLocaleDateString('th-TH')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add modal */}
      {showAdd && (
        <AddLogModal
          batchId={batchId}
          formulaId={formulaId}
          producedAt={producedAt}
          onSave={log => setLogs(prev => [...prev, log])}
          onClose={() => setShowAdd(false)}/>
      )}
    </div>
  )
}
