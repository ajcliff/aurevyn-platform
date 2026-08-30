import { createClient } from "@/lib/supabase";
import { updateStock } from "@/lib/inventory";

const supabase = createClient();

export interface ReturnItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface ReturnRequest {
  orgId: string;
  saleId: string;
  reason: string;
  refundMethod: string;
  items: ReturnItem[];
}

export async function createReturn(
  request: ReturnRequest
) {
  const refundAmount =
    request.items.reduce(
      (sum, item) =>
        sum +
        item.quantity * item.unitPrice,
      0
    );

  const { data, error } =
    await supabase
      .from("pos_returns")
      .insert({
        org_id: request.orgId,
        sale_id: request.saleId,
        reason: request.reason,
        refund_method: request.refundMethod,
        refund_amount: refundAmount,
        status: "pending",
      })
      .select()
      .single();

  if (error) throw error;

  for (const item of request.items) {

    await supabase
      .from("pos_return_items")
      .insert({

        return_id: data.id,

        product_id: item.productId,

        product_name: item.productName,

        quantity: item.quantity,

        unit_price: item.unitPrice,

        total:
          item.quantity *
          item.unitPrice,

      });

  }

  return data;
}

export async function approveReturn(
    returnId: string
) {

    const { data: items } =
        await supabase
            .from("pos_return_items")
            .select("*")
            .eq("return_id", returnId);

    if (!items) return;

    for (const item of items) {

        await updateStock(

            item.product_id,

            -Number(item.quantity),

            "return",

            "Customer Return"

        );

    }

    await supabase
        .from("pos_returns")
        .update({

            status: "approved",

            inventory_processed: true

        })
        .eq("id", returnId);

}

export async function rejectReturn(
    returnId: string
) {

    await supabase

        .from("pos_returns")

        .update({

            status: "rejected"

        })

        .eq("id", returnId);

}

export async function getReturns(
  orgId: string
) {
  const { data, error } =
    await supabase
      .from("pos_returns")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", {
        ascending: false,
      });

  if (error) throw error;

  return data ?? [];
}