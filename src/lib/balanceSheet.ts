import { createClient } from "./supabase";
import type { ChartAccount } from "./chartOfAccounts";

export type BalanceSheetLine = { account: ChartAccount; balance: number };

export type BalanceSheet = {
  assets: BalanceSheetLine[];
  liabilities: BalanceSheetLine[];
  equity: BalanceSheetLine[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
};

// Balances every Chart of Accounts asset/liability/equity account from the
// double-entry journal (journal_lines), as of the given date. Assets are
// debit-normal (debit increases, credit decreases); liabilities and equity
// are credit-normal — standard accounting convention.
//
// Only reflects what's actually been posted to the ledger. As of this build,
// that's finance_transactions only (see journal.ts) — POS sales, purchase
// order receipts, and finance_expenses don't post yet, so this Balance Sheet
// will be incomplete for orgs that rely heavily on those until they're wired
// in too.
export async function getBalanceSheet(orgId: string, asOfDate: string, accounts: ChartAccount[]): Promise<BalanceSheet> {
  const supabase = createClient();

  const { data: lines, error } = await supabase
    .from("journal_lines")
    .select("coa_id, debit, credit, journal_entries!inner(org_id, date)")
    .eq("journal_entries.org_id", orgId)
    .lte("journal_entries.date", asOfDate);

  if (error) {
    console.error(error);
  }

  const balanceByAccount = new Map<string, number>();
  let netIncomeToDate = 0;

  (lines || []).forEach((line: any) => {
    const account = accounts.find((a) => a.id === line.coa_id);
    if (!account) return;
    const debit = Number(line.debit);
    const credit = Number(line.credit);

    if (account.account_type === "income") {
      netIncomeToDate += credit - debit;
      return;
    }
    if (account.account_type === "expense") {
      netIncomeToDate -= debit - credit;
      return;
    }

    const normal = account.account_type === "asset" ? 1 : -1;
    const delta = (debit - credit) * normal;
    balanceByAccount.set(account.id, (balanceByAccount.get(account.id) || 0) + delta);
  });

  function linesFor(type: "asset" | "liability" | "equity"): BalanceSheetLine[] {
    return accounts
      .filter((a) => a.account_type === type)
      .map((account) => ({ account, balance: balanceByAccount.get(account.id) || 0 }))
      .filter((l) => l.balance !== 0)
      .sort((a, b) => a.account.code.localeCompare(b.account.code));
  }

  const assets = linesFor("asset");
  const liabilities = linesFor("liability");
  const equity = linesFor("equity");

  // Income/expense accounts are temporary — until a formal period close,
  // their net balance shows here as "Current Year Earnings" so the sheet
  // actually balances (standard practice for a live, mid-period Balance
  // Sheet rather than only ever after a closing entry).
  if (netIncomeToDate !== 0) {
    equity.push({
      account: {
        id: "current-year-earnings",
        org_id: orgId,
        code: "3999",
        name: "Current Year Earnings",
        account_type: "equity",
        parent_id: null,
        is_active: true,
        created_at: "",
      },
      balance: netIncomeToDate,
    });
  }

  return {
    assets,
    liabilities,
    equity,
    totalAssets: assets.reduce((s, l) => s + l.balance, 0),
    totalLiabilities: liabilities.reduce((s, l) => s + l.balance, 0),
    totalEquity: equity.reduce((s, l) => s + l.balance, 0),
  };
}
