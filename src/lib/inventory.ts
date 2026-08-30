import { createClient } from "@/lib/supabase";
import { createApprovalRequest, hasPendingAutoRequest } from "@/lib/approvals";

export interface InventoryProduct {
  id?: string;
  org_id: string;
  name: string;
  sku: string;
  category?: string;
  unit?: string;
  stock_quantity: number;
  low_stock_threshold: number;
  critical_stock_threshold?: number | null;
  unit_price: number;
  status?: string;
  created_at?: string;
}

export interface InventoryMovement {
  id?: string;
  org_id: string;
  product_id: string;
  type: "stock_in" | "stock_out" | "adjustment";
  quantity: number;
  note?: string;
  created_at?: string;
}

export async function getProducts(orgId: string): Promise<InventoryProduct[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("inventory_products")
    .select("*")
    .eq("org_id", orgId)
    .neq("status", "archived")
    .order("name");

  if (error) throw error;
  return data || [];
}

export async function createProduct(product: InventoryProduct) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("inventory_products")
    .insert({ ...product, status: "active" })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateProduct(id: string, updates: Partial<InventoryProduct>) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("inventory_products")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function archiveProduct(id: string) {
  const supabase = createClient();

  const { error } = await supabase
    .from("inventory_products")
    .update({ status: "archived" })
    .eq("id", id);

  if (error) throw error;
  return true;
}

export async function getMovements(orgId: string, limit = 30) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("inventory_movements")
    .select(`*, inventory_products ( name, sku )`)
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function getLowStockProducts(orgId: string) {
  const products = await getProducts(orgId);
  return products.filter(
    (p) => Number(p.stock_quantity) <= Number(p.low_stock_threshold)
  );
}

export function getCategories(products: InventoryProduct[]): string[] {
  const set = new Set(
    products.map((p) => p.category).filter((c): c is string => Boolean(c))
  );
  return Array.from(set).sort();
}

export function getInventoryValue(products: InventoryProduct[]): number {
  return products.reduce(
    (sum, p) => sum + Number(p.stock_quantity) * Number(p.unit_price),
    0
  );
}

export async function updateStock(
  productId: string,
  quantity: number,
  type: "stock_in" | "stock_out" | "adjustment",
  note = "",
  warehouseId?: string
) {
  const supabase = createClient();

  const { data: product, error: fetchError } = await supabase
    .from("inventory_products")
    .select("*")
    .eq("id", productId)
    .single();

  if (fetchError) throw fetchError;

  // No warehouse specified (e.g. a POS sale) — fall back to the org's default warehouse.
  let resolvedWarehouseId = warehouseId;
  if (!resolvedWarehouseId) {
    const { data: defaultWarehouse } = await supabase
      .from("warehouses")
      .select("id")
      .eq("org_id", product.org_id)
      .eq("is_default", true)
      .maybeSingle();
    resolvedWarehouseId = defaultWarehouse?.id;
  }

  if (!resolvedWarehouseId) {
    throw new Error("No warehouse available for this org. Create a warehouse before adjusting stock.");
  }

  // inventory_stock_levels is the source of truth. Apply the change at the
  // warehouse level first, then recompute stock_quantity as the sum across
  // every warehouse — this is what keeps the two tables from drifting apart.
  const { data: level } = await supabase
    .from("inventory_stock_levels")
    .select("*")
    .eq("product_id", productId)
    .eq("warehouse_id", resolvedWarehouseId)
    .maybeSingle();

  const currentLevelQty = Number(level?.quantity || 0);
  let newLevelQty = currentLevelQty;
  if (type === "stock_in") newLevelQty = currentLevelQty + quantity;
  if (type === "stock_out") newLevelQty = Math.max(currentLevelQty - quantity, 0);
  if (type === "adjustment") newLevelQty = quantity;

  if (level) {
    const { error: levelError } = await supabase
      .from("inventory_stock_levels")
      .update({ quantity: newLevelQty })
      .eq("id", level.id);
    if (levelError) throw levelError;
  } else {
    const { error: levelError } = await supabase
      .from("inventory_stock_levels")
      .insert({
        org_id: product.org_id,
        product_id: productId,
        warehouse_id: resolvedWarehouseId,
        quantity: newLevelQty,
      });
    if (levelError) throw levelError;
  }

  const { data: allLevels, error: sumError } = await supabase
    .from("inventory_stock_levels")
    .select("quantity")
    .eq("product_id", productId);
  if (sumError) throw sumError;

  const newQuantity = (allLevels || []).reduce((sum, l) => sum + Number(l.quantity), 0);

  const { error: updateError } = await supabase
    .from("inventory_products")
    .update({ stock_quantity: newQuantity })
    .eq("id", productId);

  if (updateError) throw updateError;

const { error: movementError } = await supabase
    .from("inventory_movements")
    .insert({
      org_id: product.org_id,
      product_id: product.id,
      type,
      quantity,
      note,
    });

  if (movementError) throw movementError;

  // Auto-create a purchase approval request if stock has hit the critical threshold
  if (
    product.critical_stock_threshold !== null &&
    product.critical_stock_threshold !== undefined &&
    newQuantity <= product.critical_stock_threshold
  ) {
    const alreadyRequested = await hasPendingAutoRequest(product.org_id, product.id);

    if (!alreadyRequested) {
      await createApprovalRequest({
        orgId: product.org_id,
        requestedByUserId: null,
        requestedByName: "AUREVYN Automation",
        type: "purchase",
        title: `Restock ${product.name}`,
        description: `${product.name} hit critical stock (${newQuantity} ${product.unit || "units"} remaining, critical threshold: ${product.critical_stock_threshold}). Auto-created by low-stock automation.`,
        amount: null,
        source: "auto_low_stock",
        relatedId: product.id,
      });
    }
  }

  return true;
}