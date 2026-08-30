import { createClient } from "@/lib/supabase";
import type { Organization, Blueprint, InstalledEngine } from "./models";

export async function getOrgRuntime(orgId: string): Promise<{
  organization: Organization;
  blueprint: Blueprint | null;
  engines: InstalledEngine[];
} | null> {
  const supabase = createClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", orgId)
    .maybeSingle();

  if (!org) return null;

  let blueprint: Blueprint | null = null;

  if (org.blueprint_id) {
    const { data: bp } = await supabase
      .from("blueprints")
      .select("id, name, slug, industry, description")
      .eq("id", org.blueprint_id)
      .maybeSingle();
    blueprint = bp ?? null;
  }

const { data: installed, error: enginesError } = await supabase
    .from("organization_engines")
    .select("*, engines(*)")
    .eq("org_id", orgId)
    .eq("enabled", true);

  if (enginesError) {
    console.error("Failed to load org engines:", enginesError);
  }

  return {
    organization: org as Organization,
    blueprint,
    engines: (installed ?? []) as InstalledEngine[],
  };
}