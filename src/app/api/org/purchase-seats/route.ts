import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const { orgId, orgName, engineSlug, seats } = await req.json();

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

  const { data: existing } = await supabaseAdmin
    .from("organization_engines")
    .select("id")
    .eq("org_id", orgId)
    .eq("engine_id", engine.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabaseAdmin
      .from("organization_engines")
      .update({ enabled: true, licensed_seats: seats })
      .eq("id", existing.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await supabaseAdmin
      .from("organization_engines")
      .insert({ org_id: orgId, engine_id: engine.id, engine_slug: engineSlug, enabled: true, licensed_seats: seats });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { error: invoiceError } = await supabaseAdmin.from("scheduled_platform_invoices").insert({
    org_id: orgId,
    org_name: orgName,
    description: `${engine.name} — ${seats} seat${seats === 1 ? "" : "s"}`,
    amount: tier.price,
    frequency: "monthly",
    next_run: new Date().toISOString().slice(0, 10),
    active: true,
  });
  if (invoiceError) {
    console.error("Failed to schedule invoice for seat purchase:", invoiceError);
  }

  return NextResponse.json({ ok: true });
}
