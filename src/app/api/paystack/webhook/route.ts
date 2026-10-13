import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { settleInvoice } from "@/lib/server/billing";
import { receiptMethod, validSignature, verifyTransaction } from "@/lib/server/paystack";

// Paystack calls this after a payment. Nothing is trusted from the request itself:
// the signature must match, and the payment is re-checked with Paystack before the
// invoice is marked paid and the receipt issued.
export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!validSignature(raw, req.headers.get("x-paystack-signature"))) {
    return NextResponse.json({ error: "Bad signature." }, { status: 401 });
  }

  let event: { event?: string; data?: { reference?: string } };
  try { event = JSON.parse(raw); } catch { return NextResponse.json({ error: "Bad body." }, { status: 400 }); }

  // Other events are acknowledged and ignored so Paystack stops retrying them
  if (event.event !== "charge.success" || !event.data?.reference) return NextResponse.json({ ok: true });

  try {
    const tx = await verifyTransaction(event.data.reference);
    const invoiceId = tx.metadata?.invoice_id;
    if (tx.status !== "success" || !invoiceId) return NextResponse.json({ ok: true });

    const { data: invoice } = await supabaseAdmin.from("invoices").select("amount_kes").eq("id", invoiceId).maybeSingle();
    if (!invoice) return NextResponse.json({ ok: true });
    if (tx.currency !== "KES" || tx.amount < Math.round(Number(invoice.amount_kes) * 100)) {
      console.error("Paystack payment doesn't match invoice", tx.reference, tx.amount, tx.currency);
      return NextResponse.json({ ok: true });
    }

    const result = await settleInvoice(invoiceId, receiptMethod(tx.channel), `Paystack ${tx.reference}`);
    // A real failure returns 500 so Paystack retries the delivery
    if (result === "error") return NextResponse.json({ error: "Could not record payment." }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Paystack webhook failed:", err);
    return NextResponse.json({ error: "Could not verify payment." }, { status: 500 });
  }
}
