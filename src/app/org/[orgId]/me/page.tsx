"use client";

import { useEffect, useState } from "react";
import { useEngine } from "@/lib/runtime/EngineContext";
import {
  getMyEmployeeRecord,
  getPayrollHistoryForEmployee,
  getLeaveHistoryForEmployee,
  requestLeave,
  ensureFounderEmployeeRecord,
  type EmployeeProfile,
  type PayrollHistoryItem,
  type LeaveHistoryItem,
} from "@/lib/employeeHub";
import EmptyState from "@/components/EmptyState";
import { formatError } from "@/lib/errorFormat";

const LEAVE_TYPES = ["annual", "sick", "unpaid"];

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  pending: { bg: "#e8b92322", fg: "#e8b923" },
  approved: { bg: "var(--green-glow)", fg: "var(--green)" },
  rejected: { bg: "#ef444422", fg: "#ef4444" },
};

export default function MyProfilePage() {
  const { organization, membership } = useEngine();

  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<EmployeeProfile | null>(null);
  const [payrollHistory, setPayrollHistory] = useState<PayrollHistoryItem[]>([]);
  const [leaveHistory, setLeaveHistory] = useState<LeaveHistoryItem[]>([]);

  const [leaveType, setLeaveType] = useState("annual");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    if (!membership.userId) {
      setLoading(false);
      return;
    }
    const emp = await getMyEmployeeRecord(organization.id, membership.userId)
      ?? (membership.isFounder
        ? await ensureFounderEmployeeRecord(organization.id, membership.userId, membership.userEmail)
        : null);
    setEmployee(emp);
    if (emp) {
      const [payroll, leave] = await Promise.all([
        getPayrollHistoryForEmployee(emp.id),
        getLeaveHistoryForEmployee(emp.id),
      ]);
      setPayrollHistory(payroll);
      setLeaveHistory(leave);
    }
    setLoading(false);
  }

  async function handleLeaveSubmit() {
    if (!employee || !startDate || !endDate) return;
    if (new Date(endDate) < new Date(startDate)) {
      setSubmitError("End date can't be before the start date.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      await requestLeave(organization.id, employee.id, leaveType, startDate, endDate);
      setStartDate("");
      setEndDate("");
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
      const leave = await getLeaveHistoryForEmployee(employee.id);
      setLeaveHistory(leave);
    } catch (err: any) {
      setSubmitError(formatError(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div>Loading your profile...</div>;

  if (!employee) {
    return (
      <EmptyState
        icon="🪪"
        message="No employee profile linked to your account yet. Ask an admin to check Team & Access."
      />
    );
  }

  const pendingLeaveCount = leaveHistory.filter((l) => l.status === "pending").length;

  return (
    <div style={{ overflowY: "auto", height: "100%" }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>{employee.full_name}</h1>
        <p style={{ color: "var(--text-muted)", fontSize: 12 }}>
          {employee.role}{employee.department ? ` · ${employee.department}` : ""}
        </p>
      </div>

      {/* Profile summary */}
      <div
        className="card"
        style={{ ...cardStyle, marginBottom: 14, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}
      >
        <div>
          <div style={labelStyle}>Status</div>
          <div style={{ fontWeight: 600, fontSize: 13, textTransform: "capitalize" }}>{employee.employment_status}</div>
        </div>
        <div>
          <div style={labelStyle}>Hire Date</div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{employee.hire_date}</div>
        </div>
        <div>
          <div style={labelStyle}>Email</div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{employee.email || "—"}</div>
        </div>
        <div>
          <div style={labelStyle}>Phone</div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{employee.phone || "—"}</div>
        </div>
      </div>

      {/* Request leave */}
      <div className="card" style={{ ...cardStyle, marginBottom: 14 }}>
        <h3 style={headingStyle}>Request Leave</h3>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <div style={labelStyle}>Type</div>
            <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)} style={inputStyle}>
              {LEAVE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <div style={labelStyle}>Start date</div>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <div style={labelStyle}>End date</div>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={inputStyle} />
          </div>
          <button
            onClick={handleLeaveSubmit}
            disabled={submitting || !startDate || !endDate}
            style={{
              background: "var(--gold)",
              color: "var(--gold-contrast)",
              border: "none",
              borderRadius: 10,
              padding: "9px 18px",
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
              opacity: submitting || !startDate || !endDate ? 0.6 : 1,
            }}
          >
            {submitting ? "Submitting..." : "Submit Request"}
          </button>
        </div>
        {submitError && <div style={{ color: "#ef4444", fontSize: 12, marginTop: 8 }}>{submitError}</div>}
        {submitted && <div style={{ color: "var(--green)", fontSize: 12, marginTop: 8 }}>Request submitted.</div>}
        {pendingLeaveCount > 0 && (
          <div style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 8 }}>
            You have {pendingLeaveCount} request{pendingLeaveCount === 1 ? "" : "s"} awaiting a decision.
          </div>
        )}
      </div>

      {/* Leave history */}
      <div className="card" style={{ ...cardStyle, marginBottom: 14, width: "fit-content", maxWidth: "100%" }}>
        <h3 style={headingStyle}>Leave History</h3>
        {leaveHistory.length === 0 ? (
          <div style={{ color: "var(--text-muted)", fontSize: 12 }}>No leave requests yet.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "max-content max-content max-content", columnGap: 18, width: "fit-content" }}>
            {leaveHistory.map((l) => {
              const colors = STATUS_COLORS[l.status] || STATUS_COLORS.pending;
              return (
                <div key={l.id} style={{ display: "contents" }}>
                  <div style={{ fontSize: 11.5, padding: "6px 0", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }}>
                    {l.leave_type}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)", padding: "6px 0", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }}>
                    {l.start_date} → {l.end_date}
                  </div>
                  <div style={{ padding: "6px 0", borderBottom: "1px solid var(--border)", alignSelf: "center" }}>
                    <span
                      style={{
                        fontSize: 9,
                        padding: "1px 7px",
                        borderRadius: 999,
                        background: colors.bg,
                        color: colors.fg,
                        textTransform: "capitalize",
                      }}
                    >
                      {l.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Payroll history */}
      <div className="card" style={{ ...cardStyle, width: "fit-content", maxWidth: "100%" }}>
        <h3 style={headingStyle}>Payroll History</h3>
        {payrollHistory.length === 0 ? (
          <div style={{ color: "var(--text-muted)", fontSize: 12 }}>No payroll runs recorded yet.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "max-content max-content max-content max-content", columnGap: 18, width: "fit-content" }}>
            {payrollHistory.map((p) => (
              <div key={p.id} style={{ display: "contents" }}>
                <div style={{ fontSize: 11.5, padding: "6px 0", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }}>
                  {p.payroll_runs?.period_start} → {p.payroll_runs?.period_end}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)", padding: "6px 0", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }}>
                  Gross KES {Number(p.gross_pay).toLocaleString()}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)", padding: "6px 0", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }}>
                  Deductions KES {Number(p.deductions).toLocaleString()}
                </div>
                <div style={{ fontSize: 11.5, fontWeight: 700, padding: "6px 0", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }}>
                  Net KES {Number(p.net_pay).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: "14px 16px",
};

const headingStyle: React.CSSProperties = {
  fontSize: 12.5,
  fontWeight: 700,
  marginBottom: 10,
  color: "var(--text-primary)",
};

const labelStyle: React.CSSProperties = {
  fontSize: 10.5,
  color: "var(--text-muted)",
  marginBottom: 3,
};

const inputStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--bg-base)",
  color: "var(--text-primary)",
  fontSize: 12,
};
