import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireFounder } from "@/lib/server/guards";

const deny = () => NextResponse.json({ error: "Not allowed." }, { status: 403 });
const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

// GET ?orgId=… → everything the founder licensing page needs for one org
export async function GET(req: NextRequest) {
  if (!(await requireFounder())) return deny();
  const orgId = req.nextUrl.searchParams.get("orgId");
  if (!orgId) return fail("Missing orgId.");

  const [engines, orgEngines, licenses, members, offers, org] = await Promise.all([
    supabaseAdmin.from("engines").select("id, slug, name").order("name"),
    supabaseAdmin.from("organization_engines").select("engine_id, enabled, licensed_seats").eq("org_id", orgId),
    supabaseAdmin.from("user_engine_licenses").select("engine_id, user_id").eq("org_id", orgId),
    supabaseAdmin.from("org_users").select("user_id, full_name, email, role").eq("org_id", orgId),
    supabaseAdmin.from("org_offers").select("*").eq("org_id", orgId).order("created_at", { ascending: false }),
    supabaseAdmin.from("organizations").select("id, name, trial_ends_at, package_confirmed_at").eq("id", orgId).maybeSingle(),
  ]);

  const memberById = new Map((members.data ?? []).map(m => [m.user_id, m]));
  return NextResponse.json({
    org: org.data,
    engines: (engines.data ?? []).map(e => {
      const oe = orgEngines.data?.find(x => x.engine_id === e.id);
      const users = (licenses.data ?? []).filter(l => l.engine_id === e.id).map(l => {
        const m = memberById.get(l.user_id);
        return { userId: l.user_id, name: m?.full_name ?? null, email: m?.email ?? null };
      });
      return { ...e, enabled: oe?.enabled ?? false, licensedSeats: oe?.licensed_seats ?? 0, users };
    }),
    offers: offers.data ?? [],
  });
}

// POST { action, orgId, ... }
export async function POST(req: NextRequest) {
  const founder = await requireFounder();
  if (!founder) return deny();
  const body = await req.json();
  const { action, orgId } = body;
  if (!orgId) return fail("Missing orgId.");

  if (action === "set_seats") {
    const seats = Number(body.seats);
    if (!Number.isInteger(seats) || seats < 0) return fail("Seats must be a whole number, 0 or more.");
    const { data: engine } = await supabaseAdmin.from("engines").select("id").eq("slug", body.engineSlug).maybeSingle();
    if (!engine) return fail("Unknown engine.");

    // Reducing seats below what's assigned: free the most recently assigned users first
    const { data: assigned } = await supabaseAdmin
      .from("user_engine_licenses").select("id").eq("org_id", orgId).eq("engine_id", engine.id)
      .order("assigned_at", { ascending: false });
    const excess = Math.max(0, (assigned?.length ?? 0) - seats);
    if (excess > 0) {
      const ids = assigned!.slice(0, excess).map(a => a.id);
      const { error } = await supabaseAdmin.from("user_engine_licenses").delete().in("id", ids);
      if (error) return fail(error.message, 500);
    }

    const { data: existing } = await supabaseAdmin
      .from("organization_engines").select("id").eq("org_id", orgId).eq("engine_id", engine.id).maybeSingle();
    const patch = { enabled: seats > 0, licensed_seats: seats };
    const { error } = existing
      ? await supabaseAdmin.from("organization_engines").update(patch).eq("id", existing.id)
      : await supabaseAdmin.from("organization_engines").insert({ org_id: orgId, engine_id: engine.id, engine_slug: body.engineSlug, granted_via: "founder", ...patch });
    if (error) return fail(error.message, 500);
    return NextResponse.json({ ok: true, freed: excess });
  }

  if (action === "revoke_user") {
    const { error } = await supabaseAdmin.from("user_engine_licenses").delete()
      .eq("org_id", orgId).eq("user_id", body.userId).eq("engine_id", body.engineId);
    if (error) return fail(error.message, 500);
    return NextResponse.json({ ok: true });
  }

  if (action === "create_offer") {
    const kind = body.kind as string;
    const value = Number(body.value);
    if (!["discount_percent", "discount_fixed", "free_seats", "trial_extension"].includes(kind)) return fail("Unknown offer type.");
    if (!(value > 0)) return fail("Value must be greater than 0.");
    if (kind === "discount_percent" && value > 100) return fail("Percent can't exceed 100.");
    if ((kind === "free_seats" || kind === "trial_extension") && !Number.isInteger(value)) return fail("Whole numbers only.");

    let engineId: string | null = null;
    if (body.engineSlug) {
      const { data: engine } = await supabaseAdmin.from("engines").select("id").eq("slug", body.engineSlug).maybeSingle();
      if (!engine) return fail("Unknown engine.");
      engineId = engine.id;
    }
    if (kind === "free_seats" && !engineId) return fail("Pick an engine for free seats.");

    // Immediate effects first, so a failed effect never leaves a recorded offer behind
    if (kind === "trial_extension") {
      const { data: org } = await supabaseAdmin.from("organizations").select("trial_ends_at").eq("id", orgId).maybeSingle();
      const base = org?.trial_ends_at && new Date(org.trial_ends_at) > new Date() ? new Date(org.trial_ends_at) : new Date();
      base.setDate(base.getDate() + value);
      const { error } = await supabaseAdmin.from("organizations")
        .update({ trial_ends_at: base.toISOString(), trial_locked: false, trial_grace_notified: false }).eq("id", orgId);
      if (error) return fail(error.message, 500);
    }
    if (kind === "free_seats") {
      const { data: oe } = await supabaseAdmin.from("organization_engines")
        .select("id, licensed_seats").eq("org_id", orgId).eq("engine_id", engineId!).maybeSingle();
      const { error } = oe
        ? await supabaseAdmin.from("organization_engines").update({ enabled: true, licensed_seats: (oe.licensed_seats ?? 0) + value }).eq("id", oe.id)
        : await supabaseAdmin.from("organization_engines").insert({ org_id: orgId, engine_id: engineId, engine_slug: body.engineSlug, enabled: true, licensed_seats: value, granted_via: "offer" });
      if (error) return fail(error.message, 500);
    }

    const { error } = await supabaseAdmin.from("org_offers").insert({
      org_id: orgId, kind, engine_id: engineId, value, note: body.note?.trim() || null,
    });
    if (error) return fail(error.message, 500);
    return NextResponse.json({ ok: true });
  }

  if (action === "revoke_offer") {
    const { data: offer } = await supabaseAdmin.from("org_offers").select("*").eq("id", body.offerId).eq("org_id", orgId).maybeSingle();
    if (!offer || offer.status !== "active") return fail("Offer not found or already revoked.");

    // Free seats are taken back; trial days can't be un-given, and discounts simply stop applying
    if (offer.kind === "free_seats" && offer.engine_id) {
      const { data: oe } = await supabaseAdmin.from("organization_engines")
        .select("id, licensed_seats").eq("org_id", orgId).eq("engine_id", offer.engine_id).maybeSingle();
      if (oe) {
        const next = Math.max(0, (oe.licensed_seats ?? 0) - Number(offer.value));
        const { data: assigned } = await supabaseAdmin.from("user_engine_licenses").select("id")
          .eq("org_id", orgId).eq("engine_id", offer.engine_id).order("assigned_at", { ascending: false });
        const excess = Math.max(0, (assigned?.length ?? 0) - next);
        if (excess > 0) await supabaseAdmin.from("user_engine_licenses").delete().in("id", assigned!.slice(0, excess).map(a => a.id));
        await supabaseAdmin.from("organization_engines").update({ licensed_seats: next, enabled: next > 0 }).eq("id", oe.id);
      }
    }
    const { error } = await supabaseAdmin.from("org_offers")
      .update({ status: "revoked", revoked_at: new Date().toISOString() }).eq("id", offer.id);
    if (error) return fail(error.message, 500);
    return NextResponse.json({ ok: true });
  }

  return fail("Unknown action.");
}
