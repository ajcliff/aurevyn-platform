import { createClient } from "@/lib/supabase";

import type {
  CartItem
} from "./cart";

export async function updateInventoryAfterSale(
  cart: CartItem[]
) {
  const supabase =
    createClient();

  for (const item of cart) {
    const {
      data: product,
      error
    } = await supabase
      .from("inventory_products")
      .select("*")
      .eq(
        "id",
        item.product_id
      )
      .single();

    if (error || !product)
      continue;

    const newQuantity =
      Math.max(
        0,
        Number(
          product.stock_quantity
        ) - item.quantity
      );

    await supabase
      .from(
        "inventory_products"
      )
      .update({
        stock_quantity:
          newQuantity
      })
      .eq(
        "id",
        product.id
      );

    await supabase
      .from(
        "inventory_movements"
      )
      .insert({
        org_id:
          product.org_id,

        product_id:
          product.id,

        type:
          "stock_out",

        quantity:
          item.quantity,

        note:
          "POS Sale"
      });
  }
}