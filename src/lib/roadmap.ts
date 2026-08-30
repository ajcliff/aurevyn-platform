import { createClient } from "./supabase";

export type RoadmapStatus = "backlog" | "planned" | "in_progress" | "done";
export type RoadmapPriority = "low" | "medium" | "high";

export type RoadmapItem = {
  id: string;
  title: string;
  description: string | null;
  area: string;
  status: RoadmapStatus;
  priority: RoadmapPriority;
  target_date: string | null;
  created_at: string;
  updated_at: string;
};

export async function getRoadmapItems(): Promise<RoadmapItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("roadmap_items")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as RoadmapItem[];
}

export async function createRoadmapItem(item: {
  title: string;
  description?: string;
  area: string;
  priority: RoadmapPriority;
  target_date?: string | null;
}): Promise<RoadmapItem> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("roadmap_items")
    .insert({ ...item, status: "backlog" })
    .select()
    .single();
  if (error) throw error;
  return data as RoadmapItem;
}

export async function updateRoadmapItem(
  id: string,
  updates: Partial<Pick<RoadmapItem, "title" | "description" | "area" | "status" | "priority" | "target_date">>
): Promise<RoadmapItem> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("roadmap_items")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as RoadmapItem;
}

export async function deleteRoadmapItem(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("roadmap_items").delete().eq("id", id);
  if (error) throw error;
}