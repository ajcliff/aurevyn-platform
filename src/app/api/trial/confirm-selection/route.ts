import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

// This is the trial-to-paid conversion flow — the moment a real customer
// picks their paid plan after the 30-day trial. Every write it needs to
// make (organization_engines, organizations, scheduled_platform_invoices)
// is founder-only at the RLS level, but it was running entirely from the
// org owner's own client session with none of the results checked. That
// meant every one of the four writes silently failed for every customer,
// the function returned true regardless, and the org just kept every
// engine enabled forever with no invoice ever generated — nothing about
// this flow ever actually worked. Moving it server-side with the service
// role, and only reporting success once it genuinely is one.
export async function POST(req: NextRequest) {
  const { orgId, orgName, selectedEngineIds } = await req.json();

  if (!orgId) {
    return NextResponse.json({ error: "Missing orgId." }, { status: 400 });
  }

  const { data: allEngines, error: enginesError } = await supabaseAdmin
    .from("engines")
    .select("id, name, monthly_price");
  if (enginesError || !allEngines) {
    return NextResponse.json({ error: enginesError?.message || "Couldn't load engine pricing." }, { status: 500 });
  }

  const selectedEngines = allEngines.filter((e) => selectedEngineIds.includes(e.id));
  const total = selectedEngines.reduce((sum, e) => sum + Number(e.monthly_price), 0);

  const { error: disableError } = await supabaseAdmin
    .from("organization_engines")
    .update({ enabled: false })
    .eq("org_id", orgId);
  if (disableError) {
    return NextResponse.json({ error: disableError.message }, { status: 500 });
  }

  if (selectedEngineIds.length > 0) {
    const { error: enableError } = await supabaseAdmin
      .from("organization_engines")
      .update({ enabled: true, subscription_tier: "Custom" })
      .eq("org_id", orgId)
      .in("engine_id", selectedEngineIds);
    if (enableError) {
      return NextResponse.json({ error: enableError.message }, { status: 500 });
    }
  }

  const { error: orgError } = await supabaseAdmin
    .from("organizations")
    .update({
      package: `Custom (${selectedEngines.length} engine${selectedEngines.length === 1 ? "" : "s"})`,
      trial_locked: false,
      package_confirmed_at: new Date().toISOString(),
    })
    .eq("id", orgId);
  if (orgError) {
    return NextResponse.json({ error: orgError.message }, { status: 500 });
  }

  const engineList = selectedEngines.map((e) => e.name).join(", ");

  const { error: invoiceError } = await supabaseAdmin.from("scheduled_platform_invoices").insert({
    org_id: orgId,
    org_name: orgName,
    description: `Custom plan (${engineList || "no engines selected"})`,
    amount: total,
    frequency: "monthly",
    next_run: new Date().toISOString().slice(0, 10),
    active: true,
  });
  if (invoiceError) {
    return NextResponse.json({ error: invoiceError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, engineCount: selectedEngines.length, total });
}
