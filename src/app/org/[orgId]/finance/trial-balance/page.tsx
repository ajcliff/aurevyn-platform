"use client";

import { useEffect, useState } from "react";
import { useEngine } from "@/lib/runtime/EngineContext";
import { getTrialBalance, type TrialBalance } from "@/lib/journal";
import EmptyState from "@/components/EmptyState";

const kes = (n: number) => `KES ${Number(n).toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;

const TYPE_LABELS: Record<string, string> = {
  asset: "Asset",
  liability: "Liability",
  income: "Income",
  expense: "Expense",
  equity: "Equity",
};

export default function TrialBalancePage() {
  const { organization } = useEngine();
  const [data, setData] = useState<TrialBalance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTrialBalance(organization.id).then((d) => {
      setData(d);
      setLoading(false);
    });
  }, [organization.id]);

  if (loading) return <div style={{ padding: 24 }}>Loading...</div>;
  if (!data || data.rows.length === 0) {
    return (
      <div style={{ padding: 24 }}>
        <h1 style={{ fontSize: 20, marginBottom: 16 }}>Trial Balance</h1>
        <EmptyState icon="📊" message="No ledger activity yet." />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <h1 style={{ fontSize: 20 }}>Trial Balance</h1>
        <span
          style={{
            padding: "6px 14px",
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 700,
            background: data.balanced ? "rgba(61,214,140,0.15)" : "rgba(239,68,68,0.15)",
            color: data.balanced ? "#3dd68c" : "#ef4444",
          }}
        >
          {data.balanced ? "✓ Balanced" : "⚠ Out of balance"}
        </span>
      </div>
      <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>
        Every debit posted to the ledger should equal every credit, in total. This is a structural check, not a
        business one — if it's out of balance, something posted an unbalanced entry somewhere.
      </p>

      <div style={{ maxWidth: 800 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left" }}>
              <th style={{ padding: "8px 6px" }}>Code</th>
              <th style={{ padding: "8px 6px" }}>Account</th>
              <th style={{ padding: "8px 6px" }}>Type</th>
              <th style={{ padding: "8px 6px", textAlign: "right" }}>Debit</th>
              <th style={{ padding: "8px 6px", textAlign: "right" }}>Credit</th>
              <th style={{ padding: "8px 6px", textAlign: "right" }}>Balance</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.accountId} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "8px 6px", color: "var(--text-muted)" }}>{r.code}</td>
                <td style={{ padding: "8px 6px" }}>{r.name}</td>
                <td style={{ padding: "8px 6px", color: "var(--text-muted)" }}>{TYPE_LABELS[r.accountType] ?? r.accountType}</td>
                <td style={{ padding: "8px 6px", textAlign: "right" }}>{r.debit > 0 ? kes(r.debit) : "—"}</td>
                <td style={{ padding: "8px 6px", textAlign: "right" }}>{r.credit > 0 ? kes(r.credit) : "—"}</td>
                <td style={{ padding: "8px 6px", textAlign: "right", fontWeight: 600 }}>{kes(r.balance)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ fontWeight: 700 }}>
              <td colSpan={3} style={{ padding: "10px 6px" }}>Total</td>
              <td style={{ padding: "10px 6px", textAlign: "right" }}>{kes(data.totalDebits)}</td>
              <td style={{ padding: "10px 6px", textAlign: "right" }}>{kes(data.totalCredits)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
