import { createClient } from "./supabase";

export type QuickNoteVisibility = "private" | "shared";

export type QuickNote = {
  id: string;
  org_id: string | null;
  user_id: string;
  content: string;
  visibility: QuickNoteVisibility;
  completed_at: string | null;
  created_at: string;
};

/**
 * Pass orgId for the org-space version (team notes), or null for the
 * founder's own personal notes on the platform dashboard.
 */
export async function getActiveQuickNotes(orgId: string | null): Promise<QuickNote[]> {
  const supabase = createClient();
  let query = supabase
    .from("quick_notes")
    .select("*")
    .is("completed_at", null)
    .order("created_at", { ascending: false });

  query = orgId ? query.eq("org_id", orgId) : query.is("org_id", null);

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching quick notes:", error);
    return [];
  }
  return data as QuickNote[];
}

export async function getCompletedQuickNotes(orgId: string | null, limit = 50): Promise<QuickNote[]> {
  const supabase = createClient();
  let query = supabase
    .from("quick_notes")
    .select("*")
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(limit);

  query = orgId ? query.eq("org_id", orgId) : query.is("org_id", null);

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching completed quick notes:", error);
    return [];
  }
  return data as QuickNote[];
}

export async function createQuickNote(
  orgId: string | null,
  content: string,
  visibility: QuickNoteVisibility
): Promise<QuickNote | null> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return null;

  const { data, error } = await supabase
    .from("quick_notes")
    .insert([{ org_id: orgId, user_id: userId, content, visibility }])
    .select()
    .single();

  if (error) {
    console.error("Error creating quick note:", error);
    return null;
  }
  return data as QuickNote;
}

export async function completeQuickNote(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from("quick_notes").update({ completed_at: new Date().toISOString() }).eq("id", id);
}

export async function reopenQuickNote(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from("quick_notes").update({ completed_at: null }).eq("id", id);
}

export async function deleteQuickNote(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from("quick_notes").delete().eq("id", id);
}
