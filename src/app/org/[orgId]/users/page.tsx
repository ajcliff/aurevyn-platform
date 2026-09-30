"use client";

import { useEffect, useState } from "react";
import { useEngine } from "@/lib/runtime/EngineContext";
import { canManageTeam } from "@/lib/permissions";
import { getTeamMembers, removeMember, updateMemberRole, type TeamMember, type TeamRole } from "@/lib/team";
import {
  getOrgLicenseOverview,
  getDepartments,
  createDepartment,
  getDepartmentDefaultEngineIds,
  setDepartmentDefaultEngines,
  assignEngineLicense,
  revokeEngineLicense,
  revokeAllLicensesForUser,
  type EngineLicenseOverview,
  type Department,
} from "@/lib/licensing";
import EmptyState from "@/components/EmptyState";

const ROLES: TeamRole[] = ["admin", "manager", "staff"];

export default function UsersPage() {
  const { organization, membership } = useEngine();
  const canManage = canManageTeam(membership);

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [overview, setOverview] = useState<EngineLicenseOverview[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [showDepts, setShowDepts] = useState(false);

  async function load() {
    setLoading(true);
    const [m, o, d] = await Promise.all([
      getTeamMembers(organization.id),
      getOrgLicenseOverview(organization.id),
      getDepartments(organization.id),
    ]);
    setMembers(m);
    setOverview(o.filter((e) => e.enabled));
    setDepartments(d);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleLicense(member: TeamMember, engine: EngineLicenseOverview) {
    const has = engine.licensedUserIds.includes(member.user_id);
    if (has) {
      await revokeEngineLicense(organization.id, member.user_id, engine.engineId);
    } else {
      const { error } = await assignEngineLicense(organization.id, member.user_id, engine.engineId);
      if (error) {
        alert(error);
        return;
      }
    }
    load();
  }

  async function handleRoleChange(member: TeamMember, role: TeamRole) {
    await updateMemberRole(member.id, role, member.allowed_engines);
    load();
  }

  async function handleRemove(member: TeamMember) {
    if (!confirm(`Remove ${member.full_name || member.email} from this organization?`)) return;
    await removeMember(member.id, organization.id, member.full_name || member.email || "member");
    // Free up every seat this person was holding
    await revokeAllLicensesForUser(organization.id, member.user_id);
    load();
  }

  if (!canManage) {
    return <EmptyState icon="🔒" message="Only owners and admins can manage users." />;
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <h1 style={{ fontSize: 20 }}>Users</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={ghostButton} onClick={() => setShowDepts(true)}>Departments</button>
          <button style={buttonGold} onClick={() => setShowCreate(true)}>+ Create User</button>
        </div>
      </div>
      <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>
        Create accounts directly — no invite links to send. One user takes one seat per engine they're licensed for.
      </p>

      {loading ? (
        "Loading..."
      ) : members.length === 0 ? (
        <EmptyState icon="👥" message="No users yet." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {members.map((m) => (
            <div key={m.id} style={{ ...cardStyle, display: "grid", gridTemplateColumns: "1.2fr 1fr auto", gap: 16, alignItems: "start" }}>
              <div>
                <div style={{ fontWeight: 600 }}>{m.full_name || m.email}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{m.email}</div>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {overview.map((e) => {
                  const has = e.licensedUserIds.includes(m.user_id);
                  return (
                    <button
                      key={e.engineId}
                      onClick={() => toggleLicense(m, e)}
                      title={has ? "Click to revoke license" : "Click to assign license"}
                      style={{
                        padding: "3px 10px",
                        borderRadius: 14,
                        fontSize: 11,
                        cursor: "pointer",
                        border: "1px solid var(--border)",
                        background: has ? "var(--gold)" : "transparent",
                        color: has ? "#07070f" : "var(--text-muted)",
                        fontWeight: has ? 700 : 400,
                      }}
                    >
                      {e.engineName}
                    </button>
                  );
                })}
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {m.role === "owner" ? (
                  <span style={{ color: "var(--red, #e5604a)", fontWeight: 700, fontSize: 12 }}>Owner</span>
                ) : (
                  <>
                    <select
                      value={m.role}
                      onChange={(e) => handleRoleChange(m, e.target.value as TeamRole)}
                      style={smallInputStyle}
                    >
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <button style={ghostButton} onClick={() => handleRemove(m)}>Remove</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateUserModal
          orgId={organization.id}
          departments={departments}
          overview={overview}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load(); }}
        />
      )}

      {showDepts && (
        <DepartmentsModal
          orgId={organization.id}
          departments={departments}
          overview={overview}
          onClose={() => setShowDepts(false)}
          onChanged={load}
        />
      )}
    </div>
  );
}

function CreateUserModal({
  orgId,
  departments,
  overview,
  onClose,
  onCreated,
}: {
  orgId: string;
  departments: Department[];
  overview: EngineLicenseOverview[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TeamRole>("staff");
  const [departmentId, setDepartmentId] = useState("");
  const [engineIds, setEngineIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ tempPassword: string; warnings: string[] } | null>(null);

  async function pickDepartment(id: string) {
    setDepartmentId(id);
    if (!id) return;
    const defaults = await getDepartmentDefaultEngineIds(id);
    setEngineIds(new Set(defaults.filter((eid) => overview.some((o) => o.engineId === eid))));
  }

  function toggleEngine(id: string) {
    setEngineIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submit() {
    if (!fullName.trim() || !email.trim()) {
      setError("Name and email are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/team/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          fullName,
          email,
          role,
          departmentId: departmentId || null,
          engineIds: Array.from(engineIds),
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error || "Failed to create user.");
        return;
      }
      setResult({ tempPassword: body.tempPassword, warnings: body.licenseWarnings ?? [] });
    } finally {
      setSaving(false);
    }
  }

  if (result) {
    return (
      <div style={overlayStyle}>
        <div style={modalStyle}>
          <h2 style={{ marginBottom: 6 }}>User created</h2>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>
            Share this temporary password with {fullName} directly. It's only shown once — they can change it after signing in.
          </p>
          <div style={{ padding: 14, borderRadius: 10, background: "var(--bg-base)", border: "1px solid var(--border)", fontFamily: "monospace", fontSize: 16, textAlign: "center", marginBottom: 12 }}>
            {result.tempPassword}
          </div>
          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Login email: {email}</p>
          {result.warnings.length > 0 && (
            <p style={{ fontSize: 12, color: "#f59e0b", marginTop: 8 }}>
              Account created, but some licenses couldn't be assigned: {result.warnings.join("; ")}
            </p>
          )}
          <button style={{ ...buttonGold, width: "100%", marginTop: 16 }} onClick={onCreated}>Done</button>
        </div>
      </div>
    );
  }

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h2 style={{ marginBottom: 16 }}>Create User</h2>

        <label style={labelSmall}>Full name</label>
        <input style={fullInput} value={fullName} onChange={(e) => setFullName(e.target.value)} />

        <label style={labelSmall}>Email (this is their login)</label>
        <input style={fullInput} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={labelSmall}>Role</label>
            <select style={fullInput} value={role} onChange={(e) => setRole(e.target.value as TeamRole)}>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label style={labelSmall}>Department</label>
            <select style={fullInput} value={departmentId} onChange={(e) => pickDepartment(e.target.value)}>
              <option value="">None</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        </div>

        <label style={labelSmall}>Engine licenses</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "6px 0 12px" }}>
          {overview.map((e) => {
            const full = e.seatsUsed >= e.licensedSeats;
            const picked = engineIds.has(e.engineId);
            return (
              <button
                key={e.engineId}
                onClick={() => !full && toggleEngine(e.engineId)}
                disabled={full}
                title={full ? "No seats left — purchase more in Engines" : `${e.licensedSeats - e.seatsUsed} seat(s) left`}
                style={{
                  padding: "4px 12px",
                  borderRadius: 14,
                  fontSize: 12,
                  cursor: full ? "not-allowed" : "pointer",
                  opacity: full ? 0.4 : 1,
                  border: "1px solid var(--border)",
                  background: picked ? "var(--gold)" : "transparent",
                  color: picked ? "#07070f" : "var(--text-secondary)",
                }}
              >
                {e.engineName} ({e.licensedSeats - e.seatsUsed} left)
              </button>
            );
          })}
        </div>

        {error && <div style={{ color: "#ff6b6b", fontSize: 12, marginBottom: 8 }}>{error}</div>}

        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button style={ghostButton} onClick={onClose}>Cancel</button>
          <button style={{ ...buttonGold, flex: 1 }} onClick={submit} disabled={saving}>
            {saving ? "Creating..." : "Create Account"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DepartmentsModal({
  orgId,
  departments,
  overview,
  onClose,
  onChanged,
}: {
  orgId: string;
  departments: Department[];
  overview: EngineLicenseOverview[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editEngineIds, setEditEngineIds] = useState<Set<string>>(new Set());

  async function add() {
    if (!newName.trim()) return;
    await createDepartment(orgId, newName.trim());
    setNewName("");
    onChanged();
  }

  async function startEdit(id: string) {
    setEditing(id);
    const ids = await getDepartmentDefaultEngineIds(id);
    setEditEngineIds(new Set(ids));
  }

  async function saveEdit() {
    if (!editing) return;
    await setDepartmentDefaultEngines(editing, Array.from(editEngineIds));
    setEditing(null);
  }

  function toggle(id: string) {
    setEditEngineIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h2 style={{ marginBottom: 6 }}>Departments</h2>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 14 }}>
          Each department can have default engines. Pick a department when creating a user and their licenses are pre-selected.
        </p>

        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <input style={{ ...fullInput, margin: 0 }} placeholder="e.g. Finance, Sales, IT, Directors" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <button style={buttonGold} onClick={add}>Add</button>
        </div>

        {departments.length === 0 ? (
          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>No departments yet.</p>
        ) : (
          departments.map((d) => (
            <div key={d.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{d.name}</span>
                <button style={ghostButton} onClick={() => (editing === d.id ? setEditing(null) : startEdit(d.id))}>
                  {editing === d.id ? "Close" : "Default engines"}
                </button>
              </div>
              {editing === d.id && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {overview.map((e) => (
                      <button
                        key={e.engineId}
                        onClick={() => toggle(e.engineId)}
                        style={{
                          padding: "3px 10px",
                          borderRadius: 14,
                          fontSize: 11,
                          cursor: "pointer",
                          border: "1px solid var(--border)",
                          background: editEngineIds.has(e.engineId) ? "var(--gold)" : "transparent",
                          color: editEngineIds.has(e.engineId) ? "#07070f" : "var(--text-muted)",
                        }}
                      >
                        {e.engineName}
                      </button>
                    ))}
                  </div>
                  <button style={{ ...buttonGold, marginTop: 10 }} onClick={saveEdit}>Save</button>
                </div>
              )}
            </div>
          ))
        )}

        <button style={{ ...ghostButton, width: "100%", marginTop: 16 }} onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: 16 };
const labelSmall: React.CSSProperties = { fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4, marginTop: 10 };
const fullInput: React.CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-base)", color: "var(--text-primary)", fontSize: 13, marginBottom: 4 };
const smallInputStyle: React.CSSProperties = { padding: "4px 6px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-base)", color: "var(--text-primary)", fontSize: 12 };
const buttonGold: React.CSSProperties = { background: "var(--gold)", color: "#07070f", border: "none", borderRadius: 10, padding: "8px 16px", fontWeight: 700, fontSize: 12, cursor: "pointer" };
const ghostButton: React.CSSProperties = { padding: "7px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 12, cursor: "pointer" };
const overlayStyle: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999 };
const modalStyle: React.CSSProperties = { width: 480, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 24, maxHeight: "85vh", overflowY: "auto" };
