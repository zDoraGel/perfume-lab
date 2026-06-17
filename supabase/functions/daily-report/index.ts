// supabase/functions/daily-report/index.ts
// ส่ง Daily Report เต็มรูปแบบไป LINE ทุกเช้า (ยอดขาย/กำไร/stock alert/blend aging/best seller)
// Deploy: supabase functions deploy daily-report

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function sendLine(token: string, userId: string, message: string) {
  await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ to: userId, messages: [{ type: 'text', text: message }] }),
  })
}

function fmtB(n: number) {
  return `฿${n.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function thaiDate() {
  const d = new Date()
  const days   = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัส','ศุกร์','เสาร์']
  const months = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()+543}`
}

Deno.serve(async (_req) => {
  if (_req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const LINE_TOKEN   = Deno.env.get('LINE_TOKEN')!
  const LINE_USER_ID = Deno.env.get('LINE_USER_ID')!

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const today      = new Date()
  const todayStr   = today.toISOString().split('T')[0]
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]

  const sections: string[] = []

  // ── 1. ยอดขาย + กำไร (วันนี้ และเดือนนี้) ──────────────────────────────────
  const { data: logsToday } = await supabase
    .from('retail_stock_logs')
    .select('qty, cost_price, sell_price, stock_id, retail_stock:retail_stock(name)')
    .eq('type', 'out')
    .gte('logged_at', todayStr)

  const { data: logsMonth } = await supabase
    .from('retail_stock_logs')
    .select('qty, cost_price, sell_price')
    .eq('type', 'out')
    .gte('logged_at', monthStart)

  function calcRevenueProfit(logs: any[] | null) {
    if (!logs) return { revenue: 0, profit: 0, qty: 0 }
    let revenue = 0, profit = 0, qty = 0
    for (const l of logs) {
      const q = l.qty ?? 0
      const sell = l.sell_price ?? 0
      const cost = l.cost_price ?? 0
      revenue += sell * q
      profit  += (sell - cost) * q
      qty     += q
    }
    return { revenue, profit, qty }
  }

  const today_ = calcRevenueProfit(logsToday)
  const month_ = calcRevenueProfit(logsMonth)

  sections.push(
    `💰 ยอดขาย\n` +
    `วันนี้: ${fmtB(today_.revenue)} (${today_.qty} ขวด) · กำไร ${fmtB(today_.profit)}\n` +
    `เดือนนี้: ${fmtB(month_.revenue)} (${month_.qty} ขวด) · กำไร ${fmtB(month_.profit)}`
  )

  // ── 2. Best Seller (เดือนนี้) ────────────────────────────────────────────────
  const { data: bestSellers } = await supabase
    .from('retail_stock')
    .select('name, brand, qty_sold')
    .order('qty_sold', { ascending: false })
    .limit(3)

  if (bestSellers && bestSellers.length > 0) {
    const lines = bestSellers
      .filter(b => (b.qty_sold ?? 0) > 0)
      .map((b, i) => `${i + 1}. ${b.name}${b.brand ? ' (' + b.brand + ')' : ''} — ขายแล้ว ${b.qty_sold} ขวด`)
    if (lines.length > 0) {
      sections.push(`🏆 Best Seller\n${lines.join('\n')}`)
    }
  }

  // ── 3. Retail Stock ใกล้หมด ──────────────────────────────────────────────────
  const { data: retailStock } = await supabase
    .from('retail_stock')
    .select('name, brand, qty_total, qty_sold, alert_at')
    .eq('is_discontinued', false)

  const lowRetail: string[] = []
  if (retailStock) {
    for (const r of retailStock) {
      const remaining = (r.qty_total ?? 0) - (r.qty_sold ?? 0)
      const threshold = r.alert_at ?? 2
      if (remaining <= threshold) {
        lowRetail.push(`${r.name}${r.brand ? ' (' + r.brand + ')' : ''} — เหลือ ${remaining} ขวด`)
      }
    }
  }
  if (lowRetail.length > 0) {
    sections.push(`📦 Retail Stock ใกล้หมด\n${lowRetail.join('\n')}`)
  }

  // ── 4. Key Materials ใกล้หมด ─────────────────────────────────────────────────
  const { data: keyMats } = await supabase
    .from('materials')
    .select('name, stock, stock_alert_at')
    .eq('is_key', true)

  const lowMats: string[] = []
  if (keyMats) {
    for (const m of keyMats) {
      const threshold = m.stock_alert_at ?? 10
      if ((m.stock ?? 0) <= threshold) {
        lowMats.push(`${m.name} — เหลือ ${m.stock ?? 0}g`)
      }
    }
  }
  if (lowMats.length > 0) {
    sections.push(`⚗️ Key Material ใกล้หมด\n${lowMats.join('\n')}`)
  }

  // ── 5. Production Stock ใกล้หมด ──────────────────────────────────────────────
  const { data: prodStock } = await supabase
    .from('product_stock')
    .select('formula_name, stock_remaining')

  const lowProd: string[] = []
  if (prodStock) {
    for (const p of prodStock) {
      if ((p.stock_remaining ?? 0) <= 3) {
        lowProd.push(`${p.formula_name} — เหลือ ${p.stock_remaining ?? 0} ขวด`)
      }
    }
  }
  if (lowProd.length > 0) {
    sections.push(`🧴 Production Stock ใกล้หมด\n${lowProd.join('\n')}`)
  }

  // ── 6. Blend Aging — ครบกำหนดวันนี้ (พร้อมขาย) ──────────────────────────────
  const { data: agingVersions } = await supabase
    .from('adaptation_versions')
    .select('id, blended_at, rest_days, status, adaptation:adaptations(name)')
    .not('blended_at', 'is', null)
    .neq('status', 'sold_out')

  const readyToday: string[] = []
  if (agingVersions) {
    for (const v of agingVersions) {
      if (!v.blended_at || v.rest_days == null) continue
      const blendedDate = new Date(v.blended_at)
      const readyDate   = new Date(blendedDate.getTime() + v.rest_days * 86400000)
      const readyStr    = readyDate.toISOString().split('T')[0]
      if (readyStr === todayStr) {
        readyToday.push(`${v.adaptation?.name || 'Blend'} — ครบ ${v.rest_days} วัน พร้อมขายแล้ว`)
      }
    }
  }
  if (readyToday.length > 0) {
    sections.push(`🧪 Blend Aging ครบกำหนดวันนี้\n${readyToday.join('\n')}`)
  }

  // ── ส่ง LINE ────────────────────────────────────────────────────────────────
  const header = `🌿 Linen Theory — Daily Report\n${thaiDate()}\n${'─'.repeat(20)}`
  const body = sections.length > 0
    ? sections.join('\n\n')
    : 'วันนี้ไม่มีอะไรพิเศษ ทุกอย่างเรียบร้อยดีค่ะ ✨'

  await sendLine(LINE_TOKEN, LINE_USER_ID, header + '\n\n' + body)

  return new Response(JSON.stringify({ ok: true, sections: sections.length }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})
