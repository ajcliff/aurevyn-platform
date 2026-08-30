import { createClient } from "@/lib/supabase";

export interface CommerceRule {

  id: string;

  org_id: string;

  engine: string;

  priority: number;

  active: boolean;

  name: string;

  condition: any;

  action: any;

}

export async function getCommerceRules(
  orgId: string,
  engine: string
) {

  const supabase = createClient();

  const { data, error } =
    await supabase
      .from("commerce_rules")
      .select("*")
      .eq("org_id", orgId)
      .eq("engine", engine)
      .eq("active", true)
      .order("priority");

  if (error) throw error;

  return data as CommerceRule[];

}