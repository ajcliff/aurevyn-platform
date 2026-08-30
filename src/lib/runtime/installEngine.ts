import { createClient } from "@/lib/supabase";

export async function installEngine(
  organizationId: string,
  engineId: string
) {
  const supabase = createClient();

  const { error } = await supabase
    .from("organization_engines")
    .insert({
      organization_id: organizationId,
      engine_id: engineId
    });

  if (error) throw error;

  return true;
}