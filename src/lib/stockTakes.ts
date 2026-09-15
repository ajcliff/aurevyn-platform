import { createClient } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";
import { updateStock } from "@/lib/inventory";

export interface StockTake {
  id?: string;
  org_id: string;
  warehouse_id: string;
  status?: "in_progress" | "completed" | "cancelled";
  started_by?: string | null;
  started_at?: string;
  completed_at?: string | null;
}

export interface StockTakeItem {
  id?: string;
  stock_take_id: string;
  product_id: string;
  expected_quantity: number;
  counted_quantity: number | null;
  variance?: number;
  counted_at?: string | null;
  product_name?: string;
  sku?: string;
}

/**
 * Starts a new stock-take for a warehouse: snapshots every product's
 * current per-warehouse stock level as the "expected" quantity to count
 * against.
 */
export async function startStockTake(orgId: string, warehouseId: string, startedBy: string): Promise<StockTake | null> {
  const supabase = createClient();

  const { data: take, error: takeError } = await supabase
    .from("stock_takes")
    .insert({ org_id: orgId, warehouse_id: warehouseId, started_by: startedBy })
    .select()
    .single();

  if (takeError || !take) {
    console.error("Error starting stock take:", takeError);
    return null;
  }

  const { data: levels } = await supabase
    .from("inventory_stock_levels")
    .select("product_id, quantity")
    .eq("warehouse_id", warehouseId);

  if (levels?.length) {
    await supabase.from("stock_take_items").insert(
      levels.map((l) => ({
        stock_take_id: take.id,
        product_id: l.product_id,
        expected_quantity: Number(l.quantity),
      }))
    );
  }

  await logActivity({
    icon: "📋",
    title: "Stock take started",
    sub: `By ${startedBy}`,
    org_id: orgId,
  });

  return take as StockTake;
}

export async function getStockTakeItems(stockTakeId: string): Promise<StockTakeItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("stock_take_items")
    .select("*, inventory_products(name, sku)")
    .eq("stock_take_id", stockTakeId);

  if (error) {
    console.error("Error fetching stock take items:", error);
    return [];
  }

  return (data as any[]).map((i) => ({
    ...i,
    product_name: i.inventory_products?.name,
    sku: i.inventory_products?.sku,
  }));
}

export async function recordCount(itemId: string, countedQuantity: number): Promise<void> {
  const supabase = createClient();
  await supabase
    .from("stock_take_items")
    .update({ counted_quantity: countedQuantity, counted_at: new Date().toISOString() })
    .eq("id", itemId);
}

/**
 * Finalizes a stock take: for every item with a variance, adjusts the real
 * stock level to match the counted quantity (recorded as an "adjustment"
 * movement, so it's visible in the audit trail), then marks the take
 * completed. Items never counted are left untouched.
 */
export async function completeStockTake(stockTakeId: string, orgId: string, warehouseId: string): Promise<{ adjusted: number }> {
  const supabase = createClient();
  const items = await getStockTakeItems(stockTakeId);
  let adjusted = 0;

  for (const item of items) {
    if (item.counted_quantity === null || item.counted_quantity === undefined) continue;
    const variance = item.counted_quantity - item.expected_quantity;
    if (variance === 0) continue;

    await updateStock(
      item.product_id,
      item.counted_quantity,
      "adjustment",
      `Stock take ${variance > 0 ? "surplus" : "shortfall"} — counted ${item.counted_quantity}, expected ${item.expected_quantity}`,
      warehouseId
    );
    adjusted++;
  }

  await supabase
    .from("stock_takes")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", stockTakeId);

  await logActivity({
    icon: "✅",
    title: "Stock take completed",
    sub: `${adjusted} item${adjusted === 1 ? "" : "s"} adjusted`,
    org_id: orgId,
  });

  return { adjusted };
}

export async function cancelStockTake(stockTakeId: string): Promise<void> {
  const supabase = createClient();
  await supabase.from("stock_takes").update({ status: "cancelled" }).eq("id", stockTakeId);
}

export async function getStockTakes(orgId: string): Promise<StockTake[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("stock_takes")
    .select("*, warehouses(name)")
    .eq("org_id", orgId)
    .order("started_at", { ascending: false });

  if (error) {
    console.error("Error fetching stock takes:", error);
    return [];
  }
  return data as StockTake[];
}
