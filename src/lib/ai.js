// ── Global Token Tracker ──────────────────────────────────────────────────────
export let sessionTokens = { input: 0, output: 0, calls: 0 }

export async function callAI(system, user) {
  try {
    const r = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/clever-task`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ system, user }),
    })
    const d = await r.json()
    console.log('[callAI raw d]', JSON.stringify(d).substring(0, 300))
    if (d.inputTokens || d.outputTokens) {
      sessionTokens.input  += d.inputTokens  || 0
      sessionTokens.output += d.outputTokens || 0
      sessionTokens.calls  += 1
      window._tokenUpdate && window._tokenUpdate({ ...sessionTokens })
    }
    const text = d.text ?? d.result ?? d.content ?? d.response ?? d.message ?? ''
    return typeof text === 'string' ? text : JSON.stringify(text)
  } catch (e) {
    console.error('[callAI error]', e)
    return ''
  }
}

export function parseAIJson(raw) {
  if (!raw) throw new Error('empty response')
  let s = String(raw)
  s = s.replace(/```json/gi, '').replace(/```/g, '').trim()
  let depth = 0, start = -1, end = -1
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '{') { if (depth === 0) start = i; depth++ }
    else if (s[i] === '}') { depth--; if (depth === 0) { end = i; break } }
  }
  if (start >= 0 && end > start) s = s.substring(start, end + 1)
  try { return JSON.parse(s) } catch (e1) {}
  try {
    const fixed = s.replace(/,([\s\n]*[}\]])/g, '$1')
    return JSON.parse(fixed)
  } catch (e2) {
    throw new Error('parse failed: ' + e2.message)
  }
}

// self-test
try {
  const _t = parseAIJson('{"ingredients":[{"role":"top"}],"notes":"ok"}')
  console.log('[parseAIJson self-test]', _t ? 'PASS' : 'FAIL')
} catch (e) {
  console.error('[parseAIJson self-test FAIL]', e.message)
}
