import { supabaseAdmin } from "@/lib/supabase/server";

// Applies every active discount offer an org holds to a list price.
// An offer with engine_id = null applies to all engines. Percent offers stack
// multiplicatively, fixed offers subtract; the result never goes below zero.
export async function applyDiscounts(orgId: string, engineId: string, price: number): Promise<{ price: number; applied: string[] }> {
  const { data } = await supabaseAdmin
    .from("org_offers")
    .select("kind, value, engine_id, note")
    .eq("org_id", orgId)
    .eq("status", "active")
    .in("kind", ["discount_percent", "discount_fixed"]);

  let result = price;
  const applied: string[] = [];
  for (const o of data ?? []) {
    if (o.engine_id && o.engine_id !== engineId) continue;
    if (o.kind === "discount_percent") result = result * (1 - Math.min(Number(o.value), 100) / 100);
    else result = result - Number(o.value);
    applied.push(o.kind === "discount_percent" ? `${o.value}% off` : `KES ${o.value} off`);
  }
  return { price: Math.max(0, Math.round(result)), applied };
}
