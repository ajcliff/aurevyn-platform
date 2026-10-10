import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireOrgMember } from "@/lib/server/guards";
import { sendEmail, escapeHtml } from "@/lib/server/email";

type ResType = "document" | "project";
const TABLES: Record<ResType, string> = { document: "documents", project: "ops_projects" };
const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

async function loadResource(type: ResType, id: string, orgId: string) {
  const cols = type === "document" ? "id, org_id, name, visibility, created_by" : "id, org_id, name, visibility, created_by";
  const { data } = await supabaseAdmin.from(TABLES[type]).select(cols).eq("id", id).eq("org_id", orgId).maybeSingle();
  return data as { id: string; org_id: string; name: string; visibility: "org" | "restricted"; created_by: string | null } | null;
}

// Only the creator, an org owner/admin, or the founder may change who something is shared with
function canManage(access: { userId: string; role?: string | null; isFounder?: boolean }, res: { created_by: string | null }) {
  return !!access.isFounder || access.role === "owner" || access.role === "admin" || res.created_by === access.userId;
}

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const orgId = p.get("orgId") ?? "", type = p.get("type") as ResType, id = p.get("id") ?? "";
  if (!TABLES[type]) return fail("Unknown item type.");
  const access = await requireOrgMember(orgId);
  if (!access) return fail("Not allowed.", 403);

  const res = await loadResource(type, id, orgId);
  if (!res) return fail("Not found.", 404);

  const [{ data: members }, { data: shares }] = await Promise.all([
    supabaseAdmin.from("org_users").select("user_id, full_name, email, role").eq("org_id", orgId),
    supabaseAdmin.from("resource_shares").select("user_id, access").eq("org_id", orgId).eq("resource_type", type).eq("resource_id", id),
  ]);
  const byId = new Map((members ?? []).map(m => [m.user_id, m]));
  return NextResponse.json({
    name: res.name,
    visibility: res.visibility,
    canManage: canManage(access, res),
    members: (members ?? []).filter(m => m.user_id !== access.userId).map(m => ({ userId: m.user_id, name: m.full_name, email: m.email, role: m.role })),
    shares: (shares ?? []).map(s => ({ userId: s.user_id, access: s.access, name: byId.get(s.user_id)?.full_name ?? null, email: byId.get(s.user_id)?.email ?? null })),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { orgId, type, id, action } = body as { orgId: string; type: ResType; id: string; action: string };
  if (!TABLES[type]) return fail("Unknown item type.");
  const access = await requireOrgMember(orgId);
  if (!access) return fail("Not allowed.", 403);

  const res = await loadResource(type, id, orgId);
  if (!res) return fail("Not found.", 404);
  if (!canManage(access, res)) return fail("Only the owner of this item or an org admin can change sharing.", 403);

  if (action === "set_visibility") {
    if (!["org", "restricted"].includes(body.visibility)) return fail("Invalid visibility.");
    const { error } = await supabaseAdmin.from(TABLES[type]).update({ visibility: body.visibility }).eq("id", id).eq("org_id", orgId);
    if (error) return fail(error.message, 500);
    return NextResponse.json({ ok: true });
  }

  if (action === "add") {
    if (!["view", "edit"].includes(body.access)) return fail("Choose view or edit.");
    // Members only: the person must already belong to this organization
    const { data: member } = await supabaseAdmin.from("org_users").select("user_id, full_name, email")
      .eq("org_id", orgId).eq("user_id", body.userId).maybeSingle();
    if (!member) return fail("That person isn't a member of this organization.");

    const { error } = await supabaseAdmin.from("resource_shares").upsert(
      { org_id: orgId, resource_type: type, resource_id: id, user_id: body.userId, access: body.access, shared_by: access.userId },
      { onConflict: "resource_type,resource_id,user_id" }
    );
    if (error) return fail(error.message, 500);

    let emailed = false;
    if (body.notify && member.email) {
      const { data: org } = await supabaseAdmin.from("organizations").select("name").eq("id", orgId).maybeSingle();
      const link = `${req.nextUrl.origin}/org/${orgId}/me`;
      emailed = await sendEmail(
        member.email,
        `${org?.name ?? "Your organization"} shared a ${type} with you`,
        `<h2 style="margin:0 0 8px">${escapeHtml(res.name)}</h2><p>You've been given <strong>${body.access === "edit" ? "edit" : "view"}</strong> access to this ${type} in <strong>${escapeHtml(org?.name ?? "your organization")}</strong>.</p>`,
        "Open it in AUREVYN",
        link
      );
    }
    return NextResponse.json({ ok: true, emailed });
  }

  if (action === "remove") {
    const { error } = await supabaseAdmin.from("resource_shares").delete()
      .eq("org_id", orgId).eq("resource_type", type).eq("resource_id", id).eq("user_id", body.userId);
    if (error) return fail(error.message, 500);
    return NextResponse.json({ ok: true });
  }

  return fail("Unknown action.");
}
