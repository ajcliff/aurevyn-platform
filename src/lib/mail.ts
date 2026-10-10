import { createClient } from "./supabase";

export type MailThread = {
  id: string;
  org_id: string;
  kind: "internal" | "support";
  subject: string;
  category: "general" | "billing" | "error" | "feature";
  status: "open" | "closed";
  created_by: string | null;
  created_by_name: string | null;
  last_message_at: string;
  last_sender_id: string | null;
  last_from_founder: boolean;
  founder_read_at: string | null;
  created_at: string;
};

export type MailMessage = {
  id: string;
  thread_id: string;
  sender_id: string | null;
  sender_name: string | null;
  from_founder: boolean;
  body: string;
  recipients?: { to: { userId: string; name: string | null; email: string | null }[]; cc: { userId: string; name: string | null; email: string | null }[] } | null;
  created_at: string;
};

export const CATEGORY_LABEL: Record<MailThread["category"], string> = {
  general: "General", billing: "Billing", error: "Problem", feature: "Feature request",
};

// Reads go straight to the database (row-level security limits them to what you may see)
export async function getThreads(orgId?: string): Promise<MailThread[]> {
  try {
  const supabase = createClient();
  let q = supabase.from("mail_threads").select("*").order("last_message_at", { ascending: false }).limit(300);
  if (orgId) q = q.eq("org_id", orgId);
  const { data, error } = await q;
  if (error) { console.error("Error fetching mail:", error); return []; }
  return (data ?? []) as MailThread[];
  } catch { return []; }
}

export async function getMyReads(): Promise<Record<string, string | null>> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return {};
    const { data } = await supabase.from("mail_participants").select("thread_id, last_read_at").eq("user_id", user.id);
    return Object.fromEntries((data ?? []).map(r => [r.thread_id as string, r.last_read_at as string | null]));
  } catch { return {}; } // offline or the server is restarting: try again on the next poll
}

export async function getMessages(threadId: string): Promise<MailMessage[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("mail_messages").select("*").eq("thread_id", threadId).order("created_at");
  if (error) { console.error("Error fetching messages:", error); return []; }
  return (data ?? []) as MailMessage[];
}

export function isUnread(t: MailThread, myId: string | null, reads: Record<string, string | null>, asFounder: boolean): boolean {
  if (asFounder) {
    return !t.last_from_founder && (!t.founder_read_at || t.last_message_at > t.founder_read_at);
  }
  if (t.last_sender_id === myId) return false;
  const read = reads[t.id];
  return !read || t.last_message_at > read;
}

export async function countUnreadForOrg(orgId: string): Promise<number> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;
    const [threads, reads] = await Promise.all([getThreads(orgId), getMyReads()]);
    return threads.filter(t => isUnread(t, user.id, reads, false)).length;
  } catch { return 0; } // offline: keep the last badge, retry on the next poll
}

export async function mailApi(url: string, payload: Record<string, unknown>) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Something went wrong.");
  return json;
}
