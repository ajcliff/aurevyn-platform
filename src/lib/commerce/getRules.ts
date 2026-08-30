import { createClient } from "@/lib/supabase";
import { CommerceRule } from "./rulesEngine";

const supabase = createClient();

export async function getCommerceRules(
  orgId: string
): Promise<CommerceRule[]> {
  const { data, error } = await supabase
    .from("commerce_rules")
    .select("*")
    .eq("org_id", orgId)
    .eq("enabled", true)
    .order("priority", {
      ascending: true,
    });

  if (error) {
    console.error(error);
    return [];
  }

  return data as CommerceRule[];
}