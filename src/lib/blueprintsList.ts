import { createClient } from "@/lib/supabase";

export type BlueprintOption = { id: string; name: string; slug: string; industry: string };

export async function getBlueprintOptions(): Promise<BlueprintOption[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("blueprints")
    .select("id, name, slug, industry")
    .order("name");

  if (error) {
    console.error("Failed to load blueprints:", error);
    return [];
  }
  return data || [];
}