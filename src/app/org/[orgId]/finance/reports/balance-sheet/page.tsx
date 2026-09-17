"use client";

import { useEffect, useMemo, useState } from "react";
import { useEngine } from "@/lib/runtime/EngineContext";
import { getChartOfAccounts, type ChartAccount } from "@/lib/chartOfAccounts";
import { getBalanceSheet, type BalanceSheet } from "@/lib/balanceSheet";
import { exportToCSV } from "@/lib/csvExport";

export default function BalanceSheetPage() {
  const { organization } = useEngine();

  const [accounts, setAccounts] = useState<ChartAccount[]>([]);
  const [sheet, setSheet] = useState<BalanceSheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    load();
  }, [asOfDate]);

  async function load() {
    setLoading(true);
    const a = await getChartOfAccounts(organization.id);
    setAccounts(a);
    const s = await getBalanceSheet(organization.id, asOfDate, a);
    setSheet(s);
    setLoading(false);
  }

  const balances = useMemo(() => {
    if (!sheet) return null;
    return sheet.totalAssets - (sheet.totalLiabilities + sheet.totalEquity);
  }, [sheet]);

  function handleExport() {
    if (!sheet) return;
    const rows = [
      ...sheet.assets.map((l) => ({ Section: "Assets", Code: l.account.code, Account: l.account.name, "Balance (KES)": l.balance })),
      { Section: "Total", Code: "", Account: "Total Assets", "Balance (KES)": sheet.totalAssets },
      ...sheet.liabilities.map((l) => ({ Section: "Liabilities", Code: l.account.code, Account: l.account.name, "Balance (KES)": l.balance })),
      { Section: "Total", Code: "", Account: "Total Liabilities", "Balance (KES)": sheet.totalLiabilities },
      ...sheet.equity.map((l) => ({ Section: "Equity", Code: l.account.code, Account: l.account.name, "Balance (KES)": l.balance })),
      { Section: "Total", Code: "", Account: "Total Equity", "Balance (KES)": sheet.totalEquity },
    ];
    exportToCSV(`balance-sheet-${organization.id}-${asOfDate}.csv`, rows);
  }

  if (loading || !sheet) return <div>Loading balance sheet...</div>;

  return (
    <div style={{ overflowY: "auto", height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Balance Sheet</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
            Assets, liabilities, and equity for {organization.name} as of {asOfDate}.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <label style={{ fontSize: 12, color: "var(--text-muted)" }}>As of</label>
          <input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} style={inputStyle} />
          <button style={ghostButton} onClick={handleExport}>Export CSV</button>
        </div>
      </div>

      {(sheet.assets.length + sheet.liabilities.length + sheet.equity.length) === 0 && (
        <div className="card" style={{ ...cardStyle, marginBottom: 16, color: "var(--text-muted)", fontSize: 13 }}>
          Nothing posted to the ledger yet. Balance Sheet reflects finance transactions only so far — it fills in as
          income/expense transactions are recorded with a Chart of Accounts category and an account.
        </div>
      )}

      <div className="card" style={cardStyle}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#3dd68c", marginBottom: 8, textTransform: "uppercase" }}>
          Assets
        </div>
        {sheet.assets.map((line) => (
          <div key={line.account.id} style={rowStyle}>
            <span>{line.account.code} — {line.account.name}</span>
            <span>KES {line.balance.toLocaleString()}</span>
          </div>
        ))}
        <div style={{ ...rowStyle, fontWeight: 700, borderTop: "1px solid var(--border)", marginTop: 4 }}>
          <span>Total Assets</span>
          <span style={{ color: "#3dd68c" }}>KES {sheet.totalAssets.toLocaleString()}</span>
        </div>
      </div>

      <div className="card" style={{ ...cardStyle, marginTop: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#ef4444", marginBottom: 8, textTransform: "uppercase" }}>
          Liabilities
        </div>
        {sheet.liabilities.map((line) => (
          <div key={line.account.id} style={rowStyle}>
            <span>{line.account.code} — {line.account.name}</span>
            <span>KES {line.balance.toLocaleString()}</span>
          </div>
        ))}
        <div style={{ ...rowStyle, fontWeight: 700, borderTop: "1px solid var(--border)", marginTop: 4 }}>
          <span>Total Liabilities</span>
          <span style={{ color: "#ef4444" }}>KES {sheet.totalLiabilities.toLocaleString()}</span>
        </div>
      </div>

      <div className="card" style={{ ...cardStyle, marginTop: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)", marginBottom: 8, textTransform: "uppercase" }}>
          Equity
        </div>
        {sheet.equity.map((line) => (
          <div key={line.account.id} style={rowStyle}>
            <span>{line.account.code} — {line.account.name}</span>
            <span>KES {line.balance.toLocaleString()}</span>
          </div>
        ))}
        <div style={{ ...rowStyle, fontWeight: 700, borderTop: "1px solid var(--border)", marginTop: 4 }}>
          <span>Total Equity</span>
          <span style={{ color: "var(--gold)" }}>KES {sheet.totalEquity.toLocaleString()}</span>
        </div>
      </div>

      <div className="card" style={{ ...cardStyle, marginTop: 16 }}>
        <div style={{ ...rowStyle, fontSize: 16, fontWeight: 700 }}>
          <span>Assets = Liabilities + Equity check</span>
          <span style={{ color: Math.abs(balances || 0) < 1 ? "#3dd68c" : "#ef4444" }}>
            {Math.abs(balances || 0) < 1 ? "Balanced ✓" : `Off by KES ${Number(balances).toLocaleString()}`}
          </span>
        </div>
      </div>
    </div>
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
  padding: "8px 4px",
  borderBottom: "1px solid var(--border)",
  fontSize: 13,
};

const inputStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--bg-base)",
  color: "var(--text-primary)",
  fontSize: 12,
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
