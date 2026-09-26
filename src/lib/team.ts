import { createClient } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";

export type TeamRole = "owner" | "admin" | "manager" | "staff";

export type TeamMember = {
  id: string;
  org_id: string;
  user_id: string;
  role: TeamRole;
  full_name: string | null;
  email: string | null;
  allowed_engines: string[] | null;
};

export type TeamInvite = {
  id: string;
  org_id: string;
  email: string;
  role: TeamRole;
  allowed_engines: string[] | null;
  token: string;
  status: string;
  created_at: string;
  expires_at: string;
};

export async function getTeamMembers(orgId: string): Promise<TeamMember[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("org_users")
    .select("*")
    .eq("org_id", orgId);

  if (error) throw error;
  return data || [];
}

export async function getPendingInvites(orgId: string): Promise<TeamInvite[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("team_invites")
    .select("*")
    .eq("org_id", orgId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createInvite(
  orgId: string,
  email: string,
  role: TeamRole,
  allowedEngines: string[] | null
): Promise<TeamInvite> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("team_invites")
    .insert({ org_id: orgId, email, role, allowed_engines: allowedEngines })
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    icon: "✉",
    title: "Team invite sent",
    sub: `${email} (${role})`,
    org_id: orgId,
  });

  return data;
}

export async function revokeInvite(id: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("team_invites")
    .update({ status: "revoked" })
    .eq("id", id);

  if (error) throw error;
}

export async function updateMemberEngines(id: string, allowedEngines: string[] | null) {
  const supabase = createClient();
  const { error } = await supabase
    .from("org_users")
    .update({ allowed_engines: allowedEngines })
    .eq("id", id);

  if (error) throw error;
}

export async function updateMemberRole(  id: string,
  role: TeamRole,
  allowedEngines: string[] | null
) {
  const supabase = createClient();
  const { error } = await supabase
    .from("org_users")
    .update({ role, allowed_engines: allowedEngines })
    .eq("id", id);

  if (error) throw error;
}

export async function removeMember(id: string, orgId: string, memberLabel: string) {
  const supabase = createClient();

  // Get the user_id before deleting, so we can archive their employee record
  const { data: member } = await supabase
    .from("org_users")
    .select("user_id")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("org_users").delete().eq("id", id);
  if (error) throw error;

  // Archive rather than delete — keeps payroll/leave history intact for
  // compliance, while removing them from active headcount and payroll runs
  // (runPayroll only pulls employment_status: "active"). Reuses the existing
  // "terminated" status rather than inventing a new one.
  if (member?.user_id) {
    await supabase
      .from("employees")
      .update({ employment_status: "terminated" })
      .eq("org_id", orgId)
      .eq("user_id", member.user_id);
  }

  await logActivity({
    icon: "🚫",
    title: "Team member removed",
    sub: memberLabel,
    org_id: orgId,
  });
}

export async function getInviteByToken(token: string): Promise<TeamInvite | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("team_invites")
    .select("*")
    .eq("token", token)
    .eq("status", "pending")
    .maybeSingle();

  return data;
}

export async function acceptInvite(
  token: string,
  fullName: string,
  password: string
): Promise<{ orgId: string }> {
  const res = await fetch("/api/team/accept-invite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, fullName, password }),
  });

  const result = await res.json();
  if (!res.ok) {
    throw new Error(result.error || "Failed to join.");
  }

  // Account and membership now exist server-side (pre-confirmed) — sign in
  // here to establish the actual browser session.
  const supabase = createClient();
  await supabase.auth.signInWithPassword({ email: result.email, password });

  return { orgId: result.orgId };
}