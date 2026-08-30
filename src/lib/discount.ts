import { createClient } from "@/lib/supabase";

export interface Discount {
  id: string;
  org_id: string;

  name: string;

  type: "percentage" | "fixed";

  value: number;

  active: boolean;

  created_at?: string;
}

export async function getDiscounts(orgId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("pos_discounts")
    .select("*")
    .eq("org_id", orgId)
    .eq("active", true)
    .order("name");

  if (error) throw error;

  return (data ?? []) as Discount[];
}