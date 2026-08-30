import { createClient } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";

export type Pricelist = {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  currency: string;
  created_at: string;
};

export type PricelistItem = {
  id: string;
  pricelist_id: string;
  product_id: string;
  price: number;
};

export async function getPricelists(orgId: string): Promise<Pricelist[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("pricelists")
    .select("*")
    .eq("org_id", orgId)
    .order("name");

  if (error) throw error;
  return data || [];
}

export async function createPricelist(input: {
  orgId: string;
  name: string;
  description: string;
}): Promise<Pricelist> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("pricelists")
    .insert({ org_id: input.orgId, name: input.name, description: input.description })
    .select()
    .single();

  if (error) throw error;

  await logActivity({ icon: "🏷️", title: "Pricelist created", sub: input.name, org_id: input.orgId });

  return data;
}

export async function deletePricelist(id: string, name: string, orgId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("pricelists").delete().eq("id", id);
  if (error) throw error;

  await logActivity({ icon: "🗑️", title: "Pricelist deleted", sub: name, org_id: orgId });
}

export async function getPricelistItems(pricelistId: string): Promise<PricelistItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("pricelist_items")
    .select("*")
    .eq("pricelist_id", pricelistId);

  if (error) throw error;
  return data || [];
}

export async function setPricelistPrice(
  orgId: string,
  pricelistId: string,
  productId: string,
  price: number
) {
  const supabase = createClient();
  const { error } = await supabase
    .from("pricelist_items")
    .upsert(
      { org_id: orgId, pricelist_id: pricelistId, product_id: productId, price },
      { onConflict: "pricelist_id,product_id" }
    );

  if (error) throw error;
}

export async function removePricelistPrice(pricelistId: string, productId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("pricelist_items")
    .delete()
    .eq("pricelist_id", pricelistId)
    .eq("product_id", productId);

  if (error) throw error;
}

// The actual price to charge a given customer for a given product —
// falls back to the product's own base price if no override exists
export async function getEffectivePrice(
  productId: string,
  basePrice: number,
  customerPricelistId: string | null
): Promise<number> {
  if (!customerPricelistId) return basePrice;

  const supabase = createClient();
  const { data } = await supabase
    .from("pricelist_items")
    .select("price")
    .eq("pricelist_id", customerPricelistId)
    .eq("product_id", productId)
    .maybeSingle();

  return data ? Number(data.price) : basePrice;
}

export async function getPricelistOverridesForProduct(
  productId: string
): Promise<{ pricelistId: string; pricelistName: string; price: number }[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("pricelist_items")
    .select("pricelist_id, price, pricelists(name)")
    .eq("product_id", productId);

  if (error) {
    console.error(error);
    return [];
  }

  return (data || []).map((row: any) => ({
    pricelistId: row.pricelist_id,
    pricelistName: row.pricelists?.name ?? "Pricelist",
    price: Number(row.price),
  }));
}

export async function assignCustomerPricelist(customerId: string, pricelistId: string | null) {

const supabase = createClient();
  const { error } = await supabase
    .from("customers")
    .update({ pricelist_id: pricelistId })
    .eq("id", customerId);

  if (error) throw error;
}