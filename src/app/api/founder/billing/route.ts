import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireFounder } from "@/lib/server/guards";

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });
const METHODS = ["M-Pesa", "Bank transfer", "Cash", "Cheque", "Other"];

// "KES 8,000" / "8000" / "8,000.50" → 8000 / 8000 / 8000.5
function parseAmount(raw: unknown): number {
  const n = parseFloat(String(raw ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export async function POST(req: NextRequest) {
  if (!(await requireFounder())) return fail("Not allowed.", 403);
  const body = await req.json();

  if (body.action === "create_invoice") {
    const amount = parseAmount(body.amount);
    if (!body.orgId) return fail("Choose an organization.");
    if (amount <= 0) return fail("Enter an amount greater than 0.");
    const { data: org } = await supabaseAdmin.from("organizations").select("id, name").eq("id", body.orgId).maybeSingle();
    if (!org) return fail("Organization not found.");

    const { data, error } = await supabaseAdmin.from("invoices").insert({
      org_id: org.id,
      org_name: org.name,
      amount: `KES ${Math.round(amount).toLocaleString("en-KE")}`,
      amount_kes: amount,
      status: "pending",
      due_date: body.dueDate || null,
      description: body.description?.trim() || null,
    }).select().single();
    if (error) return fail(error.message, 500);
    return NextResponse.json({ invoice: data });
  }

  if (body.action === "run_subscription_billing") {
    const { data, error } = await supabaseAdmin.rpc("generate_subscription_invoices");
    if (error) return fail(error.message, 500);
    return NextResponse.json({ created: data ?? 0 });
  }

  if (body.action === "mark_overdue") {
    const { data, error } = await supabaseAdmin.from("invoices")
      .update({ status: "overdue" }).eq("id", body.invoiceId).eq("status", "pending").select().maybeSingle();
    if (error) return fail(error.message, 500);
    if (!data) return fail("Only pending invoices can be marked overdue.");
    return NextResponse.json({ invoice: data });
  }

  if (body.action === "record_payment") {
    if (!METHODS.includes(body.method)) return fail("Choose a payment method.");
    const { data: invoice } = await supabaseAdmin.from("invoices").select("*").eq("id", body.invoiceId).maybeSingle();
    if (!invoice) return fail("Invoice not found.");
    if (invoice.status === "paid") return fail("This invoice is already paid.");

    const paidAt = new Date();
    const { data: receipt, error: receiptError } = await supabaseAdmin.from("receipts").insert({
      invoice_id: invoice.id,
      org_id: invoice.org_id,
      amount_kes: invoice.amount_kes,
      method: body.method,
      reference: body.reference?.trim() || null,
      paid_at: paidAt.toISOString(),
    }).select().single();
    if (receiptError) return fail(receiptError.message, 500);

    const { data: updated, error: invoiceError } = await supabaseAdmin.from("invoices")
      .update({ status: "paid", paid_date: paidAt.toISOString().split("T")[0] }).eq("id", invoice.id).select().single();
    if (invoiceError) {
      // Never leave a receipt for an invoice that still says unpaid
      await supabaseAdmin.from("receipts").delete().eq("id", receipt.id);
      return fail(invoiceError.message, 500);
    }
    return NextResponse.json({ invoice: updated, receipt });
  }

  return fail("Unknown action.");
}
