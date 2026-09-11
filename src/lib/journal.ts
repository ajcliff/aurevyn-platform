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
