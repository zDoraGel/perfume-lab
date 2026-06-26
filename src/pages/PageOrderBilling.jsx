import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { db } from '../lib/db'
import { S } from '../constants/theme'
import { Btn } from '../components/ui'
import { getPromptPayQrUrl } from '../lib/promptpay'

// ล็อกเป็น production URL เสมอ — เหตุผลเดียวกับ Blotter+QR (กัน Vercel preview URL หลุดไปให้ลูกค้า)
const PRODUCTION_URL = 'https://perfume-lab-brown.vercel.app'

// TODO: เปลี่ยนเป็นเบอร์พร้อมเพย์จริงของร้าน (Gel จะส่งมาทีหลัง)
const DEFAULT_PROMPTPAY = ''

const inputStyle = {
  width:'100%', padding:'10px 12px', borderRadius:8,
  border:`1px solid ${S.border}`, fontSize:13, boxSizing:'border-box',
  fontFamily:'Inter,sans-serif',
}

// ── ฟอร์มสร้างออเดอร์ใหม่ ────────────────────────────────────────────────────────
function NewOrderForm({ formulas, customers, onSaved }) {
  const [customerName,    setCustomerName]    = useState('')
  const [customerContact, setCustomerContact] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [existingId,      setExistingId]      = useState(null)
  const [items,           setItems]           = useState([
    { formula_id:'', bottle_ml:15, qty:1, unit_price:'' }
  ])
  const [promptpay,       setPromptpay]       = useState(DEFAULT_PROMPTPAY)
  const [notes,           setNotes]           = useState('')
  const [hasShipping,     setHasShipping]     = useState(false)
  const [shippingFee,     setShippingFee]     = useState('40')
  const [saving,          setSaving]          = useState(false)
  const [savedOrder,      setSavedOrder]      = useState(null)
  const [showCustList,    setShowCustList]    = useState(false)

  function addItem() {
    setItems(p => [...p, { formula_id:'', bottle_ml:15, qty:1, unit_price:'' }])
  }
  function removeItem(i) {
    setItems(p => p.filter((_, idx) => idx !== i))
  }
  function updateItem(i, field, value) {
    setItems(p => p.map((it, idx) => idx === i ? { ...it, [field]: value } : it))
  }

  const itemsTotal = items.reduce((s, it) =>
    s + (parseFloat(it.unit_price) || 0) * (parseInt(it.qty) || 0), 0)
  const shippingAmount = hasShipping ? (parseFloat(shippingFee) || 0) : 0
  const total = itemsTotal + shippingAmount

  function pickCustomer(c) {
    setCustomerName(c.name)
    setCustomerContact(c.contact || '')
    setCustomerAddress(c.address || '')
    setExistingId(c.id)
    setShowCustList(false)
  }

  async function saveOrder() {
    if (!customerName.trim()) return alert('กรอกชื่อลูกค้าก่อนค่ะ')
    if (items.every(it => !it.formula_id)) return alert('เลือกสินค้าอย่างน้อย 1 รายการ')
    setSaving(true)
    try {
      let customerId = existingId
      if (!customerId) {
        const { data: newCust, error: custErr } = await supabase
          .from('customers')
          .insert({ name: customerName.trim(), contact: customerContact.trim() || null,
            address: customerAddress.trim() || null })
          .select().single()
        if (custErr) throw custErr
        customerId = newCust.id
      } else {
        // ถ้าลูกค้าเดิมแก้ที่อยู่ใหม่ ให้อัปเดตด้วย
        await supabase.from('customers').update({ address: customerAddress.trim() || null })
          .eq('id', customerId)
      }

      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert({ customer_id: customerId, total_amount: total, notes: notes || null,
          status:'pending', promptpay_number: promptpay.trim(), shipping_fee: shippingAmount })
        .select().single()
      if (orderErr) throw orderErr

      const validItems = items.filter(it => it.formula_id)
      const itemRows = validItems.map(it => ({
        order_id: order.id,
        formula_id: parseInt(it.formula_id),
        bottle_ml: it.bottle_ml || null,
        qty: parseInt(it.qty) || 1,
        unit_price: parseFloat(it.unit_price) || 0,
        subtotal: (parseFloat(it.unit_price) || 0) * (parseInt(it.qty) || 1),
      }))
      const { error: itemsErr } = await supabase.from('order_items').insert(itemRows)
      if (itemsErr) throw itemsErr

      setSavedOrder({ ...order, customer_name: customerName, items: itemRows })
    } catch (e) {
      alert('บันทึกไม่สำเร็จ: ' + e.message)
    }
    setSaving(false)
  }

  if (savedOrder) {
    return (
      <OrderQrResult order={savedOrder} formulas={formulas} promptpay={promptpay}
        onNewOrder={() => onSaved()}/>
    )
  }

  return (
    <div style={{ background:S.white, borderRadius:14, border:`1px solid ${S.border}`,
      padding:16, marginBottom:20 }}>

      {/* ลูกค้า */}
      <div style={{ marginBottom:14, position:'relative' }}>
        <div style={{ fontSize:11, color:S.textMid, marginBottom:6, fontWeight:500,
          textTransform:'uppercase', letterSpacing:.5 }}>ลูกค้า</div>
        <input value={customerName}
          onChange={e => { setCustomerName(e.target.value); setExistingId(null); setShowCustList(true) }}
          onFocus={() => setShowCustList(true)}
          placeholder="ชื่อลูกค้า" style={inputStyle}/>
        {showCustList && customerName.trim() && (
          <div style={{ position:'absolute', top:'100%', left:0, right:0, zIndex:20,
            background:S.white, border:`1px solid ${S.gold}`, borderRadius:10,
            maxHeight:160, overflowY:'auto', boxShadow:'0 6px 18px rgba(0,0,0,0.08)' }}>
            {customers.filter(c => c.name.toLowerCase().includes(customerName.toLowerCase())).slice(0,5)
              .map(c => (
                <div key={c.id} onClick={() => pickCustomer(c)}
                  style={{ padding:'8px 12px', cursor:'pointer', fontSize:13,
                    borderBottom:`1px solid ${S.border}` }}>
                  {c.name} {c.contact && <span style={{ color:S.textLt }}>· {c.contact}</span>}
                </div>
              ))}
          </div>
        )}
        <input value={customerContact} onChange={e => setCustomerContact(e.target.value)}
          placeholder="เบอร์โทร / LINE" style={{ ...inputStyle, marginTop:8 }}/>
        <textarea value={customerAddress} onChange={e => setCustomerAddress(e.target.value)}
          placeholder="ที่อยู่จัดส่ง (ถ้ามี)" rows={2}
          style={{ ...inputStyle, marginTop:8, resize:'vertical', fontFamily:'Inter,sans-serif' }}/>
      </div>

      {/* รายการสินค้า */}
      <div style={{ fontSize:11, color:S.textMid, marginBottom:6, fontWeight:500,
        textTransform:'uppercase', letterSpacing:.5 }}>รายการสินค้า</div>
      {items.map((it, i) => (
        <div key={i} style={{ display:'flex', gap:6, marginBottom:8, alignItems:'center' }}>
          <select value={it.formula_id} onChange={e => updateItem(i, 'formula_id', e.target.value)}
            style={{ ...inputStyle, flex:2.2 }}>
            <option value="">-- เลือกกลิ่น --</option>
            {formulas.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <input type="number" value={it.bottle_ml} onChange={e => updateItem(i, 'bottle_ml', e.target.value)}
            placeholder="ml" style={{ ...inputStyle, flex:0.7 }}/>
          <input type="number" value={it.qty} onChange={e => updateItem(i, 'qty', e.target.value)}
            placeholder="qty" style={{ ...inputStyle, flex:0.7 }}/>
          <input type="number" value={it.unit_price} onChange={e => updateItem(i, 'unit_price', e.target.value)}
            placeholder="ราคา/ขวด" style={{ ...inputStyle, flex:1 }}/>
          {items.length > 1 && (
            <button onClick={() => removeItem(i)}
              style={{ background:'none', border:'none', color:S.textLt, cursor:'pointer',
                fontSize:16, flexShrink:0 }}>×</button>
          )}
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

      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:11, color:S.textMid, marginBottom:6, fontWeight:500,
          textTransform:'uppercase', letterSpacing:.5 }}>เบอร์พร้อมเพย์ร้าน</div>
        <input value={promptpay} onChange={e => setPromptpay(e.target.value)}
          placeholder="เช่น 0812345678" style={inputStyle}/>
      </div>

      <div style={{ padding:'10px 0', borderTop:`1px solid ${S.border}`, marginBottom:14 }}>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:12.5,
          color:S.textMid, marginBottom:4 }}>
          <span>ค่าสินค้า</span><span>฿{itemsTotal.toLocaleString()}</span>
        </div>
        {hasShipping && (
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:12.5,
            color:S.textMid, marginBottom:4 }}>
            <span>ค่าจัดส่ง</span><span>฿{shippingAmount.toLocaleString()}</span>
          </div>
        )}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
          paddingTop:8, marginTop:4, borderTop:`1px solid ${S.border}` }}>
          <span style={{ fontSize:13, color:S.textMid }}>ยอดรวม</span>
          <span style={{ fontSize:20, fontWeight:700, color:S.gold,
            fontFamily:'Cormorant Garamond,serif' }}>฿{total.toLocaleString()}</span>
        </div>
      </div>

      <Btn onClick={saveOrder} disabled={saving || !promptpay.trim()} style={{ width:'100%' }}>
        {saving ? '⏳ กำลังบันทึก...' : !promptpay.trim() ? 'กรอกเบอร์พร้อมเพย์ก่อน' : '✓ บันทึกออเดอร์ + สร้าง QR'}
      </Btn>
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

function OrderQrResult({ order, formulas, promptpay, onNewOrder }) {
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
    </div>
  )
}

// ── ประวัติออเดอร์ ───────────────────────────────────────────────────────────────
function OrderHistory({ orders, customers, formulas, onMarkPaid }) {
  const [copiedId, setCopiedId] = useState(null)

  function copyOrderLink(orderId) {
    const url = `${PRODUCTION_URL}/pay/${orderId}`
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(orderId)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  if (orders.length === 0) {
    return <div style={{ textAlign:'center', padding:30, color:S.textLt, fontSize:13 }}>
      ยังไม่มีออเดอร์
    </div>
  }
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {orders.map(o => {
        const cust = customers.find(c => c.id === o.customer_id)
        const statusColor = o.status === 'paid' ? S.green : o.status === 'cancelled' ? S.red : S.gold
        const statusBg    = o.status === 'paid' ? '#eef4f0' : o.status === 'cancelled' ? '#fdf0ee' : S.goldLt
        return (
          <div key={o.id} style={{ background:S.white, border:`1px solid ${S.border}`,
            borderRadius:10, padding:'12px 14px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ fontSize:10, color:S.textLt, fontFamily:'monospace' }}>#{o.id}</span>
                  <span style={{ fontSize:13, fontWeight:600, color:S.ink }}>{cust?.name || '-'}</span>
                </div>
                <div style={{ fontSize:11, color:S.textLt, marginTop:2 }}>
                  {o.order_date} {cust?.contact && `· ${cust.contact}`}
                </div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:15, fontWeight:700, color:S.gold,
                  fontFamily:'Cormorant Garamond,serif' }}>฿{o.total_amount.toLocaleString()}</div>
                <span style={{ fontSize:9, fontWeight:700, color:statusColor, background:statusBg,
                  padding:'2px 8px', borderRadius:10, textTransform:'uppercase' }}>
                  {o.status}
                </span>
              </div>
            </div>
            <div style={{ display:'flex', gap:6, marginTop:8 }}>
              {o.status === 'pending' && (
                <button onClick={() => onMarkPaid(o.id)}
                  style={{ fontSize:11, color:S.green, background:'none',
                    border:`1px solid ${S.green}`, borderRadius:16, padding:'4px 10px',
                    cursor:'pointer', fontWeight:600 }}>
                  ✓ จ่ายแล้ว
                </button>
              )}
              <button onClick={() => copyOrderLink(o.id)}
                style={{ fontSize:11, color: copiedId === o.id ? '#fff' : S.textMid,
                  background: copiedId === o.id ? S.green : 'none',
                  border:`1px solid ${copiedId === o.id ? S.green : S.border}`,
                  borderRadius:16, padding:'4px 10px', cursor:'pointer', fontWeight:600 }}>
                {copiedId === o.id ? '✓ คัดลอกแล้ว' : '📋 คัดลอกลิงก์'}
              </button>
            </div>
          </div>
        )
      })}
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
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status:'paid' } : o))
        alert(`✓ ขายเสร็จ — ตัด stock ${result.deductions.length} batch`)
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
        {[['new','สร้างออเดอร์'],['history','ประวัติ']].map(([k,label]) => (
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
        <NewOrderForm key={formKey} formulas={formulas} customers={customers}
          onSaved={() => { loadAll(); setFormKey(k => k+1) }}/>
      )}
      {tab === 'history' && (
        <OrderHistory orders={orders} customers={customers} formulas={formulas}
          onMarkPaid={markPaid}/>
      )}
    </div>
  )
}
