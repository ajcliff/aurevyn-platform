import { createClient } from "@/lib/supabase";
import type { TeamRole } from "@/lib/team";
import type { HrPermissions } from "@/lib/employeeHub";

export type MyMembership = {
  role: TeamRole;
  allowedEngines: string[] | null;
  isFounder: boolean;
  hrPermissions: HrPermissions;
  userId: string | null;
  userEmail: string | null;
};

export async function getMyMembership(orgId: string): Promise<MyMembership | null> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const founderEmail = process.env.NEXT_PUBLIC_FOUNDER_EMAIL;
  if (user.email === founderEmail) {
    return { role: "owner", allowedEngines: null, isFounder: true, hrPermissions: {}, userId: user.id, userEmail: user.email ?? null };
  }

  const { data } = await supabase
    .from("org_users")
    .select("role, allowed_engines, hr_permissions")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) return null;

  // Engine access is licensed per user now (user_engine_licenses), not the
  // old org_users.allowed_engines allowlist. Owners and admins manage the org
  // so they can open anything the org has; everyone else can only open the
  // engines they hold a seat on.
  let allowedEngines: string[] | null = null;
  if (data.role !== "owner" && data.role !== "admin") {
    const { data: licenses } = await supabase
      .from("user_engine_licenses")
      .select("engines(slug)")
      .eq("org_id", orgId)
      .eq("user_id", user.id);
    allowedEngines = (licenses ?? [])
      .map((l: any) => l.engines?.slug as string | undefined)
      .filter((slug): slug is string => !!slug);
  }

  return {
    role: data.role as TeamRole,
    allowedEngines,
    isFounder: false,
    hrPermissions: data.hr_permissions || {},
    userId: user.id,
    userEmail: user.email ?? null,
  };
}