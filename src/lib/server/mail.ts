import { supabaseAdmin } from "@/lib/supabase/server";

export const SUBJECT_MAX = 200;
export const BODY_MAX = 10000;
export const CATEGORIES = ["general", "billing", "error", "feature"] as const;
export type MailCategory = (typeof CATEGORIES)[number];

// Light anti-spam: nobody sends more than 30 messages an hour
export async function tooManyMessages(senderId: string): Promise<boolean> {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabaseAdmin.from("mail_messages")
    .select("id", { count: "exact", head: true }).eq("sender_id", senderId).gte("created_at", since);
  return (count ?? 0) >= 30;
}

export function validText(subject: string | undefined, body: string | undefined) {
  if (subject !== undefined && (!subject.trim() || subject.length > SUBJECT_MAX)) return `Subject must be 1 to ${SUBJECT_MAX} characters.`;
  if (!body?.trim() || body.length > BODY_MAX) return `Message must be 1 to ${BODY_MAX} characters.`;
  return null;
}

// Appends a message and moves the thread to the top, marking it unread for everyone else
export type Recipients = { to: { userId: string; name: string | null; email: string | null }[]; cc: { userId: string; name: string | null; email: string | null }[] };

export async function addMessage(threadId: string, sender: { id: string | null; name: string; fromFounder: boolean }, body: string, recipients?: Recipients) {
  const { error } = await supabaseAdmin.from("mail_messages").insert({
    thread_id: threadId, sender_id: sender.id, sender_name: sender.name, from_founder: sender.fromFounder, body: body.trim(),
    ...(recipients ? { recipients } : {}),
  });
  if (error) return error.message;
  const now = new Date().toISOString();
  const { error: e2 } = await supabaseAdmin.from("mail_threads").update({
    last_message_at: now, last_sender_id: sender.id, last_from_founder: sender.fromFounder, status: "open",
    ...(sender.fromFounder ? { founder_read_at: now } : {}),
  }).eq("id", threadId);
  if (e2) return e2.message;
  if (sender.id) {
    await supabaseAdmin.from("mail_participants").update({ last_read_at: now }).eq("thread_id", threadId).eq("user_id", sender.id);
  }
  return null;
}

// Emails of everyone on a thread (optionally skipping one person)
export async function participantEmails(threadId: string, orgId: string, excludeUserId?: string | null): Promise<string[]> {
  const { data: parts } = await supabaseAdmin.from("mail_participants").select("user_id").eq("thread_id", threadId);
  const ids = (parts ?? []).map(p => p.user_id).filter(id => id !== excludeUserId);
  if (ids.length === 0) return [];
  const { data: users } = await supabaseAdmin.from("org_users").select("email").eq("org_id", orgId).in("user_id", ids);
  return (users ?? []).map(u => u.email as string).filter(Boolean);
}

export async function orgAdminIds(orgId: string): Promise<string[]> {
  const { data } = await supabaseAdmin.from("org_users").select("user_id").eq("org_id", orgId).in("role", ["owner", "admin"]);
  return (data ?? []).map(u => u.user_id as string);
}
