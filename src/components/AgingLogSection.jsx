import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { S } from '../constants/theme'

// ── Mini Chart ────────────────────────────────────────────────────────────────
function AgingChart({ logs }) {
  if (logs.length < 2) return null
  const w = 200, h = 60, pad = 8
  const maxDay = Math.max(...logs.map(l => l.day_number))
  const minDay = Math.min(...logs.map(l => l.day_number))
  const sorted = [...logs].sort((a,b) => a.day_number - b.day_number)

  const x = (day) => pad + ((day - minDay) / (maxDay - minDay || 1)) * (w - pad*2)
  const y = (rating) => h - pad - ((rating - 1) / 9) * (h - pad*2)

  const points = sorted.map(l => `${x(l.day_number)},${y(l.rating)}`).join(' ')

  return (
    <svg width={w} height={h} style={{ display:'block', margin:'8px auto 0' }}>
      {/* grid lines */}
      {[2,4,6,8,10].map(r => (
        <line key={r} x1={pad} x2={w-pad} y1={y(r)} y2={y(r)}
          stroke={S.border} strokeWidth={0.5} strokeDasharray="2,3"/>
      ))}
      {/* line */}
      <polyline points={points} fill="none" stroke={S.gold} strokeWidth={1.5}
        strokeLinejoin="round" strokeLinecap="round"/>
      {/* dots */}
      {sorted.map((l,i) => (
        <g key={i}>
          <circle cx={x(l.day_number)} cy={y(l.rating)} r={3}
            fill={S.gold} stroke={S.white} strokeWidth={1.5}/>
          <text x={x(l.day_number)} y={h-1} textAnchor="middle"
            fontSize={7} fill={S.textLt}>{l.day_number}d</text>
          <text x={x(l.day_number)} y={y(l.rating)-6} textAnchor="middle"
            fontSize={7} fill={S.gold} fontWeight="600">{l.rating}</text>
        </g>
      ))}
    </svg>
  )
}

// ── AgingLogSection ───────────────────────────────────────────────────────────
export default function AgingLogSection({ versionId }) {
  const [logs,       setLogs]       = useState([])
  const [showForm,   setShowForm]   = useState(false)
  const [saving,     setSaving]     = useState(false)

  // form state
  const [dayNum,    setDayNum]    = useState('')
  const [rating,    setRating]    = useState('')
  const [topNote,   setTopNote]   = useState('')
  const [heartNote, setHeartNote] = useState('')
  const [baseNote,  setBaseNote]  = useState('')
  const [overall,   setOverall]   = useState('')

  const iStyle = {
    width:'100%', padding:'8px 12px', borderRadius:10, fontSize:13,
    fontFamily:'Inter,sans-serif', color:S.ink, background:S.white,
    border:`1px solid ${S.border}`, outline:'none', boxSizing:'border-box',
  }

  useEffect(() => { loadLogs() }, [versionId])

  async function loadLogs() {
    const { data } = await supabase.from('blend_aging_logs')
      .select('*').eq('version_id', versionId)
      .order('day_number', { ascending: true })
    setLogs(data || [])
  }

  async function saveLog() {
    if (!dayNum || !rating) return
    setSaving(true)
    await supabase.from('blend_aging_logs').insert({
      version_id:   versionId,
      day_number:   parseInt(dayNum),
      rating:       parseInt(rating),
      top_note:     topNote || null,
      heart_note:   heartNote || null,
      base_note:    baseNote || null,
      overall_note: overall || null,
      logged_at:    new Date().toISOString().split('T')[0],
    })
    setSaving(false)
    setShowForm(false)
    setDayNum(''); setRating(''); setTopNote(''); setHeartNote(''); setBaseNote(''); setOverall('')
    loadLogs()
  }

  async function deleteLog(id) {
    await supabase.from('blend_aging_logs').delete().eq('id', id)
    setLogs(prev => prev.filter(l => l.id !== id))
  }

  return (
    <div style={{ marginTop:12, borderTop:`1px dashed ${S.border}`, paddingTop:12 }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
        <div style={{ fontSize:10, fontWeight:700, color:S.gold,
          letterSpacing:.8, textTransform:'uppercase' }}>🌿 Aging Log</div>
        <button onClick={() => setShowForm(!showForm)}
          style={{ fontSize:11, color:S.gold, background:'none',
            border:`1px solid ${S.goldBd}`, borderRadius:16,
            padding:'3px 12px', cursor:'pointer', fontFamily:'Inter,sans-serif' }}>
          {showForm ? 'ยกเลิก' : '+ บันทึกวันนี้'}
        </button>
      </div>

      {/* Chart */}
      {logs.filter(l => l.rating).length >= 2 && (
        <AgingChart logs={logs.filter(l => l.rating)}/>
      )}

      {/* Form */}
      {showForm && (
        <div style={{ background:S.goldLt, borderRadius:12, padding:14,
          border:`1px solid ${S.goldBd}`, marginBottom:12 }}>

          {/* Day + Rating */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10 }}>
            <div>
              <div style={{ fontSize:10, color:S.textMid, marginBottom:4,
                textTransform:'uppercase', letterSpacing:.5 }}>Day</div>
              <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                {[1,3,5,7,10,14,21,30].map(d => (
                  <button key={d} onClick={() => setDayNum(String(d))}
                    style={{ padding:'4px 9px', borderRadius:14, cursor:'pointer',
                      fontSize:11, fontFamily:'Inter,sans-serif',
                      border:`1.5px solid ${dayNum===String(d)?S.gold:S.goldBd}`,
                      background: dayNum===String(d)?S.gold:'transparent',
                      color: dayNum===String(d)?'#fff':S.gold }}>
                    {d}
                  </button>
                ))}
                <input type="number" placeholder="อื่นๆ" value={![1,3,5,7,10,14,21,30].includes(parseInt(dayNum)) ? dayNum : ''}
                  onChange={e => setDayNum(e.target.value)}
                  style={{ ...iStyle, width:60, padding:'4px 8px' }}/>
              </div>
            </div>
            <div>
              <div style={{ fontSize:10, color:S.textMid, marginBottom:4,
                textTransform:'uppercase', letterSpacing:.5 }}>Rating (1-10)</div>
              <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                {[1,2,3,4,5,6,7,8,9,10].map(r => (
                  <button key={r} onClick={() => setRating(String(r))}
                    style={{ width:26, height:26, borderRadius:8, cursor:'pointer',
                      fontSize:11, fontFamily:'Inter,sans-serif', fontWeight:500,
                      border:`1.5px solid ${rating===String(r)?S.gold:S.border}`,
                      background: rating===String(r)?S.gold:'transparent',
                      color: rating===String(r)?'#fff':S.textMid }}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Top / Heart / Base */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:10 }}>
            {[
              { label:'Top note', val:topNote, set:setTopNote, ph:'สดใส, เปรี้ยว...' },
              { label:'Heart note', val:heartNote, set:setHeartNote, ph:'ดอกไม้, นุ่ม...' },
              { label:'Base note', val:baseNote, set:setBaseNote, ph:'ไม้, มัสก์...' },
            ].map(f => (
              <div key={f.label}>
                <div style={{ fontSize:10, color:S.textMid, marginBottom:4,
                  textTransform:'uppercase', letterSpacing:.4 }}>{f.label}</div>
                <input value={f.val} onChange={e => f.set(e.target.value)}
                  placeholder={f.ph} style={{ ...iStyle, fontSize:12 }}/>
              </div>
            ))}
          </div>

          {/* Overall */}
          <div style={{ marginBottom:10 }}>
            <div style={{ fontSize:10, color:S.textMid, marginBottom:4,
              textTransform:'uppercase', letterSpacing:.5 }}>Overall note</div>
            <textarea value={overall} onChange={e => setOverall(e.target.value)}
              rows={2} placeholder="กลิ่นเป็นยังไงบ้าง projection, longevity, ความเปลี่ยนแปลง..."
              style={{ ...iStyle, resize:'none', lineHeight:1.5 }}/>
          </div>

          <button onClick={saveLog} disabled={saving || !dayNum || !rating}
            style={{ width:'100%', padding:'10px 0', borderRadius:10, cursor:'pointer',
              fontFamily:'Inter,sans-serif', fontSize:13, fontWeight:600,
              background: (!dayNum || !rating) ? S.border : S.gold,
              border:'none', color:'#fff', opacity: saving ? .6 : 1 }}>
            {saving ? 'Saving...' : '✓ บันทึก'}
          </button>
        </div>
      )}

      {/* Log list */}
      {logs.length === 0 && !showForm && (
        <div style={{ fontSize:11, color:S.textLt, textAlign:'center',
          padding:'8px 0', fontStyle:'italic' }}>
          ยังไม่มี aging log — กด "+ บันทึกวันนี้" เลยค่ะ
        </div>
      )}

      {logs.map(l => (
        <div key={l.id} style={{ background:S.white, borderRadius:10,
          border:`1px solid ${S.border}`, padding:'10px 12px', marginBottom:8 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <span style={{ fontSize:12, fontWeight:700, color:S.gold }}>
                Day {l.day_number}
              </span>
              {l.rating && (
                <span style={{ fontSize:11, color:S.ink, background:S.goldLt,
                  padding:'2px 8px', borderRadius:12, border:`1px solid ${S.goldBd}` }}>
                  {l.rating}/10
                </span>
              )}
              <span style={{ fontSize:10, color:S.textLt }}>
                {new Date(l.logged_at).toLocaleDateString('th-TH', { day:'numeric', month:'short' })}
              </span>
            </div>
            <button onClick={() => deleteLog(l.id)}
              style={{ background:'none', border:'none', cursor:'pointer',
                color:S.textLt, fontSize:14 }}>✕</button>
          </div>

          {/* notes row */}
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom: l.overall_note ? 6 : 0 }}>
            {l.top_note && (
              <span style={{ fontSize:11, color:S.textMid }}>
                <span style={{ color:S.textLt }}>Top:</span> {l.top_note}
              </span>
            )}
            {l.heart_note && (
              <span style={{ fontSize:11, color:S.textMid }}>
                · <span style={{ color:S.textLt }}>Heart:</span> {l.heart_note}
              </span>
            )}
            {l.base_note && (
              <span style={{ fontSize:11, color:S.textMid }}>
                · <span style={{ color:S.textLt }}>Base:</span> {l.base_note}
              </span>
            )}
          </div>
          {l.overall_note && (
            <div style={{ fontSize:12, color:S.textMid, fontStyle:'italic',
              lineHeight:1.5, marginTop:4 }}>
              "{l.overall_note}"
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
