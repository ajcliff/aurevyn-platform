import { createClient } from "./supabase";

export type ContactMessage = {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  created_at: string;
};

export async function getContactMessages(limit = 200): Promise<ContactMessage[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("contact_messages")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching contact messages:", error);
    return [];
  }

  return data as ContactMessage[];
}

export async function deleteContactMessage(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from("contact_messages").delete().eq("id", id);
}
