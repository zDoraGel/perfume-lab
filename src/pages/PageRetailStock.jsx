import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// ── Design tokens (match app theme) ──────────────────────────────────────────
const S = {
  bg:      '#f8f6f2',
  white:   '#ffffff',
  border:  '#e8e4dc',
  text:    '#1a1814',
  textMid: '#6b6560',
  textLt:  '#b0aba4',
  gold:    '#8a6f3e',
  goldLt:  '#f0e8d8',
  goldBd:  '#d4b896',
  green:   '#3d6b4a',
  greenBg: '#eef5f0',
  red:     '#8b3a2e',
  redBg:   '#fdf0ee',
  amber:   '#7a5c20',
  amberBg: '#fdf5e6',
}

const inp = {
  width:'100%', padding:'10px 12px', borderRadius:8, border:`1px solid ${S.border}`,
  fontSize:14, fontFamily:'Inter,sans-serif', color:S.text,
  background:S.white, outline:'none', boxSizing:'border-box',
}
const label = { fontSize:11, color:S.textMid, fontWeight:500,
  textTransform:'uppercase', letterSpacing:.5, marginBottom:4, display:'block' }

// ── DB helpers ────────────────────────────────────────────────────────────────
async function fetchAll() {
  const { data } = await supabase
    .from('retail_stock')
    .select('*')
    .order('qty_sold', { ascending: false })
  return data || []
}

async function createStock(payload) {
  const { data, error } = await supabase.from('retail_stock').insert(payload).select().single()
  if (error) throw error
  return data
}

async function updateStock(id, payload) {
  const { data, error } = await supabase.from('retail_stock').update(payload).eq('id', id).select().single()
  if (error) throw error
  return data
}

async function deleteStock(id) {
  await supabase.from('retail_stock').delete().eq('id', id)
}

async function logTransaction(stock_id, type, qty, note, date) {
  const { error } = await supabase.from('retail_stock_logs').insert({ stock_id, type, qty, note, logged_at: date })
  if (error) throw error
}

async function fetchLogs(stock_id) {
  const { data } = await supabase
    .from('retail_stock_logs')
    .select('*')
    .eq('stock_id', stock_id)
    .order('logged_at', { ascending: false })
  return data || []
}

// ── Stock badge ───────────────────────────────────────────────────────────────
function StockBadge({ remaining, alertAt }) {
  if (remaining <= 0)
    return <span style={{ fontSize:11, fontWeight:700, color:S.red, background:S.redBg, padding:'2px 10px', borderRadius:20 }}>หมดแล้ว</span>
  if (remaining <= alertAt)
    return <span style={{ fontSize:11, fontWeight:700, color:S.amber, background:S.amberBg, padding:'2px 10px', borderRadius:20 }}>เหลือ {remaining} ขวด ⚠</span>
  return <span style={{ fontSize:11, fontWeight:700, color:S.green, background:S.greenBg, padding:'2px 10px', borderRadius:20 }}>เหลือ {remaining} ขวด</span>
}

// ── Progress bar ──────────────────────────────────────────────────────────────
function StockBar({ sold, total }) {
  const pct = total > 0 ? Math.min((sold / total) * 100, 100) : 0
  const color = pct >= 90 ? S.red : pct >= 60 ? S.amber : S.green
  return (
    <div style={{ background:S.border, borderRadius:4, height:5, marginTop:6 }}>
      <div style={{ width:`${pct}%`, height:'100%', background:color, borderRadius:4, transition:'width .4s' }}/>
    </div>
  )
}

// ── Add/Edit Form ─────────────────────────────────────────────────────────────
function StockForm({ initial, onSave, onCancel }) {
  const [f, setF] = useState({
    name: '', brand: '', qty_total: '',
    alert_at: 5, cost_per_unit: '', price_per_unit: '', notes: '',
    ...initial,
  })
  const [saving, setSaving] = useState(false)

  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }))

  async function submit() {
    if (!f.name.trim() || !f.qty_total) return
    setSaving(true)
    try {
      await onSave({
        name:           f.name.trim(),
        brand:          f.brand.trim() || null,
        qty_total:      parseInt(f.qty_total),
        alert_at:       parseInt(f.alert_at) || 5,
        cost_per_unit:  f.cost_per_unit ? parseFloat(f.cost_per_unit) : null,
        price_per_unit: f.price_per_unit ? parseFloat(f.price_per_unit) : null,
        notes:          f.notes.trim() || null,
      })
    } finally { setSaving(false) }
  }

  const row = { marginBottom:12 }

  return (
    <div style={{ background:S.goldLt, border:`1px solid ${S.goldBd}`, borderRadius:14, padding:18, marginBottom:16 }}>
      <div style={{ fontSize:12, fontWeight:700, color:S.gold, letterSpacing:1, textTransform:'uppercase', marginBottom:14 }}>
        {initial ? '✎ แก้ไขรายการ' : '+ เพิ่มน้ำหอมแบ่งขาย'}
      </div>

      <div style={row}>
        <span style={label}>ชื่อน้ำหอม *</span>
        <input style={inp} value={f.name} onChange={set('name')} placeholder="เช่น YSL Libre, Chanel No.5" />
      </div>
      <div style={row}>
        <span style={label}>แบรนด์</span>
        <input style={inp} value={f.brand} onChange={set('brand')} placeholder="เช่น YSL, Chanel, Dior" />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, ...row }}>
        <div>
          <span style={label}>จำนวนขวดทั้งหมด *</span>
          <input style={inp} type="number" value={f.qty_total} onChange={set('qty_total')} placeholder="20" />
        </div>
        <div>
          <span style={label}>แจ้งเตือนเมื่อเหลือ ≤</span>
          <input style={inp} type="number" value={f.alert_at} onChange={set('alert_at')} />
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, ...row }}>
        <div>
          <span style={label}>ต้นทุน/ขวด (฿)</span>
          <input style={inp} type="number" step="0.01" value={f.cost_per_unit} onChange={set('cost_per_unit')} placeholder="0.00" />
        </div>
        <div>
          <span style={label}>ราคาขาย/ขวด (฿)</span>
          <input style={inp} type="number" step="0.01" value={f.price_per_unit} onChange={set('price_per_unit')} placeholder="0.00" />
        </div>
      </div>

      <div style={row}>
        <span style={label}>หมายเหตุ</span>
        <input style={inp} value={f.notes} onChange={set('notes')} placeholder="batch, lot, หมายเหตุอื่นๆ" />
      </div>

      <div style={{ display:'flex', gap:8, marginTop:4 }}>
        <button onClick={submit} disabled={saving || !f.name.trim() || !f.qty_total}
          style={{ flex:1, padding:'10px 0', borderRadius:8, border:'none', cursor:'pointer',
            background: (!f.name.trim() || !f.qty_total) ? S.border : S.gold,
            color: (!f.name.trim() || !f.qty_total) ? S.textLt : S.white,
            fontFamily:'Inter,sans-serif', fontSize:13, fontWeight:600 }}>
          {saving ? 'กำลังบันทึก…' : 'บันทึก'}
        </button>
        <button onClick={onCancel}
          style={{ padding:'10px 18px', borderRadius:8, border:`1px solid ${S.border}`,
            background:S.white, cursor:'pointer', fontSize:13, color:S.textMid, fontFamily:'Inter,sans-serif' }}>
          ยกเลิก
        </button>
      </div>
    </div>
  )
}

// ── Transaction modal (รับเข้า / ขายออก) ─────────────────────────────────────
function TransactionModal({ stock, onDone, onClose }) {
  const [type,   setType]   = useState('out')
  const [qty,    setQty]    = useState('')
  const [note,   setNote]   = useState('')
  const [date,   setDate]   = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)
  const [err,    setErr]    = useState('')

  const remaining = stock.qty_total - stock.qty_sold

  async function submit() {
    const n = parseInt(qty)
    if (!n || n <= 0) return
    if (type === 'out' && n > remaining) { setErr(`เหลือแค่ ${remaining} ขวด`); return }
    setSaving(true)
    setErr('')
    try {
      await logTransaction(stock.id, type, n, note, date)
      const newSold    = type === 'out' ? stock.qty_sold + n : Math.max(0, stock.qty_sold - n)
      const newRemain  = stock.qty_total - newSold
      await updateStock(stock.id, { qty_sold: newSold })

      // แจ้งเตือน Line ถ้าขายออกแล้ว remaining ≤ alert_at
      if (type === 'out' && newRemain <= stock.alert_at) {
        const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/retail-alert`
        fetch(fnUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            stock_id:  stock.id,
            name:      stock.name,
            remaining: newRemain,
            alert_at:  stock.alert_at,
          }),
        }).catch(() => {}) // fire-and-forget ไม่ต้องรอ
      }

      onDone()
    } catch(e) { setErr(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:100, background:'rgba(0,0,0,.45)',
      display:'flex', alignItems:'flex-end', justifyContent:'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:S.white, borderRadius:'16px 16px 0 0', padding:24,
        width:'100%', maxWidth:480, paddingBottom: 32 }}>

        <div style={{ fontSize:13, fontWeight:700, color:S.gold, marginBottom:14,
          textTransform:'uppercase', letterSpacing:.8 }}>
          {stock.name}
        </div>

        {/* type toggle */}
        <div style={{ display:'flex', gap:8, marginBottom:14 }}>
          {[['out','ขายออก ↓'], ['in','รับเข้า ↑']].map(([v, l]) => (
            <button key={v} onClick={() => setType(v)}
              style={{ flex:1, padding:'9px 0', borderRadius:8, cursor:'pointer',
                fontFamily:'Inter,sans-serif', fontSize:13, fontWeight:600,
                border: `1.5px solid ${type===v ? (v==='out' ? S.gold : S.green) : S.border}`,
                background: type===v ? (v==='out' ? S.goldLt : S.greenBg) : S.white,
                color: type===v ? (v==='out' ? S.gold : S.green) : S.textMid }}>
              {l}
            </button>
          ))}
        </div>

        <div style={{ marginBottom:10 }}>
          <span style={label}>จำนวน (ขวด)</span>
          <input style={inp} type="number" min="1" value={qty}
            onChange={e => { setQty(e.target.value); setErr('') }}
            placeholder={type==='out' ? `เหลือ ${remaining} ขวด` : 'จำนวนที่รับเพิ่ม'} />
          {err && <div style={{ fontSize:11, color:S.red, marginTop:4 }}>{err}</div>}
        </div>
        <div style={{ marginBottom:10 }}>
          <span style={label}>วันที่</span>
          <input style={inp} type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div style={{ marginBottom:16 }}>
          <span style={label}>หมายเหตุ</span>
          <input style={inp} value={note} onChange={e => setNote(e.target.value)} placeholder="ช่องทาง, ลูกค้า, ฯลฯ" />
        </div>

        <button onClick={submit} disabled={saving || !qty}
          style={{ width:'100%', padding:'12px 0', borderRadius:10, border:'none', cursor:'pointer',
            background: !qty ? S.border : S.gold,
            color: !qty ? S.textLt : S.white,
            fontFamily:'Inter,sans-serif', fontSize:14, fontWeight:600 }}>
          {saving ? 'กำลังบันทึก…' : 'บันทึก'}
        </button>
      </div>
    </div>
  )
}

// ── Log drawer ────────────────────────────────────────────────────────────────
function LogDrawer({ stock, onClose }) {
  const [logs,    setLogs]    = useState([])
  const [loading, setLoading] = useState(true)
  const [editLog, setEditLog] = useState(null)  // log ที่กำลังแก้
  const [editNote, setEditNote] = useState('')
  const [saving,  setSaving]  = useState(false)

  useEffect(() => {
    fetchLogs(stock.id).then(d => { setLogs(d); setLoading(false) })
  }, [stock.id])

  async function saveEditNote() {
    if (!editLog) return
    setSaving(true)
    await supabase.from('retail_stock_logs').update({ note: editNote }).eq('id', editLog.id)
    const d = await fetchLogs(stock.id)
    setLogs(d)
    setEditLog(null)
    setSaving(false)
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:100, background:'rgba(0,0,0,.45)',
      display:'flex', alignItems:'flex-end', justifyContent:'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:S.white, borderRadius:'16px 16px 0 0',
        width:'100%', maxWidth:480, maxHeight:'70vh', overflow:'hidden',
        display:'flex', flexDirection:'column' }}>
        <div style={{ padding:'20px 20px 12px', borderBottom:`1px solid ${S.border}`,
          display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:S.text }}>{stock.name}</div>
            <div style={{ fontSize:11, color:S.textLt }}>ประวัติการเคลื่อนไหว</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer',
            fontSize:18, color:S.textLt, padding:4 }}>✕</button>
        </div>
        <div style={{ overflowY:'auto', padding:'12px 20px 24px' }}>
          {loading ? (
            <div style={{ textAlign:'center', color:S.textLt, padding:24, fontSize:13 }}>กำลังโหลด…</div>
          ) : logs.length === 0 ? (
            <div style={{ textAlign:'center', color:S.textLt, padding:24, fontSize:13 }}>ยังไม่มีประวัติ</div>
          ) : logs.map(l => (
            <div key={l.id} style={{ padding:'10px 0', borderBottom:`1px solid ${S.border}` }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <span style={{ fontSize:12, fontWeight:700,
                    color: l.type === 'out' ? S.gold : S.green,
                    background: l.type === 'out' ? S.goldLt : S.greenBg,
                    padding:'2px 8px', borderRadius:12, marginRight:8 }}>
                    {l.type === 'out' ? '↓ ขาย' : '↑ รับ'}
                  </span>
                  <span style={{ fontSize:13, color:S.text, fontWeight:600 }}>{l.qty} ขวด</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:11, color:S.textLt }}>
                    {new Date(l.logged_at).toLocaleDateString('th-TH', { day:'numeric', month:'short' })}
                  </span>
                  <button onClick={() => { setEditLog(l); setEditNote(l.note || '') }}
                    style={{ background:'none', border:'none', cursor:'pointer',
                      fontSize:12, color:S.textLt, padding:'2px 6px' }}>✎</button>
                </div>
              </div>

              {/* inline edit */}
              {editLog?.id === l.id ? (
                <div style={{ marginTop:8, display:'flex', gap:6 }}>
                  <input value={editNote} onChange={e => setEditNote(e.target.value)}
                    placeholder="แก้ไขหมายเหตุ…"
                    style={{ flex:1, padding:'6px 10px', borderRadius:6,
                      border:`1px solid ${S.goldBd}`, fontSize:12,
                      fontFamily:'Inter,sans-serif', outline:'none' }}/>
                  <button onClick={saveEditNote} disabled={saving}
                    style={{ padding:'6px 12px', borderRadius:6, border:'none',
                      background:S.gold, color:S.white, cursor:'pointer',
                      fontSize:12, fontWeight:600 }}>
                    {saving ? '…' : 'บันทึก'}
                  </button>
                  <button onClick={() => setEditLog(null)}
                    style={{ padding:'6px 10px', borderRadius:6,
                      border:`1px solid ${S.border}`, background:'none',
                      cursor:'pointer', fontSize:12, color:S.textMid }}>
                    ยกเลิก
                  </button>
                </div>
              ) : (
                l.note && <div style={{ fontSize:11, color:S.textMid, marginTop:4 }}>{l.note}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Stock card ────────────────────────────────────────────────────────────────
function StockCard({ item, onEdit, onDelete, onTransaction, onLogs, onRecommend }) {
  const remaining = item.qty_total - item.qty_sold
  const isLow     = remaining > 0 && remaining <= item.alert_at
  const isEmpty   = remaining <= 0

  const profit    = item.price_per_unit && item.cost_per_unit
    ? ((item.price_per_unit - item.cost_per_unit) * item.qty_sold).toFixed(0)
    : null

  return (
    <div style={{ background: S.white, border: `1px solid ${isEmpty ? S.redBg : isLow ? '#f0e0c0' : S.border}`,
      borderRadius:14, padding:16, marginBottom:12,
      boxShadow: isLow || isEmpty ? 'none' : '0 1px 4px rgba(0,0,0,.04)' }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ fontSize:15, fontWeight:700, color:S.text, fontFamily:'Cormorant Garamond,serif' }}>
              {item.name}
            </div>
            {item.is_recommended && (
              <span style={{ fontSize:13 }} title="Recommended">⭐</span>
            )}
          </div>
          <div style={{ fontSize:11, color:S.textLt, marginTop:1 }}>
            {[item.brand].filter(Boolean).join(' · ')}
          </div>
        </div>
        <StockBadge remaining={remaining} alertAt={item.alert_at} />
      </div>

      {/* Progress */}
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:S.textMid }}>
        <span>ขายไป {item.qty_sold} / {item.qty_total} ขวด</span>
        {profit && <span style={{ color:S.green }}>กำไรสะสม ฿{parseInt(profit).toLocaleString()}</span>}
      </div>
      <StockBar sold={item.qty_sold} total={item.qty_total} />

      {/* Pricing */}
      {(item.cost_per_unit || item.price_per_unit) && (
        <div style={{ display:'flex', gap:12, marginTop:10, padding:'8px 10px',
          background:S.bg, borderRadius:8 }}>
          {item.cost_per_unit && (
            <div style={{ fontSize:11 }}>
              <span style={{ color:S.textLt }}>ต้นทุน </span>
              <span style={{ fontWeight:700, color:S.textMid }}>฿{item.cost_per_unit}</span>
            </div>
          )}
          {item.price_per_unit && (
            <div style={{ fontSize:11 }}>
              <span style={{ color:S.textLt }}>ขาย </span>
              <span style={{ fontWeight:700, color:S.gold }}>฿{item.price_per_unit}</span>
            </div>
          )}
          {item.cost_per_unit && item.price_per_unit && (
            <div style={{ fontSize:11 }}>
              <span style={{ color:S.textLt }}>กำไร/ขวด </span>
              <span style={{ fontWeight:700, color:S.green }}>฿{(item.price_per_unit - item.cost_per_unit).toFixed(0)}</span>
            </div>
          )}
        </div>
      )}

      {item.notes && (
        <div style={{ fontSize:11, color:S.textMid, marginTop:8, fontStyle:'italic' }}>{item.notes}</div>
      )}

      {/* Actions */}
      <div style={{ display:'flex', gap:6, marginTop:12 }}>
        <button onClick={() => onTransaction(item)}
          style={{ flex:1, padding:'9px 0', borderRadius:8, border:`1.5px solid ${S.gold}`,
            background: remaining <= 0 ? S.bg : S.goldLt,
            color: remaining <= 0 ? S.textLt : S.gold,
            fontFamily:'Inter,sans-serif', fontSize:12, fontWeight:600, cursor: remaining <= 0 ? 'default' : 'pointer' }}>
          บันทึกการขาย
        </button>
        <button onClick={() => onRecommend(item)}
          title={item.is_recommended ? 'ยกเลิก Recommend' : 'Mark เป็น Recommend'}
          style={{ padding:'9px 12px', borderRadius:8,
            border:`1px solid ${item.is_recommended ? '#e8c840' : S.border}`,
            background: item.is_recommended ? '#fffbe6' : S.white,
            cursor:'pointer', fontSize:14 }}>
          ⭐
        </button>
        <button onClick={() => onLogs(item)}
          style={{ padding:'9px 14px', borderRadius:8, border:`1px solid ${S.border}`,
            background:S.white, cursor:'pointer', fontSize:12, color:S.textMid, fontFamily:'Inter,sans-serif' }}>
          ประวัติ
        </button>
        <button onClick={() => onEdit(item)}
          style={{ padding:'9px 14px', borderRadius:8, border:`1px solid ${S.border}`,
            background:S.white, cursor:'pointer', fontSize:12, color:S.textMid, fontFamily:'Inter,sans-serif' }}>
          ✎
        </button>
        <button onClick={() => onDelete(item)}
          style={{ padding:'9px 10px', borderRadius:8, border:`1px solid ${S.border}`,
            background:S.white, cursor:'pointer', fontSize:13, color:S.red, fontFamily:'Inter,sans-serif' }}>
          ✕
        </button>
      </div>
    </div>
  )
}

// ── Summary bar ───────────────────────────────────────────────────────────────
function SummaryBar({ items }) {
  const total     = items.reduce((s, i) => s + i.qty_total, 0)
  const sold      = items.reduce((s, i) => s + i.qty_sold, 0)
  const remaining = total - sold
  const alerts    = items.filter(i => (i.qty_total - i.qty_sold) <= i.alert_at && (i.qty_total - i.qty_sold) >= 0).length
  const revenue   = items.reduce((s, i) => s + (i.price_per_unit || 0) * i.qty_sold, 0)

  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:20 }}>
      {[
        { label:'ทั้งหมด',  value: total,     unit:'ขวด', color:S.textMid },
        { label:'ขายแล้ว', value: sold,      unit:'ขวด', color:S.gold    },
        { label:'คงเหลือ', value: remaining, unit:'ขวด', color:S.green   },
        { label:'รายได้',  value:`฿${revenue.toLocaleString()}`, unit:'', color:S.green, raw:true },
      ].map(b => (
        <div key={b.label} style={{ background:S.white, border:`1px solid ${S.border}`,
          borderRadius:10, padding:'10px 8px', textAlign:'center' }}>
          <div style={{ fontSize:b.raw ? 12 : 18, fontWeight:700, color:b.color }}>{b.value}</div>
          <div style={{ fontSize:9, color:S.textLt, marginTop:1, textTransform:'uppercase', letterSpacing:.4 }}>{b.raw ? '' : b.unit} {b.label}</div>
        </div>
      ))}
      {alerts > 0 && (
        <div style={{ gridColumn:'1/-1', background:S.amberBg, border:`1px solid #f0c060`,
          borderRadius:8, padding:'8px 12px', display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:16 }}>⚠</span>
          <span style={{ fontSize:12, color:S.amber, fontWeight:600 }}>
            {alerts} รายการใกล้หมด / หมดแล้ว — ควรเติม stock
          </span>
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PageRetailStock() {
  const [items,       setItems]       = useState([])
  const [loading,     setLoading]     = useState(true)
  const [showForm,    setShowForm]    = useState(false)
  const [editItem,    setEditItem]    = useState(null)
  const [txItem,      setTxItem]      = useState(null)   // transaction modal
  const [logItem,     setLogItem]     = useState(null)   // log drawer
  const [search,      setSearch]      = useState('')
  const [filter,      setFilter]      = useState('all')  // all | low | empty

  const load = useCallback(async () => {
    setLoading(true)
    const d = await fetchAll()
    setItems(d)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSave(payload) {
    if (editItem) {
      await updateStock(editItem.id, payload)
    } else {
      await createStock(payload)
    }
    setShowForm(false); setEditItem(null)
    load()
  }

  async function handleDelete(item) {
    if (!window.confirm(`ลบ "${item.name}" ?`)) return
    await deleteStock(item.id)
    load()
  }

  async function handleRecommend(item) {
    await updateStock(item.id, { is_recommended: !item.is_recommended })
    load()
  }

  const filtered = items.filter(i => {
    const rem = i.qty_total - i.qty_sold
    if (filter === 'low'   && !(rem > 0 && rem <= i.alert_at)) return false
    if (filter === 'empty' && rem > 0) return false
    if (search && !i.name.toLowerCase().includes(search.toLowerCase()) &&
        !(i.brand||'').toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom:20 }}>
        <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:22, color:S.gold,
          fontStyle:'italic', marginBottom:2 }}>Retail Stock</div>
        <div style={{ fontSize:11, color:S.textLt, textTransform:'uppercase', letterSpacing:1 }}>
          น้ำหอมแบ่งขาย
        </div>
      </div>

      {/* Summary */}
      {!loading && items.length > 0 && <SummaryBar items={items} />}

      {/* Toolbar */}
      <div style={{ display:'flex', gap:8, marginBottom:14 }}>
        <input style={{ ...inp, flex:1 }} value={search} onChange={e => setSearch(e.target.value)}
          placeholder="ค้นหาชื่อ / แบรนด์…" />
        <button onClick={() => { setShowForm(true); setEditItem(null) }}
          style={{ padding:'10px 14px', borderRadius:8, border:'none', cursor:'pointer',
            background:S.gold, color:S.white, fontFamily:'Inter,sans-serif', fontSize:12, fontWeight:600,
            whiteSpace:'nowrap' }}>
          + เพิ่ม
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ display:'flex', gap:6, marginBottom:16 }}>
        {[['all','ทั้งหมด'], ['low','ใกล้หมด'], ['empty','หมดแล้ว']].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)}
            style={{ padding:'6px 14px', borderRadius:20, border:`1px solid ${filter===v ? S.gold : S.border}`,
              background: filter===v ? S.goldLt : S.white, cursor:'pointer',
              fontSize:11, fontWeight:600, color: filter===v ? S.gold : S.textMid,
              fontFamily:'Inter,sans-serif' }}>
            {l}
          </button>
        ))}
      </div>

      {/* Add/Edit form */}
      {(showForm || editItem) && (
        <StockForm
          initial={editItem}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditItem(null) }}
        />
      )}

      {/* List */}
      {loading ? (
        <div style={{ textAlign:'center', color:S.textLt, padding:40, fontSize:13 }}>กำลังโหลด…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:40 }}>
          <div style={{ fontSize:28, marginBottom:8 }}>◈</div>
          <div style={{ fontSize:13, color:S.textLt }}>
            {items.length === 0 ? 'ยังไม่มีน้ำหอมแบ่งขาย กด + เพิ่มรายการแรก' : 'ไม่พบรายการที่ค้นหา'}
          </div>
        </div>
      ) : (
        filtered.map(item => (
          <StockCard
            key={item.id}
            item={item}
            onEdit={i => { setEditItem(i); setShowForm(false) }}
            onDelete={handleDelete}
            onTransaction={setTxItem}
            onLogs={setLogItem}
            onRecommend={handleRecommend}
          />
        ))
      )}

      {/* Transaction modal */}
      {txItem && (
        <TransactionModal
          stock={txItem}
          onDone={() => { setTxItem(null); load() }}
          onClose={() => setTxItem(null)}
        />
      )}

      {/* Log drawer */}
      {logItem && (
        <LogDrawer
          stock={logItem}
          onClose={() => setLogItem(null)}
        />
      )}
    </div>
  )
}
