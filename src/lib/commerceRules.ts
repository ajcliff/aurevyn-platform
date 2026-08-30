import { createClient } from "@/lib/supabase";

const supabase = createClient();

export interface CommerceRule {
  id: string;
  org_id: string;
  name: string;
  type: string;
  priority: number;
  enabled: boolean;
  conditions: Record<string, unknown>;
  actions: Record<string,unknown>;
  created_at?: string;
}

export async function getRules(orgId: string) {
  const { data, error } = await supabase
    .from("commerce_rules")
    .select("*")
    .eq("org_id", orgId)
    .order("priority");

  if (error) throw error;

  return data as CommerceRule[];
}

export async function createRule(
  rule: Omit<CommerceRule,"id" | "created_at">
) {
  const { error } = await supabase
    .from("commerce_rules")
    .insert(rule);

  if (error) throw error;
}

export async function updateRule(
  id: string,
  updates: Partial<CommerceRule>
) {
  const { error } = await supabase
    .from("commerce_rules")
    .update(updates)
    .eq("id", id);

  if (error) throw error;
}

export async function deleteRule(id: string) {
  const { error } = await supabase
    .from("commerce_rules")
    .delete()
    .eq("id", id);

  if (error) throw error;
}