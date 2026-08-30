"use client";

import { useEffect, useState } from "react";
import { useEngine } from "@/lib/runtime/EngineContext";
import { createClient } from "@/lib/supabase";
import {
  getTeamMembers,
  getPendingInvites,
  createInvite,
  revokeInvite,
  updateMemberRole,
  updateMemberEngines,
  removeMember,
  type TeamMember,
  type TeamInvite,
  type TeamRole,
} from "@/lib/team";
import EmptyState from "@/components/EmptyState";

const ROLES: TeamRole[] = ["admin", "manager", "staff"];

export default function TeamPage() {
  const { organization, installedEngines } = useEngine();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);

  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TeamRole>("staff");
  const [restrictEngines, setRestrictEngines] = useState(false);
  const [selectedEngines, setSelectedEngines] = useState<string[]>([]);
  const [lastInviteLink, setLastInviteLink] = useState("");
  const [saving, setSaving] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    load();
  }, []);

  // Real-time: role/access changes made by another admin reflect live
  useEffect(() => {
    if (!organization?.id) return;

    const channel = supabase
      .channel("team-access-page")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "org_users", filter: `org_id=eq.${organization.id}` },
        () => getTeamMembers(organization.id).then(setMembers)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "team_invites", filter: `org_id=eq.${organization.id}` },
        () => getPendingInvites(organization.id).then(setInvites)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organization?.id]);

  async function load() {
    const [m, i] = await Promise.all([
      getTeamMembers(organization.id),
      getPendingInvites(organization.id),
    ]);
    setMembers(m);
    setInvites(i);
    setLoading(false);
  }

  async function handleInvite() {
    if (!email) return;

    try {
      setSaving(true);
      const invite = await createInvite(
        organization.id,
        email,
        role,
        restrictEngines ? selectedEngines : null
      );

      setLastInviteLink(`${window.location.origin}/join/${invite.token}`);
      setEmail("");
      setRole("staff");
      setRestrictEngines(false);
      setSelectedEngines([]);
      await load();
    } catch (err) {
      console.error(err);
      alert("Failed to create invite");
    } finally {
      setSaving(false);
    }
  }

  async function handleRevoke(id: string) {
    await revokeInvite(id);
    load();
  }

  async function handleRoleChange(member: TeamMember, newRole: TeamRole) {
    await updateMemberRole(member.id, newRole, member.allowed_engines);
    load();
  }

  async function handleRemove(id: string) {
    if (!confirm("Remove this team member's access?")) return;
    const member = members.find((m) => m.id === id);
    await removeMember(id, organization.id, member?.full_name || member?.email || "Team member");
    load();
  }

  // License-style toggle: flip a single engine on/off for this member
  async function handleToggleEngine(member: TeamMember, slug: string) {
    const current = member.allowed_engines ?? installedEngines.map((e) => e.engines?.slug ?? "");
    const next = current.includes(slug)
      ? current.filter((s) => s !== slug)
      : [...current, slug];

    // Optimistic update so the toggle feels instant
    setMembers((prev) => prev.map((m) => (m.id === member.id ? { ...m, allowed_engines: next } : m)));
    await updateMemberEngines(member.id, next);
  }

  // Master switch: unrestricted access (null) vs explicit list
  async function handleToggleAllEngines(member: TeamMember, unrestricted: boolean) {
    const next = unrestricted ? null : installedEngines.map((e) => e.engines?.slug ?? "");
    setMembers((prev) => prev.map((m) => (m.id === member.id ? { ...m, allowed_engines: next } : m)));
    await updateMemberEngines(member.id, next);
  }

  if (loading) return <div>Loading team...</div>;

  return (
    <div style={{ overflowY: "auto", height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Team & Access</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
            Manage who has access to {organization.name} and which engines they can use — like assigning licenses.
          </p>
        </div>
        <button onClick={() => setShowInvite(true)} style={buttonGold}>
          + Invite Teammate
        </button>
      </div>

      <div className="card" style={cardStyle}>
        <h3 style={{ marginBottom: 12 }}>Members</h3>

        {members.map((m) => {
          const isUnrestricted = m.allowed_engines === null;
          const grantedCount = isUnrestricted ? installedEngines.length : (m.allowed_engines?.length ?? 0);
          const isExpanded = expandedMemberId === m.id;

          return (
            <div key={m.id} style={{ borderBottom: "1px solid var(--border)" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr 1fr auto auto",
                  alignItems: "center",
                  padding: "10px 0",
                  gap: 10,
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{m.full_name || m.email || "Unnamed"}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{m.email}</div>
                </div>

                {m.role === "owner" ? (
                  <div style={{ color: "var(--gold)", fontWeight: 700, fontSize: 13 }}>Owner</div>
                ) : (
                  <select
                    value={m.role}
                    onChange={(e) => handleRoleChange(m, e.target.value as TeamRole)}
                    style={selectStyle}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                )}

                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {isUnrestricted ? "All engines" : `${grantedCount} of ${installedEngines.length} engines`}
                </div>

                {m.role !== "owner" ? (
                  <button
                    onClick={() => setExpandedMemberId(isExpanded ? null : m.id)}
                    style={ghostButtonSmall}
                  >
                    {isExpanded ? "▲ Hide access" : "▼ Manage access"}
                  </button>
                ) : (
                  <div />
                )}

                {m.role !== "owner" ? (
                  <button onClick={() => handleRemove(m.id)} style={dangerLink}>
                    Remove
                  </button>
                ) : (
                  <div />
                )}
              </div>

              {isExpanded && m.role !== "owner" && (
                <div
                  style={{
                    background: "var(--bg-elevated)",
                    borderRadius: 10,
                    padding: 16,
                    marginBottom: 14,
                  }}
                >
                  <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, fontSize: 13, fontWeight: 600 }}>
                    <ToggleSwitch
                      checked={isUnrestricted}
                      onChange={(v) => handleToggleAllEngines(m, v)}
                    />
                    All Engines (unrestricted)
                  </label>

                  {!isUnrestricted && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
                      {installedEngines.map((e) => {
                        const slug = e.engines?.slug ?? "";
                        const granted = (m.allowed_engines ?? []).includes(slug);
                        return (
                          <label
                            key={slug}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              fontSize: 13,
                              padding: "8px 10px",
                              borderRadius: 8,
                              background: "var(--bg-card)",
                              border: "1px solid var(--border)",
                            }}
                          >
                            <ToggleSwitch checked={granted} onChange={() => handleToggleEngine(m, slug)} />
                            {e.engines?.name ?? slug}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

{members.length === 0 && <EmptyState icon="👥" message="No members yet." />}      </div>

      <div className="card" style={{ ...cardStyle, marginTop: 20 }}>
        <h3 style={{ marginBottom: 12 }}>Pending Invites</h3>

        {invites.map((inv) => (
          <div
            key={inv.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 0",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <div>
              <div style={{ fontWeight: 600 }}>{inv.email}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{inv.role}</div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/join/${inv.token}`);
                  alert("Invite link copied.");
                }}
                style={ghostButtonSmall}
              >
                Copy Link
              </button>
              <button onClick={() => handleRevoke(inv.id)} style={dangerLink}>
                Revoke
              </button>
            </div>
          </div>
        ))}

{invites.length === 0 && <EmptyState icon="✉️" message="No pending invites." />}      </div>

      {showInvite && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h2 style={{ marginBottom: 16 }}>Invite Teammate</h2>

            {lastInviteLink ? (
              <div>
                <p style={{ color: "var(--text-muted)", marginBottom: 8, fontSize: 13 }}>
                  Send this link to your teammate — they'll set their own password.
                </p>
                <input
                  readOnly
                  value={lastInviteLink}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  style={inputStyle}
                />
                <button
                  style={{ ...buttonGold, width: "100%", marginTop: 16 }}
                  onClick={() => {
                    setShowInvite(false);
                    setLastInviteLink("");
                  }}
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <input
                  placeholder="Teammate's email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={inputStyle}
                />

                <select value={role} onChange={(e) => setRole(e.target.value as TeamRole)} style={inputStyle}>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>

                <label style={{ display: "flex", alignItems: "center", gap: 8, margin: "12px 0", fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={restrictEngines}
                    onChange={(e) => setRestrictEngines(e.target.checked)}
                  />
                  Restrict which engines they can access
                </label>

                {restrictEngines && (
                  <div style={{ marginBottom: 16 }}>
                    {installedEngines.map((e) => {
                      const slug = e.engines?.slug ?? "";
                      const checked = selectedEngines.includes(slug);
                      return (
                        <label key={slug} style={{ display: "flex", gap: 8, fontSize: 13, padding: "4px 0" }}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setSelectedEngines((prev) =>
                                checked ? prev.filter((s) => s !== slug) : [...prev, slug]
                              )
                            }
                          />
                          {e.engines?.name ?? slug}
                        </label>
                      );
                    })}
                  </div>
                )}

                <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 12 }}>
                  You can change what they have access to at any time after they join, from this page.
                </p>

                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => setShowInvite(false)} style={ghostButton}>
                    Cancel
                  </button>
                  <button onClick={handleInvite} disabled={saving} style={{ ...buttonGold, flex: 1 }}>
                    {saving ? "Creating..." : "Create Invite"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        width: 36,
        height: 20,
        borderRadius: 999,
        border: "none",
        background: checked ? "var(--gold)" : "var(--border)",
        position: "relative",
        cursor: "pointer",
        flexShrink: 0,
        transition: "background 0.15s ease",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: checked ? 18 : 2,
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: checked ? "#07070f" : "var(--text-secondary)",
          transition: "left 0.15s ease",
        }}
      />
    </button>
  );
}

const cardStyle: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 14,
  padding: 20,
};

const buttonGold: React.CSSProperties = {
  background: "var(--gold)",
  color: "#07070f",
  border: "none",
  borderRadius: 10,
  padding: "9px 18px",
  fontWeight: 700,
  fontSize: 12,
  cursor: "pointer",
};

const ghostButton: React.CSSProperties = {
  padding: "9px 18px",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--text-secondary)",
  fontSize: 12,
  cursor: "pointer",
};

const ghostButtonSmall: React.CSSProperties = {
  padding: "5px 10px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--text-secondary)",
  fontSize: 11,
  cursor: "pointer",
};

const dangerLink: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#ef4444",
  fontSize: 12,
  cursor: "pointer",
};

const selectStyle: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--bg-base)",
  color: "var(--text-primary)",
  fontSize: 12,
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

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.7)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 9999,
};

const modalStyle: React.CSSProperties = {
  width: 440,
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 16,
  padding: 24,
};
