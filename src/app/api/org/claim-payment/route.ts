import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireOrgAdmin } from "@/lib/server/guards";

const METHODS = ["M-Pesa", "Bank transfer", "Cash", "Cheque", "Other"];

// An org owner/admin tells AUREVYN "I've paid this invoice" with their payment reference.
// It does NOT mark the invoice paid: the founder confirms and issues the receipt.
export async function POST(req: NextRequest) {
  const { orgId, invoiceId, method, reference } = await req.json();

  const access = orgId ? await requireOrgAdmin(orgId) : null;
  if (!access) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  if (!METHODS.includes(method)) return NextResponse.json({ error: "Choose a payment method." }, { status: 400 });
  if (!reference?.trim()) return NextResponse.json({ error: "Enter your payment reference (e.g. the M-Pesa code)." }, { status: 400 });

  const { data, error } = await supabaseAdmin.from("invoices")
    .update({ claim_method: method, claim_reference: reference.trim().slice(0, 120), claimed_at: new Date().toISOString() })
    .eq("id", invoiceId).eq("org_id", orgId).neq("status", "paid")
    .select("invoice_no, org_name").maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Invoice not found or already paid." }, { status: 404 });

  // Best-effort alert for the founder; the claim itself is already saved
  await supabaseAdmin.from("notifications").insert({
    type: "payment_claim",
    title: "Payment claimed",
    message: `${data.org_name} says ${data.invoice_no} is paid via ${method} (${reference.trim()}). Confirm and issue a receipt in Billing.`,
    read: false,
  });

  return NextResponse.json({ ok: true });
}
