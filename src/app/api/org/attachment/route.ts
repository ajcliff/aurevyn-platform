import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireOrgMember } from "@/lib/server/guards";
import type { Attachment } from "@/lib/attachments";

// Gives a short-lived link to a document attached to a mail message or approval request,
// but only to someone who is allowed to see that message or request.
export async function POST(req: NextRequest) {
  const { orgId, context, documentId } = await req.json();
  const access = orgId ? await requireOrgMember(orgId) : null;
  if (!access) return NextResponse.json({ error: "Not allowed." }, { status: 403 });

  let attachments: Attachment[] = [];
  if (context?.type === "mail") {
    const { data: part } = await supabaseAdmin.from("mail_participants").select("user_id").eq("thread_id", context.threadId).eq("user_id", access.userId).maybeSingle();
    const { data: thread } = await supabaseAdmin.from("mail_threads").select("id").eq("id", context.threadId).eq("org_id", orgId).maybeSingle();
    if (!part || !thread) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
    const { data: msgs } = await supabaseAdmin.from("mail_messages").select("attachments").eq("thread_id", context.threadId);
    attachments = (msgs ?? []).flatMap(m => (m.attachments as Attachment[]) ?? []);
  } else if (context?.type === "approval") {
    const { data: r } = await supabaseAdmin.from("approval_requests").select("attachments, requested_by_user_id, dept_head_user_id").eq("id", context.requestId).eq("org_id", orgId).maybeSingle();
    if (!r) return NextResponse.json({ error: "Not found." }, { status: 404 });
    const { data: me } = await supabaseAdmin.from("org_users").select("role").eq("org_id", orgId).eq("user_id", access.userId).maybeSingle();
    const allowed = access.isFounder || r.requested_by_user_id === access.userId || r.dept_head_user_id === access.userId || ["owner", "admin", "manager"].includes(me?.role ?? "");
    if (!allowed) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
    attachments = (r.attachments as Attachment[]) ?? [];
  } else {
    return NextResponse.json({ error: "Unknown context." }, { status: 400 });
  }

  if (!attachments.some(a => a.documentId === documentId)) return NextResponse.json({ error: "Attachment not found." }, { status: 404 });
  const { data: doc } = await supabaseAdmin.from("documents").select("file_path").eq("id", documentId).eq("org_id", orgId).maybeSingle();
  if (!doc) return NextResponse.json({ error: "Document not found." }, { status: 404 });
  const { data, error } = await supabaseAdmin.storage.from("documents").createSignedUrl(doc.file_path, 300);
  if (error || !data) return NextResponse.json({ error: "Couldn't open this document." }, { status: 500 });
  return NextResponse.json({ url: data.signedUrl });
}
