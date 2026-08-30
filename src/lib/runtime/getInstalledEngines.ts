import { createClient } from "@/lib/supabase";

export async function getInstalledEngines(
  organizationId: string
) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("organization_engines")
    .select(`
      *,
      engines (*)
    `)
    .eq("org_id", organizationId)
    .eq("enabled", true);

  if (error) throw error;

  return data ?? [];
}