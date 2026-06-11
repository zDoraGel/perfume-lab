// supabase/functions/retail-alert/index.ts
// Deploy: supabase functions deploy retail-alert

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { stock_id, name, remaining, alert_at } = await req.json()

    const LINE_TOKEN   = Deno.env.get('LINE_TOKEN')
    const LINE_USER_ID = Deno.env.get('LINE_USER_ID')

    if (!LINE_TOKEN || !LINE_USER_ID) {
      return new Response(JSON.stringify({ error: 'LINE_TOKEN or LINE_USER_ID not set' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // เช็คว่าแจ้งไปแล้วใน 24 ชั่วโมงไหม
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: recentLog } = await supabase
      .from('line_notify_log')
      .select('id')
      .eq('stock_id', stock_id)
      .gte('notified_at', since)
      .maybeSingle()

    if (recentLog) {
      return new Response(JSON.stringify({ skipped: true, reason: 'already notified today' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ส่ง Line
    const emoji   = remaining <= 0 ? '🚨' : '⚠️'
    const status  = remaining <= 0 ? 'หมดแล้ว!' : `เหลือ ${remaining} ขวด`
    const message = `${emoji} Retail Stock\n\n${name}\n${status}\n(แจ้งเตือนที่ ${alert_at} ขวด)`

    const lineRes = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_TOKEN}`,
      },
      body: JSON.stringify({
        to: LINE_USER_ID,
        messages: [{ type: 'text', text: message }],
      }),
    })

    if (!lineRes.ok) {
      const err = await lineRes.text()
      return new Response(JSON.stringify({ error: 'Line API failed', detail: err }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // บันทึก log
    await supabase.from('line_notify_log').insert({
      stock_id,
      notified_at: new Date().toISOString(),
      remaining,
    })

    return new Response(JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
