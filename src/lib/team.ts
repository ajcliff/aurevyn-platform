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
  const supabase = createClient();

  const invite = await getInviteByToken(token);
  if (!invite) throw new Error("This invite is invalid or has already been used.");

const { data: signup, error: signupError } = await supabase.auth.signUp({
    email: invite.email,
    password,
  });

  if (signupError) {
    if (signupError.message.toLowerCase().includes("already registered")) {
      throw new Error(
        "An account with this email already exists. Please log in instead, then ask the org owner to add you as a team member."
      );
    }
    throw signupError;
  }

  const userId = signup.user?.id;
  if (!userId) throw new Error("Account creation failed");

  const { error: memberError } = await supabase.from("org_users").insert({
    org_id: invite.org_id,
    user_id: userId,
    role: invite.role,
    full_name: fullName,
    email: invite.email,
    allowed_engines: invite.allowed_engines,
  });
  if (memberError) throw memberError;

  // Every accepted invite gets a matching HR record automatically — this is
  // what closes the "team member exists but Employee Hub is empty" gap.
  // Salary/department/hire date default to blank and get filled in later;
  // the point is the row exists and is linked from the start.
  const { error: employeeError } = await supabase.from("employees").insert({
    org_id: invite.org_id,
    user_id: userId,
    full_name: fullName,
    email: invite.email,
    phone: null,
    role: invite.role,
    department: null,
    employment_status: "active",
    salary: 0,
    hire_date: new Date().toISOString().slice(0, 10),
  });
  if (employeeError) throw employeeError;

  await supabase
    .from("team_invites")
    .update({ status: "accepted" })
    .eq("id", invite.id);

  return { orgId: invite.org_id };
}