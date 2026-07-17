import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { db } from '../lib/db'
import { S } from '../constants/theme'
import { Btn } from '../components/ui'
import { getPromptPayQrUrl } from '../lib/promptpay'

// ล็อกเป็น production URL เสมอ — เหตุผลเดียวกับ Blotter+QR (กัน Vercel preview URL หลุดไปให้ลูกค้า)
const PRODUCTION_URL = 'https://perfume-lab-brown.vercel.app'

// TODO: เปลี่ยนเป็นเบอร์พร้อมเพย์จริงของร้าน (Gel จะส่งมาทีหลัง)
const DEFAULT_PROMPTPAY = '0963691593'

const inputStyle = {
  width:'100%', padding:'10px 12px', borderRadius:8,
  border:`1px solid ${S.border}`, fontSize:13, boxSizing:'border-box',
  fontFamily:'Inter,sans-serif',
}

// แต้มสะสม: ทุก 50 บาท = 1 แต้ม — ไม่ปัดเศษทิ้ง เศษสะสมไปรวมยอดซื้อครั้งถัดไป — ให้เฉพาะช่องทาง แอป / Facebook / Instagram
const POINTS_PER_BAHT = 50
const POINTS_ELIGIBLE_CHANNELS = ['app', 'facebook', 'instagram', 'line']
// ช่องทางที่ยังต้องสร้าง QR ให้ลูกค้าจ่าย (FB/IG/LINE = คุยขาย แต่ยังไม่จ่าย)
// ส่วน TikTok/Shopee มีระบบจ่ายเงินในตัวแพลตฟอร์มแล้ว ไม่ต้องมี QR
const QR_CHANNELS = ['app', 'facebook', 'instagram', 'line']
// พรีวิวแต้มที่จะได้ — รวมเศษยอดซื้อเดิมของลูกค้าเข้าไปด้วยก่อนคำนวณ (ตัวเลขจริงคำนวณอีกทีตอนบันทึกผ่าน db.earnPointsFromPurchase)
function calcPoints(amount, channel, remainder = 0) {
  if (!POINTS_ELIGIBLE_CHANNELS.includes(channel)) return 0
  return Math.floor(((amount || 0) + (remainder || 0)) / POINTS_PER_BAHT)
}
// พรีวิวเศษที่จะเหลือหลังคำนวณแต้มรอบนี้
function calcRemainder(amount, channel, remainder = 0) {
  if (!POINTS_ELIGIBLE_CHANNELS.includes(channel)) return remainder || 0
  const total = (amount || 0) + (remainder || 0)
  const points = Math.floor(total / POINTS_PER_BAHT)
  return Math.round((total - points * POINTS_PER_BAHT) * 100) / 100
}

const REDEEM_POINTS_COST = 20
const WELCOME_DISCOUNT = 100         // ลูกค้าใหม่ลด 100 (ใช้ครั้งเดียว)
const WELCOME_MIN_PURCHASE = 450     // ต้องซื้อครบยอดนี้ถึงใช้ Welcome Gift ได้ (กันขาดทุนเวลาซื้อของชิ้นเล็ก เช่น 5ml)
const WELCOME_VALID_DAYS = 30        // ใช้ได้ภายใน 30 วันหลังสมัคร ถ้าเกินแล้วไม่เคยใช้ก็หมดสิทธิ์
const BIRTHDAY_BONUS_POINTS = 5      // โบนัสวันเกิด +5 แต้ม เมื่อซื้อในเดือนเกิด
const BOTTLE_SIZES = [5, 15, 30, 50, 100]

// เดือนเกิดตรงกับเดือนปัจจุบันไหม (เทียบเฉพาะเดือน ไม่สนปี)
function isBirthdayMonth(birthDate) {
  if (!birthDate) return false
  const bd = new Date(birthDate)
  if (isNaN(bd)) return false
  return bd.getMonth() === new Date().getMonth()
}

// เช็คว่ายังอยู่ในช่วง N วันนับจากวันที่ที่กำหนดไหม (ใช้เช็คสิทธิ์ Welcome Gift 30 วันหลังสมัคร)
function isWithinDays(dateStr, days) {
  if (!dateStr) return true // ไม่มีวันที่อ้างอิง (ลูกค้าใหม่ที่ยังไม่มี record) ถือว่ายังไม่หมดสิทธิ์
  const created = new Date(dateStr)
  if (isNaN(created)) return true
  return (Date.now() - created.getTime()) <= days * 24 * 60 * 60 * 1000
}

const CHANNELS = [
  { value:'app',       label:'แอป (QR PromptPay)' },
  { value:'facebook',  label:'Facebook' },
  { value:'instagram', label:'Instagram' },
  { value:'line',      label:'LINE' },
  { value:'tiktok',    label:'TikTok' },
  { value:'shopee',    label:'Shopee' },
]

// ── ฟอร์มสร้างออเดอร์ใหม่ ────────────────────────────────────────────────────────
function NewOrderForm({ formulas, customers, orders, onSaved, onOrderSaved, onViewHistory }) {
  const [channel,         setChannel]         = useState('app')
  const [customerName,    setCustomerName]    = useState('')
  const [customerContact, setCustomerContact] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [customerBirth,   setCustomerBirth]   = useState('')
  const [existingId,      setExistingId]      = useState(null)
  const [items,           setItems]           = useState([
    { formula_id:'', bottle_ml:15, qty:1, unit_price:'', original_price:'', discount_type:null, discount_value:'', discount_reason:'' }
  ])
  const [promptpay,       setPromptpay]       = useState(DEFAULT_PROMPTPAY)
  const [notes,           setNotes]           = useState('')
  const [hasShipping,     setHasShipping]     = useState(false)
  const [shippingFee,     setShippingFee]     = useState('40')
  const [saving,          setSaving]          = useState(false)
  const [savedOrder,      setSavedOrder]      = useState(null)
  const [showCustList,    setShowCustList]    = useState(false)
  const [redeemType,      setRedeemType]      = useState(null) // null | 'discount_100' | 'perfume_2ml' | 'free_shipping'
  const [redeemFormulaId, setRedeemFormulaId] = useState('')
  const [useWelcome,      setUseWelcome]      = useState(false) // ใช้ Welcome Gift กับออเดอร์นี้ไหม
  const savingRef = useRef(false) // กันกดบันทึกซ้ำแบบ synchronous — ไม่ต้องรอ React re-render

  function addItem() {
    setItems(p => [...p, { formula_id:'', bottle_ml:15, qty:1, unit_price:'', original_price:'', discount_type:null, discount_value:'', discount_reason:'' }])
  }
  function removeItem(i) {
    setItems(p => p.filter((_, idx) => idx !== i))
  }
  function updateItem(i, field, value) {
    setItems(p => p.map((it, idx) => idx === i ? { ...it, [field]: value } : it))
  }

  function itemFinalPrice(it) {
    const baseOriginal = parseFloat(it.original_price) || parseFloat(it.unit_price) || 0
    const discountVal  = parseFloat(it.discount_value) || 0
    if (it.discount_type === 'fixed') return baseOriginal - discountVal
    if (it.discount_type === 'percent') return baseOriginal * (1 - discountVal / 100)
    return baseOriginal
  }

  const itemsTotal = items.reduce((s, it) =>
    s + itemFinalPrice(it) * (parseInt(it.qty) || 0), 0)
  const selectedCustomer = existingId ? customers.find(c => c.id === existingId) : null
  const customerPoints   = selectedCustomer?.loyalty_points || 0
  const canRedeem        = customerPoints >= REDEEM_POINTS_COST
  // Welcome Gift: เสนอได้เมื่อเป็นลูกค้าใหม่ (ยังไม่มี existingId) หรือลูกค้าเดิมที่ยังไม่เคยใช้
  const welcomeNotUsed     = !existingId || (selectedCustomer && !selectedCustomer.welcome_used)
  const welcomeMeetsMin    = itemsTotal >= WELCOME_MIN_PURCHASE
  // นับ 30 วันจากออเดอร์แรกจริงของลูกค้า (ไม่ใช่วันสร้าง record) — ถ้ายังไม่เคยซื้อเลย ถือว่ายังไม่เริ่มนับ (มีสิทธิ์อยู่)
  const customerOrders    = existingId ? (orders || []).filter(o => o.customer_id === existingId) : []
  const firstPurchaseDate = customerOrders.reduce(
    (earliest, o) => (!earliest || new Date(o.created_at) < new Date(earliest)) ? o.created_at : earliest, null)
  const welcomeWithinWindow = isWithinDays(firstPurchaseDate, WELCOME_VALID_DAYS)
  const welcomeEligible    = welcomeNotUsed && welcomeMeetsMin && welcomeWithinWindow
  // โบนัสวันเกิด: ลูกค้าเดิมที่ตั้งวันเกิด และเดือนนี้ตรงเดือนเกิด + ช่องทางให้แต้ม
  const birthdayEligible = selectedCustomer && isBirthdayMonth(selectedCustomer.birth_date)
    && POINTS_ELIGIBLE_CHANNELS.includes(channel)
  const shippingAmount   = (hasShipping && redeemType !== 'free_shipping') ? (parseFloat(shippingFee) || 0) : 0
  const redeemDiscount   = redeemType === 'discount_100' ? 100 : 0
  const welcomeDiscount  = (useWelcome && welcomeEligible) ? WELCOME_DISCOUNT : 0
  const total = Math.max(0, itemsTotal + shippingAmount - redeemDiscount - welcomeDiscount)

  function pickCustomer(c) {
    setCustomerName(c.name)
    setCustomerContact(c.contact || '')
    setCustomerAddress(c.address || '')
    setCustomerBirth(c.birth_date || '')
    setExistingId(c.id)
    setShowCustList(false)
    setRedeemType(null)
    setRedeemFormulaId('')
    setUseWelcome(false)
  }

  async function saveOrder() {
    if (savingRef.current) return // กันกดซ้ำ — เช็คทันทีไม่รอ React re-render
    if (!customerName.trim()) return alert('กรอกชื่อลูกค้าก่อนค่ะ')
    if (items.every(it => !it.formula_id)) return alert('เลือกสินค้าอย่างน้อย 1 รายการ')
    if (redeemType === 'perfume_2ml' && !redeemFormulaId) return alert('เลือกกลิ่นที่จะแถม 2ml ก่อนค่ะ')
    const isExternal = !QR_CHANNELS.includes(channel)
    savingRef.current = true
    setSaving(true)
    try {
      let customerId = existingId
      let customerRow = null
      if (!customerId) {
        const { data: newCust, error: custErr } = await supabase
          .from('customers')
          .insert({ name: customerName.trim(), contact: customerContact.trim() || null,
            address: customerAddress.trim() || null, birth_date: customerBirth || null })
          .select().single()
        if (custErr) throw custErr
        customerId = newCust.id
        customerRow = newCust
      } else {
        // ถ้าลูกค้าเดิมแก้ที่อยู่ใหม่ ให้อัปเดตด้วย
        const { data: updated } = await supabase.from('customers')
          .update({ address: customerAddress.trim() || null, birth_date: customerBirth || null })
          .eq('id', customerId).select().single()
        customerRow = updated
      }

      const status = isExternal ? 'paid' : 'pending'
      // ค่าจริงจะถูกคำนวณหลัง insert order (รวมเศษสะสมเดิม) แล้วอัปเดตกลับเข้า order อีกที
      let pointsEarned = 0
      let remainderAfter = customerRow?.point_remainder ?? 0

      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert({ customer_id: customerId, total_amount: total, notes: notes || null,
          status, channel, points_earned: pointsEarned,
          promptpay_number: isExternal ? null : promptpay.trim(), shipping_fee: shippingAmount })
        .select().single()
      if (orderErr) throw orderErr

      const validItems = items.filter(it => it.formula_id)
      const itemRows = validItems.map(it => {
        const originalPrice = parseFloat(it.original_price) || parseFloat(it.unit_price) || 0
        const qty = parseInt(it.qty) || 1
        const finalPrice = itemFinalPrice(it)
        return {
          order_id: order.id,
          formula_id: parseInt(it.formula_id),
          bottle_ml: it.bottle_ml || null,
          qty: qty,
          original_price: originalPrice,
          discount_type: it.discount_type || null,
          discount_value: it.discount_value ? parseFloat(it.discount_value) : 0,
          discount_reason: it.discount_reason || null,
          unit_price: finalPrice,
          subtotal: finalPrice * qty,
        }
      })

      // ของแถมจากการแลกแต้ม (น้ำหอม 2ml ฟรี)
      if (redeemType === 'perfume_2ml' && redeemFormulaId) {
        itemRows.push({
          order_id: order.id,
          formula_id: parseInt(redeemFormulaId),
          bottle_ml: 2,
          qty: 1,
          original_price: 0,
          discount_type: null,
          discount_value: 0,
          discount_reason: 'แลกแต้มสะสม (ของแถม)',
          unit_price: 0,
          subtotal: 0,
        })
      }

      const { error: itemsErr } = await supabase.from('order_items').insert(itemRows)
      if (itemsErr) throw itemsErr

      // ช่องทางนอกแอป = จ่ายแล้วจริง → ตัดสต็อก + ให้แต้มทันที
      if (isExternal) {
        const stockResult = await db.deductStockForOrder(order.id)
        if (!stockResult.success) {
          alert(`บันทึกออเดอร์แล้ว แต่ตัดสต็อกไม่สำเร็จ: ${stockResult.error}\nกรุณาตัดสต็อกเองในหน้า Production`)
        }
      }

      // ── แต้มสะสม: ทุกอย่างผ่าน ledger (แต้มหมดอายุแบบก้อน) ──
      // การได้แต้มจากออเดอร์ + โบนัสวันเกิด ให้เฉพาะช่องทางนอกแอป (จ่ายแล้วจริง)
      // ช่องทางในแอปจะได้แต้มตอนยืนยันจ่าย (จัดการที่หน้ายืนยัน)
      if (isExternal) {
        if (POINTS_ELIGIBLE_CHANNELS.includes(channel)) {
          const r = await db.earnPointsFromPurchase(customerId, total,
            { orderId: order.id, note: `ออเดอร์ #${order.id}` })
          if (!r.ok) {
            alert(`บันทึกออเดอร์แล้ว แต่ให้แต้มไม่สำเร็จ: ${r.error}\nกรุณาเช็ค RLS ของ loyalty_ledger`)
          } else {
            pointsEarned = r.points
            remainderAfter = r.remainder
            await supabase.from('orders').update({ points_earned: pointsEarned }).eq('id', order.id)
          }
        }
        // โบนัสวันเกิด — ให้ครั้งเดียวต่อเดือนเกิด (กันซ้ำด้วย note ที่ผูกปี+เดือน)
        if (birthdayEligible) {
          const tag = `birthday:${customerId}:${new Date().getFullYear()}-${new Date().getMonth() + 1}`
          const { data: already } = await supabase.from('loyalty_ledger')
            .select('id').eq('kind', 'birthday').eq('note', tag).maybeSingle()
          if (!already) {
            await db.earnPoints(customerId, BIRTHDAY_BONUS_POINTS,
              { kind: 'birthday', orderId: order.id, note: tag })
          }
        }
      }

      // แลกแต้ม: หัก 20 แต้มผ่าน ledger + บันทึกประวัติการแลก (ทำทันทีไม่รอจ่าย)
      if (redeemType) {
        const r = await db.spendPoints(customerId, REDEEM_POINTS_COST,
          { orderId: order.id, note: `แลก ${redeemType}` })
        if (!r.ok) {
          alert(`⚠️ บันทึกออเดอร์แล้ว แต่หักแต้มไม่สำเร็จ: ${r.error}\nกรุณาเช็ค RLS ของ loyalty_ledger`)
        }
        const redeemedFormulaName = redeemType === 'perfume_2ml'
          ? formulas.find(f => f.id === parseInt(redeemFormulaId))?.name : null
        await supabase.from('loyalty_redemptions').insert({
          customer_id: customerId,
          reward_type: redeemType,
          reward_detail: redeemedFormulaName,
          points_used: REDEEM_POINTS_COST,
          order_id: order.id,
        })
      }

      // Welcome Gift: mark ว่าใช้แล้ว (กันใช้ซ้ำ) — เฉพาะเมื่อกดใช้จริงและลูกค้ายังไม่เคยใช้
      if (welcomeDiscount > 0) {
        await supabase.from('customers')
          .update({ welcome_used: true })
          .eq('id', customerId)
          .select('id')
      }

      setSavedOrder({ ...order, customer_name: customerName, items: itemRows, isExternal, pointsEarned,
        remainderAfter, redeemType, welcomeDiscount, birthdayBonus: (isExternal && birthdayEligible) ? BIRTHDAY_BONUS_POINTS : 0 })
      onOrderSaved?.()
    } catch (e) {
      alert('บันทึกไม่สำเร็จ: ' + e.message)
    }
    savingRef.current = false
    setSaving(false)
  }

  if (savedOrder) {
    if (savedOrder.isExternal) {
      return (
        <ExternalSaleResult order={savedOrder} formulas={formulas} onNewOrder={() => onSaved()}
          onViewHistory={onViewHistory}/>
      )
    }
    return (
      <OrderQrResult order={savedOrder} formulas={formulas} promptpay={promptpay}
        onNewOrder={() => onSaved()} onViewHistory={onViewHistory}/>
    )
  }

  return (
    <div style={{ background:S.white, borderRadius:14, border:`1px solid ${S.border}`,
      padding:16, marginBottom:20 }}>

      {/* ช่องทางขาย */}
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:11, color:S.textMid, marginBottom:6, fontWeight:500,
          textTransform:'uppercase', letterSpacing:.5 }}>ช่องทางขาย</div>
        <select value={channel} onChange={e => setChannel(e.target.value)} style={inputStyle}>
          {CHANNELS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        {QR_CHANNELS.includes(channel) && channel !== 'app' && (
          <div style={{ fontSize:11, color:S.textLt, marginTop:4 }}>
            💡 ทักแชทขายผ่าน {CHANNELS.find(c=>c.value===channel)?.label} — ยังต้องสร้าง QR ให้ลูกค้าสแกนจ่ายเหมือนเดิม
            {POINTS_ELIGIBLE_CHANNELS.includes(channel) ? ' (ให้แต้มสะสมด้วย)' : ''}
          </div>
        )}
        {!QR_CHANNELS.includes(channel) && (
          <div style={{ fontSize:11, color:S.textLt, marginTop:4 }}>
            💡 ลูกค้าจ่ายผ่าน {CHANNELS.find(c=>c.value===channel)?.label} แล้ว (มีระบบจ่ายเงินในแพลตฟอร์ม) — ระบบจะ mark ว่าจ่ายแล้วและตัดสต็อกทันที ไม่ต้องสร้าง QR
            {POINTS_ELIGIBLE_CHANNELS.includes(channel) ? ' พร้อมให้แต้มสะสม' : ' (ช่องทางนี้ไม่ให้แต้มสะสม)'}
          </div>
        )}
      </div>

      {/* ลูกค้า */}
      <div style={{ marginBottom:14, position:'relative' }}>
        <div style={{ fontSize:11, color:S.textMid, marginBottom:6, fontWeight:500,
          textTransform:'uppercase', letterSpacing:.5 }}>ลูกค้า</div>
        <input value={customerName}
          onChange={e => { setCustomerName(e.target.value); setExistingId(null); setShowCustList(true); setRedeemType(null) }}
          onFocus={() => setShowCustList(true)}
          placeholder="ชื่อลูกค้า (หรือพิมพ์เบอร์โทรค้นหาได้)" style={inputStyle}/>
        {existingId && (
          <div style={{ fontSize:11, color:S.green, fontWeight:600, marginTop:5 }}>
            ✓ ลูกค้าเดิม — ใช้ข้อมูล/แต้มสะสมที่มีอยู่แล้ว
          </div>
        )}
        {showCustList && (customerName.trim() || customerContact.trim()) && !existingId && (
          <div style={{ position:'absolute', top:'100%', left:0, right:0, zIndex:20,
            background:S.white, border:`1px solid ${S.gold}`, borderRadius:10,
            maxHeight:160, overflowY:'auto', boxShadow:'0 6px 18px rgba(0,0,0,0.08)' }}>
            {customers.filter(c => {
              const qName = customerName.toLowerCase()
              const qContact = customerContact.toLowerCase()
              return (qName && (c.name.toLowerCase().includes(qName) || (c.contact || '').toLowerCase().includes(qName)))
                || (qContact && (c.contact || '').toLowerCase().includes(qContact))
            }).slice(0,5).map(c => (
                <div key={c.id} onClick={() => pickCustomer(c)}
                  style={{ padding:'8px 12px', cursor:'pointer', fontSize:13,
                    borderBottom:`1px solid ${S.border}`, display:'flex',
                    justifyContent:'space-between', alignItems:'center' }}>
                  <span>{c.name} {c.contact && <span style={{ color:S.textLt }}>· {c.contact}</span>}</span>
                  {c.loyalty_points > 0 && (
                    <span style={{ fontSize:11, color:S.gold, fontWeight:600 }}>🏆 {c.loyalty_points}</span>
                  )}
                </div>
              ))}
            {customers.filter(c => {
              const qName = customerName.toLowerCase()
              const qContact = customerContact.toLowerCase()
              return (qName && (c.name.toLowerCase().includes(qName) || (c.contact || '').toLowerCase().includes(qName)))
                || (qContact && (c.contact || '').toLowerCase().includes(qContact))
            }).length === 0 && (
              <div style={{ padding:'8px 12px', fontSize:12, color:S.textLt }}>
                ไม่เจอลูกค้าเดิม — จะสร้างใหม่ให้
              </div>
            )}
          </div>
        )}
        <input value={customerContact}
          onChange={e => { setCustomerContact(e.target.value); setExistingId(null); setShowCustList(true) }}
          onFocus={() => setShowCustList(true)}
          placeholder="เบอร์โทร / LINE" style={{ ...inputStyle, marginTop:8 }}/>
        <textarea value={customerAddress} onChange={e => setCustomerAddress(e.target.value)}
          placeholder="ที่อยู่จัดส่ง (ถ้ามี)" rows={2}
          style={{ ...inputStyle, marginTop:8, resize:'vertical', fontFamily:'Inter,sans-serif' }}/>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:8 }}>
          <span style={{ fontSize:12, color:S.textMid, whiteSpace:'nowrap' }}>🎂 วันเกิด</span>
          <input type="date" value={customerBirth || ''}
            onChange={e => setCustomerBirth(e.target.value)}
            style={{ ...inputStyle, flex:1 }}/>
        </div>
        {birthdayEligible && (
          <div style={{ fontSize:12, color:S.gold, marginTop:6, fontWeight:600 }}>
            🎉 เดือนนี้วันเกิดลูกค้า — จะได้โบนัส +{BIRTHDAY_BONUS_POINTS} แต้ม (เฉพาะช่องทางที่ให้แต้ม)
          </div>
        )}
      </div>

      {/* Welcome Gift — ลูกค้าใหม่/ยังไม่เคยใช้ ลด 100 (กดเลือกเอง) — ต้องซื้อครบ 450 + ยังไม่เกิน 30 วันหลังสมัคร */}
      {welcomeNotUsed && (
        <div style={{ marginBottom:14, padding:'10px 12px',
          background: useWelcome ? S.goldLt : S.white,
          borderRadius:8, border:`1px solid ${useWelcome ? S.gold : S.border}` }}>
          {welcomeEligible ? (
            <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>
              <input type="checkbox" checked={useWelcome}
                onChange={e => setUseWelcome(e.target.checked)}
                style={{ width:16, height:16, cursor:'pointer' }}/>
              <span style={{ fontSize:12.5, fontWeight:700, color: useWelcome ? S.gold : S.textMid }}>
                🎁 Welcome Gift — ลูกค้าใหม่ลด ฿{WELCOME_DISCOUNT} (ใช้ได้ครั้งเดียว)
              </span>
            </label>
          ) : (
            <div style={{ fontSize:11.5, color:S.textLt }}>
              🎁 Welcome Gift — ลด ฿{WELCOME_DISCOUNT} เมื่อซื้อครบ ฿{WELCOME_MIN_PURCHASE} ขึ้นไป
              {!welcomeWithinWindow
                ? ' (หมดสิทธิ์แล้ว — เกิน 30 วันหลังสมัคร)'
                : itemsTotal < WELCOME_MIN_PURCHASE
                  ? ` (ตอนนี้ขาดอีก ฿${(WELCOME_MIN_PURCHASE - itemsTotal).toLocaleString()})`
                  : ''}
            </div>
          )}
        </div>
      )}

      {/* แลกรางวัล — โผล่เมื่อลูกค้าเดิมมีแต้มครบ 20 */}
      {canRedeem && (
        <div style={{ marginBottom:14, padding:'10px 12px', background:S.goldLt,
          borderRadius:8, border:`1px solid ${S.gold}` }}>
          <div style={{ fontSize:12, fontWeight:700, color:S.gold, marginBottom:8 }}>
            🎁 ลูกค้ามี {customerPoints} แต้ม — แลกรางวัลได้แล้ว!
          </div>
          <div style={{ display:'flex', gap:6, marginBottom: redeemType ? 8 : 0 }}>
            {[
              { v:'discount_100',  label:'ส่วนลด ฿100' },
              { v:'perfume_2ml',   label:'น้ำหอม 2ml' },
              { v:'free_shipping', label:'ส่งฟรี' },
            ].map(opt => (
              <button key={opt.v}
                onClick={() => setRedeemType(redeemType === opt.v ? null : opt.v)}
                style={{ flex:1, padding:'8px 0', borderRadius:8, cursor:'pointer',
                  fontSize:11.5, fontWeight:600,
                  border:`1.5px solid ${redeemType === opt.v ? S.gold : S.border}`,
                  background: redeemType === opt.v ? S.gold : S.white,
                  color: redeemType === opt.v ? '#fff' : S.textMid }}>
                {opt.label}
              </button>
            ))}
          </div>
          {redeemType === 'perfume_2ml' && (
            <select value={redeemFormulaId} onChange={e => setRedeemFormulaId(e.target.value)}
              style={{ ...inputStyle, fontSize:12 }}>
              <option value="">-- เลือกกลิ่นที่จะแถม 2ml --</option>
              {formulas.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          )}
          {redeemType && (
            <div style={{ fontSize:10.5, color:S.textMid, marginTop:6 }}>
              จะหัก {REDEEM_POINTS_COST} แต้มตอนบันทึกออเดอร์ (เหลือ {customerPoints - REDEEM_POINTS_COST} แต้ม)
            </div>
          )}
        </div>
      )}

      {/* รายการสินค้า */}
      <div style={{ fontSize:11, color:S.textMid, marginBottom:6, fontWeight:500,
        textTransform:'uppercase', letterSpacing:.5 }}>รายการสินค้า</div>
      {items.map((it, i) => (
        <div key={i} style={{ marginBottom:12, border:`1px solid ${S.border}`, borderRadius:8, padding:10, background:S.bg }}>
          {/* แถว 1: เลือกกลิ่น (เต็มแถว) */}
          <div style={{ display:'flex', gap:6, alignItems:'center', marginBottom:8 }}>
            <select value={it.formula_id} onChange={e => updateItem(i, 'formula_id', e.target.value)}
              style={{ ...inputStyle, flex:1, minWidth:0 }}>
              <option value="">-- เลือกกลิ่น --</option>
              <optgroup label="Original">
                {formulas.filter(f => (f.formula_type || 'original') === 'original')
                  .map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </optgroup>
              <optgroup label="Inspired">
                {formulas.filter(f => f.formula_type === 'inspired')
                  .map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </optgroup>
            </select>
            {items.length > 1 && (
              <button onClick={() => removeItem(i)}
                style={{ background:'none', border:'none', color:S.textLt, cursor:'pointer',
                  fontSize:18, flexShrink:0, padding:'0 4px' }}>×</button>
            )}
          </div>

          {/* แถว 2: ml / จำนวน / ราคาเต็ม */}
          <div style={{ display:'flex', gap:6, marginBottom:4 }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:9.5, color:S.textLt, textTransform:'uppercase',
                letterSpacing:.3, marginBottom:3 }}>ขนาด (ml)</div>
              <select value={it.bottle_ml} onChange={e => updateItem(i, 'bottle_ml', e.target.value)}
                style={{ ...inputStyle, width:'100%', boxSizing:'border-box' }}>
                {BOTTLE_SIZES.map(ml => <option key={ml} value={ml}>{ml} ml</option>)}
              </select>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:9.5, color:S.textLt, textTransform:'uppercase',
                letterSpacing:.3, marginBottom:3 }}>จำนวน</div>
              <input type="number" value={it.qty} onChange={e => updateItem(i, 'qty', e.target.value)}
                placeholder="จำนวน" style={{ ...inputStyle, width:'100%', boxSizing:'border-box' }}/>
            </div>
            <div style={{ flex:1.2, minWidth:0 }}>
              <div style={{ fontSize:9.5, color:S.textLt, textTransform:'uppercase',
                letterSpacing:.3, marginBottom:3 }}>ราคาเต็ม</div>
              <input type="number" value={it.unit_price} onChange={e => updateItem(i, 'unit_price', e.target.value)}
                placeholder="ราคาเต็ม" style={{ ...inputStyle, width:'100%', boxSizing:'border-box' }}/>
            </div>
          </div>

          {/* Discount Section */}
          <div style={{ padding:'10px 12px', background:'#fff', borderRadius:6,
            border:`1px solid ${S.border}` }}>
            <div style={{ fontSize:10, fontWeight:600, color:S.textMid,
              textTransform:'uppercase', letterSpacing:.5, marginBottom:8 }}>
              ส่วนลด (optional)
            </div>
            
            <div style={{ display:'flex', gap:8, marginBottom:8 }}>
              {/* Original Price */}
              <div style={{ flex:1 }}>
                <label style={{ fontSize:10, color:S.textLt }}>ราคาปกติ</label>
                <input
                  type="number"
                  value={it.original_price || it.unit_price || ''}
                  onChange={e => updateItem(i, 'original_price', e.target.value)}
                  placeholder={it.unit_price}
                  style={{ ...inputStyle, fontSize:12 }}
                />
              </div>
              
              {/* Discount Type */}
              <div style={{ flex:0.8 }}>
                <label style={{ fontSize:10, color:S.textLt }}>ชนิด</label>
                <select
                  value={it.discount_type || ''}
                  onChange={e => updateItem(i, 'discount_type', e.target.value || null)}
                  style={{ ...inputStyle, fontSize:12 }}>
                  <option value="">ไม่มี</option>
                  <option value="fixed">บาท</option>
                  <option value="percent">%</option>
                </select>
              </div>
              
              {/* Discount Value */}
              <div style={{ flex:0.8 }}>
                <label style={{ fontSize:10, color:S.textLt }}>จำนวน</label>
                <input
                  type="number"
                  value={it.discount_value || ''}
                  onChange={e => updateItem(i, 'discount_value', e.target.value)}
                  placeholder="0"
                  disabled={!it.discount_type}
                  style={{ ...inputStyle, fontSize:12, opacity: it.discount_type ? 1 : 0.5 }}
                />
              </div>
            </div>
            
            {/* Discount Reason */}
            <input
              type="text"
              value={it.discount_reason || ''}
              onChange={e => updateItem(i, 'discount_reason', e.target.value)}
              placeholder="เหตุผล (summer sale, loyal customer, etc)"
              style={{ ...inputStyle, fontSize:12, marginBottom:8 }}
            />
            
            {/* Display calculated price */}
            {it.discount_type && (() => {
              const baseOriginal = parseFloat(it.original_price) || parseFloat(it.unit_price) || 0
              const discountVal  = parseFloat(it.discount_value) || 0
              const finalPrice   = it.discount_type === 'fixed'
                ? baseOriginal - discountVal
                : baseOriginal * (1 - discountVal / 100)
              return (
                <div style={{ padding:'8px', background:S.goldLt, borderRadius:6,
                  fontSize:11, color:S.ink }}>
                  {it.discount_type === 'fixed' ? (
                    <>ราคาเก่า {baseOriginal} - {discountVal} = <strong>{finalPrice.toFixed(2)}</strong> บาท</>
                  ) : (
                    <>ราคาเก่า {baseOriginal} × (1 - {discountVal}%) = <strong>{finalPrice.toFixed(2)}</strong> บาท</>
                  )}
                </div>
              )
            })()}
          </div>
        </div>
      ))}
      <button onClick={addItem}
        style={{ fontSize:12, color:S.gold, background:'none', border:'none',
          cursor:'pointer', fontWeight:600, marginBottom:14, padding:0 }}>
        + เพิ่มรายการ
      </button>

      <input value={notes} onChange={e => setNotes(e.target.value)}
        placeholder="หมายเหตุ (ถ้ามี)" style={{ ...inputStyle, marginBottom:14 }}/>

      {/* ค่าจัดส่ง */}
      <div style={{ marginBottom:14, padding:'10px 12px', background:S.bg, borderRadius:8 }}>
        <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer',
          fontSize:13, color:S.ink }}>
          <input type="checkbox" checked={hasShipping}
            onChange={e => setHasShipping(e.target.checked)}/>
          ลูกค้าต้องเสียค่าส่ง
        </label>
        {hasShipping && (
          <input type="number" value={shippingFee} onChange={e => setShippingFee(e.target.value)}
            placeholder="ค่าส่ง (บาท)" style={{ ...inputStyle, marginTop:8 }}/>
        )}
        {!hasShipping && (
          <div style={{ fontSize:11, color:S.textLt, marginTop:4 }}>ลูกค้าคนนี้ไม่เสียค่าส่ง</div>
        )}
      </div>

      {QR_CHANNELS.includes(channel) && (
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:11, color:S.textMid, marginBottom:6, fontWeight:500,
            textTransform:'uppercase', letterSpacing:.5 }}>เบอร์พร้อมเพย์ร้าน</div>
          <input value={promptpay} onChange={e => setPromptpay(e.target.value)}
            placeholder="เช่น 0812345678" style={inputStyle}/>
        </div>
      )}

      <div style={{ padding:'10px 0', borderTop:`1px solid ${S.border}`, marginBottom:14 }}>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:12.5,
          color:S.textMid, marginBottom:4 }}>
          <span>ค่าสินค้า</span><span>฿{itemsTotal.toLocaleString()}</span>
        </div>
        {hasShipping && redeemType !== 'free_shipping' && (
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:12.5,
            color:S.textMid, marginBottom:4 }}>
            <span>ค่าจัดส่ง</span><span>฿{shippingAmount.toLocaleString()}</span>
          </div>
        )}
        {hasShipping && redeemType === 'free_shipping' && (
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:12.5,
            color:S.green, marginBottom:4 }}>
            <span>ค่าจัดส่ง (แลกแต้มฟรี)</span><span>฿0</span>
          </div>
        )}
        {redeemDiscount > 0 && (
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:12.5,
            color:S.green, marginBottom:4 }}>
            <span>ส่วนลดแลกแต้ม</span><span>-฿{redeemDiscount.toLocaleString()}</span>
          </div>
        )}
        {welcomeDiscount > 0 && (
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:12.5,
            color:S.green, marginBottom:4 }}>
            <span>🎁 Welcome Gift</span><span>-฿{welcomeDiscount.toLocaleString()}</span>
          </div>
        )}
        {redeemType === 'perfume_2ml' && redeemFormulaId && (
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:12.5,
            color:S.green, marginBottom:4 }}>
            <span>ของแถม: {formulas.find(f=>f.id===parseInt(redeemFormulaId))?.name} 2ml</span><span>ฟรี</span>
          </div>
        )}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
          paddingTop:8, marginTop:4, borderTop:`1px solid ${S.border}` }}>
          <span style={{ fontSize:13, color:S.textMid }}>ยอดรวม</span>
          <span style={{ fontSize:20, fontWeight:700, color:S.gold,
            fontFamily:'Cormorant Garamond,serif' }}>฿{total.toLocaleString()}</span>
        </div>
        {total > 0 && calcPoints(total, channel, selectedCustomer?.point_remainder) > 0 && (
          <div style={{ fontSize:11, color:S.gold, textAlign:'right', marginTop:4 }}>
            🏆 ลูกค้าจะได้ {calcPoints(total, channel, selectedCustomer?.point_remainder)} แต้ม
            {calcRemainder(total, channel, selectedCustomer?.point_remainder) > 0 && (
              <> · เก็บเศษ ฿{calcRemainder(total, channel, selectedCustomer?.point_remainder).toLocaleString()} ไว้รวมครั้งหน้า</>
            )}
          </div>
        )}
        {total > 0 && calcPoints(total, channel, selectedCustomer?.point_remainder) === 0 && (
          <div style={{ fontSize:11, color:S.textLt, textAlign:'right', marginTop:4 }}>
            {POINTS_ELIGIBLE_CHANNELS.includes(channel)
              ? `ยังไม่ครบ 50 บาท (เก็บเศษ ฿${calcRemainder(total, channel, selectedCustomer?.point_remainder).toLocaleString()} ไว้รวมครั้งหน้า)`
              : 'ช่องทางนี้ไม่ให้แต้มสะสม (บันทึกยอดขายเฉยๆ)'}
          </div>
        )}
      </div>

      <Btn onClick={saveOrder}
        disabled={saving || (QR_CHANNELS.includes(channel) && !promptpay.trim())}
        style={{ width:'100%' }}>
        {saving ? '⏳ กำลังบันทึก...'
          : (QR_CHANNELS.includes(channel) && !promptpay.trim()) ? 'กรอกเบอร์พร้อมเพย์ก่อน'
          : QR_CHANNELS.includes(channel) ? '✓ บันทึกออเดอร์ + สร้าง QR'
          : '✓ บันทึกยอดขาย (จ่ายแล้ว)'}
      </Btn>
    </div>
  )
}

// ── ผลลัพธ์เมื่อบันทึกยอดขายจากช่องทางนอกแอป (ไม่มี QR เพราะจ่ายแล้ว) ──────────────
function ExternalSaleResult({ order, formulas, onNewOrder, onViewHistory }) {
  const channelLabel = CHANNELS.find(c => c.value === order.channel)?.label || order.channel
  return (
    <div style={{ background:S.white, borderRadius:14, border:`1px solid ${S.border}`,
      padding:20, marginBottom:20, textAlign:'center' }}>
      <div style={{ fontSize:32, marginBottom:8 }}>✓</div>
      <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:20, fontStyle:'italic',
        color:S.ink, marginBottom:4 }}>บันทึกยอดขายแล้ว</div>
      <div style={{ fontSize:12, color:S.textLt, marginBottom:16 }}>
        ช่องทาง: {channelLabel} · ลูกค้า: {order.customer_name}
      </div>

      <div style={{ textAlign:'left', background:S.bg, borderRadius:10, padding:'10px 14px',
        marginBottom:14 }}>
        {order.items.map((it, i) => {
          const f = formulas.find(x => x.id === it.formula_id)
          return (
            <div key={i} style={{ display:'flex', justifyContent:'space-between',
              fontSize:12.5, color:S.ink, padding:'4px 0' }}>
              <span>{f?.name || '-'} × {it.qty}</span>
              <span>฿{it.subtotal.toLocaleString()}</span>
            </div>
          )
        })}
      </div>

      <div style={{ fontSize:20, fontWeight:700, color:S.gold,
        fontFamily:'Cormorant Garamond,serif' }}>฿{order.total_amount.toLocaleString()}</div>

      {order.pointsEarned > 0 && (
        <div style={{ fontSize:12.5, color:S.gold, marginTop:8, fontWeight:600 }}>
          🏆 ลูกค้าได้รับ {order.pointsEarned} แต้ม
        </div>
      )}
      {order.remainderAfter > 0 && (
        <div style={{ fontSize:11, color:S.textLt, marginTop:4 }}>
          เก็บเศษยอดซื้อ ฿{order.remainderAfter.toLocaleString()} ไว้รวมกับการซื้อครั้งหน้า
        </div>
      )}

      <Btn onClick={onNewOrder} style={{ width:'100%', marginTop:18 }}>+ บันทึกรายการต่อไป</Btn>
      {onViewHistory && (
        <button onClick={onViewHistory}
          style={{ width:'100%', marginTop:8, padding:'9px 0', borderRadius:10, cursor:'pointer',
            fontSize:12.5, fontWeight:600, fontFamily:'Inter,sans-serif',
            border:`1.5px solid ${S.border}`, background:'transparent', color:S.textMid }}>
          ดูประวัติ →
        </button>
      )}
    </div>
  )
}

// ── ผลลัพธ์ QR หลังบันทึก ─────────────────────────────────────────────────────
const BRAND = {
  cream:  '#EDE6DA',
  taupe:  '#D6CBB8',
  mocha:  '#A89A8A',
  brown:  '#7A6E60',
}

const SOCIALS = [
  { label:'Facebook',  handle:'Linen Theory',        url:'https://www.facebook.com/Linentheory',
    icon:'M14 8a6 6 0 1 0-6.9 5.93V9.9H5.6V8h1.5V6.7c0-1.5.9-2.3 2.2-2.3.6 0 1.2.05 1.4.07v1.6h-.97c-.76 0-.9.36-.9.89V8h1.8l-.24 1.9H8.85v4.03A6 6 0 0 0 14 8z' },
  { label:'Instagram', handle:'@linentheory.official', url:'https://www.instagram.com/linentheory.official/?hl=en',
    icon:'M8 2.2c1.6 0 1.8 0 2.4.05 1.2.06 2 .26 2.6.5.66.27 1.13.6 1.6 1.1.5.5.85.95 1.1 1.6.24.6.44 1.4.5 2.6.04.6.05.8.05 2.4s0 1.8-.05 2.4c-.06 1.2-.26 2-.5 2.6-.27.66-.6 1.13-1.1 1.6-.5.5-.95.85-1.6 1.1-.6.24-1.4.44-2.6.5-.6.04-.8.05-2.4.05s-1.8 0-2.4-.05c-1.2-.06-2-.26-2.6-.5-.66-.27-1.13-.6-1.6-1.1-.5-.5-.85-.95-1.1-1.6-.24-.6-.44-1.4-.5-2.6C2.2 9.8 2.2 9.6 2.2 8s0-1.8.05-2.4c.06-1.2.26-2 .5-2.6.27-.66.6-1.13 1.1-1.6.5-.5.95-.85 1.6-1.1.6-.24 1.4-.44 2.6-.5C6.2 2.2 6.4 2.2 8 2.2zM8 5.8a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4z' },
  { label:'TikTok',    handle:'@linentheory',         url:'https://www.tiktok.com/@linentheory',
    icon:'M9 2h2.2c.2 1.6 1.3 2.9 2.8 3.3v2.2c-1-.1-2-.4-2.8-1v5.6c0 2.5-2 4.4-4.4 4.4S2.4 14.6 2.4 12.1c0-2.4 1.9-4.3 4.2-4.4v2.2c-1.1.1-2 1.1-2 2.2 0 1.2 1 2.2 2.2 2.2s2.2-1 2.2-2.2V2z' },
  { label:'Line OA',   handle:'@807kmyan',            url:'https://line.me/R/ti/p/@807kmyan',
    icon:'M8 1.5c-3.6 0-6.5 2.4-6.5 5.4 0 2.7 2.3 4.9 5.4 5.3-.1.4-.5 1.6-.6 1.9-.1.3.1.3.3.2.1-.1 1.7-1.1 2.4-1.6.3 0 .6.05.9.05 3.6 0 6.5-2.4 6.5-5.4S11.6 1.5 8 1.5z' },
]

function OrderQrResult({ order, formulas, promptpay, onNewOrder, onViewHistory }) {
  const qrUrl = getPromptPayQrUrl(promptpay, order.total_amount)
  const payUrl = `${PRODUCTION_URL}/pay/${order.id}`
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const cardRef = useRef()

  function copyLink() {
    navigator.clipboard.writeText(payUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  async function saveAsImage() {
    setSaving(true)
    try {
      const html2canvasMod = await import('html2canvas')
      const html2canvas = html2canvasMod.default || html2canvasMod
      const canvas = await html2canvas(cardRef.current, { scale:3, useCORS:true, backgroundColor:BRAND.cream })
      const a = document.createElement('a')
      a.download = `order-${order.id}-qr.png`
      a.href = canvas.toDataURL('image/png')
      a.click()
    } catch (e) {
      alert('บันทึกรูปไม่สำเร็จ: ' + e.message)
    }
    setSaving(false)
  }

  return (
    <div style={{ marginBottom:20 }}>

      {/* ปุ่มหลัก — บันทึกเป็นรูปส่ง LINE (แนะนำ เพราะลูกค้าไทยระแวงลิงก์) */}
      <button onClick={saveAsImage} disabled={saving}
        style={{ width:'100%', padding:'12px 0', borderRadius:10, cursor:'pointer',
          fontFamily:'Inter,sans-serif', fontSize:13, fontWeight:600, marginBottom:10,
          background:S.gold, border:'none', color:'#fff', opacity:saving?0.6:1 }}>
        {saving ? '⏳ กำลังบันทึก...' : '📷 บันทึกเป็นรูปเพื่อส่ง LINE (แนะนำ)'}
      </button>
      <div style={{ fontSize:11, color:S.textLt, textAlign:'center', marginBottom:16 }}>
        ได้รูปการ์ด QR สวยๆ ส่งทาง LINE ได้เลย ไม่มีลิงก์ให้ลูกค้าระแวง
      </div>

      <div ref={cardRef} style={{ background:BRAND.cream, borderRadius:18, padding:'32px 24px',
        textAlign:'center', border:`1px solid ${BRAND.taupe}` }}>

      <div style={{ fontSize:17, fontWeight:600, color:BRAND.brown, letterSpacing:4 }}>
        LINEN THEORY
      </div>
      <div style={{ fontSize:10, color:BRAND.mocha, fontStyle:'italic', letterSpacing:1, marginTop:2 }}>
        the art of scent
      </div>
      <div style={{ fontSize:10, color:BRAND.mocha, marginTop:10 }}>✦</div>
      <div style={{ fontSize:14, color:BRAND.brown, marginTop:10, fontFamily:'Cormorant Garamond,serif',
        fontStyle:'italic' }}>
        Thank you for your order ♡
      </div>

      {/* QR card */}
      <div style={{ background:'#fff', borderRadius:14, padding:18, margin:'18px auto 14px',
        maxWidth:240, border:`1px solid ${BRAND.taupe}` }}>
        <img src={qrUrl} alt="PromptPay QR" style={{ width:'100%', display:'block' }}/>
      </div>

      <div style={{ fontSize:13, color:BRAND.brown, fontWeight:500 }}>Scan to Pay via PromptPay</div>
      <div style={{ fontSize:12, color:BRAND.mocha, marginTop:2 }}>Gel / Linen Theory</div>
      <div style={{ fontSize:22, fontWeight:700, color:BRAND.brown,
        fontFamily:'Cormorant Garamond,serif', marginTop:10 }}>
        ฿{order.total_amount.toLocaleString()}
      </div>

      {/* รายการสินค้า */}
      <div style={{ textAlign:'left', margin:'18px 0', fontSize:12, color:BRAND.brown,
        background:'#fff', borderRadius:10, padding:'10px 14px' }}>
        {order.items.map((it, i) => {
          const f = formulas.find(x => x.id === it.formula_id)
          return (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'4px 0' }}>
              <span>{f?.name || '-'} × {it.qty}</span>
              <span>฿{it.subtotal.toLocaleString()}</span>
            </div>
          )
        })}
        {order.shipping_fee > 0 && (
          <div style={{ display:'flex', justifyContent:'space-between', padding:'4px 0',
            borderTop:`1px dashed ${BRAND.taupe}`, marginTop:4, color:BRAND.mocha }}>
            <span>ค่าจัดส่ง</span>
            <span>฿{order.shipping_fee.toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* divider */}
      <div style={{ display:'flex', alignItems:'center', gap:10, margin:'20px 0 16px' }}>
        <div style={{ flex:1, height:1, background:BRAND.taupe }}/>
        <span style={{ fontSize:11, color:BRAND.mocha, whiteSpace:'nowrap' }}>Stay connected with us ♡</span>
        <div style={{ flex:1, height:1, background:BRAND.taupe }}/>
      </div>

      {/* social row — โทนสีเดียวกันหมด ไม่มีสีแบรนด์โดด */}
      <div style={{ display:'flex', justifyContent:'center', gap:18, marginBottom:6 }}>
        {SOCIALS.map(s => (
          <a key={s.label} href={s.url} target="_blank" rel="noreferrer"
            style={{ textDecoration:'none', color:BRAND.brown, display:'flex',
              flexDirection:'column', alignItems:'center', gap:6, width:78 }}>
            <div style={{ width:36, height:36, borderRadius:'50%', background:'#fff',
              border:`1px solid ${BRAND.taupe}`, display:'flex', alignItems:'center',
              justifyContent:'center' }}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill={BRAND.brown}><path d={s.icon}/></svg>
            </div>
            <div style={{ fontSize:9.5, fontWeight:600 }}>{s.label}</div>
            <div style={{ fontSize:8.5, color:BRAND.mocha, whiteSpace:'nowrap',
              overflow:'hidden', textOverflow:'ellipsis', maxWidth:78 }}>{s.handle}</div>
          </a>
        ))}
      </div>
      </div>

      {/* ลิงก์ — ตัวเลือกเสริม เผื่ออยากให้ลูกค้าดูรายละเอียดเพิ่มเอง */}
      <details style={{ marginTop:14 }}>
        <summary style={{ fontSize:11, color:S.textLt, cursor:'pointer' }}>
          หรือใช้ลิงก์แทน (ทางเลือกเสริม)
        </summary>
        <div style={{ marginTop:8, background:S.white, borderRadius:10, padding:'10px 12px',
          border:`1px solid ${S.border}` }}>
          <div style={{ fontSize:10.5, color:S.gold, wordBreak:'break-all', marginBottom:8,
            fontFamily:'monospace' }}>{payUrl}</div>
          <button onClick={copyLink}
            style={{ width:'100%', padding:'7px 0', borderRadius:8, cursor:'pointer',
              fontFamily:'Inter,sans-serif', fontSize:11, fontWeight:600,
              background: copied ? S.green : 'transparent',
              border:`1px solid ${copied ? S.green : S.border}`,
              color: copied ? '#fff' : S.textMid }}>
            {copied ? '✓ คัดลอกแล้ว' : '📋 คัดลอกลิงก์'}
          </button>
        </div>
      </details>

      <Btn onClick={onNewOrder} style={{ width:'100%', marginTop:16 }}>+ สร้างออเดอร์ใหม่</Btn>
      {onViewHistory && (
        <button onClick={onViewHistory}
          style={{ width:'100%', marginTop:8, padding:'9px 0', borderRadius:10, cursor:'pointer',
            fontSize:12.5, fontWeight:600, fontFamily:'Inter,sans-serif',
            border:`1.5px solid ${S.border}`, background:'transparent', color:S.textMid }}>
          ดูประวัติ →
        </button>
      )}
    </div>
  )
}

// ── การ์ดออเดอร์เดี่ยว (ใช้ซ้ำในกลุ่มลูกค้า) ──────────────────────────────────────
function OrderCard({ o, cust, formulaName, isOpen, onToggle, onMarkPaid, copiedId, onCopyLink }) {
  const statusColor = o.status === 'paid' ? S.green : o.status === 'cancelled' ? S.red : S.gold
  const statusBg    = o.status === 'paid' ? '#eef4f0' : o.status === 'cancelled' ? '#fdf0ee' : S.goldLt
  return (
    <div style={{ background:S.bg, border:`1px solid ${S.border}`, borderRadius:8, padding:'10px 12px' }}>
      <div onClick={onToggle}
        style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', cursor:'pointer' }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ fontSize:10, color:S.textLt, fontFamily:'monospace' }}>#{o.id}</span>
            <span style={{ fontSize:10, color:S.textLt, transform: isOpen ? 'rotate(90deg)' : 'none',
              display:'inline-block', transition:'transform 0.15s' }}>›</span>
          </div>
          <div style={{ fontSize:11, color:S.textLt, marginTop:2 }}>{o.order_date}</div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:14, fontWeight:700, color:S.gold,
            fontFamily:'Cormorant Garamond,serif' }}>฿{o.total_amount.toLocaleString()}</div>
          <span style={{ fontSize:9, fontWeight:700, color:statusColor, background:statusBg,
            padding:'2px 8px', borderRadius:10, textTransform:'uppercase' }}>
            {o.status}
          </span>
        </div>
      </div>

      {isOpen && (
        <div style={{ marginTop:10, padding:'10px 12px', background:S.white,
          borderRadius:8, border:`1px solid ${S.border}` }}>
          <div style={{ fontSize:10, color:S.textLt, fontWeight:600,
            textTransform:'uppercase', letterSpacing:.5, marginBottom:6 }}>รายการสินค้า</div>
          {(o.items || []).map((it, idx) => (
            <div key={idx} style={{ display:'flex', justifyContent:'space-between',
              fontSize:12, color:S.ink, padding:'3px 0' }}>
              <span>{formulaName(it.formula_id)} {it.bottle_ml ? `${it.bottle_ml}ml` : ''} × {it.qty}</span>
              <span style={{ color:S.textMid }}>฿{(it.subtotal || 0).toLocaleString()}</span>
            </div>
          ))}
          {o.shipping_fee > 0 && (
            <div style={{ display:'flex', justifyContent:'space-between',
              fontSize:12, color:S.textMid, padding:'3px 0' }}>
              <span>ค่าจัดส่ง</span>
              <span>฿{o.shipping_fee.toLocaleString()}</span>
            </div>
          )}
          <div style={{ display:'flex', justifyContent:'space-between',
            fontSize:11, color:S.textLt, marginTop:6 }}>
            <span>ช่องทาง: {CHANNELS.find(c=>c.value===o.channel)?.label || o.channel || 'แอป'}</span>
            {o.points_earned > 0 && <span style={{ color:S.gold, fontWeight:600 }}>🏆 +{o.points_earned} แต้ม</span>}
          </div>
          {(cust?.address || o.notes) && (
            <div style={{ marginTop:8, paddingTop:8, borderTop:`1px dashed ${S.border}` }}>
              {cust?.address && (
                <div style={{ fontSize:11.5, color:S.textMid, lineHeight:1.5 }}>
                  📍 {cust.address}
                </div>
              )}
              {o.notes && (
                <div style={{ fontSize:11.5, color:S.textLt, marginTop:4, fontStyle:'italic' }}>
                  หมายเหตุ: {o.notes}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div style={{ display:'flex', gap:6, marginTop:8 }}>
        {o.status === 'pending' && (
          <button onClick={(e) => { e.stopPropagation(); onMarkPaid(o.id) }}
            style={{ fontSize:11, color:S.green, background:'none',
              border:`1px solid ${S.green}`, borderRadius:16, padding:'4px 10px',
              cursor:'pointer', fontWeight:600 }}>
            ✓ จ่ายแล้ว
          </button>
        )}
        <button onClick={(e) => { e.stopPropagation(); onCopyLink(o.id) }}
          style={{ fontSize:11, color: copiedId === o.id ? '#fff' : S.textMid,
            background: copiedId === o.id ? S.green : 'none',
            border:`1px solid ${copiedId === o.id ? S.green : S.border}`,
            borderRadius:16, padding:'4px 10px', cursor:'pointer', fontWeight:600 }}>
          {copiedId === o.id ? '✓ คัดลอกแล้ว' : '📋 คัดลอกลิงก์'}
        </button>
      </div>
    </div>
  )
}

// ── ประวัติออเดอร์ — group ตามลูกค้า ────────────────────────────────────────────
function OrderHistory({ orders, customers, formulas, onMarkPaid }) {
  const [copiedId,      setCopiedId]      = useState(null)
  const [expandedGroup, setExpandedGroup] = useState(null) // customer_id ที่เปิดอยู่
  const [expandedOrder, setExpandedOrder] = useState(null) // order_id ที่เปิดอยู่

  function copyOrderLink(orderId) {
    const url = `${PRODUCTION_URL}/pay/${orderId}`
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(orderId)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  function formulaName(id) {
    return formulas.find(f => f.id === id)?.name || '-'
  }

  if (orders.length === 0) {
    return <div style={{ textAlign:'center', padding:30, color:S.textLt, fontSize:13 }}>
      ยังไม่มีออเดอร์
    </div>
  }

  // จัดกลุ่มออเดอร์ตามลูกค้า — เรียงกลุ่มตามวันที่ออเดอร์ล่าสุดของกลุ่มนั้น
  const groupMap = new Map()
  for (const o of orders) {
    const key = o.customer_id ?? `none-${o.id}`
    if (!groupMap.has(key)) groupMap.set(key, [])
    groupMap.get(key).push(o)
  }
  const groups = Array.from(groupMap.entries()).map(([customerId, group]) => {
    const cust = customers.find(c => c.id === group[0].customer_id)
    const totalAmount = group.reduce((s, o) => s + (o.total_amount || 0), 0)
    // แต้มคงเหลือจริง ต้องดึงจาก customers.loyalty_points (อัปเดตหลังหักแลกรางวัลแล้ว)
    // ห้าม sum points_earned ของทุกออเดอร์เอง เพราะจะไม่ตัดแต้มที่แลกไปแล้วออก
    const currentPoints = cust?.loyalty_points || 0
    const latestDate = group[0].order_date // orders มาเรียง desc แล้วจาก loadAll
    const hasPending = group.some(o => o.status === 'pending')
    return { customerId, cust, group, totalAmount, currentPoints, latestDate, hasPending }
  })

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {groups.map(({ customerId, cust, group, totalAmount, currentPoints, latestDate, hasPending }) => {
        const isOpen = expandedGroup === customerId
        return (
          <div key={customerId} style={{ background:S.white, border:`1px solid ${S.border}`,
            borderRadius:10, padding:'12px 14px' }}>
            <div onClick={() => setExpandedGroup(isOpen ? null : customerId)}
              style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start',
                cursor:'pointer' }}>
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ fontSize:13, fontWeight:600, color:S.ink }}>{cust?.name || '-'}</span>
                  <span style={{ fontSize:10, color:S.textMid, background:S.bg, borderRadius:10,
                    padding:'1px 7px', fontWeight:600 }}>{group.length} ออเดอร์</span>
                  {hasPending && <span style={{ fontSize:9, fontWeight:700, color:S.gold,
                    background:S.goldLt, padding:'2px 7px', borderRadius:10 }}>มีรอจ่าย</span>}
                  <span style={{ fontSize:10, color:S.textLt, transform: isOpen ? 'rotate(90deg)' : 'none',
                    display:'inline-block', transition:'transform 0.15s' }}>›</span>
                </div>
                <div style={{ fontSize:11, color:S.textLt, marginTop:2 }}>
                  ล่าสุด {latestDate} {cust?.contact && `· ${cust.contact}`}
                </div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:15, fontWeight:700, color:S.gold,
                  fontFamily:'Cormorant Garamond,serif' }}>฿{totalAmount.toLocaleString()}</div>
                {currentPoints > 0 && (
                  <span style={{ fontSize:10, color:S.gold, fontWeight:600 }}>🏆 {currentPoints} แต้ม</span>
                )}
                {cust?.point_remainder > 0 && (
                  <div style={{ fontSize:9, color:S.textLt, marginTop:1 }}>เศษสะสม ฿{cust.point_remainder}</div>
                )}
              </div>
            </div>

            {isOpen && (
              <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:6 }}>
                {group.map(o => (
                  <OrderCard key={o.id} o={o} cust={cust} formulaName={formulaName}
                    isOpen={expandedOrder === o.id}
                    onToggle={() => setExpandedOrder(expandedOrder === o.id ? null : o.id)}
                    onMarkPaid={onMarkPaid}
                    copiedId={copiedId}
                    onCopyLink={copyOrderLink}/>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── รายชื่อลูกค้าทั้งหมด ─────────────────────────────────────────────────────────
function CustomerList({ customers, orders, onUpdated }) {
  const [search,   setSearch]   = useState('')
  const [sortBy,   setSortBy]   = useState('points') // 'points' | 'spent' | 'name'
  const [editing,  setEditing]  = useState(null) // customer object ที่กำลังแก้
  const [originalPoints, setOriginalPoints] = useState(0) // แต้มเดิมตอนเปิด modal (เทียบว่ามีการแก้มือไหม)
  const [pointsReason, setPointsReason] = useState('')
  const [saving,   setSaving]   = useState(false)

  // สรุปยอดซื้อสะสม + จำนวนออเดอร์ต่อลูกค้า จาก orders
  const statsByCustomer = new Map()
  for (const o of orders) {
    if (!o.customer_id) continue
    const cur = statsByCustomer.get(o.customer_id) || { totalSpent: 0, orderCount: 0 }
    cur.totalSpent += o.total_amount || 0
    cur.orderCount += 1
    statsByCustomer.set(o.customer_id, cur)
  }

  let rows = customers.map(c => ({
    ...c,
    totalSpent:  statsByCustomer.get(c.id)?.totalSpent  || 0,
    orderCount:  statsByCustomer.get(c.id)?.orderCount  || 0,
  }))

  if (search.trim()) {
    const q = search.trim().toLowerCase()
    rows = rows.filter(c =>
      (c.name || '').toLowerCase().includes(q) || (c.contact || '').includes(q))
  }

  rows.sort((a, b) => {
    if (sortBy === 'points') return (b.loyalty_points || 0) - (a.loyalty_points || 0)
    if (sortBy === 'spent')  return b.totalSpent - a.totalSpent
    return (a.name || '').localeCompare(b.name || '', 'th')
  })

  async function saveEdit() {
    if (!editing) return
    const newPoints = parseInt(editing.loyalty_points) || 0
    const pointsChanged = newPoints !== originalPoints
    if (pointsChanged && !pointsReason.trim()) {
      alert('แก้แต้มสะสมต้องกรอกเหตุผลก่อนค่ะ (เพื่อเก็บประวัติไว้ตรวจสอบย้อนหลังได้)')
      return
    }
    setSaving(true)
    try {
      if (pointsChanged) {
        const { error: auditErr } = await supabase.from('loyalty_points_audit').insert({
          customer_id: editing.id,
          old_points: originalPoints,
          new_points: newPoints,
          reason: pointsReason.trim(),
        })
        if (auditErr) throw new Error('บันทึก audit log ไม่สำเร็จ: ' + auditErr.message)
        // ปรับส่วนต่างผ่าน ledger (source of truth) — syncPointsColumn จะอัปเดต loyalty_points ให้เอง
        const adj = await db.adjustPointsManual(editing.id, newPoints - originalPoints, pointsReason.trim())
        if (!adj.ok) throw new Error('ปรับแต้มไม่สำเร็จ: ' + adj.error)
      }
      const { error, data } = await supabase.from('customers')
        .update({
          name: editing.name?.trim() || null,
          contact: editing.contact?.trim() || null,
          address: editing.address?.trim() || null,
          birth_date: editing.birth_date || null,
        })
        .eq('id', editing.id)
        .select('id')
      if (error) throw error
      if (!data || data.length === 0) {
        alert('⚠️ บันทึกไม่สำเร็จ — ติด RLS policy')
      } else {
        setEditing(null)
        setPointsReason('')
        onUpdated?.()
      }
    } catch (e) {
      alert('บันทึกไม่สำเร็จ: ' + e.message)
    }
    setSaving(false)
  }

  return (
    <div>
      <div style={{ display:'flex', gap:8, marginBottom:14 }}>
        <input placeholder="ค้นหาชื่อ/เบอร์โทร..." value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...inputStyle, flex:1 }}/>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          style={{ ...inputStyle, width:140 }}>
          <option value="points">เรียง: แต้มมาก→น้อย</option>
          <option value="spent">เรียง: ยอดซื้อมาก→น้อย</option>
          <option value="name">เรียง: ชื่อ ก-ฮ</option>
        </select>
      </div>

      {rows.length === 0 && (
        <div style={{ textAlign:'center', padding:30, color:S.textLt, fontSize:13 }}>
          ไม่พบลูกค้า
        </div>
      )}

      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {rows.map(c => (
          <div key={c.id} onClick={() => { setEditing({ ...c }); setOriginalPoints(c.loyalty_points || 0); setPointsReason('') }}
            style={{ background:S.white, border:`1px solid ${S.border}`, borderRadius:10,
              padding:'12px 14px', display:'flex', justifyContent:'space-between',
              alignItems:'center', cursor:'pointer' }}>
            <div style={{ textAlign:'left' }}>
              <div style={{ fontSize:13, fontWeight:600, color:S.ink }}>{(c.name || '').trim()}</div>
              <div style={{ fontSize:11, color:S.textLt, marginTop:2 }}>
                {c.contact || '-'} · {c.orderCount} ออเดอร์ · ใช้จ่ายรวม ฿{c.totalSpent.toLocaleString()}
              </div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:14, fontWeight:700, color:S.gold,
                fontFamily:'Cormorant Garamond,serif' }}>🏆 {c.loyalty_points || 0}</div>
              <div style={{ fontSize:9, color:S.textLt }}>แต้ม</div>
              {c.point_remainder > 0 && (
                <div style={{ fontSize:9, color:S.textLt, marginTop:2 }}>เศษสะสม ฿{c.point_remainder}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div onClick={() => { setEditing(null); setPointsReason('') }}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:50,
            display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background:S.white, borderRadius:14, padding:20, width:'100%',
              maxWidth:380, maxHeight:'85vh', overflowY:'auto' }}>
            <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:18, fontStyle:'italic',
              color:S.ink, marginBottom:14 }}>แก้ไขข้อมูลลูกค้า</div>

            <label style={{ fontSize:11, color:S.textLt }}>ชื่อ</label>
            <input value={editing.name || ''} onChange={e => setEditing({ ...editing, name:e.target.value })}
              style={{ ...inputStyle, marginTop:4, marginBottom:10 }}/>

            <label style={{ fontSize:11, color:S.textLt }}>เบอร์โทร</label>
            <input value={editing.contact || ''} onChange={e => setEditing({ ...editing, contact:e.target.value })}
              style={{ ...inputStyle, marginTop:4, marginBottom:10 }}/>

            <label style={{ fontSize:11, color:S.textLt }}>ที่อยู่</label>
            <textarea value={editing.address || ''} onChange={e => setEditing({ ...editing, address:e.target.value })}
              rows={2} style={{ ...inputStyle, marginTop:4, marginBottom:10, resize:'vertical' }}/>

            <label style={{ fontSize:11, color:S.textLt }}>🎂 วันเกิด</label>
            <input type="date" value={editing.birth_date || ''}
              onChange={e => setEditing({ ...editing, birth_date:e.target.value })}
              style={{ ...inputStyle, marginTop:4, marginBottom:10 }}/>

            <label style={{ fontSize:11, color:S.textLt }}>แต้มสะสม (แก้มือ)</label>
            <input type="number" value={editing.loyalty_points ?? 0}
              onChange={e => setEditing({ ...editing, loyalty_points:e.target.value })}
              style={{ ...inputStyle, marginTop:4, marginBottom:(parseInt(editing.loyalty_points) || 0) !== originalPoints ? 10 : 16 }}/>

            {(parseInt(editing.loyalty_points) || 0) !== originalPoints && (
              <>
                <label style={{ fontSize:11, color:S.red }}>เหตุผลที่แก้แต้ม (จำเป็น) *</label>
                <input value={pointsReason} onChange={e => setPointsReason(e.target.value)}
                  placeholder="เช่น ลูกค้าแจ้งแต้มไม่ตรง, แก้ bug ระบบ"
                  style={{ ...inputStyle, marginTop:4, marginBottom:16, borderColor:S.red }}/>
              </>
            )}

            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => { setEditing(null); setPointsReason('') }}
                style={{ flex:1, padding:'10px 0', borderRadius:8, border:`1px solid ${S.border}`,
                  background:'transparent', color:S.textMid, fontWeight:600, cursor:'pointer' }}>
                ยกเลิก
              </button>
              <Btn onClick={saveEdit} disabled={saving} style={{ flex:1 }}>
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function PageOrderBilling() {
  const [tab,       setTab]       = useState('new') // 'new' | 'history'
  const [formulas,  setFormulas]  = useState([])
  const [customers, setCustomers] = useState([])
  const [orders,    setOrders]    = useState([])
  const [loading,   setLoading]   = useState(true)
  const [formKey,   setFormKey]   = useState(0)

  async function loadAll() {
    const [{ data: f }, { data: c }, { data: o }] = await Promise.all([
      supabase.from('formulas').select('id, name').eq('lot_status', 'active'),
      supabase.from('customers').select('*').order('name'),
      supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending:false }),
    ])
    setFormulas(f || [])
    setCustomers(c || [])
    setOrders((o || []).map(ord => ({ ...ord, items: ord.order_items || [] })))
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  async function markPaid(orderId) {
    try {
      const result = await db.deductStockForOrder(orderId)
      if (result.success) {
        const order = orders.find(o => o.id === orderId)
        let points = 0
        let remainderAfter = 0
        if (order?.customer_id) {
          const r = await db.earnPointsFromPurchase(order.customer_id, order.total_amount || 0,
            { orderId, note: `ออเดอร์ #${orderId}` })
          if (!r.ok) {
            alert(`มาร์คจ่ายแล้ว แต่บวกแต้มไม่สำเร็จ: ${r.error}`)
          } else {
            points = r.points
            remainderAfter = r.remainder
          }

          // โบนัสวันเกิด — เช็คเดือนเกิดตอนจ่าย (กันซ้ำต่อเดือน)
          const { data: cust } = await supabase.from('customers')
            .select('birth_date').eq('id', order.customer_id).single()
          if (cust && isBirthdayMonth(cust.birth_date)) {
            const tag = `birthday:${order.customer_id}:${new Date().getFullYear()}-${new Date().getMonth() + 1}`
            const { data: already } = await supabase.from('loyalty_ledger')
              .select('id').eq('kind', 'birthday').eq('note', tag).maybeSingle()
            if (!already) {
              await db.earnPoints(order.customer_id, BIRTHDAY_BONUS_POINTS,
                { kind: 'birthday', orderId, note: tag })
            }
          }
        }
        await supabase.from('orders').update({ points_earned: points }).eq('id', orderId)
        // ✅ โหลด orders + customers ใหม่ทั้งชุด แทนการ patch state เอง
        await loadAll()
        alert(`✓ ขายเสร็จ — ตัด stock ${result.deductions.length} batch`
          + `${points > 0 ? ` · ให้ ${points} แต้ม` : ''}`
          + `${remainderAfter > 0 ? ` · เก็บเศษ ฿${remainderAfter} ไว้รวมครั้งหน้า` : ''}`)
      } else {
        alert(`✗ ตัด stock ล้มเหลว:\n${result.error}`)
      }
    } catch (e) {
      alert('Error: ' + e.message)
    }
  }

  if (loading) return <div style={{ textAlign:'center', padding:40, color:S.textLt }}>Loading...</div>

  return (
    <div>
      <div style={{ marginBottom:18 }}>
        <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:26, color:S.ink,
          fontStyle:'italic', lineHeight:1 }}>บิล + PromptPay QR</div>
        <div style={{ fontSize:12, color:S.textLt, marginTop:4 }}>
          สร้างออเดอร์ คิดยอด สร้าง QR ให้ลูกค้าสแกนจ่าย
        </div>
      </div>

      <div style={{ display:'flex', gap:8, marginBottom:16 }}>
        {[['new','สร้างออเดอร์'],['history','ประวัติ'],['customers','ลูกค้า']].map(([k,label]) => (
          <button key={k} onClick={() => setTab(k)}
            style={{ flex:1, padding:'9px 0', borderRadius:10, cursor:'pointer',
              fontSize:12, fontWeight:600, fontFamily:'Inter,sans-serif',
              border:`1.5px solid ${tab===k ? S.gold : S.border}`,
              background: tab===k ? S.goldLt : 'transparent',
              color: tab===k ? S.gold : S.textMid }}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'new' && (
        <NewOrderForm key={formKey} formulas={formulas} customers={customers} orders={orders}
          onSaved={() => { loadAll(); setFormKey(k => k+1) }}
          onOrderSaved={loadAll}
          onViewHistory={() => { loadAll(); setTab('history') }}/>
      )}
      {tab === 'history' && (
        <OrderHistory orders={orders} customers={customers} formulas={formulas}
          onMarkPaid={markPaid}/>
      )}
      {tab === 'customers' && (
        <CustomerList customers={customers} orders={orders} onUpdated={loadAll}/>
      )}
    </div>
  )
}
