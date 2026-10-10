import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireOrgMember } from "@/lib/server/guards";
import { sendEmail, escapeHtml } from "@/lib/server/email";
import { CATEGORIES, addMessage, type Recipients, orgAdminIds, participantEmails, tooManyMessages, validText, type MailCategory } from "@/lib/server/mail";

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });
const FOUNDER_ALERT_EMAIL = process.env.FOUNDER_ALERT_EMAIL;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { orgId, action } = body as { orgId: string; action: string };
  const access = orgId ? await requireOrgMember(orgId) : null;
  if (!access) return fail("Not allowed.", 403);

  const { data: me } = await supabaseAdmin.from("org_users").select("full_name, email").eq("org_id", orgId).eq("user_id", access.userId).maybeSingle();
  const myName = me?.full_name || me?.email || access.userEmail || "A team member";
  const { data: org } = await supabaseAdmin.from("organizations").select("name").eq("id", orgId).maybeSingle();
  const link = (threadId: string) => `${req.nextUrl.origin}/org/${orgId}/mail?thread=${threadId}`;

  // Only people on the thread can act on it
  async function requireParticipant(threadId: string) {
    const { data: p } = await supabaseAdmin.from("mail_participants").select("user_id").eq("thread_id", threadId).eq("user_id", access!.userId).maybeSingle();
    const { data: t } = await supabaseAdmin.from("mail_threads").select("*").eq("id", threadId).eq("org_id", orgId).maybeSingle();
    return p && t ? t : null;
  }

  if (action === "send") {
    const kind = body.kind as "internal" | "support";
    if (!["internal", "support"].includes(kind)) return fail("Choose who to write to.");
    const invalid = validText(body.subject, body.body);
    if (invalid) return fail(invalid);
    if (await tooManyMessages(access.userId)) return fail("You're sending messages too quickly. Please wait a while.", 429);

    const category: MailCategory = CATEGORIES.includes(body.category) && kind === "support" ? body.category : "general";
    const ids = (v: unknown): string[] => Array.isArray(v) ? [...new Set((v as unknown[]).filter((x): x is string => typeof x === "string"))] : [];
    const toIds = kind === "internal" ? ids(body.toUserIds).filter(id => id !== access.userId) : [];
    const ccIds = ids(body.ccUserIds).filter(id => id !== access.userId && !toIds.includes(id));
    if (kind === "internal" && toIds.length === 0) return fail("Pick at least one teammate.");
    if (toIds.length + ccIds.length > 25) return fail("Too many recipients (max 25).");
    let recipients: Recipients | undefined;
    if (toIds.length || ccIds.length) {
      const { data: found } = await supabaseAdmin.from("org_users").select("user_id, full_name, email").eq("org_id", orgId).in("user_id", [...toIds, ...ccIds]);
      const byId = new Map((found ?? []).map(u => [u.user_id as string, { userId: u.user_id as string, name: (u.full_name as string | null) ?? null, email: (u.email as string | null) ?? null }]));
      if (byId.size !== toIds.length + ccIds.length) return fail("Everyone you write to must be a member of this organization.");
      recipients = { to: toIds.map(id => byId.get(id)!), cc: ccIds.map(id => byId.get(id)!) };
    }
    // Support messages are visible to the sender and the org's owners and admins; anyone cc'd is added too
    const participantIds = kind === "internal"
      ? [access.userId, ...toIds, ...ccIds]
      : [access.userId, ...(await orgAdminIds(orgId)), ...ccIds];

    const { data: thread, error } = await supabaseAdmin.from("mail_threads").insert({
      org_id: orgId, kind, subject: body.subject.trim(), category, created_by: access.userId, created_by_name: myName,
    }).select("id").single();
    if (error || !thread) return fail(error?.message ?? "Could not create the message.", 500);

    await supabaseAdmin.from("mail_participants").insert([...new Set(participantIds)].map(user_id => ({ thread_id: thread.id, user_id })));
    const err = await addMessage(thread.id, { id: access.userId, name: myName, fromFounder: false }, body.body, recipients);
    if (err) return fail(err, 500);

    if (kind === "support" && FOUNDER_ALERT_EMAIL) {
      await sendEmail(FOUNDER_ALERT_EMAIL, `[${org?.name ?? "Org"}] ${body.subject.trim()}`,
        `<p><strong>${escapeHtml(myName)}</strong> from <strong>${escapeHtml(org?.name ?? "an organization")}</strong> wrote (${category}):</p><p style="white-space:pre-wrap">${escapeHtml(body.body.trim())}</p>`,
        "Open Mail", `${req.nextUrl.origin}/dashboard/mail?thread=${thread.id}`);
    }
    if (kind === "internal" || ccIds.length) {
      const emails = kind === "internal" ? await participantEmails(thread.id, orgId, access.userId) : (recipients?.cc.map(c => c.email).filter((e): e is string => !!e) ?? []);
      if (emails.length) await sendEmail(emails, `${myName}: ${body.subject.trim()}`,
        `<p><strong>${escapeHtml(myName)}</strong> sent you a message in <strong>${escapeHtml(org?.name ?? "AUREVYN")}</strong>.</p><p style="white-space:pre-wrap">${escapeHtml(body.body.trim())}</p>`,
        "Open Mail", link(thread.id));
    }
    return NextResponse.json({ ok: true, threadId: thread.id });
  }

  if (action === "reply") {
    const invalid = validText(undefined, body.body);
    if (invalid) return fail(invalid);
    const thread = await requireParticipant(body.threadId);
    if (!thread) return fail("Conversation not found.", 404);
    if (await tooManyMessages(access.userId)) return fail("You're sending messages too quickly. Please wait a while.", 429);
    const err = await addMessage(thread.id, { id: access.userId, name: myName, fromFounder: false }, body.body);
    if (err) return fail(err, 500);

    if (thread.kind === "support" && FOUNDER_ALERT_EMAIL) {
      await sendEmail(FOUNDER_ALERT_EMAIL, `Re: [${org?.name ?? "Org"}] ${thread.subject}`,
        `<p><strong>${escapeHtml(myName)}</strong> replied:</p><p style="white-space:pre-wrap">${escapeHtml(body.body.trim())}</p>`,
        "Open Mail", `${req.nextUrl.origin}/dashboard/mail?thread=${thread.id}`);
    } else if (thread.kind === "internal") {
      const emails = await participantEmails(thread.id, orgId, access.userId);
      if (emails.length) await sendEmail(emails, `Re: ${thread.subject}`,
        `<p><strong>${escapeHtml(myName)}</strong> replied:</p><p style="white-space:pre-wrap">${escapeHtml(body.body.trim())}</p>`, "Open Mail", link(thread.id));
    }
    return NextResponse.json({ ok: true });
  }

  if (action === "read") {
    const thread = await requireParticipant(body.threadId);
    if (!thread) return fail("Conversation not found.", 404);
    await supabaseAdmin.from("mail_participants").update({ last_read_at: new Date().toISOString() }).eq("thread_id", thread.id).eq("user_id", access.userId);
    return NextResponse.json({ ok: true });
  }

  if (action === "close") {
    const thread = await requireParticipant(body.threadId);
    if (!thread || thread.kind !== "support") return fail("Conversation not found.", 404);
    await supabaseAdmin.from("mail_threads").update({ status: "closed" }).eq("id", thread.id);
    return NextResponse.json({ ok: true });
  }

  return fail("Unknown action.");
}
