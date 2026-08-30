// src/lib/modules.ts
import { createClient } from "@/lib/supabase";

export type Module = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string | null;
  status: "active" | "inactive" | "beta";
  icon: string | null;
  created_at: string;
};

export async function getModules(): Promise<Module[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("modules")
    .select("*")
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function toggleModule(id: string, status: "active" | "inactive") {
  const supabase = createClient();
  const { error } = await supabase
    .from("modules")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
}

export async function createModule(
  module: Omit<Module, "id" | "created_at">
) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("modules")
    .insert(module)
    .select()
    .single();
  if (error) throw error;
  return data;
}