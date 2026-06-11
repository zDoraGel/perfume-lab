import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  // รับทุก POST — return 200 ก่อนเสมอ แล้วค่อย process
  if (req.method !== "POST") {
    return new Response("OK", { status: 200 });
  }

  let body = "";
  try { body = await req.text() } catch { /* ignore */ }

  // ตอบ 200 ทันที — LINE จะถือว่า webhook OK
  const response = new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

  // process async หลังตอบแล้ว
  try {
    if (!body) return response;
    const payload = JSON.parse(body);
    if (!payload.events?.length) return response;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    for (const event of payload.events) {
      if (event.type !== "message" || event.message?.type !== "text") continue;
      const text: string = event.message.text.trim();
      await supabase.from("quick_notes").insert({ content: text, source: "line" });
    }
  } catch (e) {
    console.error("webhook error:", e);
  }

  return response;
});
