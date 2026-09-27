import { createClient } from "@/lib/supabase";
import { postPayrollJournal } from "@/lib/journal";

export type EmploymentStatus = "active" | "on_leave" | "terminated";
export type PayrollStatus = "draft" | "processed" | "paid";
export type LeaveType = "annual" | "sick" | "unpaid";
export type LeaveStatus = "pending" | "approved" | "rejected";

export type Employee = {
  id: string;
  org_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  department: string | null;
  employment_status: EmploymentStatus;
  salary: number;
  hire_date: string | null;
  created_at: string;
};

export type PayrollRun = {
  id: string;
  org_id: string;
  period_start: string;
  period_end: string;
  status: PayrollStatus;
  total_amount: number;
  processed_at: string | null;
  created_at: string;
};

export type PayrollItem = {
  id: string;
  org_id: string;
  payroll_run_id: string;
  employee_id: string;
  gross_pay: number;
  deductions: number;
  nssf: number;
  shif: number;
  ahl: number;
  paye: number;
  employer_contributions: number;
  advance_repayment: number;
  net_pay: number;
};

export type LeaveRequest = {
  id: string;
  org_id: string;
  employee_id: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  status: LeaveStatus;
  created_at: string;
  updated_at: string;
};

export async function getEmployees(orgId: string): Promise<Employee[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });
  if (error) { console.error(error); return []; }
  return data as Employee[];
}

export async function createEmployee(record: Omit<Employee, "id" | "created_at">) {
  const supabase = createClient();
  const { data, error } = await supabase.from("employees").insert(record).select().single();
  if (error) throw error;
  return data as Employee;
}

export async function getPayrollRuns(orgId: string): Promise<PayrollRun[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("payroll_runs")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });
  if (error) { console.error(error); return []; }
  return data as PayrollRun[];
}

export async function getPayrollItems(orgId: string, runId: string): Promise<PayrollItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("payroll_items")
    .select("*")
    .eq("org_id", orgId)
    .eq("payroll_run_id", runId);
  if (error) { console.error(error); return []; }
  return data as PayrollItem[];
}

export type Payslip = {
  item: PayrollItem;
  employee: Pick<Employee, "id" | "full_name" | "role" | "department">;
  run: Pick<PayrollRun, "id" | "period_start" | "period_end" | "status">;
};

// A single payslip: the payroll_item plus enough employee/run context to
// render or print it standalone. The NSSF/SHIF/AHL/PAYE figures come
// straight from what was actually calculated and stored at run time, not
// recomputed from current rates — so a payslip always matches what was
// really withheld even if tax bands change later.
export async function getPayslip(orgId: string, itemId: string): Promise<Payslip | null> {
  const supabase = createClient();
  const { data: item, error } = await supabase
    .from("payroll_items")
    .select("*")
    .eq("org_id", orgId)
    .eq("id", itemId)
    .maybeSingle();
  if (error || !item) return null;

  const [{ data: employee }, { data: run }] = await Promise.all([
    supabase.from("employees").select("id, full_name, role, department").eq("id", item.employee_id).maybeSingle(),
    supabase.from("payroll_runs").select("id, period_start, period_end, status").eq("id", item.payroll_run_id).maybeSingle(),
  ]);
  if (!employee || !run) return null;

  return { item: item as PayrollItem, employee, run };
}

// Creates a draft payroll run and one payroll_item per active employee.
// Monthly gross assumed = salary / 12, deductions = 20% flat.
// Kenya statutory payroll deductions, current as of the Feb 2026 NSSF update.
// Source-checked against KRA/NSSF/SHA guidance — these change periodically
// (Finance Bills adjust PAYE bands, NSSF's ceiling phases in annually), so
// revisit this block if KRA/NSSF publish new figures.
const PAYE_BANDS = [
  { upTo: 24000, rate: 0.10 },
  { upTo: 32333, rate: 0.25 },
  { upTo: 500000, rate: 0.30 },
  { upTo: 800000, rate: 0.325 },
  { upTo: Infinity, rate: 0.35 },
];
const PERSONAL_RELIEF = 2400; // monthly, subtracted from computed tax — never a refund, floors at 0
const NSSF_RATE = 0.06; // employee side; employer matches 6% but that's a cost, not a deduction, not tracked here yet
const NSSF_PENSIONABLE_CAP = 108000; // Tier I+II combined ceiling, effective Feb 2026
const SHIF_RATE = 0.0275;
const SHIF_MIN = 300;
const AHL_RATE = 0.015; // Affordable Housing Levy, employee side

function calculatePaye(taxablePay: number): number {
  let remaining = taxablePay;
  let tax = 0;
  let lowerBound = 0;
  for (const band of PAYE_BANDS) {
    if (remaining <= 0) break;
    const taxableInBand = Math.min(remaining, band.upTo - lowerBound);
    tax += taxableInBand * band.rate;
    remaining -= taxableInBand;
    lowerBound = band.upTo;
  }
  return Math.max(tax - PERSONAL_RELIEF, 0);
}

// NSSF, SHIF, and AHL are all pre-tax deductions — they reduce taxable pay
// before PAYE bands are applied, then PAYE stacks on top as the last cut.
function calculateStatutoryDeductions(gross: number) {
  const nssf = Math.min(gross, NSSF_PENSIONABLE_CAP) * NSSF_RATE;
  const shif = Math.max(gross * SHIF_RATE, SHIF_MIN);
  const ahl = gross * AHL_RATE;
  const taxablePay = Math.max(gross - nssf - shif - ahl, 0);
  const paye = calculatePaye(taxablePay);

  // Employer matches NSSF and AHL at the same rate the employee pays —
  // that's a real cost to the company, not a deduction from the employee's
  // pay, and gets remitted to the same bodies (NSSF, KRA's Housing Levy)
  // alongside what was withheld. SHIF has no employer match.
  const employerNssf = Math.min(gross, NSSF_PENSIONABLE_CAP) * NSSF_RATE;
  const employerAhl = gross * AHL_RATE;

  return {
    nssf,
    shif,
    ahl,
    paye,
    totalDeductions: nssf + shif + ahl + paye,
    employerContributions: employerNssf + employerAhl,
  };
}

export async function runPayroll(orgId: string, periodStart: string, periodEnd: string) {
  const supabase = createClient();

  const { data: emps, error: empErr } = await supabase
    .from("employees")
    .select("*")
    .eq("org_id", orgId)
    .eq("employment_status", "active");
  if (empErr) throw empErr;

  const active = (emps ?? []) as Employee[];

  const { data: advances, error: advErr } = await supabase
    .from("salary_advances")
    .select("id, employee_id, outstanding_balance")
    .eq("org_id", orgId)
    .eq("status", "disbursed")
    .gt("outstanding_balance", 0);
  if (advErr) throw advErr;
  const advanceByEmployee = new Map((advances ?? []).map((a) => [a.employee_id, a]));

  const items = active.map((e) => {
    const gross = Number(e.salary || 0) / 12;
    const { nssf, shif, ahl, paye, totalDeductions, employerContributions } = calculateStatutoryDeductions(gross);
    const postDeductionPay = gross - totalDeductions;
    const advance = advanceByEmployee.get(e.id);
    // Capped at 50% of that period's post-statutory pay, deliberately not the
    // full outstanding balance in one shot — avoids zeroing out a paycheck.
    // Remainder carries to the next run.
    const advanceRepayment = advance
      ? Math.min(Number(advance.outstanding_balance), postDeductionPay * 0.5)
      : 0;
    const net = postDeductionPay - advanceRepayment;
    return {
      gross_pay: gross,
      deductions: totalDeductions,
      nssf,
      shif,
      ahl,
      paye,
      employer_contributions: employerContributions,
      advance_repayment: advanceRepayment,
      net_pay: net,
      employee_id: e.id,
    };
  });
  const total = items.reduce((s, i) => s + i.net_pay, 0);

  const { data: run, error: runErr } = await supabase
    .from("payroll_runs")
    .insert({
      org_id: orgId,
      period_start: periodStart,
      period_end: periodEnd,
      status: "draft",
      total_amount: total,
    })
    .select()
    .single();
  if (runErr) throw runErr;

  if (items.length) {
    const rows = items.map((i) => ({ ...i, org_id: orgId, payroll_run_id: (run as PayrollRun).id }));
    const { error: itemsErr } = await supabase.from("payroll_items").insert(rows);
    if (itemsErr) throw itemsErr;
  }

  return run as PayrollRun;
}

export async function updatePayrollRunStatus(id: string, status: PayrollStatus, financeAccountId?: string) {
  const supabase = createClient();
  const patch: Partial<PayrollRun> = { status };
  if (status === "processed") patch.processed_at = new Date().toISOString();
  const { data, error } = await supabase.from("payroll_runs").update(patch).eq("id", id).select().single();
  if (error) throw error;

  const run = data as PayrollRun;
  if (status === "paid") {
    await postPayrollJournal({
      orgId: run.org_id,
      runId: run.id,
      periodLabel: `${run.period_start} to ${run.period_end}`,
      date: run.period_end,
      financeAccountId,
    });

    const { data: repaidItems } = await supabase
      .from("payroll_items")
      .select("employee_id, advance_repayment")
      .eq("payroll_run_id", run.id)
      .gt("advance_repayment", 0);

    for (const item of repaidItems ?? []) {
      const { data: advance } = await supabase
        .from("salary_advances")
        .select("id, outstanding_balance")
        .eq("org_id", run.org_id)
        .eq("employee_id", item.employee_id)
        .eq("status", "disbursed")
        .gt("outstanding_balance", 0)
        .order("requested_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (!advance) continue;

      const newBalance = Math.max(Number(advance.outstanding_balance) - Number(item.advance_repayment), 0);
      await supabase
        .from("salary_advances")
        .update({
          outstanding_balance: newBalance,
          status: newBalance === 0 ? "repaid" : "disbursed",
        })
        .eq("id", advance.id);
    }
  }

  return run;
}

export async function getLeaveRequests(orgId: string): Promise<LeaveRequest[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("leave_requests")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });
  if (error) { console.error(error); return []; }
  return data as LeaveRequest[];
}

export async function updateLeaveStatus(id: string, status: LeaveStatus) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("leave_requests")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as LeaveRequest;
}