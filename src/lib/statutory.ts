import { createClient } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";
import { getOrCreateDefaultAccount, getAssetAccountId } from "@/lib/journal";

export type StatutoryBreakdown = {
  nssf: number;
  shif: number;
  ahl: number;
  paye: number;
  employerContributions: number;
  total: number;
};

// What's currently owed — the live balance of the Statutory Deductions
// Payable liability account. This already reflects any remittances already
// recorded (they credit cash and debit this account down), so it's always
// "what's left to pay", not a running total since the beginning of time.
export async function getStatutoryLiabilityBalance(orgId: string): Promise<number> {
  const supabase = createClient();

  const { data: account } = await supabase
    .from("chart_of_accounts")
    .select("id")
    .eq("org_id", orgId)
    .eq("code", "2200")
    .maybeSingle();
  if (!account) return 0;

  const { data: lines, error } = await supabase
    .from("journal_lines")
    .select("debit, credit")
    .eq("org_id", orgId)
    .eq("coa_id", account.id);
  if (error || !lines) return 0;

  return lines.reduce((sum, l) => sum + (Number(l.credit) - Number(l.debit)), 0);
}

// A breakdown by type (NSSF/SHIF/AHL/PAYE + employer match) for a given
// period, summed straight from what payroll actually calculated and stored
// — not recomputed from current rates, so this always matches what was
// really withheld even if bands change later.
export async function getStatutoryBreakdown(
  orgId: string,
  periodStart: string,
  periodEnd: string
): Promise<StatutoryBreakdown> {
  const supabase = createClient();

  const { data: runs } = await supabase
    .from("payroll_runs")
    .select("id")
    .eq("org_id", orgId)
    .gte("period_start", periodStart)
    .lte("period_end", periodEnd);

  const runIds = (runs ?? []).map((r) => r.id);
  if (runIds.length === 0) {
    return { nssf: 0, shif: 0, ahl: 0, paye: 0, employerContributions: 0, total: 0 };
  }

  const { data: items, error } = await supabase
    .from("payroll_items")
    .select("nssf, shif, ahl, paye, employer_contributions")
    .in("payroll_run_id", runIds);
  if (error || !items) {
    return { nssf: 0, shif: 0, ahl: 0, paye: 0, employerContributions: 0, total: 0 };
  }

  const nssf = items.reduce((s, i) => s + Number(i.nssf), 0);
  const shif = items.reduce((s, i) => s + Number(i.shif), 0);
  const ahl = items.reduce((s, i) => s + Number(i.ahl), 0);
  const paye = items.reduce((s, i) => s + Number(i.paye), 0);
  const employerContributions = items.reduce((s, i) => s + Number(i.employer_contributions), 0);

  return { nssf, shif, ahl, paye, employerContributions, total: nssf + shif + ahl + paye + employerContributions };
}

// Records that a remittance to KRA/NSSF/SHA was actually made — debits the
// liability down, credits whichever account paid it. Same shape as the AP
// and payroll postings elsewhere, just against the statutory liability
// instead of Accounts Payable or a cash/expense pair.
export async function recordStatutoryRemittance(input: {
  orgId: string;
  amount: number;
  date: string;
  financeAccountId?: string;
  decidedByName: string;
}): Promise<void> {
  if (input.amount <= 0) return;
  const supabase = createClient();

  const liabilityAccountId = await getOrCreateDefaultAccount(supabase, input.orgId, "2200", "Statutory Deductions Payable", "liability");
  const assetAccountId = await getAssetAccountId(supabase, input.orgId, input.financeAccountId ?? null);

  const { data: entry, error } = await supabase
    .from("journal_entries")
    .insert({
      org_id: input.orgId,
      source_type: "statutory_remittance",
      source_id: null,
      description: `Statutory remittance (KRA/NSSF/SHA) — recorded by ${input.decidedByName}`,
      date: input.date,
    })
    .select()
    .single();
  if (error) throw error;

  const { error: lineError } = await supabase.from("journal_lines").insert([
    { entry_id: entry.id, org_id: input.orgId, coa_id: liabilityAccountId, debit: input.amount, credit: 0 },
    { entry_id: entry.id, org_id: input.orgId, coa_id: assetAccountId, debit: 0, credit: input.amount },
  ]);
  if (lineError) throw lineError;

  await logActivity({
    icon: "🧾",
    title: "Statutory remittance recorded",
    sub: `KES ${input.amount.toLocaleString()}`,
    org_id: input.orgId,
  });
}
