import { createClient } from "@/lib/supabase";

export async function getProducts(orgId: string) {
  const supabase = createClient();

  const { data } = await supabase
    .from("inventory_products")
    .select("*")
    .eq("org_id", orgId);

  return data ?? [];
}