import { createClient } from "@/lib/supabase";

export interface PosSaleItem {
  id?: string;
  sale_id?: string;

  product_name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface PosSale {

customer_name?: string;
customer_id?: string | null;

  id?: string;

  org_id: string;

  items: PosSaleItem[];

  total: number;

  payment_method: string;

  status?: string;

  cashier?: string;

  created_at?: string;

  warehouse_id?: string | null;

  discount_id?: string | null;

  discount_amount?: number;
}

export async function getSales(orgId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("pos_sales")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data || [];
}

export type TopSellingProduct = {
  product_name: string;
  quantity_sold: number;
  revenue: number;
};

// Aggregates pos_sale_items across all sales for this org since sinceIso,
// grouped by product name. Used by the Overview "what's selling" widget.
export async function getTopSellingProducts(
  orgId: string,
  sinceIso: string,
  limit = 5
): Promise<TopSellingProduct[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("pos_sale_items")
    .select("product_name, quantity, total, pos_sales!inner(org_id, created_at)")
    .eq("pos_sales.org_id", orgId)
    .gte("pos_sales.created_at", sinceIso);

  if (error) {
    console.error(error);
    return [];
  }

  const totals = new Map<string, TopSellingProduct>();
  for (const row of data || []) {
    const existing = totals.get(row.product_name);
    if (existing) {
      existing.quantity_sold += Number(row.quantity);
      existing.revenue += Number(row.total);
    } else {
      totals.set(row.product_name, {
        product_name: row.product_name,
        quantity_sold: Number(row.quantity),
        revenue: Number(row.total),
      });
    }
  }

  return Array.from(totals.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

export async function getSaleItems(saleId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("pos_sale_items")
    .select("*")
    .eq("sale_id", saleId);

  if (error) throw error;

  return data || [];
}

export async function createSale(
  sale: PosSale
) {
  const supabase = createClient();

  const { data: saleData, error: saleError } =
    await supabase
      .from("pos_sales")
      .insert({
        customer_name: sale.customer_name,
        customer_id: sale.customer_id ?? null,
        org_id: sale.org_id,
        items: sale.items,
        total: sale.total,
        payment_method: sale.payment_method,
        status: sale.status ?? "completed",
        cashier: sale.cashier ?? "System",
        warehouse_id: sale.warehouse_id ?? null,
        discount_id: sale.discount_id ?? null,
        discount_amount: sale.discount_amount ?? 0
      })
      .select()
      .single();

  if (saleError) throw saleError;

  if (sale.items.length > 0) {
    const rows = sale.items.map((item) => ({
      sale_id: saleData.id,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.total
    }));

    const { error: itemError } = await supabase
      .from("pos_sale_items")
      .insert(rows);

    if (itemError) throw itemError;
  }

  return saleData;
}

export async function getSalesForCustomer(orgId: string, customerId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("pos_sales")
    .select("*")
    .eq("org_id", orgId)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}