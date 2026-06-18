// supabase/functions/daily-report/index.ts
// ส่ง Daily Report เต็มรูปแบบไป LINE ทุกเช้า (ยอดขาย/กำไร/stock alert/blend aging/best seller)
// Deploy: supabase functions deploy daily-report

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function sendFlex(token: string, userId: string, altText: string, flex: any) {
  await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ to: userId, messages: [{ type: 'flex', altText, contents: flex }] }),
  })
}

// ── Flex helpers ────────────────────────────────────────────────────────────
function sectionCard(opts: {
  emoji: string
  title: string
  color: string      // accent color (left bar + title)
  bgColor: string     // soft background for header chip
  lines: { text: string; sub?: string }[]
}) {
  return {
    type: 'box',
    layout: 'vertical',
    backgroundColor: '#FFFFFF',
    cornerRadius: 'md',
    paddingAll: '12px',
    margin: 'md',
    borderWidth: '1px',
    borderColor: '#EDEAE3',
    contents: [
      {
        type: 'box',
        layout: 'horizontal',
        contents: [
          { type: 'text', text: opts.emoji, size: 'md', flex: 0 },
          {
            type: 'text', text: opts.title, weight: 'bold', size: 'sm',
            color: opts.color, margin: 'sm', flex: 1, gravity: 'center',
          },
        ],
        margin: 'none',
      },
      { type: 'separator', margin: 'sm', color: '#F0EDE6' },
      {
        type: 'box',
        layout: 'vertical',
        margin: 'sm',
        spacing: 'xs',
        contents: opts.lines.map(l => ({
          type: 'box',
          layout: 'horizontal',
          contents: [
            { type: 'text', text: l.text, size: 'xs', color: '#3A3833', flex: 1, wrap: true },
            ...(l.sub ? [{ type: 'text', text: l.sub, size: 'xs', color: opts.color, weight: 'bold', flex: 0, align: 'end' as const }] : []),
          ],
        })),
      },
    ],
  }
}

function buildFlexReport(opts: {
  dateLabel: string
  todayRevenue: string; todayQty: number; todayProfit: string
  monthRevenue: string; monthQty: number; monthProfit: string
  bestSellers: { text: string; sub: string }[]
  lowRetail: { text: string; sub: string }[]
  lowMats: { text: string; sub: string }[]
  lowProd: { text: string; sub: string }[]
  readyToday: { text: string }[]
  hasAlerts: boolean
}) {
  const body: any[] = []

  // Revenue card (always shown)
  body.push({
    type: 'box',
    layout: 'vertical',
    backgroundColor: '#EAF3DE',
    cornerRadius: 'md',
    paddingAll: '14px',
    contents: [
      { type: 'text', text: '💰 ยอดขายวันนี้', size: 'sm', weight: 'bold', color: '#27500A' },
      {
        type: 'box', layout: 'horizontal', margin: 'sm',
        contents: [
          { type: 'text', text: opts.todayRevenue, size: 'xxl', weight: 'bold', color: '#173404', flex: 0 },
          { type: 'text', text: `  (${opts.todayQty} ขวด)`, size: 'xs', color: '#3B6D11', gravity: 'bottom', margin: 'sm' },
        ],
      },
      { type: 'text', text: `กำไรวันนี้ ${opts.todayProfit}`, size: 'xs', color: '#3B6D11', margin: 'xs' },
      { type: 'separator', margin: 'md', color: '#C9DBA8' },
      {
        type: 'box', layout: 'horizontal', margin: 'md',
        contents: [
          { type: 'text', text: 'เดือนนี้', size: 'xs', color: '#3B6D11', flex: 1 },
          { type: 'text', text: `${opts.monthRevenue} (${opts.monthQty} ขวด)`, size: 'xs', weight: 'bold', color: '#173404', align: 'end' as const, flex: 0 },
        ],
      },
      {
        type: 'box', layout: 'horizontal', margin: 'xs',
        contents: [
          { type: 'text', text: 'กำไรสะสม', size: 'xs', color: '#3B6D11', flex: 1 },
          { type: 'text', text: opts.monthProfit, size: 'xs', weight: 'bold', color: '#173404', align: 'end' as const, flex: 0 },
        ],
      },
    ],
  })

  if (opts.bestSellers.length > 0) {
    body.push(sectionCard({
      emoji: '🏆', title: 'BEST SELLER เดือนนี้',
      color: '#854F0B', bgColor: '#FAEEDA',
      lines: opts.bestSellers,
    }))
  }

  if (opts.lowRetail.length > 0) {
    body.push(sectionCard({
      emoji: '📦', title: 'RETAIL STOCK ใกล้หมด',
      color: '#A32D2D', bgColor: '#FCEBEB',
      lines: opts.lowRetail,
    }))
  }

  if (opts.lowMats.length > 0) {
    body.push(sectionCard({
      emoji: '⚗️', title: 'KEY MATERIAL ใกล้หมด',
      color: '#A32D2D', bgColor: '#FCEBEB',
      lines: opts.lowMats,
    }))
  }

  if (opts.lowProd.length > 0) {
    body.push(sectionCard({
      emoji: '🧴', title: 'PRODUCTION STOCK ใกล้หมด',
      color: '#993C1D', bgColor: '#FAECE7',
      lines: opts.lowProd,
    }))
  }

  if (opts.readyToday.length > 0) {
    body.push(sectionCard({
      emoji: '🧪', title: 'BLEND พร้อมขายวันนี้',
      color: '#534AB7', bgColor: '#EEEDFE',
      lines: opts.readyToday,
    }))
  }

  if (!opts.hasAlerts) {
    body.push({
      type: 'box',
      layout: 'vertical',
      margin: 'md',
      paddingAll: '12px',
      backgroundColor: '#F1EFE8',
      cornerRadius: 'md',
      contents: [
        { type: 'text', text: '✨ วันนี้ไม่มีอะไรพิเศษ ทุกอย่างเรียบร้อยดีค่ะ', size: 'xs', color: '#5F5E5A', align: 'center', wrap: true },
      ],
    })
  }

  return {
    type: 'bubble',
    size: 'mega',
    header: {
      type: 'box',
      layout: 'vertical',
      backgroundColor: '#3C3489',
      paddingAll: '16px',
      contents: [
        { type: 'text', text: '🌿 LINEN THEORY', color: '#FFFFFF', weight: 'bold', size: 'lg' },
        { type: 'text', text: 'Daily Report', color: '#CECBF6', size: 'xs', margin: 'xs' },
        { type: 'text', text: opts.dateLabel, color: '#CECBF6', size: 'xs', margin: 'xs' },
      ],
    },
    body: {
      type: 'box',
      layout: 'vertical',
      paddingAll: '14px',
      backgroundColor: '#FBFAF7',
      contents: body,
    },
  }
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

  // ── 2. Best Seller (เดือนนี้) ────────────────────────────────────────────────
  const { data: bestSellersRaw } = await supabase
    .from('retail_stock')
    .select('name, brand, qty_sold')
    .eq('is_discontinued', false)
    .order('qty_sold', { ascending: false })
    .limit(3)

  const bestSellers = (bestSellersRaw || [])
    .filter(b => (b.qty_sold ?? 0) > 0)
    .map(b => ({
      text: `${b.name}${b.brand ? ' (' + b.brand + ')' : ''}`,
      sub: `${b.qty_sold} ขวด`,
    }))

  // ── 3. Retail Stock ใกล้หมด ──────────────────────────────────────────────────
  const { data: retailStock } = await supabase
    .from('retail_stock')
    .select('name, brand, qty_total, qty_sold, alert_at')
    .eq('is_discontinued', false)

  const lowRetail: { text: string; sub: string }[] = []
  if (retailStock) {
    for (const r of retailStock) {
      const remaining = (r.qty_total ?? 0) - (r.qty_sold ?? 0)
      const threshold = r.alert_at ?? 2
      if (remaining <= threshold) {
        lowRetail.push({
          text: `${r.name}${r.brand ? ' (' + r.brand + ')' : ''}`,
          sub: `เหลือ ${remaining}`,
        })
      }
    }
  }

  // ── 4. Key Materials ใกล้หมด ─────────────────────────────────────────────────
  const { data: keyMats } = await supabase
    .from('materials')
    .select('name, stock, stock_alert_at')
    .eq('is_key', true)

  const lowMats: { text: string; sub: string }[] = []
  if (keyMats) {
    for (const m of keyMats) {
      const threshold = m.stock_alert_at ?? 10
      if ((m.stock ?? 0) <= threshold) {
        lowMats.push({ text: m.name, sub: `${m.stock ?? 0}g` })
      }
    }
  }

  // ── 5. Production Stock ใกล้หมด ──────────────────────────────────────────────
  const { data: prodStock } = await supabase
    .from('product_stock')
    .select('formula_name, stock_remaining')

  const lowProd: { text: string; sub: string }[] = []
  if (prodStock) {
    for (const p of prodStock) {
      if ((p.stock_remaining ?? 0) <= 3) {
        lowProd.push({ text: p.formula_name, sub: `${p.stock_remaining ?? 0} ขวด` })
      }
    }
  }

  // ── 6. Blend Aging — ครบกำหนดวันนี้ (พร้อมขาย) ──────────────────────────────
  const { data: agingVersions } = await supabase
    .from('adaptation_versions')
    .select('id, blended_at, rest_days, status, adaptation:adaptations(name)')
    .not('blended_at', 'is', null)
    .neq('status', 'sold_out')

  const readyToday: { text: string }[] = []
  if (agingVersions) {
    for (const v of agingVersions) {
      if (!v.blended_at || v.rest_days == null) continue
      const blendedDate = new Date(v.blended_at)
      const readyDate   = new Date(blendedDate.getTime() + v.rest_days * 86400000)
      const readyStr    = readyDate.toISOString().split('T')[0]
      if (readyStr === todayStr) {
        readyToday.push({ text: `${v.adaptation?.name || 'Blend'} — ครบ ${v.rest_days} วัน พร้อมขายแล้ว` })
      }
    }
  }

  const hasAlerts = bestSellers.length > 0 || lowRetail.length > 0 ||
    lowMats.length > 0 || lowProd.length > 0 || readyToday.length > 0

  const sectionsCount = 1 + [bestSellers, lowRetail, lowMats, lowProd, readyToday]
    .filter(arr => arr.length > 0).length

  // ── ส่ง LINE (Flex Message) ───────────────────────────────────────────────
  const flex = buildFlexReport({
    dateLabel: thaiDate(),
    todayRevenue: fmtB(today_.revenue), todayQty: today_.qty, todayProfit: fmtB(today_.profit),
    monthRevenue: fmtB(month_.revenue), monthQty: month_.qty, monthProfit: fmtB(month_.profit),
    bestSellers, lowRetail, lowMats, lowProd, readyToday, hasAlerts,
  })

  await sendFlex(LINE_TOKEN, LINE_USER_ID, `Daily Report ${thaiDate()} — ยอดขาย ${fmtB(today_.revenue)}`, flex)

  return new Response(JSON.stringify({ ok: true, sections: sectionsCount }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})
