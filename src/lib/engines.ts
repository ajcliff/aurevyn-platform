import { createClient } from "./supabase";

export type Engine = {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  tier: string;
  status: string;
  version: string;
  icon: string;
  created_at: string;
};

export type Blueprint = {
  id: string;
  name: string;
  slug: string;
  industry: string;
  description: string;
  icon: string;
  color: string;
  recommended_tier: string;
  created_at: string;
};

export type OrgEngine = {
  id: string;
  org_id: string;
  engine_id: string;
  enabled: boolean;
  activated_at: string;
  subscription_tier: string;
};

export async function getEngines(): Promise<Engine[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("engines").select("*").order("tier").order("name");
  if (error) throw error;
  return data as Engine[];
}

export async function getBlueprints(): Promise<Blueprint[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("blueprints").select("*").order("name");
  if (error) { console.error(error); return []; }
  return data as Blueprint[];
}

export async function getBlueprintEngines(blueprintId: string): Promise<string[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("blueprint_engines")
    .select("engine_id")
    .eq("blueprint_id", blueprintId);
  return data?.map(d => d.engine_id) ?? [];
}

export async function getOrgEngines(orgId: string): Promise<OrgEngine[]> {
  const supabase = createClient();
  const { data } = await supabase.from("organization_engines").select("*").eq("org_id", orgId);
  return data as OrgEngine[] ?? [];
}

export async function activateEngine(orgId: string, engineId: string, tier: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("organization_engines")
    .upsert({ org_id: orgId, engine_id: engineId, enabled: true, subscription_tier: tier })
    .select().single();
  if (error) { console.error(error); return null; }
  return data;
}

export async function activateBlueprintForOrg(orgId: string, blueprintId: string, tier: string) {
  const supabase = createClient();
  const engineIds = await getBlueprintEngines(blueprintId);
  const rows = engineIds.map(engineId => ({ org_id: orgId, engine_id: engineId, enabled: true, subscription_tier: tier }));
  const { error } = await supabase.from("organization_engines").upsert(rows);
  if (error) { console.error(error); return false; }
  return true;
}