import { createClient } from "./supabase";

export type Activity = {
  id: string;
  icon: string;
  title: string;
  sub: string;
  org_id?: string | null;
  user_id?: string | null;
  user_name?: string | null;
  created_at: string;
};

export async function getActivity(): Promise<Activity[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("activity")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("Error fetching activity:", error);
    return [];
  }

  return data as Activity[];
}

export async function getOrgActivity(orgId: string, limit = 30): Promise<Activity[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("activity")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching org activity:", error);
    return [];
  }

  return data as Activity[];
}

export async function logActivity(
  entry: Omit<Activity, "id" | "created_at">
) {
  const supabase = createClient();
  const { error } = await supabase.from("activity").insert([entry]);
  if (error) console.error("Error logging activity:", error);
}