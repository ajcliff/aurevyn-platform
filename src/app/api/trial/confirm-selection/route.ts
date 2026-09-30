import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

// Trial → paid conversion under the licensing model. Every write here is
// founder-only at the RLS level (organization_engines, organizations,
// scheduled_platform_invoices), so it runs with the service role; the org
// owner's own session could never make these changes.
//
// selections: [{ engineId, seats }] — one entry per engine the org keeps,
// seats being one of that engine's tier sizes. One user = one seat.
export async function POST(req: NextRequest) {
  const { orgId, orgName, selections } = await req.json();

  if (!orgId || !Array.isArray(selections) || selections.length === 0) {
    return NextResponse.json({ error: "Pick at least one engine." }, { status: 400 });
  }

  const engineIds: string[] = selections.map((s: any) => s.engineId);

  const [{ data: engines }, { data: tiers }, { data: licenses }] = await Promise.all([
    supabaseAdmin.from("engines").select("id, name, slug"),
    supabaseAdmin.from("engine_license_tiers").select("engine_id, seats, price").in("engine_id", engineIds),
    supabaseAdmin.from("user_engine_licenses").select("engine_id").eq("org_id", orgId),
  ]);
  if (!engines || !tiers) {
    return NextResponse.json({ error: "Couldn't load engine pricing." }, { status: 500 });
  }

  const chosen: { engine: { id: string; name: string; slug: string }; seats: number; price: number }[] = [];
  for (const sel of selections) {
    const engine = engines.find((e) => e.id === sel.engineId);
    const tier = tiers.find((t) => t.engine_id === sel.engineId && t.seats === sel.seats);
    if (!engine || !tier) {
      return NextResponse.json({ error: "Invalid engine or seat tier." }, { status: 400 });
    }
    const inUse = (licenses ?? []).filter((l) => l.engine_id === engine.id).length;
    if (sel.seats < inUse) {
      return NextResponse.json(
        { error: `${engine.name} already has ${inUse} users on it — choose a tier with at least ${inUse} seats, or remove some users from it first.` },
        { status: 400 }
      );
    }
    chosen.push({ engine, seats: sel.seats, price: Number(tier.price) });
  }

  // AI Insights only makes sense on top of another engine
  if (chosen.some((c) => c.engine.slug === "ai-insights") && chosen.length === 1) {
    return NextResponse.json({ error: "AI Insights needs at least one other engine alongside it." }, { status: 400 });
  }

  const total = chosen.reduce((sum, c) => sum + c.price, 0);

  // Everything not selected is switched off, and its seat assignments freed
  const keptIds = chosen.map((c) => c.engine.id);
  const { data: allOrgEngines } = await supabaseAdmin.from("organization_engines").select("id, engine_id").eq("org_id", orgId);
  const dropIds = (allOrgEngines ?? []).filter((oe) => !keptIds.includes(oe.engine_id)).map((oe) => oe.engine_id);

  if (dropIds.length > 0) {
    const { error: dropError } = await supabaseAdmin
      .from("organization_engines")
      .update({ enabled: false, licensed_seats: 0 })
      .eq("org_id", orgId)
      .in("engine_id", dropIds);
    if (dropError) return NextResponse.json({ error: dropError.message }, { status: 500 });

    const { error: freeError } = await supabaseAdmin
      .from("user_engine_licenses")
      .delete()
      .eq("org_id", orgId)
      .in("engine_id", dropIds);
    if (freeError) return NextResponse.json({ error: freeError.message }, { status: 500 });
  }

  for (const c of chosen) {
    const existing = allOrgEngines?.find((oe) => oe.engine_id === c.engine.id);
    if (existing) {
      const { error } = await supabaseAdmin
        .from("organization_engines")
        .update({ enabled: true, licensed_seats: c.seats, subscription_tier: "licensed" })
        .eq("id", existing.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      const { error } = await supabaseAdmin.from("organization_engines").insert({
        org_id: orgId,
        engine_id: c.engine.id,
        engine_slug: c.engine.slug,
        enabled: true,
        licensed_seats: c.seats,
        subscription_tier: "licensed",
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  const { error: orgError } = await supabaseAdmin
    .from("organizations")
    .update({
      package: `Licensed (${chosen.length} engine${chosen.length === 1 ? "" : "s"})`,
      trial_locked: false,
      package_confirmed_at: new Date().toISOString(),
    })
    .eq("id", orgId);
  if (orgError) return NextResponse.json({ error: orgError.message }, { status: 500 });

  const description = chosen
    .map((c) => `${c.engine.name} (${c.seats >= 999999 ? "unlimited" : c.seats} seats)`)
    .join(", ");

  const { error: invoiceError } = await supabaseAdmin.from("scheduled_platform_invoices").insert({
    org_id: orgId,
    org_name: orgName,
    description: `Licenses: ${description}`,
    amount: total,
    frequency: "monthly",
    next_run: new Date().toISOString().slice(0, 10),
    active: true,
  });
  if (invoiceError) return NextResponse.json({ error: invoiceError.message }, { status: 500 });

  return NextResponse.json({ ok: true, engineCount: chosen.length, total });
}
