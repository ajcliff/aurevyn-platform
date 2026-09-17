import { createClient } from "@/lib/supabase";
import { postSaleJournal } from "@/lib/journal";
import { getOrgSettings } from "@/lib/orgSettings";

export interface PosSaleItem {
  id?: string;
  sale_id?: string;

  product_id?: string;
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

  tax_amount?: number;

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
  sale: PosSale,
  client?: ReturnType<typeof createClient>
) {
  const supabase = client ?? createClient();

  // VAT is extracted from the tax-inclusive sale total using the org's
  // configured rate (org_settings.default_vat_rate), not added on top —
  // POS retail pricing in Kenya is conventionally quoted VAT-inclusive.
  const settings = await getOrgSettings(sale.org_id);
  const vatRate = settings.default_vat_rate || 0;
  const taxAmount = vatRate > 0 ? Number((sale.total * (vatRate / (100 + vatRate))).toFixed(2)) : 0;

  const { data: saleData, error: saleError } =
    await supabase
      .from("pos_sales")
      .insert({
        customer_name: sale.customer_name,
        customer_id: sale.customer_id ?? null,
        org_id: sale.org_id,
        items: sale.items,
        total: sale.total,
        tax_amount: taxAmount,
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
      product_id: item.product_id ?? null,
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

  // COGS: pull avg_cost for every sold product in one batch and post it
  // against Inventory in the same journal entry as the sale. Items without
  // a product_id (older callers, or manual line items with no inventory
  // link) contribute 0 COGS rather than blocking the sale.
  let cogsAmount = 0;
  const productIds = sale.items.map((i) => i.product_id).filter((id): id is string => Boolean(id));
  if (productIds.length > 0) {
    const { data: costData } = await supabase
      .from("inventory_products")
      .select("id, avg_cost")
      .in("id", productIds);

    const costById = new Map((costData || []).map((p) => [p.id, Number(p.avg_cost || 0)]));
    for (const item of sale.items) {
      if (item.product_id && costById.has(item.product_id)) {
        cogsAmount += item.quantity * (costById.get(item.product_id) || 0);
      }
    }
  }

  if ((sale.status ?? "completed") === "completed") {
    await postSaleJournal({ ...saleData, cogs_amount: cogsAmount });
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