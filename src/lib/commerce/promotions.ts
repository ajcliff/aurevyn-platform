import { createClient } from "@/lib/supabase";

export interface Promotion {
  id: string;
  org_id: string;

  name: string;

  type:
    | "percentage"
    | "fixed"
    | "buy_x_get_y";

  value: number;

  active: boolean;

  starts_at: string | null;

  ends_at: string | null;
}

export async function getPromotions(
  orgId: string
): Promise<Promotion[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("commerce_promotions")
    .select("*")
    .eq("org_id", orgId)
    .eq("active", true);

  if (error) throw error;

  return data ?? [];
}