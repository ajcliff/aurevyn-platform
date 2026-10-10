import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireOrgMember } from "@/lib/server/guards";
import { sendEmail, escapeHtml } from "@/lib/server/email";

const APPROVER_ROLES = ["owner", "admin", "manager"];

// Emails the right people so approvals don't sit waiting for someone to log in:
//  - "created": every approver in the org (owner/admin/manager) except the requester
//  - "decided": the person who asked, with the outcome
// Each email goes out once per request, whatever the client does.
export async function POST(req: NextRequest) {
  const { orgId, requestId, event } = await req.json();
  const access = orgId ? await requireOrgMember(orgId) : null;
  if (!access) return NextResponse.json({ error: "Not allowed." }, { status: 403 });

  const { data: r } = await supabaseAdmin.from("approval_requests").select("*").eq("id", requestId).eq("org_id", orgId).maybeSingle();
  if (!r) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const { data: org } = await supabaseAdmin.from("organizations").select("name").eq("id", orgId).maybeSingle();
  const link = `${req.nextUrl.origin}/org/${orgId}/approvals?focus=${r.id}`;
  const amount = r.amount ? ` · KES ${Number(r.amount).toLocaleString("en-KE")}` : "";

  if (event === "created") {
    if (r.status !== "pending" || r.approvers_notified_at) return NextResponse.json({ ok: true, skipped: true });
    const { data: members } = await supabaseAdmin.from("org_users").select("user_id, email, role").eq("org_id", orgId);
    const to = (members ?? []).filter(m => APPROVER_ROLES.includes(m.role) && m.email && m.user_id !== r.requested_by_user_id).map(m => m.email as string);
    if (to.length === 0) return NextResponse.json({ ok: true, skipped: true });

    const sent = await sendEmail(
      to,
      `Approval needed: ${r.title}`,
      `<h2 style="margin:0 0 8px">${escapeHtml(r.title)}</h2><p><strong>${escapeHtml(r.requested_by_name ?? "A team member")}</strong> asked for your approval in <strong>${escapeHtml(org?.name ?? "your organization")}</strong>${escapeHtml(amount)}.</p>${r.description ? `<p style="color:#555">${escapeHtml(r.description)}</p>` : ""}`,
      "Review and decide",
      link
    );
    if (sent) await supabaseAdmin.from("approval_requests").update({ approvers_notified_at: new Date().toISOString() }).eq("id", r.id);
    return NextResponse.json({ ok: true, emailed: sent });
  }

  if (event === "decided") {
    // Only an approver can trigger the outcome email
    const { data: me } = await supabaseAdmin.from("org_users").select("role").eq("org_id", orgId).eq("user_id", access.userId).maybeSingle();
    if (!access.isFounder && !(me && APPROVER_ROLES.includes(me.role))) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
    if (r.status === "pending" || r.requester_notified_at || !r.requested_by_user_id) return NextResponse.json({ ok: true, skipped: true });

    const { data: requester } = await supabaseAdmin.from("org_users").select("email").eq("org_id", orgId).eq("user_id", r.requested_by_user_id).maybeSingle();
    if (!requester?.email) return NextResponse.json({ ok: true, skipped: true });

    const approved = r.status === "approved";
    const sent = await sendEmail(
      requester.email,
      `Your request was ${r.status}: ${r.title}`,
      `<h2 style="margin:0 0 8px">${escapeHtml(r.title)}</h2><p>Your request${escapeHtml(amount)} was <strong style="color:${approved ? "#15803d" : "#b91c1c"}">${r.status}</strong>${r.decided_by_name ? ` by ${escapeHtml(r.decided_by_name)}` : ""}.</p>`,
      "Open in AUREVYN",
      link
    );
    if (sent) await supabaseAdmin.from("approval_requests").update({ requester_notified_at: new Date().toISOString() }).eq("id", r.id);
    return NextResponse.json({ ok: true, emailed: sent });
  }

  return NextResponse.json({ error: "Unknown event." }, { status: 400 });
}
