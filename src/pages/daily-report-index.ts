// supabase/functions/daily-report/index.ts
// ส่ง Daily Report สวยๆ ไป LINE ทุกเช้า
// Deploy: supabase functions deploy daily-report

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function sendFlexMessage(token: string, userId: string, flex: any, altText: string) {
  const res = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      to: userId,
      messages: [{ type: 'flex', altText, contents: flex }]
    }),
  })
  return res
}

function thaiDate() {
  const d = new Date()
  const days   = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัส','ศุกร์','เสาร์']
  const months = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()+543}`
}

function fmtB(n: number) {
  return `฿${n.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const LINE_TOKEN   = Deno.env.get('LINE_TOKEN')!
    const LINE_USER_ID = Deno.env.get('LINE_USER_ID')!
    const supabase     = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const today     = new Date()
    const todayStr  = today.toISOString().split('T')[0]
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()

    // ── 1. Retail ─────────────────────────────────────────────────────────────
    const { data: retail } = await supabase
      .from('retail_stock')
      .select('id, name, qty_total, qty_sold, cost_per_unit, price_per_unit, alert_at, is_favorite, is_discontinued')

    const { data: retailLogs } = await supabase
      .from('retail_stock_logs')
      .select('stock_id, type, qty, cost_price, sell_price, created_at')
      .gte('created_at', monthStart)

    // ยอดขายวันนี้
    const todayLogs = (retailLogs || []).filter(l =>
      l.type === 'out' && l.created_at?.startsWith(todayStr))
    const todayRevenue = todayLogs.reduce((s, l) => s + (l.sell_price || 0) * l.qty, 0)
    const todayCost    = todayLogs.reduce((s, l) => s + (l.cost_price || 0) * l.qty, 0)
    const todayProfit  = todayRevenue - todayCost
    const todayQty     = todayLogs.reduce((s, l) => s + l.qty, 0)

    // ยอดเดือนนี้
    const monthRevenue = (retailLogs || [])
      .filter(l => l.type === 'out')
      .reduce((s, l) => s + (l.sell_price || 0) * l.qty, 0)
    const monthProfit  = monthRevenue - (retailLogs || [])
      .filter(l => l.type === 'out')
      .reduce((s, l) => s + (l.cost_price || 0) * l.qty, 0)

    // stock alert
    const lowStock = (retail || []).filter(r => {
      const rem = r.qty_total - r.qty_sold
      return rem <= r.alert_at && rem > 0 && !r.is_discontinued
    })
    const outStock = (retail || []).filter(r =>
      r.qty_total - r.qty_sold <= 0 && !r.is_discontinued)

    // top sellers (by qty_sold)
    const topSellers = [...(retail || [])]
      .filter(r => r.qty_sold > 0)
      .sort((a, b) => b.qty_sold - a.qty_sold)
      .slice(0, 3)

    // ── 2. Formulas & Production ──────────────────────────────────────────────
    const { data: formulas } = await supabase
      .from('formulas')
      .select('id, name')

    const { data: versions } = await supabase
      .from('formula_versions')
      .select('id, formula_id, ver, status, blend_date')
      .gte('blend_date', monthStart)

    const monthBlends   = (versions || []).length
    const monthSuccess  = (versions || []).filter(v => v.status === 'Success').length

    // ── 3. Saved Trends ───────────────────────────────────────────────────────
    const { data: trends } = await supabase
      .from('trend_items')
      .select('title, keywords')
      .eq('is_saved', true)
      .limit(3)

    // ── Build Flex Message ────────────────────────────────────────────────────
    const flex = {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#3D2E1E',
        paddingAll: '20px',
        contents: [
          {
            type: 'text',
            text: 'Linen Theory',
            color: '#C9A96E',
            size: 'xl',
            weight: 'bold',
            align: 'center',
          },
          {
            type: 'text',
            text: `Daily Report · ${thaiDate()}`,
            color: '#B0ABA4',
            size: 'xs',
            align: 'center',
            margin: 'sm',
          }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '0px',
        contents: [

          // ── ยอดขายวันนี้ ──
          {
            type: 'box',
            layout: 'vertical',
            paddingAll: '16px',
            backgroundColor: '#F8F6F2',
            contents: [
              {
                type: 'text',
                text: '💰 ยอดขายวันนี้',
                size: 'xs',
                color: '#6B6560',
                weight: 'bold',
              },
              {
                type: 'box',
                layout: 'horizontal',
                margin: 'md',
                contents: [
                  {
                    type: 'box',
                    layout: 'vertical',
                    flex: 1,
                    contents: [
                      { type: 'text', text: fmtB(todayRevenue), size: 'xl', weight: 'bold', color: '#3D2E1E' },
                      { type: 'text', text: 'รายได้', size: 'xxs', color: '#B0ABA4' },
                    ]
                  },
                  {
                    type: 'box',
                    layout: 'vertical',
                    flex: 1,
                    contents: [
                      { type: 'text', text: fmtB(todayProfit), size: 'xl', weight: 'bold', color: todayProfit >= 0 ? '#3D6B4A' : '#8B3A2E' },
                      { type: 'text', text: 'กำไร', size: 'xxs', color: '#B0ABA4' },
                    ]
                  },
                  {
                    type: 'box',
                    layout: 'vertical',
                    flex: 1,
                    contents: [
                      { type: 'text', text: `${todayQty} ขวด`, size: 'xl', weight: 'bold', color: '#3D2E1E' },
                      { type: 'text', text: 'ขายได้', size: 'xxs', color: '#B0ABA4' },
                    ]
                  },
                ]
              }
            ]
          },

          { type: 'separator' },

          // ── ยอดเดือนนี้ ──
          {
            type: 'box',
            layout: 'horizontal',
            paddingAll: '16px',
            backgroundColor: '#FFFFFF',
            contents: [
              {
                type: 'box',
                layout: 'vertical',
                flex: 1,
                contents: [
                  { type: 'text', text: '📅 เดือนนี้', size: 'xxs', color: '#6B6560', weight: 'bold' },
                  { type: 'text', text: fmtB(monthRevenue), size: 'lg', weight: 'bold', color: '#3D2E1E', margin: 'sm' },
                  { type: 'text', text: 'รายได้รวม', size: 'xxs', color: '#B0ABA4' },
                ]
              },
              {
                type: 'box',
                layout: 'vertical',
                flex: 1,
                contents: [
                  { type: 'text', text: '　', size: 'xxs', color: '#6B6560' },
                  { type: 'text', text: fmtB(monthProfit), size: 'lg', weight: 'bold', color: monthProfit >= 0 ? '#3D6B4A' : '#8B3A2E', margin: 'sm' },
                  { type: 'text', text: 'กำไรรวม', size: 'xxs', color: '#B0ABA4' },
                ]
              },
            ]
          },

          { type: 'separator' },

          // ── Top Sellers ──
          ...(topSellers.length > 0 ? [
            {
              type: 'box',
              layout: 'vertical',
              paddingAll: '16px',
              contents: [
                { type: 'text', text: '🏆 Top Sellers', size: 'xs', color: '#6B6560', weight: 'bold' },
                ...topSellers.map((r, i) => ({
                  type: 'box',
                  layout: 'horizontal',
                  margin: 'sm',
                  contents: [
                    { type: 'text', text: `#${i+1}`, size: 'xs', color: '#C9A96E', flex: 0, margin: 'none' },
                    { type: 'text', text: r.name, size: 'xs', color: '#3D2E1E', flex: 3, margin: 'sm', wrap: true },
                    { type: 'text', text: `${r.qty_sold} ขวด`, size: 'xs', color: '#6B6560', flex: 1, align: 'end' },
                  ]
                }))
              ]
            },
            { type: 'separator' },
          ] : []),

          // ── Stock Alert ──
          ...((lowStock.length > 0 || outStock.length > 0) ? [
            {
              type: 'box',
              layout: 'vertical',
              paddingAll: '16px',
              backgroundColor: '#FDF0EE',
              contents: [
                { type: 'text', text: '⚠️ Stock Alert', size: 'xs', color: '#8B3A2E', weight: 'bold' },
                ...outStock.slice(0, 3).map(r => ({
                  type: 'box',
                  layout: 'horizontal',
                  margin: 'sm',
                  contents: [
                    { type: 'text', text: '🔴', size: 'xs', flex: 0 },
                    { type: 'text', text: r.name, size: 'xs', color: '#8B3A2E', flex: 3, margin: 'sm', wrap: true },
                    { type: 'text', text: 'หมดแล้ว', size: 'xs', color: '#8B3A2E', flex: 1, align: 'end' },
                  ]
                })),
                ...lowStock.slice(0, 3).map(r => ({
                  type: 'box',
                  layout: 'horizontal',
                  margin: 'sm',
                  contents: [
                    { type: 'text', text: '🟡', size: 'xs', flex: 0 },
                    { type: 'text', text: r.name, size: 'xs', color: '#7A5C20', flex: 3, margin: 'sm', wrap: true },
                    { type: 'text', text: `เหลือ ${r.qty_total - r.qty_sold}`, size: 'xs', color: '#7A5C20', flex: 1, align: 'end' },
                  ]
                })),
              ]
            },
            { type: 'separator' },
          ] : []),

          // ── Blend Summary ──
          {
            type: 'box',
            layout: 'horizontal',
            paddingAll: '16px',
            contents: [
              {
                type: 'box',
                layout: 'vertical',
                flex: 1,
                contents: [
                  { type: 'text', text: '🧪 Blend เดือนนี้', size: 'xxs', color: '#6B6560', weight: 'bold' },
                  { type: 'text', text: `${monthBlends} ครั้ง`, size: 'lg', weight: 'bold', color: '#3D2E1E', margin: 'sm' },
                  { type: 'text', text: `Success ${monthSuccess}`, size: 'xxs', color: '#3D6B4A' },
                ]
              },
              {
                type: 'box',
                layout: 'vertical',
                flex: 1,
                contents: [
                  { type: 'text', text: '📋 สูตรทั้งหมด', size: 'xxs', color: '#6B6560', weight: 'bold' },
                  { type: 'text', text: `${(formulas || []).length} สูตร`, size: 'lg', weight: 'bold', color: '#3D2E1E', margin: 'sm' },
                  { type: 'text', text: ' ', size: 'xxs', color: '#B0ABA4' },
                ]
              },
            ]
          },

          // ── Saved Trends ──
          ...(trends && trends.length > 0 ? [
            { type: 'separator' },
            {
              type: 'box',
              layout: 'vertical',
              paddingAll: '16px',
              backgroundColor: '#F8F6F2',
              contents: [
                { type: 'text', text: '✦ Trends ที่บันทึกไว้', size: 'xs', color: '#6B6560', weight: 'bold' },
                ...trends.map(t => ({
                  type: 'box',
                  layout: 'horizontal',
                  margin: 'sm',
                  contents: [
                    { type: 'text', text: '·', size: 'xs', color: '#C9A96E', flex: 0 },
                    { type: 'text', text: t.title, size: 'xs', color: '#3D2E1E', flex: 1, margin: 'sm', wrap: true },
                  ]
                }))
              ]
            }
          ] : []),
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#3D2E1E',
        paddingAll: '12px',
        contents: [
          {
            type: 'text',
            text: 'Linen Theory Lab · Auto Report',
            color: '#6B6560',
            size: 'xxs',
            align: 'center',
          }
        ]
      }
    }

    await sendFlexMessage(LINE_TOKEN, LINE_USER_ID, flex, `Daily Report · ${thaiDate()}`)

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
