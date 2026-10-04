import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireOrgAdmin } from "@/lib/server/guards";
import { applyDiscounts } from "@/lib/server/offers";

// Trial → paid conversion under the licensing model. Every write here is
// founder-only at the RLS level (organization_engines, organizations,
// scheduled_platform_invoices), so it runs with the service role; the org
// owner's own session could never make these changes.
//
// selections: [{ engineId, seats }] — one entry per engine the org keeps,
// seats being one of that engine's tier sizes. One user = one seat.
export async function POST(req: NextRequest) {
  const { orgId, selections } = await req.json();

  const access = orgId ? await requireOrgAdmin(orgId) : null;
  if (!access) return NextResponse.json({ error: "Not allowed." }, { status: 403 });

  if (!orgId || !Array.isArray(selections) || selections.length === 0) {
    return NextResponse.json({ error: "Pick at least one engine." }, { status: 400 });
  }

  const { data: orgRow } = await supabaseAdmin.from("organizations").select("name").eq("id", orgId).maybeSingle();
  if (!orgRow) return NextResponse.json({ error: "Organization not found." }, { status: 404 });
  const orgName = orgRow.name;

  const engineIds: string[] = selections.map((s: any) => s.engineId);

  const [{ data: engines }, { data: tiers }, { data: licenses }] = await Promise.all([
    supabaseAdmin.from("engines").select("id, name, slug"),
    supabaseAdmin.from("engine_license_tiers").select("engine_id, seats, price").in("engine_id", engineIds),
    supabaseAdmin.from("user_engine_licenses").select("engine_id").eq("org_id", orgId),
  ]);
  if (!engines || !tiers) {
    return NextResponse.json({ error: "Couldn't load engine pricing." }, { status: 500 });
  }

  const { data: freeSeatOffers } = await supabaseAdmin
    .from("org_offers").select("engine_id, value").eq("org_id", orgId).eq("status", "active").eq("kind", "free_seats");
  const bonusFor = (engineId: string) =>
    (freeSeatOffers ?? []).filter((o) => o.engine_id === engineId).reduce((n, o) => n + Number(o.value), 0);

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
    const { price: discounted } = await applyDiscounts(orgId, engine.id, Number(tier.price));
    chosen.push({ engine, seats: sel.seats, price: discounted });
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
        .update({ enabled: true, licensed_seats: c.seats + bonusFor(c.engine.id), subscription_tier: "licensed" })
        .eq("id", existing.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      const { error } = await supabaseAdmin.from("organization_engines").insert({
        org_id: orgId,
        engine_id: c.engine.id,
        engine_slug: c.engine.slug,
        enabled: true,
        licensed_seats: c.seats + bonusFor(c.engine.id),
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

  // First subscription invoice goes out immediately. Every later month is generated by the
  // nightly generate_subscription_invoices() job from the org's *current* seats and offers,
  // so upgrades, free seats and discounts always flow into the next invoice.
  const today = new Date();
  const due = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const { error: invoiceError } = await supabaseAdmin.from("invoices").insert({
    org_id: orgId,
    org_name: orgName,
    amount: `KES ${Math.round(total).toLocaleString("en-KE")}`,
    amount_kes: total,
    status: "pending",
    due_date: due.toISOString().slice(0, 10),
    description: `Subscription ${today.toLocaleDateString("en-KE", { month: "short", year: "numeric" })}: ${description}`,
    kind: "subscription",
    period_start: today.toISOString().slice(0, 10),
  });
  if (invoiceError) return NextResponse.json({ error: invoiceError.message }, { status: 500 });

  return NextResponse.json({ ok: true, engineCount: chosen.length, total });
}
