import { createClient } from "./supabase";
import { logActivity } from "./activity";

export type TrialInfo = {
  trialEndsAt: string | null;
  trialLocked: boolean;
  packageConfirmedAt: string | null;
  daysLeft: number | null;
  inGracePeriod: boolean;
  // Trial and the 2-day grace period are both over and no plan was confirmed
  expired: boolean;
};

export async function getTrialInfo(orgId: string): Promise<TrialInfo> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("trial_ends_at, trial_locked, package_confirmed_at")
    .eq("id", orgId)
    .single();

  if (error || !data) {
    return { trialEndsAt: null, trialLocked: false, packageConfirmedAt: null, daysLeft: null, inGracePeriod: false, expired: false };
  }

  let daysLeft: number | null = null;
  let inGracePeriod = false;
  let expired = false;

  if (data.trial_ends_at && !data.package_confirmed_at) {
    const trialEnd = new Date(data.trial_ends_at).getTime();
    const now = Date.now();
    const graceEnd = trialEnd + 2 * 24 * 60 * 60 * 1000;

    if (now < trialEnd) {
      daysLeft = Math.ceil((trialEnd - now) / (24 * 60 * 60 * 1000));
    } else if (now < graceEnd) {
      inGracePeriod = true;
      daysLeft = Math.ceil((graceEnd - now) / (24 * 60 * 60 * 1000));
    } else {
      expired = true;
    }
  }

  return {
    trialEndsAt: data.trial_ends_at,
    trialLocked: data.trial_locked,
    packageConfirmedAt: data.package_confirmed_at,
    daysLeft,
    inGracePeriod,
    expired,
  };
}

export type PricedEngine = {
  id: string;
  name: string;
  slug: string;
  tiers: { seats: number; price: number }[];
  // Users already holding a seat on this engine — a tier smaller than this
  // can't be chosen without revoking seats first.
  seatsInUse: number;
};

export async function getEnginePricing(orgId: string): Promise<PricedEngine[]> {
  const supabase = createClient();
  const [{ data: engines }, { data: tiers }, { data: licenses }] = await Promise.all([
    supabase.from("engines").select("id, name, slug").order("name"),
    supabase.from("engine_license_tiers").select("engine_id, seats, price").order("seats"),
    supabase.from("user_engine_licenses").select("engine_id").eq("org_id", orgId),
  ]);

  return (engines ?? [])
    .map((e) => ({
      id: e.id,
      name: e.name,
      slug: e.slug,
      tiers: (tiers ?? []).filter((t) => t.engine_id === e.id).map((t) => ({ seats: t.seats, price: Number(t.price) })),
      seatsInUse: (licenses ?? []).filter((l) => l.engine_id === e.id).length,
    }))
    .filter((e) => e.tiers.length > 0);
}

export type EngineSelection = { engineId: string; seats: number };

/**
 * Plan confirmation once the trial ends: for each engine the org actually
 * uses, pick how many seats (one user = one seat). The monthly total is the
 * sum of each engine's chosen seat tier — no packages, and nobody pays for
 * an engine or a seat they don't use. Runs server-side because every write
 * involved is founder-only at the RLS level.
 */
export async function confirmEngineSelection(
  orgId: string,
  orgName: string,
  selections: EngineSelection[]
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch("/api/trial/confirm-selection", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orgId, orgName, selections }),
  });

  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: "Failed to confirm plan." }));
    console.error("confirmEngineSelection failed:", error);
    return { ok: false, error };
  }

  const result = await res.json();

  await logActivity({
    icon: "✅",
    title: "Plan confirmed",
    sub: `${orgName} licensed ${result.engineCount} engine${result.engineCount === 1 ? "" : "s"} — KES ${result.total.toLocaleString()}/mo`,
    org_id: orgId,
  });

  return { ok: true };
}
