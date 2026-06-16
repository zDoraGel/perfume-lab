// supabase/functions/trend-fetch/index.ts
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

    // ใช้ Claude knowledge โดยตรง ไม่ใช้ web search (เร็วกว่า ไม่ timeout)
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: `You are a fragrance industry expert. Based on your knowledge of 2025-2026 perfume trends, return ONLY a valid JSON array with exactly 5 trending fragrance concepts for indie/niche perfumers. No markdown, no explanation, just the JSON array.

[
  {
    "title": "Short trend name (max 5 words)",
    "description": "2-3 sentences in Thai explaining the trend and why it matters for indie perfumers.",
    "keywords": ["material1", "material2", "material3"]
  }
]

Keywords must be real perfumery materials (e.g. Hedione, Ambroxan, Iso E Super, Skin Musk, etc.)`
        }]
      })
    })

    const aiData = await aiRes.json()
    const textBlock = aiData.content?.filter((b: any) => b.type === 'text').pop()
    const aiText = textBlock?.text || '[]'

    let trends: any[] = []
    try {
      const clean = aiText.replace(/```json|```/g, '').trim()
      const match = clean.match(/\[[\s\S]*\]/)
      trends = match ? JSON.parse(match[0]) : []
    } catch {
      return new Response(JSON.stringify({ error: 'parse failed', raw: aiText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (!trends.length) {
      return new Response(JSON.stringify({ error: 'no trends', raw: aiText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

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
