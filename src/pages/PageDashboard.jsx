import { useState, useEffect } from 'react'
import { db } from '../lib/db'
import { S } from '../constants/theme'
import { supabase } from '../lib/supabase'

// ── Trend helpers ─────────────────────────────────────────────────────────────
async function fetchSavedTrends() {
  const { data } = await supabase
    .from('trend_items')
    .select('*')
    .order('fetched_at', { ascending: false })
    .limit(20)
  return data || []
}

async function toggleSaved(id, is_saved) {
  await supabase.from('trend_items').update({ is_saved }).eq('id', id)
}

async function toggleDone(id, is_done) {
  await supabase.from('trend_items').update({ is_done }).eq('id', id)
}

async function updateNote(id, saved_note) {
  await supabase.from('trend_items').update({ saved_note }).eq('id', id)
}

async function callTrendFetch() {
  const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/trend-fetch`
  const res = await fetch(fnUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
  })
  return res.json()
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function Stat({ label, value, sub, color }) {
  return (
    <div style={{ background:S.white, border:`1px solid ${S.border}`,
      borderRadius:12, padding:'14px 16px' }}>
      <div style={{ fontSize:11, color:S.textLt, textTransform:'uppercase',
        letterSpacing:.6, marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:22, fontWeight:700, color: color || S.text,
        fontFamily:'Cormorant Garamond,serif' }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:S.textMid, marginTop:3 }}>{sub}</div>}
    </div>
  )
}

// ── Bar chart (SVG, no deps) ──────────────────────────────────────────────────
function BarChart({ data }) {
  if (!data.length) return (
    <div style={{ textAlign:'center', padding:'32px 0', color:S.textLt, fontSize:13 }}>
      No data yet
    </div>
  )

  const maxVal = Math.max(...data.flatMap(d => [d.produced, d.sold]), 1)
  const W = 320, H = 140, PAD = 28, BAR_W = 14, GAP = 6
  const colW = (W - PAD) / data.length
  const scaleY = v => H - (v / maxVal) * (H - 20)

  return (
    <svg viewBox={`0 0 ${W} ${H + 30}`} style={{ width:'100%', overflow:'visible' }}>
      {/* y gridlines */}
      {[0, 0.5, 1].map(f => {
        const y = H - f * (H - 20)
        return (
          <g key={f}>
            <line x1={PAD} y1={y} x2={W} y2={y}
              stroke={S.border} strokeWidth=".5" strokeDasharray="3,3"/>
            <text x={PAD - 4} y={y + 3} textAnchor="end"
              fontSize={7} fill={S.textLt}>{Math.round(f * maxVal)}</text>
          </g>
        )
      })}

      {data.map((d, i) => {
        const x = PAD + i * colW + colW / 2
        const yP = scaleY(d.produced)
        const yS = scaleY(d.sold)
        return (
          <g key={d.key}>
            {/* produced bar */}
            <rect x={x - BAR_W - GAP/2} y={yP} width={BAR_W}
              height={H - yP} rx={3} fill={S.goldBd} opacity={.85}/>
            {/* sold bar */}
            <rect x={x + GAP/2} y={yS} width={BAR_W}
              height={H - yS} rx={3} fill={S.green} opacity={.8}/>
            {/* label */}
            <text x={x} y={H + 14} textAnchor="middle"
              fontSize={8} fill={S.textMid}>{d.label}</text>
          </g>
        )
      })}

      {/* legend */}
      <rect x={PAD} y={H + 22} width={7} height={7} rx={2} fill={S.goldBd}/>
      <text x={PAD + 10} y={H + 29} fontSize={8} fill={S.textMid}>Produced</text>
      <rect x={PAD + 56} y={H + 22} width={7} height={7} rx={2} fill={S.green}/>
      <text x={PAD + 66} y={H + 29} fontSize={8} fill={S.textMid}>Sold</text>
    </svg>
  )
}

// ── Stock alert row ───────────────────────────────────────────────────────────
function AlertRow({ name, remaining, total, isRetail }) {
  const pct = total > 0 ? Math.round((remaining / total) * 100) : 0
  const color = remaining <= 0 ? S.red : S.amber
  const bg    = remaining <= 0 ? S.redBg : S.amberBg
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10,
      padding:'10px 0', borderBottom:`1px solid ${S.border}` }}>
      <div style={{ width:32, height:32, borderRadius:8, background:bg,
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:14, flexShrink:0 }}>
        {remaining <= 0 ? '✕' : '⚠'}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:600, color:S.text,
          fontFamily:'Cormorant Garamond,serif', whiteSpace:'nowrap',
          overflow:'hidden', textOverflow:'ellipsis' }}>{name}</div>
        <div style={{ fontSize:10, color:S.textLt, marginTop:1 }}>
          {isRetail ? 'Retail' : 'In-house'}
        </div>
      </div>
      <div style={{ textAlign:'right', flexShrink:0 }}>
        <div style={{ fontSize:13, fontWeight:700, color }}>
          {remaining <= 0 ? 'Out of stock' : `${remaining} left`}
        </div>
        <div style={{ fontSize:10, color:S.textLt }}>/ {total} bottles</div>
      </div>
    </div>
  )
}

// ── Top seller row ────────────────────────────────────────────────────────────
function TopRow({ rank, name, sold, produced, isRetail }) {
  const pct = produced > 0 ? Math.round((sold / produced) * 100) : 0
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10,
      padding:'10px 0', borderBottom:`1px solid ${S.border}` }}>
      <div style={{ width:24, height:24, borderRadius:'50%',
        background: rank === 1 ? S.goldLt : S.bg,
        border:`1px solid ${rank === 1 ? S.goldBd : S.border}`,
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:11, fontWeight:700, color: rank === 1 ? S.gold : S.textMid,
        flexShrink:0 }}>{rank}</div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:600, color:S.text,
          fontFamily:'Cormorant Garamond,serif', whiteSpace:'nowrap',
          overflow:'hidden', textOverflow:'ellipsis' }}>{name}</div>
        <div style={{ background:S.border, borderRadius:3, height:4, marginTop:5 }}>
          <div style={{ width:`${pct}%`, height:'100%', background:S.gold,
            borderRadius:3, transition:'width .4s' }}/>
        </div>
      </div>
      <div style={{ textAlign:'right', flexShrink:0 }}>
        <div style={{ fontSize:14, fontWeight:700, color:S.gold }}>{sold}</div>
        <div style={{ fontSize:10, color:S.textLt }}>btl · {pct}%</div>
      </div>
    </div>
  )
}

// ── Trend Card ────────────────────────────────────────────────────────────────
function TrendCard({ trend, onToggleSaved, onToggleDone, onNote }) {
  const [editNote, setEditNote] = useState(false)
  const [noteVal,  setNoteVal]  = useState(trend.saved_note || '')

  return (
    <div style={{ background:S.white, border:`1px solid ${trend.is_saved ? S.goldBd : S.border}`,
      borderRadius:12, padding:14, marginBottom:10,
      opacity: trend.is_done ? .6 : 1 }}>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, fontWeight:700, color:S.text,
            fontFamily:'Cormorant Garamond,serif',
            textDecoration: trend.is_done ? 'line-through' : 'none' }}>
            {trend.title}
          </div>
          <div style={{ fontSize:11, color:S.textMid, marginTop:4, lineHeight:1.5 }}>
            {trend.description}
          </div>
          {trend.keywords?.length > 0 && (
            <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginTop:6 }}>
              {trend.keywords.map((k,i) => (
                <span key={i} style={{ fontSize:10, padding:'2px 8px', borderRadius:12,
                  background:S.goldLt, color:S.gold, border:`1px solid ${S.goldBd}` }}>
                  {k}
                </span>
              ))}
            </div>
          )}
          {trend.saved_note && !editNote && (
            <div style={{ fontSize:11, color:S.textMid, marginTop:6,
              fontStyle:'italic', padding:'4px 8px', background:S.bg, borderRadius:6 }}>
              📝 {trend.saved_note}
            </div>
          )}
          {editNote && (
            <div style={{ marginTop:6, display:'flex', gap:6 }}>
              <input value={noteVal} onChange={e => setNoteVal(e.target.value)}
                placeholder="note ของฉัน..."
                style={{ flex:1, padding:'5px 8px', borderRadius:6, fontSize:11,
                  border:`1px solid ${S.goldBd}`, outline:'none' }}/>
              <button onClick={() => { onNote(noteVal); setEditNote(false) }}
                style={{ padding:'5px 10px', borderRadius:6, border:'none',
                  background:S.gold, color:'#fff', fontSize:11, cursor:'pointer' }}>บันทึก</button>
              <button onClick={() => setEditNote(false)}
                style={{ padding:'5px 8px', borderRadius:6, border:`1px solid ${S.border}`,
                  background:'none', fontSize:11, cursor:'pointer', color:S.textMid }}>ยกเลิก</button>
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display:'flex', flexDirection:'column', gap:4, flexShrink:0 }}>
          <button onClick={onToggleSaved}
            title={trend.is_saved ? 'ยกเลิก bookmark' : 'บันทึกไว้'}
            style={{ padding:'5px 8px', borderRadius:8, border:'none',
              background: trend.is_saved ? S.goldLt : S.bg,
              cursor:'pointer', fontSize:14 }}>
            {trend.is_saved ? '🔖' : '📌'}
          </button>
          <button onClick={onToggleDone}
            title={trend.is_done ? 'ยังไม่ทำ' : 'ทำแล้ว'}
            style={{ padding:'5px 8px', borderRadius:8, border:'none',
              background: trend.is_done ? S.greenBg : S.bg,
              cursor:'pointer', fontSize:14 }}>
            {trend.is_done ? '✅' : '○'}
          </button>
          <button onClick={() => { setEditNote(true); setNoteVal(trend.saved_note || '') }}
            title="เพิ่ม note"
            style={{ padding:'5px 8px', borderRadius:8, border:'none',
              background:S.bg, cursor:'pointer', fontSize:14 }}>
            📝
          </button>
        </div>
      </div>

      <div style={{ fontSize:9, color:S.textLt, marginTop:8 }}>
        {new Date(trend.fetched_at).toLocaleDateString('th-TH', { day:'numeric', month:'short', year:'2-digit' })}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function PageDashboard({ onNavigate }) {
  const [loading,    setLoading]    = useState(true)
  const [prodSum,    setProdSum]    = useState([])
  const [monthly,    setMonthly]    = useState([])
  const [retail,     setRetail]     = useState([])
  const [trends,     setTrends]     = useState([])
  const [fetching,   setFetching]   = useState(false)
  const [sending,    setSending]    = useState(false)
  const [alertsOpen, setAlertsOpen] = useState(false)

  async function handleSendReport() {
    setSending(true)
    try {
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/daily-report`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        }
      })
      alert('ส่ง Report ไป LINE แล้วค่ะ ✅')
    } catch(e) {
      alert('ส่งไม่สำเร็จ ลองใหม่นะคะ')
    }
    setSending(false)
  }

  const loadTrends = () => fetchSavedTrends().then(setTrends)

  async function handleFetchTrends() {
    setFetching(true)
    await callTrendFetch()
    await loadTrends()
    setFetching(false)
  }

  async function handleToggleSaved(id, val) {
    await toggleSaved(id, val)
    loadTrends()
  }

  async function handleToggleDone(id, val) {
    await toggleDone(id, val)
    loadTrends()
  }

  async function handleNote(id, note) {
    await updateNote(id, note)
    loadTrends()
  }

  useEffect(() => {
    Promise.all([
      db.getProductionSummary(),
      db.getMonthlySeries(),
      db.getRetailStockSummary().catch(() => []),
    ]).then(([ps, ms, rs]) => {
      setProdSum(ps)
      setMonthly(ms)
      setRetail(rs)
      setLoading(false)
    })
    loadTrends()
  }, [])

  if (loading) return (
    <div style={{ textAlign:'center', padding:60, color:S.textLt, fontSize:13 }}>
      กำลังโหลด…
    </div>
  )

  // ── คำนวณ stats ──
  const totalProduced = prodSum.reduce((s, f) => s + f.produced, 0)
  const totalSold     = prodSum.reduce((s, f) => s + f.sold, 0)
  const totalRemaining = totalProduced - totalSold

  const retailSold    = retail.reduce((s, r) => s + r.qty_sold, 0)
  const retailRevenue = retail.reduce((s, r) => s + (r.price_per_unit||0) * r.qty_sold, 0)
  const retailProfit  = retail.reduce((s, r) =>
    s + ((r.price_per_unit||0) - (r.cost_per_unit||0)) * r.qty_sold, 0)

  // top sellers — รวม prodSum + retail, sort by sold
  const allItems = [
    ...prodSum.map(f  => ({ name: f.name,  sold: f.sold,  total: f.produced, isRetail: false })),
    ...retail.map(r   => ({ name: r.name,  sold: r.qty_sold, total: r.qty_total, isRetail: true  })),
  ].filter(x => x.sold > 0).sort((a,b) => b.sold - a.sold).slice(0,5)

  // alerts — เหลือน้อย / หมด
  const alerts = [
    ...prodSum.filter(f => f.remaining <= 3)
      .map(f => ({ name:f.name, remaining:f.remaining, total:f.produced, isRetail:false })),
    ...retail.filter(r => r.isLow)
      .map(r => ({ name:r.name, remaining:r.remaining, total:r.qty_total, isRetail:true })),
  ].sort((a,b) => a.remaining - b.remaining)

  const isEmpty = totalProduced === 0 && retail.length === 0

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:10, color:S.textLt, textTransform:'uppercase', letterSpacing:2 }}>
          Perfume Creation Studio
        </div>
        <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:24,
          color:S.text, fontStyle:'italic', marginTop:2 }}>Linen Theory</div>
        <div style={{ fontSize:11, color:S.textLt, marginTop:4 }}>
          Welcome back ✦ {new Date().toLocaleDateString('th-TH', { day:'numeric', month:'long', year:'numeric' })}
        </div>
      </div>

      {/* Stat grid 2x2 */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
        <Stat label="ยอดขายวันนี้" value={retailRevenue > 0 ? `฿${Math.round(retailRevenue).toLocaleString()}` : '—'}
          sub={`${retailSold} ขวดขายแล้ว`} color={S.green}/>
        <Stat label="In-house Stock" value={totalRemaining}
          sub="คงเหลือจากผลิตเอง" color={totalRemaining <= 5 ? S.amber : S.text}/>
        <Stat label="Retail Profit" value={retailProfit > 0 ? `฿${Math.round(retailProfit).toLocaleString()}` : '—'}
          sub="ราคาขาย − ต้นทุน" color={S.green}/>
        <Stat label="Total Produced" value={totalProduced + retailSold > 0 ? totalProduced : '—'}
          sub={`ผลิตแล้ว ${totalSold} ขวด`}/>
      </div>

      {/* Quick actions icon grid */}
      <div style={{ background:S.white, border:`1px solid ${S.border}`,
        borderRadius:12, padding:'14px', marginBottom:16 }}>
        <div style={{ fontSize:11, fontWeight:700, color:S.gold,
          textTransform:'uppercase', letterSpacing:.8, marginBottom:10 }}>
          เมนูด่วน
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:6 }}>
          {[
            { icon:'📊', label:'Report',     onClick: handleSendReport, busy: sending },
            { icon:'🧾', label:'ค่าใช้จ่าย', onClick: () => onNavigate && onNavigate('expenses') },
            { icon:'⚗️', label:'Formula',    onClick: () => onNavigate && onNavigate('formulas') },
            { icon:'⬇️', label:'Export',     onClick: () => onNavigate && onNavigate('export') },
            { icon:'📦', label:'Lot',        onClick: () => onNavigate && onNavigate('lot') },
          ].map((a, i) => (
            <button key={i} onClick={a.onClick} disabled={a.busy}
              style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5,
                padding:'8px 2px', borderRadius:10, border:'none', cursor: a.busy ? 'default' : 'pointer',
                background:S.goldLt, opacity: a.busy ? 0.6 : 1 }}>
              <span style={{ fontSize:18 }}>{a.icon}</span>
              <span style={{ fontSize:9.5, color:S.textMid, textAlign:'center', lineHeight:1.2,
                fontFamily:'Inter,sans-serif' }}>
                {a.busy ? '...' : a.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {isEmpty ? (
        <div style={{ textAlign:'center', padding:'60px 0' }}>
          <div style={{ fontSize:32, marginBottom:12 }}>◈</div>
          <div style={{ fontSize:14, color:S.textMid, marginBottom:6 }}>No data yet</div>
          <div style={{ fontSize:12, color:S.textLt }}>Start by adding Production or Retail Stock</div>
        </div>
      ) : (
        <>
          {/* ── Alert ── */}
          {alerts.length > 0 && (
            <div style={{ background:S.amberBg, border:`1px solid #e8c870`,
              borderRadius:12, padding:'12px 16px', marginBottom:20 }}>
              <button onClick={() => setAlertsOpen(o => !o)}
                style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between',
                  background:'none', border:'none', cursor:'pointer', padding:0,
                  marginBottom: alertsOpen ? 8 : 0 }}>
                <span style={{ fontSize:11, fontWeight:700, color:S.amber,
                  textTransform:'uppercase', letterSpacing:.8 }}>
                  ⚠ Needs attention · {alerts.length} items
                </span>
                <span style={{ fontSize:12, color:S.amber, transform: alertsOpen ? 'rotate(180deg)' : 'none',
                  transition:'transform .2s' }}>▾</span>
              </button>
              {alertsOpen && alerts.map((a,i) => (
                <AlertRow key={i} {...a}/>
              ))}
            </div>
          )}

          {/* ── Monthly chart ── */}
          {monthly.length > 0 && (
            <div style={{ background:S.white, border:`1px solid ${S.border}`,
              borderRadius:12, padding:'16px', marginBottom:20 }}>
              <div style={{ fontSize:11, fontWeight:700, color:S.gold,
                textTransform:'uppercase', letterSpacing:.8, marginBottom:14 }}>
                Production vs Sales (Monthly)
              </div>
              <BarChart data={monthly.slice(-6)}/>
            </div>
          )}

          {/* ── Top sellers ── */}
          {allItems.length > 0 && (
            <div style={{ background:S.white, border:`1px solid ${S.border}`,
              borderRadius:12, padding:'16px', marginBottom:20 }}>
              <div style={{ fontSize:11, fontWeight:700, color:S.gold,
                textTransform:'uppercase', letterSpacing:.8, marginBottom:4 }}>
                Top Sellers
              </div>
              {allItems.map((item, i) => (
                <TopRow key={i} rank={i+1} {...item}/>
              ))}
            </div>
          )}

          {/* ── Per-formula table ── */}
          {prodSum.length > 0 && (
            <div style={{ background:S.white, border:`1px solid ${S.border}`,
              borderRadius:12, padding:'16px', marginBottom:20 }}>
              <div style={{ fontSize:11, fontWeight:700, color:S.gold,
                textTransform:'uppercase', letterSpacing:.8, marginBottom:12 }}>
                In-house Stock by Formula
              </div>
              {prodSum.map(f => (
                <div key={f.formula_id}
                  style={{ display:'flex', justifyContent:'space-between',
                    alignItems:'center', padding:'9px 0',
                    borderBottom:`1px solid ${S.border}` }}>
                  <div style={{ fontSize:13, fontFamily:'Cormorant Garamond,serif',
                    color:S.text }}>{f.name}</div>
                  <div style={{ display:'flex', gap:16, fontSize:12 }}>
                    <span style={{ color:S.textMid }}>Produced <b style={{ color:S.text }}>{f.produced}</b></span>
                    <span style={{ color:S.textMid }}>Sold <b style={{ color:S.gold }}>{f.sold}</b></span>
                    <span style={{ color:S.textMid }}>Remaining <b style={{
                      color: f.remaining <= 3 ? S.red : f.remaining <= 8 ? S.amber : S.green
                    }}>{f.remaining}</b></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Top Favorites ── */}
      {retail.filter(r => r.is_favorite).length > 0 && (
        <div style={{ background:S.white, border:`1.5px solid #e8c0c0`,
          borderRadius:12, padding:'16px', marginBottom:20, marginTop:8 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#c06060',
            textTransform:'uppercase', letterSpacing:.8, marginBottom:12 }}>
            ❤️ Top Favorites
          </div>
          {retail.filter(r => r.is_favorite).map((r, i) => (
            <div key={r.id} style={{ display:'flex', justifyContent:'space-between',
              alignItems:'center', padding:'9px 0',
              borderBottom: i < retail.filter(x=>x.is_favorite).length - 1 ? `1px solid ${S.border}` : 'none' }}>
              <div>
                <div style={{ fontSize:13, fontFamily:'Cormorant Garamond,serif',
                  fontWeight:700, color:S.text }}>{r.name}</div>
                {r.brand && <div style={{ fontSize:11, color:S.textLt }}>{r.brand}</div>}
              </div>
              <div style={{ display:'flex', gap:12, fontSize:11, textAlign:'right' }}>
                <div>
                  <div style={{ color:S.textLt }}>ขายไป</div>
                  <div style={{ fontWeight:700, color:S.gold }}>{r.qty_sold} ขวด</div>
                </div>
                <div>
                  <div style={{ color:S.textLt }}>คงเหลือ</div>
                  <div style={{ fontWeight:700, color: r.remaining <= r.alert_at ? '#c06060' : S.green }}>
                    {r.remaining} ขวด
                  </div>
                </div>
                {r.price_per_unit && (
                  <div>
                    <div style={{ color:S.textLt }}>ราคา</div>
                    <div style={{ fontWeight:700, color:S.textMid }}>฿{r.price_per_unit}</div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Fragrance Trends ── */}
      <div style={{ marginTop:24 }}>
        {/* Header + refresh button */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:S.gold,
              textTransform:'uppercase', letterSpacing:.8 }}>✦ Fragrance Trends</div>
            <div style={{ fontSize:10, color:S.textLt, marginTop:2 }}>กดเพื่ออัพเดท trend ล่าสุด</div>
          </div>
          <button onClick={handleFetchTrends} disabled={fetching}
            style={{ padding:'8px 14px', borderRadius:20, border:`1.5px solid ${S.gold}`,
              background: fetching ? S.bg : S.goldLt, cursor: fetching ? 'default' : 'pointer',
              fontSize:11, fontWeight:600, color:S.gold, fontFamily:'Inter,sans-serif' }}>
            {fetching ? 'กำลังดึง…' : '↻ Refresh Trends'}
          </button>
        </div>

        {/* Saved trends first */}
        {trends.filter(t => t.is_saved).length > 0 && (
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:10, color:S.gold, fontWeight:600,
              textTransform:'uppercase', letterSpacing:.5, marginBottom:6 }}>
              🔖 บันทึกไว้
            </div>
            {trends.filter(t => t.is_saved).map(t => (
              <TrendCard key={t.id} trend={t}
                onToggleSaved={() => handleToggleSaved(t.id, !t.is_saved)}
                onToggleDone={() => handleToggleDone(t.id, !t.is_done)}
                onNote={note => handleNote(t.id, note)}/>
            ))}
          </div>
        )}

        {/* All trends */}
        {trends.filter(t => !t.is_saved).length > 0 && (
          <div>
            {trends.filter(t => !t.is_saved).slice(0, 10).map(t => (
              <TrendCard key={t.id} trend={t}
                onToggleSaved={() => handleToggleSaved(t.id, !t.is_saved)}
                onToggleDone={() => handleToggleDone(t.id, !t.is_done)}
                onNote={note => handleNote(t.id, note)}/>
            ))}
          </div>
        )}

        {trends.length === 0 && !fetching && (
          <div style={{ textAlign:'center', padding:'24px 0', color:S.textLt, fontSize:13 }}>
            กด Refresh Trends เพื่อดึง trend ล่าสุดค่ะ
          </div>
        )}
      </div>
    </div>
  )
}
