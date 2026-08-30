import { createClient } from "@/lib/supabase";

const supabase = createClient();

export type SavedCart = {
  id: string;
  org_id: string;
 customer_id: string | null;
  items: unknown;
  total: number;
  created_at: string;
};

export async function getSavedCarts(orgId: string) {
  const { data, error } = await supabase
    .from("saved_carts")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data as SavedCart[];
}

export async function saveCart(
  orgId: string,
  customerId: string | null,
  items: unknown,
  total: number
) {
  const { error } = await supabase
    .from("saved_carts")
    .insert({
      org_id: orgId,
      customer_id: customerId,
      items,
      total,
    });

  if (error) throw error;
}

export async function deleteSavedCart(id: string) {
  const { error } = await supabase
    .from("saved_carts")
    .delete()
    .eq("id", id);

  if (error) throw error;
}