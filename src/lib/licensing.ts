import { createClient } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";

export type EngineTier = {
  seats: number;
  price: number;
};

export type EngineLicenseOverview = {
  engineId: string;
  engineSlug: string;
  engineName: string;
  enabled: boolean;
  licensedSeats: number;
  seatsUsed: number;
  tiers: EngineTier[];
  licensedUserIds: string[];
};

// One user = one license, per engine — this is the whole pricing model now
// that packages are gone. Each engine has its own seat-tier ladder
// (2/5/10/25/unlimited seats, priced per tier) instead of a flat per-org fee.
export async function getOrgLicenseOverview(orgId: string): Promise<EngineLicenseOverview[]> {
  const supabase = createClient();

  const [{ data: engines }, { data: orgEngines }, { data: tiers }, { data: licenses }] = await Promise.all([
    supabase.from("engines").select("id, slug, name").order("name"),
    supabase.from("organization_engines").select("engine_id, enabled, licensed_seats").eq("org_id", orgId),
    supabase.from("engine_license_tiers").select("engine_id, seats, price").order("seats"),
    supabase.from("user_engine_licenses").select("engine_id, user_id").eq("org_id", orgId),
  ]);

  return (engines ?? []).map((e) => {
    const oe = orgEngines?.find((x) => x.engine_id === e.id);
    const engineLicenses = licenses?.filter((l) => l.engine_id === e.id) ?? [];
    return {
      engineId: e.id,
      engineSlug: e.slug,
      engineName: e.name,
      enabled: oe?.enabled ?? false,
      licensedSeats: oe?.licensed_seats ?? 0,
      seatsUsed: engineLicenses.length,
      tiers: (tiers ?? []).filter((t) => t.engine_id === e.id).map((t) => ({ seats: t.seats, price: t.price })),
      licensedUserIds: engineLicenses.map((l) => l.user_id),
    };
  });
}

// Checks whether a specific user has a seat on a specific engine. Owners and
// admins bypass this at the call site (they manage the org, they don't need
// a purchased seat to access what they administer) — this function only
// answers the literal "do they have an assigned license" question.
export async function userHasEngineLicense(orgId: string, userId: string, engineSlug: string): Promise<boolean> {
  const supabase = createClient();
  const { data: engine } = await supabase.from("engines").select("id").eq("slug", engineSlug).maybeSingle();
  if (!engine) return false;

  const { data } = await supabase
    .from("user_engine_licenses")
    .select("id")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .eq("engine_id", engine.id)
    .maybeSingle();
  return !!data;
}

export async function assignEngineLicense(orgId: string, userId: string, engineId: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("user_engine_licenses").insert({ org_id: orgId, user_id: userId, engine_id: engineId });
  if (error) return { error: error.message };
  return { error: null };
}

export async function revokeEngineLicense(orgId: string, userId: string, engineId: string): Promise<void> {
  const supabase = createClient();
  await supabase.from("user_engine_licenses").delete().eq("org_id", orgId).eq("user_id", userId).eq("engine_id", engineId);
}

// Used when someone's removed from the org — frees every seat they held so
// it can be reassigned instead of staying consumed by a departed user.
export async function revokeAllLicensesForUser(orgId: string, userId: string): Promise<void> {
  const supabase = createClient();
  await supabase.from("user_engine_licenses").delete().eq("org_id", orgId).eq("user_id", userId);
}

export type Department = {
  id: string;
  org_id: string;
  name: string;
  created_at: string;
};

export async function getDepartments(orgId: string): Promise<Department[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("departments").select("*").eq("org_id", orgId).order("name");
  if (error) { console.error(error); return []; }
  return data as Department[];
}

export async function createDepartment(orgId: string, name: string): Promise<Department | null> {
  const supabase = createClient();
  const { data, error } = await supabase.from("departments").insert({ org_id: orgId, name }).select().single();
  if (error) { console.error(error); return null; }
  return data as Department;
}

export async function getDepartmentDefaultEngineIds(departmentId: string): Promise<string[]> {
  const supabase = createClient();
  const { data } = await supabase.from("department_engine_defaults").select("engine_id").eq("department_id", departmentId);
  return (data ?? []).map((d) => d.engine_id);
}

export async function setDepartmentDefaultEngines(departmentId: string, engineIds: string[]): Promise<void> {
  const supabase = createClient();
  await supabase.from("department_engine_defaults").delete().eq("department_id", departmentId);
  if (engineIds.length > 0) {
    await supabase.from("department_engine_defaults").insert(engineIds.map((engine_id) => ({ department_id: departmentId, engine_id })));
  }
}

// Bumps (or sets, for the first time) how many seats an org has purchased
// for an engine. organization_engines is founder-only to write at the RLS
// level, so this runs server-side — see /api/org/purchase-seats.
export async function purchaseSeats(orgId: string, orgName: string, engineSlug: string, seats: number): Promise<{ error: string | null }> {
  const res = await fetch("/api/org/purchase-seats", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orgId, orgName, engineSlug, seats }),
  });
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: "Failed to update seats." }));
    return { error };
  }
  await logActivity({ icon: "🎟️", title: "Engine seats updated", sub: `${engineSlug} — ${seats} seats`, org_id: orgId });
  return { error: null };
}
