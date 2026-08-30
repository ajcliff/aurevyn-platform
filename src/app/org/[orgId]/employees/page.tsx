"use client";

import { useEffect, useState } from "react";
import { useEngine } from "@/lib/runtime/EngineContext";
import Drawer from "@/components/Drawer";
import { getTeamMembers, updateMemberRole, type TeamMember, type TeamRole } from "@/lib/team";
import {
  getAllEmployees,
  updateEmployeeStatus,
  getPayrollHistoryForEmployee,
  getLeaveHistoryForEmployee,
  getMyEmployeeRecord,
  getMyBroadcasts,
  requestLeave,
  sendBroadcast,
  linkEmployeeToUser,
  getUnlinkedTeamMembers,
  type EmployeeProfile,
  type Broadcast,
  type UnlinkedMember,
  type PayrollHistoryItem,
  type LeaveHistoryItem,
} from "@/lib/employeeHub";

type Tab = "directory" | "broadcast" | "profile";

export default function EmployeeHubPage() {
  const { organization, membership, installedEngines } = useEngine();

  const isHRAdmin = membership.isFounder || membership.role === "owner" || membership.role === "admin";
  const canEditEmployees = isHRAdmin || !!membership.hrPermissions.edit_employees;
  const canApproveLeave = isHRAdmin || !!membership.hrPermissions.approve_leave;
  const canViewSalary = isHRAdmin || !!membership.hrPermissions.view_salary;
  const canBroadcast = isHRAdmin || !!membership.hrPermissions.broadcast;
  const hasAnyHRAccess = canEditEmployees || canApproveLeave || canBroadcast;

  const [tab, setTab] = useState<Tab>(hasAnyHRAccess ? "directory" : "profile");
  const [loading, setLoading] = useState(true);

  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selected, setSelected] = useState<EmployeeProfile | null>(null);
  const [payroll, setPayroll] = useState<PayrollHistoryItem[]>([]);
  const [leave, setLeave] = useState<LeaveHistoryItem[]>([]);

  const [myRecord, setMyRecord] = useState<EmployeeProfile | null>(null);
  const [myPayroll, setMyPayroll] = useState<PayrollHistoryItem[]>([]);
  const [myLeave, setMyLeave] = useState<LeaveHistoryItem[]>([]);
  const [myBroadcasts, setMyBroadcasts] = useState<Broadcast[]>([]);

  const [leaveType, setLeaveType] = useState("annual");
  const [leaveStart, setLeaveStart] = useState("");
  const [leaveEnd, setLeaveEnd] = useState("");

  const [bTitle, setBTitle] = useState("");
  const [bMessage, setBMessage] = useState("");
  const [bAudienceType, setBAudienceType] = useState<"all" | "department" | "individual">("all");
  const [bAudienceValue, setBAudienceValue] = useState("");

  const [unlinkedMembers, setUnlinkedMembers] = useState<UnlinkedMember[]>([]);
  const [linkChoice, setLinkChoice] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);

    if (hasAnyHRAccess) {
      const [emps, members, unlinked] = await Promise.all([
        getAllEmployees(organization.id),
        getTeamMembers(organization.id),
        getUnlinkedTeamMembers(organization.id),
      ]);
      setEmployees(emps);
      setTeamMembers(members);
      setUnlinkedMembers(unlinked);
    }

    if (membership.userId) {
      const mine = await getMyEmployeeRecord(organization.id, membership.userId);
      setMyRecord(mine);

      if (mine) {
        const [pay, lv, bc] = await Promise.all([
          getPayrollHistoryForEmployee(mine.id),
          getLeaveHistoryForEmployee(mine.id),
          getMyBroadcasts(organization.id, mine.department, mine.id),
        ]);
        setMyPayroll(pay);
        setMyLeave(lv);
        setMyBroadcasts(bc);
      }
    }

    setLoading(false);
  }

  async function openEmployee(emp: EmployeeProfile) {
    setSelected(emp);
    const [pay, lv] = await Promise.all([
      getPayrollHistoryForEmployee(emp.id),
      getLeaveHistoryForEmployee(emp.id),
    ]);
    setPayroll(pay);
    setLeave(lv);
  }

  async function handleStatusChange(emp: EmployeeProfile, status: string) {
    await updateEmployeeStatus(emp.id, status);
    load();
    if (selected?.id === emp.id) setSelected({ ...emp, employment_status: status });
  }

  function findAccessFor(emp: EmployeeProfile): TeamMember | undefined {
    return teamMembers.find((m) => m.user_id === emp.user_id);
  }

  async function handleAccessRoleChange(emp: EmployeeProfile, role: TeamRole) {
    const access = findAccessFor(emp);
    if (!access) return;
    await updateMemberRole(access.id, role, access.allowed_engines);
    load();
  }

  async function handleSubmitLeave() {
    if (!myRecord || !leaveStart || !leaveEnd) return;
    await requestLeave(organization.id, myRecord.id, leaveType, leaveStart, leaveEnd);
    setLeaveStart("");
    setLeaveEnd("");
    load();
  }

  async function handleLinkToLogin(emp: EmployeeProfile) {
    if (!linkChoice) return;
    await linkEmployeeToUser(emp.id, linkChoice);
    setLinkChoice("");
    load();
  }

  async function handleSendBroadcast() {
    if (!bTitle || !bMessage || !membership.userId) return;
    await sendBroadcast(
      organization.id,
      membership.userId,
      "HR",
      bTitle,
      bMessage,
      bAudienceType,
      bAudienceType === "all" ? null : bAudienceValue
    );
    setBTitle("");
    setBMessage("");
    setBAudienceType("all");
    setBAudienceValue("");
    alert("Broadcast sent");
  }

  if (loading) return <div>Loading Employee Hub...</div>;

  const departments = Array.from(new Set(employees.map((e) => e.department).filter(Boolean))) as string[];

  return (
    <div style={{ overflowY: "auto", height: "100%" }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Employee Hub</h1>
        <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
          {hasAnyHRAccess ? "Directory, access, and broadcasts for your team." : "Your profile, pay, and leave."}
        </p>
      </div>

      {hasAnyHRAccess && (
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <TabButton label="Directory" active={tab === "directory"} onClick={() => setTab("directory")} />
          {canBroadcast && (
            <TabButton label="Broadcast" active={tab === "broadcast"} onClick={() => setTab("broadcast")} />
          )}
          <TabButton label="My Profile" active={tab === "profile"} onClick={() => setTab("profile")} />
        </div>
      )}

      {tab === "directory" && hasAnyHRAccess && (
        <>
          {employees.length === 0 ? (
            <div className="card" style={{ ...cardStyle, textAlign: "center", color: "var(--text-muted)" }}>
              No employees yet.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
              {employees.map((emp) => (
                <div
                  key={emp.id}
                  onClick={() => openEmployee(emp)}
                  className="card"
                  style={{ ...cardStyle, padding: 14, cursor: "pointer", display: "flex", flexDirection: "column", gap: 6 }}
                >
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{emp.full_name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{emp.role}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{emp.department || "—"}</span>
                    <StatusBadge status={emp.employment_status} />
                  </div>
                </div>
              ))}
            </div>
          )}

          <Drawer
            open={!!selected}
            onClose={() => setSelected(null)}
            title={selected?.full_name ?? ""}
            width={480}
          >
            {selected && (
              <>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: -8, marginBottom: 16 }}>
                  {selected.role} · {selected.department || "No department"}
                </p>

                <div>
                  <label style={labelStyle}>Employment status</label>
                  <select
                    value={selected.employment_status}
                    onChange={(e) => handleStatusChange(selected, e.target.value)}
                    disabled={!canEditEmployees}
                    style={inputStyle}
                  >
                    <option value="active">Active</option>
                    <option value="on_leave">On Leave</option>
                    <option value="terminated">Terminated</option>
                  </select>
                </div>

                {canViewSalary && (
                  <div style={{ marginTop: 10, fontSize: 13 }}>
                    <strong>Salary:</strong> KES {Number(selected.salary).toLocaleString()}
                  </div>
                )}

                {canEditEmployees && findAccessFor(selected) && (
                  <div style={{ marginTop: 16 }}>
                    <label style={labelStyle}>Platform access role</label>
                    <select
                      value={findAccessFor(selected)?.role}
                      onChange={(e) => handleAccessRoleChange(selected, e.target.value as TeamRole)}
                      style={inputStyle}
                    >
                      <option value="admin">Admin</option>
                      <option value="manager">Manager</option>
                      <option value="staff">Staff</option>
                    </select>
                    <p style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      To change which engines they can see, use the Team page.
                    </p>
                  </div>
                )}

                {canEditEmployees && !findAccessFor(selected) && (
                  <div style={{ marginTop: 16 }}>
                    {unlinkedMembers.length > 0 ? (
                      <>
                        <label style={labelStyle}>Link to an existing login</label>
                        <select value={linkChoice} onChange={(e) => setLinkChoice(e.target.value)} style={inputStyle}>
                          <option value="">Select a team member...</option>
                          {unlinkedMembers.map((m) => (
                            <option key={m.user_id} value={m.user_id}>
                              {m.full_name || m.email} ({m.role})
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleLinkToLogin(selected)}
                          disabled={!linkChoice}
                          style={{ ...buttonGold, width: "100%" }}
                        >
                          Link Account
                        </button>
                      </>
                    ) : (
                      <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        No unlinked logins available. Invite them from the Team page first.
                      </p>
                    )}
                  </div>
                )}

                <div style={{ marginTop: 20 }}>
                  <h4 style={{ marginBottom: 8 }}>Leave History</h4>
                  {leave.map((lv) => (
                    <div key={lv.id} style={rowStyle}>
                      <span>{lv.leave_type}</span>
                      <span>{lv.start_date} → {lv.end_date}</span>
                      <StatusBadge status={lv.status} />
                    </div>
                  ))}
                  {leave.length === 0 && <div style={{ color: "var(--text-muted)", fontSize: 12 }}>No leave history.</div>}
                </div>

                {canViewSalary && (
                  <div style={{ marginTop: 20 }}>
                    <h4 style={{ marginBottom: 8 }}>Payroll History</h4>
                    {payroll.map((p) => (
                      <div key={p.id} style={rowStyle}>
                        <span>{p.payroll_runs?.period_start} → {p.payroll_runs?.period_end}</span>
                        <span>KES {Number(p.net_pay).toLocaleString()}</span>
                      </div>
                    ))}
                    {payroll.length === 0 && <div style={{ color: "var(--text-muted)", fontSize: 12 }}>No payroll history.</div>}
                  </div>
                )}
              </>
            )}
          </Drawer>
        </>
      )}

      {tab === "broadcast" && canBroadcast && (
        <div className="card" style={{ ...cardStyle, maxWidth: 480 }}>
          <h3 style={{ marginBottom: 12 }}>Send a Broadcast</h3>

          <input placeholder="Title" value={bTitle} onChange={(e) => setBTitle(e.target.value)} style={inputStyle} />
          <textarea
            placeholder="Message"
            value={bMessage}
            onChange={(e) => setBMessage(e.target.value)}
            style={{ ...inputStyle, minHeight: 90 }}
          />

          <label style={labelStyle}>Audience</label>
          <select value={bAudienceType} onChange={(e) => setBAudienceType(e.target.value as any)} style={inputStyle}>
            <option value="all">Everyone</option>
            <option value="department">A department</option>
            <option value="individual">One employee</option>
          </select>

          {bAudienceType === "department" && (
            <select value={bAudienceValue} onChange={(e) => setBAudienceValue(e.target.value)} style={inputStyle}>
              <option value="">Select department</option>
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          )}

          {bAudienceType === "individual" && (
            <select value={bAudienceValue} onChange={(e) => setBAudienceValue(e.target.value)} style={inputStyle}>
              <option value="">Select employee</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.full_name}</option>
              ))}
            </select>
          )}

          <button onClick={handleSendBroadcast} style={{ ...buttonGold, width: "100%", marginTop: 10 }}>
            Send Broadcast
          </button>
        </div>
      )}

      {tab === "profile" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 600 }}>
          {!myRecord ? (
            <div className="card" style={cardStyle}>
              <p style={{ color: "var(--text-muted)" }}>
                You're not linked to an employee record yet. Ask your admin to link your account from the Employee Hub directory.
              </p>
            </div>
          ) : (
            <>
              <div className="card" style={cardStyle}>
                <h3>{myRecord.full_name}</h3>
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  {myRecord.role} · {myRecord.department || "No department"}
                </p>
                <div style={{ marginTop: 10, fontSize: 13 }}>
                  Status: <StatusBadge status={myRecord.employment_status} />
                </div>
              </div>

              <div className="card" style={cardStyle}>
                <h4 style={{ marginBottom: 10 }}>Request Leave</h4>
                <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)} style={inputStyle}>
                  <option value="annual">Annual</option>
                  <option value="sick">Sick</option>
                  <option value="unpaid">Unpaid</option>
                </select>
                <div style={{ display: "flex", gap: 10 }}>
                  <input type="date" value={leaveStart} onChange={(e) => setLeaveStart(e.target.value)} style={inputStyle} />
                  <input type="date" value={leaveEnd} onChange={(e) => setLeaveEnd(e.target.value)} style={inputStyle} />
                </div>
                <button onClick={handleSubmitLeave} style={{ ...buttonGold, width: "100%" }}>
                  Submit Request
                </button>

                <div style={{ marginTop: 16 }}>
                  {myLeave.map((lv) => (
                    <div key={lv.id} style={rowStyle}>
                      <span>{lv.leave_type}</span>
                      <span>{lv.start_date} → {lv.end_date}</span>
                      <StatusBadge status={lv.status} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="card" style={cardStyle}>
                <h4 style={{ marginBottom: 10 }}>My Payslips</h4>
                {myPayroll.map((p) => (
                  <div key={p.id} style={rowStyle}>
                    <span>{p.payroll_runs?.period_start} → {p.payroll_runs?.period_end}</span>
                    <span>KES {Number(p.net_pay).toLocaleString()}</span>
                  </div>
                ))}
                {myPayroll.length === 0 && <div style={{ color: "var(--text-muted)", fontSize: 12 }}>No payslips yet.</div>}
              </div>

              <div className="card" style={cardStyle}>
                <h4 style={{ marginBottom: 10 }}>Broadcasts</h4>
                {myBroadcasts.map((b) => (
                  <div key={b.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                    <div style={{ fontWeight: 600 }}>{b.title}</div>
                    <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{b.message}</div>
                  </div>
                ))}
                {myBroadcasts.length === 0 && <div style={{ color: "var(--text-muted)", fontSize: 12 }}>No broadcasts yet.</div>}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 16px",
        borderRadius: 8,
        border: "1px solid var(--border)",
        background: active ? "var(--gold)" : "transparent",
        color: active ? "#07070f" : "var(--text-secondary)",
        fontWeight: active ? 700 : 500,
        fontSize: 12,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "#3dd68c",
    approved: "#3dd68c",
    on_leave: "#e8b923",
    pending: "#e8b923",
    terminated: "#ef4444",
    rejected: "#ef4444",
  };
  return (
    <span style={{ fontSize: 11, color: colors[status] || "var(--text-muted)", textTransform: "capitalize" }}>
      {status?.replace("_", " ")}
    </span>
  );
}

const cardStyle: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 14,
  padding: 20,
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  fontSize: 13,
  padding: "8px 0",
  borderBottom: "1px solid var(--border)",
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--text-muted)",
  display: "block",
  marginBottom: 4,
  marginTop: 10,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--bg-base)",
  color: "var(--text-primary)",
  marginBottom: 10,
  fontSize: 13,
};

const buttonGold: React.CSSProperties = {
  background: "var(--gold)",
  color: "#07070f",
  border: "none",
  borderRadius: 10,
  padding: "10px 18px",
  fontWeight: 700,
  fontSize: 12,
  cursor: "pointer",
};

const ghostButton: React.CSSProperties = {
  padding: "6px 14px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--text-secondary)",
  fontSize: 12,
  cursor: "pointer",
};
