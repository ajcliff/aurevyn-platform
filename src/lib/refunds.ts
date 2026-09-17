import { createClient } from "@/lib/supabase";
import { recordPayment, type PaymentMethod } from "@/lib/payments";
import { postRefundJournal } from "@/lib/journal";

// Records a refund against a customer return. Previously this wrote to a
// standalone `pos_payments` table (no org_id, disconnected from every
// financial report — cash position, P&L, VAT, Balance Sheet never saw it),
// and mistakenly stored the return's own id in place of the original sale's
// id. This now goes through the same `payments` table and double-entry
// ledger as every other payment in the app, as a negative amount against
// the return itself.
export async function createRefund(
  returnId: string,
  amount: number,
  method: string
) {
  const supabase = createClient();

  const { data: returnRecord, error: fetchError } = await supabase
    .from("pos_returns")
    .select("org_id")
    .eq("id", returnId)
    .single();
  if (fetchError) throw fetchError;

  await recordPayment({
    orgId: returnRecord.org_id,
    sourceType: "pos_return",
    sourceId: returnId,
    details: {
      method: method as PaymentMethod,
      amount: -Math.abs(amount),
    },
  });

  await postRefundJournal({
    orgId: returnRecord.org_id,
    returnId,
    amount: Math.abs(amount),
    date: new Date().toISOString().slice(0, 10),
  });
}
