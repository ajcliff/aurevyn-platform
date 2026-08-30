import { createClient } from "./supabase";

export type MaintenanceCategory = "backups" | "security" | "tax" | "dependencies" | "infrastructure" | "other";
export type MaintenanceFrequency = "one_off" | "weekly" | "monthly" | "quarterly" | "annual";

export type MaintenanceItem = {
  id: string;
  title: string;
  notes: string | null;
  category: MaintenanceCategory;
  frequency: MaintenanceFrequency;
  next_due: string;
  last_completed: string | null;
  created_at: string;
  updated_at: string;
};

export async function getMaintenanceItems(): Promise<MaintenanceItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("maintenance_items")
    .select("*")
    .order("next_due", { ascending: true });
  if (error) throw error;
  return data as MaintenanceItem[];
}

export async function createMaintenanceItem(item: {
  title: string;
  notes?: string;
  category: MaintenanceCategory;
  frequency: MaintenanceFrequency;
  next_due: string;
}): Promise<MaintenanceItem> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("maintenance_items")
    .insert(item)
    .select()
    .single();
  if (error) throw error;
  return data as MaintenanceItem;
}

function computeNextDue(from: string, frequency: MaintenanceFrequency): string {
  const date = new Date(from);
  switch (frequency) {
    case "weekly": date.setDate(date.getDate() + 7); break;
    case "monthly": date.setMonth(date.getMonth() + 1); break;
    case "quarterly": date.setMonth(date.getMonth() + 3); break;
    case "annual": date.setFullYear(date.getFullYear() + 1); break;
    case "one_off": break;
  }
  return date.toISOString().split("T")[0];
}

export async function markMaintenanceComplete(item: MaintenanceItem): Promise<MaintenanceItem> {
  const supabase = createClient();
  const today = new Date().toISOString().split("T")[0];
  const nextDue = item.frequency === "one_off" ? item.next_due : computeNextDue(today, item.frequency);

  const { data, error } = await supabase
    .from("maintenance_items")
    .update({ last_completed: today, next_due: nextDue, updated_at: new Date().toISOString() })
    .eq("id", item.id)
    .select()
    .single();
  if (error) throw error;
  return data as MaintenanceItem;
}

export async function updateMaintenanceItem(
  id: string,
  updates: Partial<Pick<MaintenanceItem, "title" | "notes" | "category" | "frequency" | "next_due">>
): Promise<MaintenanceItem> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("maintenance_items")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as MaintenanceItem;
}

export async function deleteMaintenanceItem(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("maintenance_items").delete().eq("id", id);
  if (error) throw error;
}