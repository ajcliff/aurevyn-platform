import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

// Accepting an invite used to do signUp() then immediately insert into
// org_users as that brand-new user — but supabase.auth.signUp() doesn't
// reliably hand back an established session before the very next request,
// so auth.uid() could still be null when the org_users bootstrap RLS policy
// ran, failing the insert right after the account was created. The invite
// was never marked accepted (it throws before that line), but the email was
// now registered — so a retry always failed with "already registered",
// which read to the user as "link already used" even though it never
// actually worked the first time either.
//
// Doing the whole thing server-side with the service role sidesteps the
// race entirely: nothing here depends on a client session existing yet.
export async function POST(req: NextRequest) {
  const { token, fullName, password } = await req.json();

  if (!token || !fullName?.trim() || !password || password.length < 8) {
    return NextResponse.json({ error: "Missing or invalid fields." }, { status: 400 });
  }

  const { data: invite, error: inviteError } = await supabaseAdmin
    .from("team_invites")
    .select("*")
    .eq("token", token)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (inviteError || !invite) {
    return NextResponse.json({ error: "This invite is invalid, expired, or has already been used." }, { status: 400 });
  }

  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: invite.email,
    password,
    email_confirm: true, // pre-confirmed — they clicked a real invite link, no need to also confirm email
  });

  if (createError) {
    if (createError.message.toLowerCase().includes("already registered") || createError.message.toLowerCase().includes("already been registered")) {
      return NextResponse.json(
        { error: "An account with this email already exists. Please log in instead, then ask the org owner to add you as a team member." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: createError.message }, { status: 400 });
  }

  const userId = created.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Account creation failed." }, { status: 500 });
  }

  const { error: memberError } = await supabaseAdmin.from("org_users").insert({
    org_id: invite.org_id,
    user_id: userId,
    role: invite.role,
    full_name: fullName,
    email: invite.email,
    allowed_engines: invite.allowed_engines,
  });
  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  const { error: employeeError } = await supabaseAdmin.from("employees").insert({
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
  if (employeeError) {
    return NextResponse.json({ error: employeeError.message }, { status: 500 });
  }

  await supabaseAdmin.from("team_invites").update({ status: "accepted" }).eq("id", invite.id);

  return NextResponse.json({ orgId: invite.org_id, email: invite.email });
}
