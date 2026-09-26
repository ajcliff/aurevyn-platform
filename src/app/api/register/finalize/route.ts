import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

// organization_engines and notifications are both founder-only tables at the
// RLS level (a regular org member can read organization_engines but never
// insert into it, and notifications is founder-write-only) — so neither of
// these writes was ever going to succeed running as the brand-new org
// owner's own client session. Registration was calling both client-side and
// silently swallowing the resulting RLS errors, which is why every
// self-registered org has been landing with zero engines enabled. Moving
// both here, server-side with the service role, fixes that at the source.
export async function POST(req: NextRequest) {
  const { orgId, orgName, packageSlug } = await req.json();

  if (!orgId) {
    return NextResponse.json({ error: "Missing orgId." }, { status: 400 });
  }

  const { data: allEngines, error: enginesError } = await supabaseAdmin
    .from("engines")
    .select("id, slug");

  if (enginesError) {
    return NextResponse.json({ error: enginesError.message }, { status: 500 });
  }

  if (allEngines?.length) {
    const engineRows = allEngines.map((engine) => ({
      org_id: orgId,
      engine_id: engine.id,
      engine_slug: engine.slug,
      enabled: true,
      subscription_tier: packageSlug ?? null,
    }));

    const { error: grantError } = await supabaseAdmin.from("organization_engines").insert(engineRows);
    if (grantError) {
      // This one really matters — an org with no engines is unusable, so
      // this is a hard failure, not a log-and-continue.
      return NextResponse.json({ error: `Failed to grant trial engines: ${grantError.message}` }, { status: 500 });
    }
  }

  // Best-effort — a missed founder notification shouldn't block registration.
  const { error: notifyError } = await supabaseAdmin.from("notifications").insert({
    type: "new_org",
    title: "New organization registered",
    message: `${orgName ?? "An organization"} signed up on the ${packageSlug ?? "trial"} plan`,
    read: false,
  });
  if (notifyError) {
    console.error("Failed to create registration notification:", notifyError);
  }

  return NextResponse.json({ ok: true });
}
