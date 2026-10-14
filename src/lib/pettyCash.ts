import { createClient } from "@/lib/supabase";
import { createAccount, type FinanceAccount } from "@/lib/finance";
import { getOrCreateDefaultAccount, getAssetAccountId, getCashPosition } from "@/lib/journal";
import { logActivity } from "@/lib/activity";

// A petty cash float is an ordinary cash finance account tagged category "Petty Cash",
// so it shows in Cash in Hand and in every account picker, and its balance comes from the ledger.
export const PETTY_CASH_CATEGORY = "Petty Cash";

export const PETTY_CATEGORIES = ["transport", "meals", "airtime", "supplies", "utilities", "maintenance", "other"] as const;

export type PettyEntry = {
  id: string;
  org_id: string;
  float_id: string;
  entry_type: "topup" | "spend";
  amount: number;
  category: string | null;
  payee: string | null;
  description: string | null;
  receipt_ref: string | null;
  source_account_id: string | null;
  recorded_by: string | null;
  created_at: string;
};

export async function getPettyFloats(orgId: string): Promise<FinanceAccount[]> {
  const { data, error } = await createClient()
    .from("finance_accounts")
    .select("*")
    .eq("org_id", orgId)
    .eq("category", PETTY_CASH_CATEGORY)
    .eq("status", "active")
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as FinanceAccount[];
}

export async function createPettyFloat(orgId: string, name: string) {
  return createAccount({ org_id: orgId, name: name.trim(), type: "cash", category: PETTY_CASH_CATEGORY, balance: 0, currency: "KES", status: "active" });
}

export async function getPettyEntries(floatId: string): Promise<PettyEntry[]> {
  const { data, error } = await createClient()
    .from("petty_cash_entries")
    .select("*")
    .eq("float_id", floatId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((e) => ({ ...e, amount: Number(e.amount) })) as PettyEntry[];
}

export async function getFloatBalance(orgId: string, floatId: string): Promise<number> {
  const pos = await getCashPosition(orgId);
  return pos.byAccountId[floatId] ?? 0;
}

async function postJournal(input: {
  orgId: string; entryId: string; sourceType: string; description: string; amount: number;
  debitCoa: string; creditCoa: string;
}) {
  const supabase = createClient();
  const { data: entry, error } = await supabase
    .from("journal_entries")
    .insert({
      org_id: input.orgId,
      source_type: input.sourceType,
      source_id: input.entryId,
      description: input.description,
      date: new Date().toISOString().slice(0, 10),
    })
    .select()
    .single();
  if (error) throw error;
  const { error: lineError } = await supabase.from("journal_lines").insert([
    { entry_id: entry.id, org_id: input.orgId, coa_id: input.debitCoa, debit: input.amount, credit: 0 },
    { entry_id: entry.id, org_id: input.orgId, coa_id: input.creditCoa, debit: 0, credit: input.amount },
  ]);
  if (lineError) throw lineError;
}

async function saveEntry(row: Record<string, unknown>): Promise<string> {
  const { data, error } = await createClient().from("petty_cash_entries").insert(row).select("id").single();
  if (error) throw error;
  return data.id as string;
}

async function dropEntry(id: string) {
  await createClient().from("petty_cash_entries").delete().eq("id", id);
}

// Move money from a bank / M-Pesa / cash account into the float
export async function topUpFloat(input: { orgId: string; floatId: string; sourceAccountId: string; amount: number; note?: string; recordedBy?: string }) {
  const supabase = createClient();
  const entryId = await saveEntry({
    org_id: input.orgId, float_id: input.floatId, entry_type: "topup", amount: input.amount,
    description: input.note?.trim() || "Float top-up", source_account_id: input.sourceAccountId, recorded_by: input.recordedBy ?? null,
  });
  try {
    const floatCoa = await getAssetAccountId(supabase, input.orgId, input.floatId);
    const sourceCoa = await getAssetAccountId(supabase, input.orgId, input.sourceAccountId);
    await postJournal({
      orgId: input.orgId, entryId, sourceType: "petty_cash_topup", description: "Petty cash top-up",
      amount: input.amount, debitCoa: floatCoa, creditCoa: sourceCoa,
    });
  } catch (err) {
    await dropEntry(entryId);
    throw err;
  }
  await logActivity({ icon: "👛", title: "Petty cash topped up", sub: `KES ${input.amount.toLocaleString()}`, org_id: input.orgId });
}

// Pay for something out of the float. Refused if the float doesn't hold enough cash.
export async function spendFromFloat(input: {
  orgId: string; floatId: string; amount: number; category: string; payee?: string; description: string; receiptRef?: string; recordedBy?: string;
}) {
  const balance = await getFloatBalance(input.orgId, input.floatId);
  if (input.amount > balance) {
    throw new Error(`INSUFFICIENT_FLOAT: only KES ${balance.toLocaleString()} left in this float`);
  }
  const supabase = createClient();
  const entryId = await saveEntry({
    org_id: input.orgId, float_id: input.floatId, entry_type: "spend", amount: input.amount, category: input.category,
    payee: input.payee?.trim() || null, description: input.description.trim(), receipt_ref: input.receiptRef?.trim() || null,
    recorded_by: input.recordedBy ?? null,
  });
  try {
    const floatCoa = await getAssetAccountId(supabase, input.orgId, input.floatId);
    const code = `5${input.category.replace(/[^a-z0-9]/gi, "").slice(0, 3).toUpperCase()}`;
    const expenseCoa = await getOrCreateDefaultAccount(supabase, input.orgId, code, `Expense - ${input.category}`, "expense");
    await postJournal({
      orgId: input.orgId, entryId, sourceType: "petty_cash_spend", description: input.description.trim(),
      amount: input.amount, debitCoa: expenseCoa, creditCoa: floatCoa,
    });
  } catch (err) {
    await dropEntry(entryId);
    throw err;
  }
  await logActivity({ icon: "👛", title: "Petty cash spent", sub: `${input.description.trim()} — KES ${input.amount.toLocaleString()}`, org_id: input.orgId });
}
