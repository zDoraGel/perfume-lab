// supabase/functions/line-notify/index.ts
// Scheduled daily — เช็ค aging, key materials, production stock
// Deploy: supabase functions deploy line-notify

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

Deno.serve(async (_req) => {
  const LINE_TOKEN   = Deno.env.get('LINE_TOKEN')!
  const LINE_USER_ID = Deno.env.get('LINE_USER_ID')!

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const today    = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const messages: string[] = []
  const AGING_DAYS = [3, 5, 7, 10, 14]

  // ── 1. Aging checkpoints ────────────────────────────────────────────────────
  const { data: batches } = await supabase
    .from('production_batches')
    .select('id, formula_id, produced_at, qty_produced, qty_sold, formula:formulas(name)')
    .eq('status', 'aging')

  if (batches) {
    for (const b of batches) {
      const days = Math.floor((today.getTime() - new Date(b.produced_at).getTime()) / 86400000)
      if (AGING_DAYS.includes(days)) {
        messages.push(`🧪 Aging Day ${days}\n${b.formula?.name || 'Formula'} · ${b.qty_produced}ml`)
      }
    }
  }

  // ── 2. Production stock ต่ำ ─────────────────────────────────────────────────
  const { data: prodSummary } = await supabase
    .from('production_batches')
    .select('formula_id, qty_produced, qty_sold, formula:formulas(name)')

  if (prodSummary) {
    const map: Record<number, { name: string; produced: number; sold: number }> = {}
    for (const b of prodSummary) {
      const id = b.formula_id
      if (!map[id]) map[id] = { name: b.formula?.name || `Formula ${id}`, produced: 0, sold: 0 }
      map[id].produced += b.qty_produced
      map[id].sold     += b.qty_sold
    }
    for (const [, f] of Object.entries(map)) {
      const remaining = f.produced - f.sold
      if (remaining <= 3 && remaining >= 0) {
        messages.push(`📦 Production Stock ต่ำ\n${f.name}\nเหลือ ${remaining} ขวด — ควรผลิตเพิ่ม`)
      }
    }
  }

  // ── 3. Key materials stock ต่ำ ──────────────────────────────────────────────
  const { data: keyMats } = await supabase
    .from('materials')
    .select('name, stock, stock_alert_at')
    .eq('is_key', true)

  if (keyMats) {
    for (const m of keyMats) {
      const threshold = m.stock_alert_at ?? 10
      if ((m.stock ?? 0) <= threshold) {
        const s = m.stock ?? 0
        messages.push(`⚗️ Key Material ใกล้หมด\n${m.name}\nเหลือ ${s}g (threshold ${threshold}g)`)
      }
    }
  }

  // ── ส่ง Line ────────────────────────────────────────────────────────────────
  if (messages.length > 0) {
    const header = `🌿 Linen Theory\n${new Date().toLocaleDateString('th-TH')}\n${'─'.repeat(20)}`
    await sendLine(LINE_TOKEN, LINE_USER_ID, header + '\n\n' + messages.join('\n\n'))
  }

  return new Response(JSON.stringify({ ok: true, sent: messages.length }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})
