import { createClient } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";
import { postSalaryAdvanceDisbursementJournal } from "@/lib/journal";

export type SalaryAdvanceStatus = "pending" | "disbursed" | "rejected" | "repaid";

export type SalaryAdvance = {
  id: string;
  org_id: string;
  employee_id: string;
  amount: number;
  outstanding_balance: number;
  reason: string | null;
  status: SalaryAdvanceStatus;
  requested_by_user_id: string | null;
  requested_at: string;
  decided_by_name: string | null;
  decided_at: string | null;
  created_at: string;
};

export async function getSalaryAdvances(orgId: string): Promise<SalaryAdvance[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("salary_advances")
    .select("*")
    .eq("org_id", orgId)
    .order("requested_at", { ascending: false });
  if (error) throw error;
  return data as SalaryAdvance[];
}

// Creates the advance record (status: pending) and a matching entry in the
// shared approvals queue, the same one expenses/reimbursements/purchases go
// through — so it shows up on the Approvals page without a separate inbox.
export async function requestSalaryAdvance(input: {
  orgId: string;
  employeeId: string;
  employeeName: string;
  amount: number;
  reason?: string;
  requestedByUserId: string | null;
  requestedByName: string;
}): Promise<SalaryAdvance> {
  const supabase = createClient();

  const { data: advance, error } = await supabase
    .from("salary_advances")
    .insert({
      org_id: input.orgId,
      employee_id: input.employeeId,
      amount: input.amount,
      outstanding_balance: 0,
      reason: input.reason || null,
      status: "pending",
      requested_by_user_id: input.requestedByUserId,
    })
    .select()
    .single();
  if (error) throw error;

  await supabase.from("approval_requests").insert({
    org_id: input.orgId,
    requested_by_user_id: input.requestedByUserId,
    requested_by_name: input.requestedByName,
    type: "salary_advance",
    title: `Salary advance — ${input.employeeName}`,
    description: input.reason || null,
    amount: input.amount,
    status: "pending",
    source: "manual",
    related_id: advance.id,
  });

  await logActivity({
    icon: "🪙",
    title: "Salary advance requested",
    sub: `${input.employeeName} — KES ${input.amount.toLocaleString()}`,
    org_id: input.orgId,
  });

  return advance as SalaryAdvance;
}

// Approving a salary advance disburses it immediately — sets the account it
// came from, posts to the ledger, and opens the outstanding balance that
// payroll will start repaying against.
export async function disburseSalaryAdvance(input: {
  advanceId: string;
  orgId: string;
  approvalRequestId: string;
  financeAccountId?: string;
  decidedByName: string;
}): Promise<void> {
  const supabase = createClient();

  const { data: advance, error } = await supabase
    .from("salary_advances")
    .select("amount")
    .eq("id", input.advanceId)
    .single();
  if (error) throw error;

  const { data: finalAdvance, error: updateErr } = await supabase
    .from("salary_advances")
    .update({
      status: "disbursed",
      outstanding_balance: advance.amount,
      decided_by_name: input.decidedByName,
      decided_at: new Date().toISOString(),
    })
    .eq("id", input.advanceId)
    .select()
    .single();
  if (updateErr) throw updateErr;

  await postSalaryAdvanceDisbursementJournal({
    orgId: input.orgId,
    advanceId: input.advanceId,
    amount: Number(finalAdvance.amount),
    date: new Date().toISOString().slice(0, 10),
    financeAccountId: input.financeAccountId,
  });

  await supabase
    .from("approval_requests")
    .update({ status: "approved", decided_by_name: input.decidedByName, decided_at: new Date().toISOString() })
    .eq("id", input.approvalRequestId);

  await logActivity({
    icon: "💸",
    title: "Salary advance disbursed",
    sub: `KES ${Number(finalAdvance.amount).toLocaleString()}`,
    org_id: input.orgId,
  });
}

export async function rejectSalaryAdvance(input: {
  advanceId: string;
  orgId: string;
  approvalRequestId: string;
  decidedByName: string;
  title: string;
}): Promise<void> {
  const supabase = createClient();

  await supabase
    .from("salary_advances")
    .update({ status: "rejected", decided_by_name: input.decidedByName, decided_at: new Date().toISOString() })
    .eq("id", input.advanceId);

  await supabase
    .from("approval_requests")
    .update({ status: "rejected", decided_by_name: input.decidedByName, decided_at: new Date().toISOString() })
    .eq("id", input.approvalRequestId);

  await logActivity({ icon: "❌", title: "Request rejected", sub: input.title, org_id: input.orgId });
}
