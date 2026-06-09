import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const LINE_TOKEN = Deno.env.get("LINE_TOKEN")!;
const LINE_USER_ID = Deno.env.get("LINE_USER_ID")!;

async function sendLine(message: string) {
  await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${LINE_TOKEN}`,
    },
    body: JSON.stringify({
      to: LINE_USER_ID,
      messages: [{ type: "text", text: message }],
    }),
  });
}

Deno.serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const messages: string[] = [];
  const AGING_DAYS = [3, 5, 7, 10, 14];

  // 1. Aging checkpoints
  const { data: batches } = await supabase
    .from("production_batches")
    .select("id, formula_id, produced_at, qty_produced, qty_sold, concentration, bottle_ml, formulas(name)");

  if (batches) {
    for (const b of batches) {
      const produced = new Date(b.produced_at);
      const daysSince = Math.floor((today.getTime() - produced.getTime()) / 86400000);
      const name = (b.formulas as any)?.name || `Formula #${b.formula_id}`;
      const remaining = (b.qty_produced || 0) - (b.qty_sold || 0);

      if (AGING_DAYS.includes(daysSince)) {
        const emoji = daysSince <= 5 ? '🌱' : daysSince <= 10 ? '🌿' : '✨';
        messages.push(
          `${emoji} Aging Day ${daysSince}\n${name} · ${b.concentration} ${b.bottle_ml}ml\n` +
          `ผสมเมื่อ ${b.produced_at} · เหลือ ${remaining} ขวด\n` +
          `→ เปิด app ให้คะแนนกลิ่นวันนี้ได้เลยค่ะ`
        );
      }
    }
  }

  // 2. Stock ต่ำ
  const { data: stock } = await supabase
    .from("product_stock")
    .select("formula_name, stock_remaining, concentration, bottle_ml")
    .lt("stock_remaining", 3);

  if (stock) {
    for (const s of stock) {
      messages.push(`⚠️ Stock ต่ำ!\n${s.formula_name} ${s.concentration || ""} ${s.bottle_ml || ""}ml\nเหลือ ${s.stock_remaining} ขวด`);
    }
  }

  if (messages.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
  }

  const fullMessage =
    `🌿 Linen Theory\n${today.toLocaleDateString("th-TH")}\n${"─".repeat(20)}\n\n` +
    messages.join("\n\n─────────\n\n");

  await sendLine(fullMessage);
  return new Response(JSON.stringify({ sent: messages.length }), { status: 200 });
});
