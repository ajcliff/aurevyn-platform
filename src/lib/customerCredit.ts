import { createClient } from "@/lib/supabase";
import { postReceivablePaymentJournal } from "@/lib/journal";
import { logActivity } from "@/lib/activity";
import type { Customer } from "@/lib/customers";

type Client = ReturnType<typeof createClient>;

export type CreditEntry = {
  id: string;
  org_id: string;
  customer_id: string;
  entry_type: "sale" | "payment";
  amount: number;
  sale_id: string | null;
  due_date: string | null;
  method: string | null;
  finance_account_id: string | null;
  reference: string | null;
  note: string | null;
  recorded_by: string | null;
  created_at: string;
};

export type CreditSummary = {
  customer: Customer;
  balance: number;
  overdue: number;
  available: number;
  oldestDue: string | null;
};

// Turns a database rejection into something a cashier can act on
export function creditErrorMessage(err: unknown): string {
  const msg = (err as { message?: string })?.message ?? "";
  if (msg.includes("CREDIT_LIMIT_EXCEEDED")) return "This sale would take the customer over their credit limit.";
  if (msg.includes("CREDIT_NOT_ENABLED")) return "This customer has no credit limit set. Set one on the Credit Customers page first.";
  if (msg.includes("OVERPAYMENT")) return "That payment is more than the customer owes.";
  return "Could not save. Try again.";
}

export async function getCreditBalance(customerId: string, client?: Client): Promise<number> {
  const supabase = client ?? createClient();
  const { data } = await supabase.from("customer_balances").select("balance").eq("customer_id", customerId).maybeSingle();
  return Number(data?.balance ?? 0);
}

export async function getLedger(customerId: string): Promise<CreditEntry[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("customer_credit_entries")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((e) => ({ ...e, amount: Number(e.amount) })) as CreditEntry[];
}

// Payments clear the oldest sales first; whatever is left past its due date is overdue
function ageEntries(entries: CreditEntry[]): { balance: number; overdue: number; oldestDue: string | null } {
  const sales = entries.filter((e) => e.entry_type === "sale").sort((a, b) => a.created_at.localeCompare(b.created_at));
  let paid = entries.filter((e) => e.entry_type === "payment").reduce((t, e) => t + e.amount, 0);
  const today = new Date().toISOString().slice(0, 10);
  let balance = 0;
  let overdue = 0;
  let oldestDue: string | null = null;
  for (const sale of sales) {
    const cleared = Math.min(sale.amount, paid);
    paid -= cleared;
    const open = sale.amount - cleared;
    if (open <= 0) continue;
    balance += open;
    if (sale.due_date && (!oldestDue || sale.due_date < oldestDue)) oldestDue = sale.due_date;
    if (sale.due_date && sale.due_date < today) overdue += open;
  }
  return { balance, overdue, oldestDue };
}

export async function getCreditSummaries(orgId: string): Promise<CreditSummary[]> {
  const supabase = createClient();
  const [{ data: customers, error }, { data: entries, error: entryError }] = await Promise.all([
    supabase.from("customers").select("*").eq("org_id", orgId).order("name"),
    supabase.from("customer_credit_entries").select("*").eq("org_id", orgId),
  ]);
  if (error) throw error;
  if (entryError) throw entryError;

  const byCustomer = new Map<string, CreditEntry[]>();
  for (const e of entries ?? []) {
    const list = byCustomer.get(e.customer_id) ?? [];
    list.push({ ...e, amount: Number(e.amount) } as CreditEntry);
    byCustomer.set(e.customer_id, list);
  }

  return (customers ?? [])
    .map((c) => {
      const { balance, overdue, oldestDue } = ageEntries(byCustomer.get(c.id) ?? []);
      const limit = Number(c.credit_limit ?? 0);
      return { customer: c as Customer, balance, overdue, oldestDue, available: Math.max(0, limit - balance) };
    })
    .filter((s) => Number(s.customer.credit_limit ?? 0) > 0 || s.balance > 0);
}

// Reserve the credit first: the database refuses it if it breaks the limit, so a
// sale is never created for credit the customer doesn't have. Link it to the sale
// afterwards, or cancel it if the sale fails.
export async function reserveCredit(
  input: { orgId: string; customerId: string; amount: number; termsDays: number; recordedBy?: string },
  client?: Client
): Promise<string> {
  const supabase = client ?? createClient();
  const due = new Date();
  due.setDate(due.getDate() + (input.termsDays || 30));
  const { data, error } = await supabase
    .from("customer_credit_entries")
    .insert({
      org_id: input.orgId,
      customer_id: input.customerId,
      entry_type: "sale",
      amount: input.amount,
      due_date: due.toISOString().slice(0, 10),
      recorded_by: input.recordedBy ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function linkCreditToSale(entryId: string, saleId: string, client?: Client) {
  const supabase = client ?? createClient();
  await supabase.from("customer_credit_entries").update({ sale_id: saleId }).eq("id", entryId);
}

export async function cancelCredit(entryId: string, client?: Client) {
  const supabase = client ?? createClient();
  await supabase.from("customer_credit_entries").delete().eq("id", entryId);
}

export async function receiveCreditPayment(input: {
  orgId: string;
  customer: Customer;
  amount: number;
  method: string;
  financeAccountId?: string;
  reference?: string;
  note?: string;
  recordedBy?: string;
}) {
  const supabase = createClient();
  const { error } = await supabase.from("customer_credit_entries").insert({
    org_id: input.orgId,
    customer_id: input.customer.id,
    entry_type: "payment",
    amount: input.amount,
    method: input.method,
    finance_account_id: input.financeAccountId || null,
    reference: input.reference?.trim() || null,
    note: input.note?.trim() || null,
    recorded_by: input.recordedBy ?? null,
  });
  if (error) throw error;

  await postReceivablePaymentJournal({
    orgId: input.orgId,
    customerId: input.customer.id!,
    customerName: input.customer.name,
    amount: input.amount,
    date: new Date().toISOString().slice(0, 10),
    financeAccountId: input.financeAccountId,
  });

  await logActivity({
    icon: "💰",
    title: "Credit payment received",
    sub: `${input.customer.name} — KES ${input.amount.toLocaleString()}`,
    org_id: input.orgId,
  });
}
