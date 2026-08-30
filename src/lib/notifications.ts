import { createClient } from "./supabase";

export type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
};

export async function createNotification(
  type: string,
  title: string,
  message: string
) {
  const supabase = createClient();
  const { error } = await supabase
    .from("notifications")
    .insert({ type, title, message, read: false });

  if (error) {
    console.error("Failed to create notification:", error);
  }
}


export async function getNotifications(): Promise<Notification[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("Error fetching notifications:", error);
    return [];
  }

  return data as Notification[];
}

export async function markAsRead(id: string) {
  const supabase = createClient();
  await supabase.from("notifications").update({ read: true }).eq("id", id);
}

export async function markAllAsRead() {
  const supabase = createClient();
  await supabase.from("notifications").update({ read: true }).eq("read", false);
}