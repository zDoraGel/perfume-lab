// supabase/functions/clever-task/index.ts
// Generic AI task endpoint — called by src/lib/ai.js -> callAI(system, user)
// Contract: POST body { system, user } -> returns { text, inputTokens, outputTokens }

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY')
    if (!ANTHROPIC_KEY) {
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not set in Edge Function secrets' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    let body: any = {}
    try {
      body = await req.json()
    } catch {
      return new Response(JSON.stringify({ error: 'invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { system, user } = body
    if (!user) {
      return new Response(JSON.stringify({ error: 'missing "user" field in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 4096,
        ...(system ? { system } : {}),
        messages: [{ role: 'user', content: user }],
      }),
    })

    const aiData = await aiRes.json()

    // Anthropic returns { type: 'error', error: { type, message } } on failure —
    // this is the most likely cause of the previous "empty response" bug:
    // aiData.content was undefined, so text ended up '' with no visible error.
    if (!aiRes.ok || aiData.type === 'error') {
      const msg = aiData?.error?.message || `Anthropic API error (status ${aiRes.status})`
      return new Response(JSON.stringify({ error: msg, raw: aiData }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const textBlock = aiData.content?.filter((b: any) => b.type === 'text').pop()
    const text = textBlock?.text ?? ''

    if (!text) {
      return new Response(JSON.stringify({ error: 'empty text in Anthropic response', raw: aiData }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({
      text,
      inputTokens: aiData.usage?.input_tokens ?? 0,
      outputTokens: aiData.usage?.output_tokens ?? 0,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
