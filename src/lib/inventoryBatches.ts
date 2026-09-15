import { createClient } from "@/lib/supabase";

export interface InventoryBatch {
  id?: string;
  org_id: string;
  product_id: string;
  warehouse_id?: string | null;
  batch_number?: string | null;
  quantity: number;
  expiry_date?: string | null;
  received_at?: string;
  created_at?: string;
}

export async function getBatchesForProduct(productId: string): Promise<InventoryBatch[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("inventory_batches")
    .select("*")
    .eq("product_id", productId)
    .order("expiry_date", { ascending: true, nullsFirst: false });

  if (error) {
    console.error("Error fetching batches:", error);
    return [];
  }
  return data as InventoryBatch[];
}

export async function createBatch(batch: InventoryBatch): Promise<InventoryBatch | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("inventory_batches")
    .insert([batch])
    .select()
    .single();

  if (error) {
    console.error("Error creating batch:", error);
    return null;
  }
  return data as InventoryBatch;
}

export async function updateBatchQuantity(id: string, quantity: number): Promise<void> {
  const supabase = createClient();
  await supabase.from("inventory_batches").update({ quantity }).eq("id", id);
}

export async function deleteBatch(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from("inventory_batches").delete().eq("id", id);
}

/**
 * Batches expiring within `withinDays` (default 30), across the whole org -
 * the basis for an "expiring soon" alert list.
 */
export async function getExpiringBatches(orgId: string, withinDays = 30): Promise<(InventoryBatch & { product_name?: string })[]> {
  const supabase = createClient();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + withinDays);

  const { data, error } = await supabase
    .from("inventory_batches")
    .select("*, inventory_products(name)")
    .eq("org_id", orgId)
    .not("expiry_date", "is", null)
    .lte("expiry_date", cutoff.toISOString().slice(0, 10))
    .gt("quantity", 0)
    .order("expiry_date", { ascending: true });

  if (error) {
    console.error("Error fetching expiring batches:", error);
    return [];
  }

  return (data as any[]).map((b) => ({ ...b, product_name: b.inventory_products?.name }));
}
