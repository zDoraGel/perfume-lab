// supabase/functions/trend-fetch/index.ts
// Deploy: supabase functions deploy trend-fetch
// Secrets needed: ANTHROPIC_API_KEY (มีอยู่แล้ว)

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
    const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY')!
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // ── ให้ Claude ค้นหา + สรุป trend พร้อมกันเลย ──────────────────────────
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-2025-03-05',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{
          role: 'user',
          content: `Search for the latest perfume and fragrance trends in 2026. 
Find what notes, ingredients, and styles are popular right now among niche perfumers and fragrance enthusiasts.

Then return ONLY a JSON array (no markdown, no explanation) with exactly 5 trending fragrance concepts:
[
  {
    "title": "Short trend name in English (max 5 words)",
    "description": "2-3 sentences in Thai explaining the trend and why it's interesting for indie perfumers.",
    "keywords": ["material1", "material2", "material3"]
  }
]

Keywords must be actual perfumery materials (e.g. Hedione, White Musk, Iso E Super, Ambroxan, White Tea, etc.)`
        }]
      })
    })

    const aiData = await aiRes.json()
    
    // หา text block สุดท้าย
    const textBlock = aiData.content?.filter((b: any) => b.type === 'text').pop()
    const aiText = textBlock?.text || '[]'

    let trends: any[] = []
    try {
      const clean = aiText.replace(/```json|```/g, '').trim()
      // หา JSON array ใน text
      const match = clean.match(/\[[\s\S]*\]/)
      trends = match ? JSON.parse(match[0]) : []
    } catch {
      trends = []
    }

    if (!trends.length) {
      return new Response(JSON.stringify({ error: 'parse failed', raw: aiText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // บันทึกลง Supabase
    const { data, error } = await supabase.from('trend_items').insert(
      trends.map((t: any) => ({
        title:       t.title,
        description: t.description,
        keywords:    t.keywords || [],
        fetched_at:  new Date().toISOString(),
      }))
    ).select()

    if (error) throw error

    return new Response(JSON.stringify({ ok: true, trends: data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
