import { createClient } from "@/lib/supabase";

export type HrPermissions = {
  view_salary?: boolean;
  edit_employees?: boolean;
  approve_leave?: boolean;
  broadcast?: boolean;
};

export type EmployeeProfile = {
  id: string;
  org_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: string;
  department: string | null;
  employment_status: string;
  salary: number;
  hire_date: string;
  annual_leave_days: number;
  user_id: string | null;
};

export type Broadcast = {
  id: string;
  org_id: string;
  sender_name: string | null;
  title: string;
  message: string;
  audience_type: "all" | "department" | "individual";
  audience_value: string | null;
  created_at: string;
};

// ---- Admin-facing ----

export async function getAllEmployees(orgId: string): Promise<EmployeeProfile[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .eq("org_id", orgId)
    .order("full_name");

  if (error) throw error;
  return data || [];
}

export async function updateEmployeeStatus(employeeId: string, status: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("employees")
    .update({ employment_status: status })
    .eq("id", employeeId);

  if (error) throw error;
}

export async function updateEmployeeAccess(
  orgUserId: string,
  role: string,
  allowedEngines: string[] | null,
  hrPermissions: HrPermissions
) {
  const supabase = createClient();
  const { error } = await supabase
    .from("org_users")
    .update({
      role,
      allowed_engines: allowedEngines,
      hr_permissions: hrPermissions,
    })
    .eq("id", orgUserId);

  if (error) throw error;
}

export async function linkEmployeeToUser(employeeId: string, userId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("employees")
    .update({ user_id: userId })
    .eq("id", employeeId);

  if (error) throw error;
}

export type UnlinkedMember = {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  role: string;
};

export type PayrollHistoryItem = {
  id: string;
  employee_id: string;
  gross_pay: number;
  deductions: number;
  net_pay: number;
  payroll_runs: {
    period_start: string;
    period_end: string;
    status: string;
  } | null;
};

export type LeaveHistoryItem = {
  id: string;
  employee_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
};

export async function getUnlinkedTeamMembers(orgId: string): Promise<UnlinkedMember[]> {
  const supabase = createClient();

  const { data: members } = await supabase
    .from("org_users")
    .select("id, user_id, full_name, email, role")
    .eq("org_id", orgId);

  const { data: employees } = await supabase
    .from("employees")
    .select("user_id")
    .eq("org_id", orgId)
    .not("user_id", "is", null);

  const linkedUserIds = new Set((employees || []).map((e) => e.user_id));

  return (members || []).filter((m) => !linkedUserIds.has(m.user_id));
}

// Leave requests that were approved/rejected in the last 3 days for this
// employee — used to notify the requester of the decision, not just the admin
// who's reviewing pending ones.
export async function getRecentLeaveDecisionsForEmployee(employeeId: string) {
  const supabase = createClient();
  const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();

  const { data, error } = await supabase
    .from("leave_requests")
    .select("*")
    .eq("employee_id", employeeId)
    .in("status", ["approved", "rejected"])
    .gte("updated_at", threeDaysAgo)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }
  return data || [];
}

export async function getPendingLeaveRequestsForOrg(orgId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("leave_requests")
    .select("*, employees(full_name)")
    .eq("org_id", orgId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getPayrollHistoryForEmployee(employeeId: string): Promise<PayrollHistoryItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("payroll_items")
    .select("*, payroll_runs(period_start, period_end, status)")
    .eq("employee_id", employeeId)
    .order("period_start", { foreignTable: "payroll_runs", ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getLeaveHistoryForEmployee(employeeId: string): Promise<LeaveHistoryItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("leave_requests")
    .select("*")
    .eq("employee_id", employeeId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function sendBroadcast(
  orgId: string,
  senderUserId: string,
  senderName: string,
  title: string,
  message: string,
  audienceType: "all" | "department" | "individual",
  audienceValue: string | null
) {
  const supabase = createClient();
  const { error } = await supabase.from("broadcasts").insert({
    org_id: orgId,
    sender_user_id: senderUserId,
    sender_name: senderName,
    title,
    message,
    audience_type: audienceType,
    audience_value: audienceValue,
  });

  if (error) throw error;
}

// ---- Self-facing ----

// The founder account is identified purely by email match, never gets an
// org_users row, and so was never covered by the org_users-driven backfill.
// Called lazily from /me the first time a founder visits a given org's
// profile page, rather than trying to pre-create a row in every org upfront.
export async function ensureFounderEmployeeRecord(
  orgId: string,
  userId: string,
  email: string | null
): Promise<EmployeeProfile> {
  const supabase = createClient();

  const { data: existing } = await supabase
    .from("employees")
    .select("*")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) return existing;

  const { data, error } = await supabase
    .from("employees")
    .insert({
      org_id: orgId,
      user_id: userId,
      full_name: email || "Founder",
      email,
      phone: null,
      role: "owner",
      department: null,
      employment_status: "active",
      salary: 0,
      hire_date: new Date().toISOString().slice(0, 10),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getMyEmployeeRecord(
  orgId: string,
  userId: string
): Promise<EmployeeProfile | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("employees")
    .select("*")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();

  return data;
}

export async function getMyBroadcasts(
  orgId: string,
  department: string | null,
  employeeId: string
): Promise<Broadcast[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("broadcasts")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  // Client-side filter: "all", my department, or specifically me
  return (data || []).filter(
    (b) =>
      b.audience_type === "all" ||
      (b.audience_type === "department" && b.audience_value === department) ||
      (b.audience_type === "individual" && b.audience_value === employeeId)
  );
}

export async function requestLeave(
  orgId: string,
  employeeId: string,
  leaveType: string,
  startDate: string,
  endDate: string
) {
  const supabase = createClient();
  const { error } = await supabase.from("leave_requests").insert({
    org_id: orgId,
    employee_id: employeeId,
    leave_type: leaveType,
    start_date: startDate,
    end_date: endDate,
    status: "pending",
  });

  if (error) throw error;
}