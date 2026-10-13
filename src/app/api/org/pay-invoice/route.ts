import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireOrgAdmin } from "@/lib/server/guards";
import { initializeTransaction, paystackConfigured } from "@/lib/server/paystack";

// An org owner/admin starts an online payment for one of their invoices.
// Returns the Paystack checkout address; the invoice is only marked paid by the
// verified webhook, never by this route.
export async function POST(req: NextRequest) {
  const { orgId, invoiceId } = await req.json();

  const access = orgId ? await requireOrgAdmin(orgId) : null;
  if (!access) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  if (!paystackConfigured()) return NextResponse.json({ error: "Online payment isn't set up yet. Use \"I've paid\" instead." }, { status: 503 });
  if (!access.userEmail) return NextResponse.json({ error: "Your account has no email address." }, { status: 400 });

  const { data: invoice } = await supabaseAdmin.from("invoices")
    .select("id, invoice_no, amount_kes, status").eq("id", invoiceId).eq("org_id", orgId).maybeSingle();
  if (!invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  if (invoice.status === "paid") return NextResponse.json({ error: "This invoice is already paid." }, { status: 400 });
  if (!(Number(invoice.amount_kes) > 0)) return NextResponse.json({ error: "This invoice has no amount to pay." }, { status: 400 });

  try {
    const { authorization_url } = await initializeTransaction({
      email: access.userEmail,
      amountKes: Number(invoice.amount_kes),
      reference: `${invoice.invoice_no}-${Date.now().toString(36)}`,
      callbackUrl: `${req.nextUrl.origin}/org/${orgId}/billing`,
      metadata: { invoice_id: invoice.id },
    });
    return NextResponse.json({ url: authorization_url });
  } catch (err) {
    console.error("pay-invoice failed:", err);
    return NextResponse.json({ error: "Could not start the payment. Try again, or use \"I've paid\"." }, { status: 502 });
  }
}
