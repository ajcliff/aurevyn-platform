"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useEngine } from "@/lib/runtime/EngineContext";
import { getFinanceAccounts, type FinanceAccount } from "@/lib/finance";
import { getCashPosition } from "@/lib/journal";
import { getReconciliations, recordReconciliation, type Reconciliation } from "@/lib/accountReconciliation";
import EmptyState from "@/components/EmptyState";
import { parseStatementCsv, getBookLines, matchStatement, type MatchResult } from "@/lib/statementImport";

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
  const [stmt, setStmt] = useState<(MatchResult & { from: string; to: string; fileName: string }) | null>(null);
  const [stmtError, setStmtError] = useState("");
  const [stmtBusy, setStmtBusy] = useState(false);

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
    setStmt(null);
    setStmtError("");
    setAsOf(new Date().toISOString().slice(0, 10));
  }

  // Reads a bank or M-Pesa statement (CSV), fills in the closing balance when the file has one,
  // and lists what is on the statement but not in AUREVYN, and the other way round. Nothing is saved.
  async function importStatement(file: File) {
    if (!active) return;
    setStmt(null);
    setStmtError("");
    setStmtBusy(true);
    try {
      const { lines, error: parseError } = parseStatementCsv(await file.text());
      if (parseError) return setStmtError(parseError);
      const dates = lines.map((l) => l.date).sort();
      const from = dates[0];
      const to = dates[dates.length - 1];
      const book = await getBookLines(orgId, active.id, from, to);
      setStmt({ ...matchStatement(lines, book), from, to, fileName: file.name });
      // Closing balance = the balance on the newest line. Files list oldest-first or newest-first, so check which.
      const withBalance = lines.filter((l) => l.balance != null);
      if (withBalance.length) {
        const oldestFirst = lines[0].date <= lines[lines.length - 1].date;
        const closing = oldestFirst ? withBalance[withBalance.length - 1] : withBalance[0];
        setActual(String(closing.balance));
        setAsOf(to);
      }
    } catch {
      setStmtError("Could not read that file. Save the statement as CSV and try again.");
    } finally {
      setStmtBusy(false);
    }
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
          {active.type !== "cash" && (
            <div style={{ marginBottom: 12, padding: "10px 12px", border: "1px dashed var(--border)", borderRadius: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Import a statement (CSV)</div>
              <input type="file" accept=".csv,text/csv" disabled={stmtBusy} onChange={(e) => { const f = e.target.files?.[0]; if (f) importStatement(f); e.target.value = ""; }} style={{ fontSize: 12 }} />
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
                Download the statement from your bank or M-Pesa as CSV. Headings like Date, Description, Amount (or Paid in / Paid out) and Balance are recognised. The file is only read here, not saved.
              </div>
              {stmtBusy && <div style={{ fontSize: 12, marginTop: 6 }}>Reading…</div>}
              {stmtError && <div style={{ color: "#ef4444", fontSize: 12, marginTop: 6 }}>{stmtError}</div>}
            </div>
          )}
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

      {active && stmt && (
        <div style={{ border: "1px solid var(--border)", background: "var(--bg-card)", borderRadius: 12, padding: 16, marginBottom: 22, maxWidth: 720 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Statement check: {stmt.fileName}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
            {stmt.from} to {stmt.to}. {stmt.matched.length} line{stmt.matched.length === 1 ? "" : "s"} match what AUREVYN recorded (same amount, dates within 3 days).
          </div>
          <StatementList
            title="On the statement but not in AUREVYN"
            hint="Money that moved in the bank or M-Pesa and was never recorded. Record each one in Finance, then check again."
            rows={stmt.statementOnly.map((l) => ({ date: l.date, text: l.description, amount: l.amount }))}
          />
          <StatementList
            title="In AUREVYN but not on the statement"
            hint="Recorded here but not yet in the bank or M-Pesa. It may be a cheque not yet cleared, a timing difference, or a mistake."
            rows={stmt.bookOnly.map((l) => ({ date: l.date, text: l.description, amount: l.amount }))}
          />
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

function StatementList({ title, hint, rows }: { title: string; hint: string; rows: { date: string; text: string; amount: number }[] }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 700 }}>{title} ({rows.length})</div>
      <div style={{ fontSize: 11.5, color: "var(--text-muted)", margin: "2px 0 6px" }}>{hint}</div>
      {rows.length === 0 ? (
        <div style={{ fontSize: 12, color: "#3dd68c" }}>Nothing here.</div>
      ) : (
        <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
          {rows.slice(0, 100).map((r, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "90px 1fr 110px", gap: 10, padding: "7px 10px", borderBottom: "1px solid var(--border)", fontSize: 12.5 }}>
              <span style={{ color: "var(--text-muted)" }}>{r.date}</span>
              <span>{r.text || "—"}</span>
              <span style={{ textAlign: "right", fontWeight: 600, color: r.amount < 0 ? "#f59e0b" : "var(--text-primary)" }}>
                {r.amount < 0 ? "-" : "+"}KES {Math.abs(r.amount).toLocaleString()}
              </span>
            </div>
          ))}
          {rows.length > 100 && <div style={{ padding: "7px 10px", fontSize: 12, color: "var(--text-muted)" }}>Showing the first 100 of {rows.length}.</div>}
        </div>
      )}
    </div>
  );
}
