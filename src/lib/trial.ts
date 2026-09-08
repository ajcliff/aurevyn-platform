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

export type SellablePackage = {
  name: string;
  slug: string;
  price: string;
  features: string;
};

/**
 * Only the four real sellable tiers - "Unlimited" is excluded here since it
 * has no package_module_limits data and appears to be leftover/duplicate
 * test data (priced lower than Enterprise despite offering the same
 * "everything" scope) - worth reviewing and likely removing from the
 * packages table directly.
 */
const SELLABLE_PACKAGE_SLUGS = ["core", "growth", "professional", "enterprise"];

export async function getSellablePackages(): Promise<SellablePackage[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("packages")
    .select("name, slug, price, features")
    .in("slug", SELLABLE_PACKAGE_SLUGS);

  if (error || !data) return [];

  const order = SELLABLE_PACKAGE_SLUGS;
  return (data as SellablePackage[]).sort((a, b) => order.indexOf(a.slug) - order.indexOf(b.slug));
}

/**
 * Engines covered by package_module_limits, mapped to their engine slugs.
 * The other engines in the catalog (Attendance, Business Operations,
 * Documents, Fees, Finance, Patients, Procurement, Real Estate, SACCO
 * Members, Students) have no pricing-tier data defined yet - as an
 * interim rule until that's filled in properly, they're only included in
 * the two "everything" tiers (Professional and Enterprise), matching what
 * those tiers' feature descriptions already promise.
 */
const MODULE_NAME_TO_ENGINE_SLUG: Record<string, string> = {
  "Point of Sale": "pos",
  "Inventory Management": "inventory",
  "HR & Payroll": "hr-payroll",
  CRM: "crm",
  Analytics: "analytics",
  "AI Insights": "ai-insights",
};

const UNMAPPED_ENGINE_SLUGS = [
  "attendance", "business-ops", "documents", "fees", "finance",
  "patients", "procurement", "real-estate", "sacco-members", "students",
];

export async function getEngineSlugsForPackage(packageName: string): Promise<string[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("package_module_limits")
    .select("module_name, enabled")
    .eq("package_name", packageName)
    .eq("enabled", true);

  const slugs = (data ?? [])
    .map((row) => MODULE_NAME_TO_ENGINE_SLUG[row.module_name])
    .filter((slug): slug is string => Boolean(slug));

  if (packageName === "Professional" || packageName === "Enterprise") {
    slugs.push(...UNMAPPED_ENGINE_SLUGS);
  }

  return slugs;
}

/**
 * Confirms the org's chosen package after the trial: activates only the
 * engines that package includes, records the choice, unlocks the org, and
 * creates a pending platform invoice using the existing manual-payment
 * pattern (no real payment gateway needed to test this end-to-end).
 */
export async function confirmPackageSelection(orgId: string, orgName: string, packageSlug: string): Promise<boolean> {
  const supabase = createClient();

  const { data: pkg } = await supabase
    .from("packages")
    .select("name, price")
    .eq("slug", packageSlug)
    .single();

  if (!pkg) return false;

  const engineSlugs = await getEngineSlugsForPackage(pkg.name);

  const { data: allEngines } = await supabase.from("engines").select("id, slug");
  const engineIdsToEnable = (allEngines ?? [])
    .filter((e) => engineSlugs.includes(e.slug))
    .map((e) => e.id);

  await supabase.from("organization_engines").update({ enabled: false }).eq("org_id", orgId);

  if (engineIdsToEnable.length > 0) {
    await supabase
      .from("organization_engines")
      .update({ enabled: true, subscription_tier: pkg.name })
      .eq("org_id", orgId)
      .in("engine_id", engineIdsToEnable);
  }

  await supabase
    .from("organizations")
    .update({
      package: pkg.name,
      trial_locked: false,
      package_confirmed_at: new Date().toISOString(),
    })
    .eq("id", orgId);

  const numericAmount = parseInt(pkg.price.replace(/[^\d]/g, ""), 10) || 0;

  await supabase.from("scheduled_platform_invoices").insert({
    org_id: orgId,
    org_name: orgName,
    description: `${pkg.name} plan - monthly subscription`,
    amount: numericAmount,
    frequency: "monthly",
    next_run: new Date().toISOString().slice(0, 10),
    active: true,
  });

  await logActivity({
    icon: "✅",
    title: "Plan selected",
    sub: `${orgName} chose the ${pkg.name} plan`,
    org_id: orgId,
  });

  return true;
}
