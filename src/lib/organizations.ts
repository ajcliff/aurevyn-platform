import { createClient } from "./supabase";

export type Organization = {
  id: string;
  name: string;
  location: string;
  status: "operational" | "warning" | "critical";
  revenue: string;
  package: string;
  created_at: string;
};

export async function getOrganizations(): Promise<Organization[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;

  return data as Organization[];
}

export async function createOrganization(org: Omit<Organization, "id" | "created_at">) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("organizations")
    .insert([org])
    .select()
    .single();

  if (error) throw error;

  return data as Organization;
}

export async function updateOrganization(id: string, updates: Partial<Organization>) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("organizations")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return data as Organization;
}

export async function deleteOrganization(id: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("organizations")
    .delete()
    .eq("id", id);

  if (error) throw error;

  return true;
}