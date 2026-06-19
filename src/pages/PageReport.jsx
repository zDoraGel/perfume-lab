import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { db } from '../lib/db'
import { S, FC } from '../constants/theme'

// ── helpers ───────────────────────────────────────────────────────────────────
function fmt(n)  { return n != null ? Number(n).toLocaleString() : '—' }
function fmtB(n) { return n != null ? `฿${Number(n).toLocaleString()}` : '—' }
function fmtD(d) { if (!d) return '—'; const dt = new Date(d); return `${dt.getDate()} ${['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'][dt.getMonth()]} ${dt.getFullYear()+543}` }

function Section({ title, color = S.gold, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color, letterSpacing: 1,
        textTransform: 'uppercase', borderBottom: `2px solid ${color}`,
        paddingBottom: 6, marginBottom: 14 }}>{title}</div>
      {children}
    </div>
  )
}

function Row({ label, value, sub, bold }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      padding: '7px 0', borderBottom: `1px solid ${S.border}` }}>
      <span style={{ fontSize: 13, color: S.textMid }}>{label}</span>
      <div style={{ textAlign: 'right' }}>
        <span style={{ fontSize: 13, fontWeight: bold ? 700 : 500, color: S.ink }}>{value}</span>
        {sub && <div style={{ fontSize: 11, color: S.textLt }}>{sub}</div>}
      </div>
    </div>
  )
}

function StatBox({ label, value, sub, color }) {
  return (
    <div style={{ background: S.white, border: `1px solid ${S.border}`, borderRadius: 10,
      padding: '12px 14px', textAlign: 'center' }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: color || S.gold, fontFamily: 'Inter,sans-serif' }}>{value}</div>
      <div style={{ fontSize: 11, color: S.textMid, marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: S.textLt, marginTop: 1 }}>{sub}</div>}
    </div>
  )
}

// ── Donut chart (SVG, no deps) — เหมือนกับใน PageDashboard.jsx ──────────────────
function DonutChart({ segments, centerLabel, centerValue, centerColor }) {
  const total = segments.reduce((s, x) => s + x.value, 0)
  if (total <= 0) return (
    <div style={{ textAlign:'center', padding:'24px 0', color:S.textLt, fontSize:12 }}>
      No data yet
    </div>
  )

  const R = 46, CX = 56, CY = 56, STROKE = 16
  const circumference = 2 * Math.PI * R
  let offset = 0

  return (
    <div style={{ display:'flex', alignItems:'center', gap:16 }}>
      <svg width={112} height={112} viewBox="0 0 112 112" style={{ flexShrink:0 }}>
        <circle cx={CX} cy={CY} r={R} fill="none" stroke={S.bg} strokeWidth={STROKE}/>
        {segments.map((seg, i) => {
          const frac = seg.value / total
          const len  = frac * circumference
          const dash = `${len} ${circumference - len}`
          const rotation = (offset / circumference) * 360 - 90
          offset += len
          return (
            <circle key={i} cx={CX} cy={CY} r={R} fill="none" stroke={seg.color}
              strokeWidth={STROKE} strokeDasharray={dash}
              transform={`rotate(${rotation} ${CX} ${CY})`}/>
          )
        })}
        <text x={CX} y={CY - 4} textAnchor="middle" fontSize={13} fontWeight="700" fill={centerColor || S.text}>
          {centerValue}
        </text>
        <text x={CX} y={CY + 10} textAnchor="middle" fontSize={8} fill={S.textLt}>
          {centerLabel}
        </text>
      </svg>
      <div style={{ flex:1, display:'flex', flexDirection:'column', gap:6 }}>
        {segments.map((seg, i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background:seg.color, flexShrink:0 }}/>
            <span style={{ fontSize:11, color:S.textMid, flex:1, minWidth:0, whiteSpace:'nowrap',
              overflow:'hidden', textOverflow:'ellipsis' }}>{seg.label}</span>
            <span style={{ fontSize:11, fontWeight:600, color:S.text, flexShrink:0 }}>
              {total > 0 ? Math.round((seg.value/total)*100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── main ──────────────────────────────────────────────────────────────────────
export default function PageReport() {
  const printRef = useRef(null)

  // date range
  const today = new Date()
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const [dateFrom, setDateFrom] = useState(firstOfMonth.toISOString().slice(0, 10))
  const [dateTo,   setDateTo]   = useState(today.toISOString().slice(0, 10))
  const [preset,   setPreset]   = useState('month')

  // data
  const [loading,   setLoading]   = useState(false)
  const [report,    setReport]    = useState(null)
  const [activeSection, setActiveSection] = useState('all')

  function applyPreset(p) {
    const now = new Date()
    setPreset(p)
    if (p === 'month') {
      setDateFrom(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10))
      setDateTo(now.toISOString().slice(0, 10))
    } else if (p === 'last3') {
      const d = new Date(now); d.setMonth(d.getMonth() - 3)
      setDateFrom(d.toISOString().slice(0, 10))
      setDateTo(now.toISOString().slice(0, 10))
    } else if (p === 'year') {
      setDateFrom(new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10))
      setDateTo(now.toISOString().slice(0, 10))
    } else if (p === 'all') {
      setDateFrom('2020-01-01')
      setDateTo(now.toISOString().slice(0, 10))
    }
  }

  async function loadReport() {
    setLoading(true)
    try {
      const from = dateFrom
      const to   = dateTo + 'T23:59:59'

      // 1. Personal formulas + versions
      const { data: formulas } = await supabase
        .from('formulas')
        .select('id, name, vibe, created_at')
        .order('created_at', { ascending: false })

      const { data: versions } = await supabase
        .from('formula_versions')
        .select('id, formula_id, version, status, rating, blend_date, batch_ml')
        .gte('blend_date', from).lte('blend_date', to)
        .order('blend_date', { ascending: false })

      // formula map
      const fMap = {}
      ;(formulas || []).forEach(f => { fMap[f.id] = f })

      // group versions by formula
      const fVersions = {}
      ;(versions || []).forEach(v => {
        if (!fVersions[v.formula_id]) fVersions[v.formula_id] = []
        fVersions[v.formula_id].push(v)
      })

      // 2. Production batches
      const { data: batches } = await supabase
        .from('production_batches')
        .select('id, formula_id, qty_produced, qty_sold, produced_at, bottle_ml, concentration')
        .gte('produced_at', from).lte('produced_at', to)
        .order('produced_at', { ascending: false })

      // batch summary per formula
      const batchByFormula = {}
      let totalProduced = 0, totalSold = 0
      ;(batches || []).forEach(b => {
        if (!batchByFormula[b.formula_id]) batchByFormula[b.formula_id] = { produced: 0, sold: 0, batches: [] }
        batchByFormula[b.formula_id].produced += b.qty_produced || 0
        batchByFormula[b.formula_id].sold     += b.qty_sold || 0
        batchByFormula[b.formula_id].batches.push(b)
        totalProduced += b.qty_produced || 0
        totalSold     += b.qty_sold || 0
      })

      // 3. My Blends (accords)
      const { data: accords } = await supabase
        .from('accords')
        .select('id, name, category, vibe, created_at')
        .order('created_at', { ascending: false })

      const { data: accordVersions } = await supabase
        .from('accord_versions')
        .select('id, accord_id, version, notes, created_at')
        .gte('created_at', from).lte('created_at', to)

      // 4. Retail stock
      const { data: retail } = await supabase
        .from('retail_stock')
        .select('id, name, brand, qty_total, qty_sold, cost_per_unit, price_per_unit, is_favorite, is_recommended')
        .order('qty_sold', { ascending: false })

      const { data: retailLogs } = await supabase
        .from('retail_stock_logs')
        .select('id, stock_id, type, qty, cost_price, sell_price, created_at')
        .gte('created_at', from).lte('created_at', to)
        .order('created_at', { ascending: false })

      // retail summary
      let retailRevenue = 0, retailCost = 0, retailQtySold = 0
      const retailLogsByStock = {}
      ;(retailLogs || []).forEach(l => {
        if (l.type === 'out') {
          retailRevenue  += (l.sell_price || 0) * l.qty
          retailCost     += (l.cost_price || 0) * l.qty
          retailQtySold  += l.qty
        }
        if (!retailLogsByStock[l.stock_id]) retailLogsByStock[l.stock_id] = []
        retailLogsByStock[l.stock_id].push(l)
      })
      const retailProfit = retailRevenue - retailCost

      // fallback ถ้าไม่มี log cost/sell ใช้ค่าจาก stock record
      const retailRevenueAlt = (retail || []).reduce((s, r) => s + (r.price_per_unit || 0) * r.qty_sold, 0)
      const retailCostAlt    = (retail || []).reduce((s, r) => s + (r.cost_per_unit  || 0) * r.qty_sold, 0)

      // 5. Materials usage
      const { data: items, error: itemsError } = await supabase
        .from('formula_items')
        .select('version_id, material_id, grams, material:materials(id, name, family, cost)')
        .in('version_id', (versions || []).map(v => v.id))
      if (itemsError) console.error('formula_items query error:', itemsError)

      const matUsage = {}
      ;(items || []).forEach(i => {
        const id = i.material_id
        if (!matUsage[id]) matUsage[id] = { name: i.material?.name || '?', family: i.material?.family || '', cost: i.material?.cost, grams: 0, count: 0 }
        matUsage[id].grams += parseFloat(i.grams || 0)
        matUsage[id].count += 1
      })
      const topMaterials = Object.values(matUsage).sort((a, b) => b.grams - a.grams).slice(0, 10)

      // ── Cost Overview (COGS จริงตามปริมาณที่ผลิต ไม่ใช่แค่สูตรที่ blend ทดลอง) ──
      // เตรียม lookup: version_id -> { totalGrams, totalCost, family -> cost }
      const versionCostMap = {}
      ;(items || []).forEach(i => {
        const vId = i.version_id
        if (!versionCostMap[vId]) versionCostMap[vId] = { totalGrams: 0, totalCost: 0, byFamily: {} }
        const grams = parseFloat(i.grams || 0)
        const cost  = i.material?.cost != null ? grams * parseFloat(i.material.cost) : 0
        const fam   = i.material?.family || 'Others'
        versionCostMap[vId].totalGrams += grams
        versionCostMap[vId].totalCost  += cost
        versionCostMap[vId].byFamily[fam] = (versionCostMap[vId].byFamily[fam] || 0) + cost
      })
      // batch_ml ของแต่ละ version (default 15ml เหมือนที่ใช้ทั่วระบบ)
      const versionBatchMl = {}
      ;(versions || []).forEach(v => { versionBatchMl[v.id] = v.batch_ml || 15 })

      // เดินตาม batches จริงที่ผลิต → หา version ล่าสุดของสูตรนั้นที่อยู่ในช่วงเวลานี้ → คิดต้นทุนตาม ml ที่ผลิตจริง
      let totalCOGS = 0
      const familyCOGS = {}
      ;(batches || []).forEach(b => {
        const vList = fVersions[b.formula_id] || []
        if (!vList.length) return
        const latestV = vList[vList.length - 1]
        const vCost   = versionCostMap[latestV.id]
        if (!vCost || !vCost.totalGrams) return
        const batchMl   = versionBatchMl[latestV.id]
        const costPerMl = vCost.totalCost / batchMl
        const producedMl = (b.bottle_ml || 0) * (b.qty_produced || 0)
        const batchCOGS  = costPerMl * producedMl
        totalCOGS += batchCOGS
        // แบ่ง COGS ของ batch นี้ตามสัดส่วน family เดิมของสูตร
        Object.entries(vCost.byFamily).forEach(([fam, famCost]) => {
          const famShare = vCost.totalCost > 0 ? famCost / vCost.totalCost : 0
          familyCOGS[fam] = (familyCOGS[fam] || 0) + batchCOGS * famShare
        })
      })
      const totalProducedMl = (batches || [])
        .reduce((s, b) => s + (b.bottle_ml || 0) * (b.qty_produced || 0), 0)
      const avgCostPerMl = totalProducedMl > 0 ? totalCOGS / totalProducedMl : 0

      const familyCostBreakdown = Object.entries(familyCOGS)
        .map(([family, cost]) => ({
          family,
          cost,
          pct: totalCOGS > 0 ? (cost / totalCOGS) * 100 : 0,
        }))
        .sort((a, b) => b.cost - a.cost)

      // 6. Saved trends
      const { data: trends } = await supabase
        .from('trend_items')
        .select('id, title, description, keywords, fetched_at, is_saved')
        .eq('is_saved', true)
        .order('fetched_at', { ascending: false })

      // 7. Revenue breakdown — Retail (เดือนนี้) + My Blends (สะสมทั้งหมด)
      const revenueBreakdown = await db.getRevenueBreakdown().catch(() => null)

      setReport({
        dateFrom, dateTo,
        // personal
        formulas: formulas || [],
        versions: versions || [],
        fVersions,
        fMap,
        totalVersions: (versions || []).length,
        successVersions: (versions || []).filter(v => v.status === 'Success').length,
        // production
        batches: batches || [],
        batchByFormula,
        totalProduced,
        totalSold,
        // blends
        accords: accords || [],
        accordVersions: accordVersions || [],
        // retail
        retail: retail || [],
        retailLogs: retailLogs || [],
        retailLogsByStock,
        retailRevenue: retailRevenue || retailRevenueAlt,
        retailCost:    retailCost    || retailCostAlt,
        retailProfit:  retailProfit  || (retailRevenueAlt - retailCostAlt),
        retailQtySold: retailQtySold || (retail || []).reduce((s, r) => s + r.qty_sold, 0),
        // materials
        topMaterials,
        // cost overview
        totalCOGS,
        avgCostPerMl,
        familyCostBreakdown,
        // revenue breakdown (retail + my blends)
        revenueBreakdown,
        // trends
        trends: trends || [],
      })
    } catch(e) {
      console.error(e)
    }
    setLoading(false)
  }

  useEffect(() => { loadReport() }, [])

  function handlePrint() {
    window.print()
  }

  async function handleExportPDF() {
    // ใช้ browser print เป็น PDF
    window.print()
  }

  async function handleExportExcel() {
    if (!report) return
    // build CSV แทน Excel สำหรับ quick export
    const rows = []
    rows.push(['LINEN THEORY — Report', '', fmtD(report.dateFrom), '—', fmtD(report.dateTo)])
    rows.push([])
    rows.push(['=== PERSONAL FORMULAS ==='])
    rows.push(['ชื่อสูตร', 'Vibe', 'Versions', 'Success', 'ผลิต (ขวด)', 'ขาย (ขวด)'])
    report.formulas.forEach(f => {
      const vs = report.fVersions[f.id] || []
      const b  = report.batchByFormula[f.id] || { produced: 0, sold: 0 }
      rows.push([f.name, f.vibe || '', vs.length, vs.filter(v => v.status === 'Success').length, b.produced, b.sold])
    })
    rows.push([])
    rows.push(['=== MY BLENDS / ACCORDS ==='])
    rows.push(['ชื่อ Accord', 'Category', 'Versions'])
    report.accords.forEach(a => {
      const vs = report.accordVersions.filter(v => v.accord_id === a.id)
      rows.push([a.name, a.category || '', vs.length])
    })
    rows.push([])
    rows.push(['=== RETAIL STOCK ==='])
    rows.push(['ชื่อ', 'แบรนด์', 'ขาย (ขวด)', 'ต้นทุน/ขวด', 'ราคาขาย/ขวด', 'กำไรสะสม'])
    report.retail.forEach(r => {
      const profit = r.price_per_unit && r.cost_per_unit ? (r.price_per_unit - r.cost_per_unit) * r.qty_sold : ''
      rows.push([r.name, r.brand || '', r.qty_sold, r.cost_per_unit || '', r.price_per_unit || '', profit])
    })
    rows.push([])
    rows.push(['=== TOP MATERIALS ==='])
    rows.push(['วัตถุดิบ', 'Family', 'ใช้ไป (g)', 'ใช้ใน (สูตร)'])
    report.topMaterials.forEach(m => {
      rows.push([m.name, m.family, m.grams.toFixed(2), m.count])
    })

    const csv = rows.map(r => r.map(c => `"${String(c || '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const bom  = '\uFEFF'
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href     = URL.createObjectURL(blob)
    link.download = `linen_theory_report_${dateFrom}_${dateTo}.csv`
    link.click()
  }

  const iStyle = {
    padding: '8px 10px', borderRadius: 8, border: `1px solid ${S.border}`,
    fontSize: 13, color: S.ink, background: S.white, outline: 'none',
  }

  return (
    <div>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .print-area { padding: 0 !important; }
        }
      `}</style>

      {/* Header */}
      <div className="no-print" style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: 28,
          color: S.ink, fontStyle: 'italic', marginBottom: 4 }}>Report</div>
        <div style={{ fontSize: 13, color: S.textLt }}>สรุปภาพรวม Linen Theory</div>
      </div>

      {/* Date range picker */}
      <div className="no-print" style={{ background: S.white, border: `1px solid ${S.border}`,
        borderRadius: 12, padding: 16, marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: S.textMid,
          textTransform: 'uppercase', letterSpacing: .8, marginBottom: 10 }}>ช่วงเวลา</div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {[
            { v: 'month',  l: 'เดือนนี้' },
            { v: 'last3',  l: '3 เดือน' },
            { v: 'year',   l: 'ปีนี้' },
            { v: 'all',    l: 'ทั้งหมด' },
            { v: 'custom', l: 'กำหนดเอง' },
          ].map(p => (
            <button key={p.v} onClick={() => applyPreset(p.v)}
              style={{ padding: '5px 14px', borderRadius: 20, cursor: 'pointer',
                fontSize: 12, fontFamily: 'Inter,sans-serif',
                border: `1.5px solid ${preset === p.v ? S.gold : S.border}`,
                background: preset === p.v ? S.goldLt : 'transparent',
                color: preset === p.v ? S.gold : S.textMid,
                fontWeight: preset === p.v ? 600 : 400 }}>{p.l}</button>
          ))}
        </div>

        {preset === 'custom' && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={iStyle}/>
            <span style={{ color: S.textLt }}>—</span>
            <input type="date" value={dateTo}   onChange={e => setDateTo(e.target.value)}   style={iStyle}/>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={loadReport} disabled={loading}
            style={{ flex: 1, padding: '10px 0', borderRadius: 10, cursor: 'pointer',
              border: 'none', background: S.gold, color: '#fff',
              fontFamily: 'Inter,sans-serif', fontSize: 13, fontWeight: 600,
              opacity: loading ? 0.6 : 1 }}>
            {loading ? 'กำลังโหลด...' : '↻ Generate Report'}
          </button>
          {report && (<>
            <button onClick={handlePrint}
              style={{ padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                border: `1px solid ${S.border}`, background: S.white,
                fontSize: 13, color: S.textMid }}>🖨 Print / PDF</button>
            <button onClick={handleExportExcel}
              style={{ padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                border: `1px solid ${S.border}`, background: S.white,
                fontSize: 13, color: S.textMid }}>📊 CSV</button>
          </>)}
        </div>
      </div>

      {/* ── Section filter tabs ── */}
      {report && (
        <div className="no-print" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          {[
            { v: 'all',       l: 'ทั้งหมด',        icon: '◈' },
            { v: 'personal',  l: 'Personal',       icon: '✦' },
            { v: 'blends',    l: 'My Blends',      icon: '◎' },
            { v: 'retail',    l: 'Retail',         icon: '⬘' },
            { v: 'materials', l: 'Materials',      icon: '⬡' },
            { v: 'trends',    l: 'Trends',         icon: '◇' },
          ].map(s => (
            <button key={s.v} onClick={() => setActiveSection(s.v)}
              style={{ padding: '7px 16px', borderRadius: 20, cursor: 'pointer',
                fontSize: 12, fontFamily: 'Inter,sans-serif',
                border: `1.5px solid ${activeSection === s.v ? S.gold : S.border}`,
                background: activeSection === s.v ? S.gold : S.white,
                color: activeSection === s.v ? '#fff' : S.textMid,
                fontWeight: activeSection === s.v ? 600 : 400 }}>
              {s.icon} {s.l}
            </button>
          ))}
        </div>
      )}

      {/* ── Report content ── */}
      {report && (
        <div ref={printRef} className="print-area">

          {/* Print header */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: 26,
              color: S.ink, fontStyle: 'italic' }}>Linen Theory</div>
            <div style={{ fontSize: 12, color: S.textMid, marginTop: 2 }}>
              Report · {fmtD(report.dateFrom)} — {fmtD(report.dateTo)}
            </div>
          </div>

          {/* ── Summary boxes ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 24 }}>
            <StatBox label="สูตรทั้งหมด"   value={report.formulas.length}      color={S.gold}/>
            <StatBox label="Blend ใหม่"     value={report.versions.length}      sub={`Success ${report.successVersions}`} color={S.green}/>
            <StatBox label="ผลิตรวม"        value={`${report.totalProduced} ขวด`} color={S.gold}/>
            <StatBox label="Retail Revenue" value={fmtB(report.retailRevenue)}  sub={`กำไร ${fmtB(report.retailProfit)}`} color={report.retailProfit > 0 ? S.green : S.red}/>
          </div>

          {/* ── Section 1: Personal Formulas ── */}
          {(activeSection === 'all' || activeSection === 'personal') && (
          <Section title="✦ Personal Formulas — น้ำหอมของเราเอง" color={S.gold}>
            {report.formulas.length === 0 ? (
              <div style={{ color: S.textLt, fontSize: 13 }}>ไม่มีข้อมูล</div>
            ) : (
              <div>
                {/* Summary */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
                  <StatBox label="สูตรทั้งหมด" value={report.formulas.length} color={S.gold}/>
                  <StatBox label="Blend ในช่วงนี้" value={report.versions.length} color={S.gold}/>
                  <StatBox label="Success rate" value={report.versions.length > 0 ? `${Math.round(report.successVersions/report.versions.length*100)}%` : '—'} color={S.green}/>
                </div>

                {/* Formula list */}
                {report.formulas.map(f => {
                  const vs = report.fVersions[f.id] || []
                  const b  = report.batchByFormula[f.id] || { produced: 0, sold: 0 }
                  if (vs.length === 0 && b.produced === 0) return null
                  return (
                    <div key={f.id} style={{ background: S.white, border: `1px solid ${S.border}`,
                      borderRadius: 10, padding: '12px 14px', marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'Cormorant Garamond,serif',
                            color: S.ink }}>{f.name}</div>
                          {f.vibe && <div style={{ fontSize: 11, color: S.textLt, marginTop: 2 }}>{f.vibe}</div>}
                        </div>
                        <div style={{ display: 'flex', gap: 8, fontSize: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ color: S.textMid }}>Blend <b>{vs.length}</b></span>
                          <span style={{ color: S.green }}>✓ {vs.filter(v => v.status === 'Success').length}</span>
                          {b.produced > 0 && (
                            <span style={{ color: S.gold, background: S.goldLt, padding: '3px 9px',
                              borderRadius: 20, fontWeight: 600, whiteSpace: 'nowrap' }}>
                              📦 ผลิตแล้ว {b.produced} ขวด
                            </span>
                          )}
                        </div>
                      </div>
                      {vs.length === 0 && b.produced > 0 && (
                        <div style={{ fontSize: 11, color: S.textLt, marginTop: 6, fontStyle: 'italic' }}>
                          * ไม่มี blend สูตรใหม่ในช่วงนี้ — ใช้สูตรที่มีอยู่แล้วผลิตขายต่อ
                        </div>
                      )}
                      {vs.length > 0 && (
                        <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {vs.map(v => (
                            <span key={v.id} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20,
                              background: v.status === 'Success' ? S.greenBg : v.status === 'Failed' ? S.redBg : S.border,
                              color: v.status === 'Success' ? S.green : v.status === 'Failed' ? S.red : S.textMid }}>
                              V{v.version} {v.status} {v.rating ? `★${v.rating}` : ''}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                }).filter(Boolean)}

                {/* Versions ที่ยังไม่ assign formula (ทำใหม่) */}
                {report.versions.filter(v => !report.fVersions[v.formula_id]?.length).length === 0 && report.versions.length > 0 && (
                  <div style={{ fontSize: 11, color: S.textLt, textAlign: 'center', marginTop: 8 }}>
                    Blend ทั้งหมด {report.versions.length} ครั้ง ใน {Object.keys(report.fVersions).length} สูตร
                  </div>
                )}
              </div>
            )}
          </Section>
          )}

          {/* ── Section 2: My Blends / Accords ── */}
          {(activeSection === 'all' || activeSection === 'blends') && (
          <Section title="◎ My Blends — Accords & Experiments" color="#8a3a68">
            {report.accords.length === 0 ? (
              <div style={{ color: S.textLt, fontSize: 13 }}>ไม่มีข้อมูล</div>
            ) : (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                  <StatBox label="Accords ทั้งหมด" value={report.accords.length} color="#8a3a68"/>
                  <StatBox label="Versions ในช่วงนี้" value={report.accordVersions.length} color="#8a3a68"/>
                </div>

                {/* Group by category */}
                {(() => {
                  const cats = {}
                  report.accords.forEach(a => {
                    const c = a.category || 'Other'
                    if (!cats[c]) cats[c] = []
                    cats[c].push(a)
                  })
                  return Object.entries(cats).map(([cat, list]) => (
                    <div key={cat} style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, color: S.textMid, fontWeight: 600,
                        textTransform: 'uppercase', letterSpacing: .5, marginBottom: 6 }}>{cat}</div>
                      {list.map(a => {
                        const vs = report.accordVersions.filter(v => v.accord_id === a.id)
                        return (
                          <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between',
                            padding: '7px 0', borderBottom: `1px solid ${S.border}` }}>
                            <div>
                              <span style={{ fontSize: 13, color: S.ink, fontFamily: 'Cormorant Garamond,serif',
                                fontWeight: 600 }}>{a.name}</span>
                              {a.vibe && <span style={{ fontSize: 11, color: S.textLt, marginLeft: 8 }}>{a.vibe}</span>}
                            </div>
                            <span style={{ fontSize: 12, color: S.textMid }}>{vs.length} versions</span>
                          </div>
                        )
                      })}
                    </div>
                  ))
                })()}
              </div>
            )}
          </Section>
          )}

          {/* ── Section 3: Retail ── */}
          {(activeSection === 'all' || activeSection === 'retail') && (
          <Section title="⬘ Retail — ยอดขาย" color={S.green}>
            {report.retail.length === 0 ? (
              <div style={{ color: S.textLt, fontSize: 13 }}>ไม่มีข้อมูล</div>
            ) : (
              <div>
                {/* Summary */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 14 }}>
                  <StatBox label="รายการ"      value={report.retail.length}                    color={S.green}/>
                  <StatBox label="ขายรวม"      value={`${report.retailQtySold} ขวด`}            color={S.green}/>
                  <StatBox label="รายได้"       value={fmtB(Math.round(report.retailRevenue))}  color={S.green}/>
                  <StatBox label="กำไรสุทธิ"   value={fmtB(Math.round(report.retailProfit))}   color={report.retailProfit >= 0 ? S.green : S.red}/>
                </div>

                {/* Retail list */}
                <div style={{ background: S.white, border: `1px solid ${S.border}`, borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto auto',
                    gap: 8, padding: '8px 14px', background: S.bg,
                    fontSize: 10, fontWeight: 700, color: S.textMid, textTransform: 'uppercase', letterSpacing: .5 }}>
                    <span>ชื่อ</span>
                    <span style={{ textAlign: 'right' }}>ขายไป</span>
                    <span style={{ textAlign: 'right' }}>คงเหลือ</span>
                    <span style={{ textAlign: 'right' }}>ราคา</span>
                    <span style={{ textAlign: 'right' }}>กำไรสะสม</span>
                  </div>
                  {report.retail.map((r, i) => {
                    const remaining = r.qty_total - r.qty_sold
                    const profit    = r.price_per_unit && r.cost_per_unit
                      ? (r.price_per_unit - r.cost_per_unit) * r.qty_sold : null
                    return (
                      <div key={r.id} style={{ display: 'grid',
                        gridTemplateColumns: '1fr auto auto auto auto',
                        gap: 8, padding: '10px 14px',
                        borderTop: i > 0 ? `1px solid ${S.border}` : 'none',
                        background: r.is_favorite ? '#fff8f8' : S.white }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'Cormorant Garamond,serif',
                            color: S.ink, display: 'flex', alignItems: 'center', gap: 4 }}>
                            {r.is_favorite && '❤️ '}{r.name}
                          </div>
                          {r.brand && <div style={{ fontSize: 11, color: S.textLt }}>{r.brand}</div>}
                        </div>
                        <span style={{ fontSize: 13, color: S.gold, fontWeight: 700, textAlign: 'right' }}>{r.qty_sold}</span>
                        <span style={{ fontSize: 13, color: remaining <= 0 ? S.red : S.textMid, textAlign: 'right' }}>{remaining}</span>
                        <span style={{ fontSize: 12, color: S.textMid, textAlign: 'right' }}>{r.price_per_unit ? `฿${r.price_per_unit}` : '—'}</span>
                        <span style={{ fontSize: 12, color: profit > 0 ? S.green : S.textLt, textAlign: 'right', fontWeight: profit > 0 ? 600 : 400 }}>
                          {profit != null ? fmtB(Math.round(profit)) : '—'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </Section>
          )}

          {/* ── Cost Overview ── */}
          {(activeSection === 'all' || activeSection === 'materials') && (
          <Section title="◐ Cost Overview" color={S.gold}>
            {report.totalCOGS === 0 ? (
              <div style={{ color: S.textLt, fontSize: 13 }}>ไม่มีข้อมูล (ต้องมีการผลิตในช่วงนี้)</div>
            ) : (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, marginBottom: 16 }}>
                  <StatBox label="Total COGS"   value={fmtB(Math.round(report.totalCOGS))} color={S.gold}/>
                  <StatBox label="Avg Cost / ml" value={`฿${report.avgCostPerMl.toFixed(2)}`} color={S.gold}/>
                </div>
                {report.familyCostBreakdown.length > 0 && (
                  <DonutChart
                    segments={report.familyCostBreakdown.map(f => ({
                      value: f.cost,
                      label: f.family,
                      color: FC[f.family]?.c || S.textLt,
                    }))}
                    centerValue={fmtB(Math.round(report.totalCOGS))}
                    centerLabel="COGS"
                    centerColor={S.gold}
                  />
                )}
                <div style={{ fontSize: 10, color: S.textLt, marginTop: 10, lineHeight: 1.5 }}>
                  * คำนวณจากต้นทุนวัตถุดิบของสูตร (version ล่าสุด) × ปริมาณที่ผลิตจริงในช่วงนี้
                </div>
              </div>
            )}
          </Section>
          )}

          {/* ── Revenue Breakdown — Retail + My Blends ── */}
          {(activeSection === 'all' || activeSection === 'materials') && report.revenueBreakdown && report.revenueBreakdown.total > 0 && (
          <Section title="◐ ยอดรวมรายได้ — Retail + My Blends" color={S.gold}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, marginBottom: 16 }}>
              <StatBox label={report.revenueBreakdown.retail.label}
                value={fmtB(Math.round(report.revenueBreakdown.retail.revenue))} color={S.green}/>
              <StatBox label={report.revenueBreakdown.myBlends.label}
                value={fmtB(Math.round(report.revenueBreakdown.myBlends.revenue))} color="#8a3a68"/>
            </div>
            <DonutChart
              segments={[
                { value: report.revenueBreakdown.retail.revenue,   label: report.revenueBreakdown.retail.label,   color: S.green },
                { value: report.revenueBreakdown.myBlends.revenue, label: report.revenueBreakdown.myBlends.label,  color: '#8a3a68' },
              ]}
              centerValue={fmtB(Math.round(report.revenueBreakdown.total))}
              centerLabel="รายได้รวม"
            />

            {/* กำไรสุทธิหลังหักค่าใช้จ่ายแต่ละกลุ่ม */}
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${S.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                <span style={{ color: S.textMid }}>{report.revenueBreakdown.retail.label}</span>
                <span style={{ fontWeight: 600,
                  color: report.revenueBreakdown.retail.profit >= 0 ? S.green : S.red }}>
                  {fmtB(Math.round(report.revenueBreakdown.retail.profit))}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8 }}>
                <span style={{ color: S.textMid }}>{report.revenueBreakdown.myBlends.label}</span>
                <span style={{ fontWeight: 600,
                  color: report.revenueBreakdown.myBlends.profit >= 0 ? S.green : S.red }}>
                  {fmtB(Math.round(report.revenueBreakdown.myBlends.profit))}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700,
                paddingTop: 8, borderTop: `1px solid ${S.border}` }}>
                <span>กำไรสุทธิรวม (หักค่าใช้จ่ายแล้ว)</span>
                <span style={{ color: report.revenueBreakdown.totalProfit >= 0 ? S.green : S.red }}>
                  {fmtB(Math.round(report.revenueBreakdown.totalProfit))}
                </span>
              </div>
            </div>

            <div style={{ fontSize: 10, color: S.textLt, marginTop: 10, lineHeight: 1.5 }}>
              * My Blends เป็นยอดสะสมทั้งหมดตั้งแต่สร้าง (ไม่มีข้อมูลแยกเดือน) ส่วน Retail เป็นยอดเฉพาะช่วงเวลาที่เลือกด้านบน — เทียบกันตรงๆ ไม่ได้ 100%
            </div>
          </Section>
          )}

          {/* ── Top Materials ── */}
          {(activeSection === 'all' || activeSection === 'materials') && (
          <Section title="⬡ Top Materials Used" color={S.gold}>
            {report.topMaterials.length === 0 ? (
              <div style={{ color: S.textLt, fontSize: 13 }}>ไม่มีข้อมูล (ต้องมี blend ในช่วงนี้)</div>
            ) : (
              <div>
                {report.topMaterials.map((m, i) => (
                  <div key={m.name} style={{ display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', padding: '7px 0', borderBottom: `1px solid ${S.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 12, color: S.textLt, width: 20 }}>#{i+1}</span>
                      <div>
                        <div style={{ fontSize: 13, color: S.ink }}>{m.name}</div>
                        {m.family && <div style={{ fontSize: 11, color: S.textLt }}>{m.family}</div>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: S.gold }}>{m.grams.toFixed(1)}g</div>
                      <div style={{ fontSize: 11, color: S.textLt }}>ใน {m.count} สูตร</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
          )}

          {/* ── Saved Trends ── */}
          {(activeSection === 'all' || activeSection === 'trends') && report.trends.length > 0 && (
            <Section title="✦ Fragrance Trends — บันทึกไว้" color="#5a4a8a">
              {report.trends.map(t => (
                <div key={t.id} style={{ padding: '10px 0', borderBottom: `1px solid ${S.border}` }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: S.ink,
                    fontFamily: 'Cormorant Garamond,serif' }}>{t.title}</div>
                  {t.description && (
                    <div style={{ fontSize: 12, color: S.textMid, marginTop: 3 }}>{t.description}</div>
                  )}
                  {t.keywords?.length > 0 && (
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 5 }}>
                      {t.keywords.map(k => (
                        <span key={k} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20,
                          background: S.goldLt, color: S.gold }}>{k}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </Section>
          )}

          {/* Print footer */}
          <div style={{ textAlign: 'center', fontSize: 11, color: S.textLt, marginTop: 32,
            paddingTop: 16, borderTop: `1px solid ${S.border}` }}>
            Linen Theory · Generated {fmtD(new Date().toISOString())}
          </div>

        </div>
      )}

      {!report && !loading && (
        <div style={{ textAlign: 'center', padding: 40, color: S.textLt }}>
          กด Generate Report เพื่อดูข้อมูลค่ะ
        </div>
      )}
    </div>
  )
}
