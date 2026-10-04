import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireOrgAdmin } from "@/lib/server/guards";
import { applyDiscounts } from "@/lib/server/offers";

export async function POST(req: NextRequest) {
  const { orgId, engineSlug, seats } = await req.json();

  const access = orgId ? await requireOrgAdmin(orgId) : null;
  if (!access) return NextResponse.json({ error: "Not allowed." }, { status: 403 });

  if (!orgId || !engineSlug || !seats) {
    return NextResponse.json({ error: "Missing orgId, engineSlug, or seats." }, { status: 400 });
  }

  const { data: engine, error: engineError } = await supabaseAdmin
    .from("engines")
    .select("id, name")
    .eq("slug", engineSlug)
    .maybeSingle();
  if (engineError || !engine) {
    return NextResponse.json({ error: "Unknown engine." }, { status: 400 });
  }

  const { data: tier, error: tierError } = await supabaseAdmin
    .from("engine_license_tiers")
    .select("price")
    .eq("engine_id", engine.id)
    .eq("seats", seats)
    .maybeSingle();
  if (tierError || !tier) {
    return NextResponse.json({ error: "No pricing tier found for that seat count." }, { status: 400 });
  }

  const { data: org } = await supabaseAdmin.from("organizations").select("name").eq("id", orgId).maybeSingle();
  if (!org) return NextResponse.json({ error: "Organization not found." }, { status: 404 });

  const { price: finalPrice, applied } = await applyDiscounts(orgId, engine.id, tier.price);

  // Free seats granted by offers stay on top of whatever tier is bought
  const { data: bonusOffers } = await supabaseAdmin.from("org_offers").select("value")
    .eq("org_id", orgId).eq("engine_id", engine.id).eq("kind", "free_seats").eq("status", "active");
  const bonus = (bonusOffers ?? []).reduce((n, o) => n + Number(o.value), 0);

  const { data: existing } = await supabaseAdmin
    .from("organization_engines")
    .select("id, licensed_seats, enabled")
    .eq("org_id", orgId)
    .eq("engine_id", engine.id)
    .maybeSingle();

  // Never shrink below the people who already hold a seat
  const { count: inUse } = await supabaseAdmin.from("user_engine_licenses")
    .select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("engine_id", engine.id);
  if ((inUse ?? 0) > seats + bonus) {
    return NextResponse.json({ error: `${inUse} users already hold seats. Remove some before choosing a smaller plan.` }, { status: 409 });
  }

  // What they were paying for this engine before this change (0 if not licensed)
  let oldPrice = 0;
  if (existing?.enabled) {
    const oldPaid = Math.max((existing.licensed_seats ?? 0) - bonus, 0);
    if (oldPaid > 0) {
      const { data: oldTier } = await supabaseAdmin.from("engine_license_tiers").select("price")
        .eq("engine_id", engine.id).gte("seats", oldPaid).order("seats").limit(1).maybeSingle();
      if (oldTier) oldPrice = (await applyDiscounts(orgId, engine.id, Number(oldTier.price))).price;
    }
  }

  if (existing) {
    const { error } = await supabaseAdmin
      .from("organization_engines")
      .update({ enabled: true, licensed_seats: seats + bonus })
      .eq("id", existing.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await supabaseAdmin
      .from("organization_engines")
      .insert({ org_id: orgId, engine_id: engine.id, engine_slug: engineSlug, enabled: true, licensed_seats: seats + bonus });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Only an increase is billed now (the difference). The nightly job bills the new
  // monthly total from the next cycle, so no recurring schedule is created here.
  const difference = finalPrice - oldPrice;
  if (difference > 0) {
    const due = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const { error: invoiceError } = await supabaseAdmin.from("invoices").insert({
      org_id: orgId,
      org_name: org.name,
      amount: `KES ${Math.round(difference).toLocaleString("en-KE")}`,
      amount_kes: difference,
      status: "pending",
      due_date: due.toISOString().slice(0, 10),
      description: `Upgrade: ${engine.name}, ${seats} seat${seats === 1 ? "" : "s"}${applied.length ? ` (${applied.join(", ")})` : ""}`,
      kind: "upgrade",
    });
    if (invoiceError) {
      console.error("Failed to create upgrade invoice:", invoiceError);
      return NextResponse.json({ error: "Seats were updated but the invoice could not be created. Contact support." }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
