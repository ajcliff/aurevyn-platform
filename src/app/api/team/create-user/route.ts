import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireOrgAdmin } from "@/lib/server/guards";

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
  const { orgId, fullName, email, role, departmentId, engineIds } = await req.json();

  const access = orgId ? await requireOrgAdmin(orgId) : null;
  if (!access) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  if (role === "owner" && access.role !== "owner" && !access.isFounder) {
    return NextResponse.json({ error: "Only an owner can create another owner." }, { status: 403 });
  }

  if (!orgId || !fullName?.trim() || !email?.trim() || !role) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  let departmentName: string | null = null;
  if (departmentId) {
    const { data: dept } = await supabaseAdmin.from("departments").select("name").eq("id", departmentId).maybeSingle();
    departmentName = dept?.name ?? null;
  }

  const tempPassword = generateTempPassword();

  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: email.trim(),
    password: tempPassword,
    email_confirm: true,
  });

  if (createError) {
    if (createError.message.toLowerCase().includes("already registered")) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
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
    email: email.trim(),
  });
  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  const { error: employeeError } = await supabaseAdmin.from("employees").insert({
    org_id: orgId,
    user_id: userId,
    full_name: fullName,
    email: email.trim(),
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

  return NextResponse.json({ ok: true, userId, tempPassword, licenseWarnings });
}
