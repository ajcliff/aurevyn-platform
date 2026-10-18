import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireOrgAdmin } from "@/lib/server/guards";

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint32Array(12));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

// An owner or admin gives a team member a new temporary password (for someone who forgot theirs and
// has no email to reset with). The person must choose their own password at their next sign-in.
export async function POST(req: NextRequest) {
  const { orgId, memberUserId } = await req.json();

  const access = orgId && memberUserId ? await requireOrgAdmin(orgId) : null;
  if (!access) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  if (memberUserId === access.userId) {
    return NextResponse.json({ error: "Use Forgot password or your account page to change your own password." }, { status: 400 });
  }

  // The person must really belong to this organization
  const { data: member } = await supabaseAdmin
    .from("org_users")
    .select("role, full_name, username, email")
    .eq("org_id", orgId)
    .eq("user_id", memberUserId)
    .maybeSingle();
  if (!member) return NextResponse.json({ error: "That person isn't in this organization." }, { status: 404 });

  // Admins can't reset an owner: that would be a way to take over the business
  if (member.role === "owner" && access.role !== "owner" && !access.isFounder) {
    return NextResponse.json({ error: "Only an owner can reset another owner's password." }, { status: 403 });
  }

  const { data: existing } = await supabaseAdmin.auth.admin.getUserById(memberUserId);
  if (!existing?.user) return NextResponse.json({ error: "Account not found." }, { status: 404 });

  const tempPassword = generateTempPassword();
  const { error } = await supabaseAdmin.auth.admin.updateUserById(memberUserId, {
    password: tempPassword,
    user_metadata: { ...existing.user.user_metadata, must_change_password: true },
  });
  if (error) return NextResponse.json({ error: "Could not reset the password. Try again." }, { status: 500 });

  const { data: actor } = await supabaseAdmin.from("org_users").select("full_name, email").eq("org_id", orgId).eq("user_id", access.userId).maybeSingle();
  await supabaseAdmin.from("audit_trail").insert({
    org_id: orgId,
    action: "password_reset",
    entity_type: "user",
    entity_id: memberUserId,
    summary: `Password reset for ${member.full_name || member.username || member.email || "a team member"}`,
    status: "completed",
    initiated_by_id: access.userId,
    initiated_by_name: actor?.full_name || actor?.email || access.userEmail || "Admin",
    authorisation: "not_required",
  });

  return NextResponse.json({ ok: true, tempPassword });
}
