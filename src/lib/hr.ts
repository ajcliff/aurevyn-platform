import { createClient } from "@/lib/supabase";

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

// Creates a draft payroll run and one payroll_item per active employee.
// Monthly gross assumed = salary / 12, deductions = 20% flat.
export async function runPayroll(orgId: string, periodStart: string, periodEnd: string) {
  const supabase = createClient();

  const { data: emps, error: empErr } = await supabase
    .from("employees")
    .select("*")
    .eq("org_id", orgId)
    .eq("employment_status", "active");
  if (empErr) throw empErr;

  const active = (emps ?? []) as Employee[];
  const items = active.map((e) => {
    const gross = Number(e.salary || 0) / 12;
    const deductions = gross * 0.2;
    const net = gross - deductions;
    return { gross_pay: gross, deductions, net_pay: net, employee_id: e.id };
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

export async function updatePayrollRunStatus(id: string, status: PayrollStatus) {
  const supabase = createClient();
  const patch: Partial<PayrollRun> = { status };
  if (status === "processed") patch.processed_at = new Date().toISOString();
  const { data, error } = await supabase.from("payroll_runs").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data as PayrollRun;
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