"use client";

import { CSSProperties, useEffect, useMemo, useState } from "react";
import {
  Employee,
  EmploymentStatus,
  LeaveRequest,
  LeaveStatus,
  PayrollRun,
  createEmployee,
  getEmployees,
  getLeaveRequests,
  getPayrollRuns,
  runPayroll,
  updateLeaveStatus,
  updatePayrollRunStatus,
} from "@/lib/hr";
import { exportToCSV } from "@/lib/csvExport";
import { logActivity } from "@/lib/activity";

const styles: Record<string, CSSProperties> = {
  page: { padding: 24, background: "#07070f", minHeight: "100vh", color: "#fff", display: "grid", gridTemplateColumns: "1fr 320px", gap: 20 },
  main: { display: "flex", flexDirection: "column", gap: 20, minWidth: 0 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 22, fontWeight: 600, margin: 0 },
  summaryGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 14 },
  card: { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: 18 },
  cardLabel: { fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5 },
  cardValue: { fontSize: 24, fontWeight: 600, marginTop: 6 },
  section: { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 20 },
  sectionTitle: { fontSize: 15, fontWeight: 600, margin: 0, marginBottom: 14 },
  rowControls: { display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" },
  input: { background: "#0f0f1a", border: "1px solid var(--border)", color: "#fff", borderRadius: 10, padding: "8px 12px", fontSize: 13, minWidth: 180 },
  select: { background: "#0f0f1a", border: "1px solid var(--border)", color: "#fff", borderRadius: 10, padding: "8px 12px", fontSize: 13 },
  primary: { background: "var(--gold)", color: "#000", border: "none", borderRadius: 10, padding: "8px 14px", fontWeight: 600, cursor: "pointer", fontSize: 13 },
  ghost: { background: "transparent", color: "#fff", border: "1px solid var(--border)", borderRadius: 10, padding: "8px 14px", cursor: "pointer", fontSize: 13 },
  success: { background: "var(--green)", color: "#000", border: "none", borderRadius: 10, padding: "6px 12px", fontWeight: 600, cursor: "pointer", fontSize: 12 },
  danger: { background: "transparent", color: "#ff6b6b", border: "1px solid #ff6b6b", borderRadius: 10, padding: "6px 12px", cursor: "pointer", fontSize: 12 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { textAlign: "left", padding: "10px 8px", color: "var(--text-muted)", fontWeight: 500, borderBottom: "1px solid var(--border)", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 },
  td: { padding: "12px 8px", borderBottom: "1px solid var(--border)" },
  badge: (color: string): CSSProperties => ({ display: "inline-block", padding: "2px 8px", borderRadius: 999, fontSize: 10, background: color, color: "#000", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 }),
  side: { display: "flex", flexDirection: "column", gap: 14 },
  modalBackdrop: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 },
  modal: { width: 480, maxWidth: "90vw", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 22 },
  field: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 },
  label: { fontSize: 12, color: "var(--text-muted)" },
};

function empStatusBadge(s: EmploymentStatus) {
  const map: Record<EmploymentStatus, string> = { active: "var(--green)", on_leave: "#c9a227", terminated: "#555" };
  return <span style={styles.badge(map[s])}>{s.replace("_", " ")}</span>;
}
function payrollStatusBadge(s: PayrollRun["status"]) {
  const map: Record<PayrollRun["status"], string> = { draft: "#555", processed: "#c9a227", paid: "var(--green)" };
  return <span style={styles.badge(map[s])}>{s}</span>;
}
function leaveStatusBadge(s: LeaveStatus) {
  const map: Record<LeaveStatus, string> = { pending: "#c9a227", approved: "var(--green)", rejected: "#ff6b6b" };
  return <span style={styles.badge(map[s])}>{s}</span>;
}

export default function HrDashboard({ orgId }: { orgId: string }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [dept, setDept] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | EmploymentStatus>("all");
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [e, r, l] = await Promise.all([getEmployees(orgId), getPayrollRuns(orgId), getLeaveRequests(orgId)]);
      setEmployees(e);
      setRuns(r);
      setLeaves(l);
      setLoading(false);
    })();
  }, [orgId]);

  const departments = useMemo(
    () => Array.from(new Set(employees.map((e) => e.department).filter(Boolean))) as string[],
    [employees]
  );
  const activeEmps = useMemo(() => employees.filter((e) => e.employment_status === "active"), [employees]);
  const pendingLeaves = useMemo(() => leaves.filter((l) => l.status === "pending"), [leaves]);
  const thisMonthPayroll = useMemo(() => {
    const now = new Date();
    return runs
      .filter((r) => {
        const c = new Date(r.created_at);
        return c.getMonth() === now.getMonth() && c.getFullYear() === now.getFullYear();
      })
      .reduce((s, r) => s + Number(r.total_amount || 0), 0);
  }, [runs]);

  const filtered = useMemo(
    () =>
      employees.filter((e) => {
        if (statusFilter !== "all" && e.employment_status !== statusFilter) return false;
        if (dept !== "all" && e.department !== dept) return false;
        if (search && !`${e.full_name} ${e.email ?? ""} ${e.role ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      }),
    [employees, search, dept, statusFilter]
  );

  function handleExportEmployeesCSV() {
    const rows = filtered.map((e) => ({
      Name: e.full_name,
      Role: e.role || "",
      Department: e.department || "",
      "Salary (KES)": e.salary,
      Status: e.employment_status,
      "Hire Date": e.hire_date || "",
    }));
    exportToCSV(`employees-${orgId}-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  }

  function handleExportPayrollCSV() {
    const rows = runs.map((r) => ({
      "Period Start": r.period_start,
      "Period End": r.period_end,
      "Total (KES)": r.total_amount,
      Status: r.status,
      "Processed At": r.processed_at || "",
    }));
    exportToCSV(`payroll-${orgId}-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  }

  async function handleCreate(input: Omit<Employee, "id" | "created_at" | "org_id">) {
    const e = await createEmployee({ ...input, org_id: orgId });
    setEmployees((prev) => [e, ...prev]);
    setShowNew(false);
    await logActivity({
      icon: "🧑‍💼",
      title: "Employee added",
      sub: e.full_name,
      org_id: orgId,
    });
  }

  async function handleRunPayroll() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
    const r = await runPayroll(orgId, start, end);
    setRuns((prev) => [r, ...prev]);
    await logActivity({
      icon: "💰",
      title: "Payroll run created",
      sub: `KES ${Number(r.total_amount).toLocaleString()}`,
      org_id: orgId,
    });
  }

  async function advanceRun(r: PayrollRun) {
    const next: PayrollRun["status"] = r.status === "draft" ? "processed" : r.status === "processed" ? "paid" : "paid";
    const updated = await updatePayrollRunStatus(r.id, next);
    setRuns((prev) => prev.map((x) => (x.id === r.id ? updated : x)));
  }

  async function decideLeave(l: LeaveRequest, status: LeaveStatus) {
    const updated = await updateLeaveStatus(l.id, status);
    setLeaves((prev) => prev.map((x) => (x.id === l.id ? updated : x)));
    const emp = employees.find((e) => e.id === l.employee_id);
    await logActivity({
      icon: status === "approved" ? "✅" : "❌",
      title: `Leave ${status}`,
      sub: emp?.full_name || "Employee",
      org_id: orgId,
    });
  }

  return (
    <div style={{ ...styles.page, background: "transparent", minHeight: 0, height: "100%", overflowY: "auto", padding: 0 }}>
      <div style={styles.main}>
        <div style={styles.header}>
          <h1 style={styles.title}>HR & Payroll</h1>
          <button style={styles.primary} onClick={() => setShowNew(true)}>
            + Employee
          </button>
        </div>

        <div style={styles.summaryGrid}>
          <div style={styles.card}>
            <div style={styles.cardLabel}>Total Employees</div>
            <div style={styles.cardValue}>{employees.length}</div>
          </div>
          <div style={styles.card}>
            <div style={styles.cardLabel}>Active</div>
            <div style={styles.cardValue}>{activeEmps.length}</div>
          </div>
          <div style={styles.card}>
            <div style={styles.cardLabel}>Pending Leave</div>
            <div style={styles.cardValue}>{pendingLeaves.length}</div>
          </div>
          <div style={styles.card}>
            <div style={styles.cardLabel}>This Month Payroll</div>
            <div style={styles.cardValue}>KES {thisMonthPayroll.toLocaleString()}</div>
          </div>
        </div>

        <div style={styles.section}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h2 style={{ ...styles.sectionTitle, margin: 0 }}>Employees</h2>
            <button style={styles.ghost} onClick={handleExportEmployeesCSV}>
              Export CSV
            </button>
          </div>
          <div style={styles.rowControls}>
            <input style={styles.input} placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <select style={styles.select} value={dept} onChange={(e) => setDept(e.target.value)}>
              <option value="all">All departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <select
              style={styles.select}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | EmploymentStatus)}
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="on_leave">On leave</option>
              <option value="terminated">Terminated</option>
            </select>
          </div>
          {loading ? (
            <div style={{ color: "var(--text-muted)" }}>Loading…</div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Role</th>
                  <th style={styles.th}>Dept</th>
                  <th style={styles.th}>Salary</th>
                  <th style={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id}>
                    <td style={styles.td}>{e.full_name}</td>
                    <td style={styles.td}>{e.role ?? "—"}</td>
                    <td style={styles.td}>{e.department ?? "—"}</td>
                    <td style={styles.td}>KES {Number(e.salary).toLocaleString()}</td>
                    <td style={styles.td}>{empStatusBadge(e.employment_status)}</td>
                  </tr>
                ))}
                {!filtered.length && (
                  <tr>
                    <td style={styles.td} colSpan={5}>
                      No employees.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        <div style={styles.section}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h2 style={{ ...styles.sectionTitle, margin: 0 }}>Payroll Runs</h2>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={styles.ghost} onClick={handleExportPayrollCSV}>
                Export CSV
              </button>
              <button style={styles.primary} onClick={handleRunPayroll}>
                Run Payroll
              </button>
            </div>
          </div>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Period</th>
                <th style={styles.th}>Total</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Processed</th>
                <th style={styles.th}></th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id}>
                  <td style={styles.td}>
                    {r.period_start} → {r.period_end}
                  </td>
                  <td style={styles.td}>KES {Number(r.total_amount).toLocaleString()}</td>
                  <td style={styles.td}>{payrollStatusBadge(r.status)}</td>
                  <td style={styles.td}>{r.processed_at ? new Date(r.processed_at).toLocaleDateString() : "—"}</td>
                  <td style={styles.td}>
                    {r.status !== "paid" && (
                      <button style={styles.ghost} onClick={() => advanceRun(r)}>
                        Mark {r.status === "draft" ? "processed" : "paid"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!runs.length && (
                <tr>
                  <td style={styles.td} colSpan={5}>
                    No payroll runs yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Leave Requests</h2>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Employee</th>
                <th style={styles.th}>Type</th>
                <th style={styles.th}>Range</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}></th>
              </tr>
            </thead>
            <tbody>
              {leaves.map((l) => {
                const emp = employees.find((e) => e.id === l.employee_id);
                return (
                  <tr key={l.id}>
                    <td style={styles.td}>{emp?.full_name ?? "—"}</td>
                    <td style={styles.td}>{l.leave_type}</td>
                    <td style={styles.td}>
                      {l.start_date} → {l.end_date}
                    </td>
                    <td style={styles.td}>{leaveStatusBadge(l.status)}</td>
                    <td style={styles.td}>
                      {l.status === "pending" && (
                        <div style={{ display: "flex", gap: 6 }}>
                          <button style={styles.success} onClick={() => decideLeave(l, "approved")}>
                            Approve
                          </button>
                          <button style={styles.danger} onClick={() => decideLeave(l, "rejected")}>
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!leaves.length && (
                <tr>
                  <td style={styles.td} colSpan={5}>
                    No leave requests.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <aside style={styles.side}>
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Alerts</h2>
          <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7 }}>
            {pendingLeaves.length > 0 && (
              <div style={{ color: "var(--gold)" }}>{pendingLeaves.length} leave request(s) awaiting review</div>
            )}
            {runs.some((r) => r.status === "draft") && <div style={{ color: "var(--gold)" }}>Draft payroll runs pending</div>}
            {!pendingLeaves.length && !runs.some((r) => r.status === "draft") && <div>All clear.</div>}
          </div>
        </div>
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Headcount</h2>
          <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7 }}>
            <div>Active: {employees.filter((e) => e.employment_status === "active").length}</div>
            <div>On leave: {employees.filter((e) => e.employment_status === "on_leave").length}</div>
            <div>Terminated: {employees.filter((e) => e.employment_status === "terminated").length}</div>
          </div>
        </div>
      </aside>

      {showNew && <NewEmployeeModal onClose={() => setShowNew(false)} onSubmit={handleCreate} />}
    </div>
  );
}

function NewEmployeeModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (v: Omit<Employee, "id" | "created_at" | "org_id">) => void;
}) {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    role: "",
    department: "",
    employment_status: "active" as EmploymentStatus,
    salary: "",
    hire_date: "",
  });
  return (
    <div style={styles.modalBackdrop} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>New Employee</h3>
        {(["full_name", "email", "phone", "role", "department", "salary", "hire_date"] as const).map((k) => (
          <div key={k} style={styles.field}>
            <label style={styles.label}>{k}</label>
            <input
              style={styles.input}
              type={k === "salary" ? "number" : k === "hire_date" ? "date" : "text"}
              value={form[k]}
              onChange={(e) => setForm({ ...form, [k]: e.target.value })}
            />
          </div>
        ))}
        <div style={styles.field}>
          <label style={styles.label}>employment_status</label>
          <select
            style={styles.select}
            value={form.employment_status}
            onChange={(e) => setForm({ ...form, employment_status: e.target.value as EmploymentStatus })}
          >
            <option value="active">Active</option>
            <option value="on_leave">On leave</option>
            <option value="terminated">Terminated</option>
          </select>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
          <button style={styles.ghost} onClick={onClose}>
            Cancel
          </button>
          <button
            style={styles.primary}
            disabled={!form.full_name}
            onClick={() =>
              onSubmit({
                full_name: form.full_name,
                email: form.email || null,
                phone: form.phone || null,
                role: form.role || null,
                department: form.department || null,
                employment_status: form.employment_status,
                salary: Number(form.salary) || 0,
                hire_date: form.hire_date || null,
              })
            }
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
