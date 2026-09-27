import { createClient } from "@/lib/supabase";
import { getAssetAccountId } from "@/lib/journal";

export type UnattributedLine = {
  lineId: string;
  entryId: string;
  date: string;
  description: string;
  sourceType: string;
  amount: number; // positive = cash in, negative = cash out, on this line
};

// Anything that landed in "Unspecified Cash" (code 1000) is money that moved
// but was never tied to a specific bank/cash/mobile-money account — mostly
// split-tender POS sales, and anything else posted before a funding account
// was picked. This finds it so it can be cleaned up.
export async function getUnattributedLedgerLines(orgId: string): Promise<UnattributedLine[]> {
  const supabase = createClient();

  const { data: unspecified } = await supabase
    .from("chart_of_accounts")
    .select("id")
    .eq("org_id", orgId)
    .eq("code", "1000")
    .maybeSingle();
  if (!unspecified) return [];

  const { data: lines, error } = await supabase
    .from("journal_lines")
    .select("id, entry_id, debit, credit, journal_entries(date, description, source_type)")
    .eq("org_id", orgId)
    .eq("coa_id", unspecified.id)
    .order("entry_id", { ascending: false });
  if (error || !lines) return [];

  return lines.map((l: any) => ({
    lineId: l.id,
    entryId: l.entry_id,
    date: l.journal_entries?.date ?? "",
    description: l.journal_entries?.description ?? "",
    sourceType: l.journal_entries?.source_type ?? "",
    amount: Number(l.debit) - Number(l.credit),
  }));
}

// Moves one line from Unspecified Cash to a real finance_account's linked
// asset account. Only this one line moves — the rest of that journal entry
// (revenue, COGS, VAT, whatever else it posted) is untouched, since the
// only thing that was ever ambiguous was which account the cash side
// belonged to.
export async function reassignLedgerLine(input: {
  lineId: string;
  orgId: string;
  financeAccountId: string;
}): Promise<void> {
  const supabase = createClient();
  const targetCoaId = await getAssetAccountId(supabase, input.orgId, input.financeAccountId);

  const { error } = await supabase
    .from("journal_lines")
    .update({ coa_id: targetCoaId })
    .eq("id", input.lineId)
    .eq("org_id", input.orgId);
  if (error) throw error;
}
