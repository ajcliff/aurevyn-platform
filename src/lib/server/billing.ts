import { supabaseAdmin } from "@/lib/supabase/server";

// Marks an invoice paid and issues its receipt. Safe to call twice for the same
// invoice (webhook retries): the second call finds it already paid and does nothing.
export async function settleInvoice(
  invoiceId: string,
  method: string,
  reference: string
): Promise<"paid" | "already_paid" | "not_found" | "error"> {
  const { data: invoice } = await supabaseAdmin.from("invoices").select("*").eq("id", invoiceId).maybeSingle();
  if (!invoice) return "not_found";
  if (invoice.status === "paid") return "already_paid";

  const paidAt = new Date();
  const { data: receipt, error: receiptError } = await supabaseAdmin.from("receipts").insert({
    invoice_id: invoice.id,
    org_id: invoice.org_id,
    amount_kes: invoice.amount_kes,
    method,
    reference,
    paid_at: paidAt.toISOString(),
  }).select().single();

  // receipts.invoice_id is unique: a concurrent delivery already issued this receipt
  if (receiptError?.code === "23505") return "already_paid";
  if (receiptError || !receipt) return "error";

  const { error: invoiceError } = await supabaseAdmin.from("invoices")
    .update({ status: "paid", paid_date: paidAt.toISOString().split("T")[0] })
    .eq("id", invoice.id);
  if (invoiceError) {
    // Never leave a receipt for an invoice that still says unpaid
    await supabaseAdmin.from("receipts").delete().eq("id", receipt.id);
    return "error";
  }

  // Best-effort alert for the founder; the payment itself is already recorded
  await supabaseAdmin.from("notifications").insert({
    type: "payment_received",
    title: "Payment received",
    message: `${invoice.org_name} paid ${invoice.invoice_no} (KES ${Number(invoice.amount_kes).toLocaleString("en-KE")}) online. Receipt issued automatically.`,
    read: false,
  });

  return "paid";
}
