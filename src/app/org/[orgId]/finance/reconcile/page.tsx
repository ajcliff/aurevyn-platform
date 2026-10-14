"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useEngine } from "@/lib/runtime/EngineContext";
import { getFinanceAccounts, type FinanceAccount } from "@/lib/finance";
import { getCashPosition } from "@/lib/journal";
import { getReconciliations, recordReconciliation, type Reconciliation } from "@/lib/accountReconciliation";
import EmptyState from "@/components/EmptyState";

const kes = (n: number) => `KES ${Math.round(n).toLocaleString()}`;

const input: React.CSSProperties = {
  width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)",
  background: "var(--bg-base)", color: "var(--text-primary)", fontSize: 13,
};
const gold: React.CSSProperties = {
  background: "var(--gold)", color: "var(--gold-contrast)", border: "none", borderRadius: 8,
  padding: "8px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer",
};
const ghost: React.CSSProperties = {
  background: "transparent", color: "var(--text-primary)", border: "1px solid var(--border)", borderRadius: 8,
  padding: "8px 14px", fontWeight: 600, fontSize: 12, cursor: "pointer",
};

function actualLabel(a: FinanceAccount) {
  if (a.type === "cash") return "Cash counted right now (KES)";
  if (a.type === "mobile_money") return "Balance on your M-Pesa statement or app (KES)";
  return "Balance on your bank statement (KES)";
}

export default function ReconcilePage() {
  const { organization } = useEngine();
  const orgId = organization.id;

  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [book, setBook] = useState<Record<string, number>>({});
  const [unattributed, setUnattributed] = useState(0);
  const [history, setHistory] = useState<Reconciliation[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<FinanceAccount | null>(null);
  const [actual, setActual] = useState("");
  const [adjust, setAdjust] = useState(true);
  const [asOf, setAsOf] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [acc, pos, hist] = await Promise.all([getFinanceAccounts(orgId), getCashPosition(orgId), getReconciliations(orgId)]);
    setAccounts(acc.filter((a) => a.status === "active"));
    setBook(pos.byAccountId);
    setUnattributed(pos.unattributed);
    setHistory(hist);
    setLoading(false);
  }, [orgId]);

  useEffect(() => {
    load();
  }, [load]);

  const lastFor = (id: string) => history.find((h) => h.finance_account_id === id);
  const bookBalance = active ? book[active.id] ?? 0 : 0;
  const diff = actual === "" ? null : Math.round((Number(actual) - bookBalance) * 100) / 100;

  function open(a: FinanceAccount) {
    setActive(a);
    setActual("");
    setNote("");
    setAdjust(true);
    setError("");
    setAsOf(new Date().toISOString().slice(0, 10));
  }

  async function save() {
    if (!active || actual === "" || Number.isNaN(Number(actual))) return setError("Enter the balance you counted or read off the statement.");
    setSaving(true);
    setError("");
    try {
      await recordReconciliation({
        orgId, accountId: active.id, accountName: active.name, asOf,
        actualBalance: Number(actual), adjust, note, recordedBy: "AUREVYN",
      });
      setActive(null);
      await load();
    } catch (err) {
      setError((err as { message?: string })?.message || "Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const nameOf = (id: string) => accounts.find((a) => a.id === id)?.name ?? "Account";

  return (
    <div style={{ padding: 24, overflowY: "auto", height: "100%" }}>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>Reconcile Accounts</h1>
      <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20, maxWidth: 680 }}>
        Check that what AUREVYN says is in each bank, M-Pesa or cash account matches what is really there. Enter the statement balance or your cash count; any gap is shown, and you can post it so the books agree.
      </p>

      {unattributed !== 0 && (
        <div style={{ border: "1px solid #f59e0b", background: "rgba(245,158,11,.08)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, maxWidth: 680 }}>
          {kes(unattributed)} is not tied to any account yet, so account balances may look off.{" "}
          <Link href={`/org/${orgId}/finance/unattributed`} style={{ color: "var(--gold)" }}>Assign it first</Link>.
        </div>
      )}

      {loading ? (
        "Loading..."
      ) : accounts.length === 0 ? (
        <EmptyState icon="🏦" message="Add a bank, M-Pesa or cash account in Finance first." />
      ) : (
        <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", background: "var(--bg-card)", marginBottom: 22 }}>
          {accounts.map((a) => {
            const last = lastFor(a.id);
            return (
              <div key={a.id} style={{ display: "grid", gridTemplateColumns: "1fr 140px 190px auto", gap: 12, padding: "11px 14px", borderBottom: "1px solid var(--border)", alignItems: "center", fontSize: 13 }}>
                <span>
                  <b>{a.name}</b>
                  <span style={{ color: "var(--text-muted)", marginLeft: 8, fontSize: 11 }}>{a.type === "mobile_money" ? "Mobile money" : a.type === "cash" ? a.category : "Bank"}</span>
                </span>
                <span style={{ fontWeight: 700 }}>{kes(book[a.id] ?? 0)}</span>
                <span style={{ fontSize: 12, color: last ? (last.difference === 0 ? "#3dd68c" : "#f59e0b") : "var(--text-muted)" }}>
                  {last
                    ? `${last.as_of}: ${last.difference === 0 ? "matched" : `${last.difference < 0 ? "short" : "over"} ${kes(Math.abs(last.difference))}${last.adjusted ? " (adjusted)" : ""}`}`
                    : "Never reconciled"}
                </span>
                <button style={ghost} onClick={() => open(a)}>Reconcile</button>
              </div>
            );
          })}
        </div>
      )}

      {active && (
        <div style={{ border: "1px solid var(--border)", background: "var(--bg-card)", borderRadius: 12, padding: 16, marginBottom: 22, maxWidth: 520 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Reconcile {active.name}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>AUREVYN says it holds {kes(bookBalance)}.</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 600 }}>{actualLabel(active)}</label>
            <input style={input} type="number" value={actual} onChange={(e) => setActual(e.target.value)} autoFocus />
            <div style={{ display: "flex", gap: 8 }}>
              <input style={input} type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
              <input style={input} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" />
            </div>
            {diff !== null && (
              <div style={{ fontSize: 13, padding: "9px 11px", borderRadius: 8, background: "var(--bg-base)", color: diff === 0 ? "#3dd68c" : "#f59e0b" }}>
                {diff === 0
                  ? "Matches the books exactly."
                  : diff < 0
                    ? `Short by ${kes(-diff)}: the books say more than you have.`
                    : `Over by ${kes(diff)}: you have more than the books say.`}
              </div>
            )}
            {diff !== null && diff !== 0 && (
              <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12 }}>
                <input type="checkbox" checked={adjust} onChange={(e) => setAdjust(e.target.checked)} style={{ marginTop: 2 }} />
                <span>Post the difference to “Cash Over/Short” so the books match. Leave unticked to only record the check and investigate first.</span>
              </label>
            )}
          </div>
          {error && <div style={{ color: "#ef4444", fontSize: 12, marginTop: 8 }}>{error}</div>}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button style={ghost} onClick={() => setActive(null)}>Cancel</button>
            <button style={gold} onClick={save} disabled={saving || actual === ""}>{saving ? "Saving…" : "Save reconciliation"}</button>
          </div>
        </div>
      )}

      {history.length > 0 && (
        <>
          <h3 style={{ fontSize: 14, marginBottom: 8 }}>History</h3>
          <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", background: "var(--bg-card)" }}>
            {history.slice(0, 30).map((h) => (
              <div key={h.id} style={{ display: "grid", gridTemplateColumns: "90px 1fr 120px 120px 140px", gap: 12, padding: "9px 14px", borderBottom: "1px solid var(--border)", fontSize: 12.5, alignItems: "center" }}>
                <span style={{ color: "var(--text-muted)" }}>{h.as_of}</span>
                <span>{nameOf(h.finance_account_id)}{h.note ? ` · ${h.note}` : ""}</span>
                <span>Books {kes(h.book_balance)}</span>
                <span>Actual {kes(h.actual_balance)}</span>
                <span style={{ fontWeight: 700, color: h.difference === 0 ? "#3dd68c" : "#f59e0b" }}>
                  {h.difference === 0 ? "Matched" : `${h.difference < 0 ? "Short" : "Over"} ${kes(Math.abs(h.difference))}${h.adjusted ? " ✓" : ""}`}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
