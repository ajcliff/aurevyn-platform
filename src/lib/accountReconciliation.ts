import { createClient } from "@/lib/supabase";
import { getOrCreateDefaultAccount, getAssetAccountId, getCashPosition } from "@/lib/journal";
import { logActivity } from "@/lib/activity";

export type Reconciliation = {
  id: string;
  org_id: string;
  finance_account_id: string;
  as_of: string;
  book_balance: number;
  actual_balance: number;
  difference: number; // actual − book: negative = short, positive = over
  adjusted: boolean;
  note: string | null;
  recorded_by: string | null;
  created_at: string;
};

export async function getBookBalances(orgId: string): Promise<Record<string, number>> {
  return (await getCashPosition(orgId)).byAccountId;
}

export async function getReconciliations(orgId: string): Promise<Reconciliation[]> {
  const { data, error } = await createClient()
    .from("account_reconciliations")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    ...r,
    book_balance: Number(r.book_balance),
    actual_balance: Number(r.actual_balance),
    difference: Number(r.difference),
  })) as Reconciliation[];
}

// Compare what the books say with what the bank / M-Pesa statement or the cash count says.
// With adjust on, the gap is posted to "Cash Over/Short" so the books match reality.
export async function recordReconciliation(input: {
  orgId: string;
  accountId: string;
  accountName: string;
  asOf: string;
  actualBalance: number;
  adjust: boolean;
  note?: string;
  recordedBy?: string;
}): Promise<Reconciliation> {
  const supabase = createClient();
  const book = (await getBookBalances(input.orgId))[input.accountId] ?? 0;
  const difference = Math.round((input.actualBalance - book) * 100) / 100;
  const adjusted = input.adjust && difference !== 0;

  const { data, error } = await supabase
    .from("account_reconciliations")
    .insert({
      org_id: input.orgId,
      finance_account_id: input.accountId,
      as_of: input.asOf,
      book_balance: book,
      actual_balance: input.actualBalance,
      difference,
      adjusted,
      note: input.note?.trim() || null,
      recorded_by: input.recordedBy ?? null,
    })
    .select()
    .single();
  if (error) throw error;

  if (adjusted) {
    try {
      const assetCoa = await getAssetAccountId(supabase, input.orgId, input.accountId);
      const overShortCoa = await getOrCreateDefaultAccount(supabase, input.orgId, "5OVR", "Cash Over/Short", "expense");
      const amount = Math.abs(difference);
      const { data: entry, error: entryError } = await supabase
        .from("journal_entries")
        .insert({
          org_id: input.orgId,
          source_type: "reconciliation_adjustment",
          source_id: data.id,
          description: `Reconciliation adjustment - ${input.accountName}`,
          date: input.asOf,
        })
        .select()
        .single();
      if (entryError) throw entryError;
      // Short (actual < book): money is missing, expense it. Over: money found, reduce the expense.
      const lines =
        difference < 0
          ? [
              { entry_id: entry.id, org_id: input.orgId, coa_id: overShortCoa, debit: amount, credit: 0 },
              { entry_id: entry.id, org_id: input.orgId, coa_id: assetCoa, debit: 0, credit: amount },
            ]
          : [
              { entry_id: entry.id, org_id: input.orgId, coa_id: assetCoa, debit: amount, credit: 0 },
              { entry_id: entry.id, org_id: input.orgId, coa_id: overShortCoa, debit: 0, credit: amount },
            ];
      const { error: lineError } = await supabase.from("journal_lines").insert(lines);
      if (lineError) throw lineError;
    } catch (err) {
      await supabase.from("account_reconciliations").delete().eq("id", data.id);
      throw err;
    }
  }

  await logActivity({
    icon: difference === 0 ? "✅" : "⚖️",
    title: difference === 0 ? "Account reconciled" : "Account reconciled with a difference",
    sub: `${input.accountName}${difference === 0 ? "" : ` — KES ${difference.toLocaleString()}`}`,
    org_id: input.orgId,
  });

  return { ...data, book_balance: Number(data.book_balance), actual_balance: Number(data.actual_balance), difference: Number(data.difference) } as Reconciliation;
}
