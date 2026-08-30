import { createClient } from "./supabase";
import { logActivity } from "@/lib/activity";
import { createTransaction } from "@/lib/finance";
import { recordPayment, methodLabel, type PaymentDetailsInput } from "@/lib/payments";

export type OrgInvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled";

export type OrgInvoice = {
  id: string;
  org_id: string;
  customer_id: string | null;
  invoice_number: string;
  status: OrgInvoiceStatus;
  issue_date: string;
  due_date: string;
  subtotal: number;
  vat_rate: number;
  vat_amount: number;
  wht_rate: number;
  wht_amount: number;
  total: number;
  notes: string | null;
  finance_transaction_id: string | null;
  created_at: string;
  customers?: { name: string } | null;
};

export type OrgInvoiceItem = {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  created_at: string;
};

export type OrgInvoiceWithItems = OrgInvoice & {
  items: OrgInvoiceItem[];
};

export type InvoiceItemInput = {
  description: string;
  quantity: number;
  unit_price: number;
};

export async function getInvoices(orgId: string): Promise<OrgInvoice[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("org_invoices")
    .select("*, customers(name)")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }
  return data as OrgInvoice[];
}

// Invoices sent to a customer but not yet paid/cancelled — used for the
// Overview receivables widget. "Overdue" isn't a separately-set status in
// this schema, so it's computed here from due_date vs. today.
export async function getOutstandingInvoices(orgId: string): Promise<OrgInvoice[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("org_invoices")
    .select("*, customers(name)")
    .eq("org_id", orgId)
    .eq("status", "sent")
    .order("due_date", { ascending: true });

  if (error) {
    console.error(error);
    return [];
  }
  return data as OrgInvoice[];
}

export async function getInvoicesForCustomer(orgId: string, customerId: string): Promise<OrgInvoice[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("org_invoices")
    .select("*, customers(name)")
    .eq("org_id", orgId)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }
  return data as OrgInvoice[];
}

export async function getInvoice(id: string): Promise<OrgInvoiceWithItems | null> {  const supabase = createClient();

  const { data: invoice, error } = await supabase
    .from("org_invoices")
    .select("*, customers(name)")
    .eq("id", id)
    .single();

  if (error || !invoice) {
    console.error(error);
    return null;
  }

  const { data: items, error: itemsError } = await supabase
    .from("org_invoice_items")
    .select("*")
    .eq("invoice_id", id)
    .order("created_at");

  if (itemsError) {
    console.error(itemsError);
    return null;
  }

  return { ...(invoice as OrgInvoice), items: items as OrgInvoiceItem[] };
}

async function generateInvoiceNumber(orgId: string): Promise<string> {
  const supabase = createClient();
  const { count, error } = await supabase
    .from("org_invoices")
    .select("*", { count: "exact", head: true })
    .eq("org_id", orgId);

  if (error) {
    console.error(error);
  }

  const { data: settings } = await supabase
    .from("org_settings")
    .select("invoice_prefix")
    .eq("org_id", orgId)
    .maybeSingle();

  const prefix = settings?.invoice_prefix || "INV-";
  const next = (count || 0) + 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}

export async function createInvoice(input: {
  orgId: string;
  customerId: string | null;
  dueDate: string;
  vatRate: number;
  whtRate?: number;
  notes?: string;
  items: InvoiceItemInput[];
}): Promise<OrgInvoiceWithItems | null> {
  const supabase = createClient();

  const subtotal = input.items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);
  const vat_amount = subtotal * (input.vatRate / 100);
  const wht_amount = subtotal * ((input.whtRate || 0) / 100);
  const total = subtotal + vat_amount;

  const invoice_number = await generateInvoiceNumber(input.orgId);

  const { data: invoice, error } = await supabase
    .from("org_invoices")
    .insert({
      org_id: input.orgId,
      customer_id: input.customerId,
      invoice_number,
      status: "draft",
      issue_date: new Date().toISOString().slice(0, 10),
      due_date: input.dueDate,
      subtotal,
      vat_rate: input.vatRate,
      vat_amount,
      wht_rate: input.whtRate || 0,
      wht_amount,
      total,
      notes: input.notes || null,
    })
    .select()
    .single();

  if (error || !invoice) {
    console.error(error);
    return null;
  }

  const itemRows = input.items.map((i) => ({
    invoice_id: invoice.id,
    description: i.description,
    quantity: i.quantity,
    unit_price: i.unit_price,
    total: i.quantity * i.unit_price,
  }));

  const { data: items, error: itemsError } = await supabase
    .from("org_invoice_items")
    .insert(itemRows)
    .select();

  if (itemsError) {
    console.error(itemsError);
    return null;
  }

  await logActivity({
    icon: "🧾",
    title: "Invoice created",
    sub: `${invoice_number} — KES ${total.toLocaleString()}`,
    org_id: input.orgId,
  });

  return { ...(invoice as OrgInvoice), items: items as OrgInvoiceItem[] };
}

export async function updateInvoiceStatus(
  id: string,
  orgId: string,
  status: "sent" | "cancelled"
): Promise<OrgInvoice | null> {
  const supabase = createClient();

  const { data: existing, error: fetchError } = await supabase
    .from("org_invoices")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !existing) {
    console.error(fetchError);
    return null;
  }

  const { data, error } = await supabase
    .from("org_invoices")
    .update({ status })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error(error);
    return null;
  }

  await logActivity({
    icon: "🧾",
    title: `Invoice ${status}`,
    sub: existing.invoice_number,
    org_id: orgId,
  });

  return data as OrgInvoice;
}

// Marking an invoice paid requires real payment details — creates a linked
// income transaction in Finance and a payments-ledger entry, once only.
export async function markInvoicePaid(
  id: string,
  orgId: string,
  paymentDetails: PaymentDetailsInput
): Promise<OrgInvoice | null> {
  const supabase = createClient();

  const { data: existing, error: fetchError } = await supabase
    .from("org_invoices")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !existing) {
    console.error(fetchError);
    return null;
  }

  let finance_transaction_id = existing.finance_transaction_id;

  if (!finance_transaction_id) {
    const reference =
      paymentDetails.mpesaCode ||
      paymentDetails.bankReference ||
      paymentDetails.chequeNumber ||
      (paymentDetails.cardLast4 ? `Card ending ${paymentDetails.cardLast4}` : existing.invoice_number);

    const tx = await createTransaction({
      org_id: orgId,
      account_id: null,
      type: "income",
      amount: existing.total,
      currency: "KES",
      description: `Invoice ${existing.invoice_number}`,
      category: "sales",
      reference,
      payment_method: methodLabel(paymentDetails.method),
      status: "completed",
      date: new Date().toISOString().slice(0, 10),
    });

    if (tx) {
      finance_transaction_id = tx.id;

      await recordPayment({
        orgId,
        sourceType: "invoice",
        sourceId: id,
        details: { ...paymentDetails, amount: existing.total },
      });
    }
  }

  const { data, error } = await supabase
    .from("org_invoices")
    .update({ status: "paid", finance_transaction_id })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error(error);
    return null;
  }

  await logActivity({
    icon: "✅",
    title: "Invoice paid",
    sub: existing.invoice_number,
    org_id: orgId,
  });

  return data as OrgInvoice;
}

export async function deleteInvoice(id: string, invoiceNumber: string, orgId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("org_invoices").delete().eq("id", id);
  if (error) {
    console.error(error);
    return;
  }

  await logActivity({
    icon: "🗑️",
    title: "Invoice deleted",
    sub: invoiceNumber,
    org_id: orgId,
  });
}