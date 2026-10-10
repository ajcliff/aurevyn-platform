import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireFounder } from "@/lib/server/guards";
import { sendEmail, escapeHtml } from "@/lib/server/email";
import { CATEGORIES, addMessage, orgAdminIds, participantEmails, validText, type MailCategory } from "@/lib/server/mail";

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function POST(req: NextRequest) {
  const founder = await requireFounder();
  if (!founder) return fail("Not allowed.", 403);
  const body = await req.json();
  const sender = { id: founder.userId, name: "AUREVYN Support", fromFounder: true };

  async function supportThread(threadId: string) {
    const { data } = await supabaseAdmin.from("mail_threads").select("*").eq("id", threadId).eq("kind", "support").maybeSingle();
    return data;
  }
  const notify = async (thread: { id: string; org_id: string; subject: string }, text: string) => {
    const emails = await participantEmails(thread.id, thread.org_id, founder.userId);
    if (emails.length) await sendEmail(emails, `AUREVYN Support: ${thread.subject}`,
      `<p style="white-space:pre-wrap">${escapeHtml(text.trim())}</p>`, "Open Mail", `${req.nextUrl.origin}/org/${thread.org_id}/mail?thread=${thread.id}`);
  };

  if (body.action === "reply") {
    const invalid = validText(undefined, body.body);
    if (invalid) return fail(invalid);
    const thread = await supportThread(body.threadId);
    if (!thread) return fail("Conversation not found.", 404);
    const err = await addMessage(thread.id, sender, body.body);
    if (err) return fail(err, 500);
    await notify(thread, body.body);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "read") {
    const thread = await supportThread(body.threadId);
    if (!thread) return fail("Conversation not found.", 404);
    await supabaseAdmin.from("mail_threads").update({ founder_read_at: new Date().toISOString() }).eq("id", thread.id);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "set_status") {
    if (!["open", "closed"].includes(body.status)) return fail("Invalid status.");
    const thread = await supportThread(body.threadId);
    if (!thread) return fail("Conversation not found.", 404);
    await supabaseAdmin.from("mail_threads").update({ status: body.status }).eq("id", thread.id);
    return NextResponse.json({ ok: true });
  }

  // Founder starts a conversation with an organization (goes to its owners and admins)
  if (body.action === "send") {
    const invalid = validText(body.subject, body.body);
    if (invalid) return fail(invalid);
    const { data: org } = await supabaseAdmin.from("organizations").select("id").eq("id", body.orgId).maybeSingle();
    if (!org) return fail("Organization not found.", 404);
    const admins = await orgAdminIds(body.orgId);
    if (admins.length === 0) return fail("That organization has no owner or admin to message.");

    const category: MailCategory = CATEGORIES.includes(body.category) ? body.category : "general";
    const { data: thread, error } = await supabaseAdmin.from("mail_threads").insert({
      org_id: body.orgId, kind: "support", subject: body.subject.trim(), category, created_by: founder.userId, created_by_name: "AUREVYN Support",
    }).select("id, org_id, subject").single();
    if (error || !thread) return fail(error?.message ?? "Could not create the message.", 500);

    await supabaseAdmin.from("mail_participants").insert(admins.map(user_id => ({ thread_id: thread.id, user_id })));
    const err = await addMessage(thread.id, sender, body.body);
    if (err) return fail(err, 500);
    await notify(thread, body.body);
    return NextResponse.json({ ok: true, threadId: thread.id });
  }

  return fail("Unknown action.");
}
