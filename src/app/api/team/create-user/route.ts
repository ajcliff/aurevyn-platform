import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireOrgAdmin } from "@/lib/server/guards";
import { USERNAME_PATTERN, normalizeUsername, usernameToEmail } from "@/lib/staffLogin";
import { isValidEmail } from "@/lib/validation";

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 12; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

// Replaces the invite-link flow for adding team members: the admin fills in
// the person's details right here and the account exists immediately, with
// a one-time temporary password to hand over directly — no link to generate,
// send, and wait on. Everything (auth user, org_users, employees,
// engine licenses) is created with the service role since none of it is
// writable from the admin's own client session for a user that doesn't
// exist yet.
export async function POST(req: NextRequest) {
  const { orgId, fullName, email: rawEmail, username: rawUsername, role, departmentId, engineIds } = await req.json();
  // Someone signs in with a username, an email, or both. With a username, the email is only a contact address (optional).
  const username: string | null = rawUsername?.trim() ? normalizeUsername(rawUsername) : null;
  const email: string = (rawEmail ?? "").trim();

  const access = orgId ? await requireOrgAdmin(orgId) : null;
  if (!access) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  if (role === "owner" && access.role !== "owner" && !access.isFounder) {
    return NextResponse.json({ error: "Only an owner can create another owner." }, { status: 403 });
  }

  if (!orgId || !fullName?.trim() || !role || (!username && !email)) {
    return NextResponse.json({ error: "Enter a name and either a username or an email." }, { status: 400 });
  }
  if (username && !USERNAME_PATTERN.test(username)) {
    return NextResponse.json({ error: "Usernames are 3 to 30 characters: letters, numbers, dots, dashes or underscores." }, { status: 400 });
  }
  if (email && !isValidEmail(email)) {
    return NextResponse.json({ error: "That email address doesn't look right." }, { status: 400 });
  }
  if (username) {
    const { data: taken } = await supabaseAdmin.from("org_users").select("id").ilike("username", username).maybeSingle();
    if (taken) return NextResponse.json({ error: "That username is taken. Try another." }, { status: 409 });
  }

  // Bigger organisations run on departments: from the 11th person on, everyone must belong to one,
  // because requests are signed off by the department head before they reach the owners.
  const { count: memberCount } = await supabaseAdmin.from("org_users").select("id", { count: "exact", head: true }).eq("org_id", orgId);
  if ((memberCount ?? 0) >= 10 && !departmentId) {
    return NextResponse.json({ error: "Choose a department. Organizations with more than ten people need every member in a department so approvals reach the right head." }, { status: 400 });
  }

  // Refuse before creating anything if any requested engine has no seat left —
  // otherwise the account would exist with no license and no way to retry the same email.
  for (const engineId of engineIds ?? []) {
    const [{ data: oe }, { count }, { data: engine }] = await Promise.all([
      supabaseAdmin.from("organization_engines").select("licensed_seats").eq("org_id", orgId).eq("engine_id", engineId).maybeSingle(),
      supabaseAdmin.from("user_engine_licenses").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("engine_id", engineId),
      supabaseAdmin.from("engines").select("name").eq("id", engineId).maybeSingle(),
    ]);
    if (!oe || (count ?? 0) >= (oe.licensed_seats ?? 0)) {
      return NextResponse.json(
        { error: `No ${engine?.name ?? "engine"} seats left. Buy more seats on the Engines page, then create this user.` },
        { status: 409 }
      );
    }
  }

  let departmentName: string | null = null;
  if (departmentId) {
    const { data: dept } = await supabaseAdmin.from("departments").select("name").eq("id", departmentId).maybeSingle();
    departmentName = dept?.name ?? null;
  }

  const tempPassword = generateTempPassword();

  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: username ? usernameToEmail(username) : email,
    password: tempPassword,
    email_confirm: true,
    // They must choose their own password the first time they sign in
    user_metadata: { must_change_password: true, ...(username ? { username } : {}) },
  });

  if (createError) {
    if (createError.message.toLowerCase().includes("already registered")) {
      return NextResponse.json({ error: username ? "That username is taken. Try another." : "An account with this email already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: createError.message }, { status: 400 });
  }

  const userId = created.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Account creation failed." }, { status: 500 });
  }

  const { error: memberError } = await supabaseAdmin.from("org_users").insert({
    org_id: orgId,
    user_id: userId,
    role,
    full_name: fullName,
    email: email || null,
    username,
  });
  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  const { error: employeeError } = await supabaseAdmin.from("employees").insert({
    org_id: orgId,
    user_id: userId,
    full_name: fullName,
    email: email || null,
    phone: null,
    role,
    department: departmentName,
    employment_status: "active",
    salary: 0,
    hire_date: new Date().toISOString().slice(0, 10),
  });
  if (employeeError) {
    return NextResponse.json({ error: employeeError.message }, { status: 500 });
  }

  const licenseWarnings: string[] = [];
  for (const engineId of engineIds ?? []) {
    const { error } = await supabaseAdmin.from("user_engine_licenses").insert({ org_id: orgId, user_id: userId, engine_id: engineId });
    if (error) licenseWarnings.push(error.message);
  }

  return NextResponse.json({ ok: true, userId, tempPassword, loginName: username ?? email, licenseWarnings });
}
