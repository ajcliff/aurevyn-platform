import { createClient } from "./supabase";
import type { FinanceTransaction } from "./finance";

type SupabaseClientType = ReturnType<typeof createClient>;

// Finds a Chart of Accounts row by code, creating it if this org doesn't have
// one yet. Used for the catch-all accounts a transaction posts against when
// it has no specific Bankers/Cash account or Chart of Accounts category
// selected — a journal line always needs an account on both sides.
async function getOrCreateDefaultAccount(
  supabase: SupabaseClientType,
  orgId: string,
  code: string,
  name: string,
  accountType: string
): Promise<string> {
  const { data: existing } = await supabase
    .from("chart_of_accounts")
    .select("id")
    .eq("org_id", orgId)
    .eq("code", code)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("chart_of_accounts")
    .insert({ org_id: orgId, code, name, account_type: accountType, is_active: true })
    .select("id")
    .single();
  if (error) throw error;
  return created.id;
}

// finance_accounts (Bankers/Cash in Hand) are a separate table from the
// Chart of Accounts. This lazily links each one to a matching asset-type
// Chart of Accounts row the first time it's needed for posting, so every
// bank/cash/mobile-money account gets its own asset line over time instead
// of everything piling into one bucket.
async function getAssetAccountId(
  supabase: SupabaseClientType,
  orgId: string,
  financeAccountId: string | null
): Promise<string> {
  if (!financeAccountId) {
    return getOrCreateDefaultAccount(supabase, orgId, "1000", "Unspecified Cash", "asset");
  }

  const { data: acc, error } = await supabase
    .from("finance_accounts")
    .select("id, name, coa_id")
    .eq("id", financeAccountId)
    .maybeSingle();

  if (error || !acc) {
    return getOrCreateDefaultAccount(supabase, orgId, "1000", "Unspecified Cash", "asset");
  }
  if (acc.coa_id) return acc.coa_id;

  const code = `1${acc.id.replace(/-/g, "").slice(0, 4)}`;
  const coaId = await getOrCreateDefaultAccount(supabase, orgId, code, acc.name, "asset");
  await supabase.from("finance_accounts").update({ coa_id: coaId }).eq("id", financeAccountId);
  return coaId;
}

// Posts a finance_transaction (income or expense) as a balanced two-line
// journal entry: the money side (a Bankers/Cash asset account) against the
// category side (the transaction's Chart of Accounts tag, or a catch-all
// Uncategorized Income/Expense account if none was picked).
//
// Scope note: this covers finance_transactions only. finance_expenses,
// POS sales, and purchase-order receipts are not yet posting to the
// ledger — each would need its own account mapping (COGS, inventory,
// payables) designed separately before wiring in.
export async function postTransactionJournal(tx: FinanceTransaction): Promise<void> {
  if (tx.type !== "income" && tx.type !== "expense") return;

  const supabase = createClient();

  const assetAccountId = await getAssetAccountId(supabase, tx.org_id, tx.account_id);
  const categoryAccountId = tx.coa_id
    ? tx.coa_id
    : await getOrCreateDefaultAccount(
        supabase,
        tx.org_id,
        tx.type === "income" ? "4999" : "5999",
        tx.type === "income" ? "Uncategorized Income" : "Uncategorized Expense",
        tx.type
      );

  const { data: entry, error } = await supabase
    .from("journal_entries")
    .insert({
      org_id: tx.org_id,
      source_type: "finance_transaction",
      source_id: tx.id,
      description: tx.description,
      date: tx.date,
    })
    .select()
    .single();
  if (error) throw error;

  const amount = Number(tx.amount);
  const lines =
    tx.type === "income"
      ? [
          { entry_id: entry.id, org_id: tx.org_id, coa_id: assetAccountId, debit: amount, credit: 0 },
          { entry_id: entry.id, org_id: tx.org_id, coa_id: categoryAccountId, debit: 0, credit: amount },
        ]
      : [
          { entry_id: entry.id, org_id: tx.org_id, coa_id: categoryAccountId, debit: amount, credit: 0 },
          { entry_id: entry.id, org_id: tx.org_id, coa_id: assetAccountId, debit: 0, credit: amount },
        ];

  const { error: lineError } = await supabase.from("journal_lines").insert(lines);
  if (lineError) throw lineError;
}

// Removes the journal entry (and its lines, via cascade) previously posted
// for a given source row. Called before deleting/updating the source so a
// stale or duplicate journal entry never survives it.
export async function reverseJournalFor(sourceType: string, sourceId: string): Promise<void> {
  const supabase = createClient();
  const { data: entries, error } = await supabase
    .from("journal_entries")
    .select("id")
    .eq("source_type", sourceType)
    .eq("source_id", sourceId);
  if (error) throw error;
  if (!entries || entries.length === 0) return;

  const { error: delError } = await supabase
    .from("journal_entries")
    .delete()
    .in("id", entries.map((e) => e.id));
  if (delError) throw delError;
}

export async function repostTransactionJournal(tx: FinanceTransaction): Promise<void> {
  await reverseJournalFor("finance_transaction", tx.id);
  await postTransactionJournal(tx);
}

// Posts a finance_expense as a two-line journal entry: the expense category
// (debit) against the generic "Unspecified Cash" asset account (credit) —
// finance_expenses has no finance_accounts link the way finance_transactions
// does, so there's no specific bank/cash account to post the credit side to.
export async function postExpenseJournal(expense: {
  id: string;
  org_id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
}): Promise<void> {
  const supabase = createClient();

  const assetAccountId = await getOrCreateDefaultAccount(supabase, expense.org_id, "1000", "Unspecified Cash", "asset");
  const code = `5${expense.category.replace(/[^a-z0-9]/gi, "").slice(0, 3).toUpperCase()}`;
  const categoryAccountId = await getOrCreateDefaultAccount(
    supabase,
    expense.org_id,
    code,
    `Expense - ${expense.category}`,
    "expense"
  );

  const { data: entry, error } = await supabase
    .from("journal_entries")
    .insert({
      org_id: expense.org_id,
      source_type: "finance_expense",
      source_id: expense.id,
      description: expense.title,
      date: expense.date,
    })
    .select()
    .single();
  if (error) throw error;

  const amount = Number(expense.amount);
  const { error: lineError } = await supabase.from("journal_lines").insert([
    { entry_id: entry.id, org_id: expense.org_id, coa_id: categoryAccountId, debit: amount, credit: 0 },
    { entry_id: entry.id, org_id: expense.org_id, coa_id: assetAccountId, debit: 0, credit: amount },
  ]);
  if (lineError) throw lineError;
}

export async function repostExpenseJournal(expense: {
  id: string;
  org_id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
}): Promise<void> {
  await reverseJournalFor("finance_expense", expense.id);
  await postExpenseJournal(expense);
}

// Posts a POS sale: cash/asset received (debit) against Sales Revenue and,
// if the sale carries VAT, VAT Payable (credit, split from the revenue
// portion). Does not yet post COGS/inventory reduction — see scope note
// at the top of the file inherited from the original journal design.
export async function postSaleJournal(sale: {
  id: string;
  org_id: string;
  total: number;
  tax_amount?: number;
  created_at?: string;
}): Promise<void> {
  const supabase = createClient();

  const assetAccountId = await getOrCreateDefaultAccount(supabase, sale.org_id, "1000", "Unspecified Cash", "asset");
  const revenueAccountId = await getOrCreateDefaultAccount(supabase, sale.org_id, "4000", "Sales Revenue", "income");

  const total = Number(sale.total);
  const tax = Number(sale.tax_amount || 0);
  const net = total - tax;
  const date = (sale.created_at || new Date().toISOString()).slice(0, 10);

  const { data: entry, error } = await supabase
    .from("journal_entries")
    .insert({
      org_id: sale.org_id,
      source_type: "pos_sale",
      source_id: sale.id,
      description: "POS sale",
      date,
    })
    .select()
    .single();
  if (error) throw error;

  const lines = [{ entry_id: entry.id, org_id: sale.org_id, coa_id: assetAccountId, debit: total, credit: 0 }];
  lines.push({ entry_id: entry.id, org_id: sale.org_id, coa_id: revenueAccountId, debit: 0, credit: net });
  if (tax > 0) {
    const vatPayableId = await getOrCreateDefaultAccount(supabase, sale.org_id, "2100", "VAT Payable", "liability");
    lines.push({ entry_id: entry.id, org_id: sale.org_id, coa_id: vatPayableId, debit: 0, credit: tax });
  }

  const { error: lineError } = await supabase.from("journal_lines").insert(lines);
  if (lineError) throw lineError;
}

// Posts the value of goods received against a purchase order: Inventory
// asset (debit) against Accounts Payable (credit) for the received value.
// Called per-receipt, so partial receipts post their own partial entry.
export async function postPurchaseReceiptJournal(input: {
  orgId: string;
  poId: string;
  poNumber: string;
  receivedValue: number;
  date: string;
}): Promise<void> {
  if (input.receivedValue <= 0) return;
  const supabase = createClient();

  const inventoryAccountId = await getOrCreateDefaultAccount(supabase, input.orgId, "1200", "Inventory", "asset");
  const apAccountId = await getOrCreateDefaultAccount(supabase, input.orgId, "2000", "Accounts Payable", "liability");

  const { data: entry, error } = await supabase
    .from("journal_entries")
    .insert({
      org_id: input.orgId,
      source_type: "purchase_order_receipt",
      source_id: input.poId,
      description: `Goods received - ${input.poNumber}`,
      date: input.date,
    })
    .select()
    .single();
  if (error) throw error;

  const { error: lineError } = await supabase.from("journal_lines").insert([
    { entry_id: entry.id, org_id: input.orgId, coa_id: inventoryAccountId, debit: input.receivedValue, credit: 0 },
    { entry_id: entry.id, org_id: input.orgId, coa_id: apAccountId, debit: 0, credit: input.receivedValue },
  ]);
  if (lineError) throw lineError;
}
