import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const lineToken = Deno.env.get("LINE_TOKEN") || "";
const lineUserId = Deno.env.get("LINE_USER_ID") || "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ProductionBatch {
  id: number;
  formula_id: number;
  produced_at: string;
  smell_test_count: number;
}

interface AdaptationVersion {
  id: number;
  adaptation_id: number;
  ver: number;
  blended_at: string;
  smell_test_count: number;
}

interface ReminderItem {
  type: "production" | "adaptation";
  name: string;
  day: number;
  date: string;
  id: number;
}

const REMINDER_DAYS = [3, 6, 9, 12];
const MAX_REMINDERS = 4;

async function sendLineMessage(message: string): Promise<boolean> {
  try {
    const response = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lineToken}`,
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: [
          {
            type: "text",
            text: message,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("LINE API error:", error);
    }

    return response.ok;
  } catch (error) {
    console.error("LINE message error:", error);
    return false;
  }
}

function formatThaiDate(dateString: string): string {
  const date = new Date(dateString);
  const day = date.getDate();
  const monthTh = [
    "มกราคม",
    "กุมภาพันธ์",
    "มีนาคม",
    "เมษายน",
    "พฤษภาคม",
    "มิถุนายน",
    "กรกฎาคม",
    "สิงหาคม",
    "กันยายน",
    "ตุลาคม",
    "พฤศจิกายน",
    "ธันวาคม",
  ];
  const month = monthTh[date.getMonth()];
  const year = date.getFullYear() + 543;

  return `${day} ${month} ${year}`;
}

function getDaysSince(dateString: string): number {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function buildMessage(items: ReminderItem[]): string {
  if (items.length === 0) return "";

  const adaptations = items.filter((i) => i.type === "adaptation");
  const productions = items.filter((i) => i.type === "production");

  let message = "✨ เวลาทดสอบกลิ่นแล้ว ✨\n\n";

  if (adaptations.length > 0) {
    message += "My Blends\n";
    adaptations.forEach((item) => {
      message += `🌸 ${item.name}\n`;
      message += `💫 วันที่ ${item.day} หลังผสม | ${item.date}\n\n`;
    });
  }

  if (productions.length > 0) {
    message += "Original\n";
    productions.forEach((item) => {
      message += `🌸 ${item.name}\n`;
      message += `💫 วันที่ ${item.day} หลังผลิต | ${item.date}\n\n`;
    });
  }

  return message.trim();
}

async function checkProductionBatches(): Promise<ReminderItem[]> {
  const items: ReminderItem[] = [];

  try {
    const { data: batches, error } = await supabase
      .from("production_batches")
      .select("id, formula_id, produced_at, smell_test_count");

    if (error) throw error;
    if (!batches || batches.length === 0) return items;

    for (const batch of batches as ProductionBatch[]) {
      const daysSince = getDaysSince(batch.produced_at);
      const matchingDay = REMINDER_DAYS.find((day) => daysSince === day);

      if (matchingDay && batch.smell_test_count < MAX_REMINDERS) {
        const { data: formula } = await supabase
          .from("formulas")
          .select("name")
          .eq("id", batch.formula_id)
          .single();

        if (!formula) continue;

        items.push({
          type: "production",
          name: formula.name,
          day: matchingDay,
          date: formatThaiDate(batch.produced_at),
          id: batch.id,
        });

        // Update smell_test_count
        await supabase
          .from("production_batches")
          .update({ smell_test_count: batch.smell_test_count + 1 })
          .eq("id", batch.id);

        console.log(
          `Queued reminder for production_batch ${batch.id} - day ${matchingDay}`
        );
      }
    }
  } catch (error) {
    console.error("Error checking production batches:", error);
  }

  return items;
}

async function checkAdaptationVersions(): Promise<ReminderItem[]> {
  const items: ReminderItem[] = [];

  try {
    const { data: versions, error } = await supabase
      .from("adaptation_versions")
      .select("id, adaptation_id, ver, blended_at, smell_test_count")
      .neq("status", "abandoned");

    if (error) throw error;
    if (!versions || versions.length === 0) return items;

    for (const version of versions) {
      if (!version.blended_at) continue;

      const daysSince = getDaysSince(version.blended_at);
      const matchingDay = REMINDER_DAYS.find((day) => daysSince === day);

      if (matchingDay && version.smell_test_count < MAX_REMINDERS) {
        const { data: adaptation } = await supabase
          .from("adaptations")
          .select("name")
          .eq("id", version.adaptation_id)
          .single();

        if (!adaptation) continue;

        items.push({
          type: "adaptation",
          name: `${adaptation.name} v${version.ver}`,
          day: matchingDay,
          date: formatThaiDate(version.blended_at),
          id: version.id,
        });

        // Update smell_test_count
        await supabase
          .from("adaptation_versions")
          .update({ smell_test_count: version.smell_test_count + 1 })
          .eq("id", version.id);

        console.log(
          `Queued reminder for adaptation_version ${version.id} - day ${matchingDay}`
        );
      }
    }
  } catch (error) {
    console.error("Error checking adaptation versions:", error);
  }

  return items;
}

serve(async (req) => {
  try {
    console.log("sniff-alert triggered");

    const productionItems = await checkProductionBatches();
    const adaptationItems = await checkAdaptationVersions();

    const allItems = [...adaptationItems, ...productionItems];

    if (allItems.length > 0) {
      const message = buildMessage(allItems);
      const sent = await sendLineMessage(message);
      console.log(
        `Sent message with ${allItems.length} items, success: ${sent}`
      );
    } else {
      console.log("No reminders needed today");
    }

    return new Response(
      JSON.stringify({
        message: "Smell test reminders processed",
        items: allItems.length,
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
