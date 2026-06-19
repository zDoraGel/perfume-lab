import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { S } from '../constants/theme'
import { Card, Btn } from '../components/ui'

const CATEGORIES = [
  { v:'card',     label:'การ์ด' },
  { v:'box',      label:'กล่อง' },
  { v:'material', label:'วัตถุดิบนอกระบบ' },
  { v:'other',    label:'อื่นๆ' },
]

const GROUPS = [
  { v:'production', label:'Production',  icon:'⚗️' },
  { v:'myblends',   label:'My Blends',   icon:'🧪' },
  { v:'retail',     label:'Retail',      icon:'🛍️' },
]

function categoryLabel(v) {
  return CATEGORIES.find(c => c.v === v)?.label || v
}

function groupLabel(v) {
  return GROUPS.find(g => g.v === v)?.label || 'ไม่ระบุ'
}

async function fetchExpenses(monthStart) {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .gte('expense_date', monthStart)
    .order('expense_date', { ascending: false })
  if (error) throw error
  return data || []
}

async function insertExpense({ expense_date, category, amount, note, for_group }) {
  const { error } = await supabase
    .from('expenses')
    .insert({ expense_date, category, amount, note, for_group: for_group || null, source: 'app' })
  if (error) throw error
}

async function deleteExpense(id) {
  const { error } = await supabase.from('expenses').delete().eq('id', id)
  if (error) throw error
}

async function updateExpenseGroup(id, for_group) {
  const { error } = await supabase.from('expenses').update({ for_group: for_group || null }).eq('id', id)
  if (error) throw error
}

export default function PageExpenses({ onBack }) {
  const [expenses,  setExpenses]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [errMsg,    setErrMsg]    = useState('')

  const [date,     setDate]     = useState(new Date().toISOString().slice(0,10))
  const [category, setCategory] = useState('card')
  const [amount,   setAmount]   = useState('')
  const [note,     setNote]     = useState('')
  const [forGroup, setForGroup] = useState('')
  const [groupFilter, setGroupFilter] = useState('all') // all | production | myblends | retail | none
  const [editingGroupId, setEditingGroupId] = useState(null) // id ของรายการที่กำลังแก้กลุ่มอยู่

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString().slice(0,10)

  function load() {
    setLoading(true)
    setErrMsg('')
    fetchExpenses(monthStart)
      .then(setExpenses)
      .catch(e => setErrMsg('โหลดข้อมูลไม่สำเร็จ — ตรวจสอบว่ามีตาราง expenses ใน Supabase แล้วหรือยัง'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function handleAdd() {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) { alert('กรุณากรอกจำนวนเงิน'); return }
    setSaving(true)
    try {
      await insertExpense({ expense_date: date, category, amount: amt, note: note.trim() || null, for_group: forGroup })
      setAmount('')
      setNote('')
      setForGroup('')
      load()
    } catch (e) {
      alert('บันทึกไม่สำเร็จ: ' + e.message)
    }
    setSaving(false)
  }

  async function handleDelete(id) {
    if (!confirm('ลบรายการนี้?')) return
    try {
      await deleteExpense(id)
      load()
    } catch (e) {
      alert('ลบไม่สำเร็จ: ' + e.message)
    }
  }

  async function handleUpdateGroup(id, group) {
    try {
      await updateExpenseGroup(id, group)
      setEditingGroupId(null)
      load()
    } catch (e) {
      alert('อัปเดตกลุ่มไม่สำเร็จ: ' + e.message)
    }
  }

  const filteredExpenses = groupFilter === 'all' ? expenses
    : groupFilter === 'none' ? expenses.filter(e => !e.for_group)
    : expenses.filter(e => e.for_group === groupFilter)

  const monthTotal = filteredExpenses.reduce((s, e) => s + (e.amount || 0), 0)
  const byCategory = CATEGORIES.map(c => ({
    ...c,
    total: filteredExpenses.filter(e => e.category === c.v).reduce((s, e) => s + (e.amount || 0), 0),
  })).filter(c => c.total > 0)

  // ยอดรวมแยกตามกลุ่ม (ไม่ขึ้นกับ groupFilter — โชว์ภาพรวมเสมอ)
  const byGroup = [
    ...GROUPS.map(g => ({
      ...g,
      total: expenses.filter(e => e.for_group === g.v).reduce((s, e) => s + (e.amount || 0), 0),
    })),
    { v:'none', label:'ไม่ระบุกลุ่ม', icon:'◌',
      total: expenses.filter(e => !e.for_group).reduce((s, e) => s + (e.amount || 0), 0) },
  ].filter(g => g.total > 0)

  return (
    <div>
      <div style={{ marginBottom:20 }}>
        {onBack && (
          <button onClick={onBack}
            style={{ display:'flex', alignItems:'center', gap:4, background:'none', border:'none',
              cursor:'pointer', padding:0, marginBottom:10, fontSize:12, color:S.textMid,
              fontFamily:'Inter,sans-serif' }}>
            ← Dashboard
          </button>
        )}
        <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:24,
          color:S.text, fontStyle:'italic' }}>ค่าใช้จ่าย</div>
        <div style={{ fontSize:11, color:S.textLt, marginTop:4 }}>
          บันทึกค่าใช้จ่ายนอกระบบ เช่น การ์ด กล่อง วัตถุดิบเสริม
        </div>
      </div>

      {errMsg && (
        <div style={{ background:S.redBg, border:`1px solid ${S.red}55`, borderRadius:10,
          padding:'10px 14px', marginBottom:16, fontSize:12, color:S.red }}>
          {errMsg}
        </div>
      )}

      {/* Add form */}
      <Card style={{ marginBottom:16 }}>
        <div style={{ fontSize:11, fontWeight:700, color:S.gold, textTransform:'uppercase',
          letterSpacing:.8, marginBottom:12 }}>
          เพิ่มค่าใช้จ่าย
        </div>

        <div style={{ marginBottom:10 }}>
          <div style={{ fontSize:11, color:S.textMid, marginBottom:5 }}>วันที่</div>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            style={{ width:'100%', padding:'8px 12px', borderRadius:10, fontSize:13,
              border:`1px solid ${S.border}`, outline:'none', boxSizing:'border-box' }}/>
        </div>

        <div style={{ marginBottom:10 }}>
          <div style={{ fontSize:11, color:S.textMid, marginBottom:5 }}>หมวด</div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {CATEGORIES.map(c => (
              <button key={c.v} onClick={() => setCategory(c.v)}
                style={{ padding:'6px 14px', borderRadius:20, cursor:'pointer', fontSize:12,
                  border:`1.5px solid ${category === c.v ? S.gold : S.border}`,
                  background: category === c.v ? S.goldLt : 'transparent',
                  color: category === c.v ? S.gold : S.textMid,
                  fontWeight: category === c.v ? 600 : 400 }}>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom:10 }}>
          <div style={{ fontSize:11, color:S.textMid, marginBottom:5 }}>
            สำหรับกลุ่ม (ไม่บังคับ)
          </div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {GROUPS.map(g => (
              <button key={g.v} onClick={() => setForGroup(prev => prev === g.v ? '' : g.v)}
                style={{ padding:'6px 14px', borderRadius:20, cursor:'pointer', fontSize:12,
                  border:`1.5px solid ${forGroup === g.v ? S.gold : S.border}`,
                  background: forGroup === g.v ? S.goldLt : 'transparent',
                  color: forGroup === g.v ? S.gold : S.textMid,
                  fontWeight: forGroup === g.v ? 600 : 400 }}>
                {g.icon} {g.label}
              </button>
            ))}
          </div>
          <div style={{ fontSize:10, color:S.textLt, marginTop:4 }}>
            * ไม่เลือก = ใช้ร่วมกันทุกกลุ่ม เช่น ค่าไฟ ค่าเช่า
          </div>
        </div>

        <div style={{ marginBottom:10 }}>
          <div style={{ fontSize:11, color:S.textMid, marginBottom:5 }}>จำนวนเงิน (฿)</div>
          <input type="number" inputMode="decimal" value={amount}
            onChange={e => setAmount(e.target.value)} placeholder="0"
            style={{ width:'100%', padding:'8px 12px', borderRadius:10, fontSize:13,
              border:`1px solid ${S.border}`, outline:'none', boxSizing:'border-box' }}/>
        </div>

        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:11, color:S.textMid, marginBottom:5 }}>รายละเอียด (ไม่บังคับ)</div>
          <input value={note} onChange={e => setNote(e.target.value)}
            placeholder="เช่น ค่ากล่องผลิตลอตใหม่"
            style={{ width:'100%', padding:'8px 12px', borderRadius:10, fontSize:13,
              border:`1px solid ${S.border}`, outline:'none', boxSizing:'border-box' }}/>
        </div>

        <button onClick={handleAdd} disabled={saving}
          style={{ width:'100%', padding:'11px 0', borderRadius:10, cursor: saving ? 'default' : 'pointer',
            border:'none', background: saving ? S.border : S.gold, color:'#fff',
            fontSize:13, fontWeight:600, fontFamily:'Inter,sans-serif',
            opacity: saving ? 0.6 : 1 }}>
          {saving ? 'กำลังบันทึก...' : '+ บันทึกค่าใช้จ่าย'}
        </button>
      </Card>

      {/* Group filter */}
      {byGroup.length > 0 && (
        <div style={{ display:'flex', gap:6, marginBottom:14, flexWrap:'wrap' }}>
          <button onClick={() => setGroupFilter('all')}
            style={{ padding:'5px 12px', borderRadius:16, cursor:'pointer', fontSize:11, fontWeight:600,
              border:`1.5px solid ${groupFilter==='all' ? S.gold : S.border}`,
              background: groupFilter==='all' ? S.goldLt : 'transparent',
              color: groupFilter==='all' ? S.gold : S.textMid }}>
            ทั้งหมด
          </button>
          {[...GROUPS, { v:'none', label:'ไม่ระบุกลุ่ม', icon:'◌' }].map(g => (
            <button key={g.v} onClick={() => setGroupFilter(g.v)}
              style={{ padding:'5px 12px', borderRadius:16, cursor:'pointer', fontSize:11, fontWeight:600,
                border:`1.5px solid ${groupFilter===g.v ? S.gold : S.border}`,
                background: groupFilter===g.v ? S.goldLt : 'transparent',
                color: groupFilter===g.v ? S.gold : S.textMid }}>
              {g.icon} {g.label}
            </button>
          ))}
        </div>
      )}

      {/* Breakdown by group */}
      {byGroup.length > 0 && (
        <Card style={{ marginBottom:16 }}>
          <div style={{ fontSize:11, fontWeight:700, color:S.gold, textTransform:'uppercase',
            letterSpacing:.8, marginBottom:10 }}>
            แยกตามกลุ่ม
          </div>
          {byGroup.map(g => (
            <div key={g.v} style={{ display:'flex', justifyContent:'space-between',
              padding:'6px 0', borderBottom:`1px solid ${S.border}`, fontSize:12 }}>
              <span style={{ color:S.textMid }}>{g.icon} {g.label}</span>
              <span style={{ fontWeight:600, color:S.text }}>฿{g.total.toLocaleString()}</span>
            </div>
          ))}
        </Card>
      )}

      {/* Month summary */}
      {!loading && filteredExpenses.length > 0 && (
        <Card style={{ marginBottom:16 }}>
          <div style={{ fontSize:11, fontWeight:700, color:S.gold, textTransform:'uppercase',
            letterSpacing:.8, marginBottom:10 }}>
            สรุปเดือนนี้
          </div>
          <div style={{ fontSize:22, fontWeight:700, color:S.red, fontFamily:'Cormorant Garamond,serif',
            marginBottom:10 }}>
            ฿{monthTotal.toLocaleString()}
          </div>
          {byCategory.map(c => (
            <div key={c.v} style={{ display:'flex', justifyContent:'space-between',
              padding:'6px 0', borderBottom:`1px solid ${S.border}`, fontSize:12 }}>
              <span style={{ color:S.textMid }}>{c.label}</span>
              <span style={{ fontWeight:600, color:S.text }}>฿{c.total.toLocaleString()}</span>
            </div>
          ))}
        </Card>
      )}

      {/* List */}
      <div style={{ fontSize:11, fontWeight:700, color:S.textMid, textTransform:'uppercase',
        letterSpacing:.8, marginBottom:10 }}>
        รายการเดือนนี้
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:40, color:S.textLt }}>Loading...</div>
      ) : filteredExpenses.length === 0 ? (
        <div style={{ textAlign:'center', padding:'30px 0', color:S.textLt, fontSize:13 }}>
          ยังไม่มีรายการค่าใช้จ่ายเดือนนี้
        </div>
      ) : (
        filteredExpenses.map(e => (
          <Card key={e.id} style={{ marginBottom:8, padding:'12px 14px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10 }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                  <span style={{ fontSize:10, padding:'2px 8px', borderRadius:12,
                    background:S.goldLt, color:S.gold, fontWeight:600 }}>
                    {categoryLabel(e.category)}
                  </span>
                  <button onClick={() => setEditingGroupId(prev => prev === e.id ? null : e.id)}
                    style={{ fontSize:10, padding:'2px 8px', borderRadius:12, cursor:'pointer',
                      border:'none',
                      background: e.for_group ? '#eef0f5' : S.bg,
                      color: e.for_group ? '#4a6aa8' : S.textLt, fontWeight:600 }}>
                    {e.for_group
                      ? `${GROUPS.find(g=>g.v===e.for_group)?.icon} ${groupLabel(e.for_group)}`
                      : '◌ ไม่ระบุกลุ่ม'} ✎
                  </button>
                  <span style={{ fontSize:11, color:S.textLt }}>
                    {new Date(e.expense_date).toLocaleDateString('th-TH', { day:'numeric', month:'short' })}
                  </span>
                </div>
                {editingGroupId === e.id && (
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:8 }}>
                    <button onClick={() => handleUpdateGroup(e.id, '')}
                      style={{ padding:'4px 10px', borderRadius:14, cursor:'pointer', fontSize:11,
                        border:`1.5px solid ${!e.for_group ? S.gold : S.border}`,
                        background: !e.for_group ? S.goldLt : 'transparent',
                        color: !e.for_group ? S.gold : S.textMid, fontWeight:600 }}>
                      ◌ ไม่ระบุกลุ่ม
                    </button>
                    {GROUPS.map(g => (
                      <button key={g.v} onClick={() => handleUpdateGroup(e.id, g.v)}
                        style={{ padding:'4px 10px', borderRadius:14, cursor:'pointer', fontSize:11,
                          border:`1.5px solid ${e.for_group === g.v ? S.gold : S.border}`,
                          background: e.for_group === g.v ? S.goldLt : 'transparent',
                          color: e.for_group === g.v ? S.gold : S.textMid, fontWeight:600 }}>
                        {g.icon} {g.label}
                      </button>
                    ))}
                  </div>
                )}
                {e.note && (
                  <div style={{ fontSize:12, color:S.textMid, marginTop:5 }}>{e.note}</div>
                )}
              </div>
              <div style={{ textAlign:'right', flexShrink:0 }}>
                <div style={{ fontSize:15, fontWeight:700, color:S.red }}>
                  ฿{Number(e.amount).toLocaleString()}
                </div>
                <button onClick={() => handleDelete(e.id)}
                  style={{ marginTop:4, fontSize:10, color:S.textLt, background:'none',
                    border:'none', cursor:'pointer', textDecoration:'underline' }}>
                  ลบ
                </button>
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  )
}
