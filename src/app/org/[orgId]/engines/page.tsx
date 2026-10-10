"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useEngine } from "@/lib/runtime/EngineContext";
import { canManageTeam } from "@/lib/permissions";
import { getOrgLicenseOverview, purchaseSeats, type EngineLicenseOverview } from "@/lib/licensing";
import { ENGINE_ICONS } from "@/lib/engineMeta";

const kes = (n: number) => `KES ${Number(n).toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
const seatLabel = (n: number) => (n >= 999999 ? "Unlimited" : `${n} seats`);

export default function EnginesHubPage() {
  const { organization, membership } = useEngine();
  const isAdmin = canManageTeam(membership);

  const [overview, setOverview] = useState<EngineLicenseOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [managing, setManaging] = useState<EngineLicenseOverview | null>(null);

  async function load() {
    setLoading(true);
    setOverview(await getOrgLicenseOverview(organization.id));
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Staff only see engines they've been given a seat on; owners/admins see
  // everything, including engines the org hasn't bought yet.
  const visible = overview.filter((e) => {
    if (isAdmin) return true;
    return e.enabled && membership.userId && e.licensedUserIds.includes(membership.userId);
  });

  const anyOtherEnabled = (slug: string) => overview.some((e) => e.enabled && e.engineSlug !== slug && e.engineSlug !== "ai-insights");

  if (loading) return <div style={{ padding: 24 }}>Loading...</div>;

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>Engines</h1>
      <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>
        Everything your organization runs on. Each engine is licensed per user — one user, one seat.
      </p>

      {visible.length === 0 ? (
        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
          You haven't been given access to any engines yet. Ask an admin to assign you a license.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
          {visible.map((e) => {
            const iHaveSeat = !!membership.userId && e.licensedUserIds.includes(membership.userId);
            const canOpen = e.enabled && (isAdmin || iHaveSeat);
            const pct = e.licensedSeats > 0 ? Math.min((e.seatsUsed / e.licensedSeats) * 100, 100) : 0;

            return (
              <div key={e.engineId} style={{ ...cardStyle, opacity: e.enabled ? 1 : 0.7 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 24 }}>{ENGINE_ICONS[e.engineSlug] ?? "⚙️"}</span>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{e.engineName}</div>
                </div>

                {e.enabled ? (
                  <>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>
                      {e.seatsUsed} of {e.licensedSeats >= 999999 ? "∞" : e.licensedSeats} seats used
                    </div>
                    <div style={{ height: 5, borderRadius: 3, background: "var(--border)", marginBottom: 14 }}>
                      <div style={{ height: 5, borderRadius: 3, width: `${pct}%`, background: pct >= 100 ? "#ef4444" : "var(--gold)" }} />
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 14 }}>
                    Not licensed yet
                    {e.tiers[0] && <> · from {kes(e.tiers[0].price)}/mo</>}
                  </div>
                )}

                <div style={{ display: "flex", gap: 8 }}>
                  {canOpen && (
                    <Link href={`/org/${organization.id}/${e.engineSlug}`} style={{ ...buttonGold, textDecoration: "none", flex: 1, textAlign: "center" }}>
                      Open
                    </Link>
                  )}
                  {isAdmin && (
                    <button style={{ ...ghostButton, flex: canOpen ? "0 0 auto" : 1 }} onClick={() => setManaging(e)}>
                      {e.enabled ? "Seats" : "Get started"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {managing && (
        <SeatsModal
          engine={managing}
          orgId={organization.id}
          orgName={organization.name}
          blocked={managing.engineSlug === "ai-insights" && !anyOtherEnabled("ai-insights")}
          onClose={() => setManaging(null)}
          onDone={() => { setManaging(null); load(); }}
        />
      )}
    </div>
  );
}

function SeatsModal({
  engine,
  orgId,
  orgName,
  blocked,
  onClose,
  onDone,
}: {
  engine: EngineLicenseOverview;
  orgId: string;
  orgName: string;
  blocked: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [selected, setSelected] = useState<number | null>(engine.enabled ? engine.licensedSeats : null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (!selected) return;
    setSaving(true);
    setError(null);
    const { error } = await purchaseSeats(orgId, orgName, engine.engineSlug, selected);
    setSaving(false);
    if (error) {
      setError(error);
      return;
    }
    onDone();
  }

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h2 style={{ marginBottom: 4 }}>{engine.engineName}</h2>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 14 }}>
          {engine.enabled ? `Currently ${seatLabel(engine.licensedSeats)} · ${engine.seatsUsed} in use.` : "Pick how many users need this engine."}
        </p>

        {blocked ? (
          <p style={{ fontSize: 13, color: "#f59e0b" }}>
            AI Insights works on top of another engine — license at least one other engine first.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {engine.tiers.map((t) => {
              const tooSmall = t.seats < engine.seatsUsed;
              const isCurrent = engine.enabled && t.seats === engine.licensedSeats;
              return (
                <button
                  key={t.seats}
                  disabled={tooSmall}
                  onClick={() => setSelected(t.seats)}
                  title={tooSmall ? `${engine.seatsUsed} users already hold seats — revoke some first` : undefined}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    borderRadius: 10,
                    cursor: tooSmall ? "not-allowed" : "pointer",
                    opacity: tooSmall ? 0.4 : 1,
                    border: selected === t.seats ? "2px solid var(--gold)" : "1px solid var(--border)",
                    background: "transparent",
                    color: "var(--text-primary)",
                    fontSize: 13,
                  }}
                >
                  <span>{seatLabel(t.seats)}{isCurrent ? " (current)" : ""}</span>
                  <span style={{ fontWeight: 700 }}>{kes(t.price)}/mo</span>
                </button>
              );
            })}
          </div>
        )}

        {error && <div style={{ color: "#ff6b6b", fontSize: 12, marginTop: 10 }}>{error}</div>}

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button style={ghostButton} onClick={onClose}>Cancel</button>
          {!blocked && (
            <button
              style={{ ...buttonGold, flex: 1 }}
              onClick={confirm}
              disabled={saving || !selected || (engine.enabled && selected === engine.licensedSeats)}
            >
              {saving ? "Saving..." : engine.enabled ? "Change plan" : "Activate"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: 18 };
const buttonGold: React.CSSProperties = { background: "var(--gold)", color: "var(--gold-contrast)", border: "none", borderRadius: 10, padding: "8px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer" };
const ghostButton: React.CSSProperties = { padding: "8px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 12, cursor: "pointer" };
const overlayStyle: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999 };
const modalStyle: React.CSSProperties = { width: 420, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 24, maxHeight: "85vh", overflowY: "auto" };
