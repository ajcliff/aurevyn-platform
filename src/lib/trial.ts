import { createClient } from "./supabase";
import { logActivity } from "./activity";

export type TrialInfo = {
  trialEndsAt: string | null;
  trialLocked: boolean;
  packageConfirmedAt: string | null;
  daysLeft: number | null;
  inGracePeriod: boolean;
};

export async function getTrialInfo(orgId: string): Promise<TrialInfo> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("trial_ends_at, trial_locked, package_confirmed_at")
    .eq("id", orgId)
    .single();

  if (error || !data) {
    return { trialEndsAt: null, trialLocked: false, packageConfirmedAt: null, daysLeft: null, inGracePeriod: false };
  }

  let daysLeft: number | null = null;
  let inGracePeriod = false;

  if (data.trial_ends_at && !data.package_confirmed_at) {
    const trialEnd = new Date(data.trial_ends_at).getTime();
    const now = Date.now();
    const graceEnd = trialEnd + 2 * 24 * 60 * 60 * 1000;

    if (now < trialEnd) {
      daysLeft = Math.ceil((trialEnd - now) / (24 * 60 * 60 * 1000));
    } else if (now < graceEnd) {
      inGracePeriod = true;
      daysLeft = Math.ceil((graceEnd - now) / (24 * 60 * 60 * 1000));
    }
  }

  return {
    trialEndsAt: data.trial_ends_at,
    trialLocked: data.trial_locked,
    packageConfirmedAt: data.package_confirmed_at,
    daysLeft,
    inGracePeriod,
  };
}

export type PricedEngine = {
  id: string;
  name: string;
  slug: string;
  monthly_price: number;
};

export async function getEnginePricing(): Promise<PricedEngine[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("engines")
    .select("id, name, slug, monthly_price")
    .order("monthly_price", { ascending: false });

  if (error || !data) return [];
  return data as PricedEngine[];
}

/**
 * A-la-carte plan confirmation: the org picks exactly the engines they've
 * actually used during the trial, priced individually and summed - not
 * mapped to a fixed package tier. This avoids forcing anyone to pay for
 * engines bundled into a tier that they don't actually use.
 */
export async function confirmEngineSelection(
  orgId: string,
  orgName: string,
  selectedEngineIds: string[]
): Promise<boolean> {
  const res = await fetch("/api/trial/confirm-selection", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orgId, orgName, selectedEngineIds }),
  });

  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: "Failed to confirm plan." }));
    console.error("confirmEngineSelection failed:", error);
    return false;
  }

  const result = await res.json();

  await logActivity({
    icon: "✅",
    title: "Plan confirmed",
    sub: `${orgName} selected ${result.engineCount} engine${result.engineCount === 1 ? "" : "s"} — KES ${result.total.toLocaleString()}/mo`,
    org_id: orgId,
  });

  return true;
}
