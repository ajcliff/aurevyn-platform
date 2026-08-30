import { createClient } from "@/lib/supabase";

export async function getBlueprint(
  organizationId: string
) {
  const supabase = createClient();

  const { data: organization, error } =
    await supabase
      .from("organizations")
      .select("package")
      .eq("id", organizationId)
      .single();

  if (error) throw error;

  const { data: blueprint, error: bpError } =
    await supabase
      .from("blueprints")
      .select("*")
      .limit(1)
      .single();

  if (bpError) throw bpError;

  return blueprint;
}