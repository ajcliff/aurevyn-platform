"use client";

import { useEffect, useState } from "react";
import { useEngine } from "@/lib/runtime/EngineContext";
import { getUnattributedLedgerLines, reassignLedgerLine, type UnattributedLine } from "@/lib/cashReconciliation";
import { getFinanceAccounts, type FinanceAccount } from "@/lib/finance";
import EmptyState from "@/components/EmptyState";

const kes = (n: number) => `KES ${Number(n).toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;

export default function UnattributedCashPage() {
  const { organization } = useEngine();

  const [lines, setLines] = useState<UnattributedLine[]>([]);
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [l, a] = await Promise.all([
      getUnattributedLedgerLines(organization.id),
      getFinanceAccounts(organization.id),
    ]);
    setLines(l);
    setAccounts(a.filter((acc) => acc.status === "active"));
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleReassign(lineId: string) {
    const financeAccountId = selected[lineId];
    if (!financeAccountId) return;
    setSavingId(lineId);
    try {
      await reassignLedgerLine({ lineId, orgId: organization.id, financeAccountId });
      setLines((prev) => prev.filter((l) => l.lineId !== lineId));
    } finally {
      setSavingId(null);
    }
  }

  const total = lines.reduce((s, l) => s + l.amount, 0);

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>Unattributed Cash</h1>
      <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20, maxWidth: 640 }}>
        Money that moved but was never tied to a specific bank, cash, or mobile-money account — mostly split-tender
        POS sales, where one journal entry can't be split across two accounts. Assign each one to a real account to
        clean it up; nothing else about that transaction changes.
      </p>

      {!loading && lines.length > 0 && (
        <div style={{ marginBottom: 16, fontSize: 14 }}>
          <strong>{lines.length}</strong> unattributed line{lines.length === 1 ? "" : "s"} · net {kes(total)}
        </div>
      )}

      {loading ? (
        "Loading..."
      ) : lines.length === 0 ? (
        <EmptyState icon="✅" message="Nothing unattributed — every ledger line is tied to a real account." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 800 }}>
          {lines.map((l) => (
            <div
              key={l.lineId}
              style={{
                display: "grid",
                gridTemplateColumns: "100px 1fr 100px auto 1fr auto",
                gap: 12,
                alignItems: "center",
                padding: "10px 14px",
                border: "1px solid var(--border)",
                borderRadius: 10,
                background: "var(--bg-card)",
                fontSize: 13,
              }}
            >
              <span style={{ color: "var(--text-muted)" }}>{l.date}</span>
              <span>{l.description}</span>
              <span style={{ fontWeight: 600, color: l.amount >= 0 ? "#3dd68c" : "#ef4444" }}>{kes(l.amount)}</span>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{l.sourceType}</span>
              <select
                value={selected[l.lineId] || ""}
                onChange={(e) => setSelected((prev) => ({ ...prev, [l.lineId]: e.target.value }))}
                style={{
                  padding: "6px 8px",
                  borderRadius: 6,
                  border: "1px solid var(--border)",
                  background: "var(--bg-base)",
                  color: "var(--text-primary)",
                  fontSize: 12,
                }}
              >
                <option value="">Assign to...</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              <button
                onClick={() => handleReassign(l.lineId)}
                disabled={!selected[l.lineId] || savingId === l.lineId}
                style={{
                  background: "var(--gold)",
                  color: "var(--gold-contrast)",
                  border: "none",
                  borderRadius: 8,
                  padding: "6px 12px",
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                {savingId === l.lineId ? "..." : "Assign"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
