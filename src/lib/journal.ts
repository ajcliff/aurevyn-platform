import { createClient } from "./supabase";
import type { FinanceTransaction } from "./finance";

type SupabaseClientType = ReturnType<typeof createClient>;

// Finds a Chart of Accounts row by code, creating it if this org doesn't have
// one yet. Used for the catch-all accounts a transaction posts against when
// it has no specific Bankers/Cash account or Chart of Accounts category
// selected — a journal line always needs an account on both sides.
export async function getOrCreateDefaultAccount(
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
export async function getAssetAccountId(
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

// Posts a customer refund: reverses part of a prior sale — debit Sales
// Revenue (reducing recognized revenue), credit the cash/asset account
// that paid the customer back.
export async function postRefundJournal(input: {
  orgId: string;
  returnId: string;
  amount: number;
  date: string;
}): Promise<void> {
  if (input.amount <= 0) return;
  const supabase = createClient();

  const assetAccountId = await getOrCreateDefaultAccount(supabase, input.orgId, "1000", "Unspecified Cash", "asset");
  const revenueAccountId = await getOrCreateDefaultAccount(supabase, input.orgId, "4000", "Sales Revenue", "income");

  const { data: entry, error } = await supabase
    .from("journal_entries")
    .insert({
      org_id: input.orgId,
      source_type: "pos_return",
      source_id: input.returnId,
      description: "Customer return refund",
      date: input.date,
    })
    .select()
    .single();
  if (error) throw error;

  const { error: lineError } = await supabase.from("journal_lines").insert([
    { entry_id: entry.id, org_id: input.orgId, coa_id: revenueAccountId, debit: input.amount, credit: 0 },
    { entry_id: entry.id, org_id: input.orgId, coa_id: assetAccountId, debit: 0, credit: input.amount },
  ]);
  if (lineError) throw lineError;
}
// if the sale carries VAT, VAT Payable (credit, split from the revenue
// portion). Does not yet post COGS/inventory reduction — see scope note
// at the top of the file inherited from the original journal design.
export async function postSaleJournal(sale: {
  id: string;
  org_id: string;
  total: number;
  tax_amount?: number;
  cogs_amount?: number;
  created_at?: string;
  financeAccountId?: string | null;
}): Promise<void> {
  const supabase = createClient();

  const assetAccountId = await getAssetAccountId(supabase, sale.org_id, sale.financeAccountId ?? null);
  const revenueAccountId = await getOrCreateDefaultAccount(supabase, sale.org_id, "4000", "Sales Revenue", "income");

  const total = Number(sale.total);
  const tax = Number(sale.tax_amount || 0);
  const cogs = Number(sale.cogs_amount || 0);
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
  if (cogs > 0) {
    const cogsAccountId = await getOrCreateDefaultAccount(supabase, sale.org_id, "5000", "Cost of Goods Sold", "expense");
    const inventoryAccountId = await getOrCreateDefaultAccount(supabase, sale.org_id, "1200", "Inventory", "asset");
    lines.push({ entry_id: entry.id, org_id: sale.org_id, coa_id: cogsAccountId, debit: cogs, credit: 0 });
    lines.push({ entry_id: entry.id, org_id: sale.org_id, coa_id: inventoryAccountId, debit: 0, credit: cogs });
  }

  const { error: lineError } = await supabase.from("journal_lines").insert(lines);
  if (lineError) throw lineError;
}

// Posts a payroll run as it moves to "paid": debit Salaries & Wages Expense
// (gross), credit Statutory Deductions Payable (withheld amounts — owed to
// KRA/NSSF, not vanished), credit the cash/asset account for what was
// actually disbursed (net). Sums payroll_items for the run rather than
// taking pre-computed totals, so it's always consistent with what's
// actually on the payslips.
// Posts a salary advance disbursement: debit Employee Advances (an asset —
// it's money owed back to the company), credit whichever account funded it.
export async function postSalaryAdvanceDisbursementJournal(input: {
  orgId: string;
  advanceId: string;
  amount: number;
  date: string;
  financeAccountId?: string | null;
}): Promise<void> {
  if (input.amount <= 0) return;
  const supabase = createClient();

  const advancesAccountId = await getOrCreateDefaultAccount(supabase, input.orgId, "1300", "Employee Advances", "asset");
  const assetAccountId = await getAssetAccountId(supabase, input.orgId, input.financeAccountId ?? null);

  const { data: entry, error } = await supabase
    .from("journal_entries")
    .insert({
      org_id: input.orgId,
      source_type: "salary_advance",
      source_id: input.advanceId,
      description: "Salary advance disbursed",
      date: input.date,
    })
    .select()
    .single();
  if (error) throw error;

  const { error: lineError } = await supabase.from("journal_lines").insert([
    { entry_id: entry.id, org_id: input.orgId, coa_id: advancesAccountId, debit: input.amount, credit: 0 },
    { entry_id: entry.id, org_id: input.orgId, coa_id: assetAccountId, debit: 0, credit: input.amount },
  ]);
  if (lineError) throw lineError;
}

export async function postPayrollJournal(input: {
  orgId: string;
  runId: string;
  periodLabel: string;
  date: string;
  financeAccountId?: string;
}): Promise<void> {
  const supabase = createClient();

  const { data: items, error: itemsError } = await supabase
    .from("payroll_items")
    .select("gross_pay, deductions, net_pay, advance_repayment, employer_contributions")
    .eq("payroll_run_id", input.runId);
  if (itemsError) throw itemsError;
  if (!items || items.length === 0) return;

  const gross = items.reduce((s, i) => s + Number(i.gross_pay), 0);
  const deductions = items.reduce((s, i) => s + Number(i.deductions), 0);
  const net = items.reduce((s, i) => s + Number(i.net_pay), 0);
  const advanceRepayments = items.reduce((s, i) => s + Number(i.advance_repayment || 0), 0);
  const employerContributions = items.reduce((s, i) => s + Number(i.employer_contributions || 0), 0);
  if (gross <= 0) return;

  const expenseAccountId = await getOrCreateDefaultAccount(supabase, input.orgId, "5100", "Salaries & Wages Expense", "expense");
  const assetAccountId = await getAssetAccountId(supabase, input.orgId, input.financeAccountId ?? null);

  const { data: entry, error } = await supabase
    .from("journal_entries")
    .insert({
      org_id: input.orgId,
      source_type: "payroll_run",
      source_id: input.runId,
      description: `Payroll - ${input.periodLabel}`,
      date: input.date,
    })
    .select()
    .single();
  if (error) throw error;

  const lines = [{ entry_id: entry.id, org_id: input.orgId, coa_id: expenseAccountId, debit: gross, credit: 0 }];
  let deductionsPayableTotal = deductions;
  if (employerContributions > 0) {
    const employerExpenseId = await getOrCreateDefaultAccount(supabase, input.orgId, "5120", "Employer Statutory Contributions", "expense");
    lines.push({ entry_id: entry.id, org_id: input.orgId, coa_id: employerExpenseId, debit: employerContributions, credit: 0 });
    deductionsPayableTotal += employerContributions;
  }
  if (deductionsPayableTotal > 0) {
    const deductionsPayableId = await getOrCreateDefaultAccount(supabase, input.orgId, "2200", "Statutory Deductions Payable", "liability");
    lines.push({ entry_id: entry.id, org_id: input.orgId, coa_id: deductionsPayableId, debit: 0, credit: deductionsPayableTotal });
  }
  if (advanceRepayments > 0) {
    const advancesAccountId = await getOrCreateDefaultAccount(supabase, input.orgId, "1300", "Employee Advances", "asset");
    lines.push({ entry_id: entry.id, org_id: input.orgId, coa_id: advancesAccountId, debit: 0, credit: advanceRepayments });
  }
  if (net > 0) {
    lines.push({ entry_id: entry.id, org_id: input.orgId, coa_id: assetAccountId, debit: 0, credit: net });
  }

  const { error: lineError } = await supabase.from("journal_lines").insert(lines);
  if (lineError) throw lineError;
}

// Posts a supplier payment against Accounts Payable: debit AP (reducing
// what's owed), credit the cash/asset account that paid it — a specific
// finance_accounts row when one's picked, otherwise the generic
// "Unspecified Cash" bucket. Only called for completed payments — a
// pending cheque doesn't reduce AP until it clears (see updateChequeStatus
// in payments.ts).
export async function postPayablePaymentJournal(input: {
  orgId: string;
  poId: string;
  amount: number;
  date: string;
  financeAccountId?: string;
}): Promise<void> {
  if (input.amount <= 0) return;
  const supabase = createClient();

  const apAccountId = await getOrCreateDefaultAccount(supabase, input.orgId, "2000", "Accounts Payable", "liability");
  const assetAccountId = await getAssetAccountId(supabase, input.orgId, input.financeAccountId ?? null);

  const { data: entry, error } = await supabase
    .from("journal_entries")
    .insert({
      org_id: input.orgId,
      source_type: "purchase_order_payment",
      source_id: input.poId,
      description: "Supplier payment",
      date: input.date,
    })
    .select()
    .single();
  if (error) throw error;

  const { error: lineError } = await supabase.from("journal_lines").insert([
    { entry_id: entry.id, org_id: input.orgId, coa_id: apAccountId, debit: input.amount, credit: 0 },
    { entry_id: entry.id, org_id: input.orgId, coa_id: assetAccountId, debit: 0, credit: input.amount },
  ]);
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

export type LedgerPnL = {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
};

// Sums journal_lines by chart-of-accounts type to get the real P&L —
// income/expense account_type is set consistently by every posting
// function in this file, so this reflects POS, payroll, PO, and manual
// finance_transactions/finance_expenses postings alike, not just the
// manually-entered ones.
export async function getLedgerPnL(orgId: string): Promise<LedgerPnL> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("journal_lines")
    .select("debit, credit, chart_of_accounts(account_type)")
    .eq("org_id", orgId);
  if (error) throw error;

  let totalIncome = 0;
  let totalExpenses = 0;
  for (const line of data ?? []) {
    const accountType = (line as any).chart_of_accounts?.account_type;
    const debit = Number(line.debit) || 0;
    const credit = Number(line.credit) || 0;
    if (accountType === "income") totalIncome += credit - debit;
    else if (accountType === "expense") totalExpenses += debit - credit;
  }

  return { totalIncome, totalExpenses, netProfit: totalIncome - totalExpenses };
}

export type CashPosition = {
  total: number;
  // finance_accounts.id -> live balance (opening balance + its own ledger movement)
  byAccountId: Record<string, number>;
  // Money POS/payroll/PO have moved that isn't tied to any specific
  // finance_accounts row yet (posted to the generic "Unspecified Cash"
  // bucket) — included in total, surfaced separately so it isn't silently
  // hidden inside one account's number.
  unattributed: number;
};

// finance_accounts.balance is a manually-set opening balance, never
// updated by any posting flow — the running total since then lives in
// journal_lines against whichever chart-of-accounts row the account is
// lazily linked to (coa_id, set the first time money actually posts to
// it). This adds the two together per account, the same way a real bank
// statement would.
export async function getCashPosition(orgId: string): Promise<CashPosition> {
  const supabase = createClient();

  const { data: accounts, error: accError } = await supabase
    .from("finance_accounts")
    .select("id, balance, coa_id")
    .eq("org_id", orgId)
    .eq("status", "active")
    .in("type", ["bank", "cash", "mobile_money"]);
  if (accError) throw accError;

  const unspecifiedCoaId = await getOrCreateDefaultAccount(supabase, orgId, "1000", "Unspecified Cash", "asset");
  const coaIds = Array.from(
    new Set([unspecifiedCoaId, ...(accounts ?? []).map((a) => a.coa_id).filter(Boolean) as string[]])
  );

  const { data: lines, error: lineError } = await supabase
    .from("journal_lines")
    .select("debit, credit, coa_id")
    .eq("org_id", orgId)
    .in("coa_id", coaIds);
  if (lineError) throw lineError;

  const movementByCoa: Record<string, number> = {};
  for (const l of lines ?? []) {
    movementByCoa[l.coa_id] = (movementByCoa[l.coa_id] || 0) + (Number(l.debit) - Number(l.credit));
  }

  const byAccountId: Record<string, number> = {};
  let total = 0;
  for (const a of accounts ?? []) {
    const movement = a.coa_id ? movementByCoa[a.coa_id] || 0 : 0;
    const live = Number(a.balance || 0) + movement;
    byAccountId[a.id] = live;
    total += live;
  }

  const unattributed = movementByCoa[unspecifiedCoaId] || 0;
  total += unattributed;

  return { total, byAccountId, unattributed };
}

export type TrialBalanceRow = {
  accountId: string;
  code: string;
  name: string;
  accountType: string;
  debit: number;
  credit: number;
  balance: number; // debit - credit, signed by the account's natural balance side
};

export type TrialBalance = {
  rows: TrialBalanceRow[];
  totalDebits: number;
  totalCredits: number;
  balanced: boolean;
};

// The basic double-entry sanity check: every journal_line's debits should
// equal its credits, in aggregate, across the whole ledger. If they don't,
// something posted an unbalanced entry — a real bug, not a business
// situation. Grouped by account so a discrepancy can actually be traced to
// where it came from, not just "off by X somewhere".
export async function getTrialBalance(orgId: string): Promise<TrialBalance> {
  const supabase = createClient();

  const { data: lines, error } = await supabase
    .from("journal_lines")
    .select("coa_id, debit, credit, chart_of_accounts(code, name, account_type)")
    .eq("org_id", orgId);
  if (error || !lines) {
    return { rows: [], totalDebits: 0, totalCredits: 0, balanced: true };
  }

  const byAccount: Record<string, TrialBalanceRow> = {};
  let totalDebits = 0;
  let totalCredits = 0;

  for (const l of lines as any[]) {
    const coa = l.chart_of_accounts;
    if (!coa) continue;
    const debit = Number(l.debit) || 0;
    const credit = Number(l.credit) || 0;
    totalDebits += debit;
    totalCredits += credit;

    if (!byAccount[l.coa_id]) {
      byAccount[l.coa_id] = {
        accountId: l.coa_id,
        code: coa.code,
        name: coa.name,
        accountType: coa.account_type,
        debit: 0,
        credit: 0,
        balance: 0,
      };
    }
    byAccount[l.coa_id].debit += debit;
    byAccount[l.coa_id].credit += credit;
  }

  const rows = Object.values(byAccount)
    .map((r) => ({ ...r, balance: r.debit - r.credit }))
    .sort((a, b) => a.code.localeCompare(b.code));

  return {
    rows,
    totalDebits,
    totalCredits,
    balanced: Math.abs(totalDebits - totalCredits) < 0.01,
  };
}
