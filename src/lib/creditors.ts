import { createClient } from "./supabase";
import { getPurchaseOrders, type PurchaseOrder } from "./purchaseOrders";
import { recordPayment, type PaymentDetailsInput, type Payment } from "./payments";

export type PayableOrder = PurchaseOrder & {
  amount_paid: number;
  amount_owed: number;
};

// A PO owes money once it's actually been ordered/received — a draft/cancelled
// PO never becomes a payable.
const PAYABLE_STATUSES = new Set(["ordered", "partially_received", "received"]);

export async function getPayables(orgId: string): Promise<PayableOrder[]> {
  const supabase = createClient();
  const orders = await getPurchaseOrders(orgId);
  const payable = orders.filter((po) => PAYABLE_STATUSES.has(po.status));
  if (payable.length === 0) return [];

  const { data: payments, error } = await supabase
    .from("payments")
    .select("source_id, amount, status")
    .eq("org_id", orgId)
    .eq("source_type", "purchase_order")
    .in("status", ["completed", "cleared"]);

  if (error) {
    console.error(error);
    return [];
  }

  const paidByPo = new Map<string, number>();
  (payments || []).forEach((p) => {
    paidByPo.set(p.source_id, (paidByPo.get(p.source_id) || 0) + Number(p.amount));
  });

  return payable.map((po) => {
    const amount_paid = paidByPo.get(po.id) || 0;
    return { ...po, amount_paid, amount_owed: Number(po.total_cost) - amount_paid };
  });
}

export type PayableAgingBucket = { label: string; amount: number };

export function getPayablesAgingBuckets(payables: PayableOrder[]): PayableAgingBucket[] {
  const now = new Date();
  const buckets = { current: 0, d30: 0, d60: 0, d90: 0, noDueDate: 0 };

  payables.forEach((po) => {
    const owed = po.amount_owed;
    if (owed <= 0) return;

    if (!po.due_date) {
      buckets.noDueDate += owed;
      return;
    }

    const days = Math.floor((now.getTime() - new Date(po.due_date).getTime()) / 86400000);
    if (days <= 0) buckets.current += owed;
    else if (days <= 30) buckets.d30 += owed;
    else if (days <= 60) buckets.d60 += owed;
    else buckets.d90 += owed;
  });

  return [
    { label: "Current", amount: buckets.current },
    { label: "1-30 days", amount: buckets.d30 },
    { label: "31-60 days", amount: buckets.d60 },
    { label: "60+ days", amount: buckets.d90 },
    { label: "No due date set", amount: buckets.noDueDate },
  ];
}

export async function recordSupplierPayment(input: {
  orgId: string;
  poId: string;
  details: PaymentDetailsInput;
  recordedByName?: string;
}): Promise<Payment | null> {
  return recordPayment({
    orgId: input.orgId,
    sourceType: "purchase_order",
    sourceId: input.poId,
    details: input.details,
    recordedByName: input.recordedByName,
  });
}
