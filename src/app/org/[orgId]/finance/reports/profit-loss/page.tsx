"use client";

import { useEffect, useMemo, useState } from "react";
import { useEngine } from "@/lib/runtime/EngineContext";
import { getFinanceTransactions, type FinanceTransaction } from "@/lib/finance";
import { getChartOfAccounts, getCostCenters, type ChartAccount, type CostCenter } from "@/lib/chartOfAccounts";
import { exportToCSV } from "@/lib/csvExport";

export default function ProfitLossPage() {
  const { organization } = useEngine();

  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [accounts, setAccounts] = useState<ChartAccount[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [loading, setLoading] = useState(true);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [costCenterFilter, setCostCenterFilter] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const [t, a, cc] = await Promise.all([
      getFinanceTransactions(organization.id),
      getChartOfAccounts(organization.id),
      getCostCenters(organization.id),
    ]);
    setTransactions(t);
    setAccounts(a);
    setCostCenters(cc);
    setLoading(false);
  }

  const accountById = useMemo(() => {
    const map = new Map<string, ChartAccount>();
    accounts.forEach((a) => map.set(a.id, a));
    return map;
  }, [accounts]);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (fromDate && t.date < fromDate) return false;
      if (toDate && t.date > toDate) return false;
      if (costCenterFilter && t.cost_center_id !== costCenterFilter) return false;
      return true;
    });
  }, [transactions, fromDate, toDate, costCenterFilter]);

  const { incomeLines, expenseLines, uncategorizedIncome, uncategorizedExpense, totalIncome, totalExpense } = useMemo(() => {
    const incomeMap = new Map<string, number>();
    const expenseMap = new Map<string, number>();
    let uncatIncome = 0;
    let uncatExpense = 0;

    filtered.forEach((t) => {
      const account = t.coa_id ? accountById.get(t.coa_id) : null;

      if (t.type === "income") {
        if (account) {
          incomeMap.set(account.id, (incomeMap.get(account.id) || 0) + Number(t.amount));
        } else {
          uncatIncome += Number(t.amount);
        }
      } else if (t.type === "expense") {
        if (account) {
          expenseMap.set(account.id, (expenseMap.get(account.id) || 0) + Number(t.amount));
        } else {
          uncatExpense += Number(t.amount);
        }
      }
    });

    const incomeLines = Array.from(incomeMap.entries())
      .map(([id, amount]) => ({ account: accountById.get(id)!, amount }))
      .sort((a, b) => a.account.code.localeCompare(b.account.code));

    const expenseLines = Array.from(expenseMap.entries())
      .map(([id, amount]) => ({ account: accountById.get(id)!, amount }))
      .sort((a, b) => a.account.code.localeCompare(b.account.code));

    const totalIncome = incomeLines.reduce((s, l) => s + l.amount, 0) + uncatIncome;
    const totalExpense = expenseLines.reduce((s, l) => s + l.amount, 0) + uncatExpense;

    return { incomeLines, expenseLines, uncategorizedIncome: uncatIncome, uncategorizedExpense: uncatExpense, totalIncome, totalExpense };
  }, [filtered, accountById]);

  const netProfit = totalIncome - totalExpense;

  function handleExport() {
    const rows = [
      ...incomeLines.map((l) => ({ Section: "Income", Code: l.account.code, Account: l.account.name, "Amount (KES)": l.amount })),
      ...(uncategorizedIncome > 0 ? [{ Section: "Income", Code: "—", Account: "Uncategorized", "Amount (KES)": uncategorizedIncome }] : []),
      ...expenseLines.map((l) => ({ Section: "Expense", Code: l.account.code, Account: l.account.name, "Amount (KES)": l.amount })),
      ...(uncategorizedExpense > 0 ? [{ Section: "Expense", Code: "—", Account: "Uncategorized", "Amount (KES)": uncategorizedExpense }] : []),
      { Section: "Total", Code: "", Account: "Total Income", "Amount (KES)": totalIncome },
      { Section: "Total", Code: "", Account: "Total Expenses", "Amount (KES)": totalExpense },
      { Section: "Total", Code: "", Account: "Net Profit", "Amount (KES)": netProfit },
    ];
    exportToCSV(`profit-loss-${organization.id}-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  }

  if (loading) return <div>Loading profit &amp; loss...</div>;

  return (
    <div style={{ overflowY: "auto", height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Profit &amp; Loss</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
            Income and expenses by category for {organization.name}.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={inputStyle} />
          <span style={{ color: "var(--text-muted)", fontSize: 12 }}>to</span>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={inputStyle} />
          <select value={costCenterFilter} onChange={(e) => setCostCenterFilter(e.target.value)} style={inputStyle}>
            <option value="">All cost centers</option>
            {costCenters.map((cc) => (
              <option key={cc.id} value={cc.id}>{cc.name}</option>
            ))}
          </select>
          <button style={ghostButton} onClick={handleExport}>Export CSV</button>
        </div>
      </div>

      <div className="card" style={cardStyle}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#3dd68c", marginBottom: 8, textTransform: "uppercase" }}>
          Income
        </div>
        {incomeLines.map((line) => (
          <div key={line.account.id} style={rowStyle}>
            <span>{line.account.code} — {line.account.name}</span>
            <span>KES {line.amount.toLocaleString()}</span>
          </div>
        ))}
        {uncategorizedIncome > 0 && (
          <div style={{ ...rowStyle, color: "var(--text-muted)" }}>
            <span>Uncategorized</span>
            <span>KES {uncategorizedIncome.toLocaleString()}</span>
          </div>
        )}
        <div style={{ ...rowStyle, fontWeight: 700, borderTop: "1px solid var(--border)", marginTop: 4 }}>
          <span>Total Income</span>
          <span style={{ color: "#3dd68c" }}>KES {totalIncome.toLocaleString()}</span>
        </div>
      </div>

      <div className="card" style={{ ...cardStyle, marginTop: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#ef4444", marginBottom: 8, textTransform: "uppercase" }}>
          Expenses
        </div>
        {expenseLines.map((line) => (
          <div key={line.account.id} style={rowStyle}>
            <span>{line.account.code} — {line.account.name}</span>
            <span>KES {line.amount.toLocaleString()}</span>
          </div>
        ))}
        {uncategorizedExpense > 0 && (
          <div style={{ ...rowStyle, color: "var(--text-muted)" }}>
            <span>Uncategorized</span>
            <span>KES {uncategorizedExpense.toLocaleString()}</span>
          </div>
        )}
        <div style={{ ...rowStyle, fontWeight: 700, borderTop: "1px solid var(--border)", marginTop: 4 }}>
          <span>Total Expenses</span>
          <span style={{ color: "#ef4444" }}>KES {totalExpense.toLocaleString()}</span>
        </div>
      </div>

      <div className="card" style={{ ...cardStyle, marginTop: 16 }}>
        <div style={{ ...rowStyle, fontSize: 18, fontWeight: 700 }}>
          <span>Net Profit</span>
          <span style={{ color: netProfit >= 0 ? "#3dd68c" : "#ef4444" }}>
            KES {netProfit.toLocaleString()}
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