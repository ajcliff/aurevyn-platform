import { createClient } from "@/lib/supabase";

import type {
  CartItem
} from "./cart";

import {
  updateInventoryAfterSale
} from "./events";

export type CheckoutInput = {
  org_id: string;

  customer_id?: string;

  branch_id?: string;

  register_id?: string;

  cashier?: string;

  payment_method:
    | "Cash"
    | "M-Pesa"
    | "Card"
    | "Bank";

  cart: CartItem[];

  subtotal: number;

  tax_amount: number;

  discount_amount: number;

  total: number;
};

export async function completeSale(
  input: CheckoutInput
) {
  const supabase =
    createClient();

  const {
    data: sale,
    error: saleError
  } = await supabase
    .from("pos_sales")
    .insert({
      org_id:
        input.org_id,

      customer_id:
        input.customer_id,

      branch_id:
        input.branch_id,

      register_id:
        input.register_id,

      cashier:
        input.cashier,

      subtotal:
        input.subtotal,

      tax_amount:
        input.tax_amount,

      discount_amount:
        input.discount_amount,

      total:
        input.total,

      payment_status:
        "paid",

      sale_status:
        "completed"
    })
    .select()
    .single();

  if (saleError)
    throw saleError;

  const items =
    input.cart.map(
      (item) => ({
        sale_id:
          sale.id,

        product_id:
          item.product_id,

        quantity:
          item.quantity,

        unit_price:
          item.price,

        total:
          item.price *
          item.quantity
      })
    );

  const {
    error:
      saleItemsError
  } = await supabase
    .from(
      "pos_sale_items"
    )
    .insert(items);

  if (
    saleItemsError
  )
    throw saleItemsError;

  const {
    error:
      paymentError
  } = await supabase
    .from(
      "pos_payments"
    )
    .insert({
      sale_id:
        sale.id,

      payment_method:
        input.payment_method,

      amount:
        input.total
    });

  if (paymentError)
    throw paymentError;

  await updateInventoryAfterSale(
  input.cart
);

return sale;
}