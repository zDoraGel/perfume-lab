import { useState, useEffect } from 'react'
import { db } from '../lib/db'
import { S } from '../constants/theme'

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

// ── Main ──────────────────────────────────────────────────────────────────────
export default function PageDashboard() {
  const [loading,    setLoading]    = useState(true)
  const [prodSum,    setProdSum]    = useState([])   // per-formula summary
  const [monthly,    setMonthly]    = useState([])   // monthly series
  const [retail,     setRetail]     = useState([])   // retail stock

  useEffect(() => {
    Promise.all([
      db.getProductionSummary(),
      db.getMonthlySeries(),
      db.getRetailStockSummary().catch(() => []),  // table อาจยังไม่มี
    ]).then(([ps, ms, rs]) => {
      setProdSum(ps)
      setMonthly(ms)
      setRetail(rs)
      setLoading(false)
    })
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
      <div style={{ marginBottom:20 }}>
        <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:22,
          color:S.gold, fontStyle:'italic', marginBottom:2 }}>Dashboard</div>
        <div style={{ fontSize:11, color:S.textLt, textTransform:'uppercase', letterSpacing:1 }}>
          Business Overview
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
          {/* ── Stats grid ── */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20 }}>
            <Stat label="Total Produced" value={totalProduced + retailSold > 0 ? totalProduced : '—'}
              sub={`ผลิตแล้ว ${totalSold} ขวด`} />
            <Stat label="In-house Stock" value={totalRemaining}
              sub="คงเหลือจากผลิตเอง" color={totalRemaining <= 5 ? S.amber : S.text}/>
            <Stat label="Retail Sold" value={retailSold}
              sub={retailRevenue > 0 ? `รายได้ ฿${retailRevenue.toLocaleString()}` : 'ยังไม่มีข้อมูลราคา'}
              color={S.gold}/>
            <Stat label="Retail Profit" value={retailProfit > 0 ? `฿${Math.round(retailProfit).toLocaleString()}` : '—'}
              sub="ราคาขาย − ต้นทุน" color={S.green}/>
          </div>

          {/* ── Alert ── */}
          {alerts.length > 0 && (
            <div style={{ background:S.amberBg, border:`1px solid #e8c870`,
              borderRadius:12, padding:'12px 16px', marginBottom:20 }}>
              <div style={{ fontSize:11, fontWeight:700, color:S.amber,
                textTransform:'uppercase', letterSpacing:.8, marginBottom:8 }}>
                ⚠ Needs attention · {alerts.length} items
              </div>
              {alerts.map((a,i) => (
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
    </div>
  )
}
