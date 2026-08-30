import { createClient } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";

export type Warehouse = {
  id: string;
  org_id: string;
  name: string;
  code: string | null;
  address: string | null;
  is_default: boolean;
  status: string;
  created_at: string;
};

export type StockLevel = {
  id: string;
  product_id: string;
  warehouse_id: string;
  quantity: number;
  warehouses: { name: string; code: string | null } | null;
};

export async function getWarehouses(orgId: string): Promise<Warehouse[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("warehouses")
    .select("*")
    .eq("org_id", orgId)
    .order("is_default", { ascending: false })
    .order("name");

  if (error) throw error;
  return data || [];
}

export async function createWarehouse(input: {
  orgId: string;
  name: string;
  code: string;
  address: string;
}): Promise<Warehouse> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("warehouses")
    .insert({
      org_id: input.orgId,
      name: input.name,
      code: input.code || null,
      address: input.address || null,
    })
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    icon: "🏬",
    title: "Warehouse added",
    sub: input.name,
    org_id: input.orgId,
  });

  return data;
}

export async function updateWarehouse(id: string, updates: Partial<Warehouse>) {
  const supabase = createClient();
  const { error } = await supabase.from("warehouses").update(updates).eq("id", id);
  if (error) throw error;
}

export async function setDefaultWarehouse(orgId: string, warehouseId: string) {
  const supabase = createClient();

  // Only one default per org
  await supabase.from("warehouses").update({ is_default: false }).eq("org_id", orgId);
  const { error } = await supabase
    .from("warehouses")
    .update({ is_default: true })
    .eq("id", warehouseId);

  if (error) throw error;
}

export async function deleteWarehouse(id: string, orgId: string, name: string) {
  const supabase = createClient();

  // Refuse to delete a warehouse that still holds stock — real accounting safety net
  const { data: stock } = await supabase
    .from("inventory_stock_levels")
    .select("quantity")
    .eq("warehouse_id", id)
    .gt("quantity", 0);

  if (stock && stock.length > 0) {
    throw new Error("This warehouse still holds stock. Transfer everything out before deleting it.");
  }

  const { error } = await supabase.from("warehouses").delete().eq("id", id);
  if (error) throw error;

  await logActivity({ icon: "🗑️", title: "Warehouse deleted", sub: name, org_id: orgId });
}

export async function getStockValueByWarehouse(orgId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("inventory_stock_levels")
    .select("quantity, warehouses(name), inventory_products(name, unit_price, low_stock_threshold)")
    .eq("org_id", orgId);

  if (error) throw error;
  return data || [];
}

export async function deductStockFromWarehouse(
  productId: string,
  warehouseId: string,
  quantity: number
) {
  const supabase = createClient();

  const { data: level } = await supabase
    .from("inventory_stock_levels")
    .select("*")
    .eq("product_id", productId)
    .eq("warehouse_id", warehouseId)
    .maybeSingle();

  const currentQty = Number(level?.quantity || 0);
  const newQty = Math.max(currentQty - quantity, 0);

  if (level) {
    await supabase
      .from("inventory_stock_levels")
      .update({ quantity: newQty })
      .eq("id", level.id);
  }
}

export async function getStockLevelsForProduct(productId: string): Promise<StockLevel[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("inventory_stock_levels")
    .select("*, warehouses(name, code)")
    .eq("product_id", productId);

  if (error) throw error;
  return data || [];
}

export async function transferStock(input: {
  orgId: string;
  productId: string;
  productName: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  quantity: number;
  note: string;
  transferredByName: string;
}) {
  if (input.fromWarehouseId === input.toWarehouseId) {
    throw new Error("Source and destination warehouse must be different.");
  }
  if (input.quantity <= 0) {
    throw new Error("Transfer quantity must be greater than zero.");
  }

  const supabase = createClient();

  const { data: fromLevel } = await supabase
    .from("inventory_stock_levels")
    .select("*")
    .eq("product_id", input.productId)
    .eq("warehouse_id", input.fromWarehouseId)
    .maybeSingle();

  const availableQty = Number(fromLevel?.quantity || 0);
  if (availableQty < input.quantity) {
    throw new Error(`Only ${availableQty} units available at the source warehouse.`);
  }

  // Decrement source
  await supabase
    .from("inventory_stock_levels")
    .update({ quantity: availableQty - input.quantity })
    .eq("id", fromLevel!.id);

  // Increment destination (create the row if it doesn't exist yet)
  const { data: toLevel } = await supabase
    .from("inventory_stock_levels")
    .select("*")
    .eq("product_id", input.productId)
    .eq("warehouse_id", input.toWarehouseId)
    .maybeSingle();

  if (toLevel) {
    await supabase
      .from("inventory_stock_levels")
      .update({ quantity: Number(toLevel.quantity) + input.quantity })
      .eq("id", toLevel.id);
  } else {
    await supabase.from("inventory_stock_levels").insert({
      org_id: input.orgId,
      product_id: input.productId,
      warehouse_id: input.toWarehouseId,
      quantity: input.quantity,
    });
  }

  await supabase.from("inventory_transfers").insert({
    org_id: input.orgId,
    product_id: input.productId,
    from_warehouse_id: input.fromWarehouseId,
    to_warehouse_id: input.toWarehouseId,
    quantity: input.quantity,
    note: input.note,
    transferred_by_name: input.transferredByName,
  });

  await logActivity({
    icon: "🚚",
    title: "Stock transferred",
    sub: `${input.quantity} × ${input.productName}`,
    org_id: input.orgId,
  });
}

export async function getTransferHistory(orgId: string, limit = 30) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("inventory_transfers")
    .select("*, inventory_products(name, sku)")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}