import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getPromptPayQrUrl } from '../lib/promptpay'

const BRAND = { cream:'#EDE6DA', taupe:'#D6CBB8', mocha:'#A89A8A', brown:'#7A6E60' }

const SOCIALS = [
  { label:'Facebook',  handle:'Linen Theory',         url:'https://www.facebook.com/Linentheory',
    icon:'M14 8a6 6 0 1 0-6.9 5.93V9.9H5.6V8h1.5V6.7c0-1.5.9-2.3 2.2-2.3.6 0 1.2.05 1.4.07v1.6h-.97c-.76 0-.9.36-.9.89V8h1.8l-.24 1.9H8.85v4.03A6 6 0 0 0 14 8z' },
  { label:'Instagram', handle:'@linentheory.official', url:'https://www.instagram.com/linentheory.official/?hl=en',
    icon:'M8 2.2c1.6 0 1.8 0 2.4.05 1.2.06 2 .26 2.6.5.66.27 1.13.6 1.6 1.1.5.5.85.95 1.1 1.6.24.6.44 1.4.5 2.6.04.6.05.8.05 2.4s0 1.8-.05 2.4c-.06 1.2-.26 2-.5 2.6-.27.66-.6 1.13-1.1 1.6-.5.5-.95.85-1.6 1.1-.6.24-1.4.44-2.6.5-.6.04-.8.05-2.4.05s-1.8 0-2.4-.05c-1.2-.06-2-.26-2.6-.5-.66-.27-1.13-.6-1.6-1.1-.5-.5-.85-.95-1.1-1.6-.24-.6-.44-1.4-.5-2.6C2.2 9.8 2.2 9.6 2.2 8s0-1.8.05-2.4c.06-1.2.26-2 .5-2.6.27-.66.6-1.13 1.1-1.6.5-.5.95-.85 1.6-1.1.6-.24 1.4-.44 2.6-.5C6.2 2.2 6.4 2.2 8 2.2zM8 5.8a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4z' },
  { label:'TikTok',    handle:'@linentheory',          url:'https://www.tiktok.com/@linentheory',
    icon:'M9 2h2.2c.2 1.6 1.3 2.9 2.8 3.3v2.2c-1-.1-2-.4-2.8-1v5.6c0 2.5-2 4.4-4.4 4.4S2.4 14.6 2.4 12.1c0-2.4 1.9-4.3 4.2-4.4v2.2c-1.1.1-2 1.1-2 2.2 0 1.2 1 2.2 2.2 2.2s2.2-1 2.2-2.2V2z' },
  { label:'Line OA',   handle:'@807kmyan',             url:'https://line.me/R/ti/p/@807kmyan',
    icon:'M8 1.5c-3.6 0-6.5 2.4-6.5 5.4 0 2.7 2.3 4.9 5.4 5.3-.1.4-.5 1.6-.6 1.9-.1.3.1.3.3.2.1-.1 1.7-1.1 2.4-1.6.3 0 .6.05.9.05 3.6 0 6.5-2.4 6.5-5.4S11.6 1.5 8 1.5z' },
]

export default function PagePublicOrder({ orderId }) {
  const [order,    setOrder]    = useState(null)
  const [customer, setCustomer] = useState(null)
  const [items,    setItems]    = useState([])
  const [formulas, setFormulas] = useState({})
  const [loading,  setLoading]  = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: o } = await supabase.from('orders').select('*').eq('id', orderId).single()
      if (!o) { setNotFound(true); setLoading(false); return }
      setOrder(o)

      const [{ data: cust }, { data: its }] = await Promise.all([
        o.customer_id ? supabase.from('customers').select('*').eq('id', o.customer_id).single() : { data:null },
        supabase.from('order_items').select('*').eq('order_id', orderId),
      ])
      setCustomer(cust)
      setItems(its || [])

      const ids = [...new Set((its || []).map(i => i.formula_id))]
      if (ids.length) {
        const { data: f } = await supabase.from('formulas').select('id, name').in('id', ids)
        const map = {}
        f?.forEach(x => map[x.id] = x.name)
        setFormulas(map)
      }
      setLoading(false)
    }
    load()
  }, [orderId])

  if (loading) return <div style={wrap}><div style={{ color:BRAND.mocha, fontSize:13 }}>กำลังโหลด...</div></div>
  if (notFound || !order) return <div style={wrap}>
    <div style={{ color:BRAND.brown, fontFamily:'Cormorant Garamond,serif', fontStyle:'italic', fontSize:18 }}>
      ไม่พบออเดอร์นี้
    </div>
  </div>

  const qrUrl = order.promptpay_number
    ? getPromptPayQrUrl(order.promptpay_number, order.total_amount)
    : null
  const isPaid = order.status === 'paid'

  if (isPaid) {
    return <ReceiptView order={order} customer={customer} items={items} formulas={formulas}/>
  }

  return (
    <div style={wrap}>
      <div style={{ background:BRAND.cream, borderRadius:18, padding:'32px 24px',
        maxWidth:380, width:'100%', textAlign:'center', border:`1px solid ${BRAND.taupe}` }}>

        <div style={{ fontSize:17, fontWeight:600, color:BRAND.brown, letterSpacing:4 }}>LINEN THEORY</div>
        <div style={{ fontSize:10, color:BRAND.mocha, fontStyle:'italic', letterSpacing:1, marginTop:2 }}>
          the art of scent
        </div>
        <div style={{ fontSize:10, color:BRAND.mocha, marginTop:10 }}>✦</div>
        <div style={{ fontSize:14, color:BRAND.brown, marginTop:10, fontFamily:'Cormorant Garamond,serif',
          fontStyle:'italic' }}>
          {customer?.name ? `Thank you, ${customer.name} ♡` : 'Thank you for your order ♡'}
        </div>

        {qrUrl ? (
          <>
            <div style={{ background:'#fff', borderRadius:14, padding:18, margin:'18px auto 14px',
              maxWidth:240, border:`1px solid ${BRAND.taupe}` }}>
              <img src={qrUrl} alt="PromptPay QR" style={{ width:'100%', display:'block' }}/>
            </div>
            <div style={{ fontSize:13, color:BRAND.brown, fontWeight:500 }}>Scan to Pay via PromptPay</div>
            <div style={{ fontSize:12, color:BRAND.mocha, marginTop:2 }}>Gel / Linen Theory</div>
          </>
        ) : (
          <div style={{ fontSize:12, color:BRAND.mocha, margin:'20px 0' }}>
            ยังไม่มี QR สำหรับออเดอร์นี้
          </div>
        )}

        <div style={{ fontSize:22, fontWeight:700, color:BRAND.brown,
          fontFamily:'Cormorant Garamond,serif', marginTop:10 }}>
          ฿{order.total_amount.toLocaleString()}
        </div>

        <div style={{ textAlign:'left', margin:'18px 0', fontSize:12, color:BRAND.brown,
          background:'#fff', borderRadius:10, padding:'10px 14px' }}>
          {items.map((it, i) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'4px 0' }}>
              <span>{formulas[it.formula_id] || '-'} × {it.qty}</span>
              <span>฿{it.subtotal.toLocaleString()}</span>
            </div>
          ))}
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:10, margin:'20px 0 16px' }}>
          <div style={{ flex:1, height:1, background:BRAND.taupe }}/>
          <span style={{ fontSize:11, color:BRAND.mocha, whiteSpace:'nowrap' }}>Stay connected with us ♡</span>
          <div style={{ flex:1, height:1, background:BRAND.taupe }}/>
        </div>

        <div style={{ display:'flex', justifyContent:'center', gap:18 }}>
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
    </div>
  )
}

// ── ใบเสร็จเต็มรูปแบบ — โชว์เมื่อ order.status === 'paid' ───────────────────────
function ReceiptView({ order, customer, items, formulas }) {
  const orderDate = order.order_date
    ? new Date(order.order_date).toLocaleDateString('th-TH', { day:'2-digit', month:'2-digit', year:'numeric' })
    : '-'

  return (
    <div style={{ minHeight:'100vh', background:'#f8f5f0', padding:'24px 16px' }}>
      <div style={{ maxWidth:480, margin:'0 auto', background:'#fff', borderRadius:4,
        padding:'32px 24px 28px', fontFamily:'Inter,sans-serif', color:BRAND.brown,
        border:`1px solid ${BRAND.taupe}` }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start',
          marginBottom:28, flexWrap:'wrap', gap:10 }}>
          <div>
            <div style={{ fontSize:22, fontWeight:800, letterSpacing:3, color:BRAND.brown }}>
              LINEN THEORY
            </div>
            <div style={{ fontSize:10, letterSpacing:1.5, color:BRAND.mocha, marginTop:2,
              textTransform:'uppercase' }}>the art of scent</div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:18, fontWeight:800, letterSpacing:1, color:BRAND.brown }}>
              RECEIPT
            </div>
            <div style={{ fontSize:9, color:BRAND.mocha, letterSpacing:1, marginTop:2 }}>
              ใบเสร็จรับเงิน
            </div>
          </div>
        </div>

        {/* Customer + Order info */}
        <div style={{ display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:16,
          marginBottom:20 }}>
          <div>
            <div style={{ fontSize:9, letterSpacing:1, color:BRAND.mocha,
              textTransform:'uppercase', marginBottom:4 }}>MADE TO</div>
            <div style={{ fontSize:14, fontWeight:600 }}>{customer?.name || '-'}</div>
            {customer?.contact && (
              <div style={{ fontSize:11, color:BRAND.mocha, marginTop:2 }}>{customer.contact}</div>
            )}
            {customer?.address && (
              <div style={{ fontSize:11, color:BRAND.mocha, marginTop:4, maxWidth:200,
                lineHeight:1.5 }}>{customer.address}</div>
            )}
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:9, letterSpacing:1, color:BRAND.mocha,
              textTransform:'uppercase', marginBottom:4 }}>ORDER NUMBER</div>
            <div style={{ fontSize:18, fontWeight:800 }}>#{order.id}</div>
            <div style={{ fontSize:11, color:BRAND.mocha, marginTop:4 }}>วันที่: {orderDate}</div>
          </div>
        </div>

        <div style={{ borderTop:`1.5px dashed ${BRAND.taupe}`, margin:'18px 0' }}/>

        {/* Items table */}
        <div style={{ display:'flex', fontSize:9, fontWeight:700, letterSpacing:.5,
          color:BRAND.mocha, textTransform:'uppercase', paddingBottom:8,
          borderBottom:`1.5px solid ${BRAND.brown}` }}>
          <div style={{ flex:2.4 }}>PERFUME NAME</div>
          <div style={{ flex:0.8, textAlign:'center' }}>ML</div>
          <div style={{ flex:0.7, textAlign:'center' }}>QTY</div>
          <div style={{ flex:1, textAlign:'right' }}>AMOUNT</div>
        </div>
        {items.map((it, i) => (
          <div key={i} style={{ display:'flex', fontSize:12.5, padding:'9px 0',
            borderBottom:`1px solid ${BRAND.taupe}` }}>
            <div style={{ flex:2.4, fontWeight:500 }}>{formulas[it.formula_id] || '-'}</div>
            <div style={{ flex:0.8, textAlign:'center', color:BRAND.mocha }}>{it.bottle_ml || '-'}</div>
            <div style={{ flex:0.7, textAlign:'center', color:BRAND.mocha }}>{it.qty}</div>
            <div style={{ flex:1, textAlign:'right', fontWeight:600 }}>
              ฿{it.subtotal.toLocaleString()}
            </div>
          </div>
        ))}

        {/* Totals */}
        <div style={{ marginTop:18, marginLeft:'auto', maxWidth:220 }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:12,
            color:BRAND.mocha, padding:'4px 0' }}>
            <span>รวมค่าสินค้า</span>
            <span>฿{(order.total_amount - (order.shipping_fee || 0)).toLocaleString()}</span>
          </div>
          {order.shipping_fee > 0 && (
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:12,
              color:BRAND.mocha, padding:'4px 0' }}>
              <span>ค่าจัดส่ง</span>
              <span>฿{order.shipping_fee.toLocaleString()}</span>
            </div>
          )}
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:16,
            fontWeight:800, color:BRAND.brown, paddingTop:8, marginTop:6,
            borderTop:`1.5px solid ${BRAND.brown}` }}>
            <span>TOTAL</span>
            <span>฿{order.total_amount.toLocaleString()}</span>
          </div>
        </div>

        {/* Status */}
        <div style={{ marginTop:24, padding:'10px 14px', background:'#eef4f0',
          borderRadius:8, display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:16 }}>✓</span>
          <span style={{ fontSize:12.5, fontWeight:600, color:'#3b6d4a' }}>
            ได้รับการชำระเงินแล้ว — ขอบคุณที่ใช้บริการ Linen Theory ค่ะ ♡
          </span>
        </div>

        {/* Safety note */}
        <div style={{ marginTop:24, fontSize:9, color:BRAND.mocha, lineHeight:1.7,
          letterSpacing:.3, textTransform:'uppercase' }}>
          Shake well before spraying on your clothes. May cause irritation to the skin.
          Keep away from children and pets. Avoid spraying on furniture and open flames.
        </div>

        <div style={{ textAlign:'center', marginTop:24, fontSize:9, color:BRAND.mocha,
          letterSpacing:1 }}>
          LINEN THEORY · the art of scent
        </div>
      </div>
    </div>
  )
}

const wrap = {
  minHeight:'100vh', background:'#f8f5f0', display:'flex',
  alignItems:'center', justifyContent:'center', padding:20,
}
