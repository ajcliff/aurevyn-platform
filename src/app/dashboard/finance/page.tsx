"use client";

import { useEffect, useState } from "react";
import { getFinanceTransactions, getFinanceExpenses, getCashflow, createTransaction, createExpense, type FinanceTransaction, type FinanceExpense, type CashflowEntry } from "@/lib/finance";
import { getOrganizations, type Organization } from "@/lib/organizations";
import { logActivity } from "@/lib/activity";
import { formatError } from "@/lib/errorFormat";
import ErrorBanner from "@/components/ErrorBanner";
import s from "@/styles/layout.module.css";
import PageHeader from "@/components/PageHeader";
type Tab = "overview" | "transactions" | "expenses" | "cashflow";

const paymentMethodIcons: Record<string, string> = {
  mpesa: "📱", bank: "🏦", cash: "💵", card: "💳",
};

const categoryColors: Record<string, string> = {
  subscription: "#3dd68c", revenue: "#3dd68c",
  payroll: "#a78bfa", operations: "#f59e0b",
  software: "#38bdf8", marketing: "#ec4899",
  utilities: "#f59e0b", other: "#6b7280",
};

function formatKES(amount: number) {
  return `KES ${amount.toLocaleString()}`;
}

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return `${diff} days ago`;
}

export default function FinancePage() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [expenses, setExpenses] = useState<FinanceExpense[]>([]);
  const [cashflow, setCashflow] = useState<CashflowEntry[]>([]);
  const [tab, setTab] = useState<Tab>("overview");
  const [showAddTx, setShowAddTx] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [txFilter, setTxFilter] = useState("all");
  const [newTx, setNewTx] = useState({ type: "income" as "income" | "expense", amount: "", description: "", category: "", payment_method: "mpesa", date: new Date().toISOString().split("T")[0] });
  const [newExpense, setNewExpense] = useState({ title: "", amount: "", category: "", vendor: "", payment_method: "mpesa", date: new Date().toISOString().split("T")[0], notes: "", status: "paid" });
  const [orgsLoading, setOrgsLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    loadOrgs();
  }, []);

  async function loadOrgs() {
    setOrgsLoading(true);
    setError(null);
    try {
      const orgsData = await getOrganizations();
      setOrgs(orgsData);
      if (orgsData.length > 0) setSelectedOrgId(orgsData[0].id);
    } catch (err) {
      setError(formatError(err));
    } finally {
      setOrgsLoading(false);
    }
  }

  useEffect(() => {
    if (!selectedOrgId) return;
    loadFinanceData();
  }, [selectedOrgId]);

  async function loadFinanceData() {
    setDataLoading(true);
    setError(null);
    try {
      const [txData, expData, cfData] = await Promise.all([
        getFinanceTransactions(selectedOrgId),
        getFinanceExpenses(selectedOrgId),
        getCashflow(selectedOrgId),
      ]);
      setTransactions(txData);
      setExpenses(expData);
      setCashflow(cfData);
    } catch (err) {
      setError(formatError(err));
    } finally {
      setDataLoading(false);
    }
  }

  const totalIncome = transactions.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
  const netProfit = totalIncome - totalExpenses;
  const totalInflow = cashflow.filter(c => c.type === "inflow").reduce((sum, c) => sum + c.amount, 0);
  const totalOutflow = cashflow.filter(c => c.type === "outflow").reduce((sum, c) => sum + c.amount, 0);
  const netCashflow = totalInflow - totalOutflow;

  const filteredTx = transactions.filter(t => txFilter === "all" || t.type === txFilter);

  const handleAddTx = async () => {
    if (!newTx.amount || !newTx.description || !selectedOrgId) return;
    setActionError(null);
    try {
      const created = await createTransaction({
        org_id: selectedOrgId,
        account_id: null,
        type: newTx.type,
        amount: parseFloat(newTx.amount),
        currency: "KES",
        description: newTx.description,
        category: newTx.category,
        reference: "",
        payment_method: newTx.payment_method,
        status: "completed",
        date: newTx.date,
      });
      await logActivity({ icon: newTx.type === "income" ? "💰" : "💸", title: `${newTx.type === "income" ? "Income" : "Expense"} recorded`, sub: `${formatKES(parseFloat(newTx.amount))} — ${newTx.description}` });
      setTransactions(prev => [created, ...prev]);
      setShowAddTx(false);
      setNewTx({ type: "income", amount: "", description: "", category: "", payment_method: "mpesa", date: new Date().toISOString().split("T")[0] });
    } catch (err) {
      setActionError(formatError(err));
    }
  };

  const handleAddExpense = async () => {
    if (!newExpense.amount || !newExpense.title || !selectedOrgId) return;
    setActionError(null);
    try {
      const created = await createExpense({
        org_id: selectedOrgId,
        title: newExpense.title,
        amount: parseFloat(newExpense.amount),
        currency: "KES",
        category: newExpense.category,
        vendor: newExpense.vendor,
        payment_method: newExpense.payment_method,
        status: newExpense.status,
        date: newExpense.date,
        notes: newExpense.notes,
      });
      await logActivity({ icon: "💸", title: "Expense recorded", sub: `${formatKES(parseFloat(newExpense.amount))} — ${newExpense.title}` });
      setExpenses(prev => [created, ...prev]);
      setShowAddExpense(false);
      setNewExpense({ title: "", amount: "", category: "", vendor: "", payment_method: "mpesa", date: new Date().toISOString().split("T")[0], notes: "", status: "paid" });
    } catch (err) {
      setActionError(formatError(err));
    }
  };

  const selectedOrg = orgs.find(o => o.id === selectedOrgId);

  return (
    <div className="page-shell">
     
      <div className={s.body}>
        
        <main className="page-main">

          {/* Header */}
          <PageHeader
  title="Finance Engine"
  subtitle="Financial management · Income · Expenses · Cashflow"
  actions={
    <>
      <select
        value={selectedOrgId}
        onChange={e => setSelectedOrgId(e.target.value)}
        className={s.input}
        style={{ width: "180px" }}
      >
        {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
      <button className={s.btnGold} onClick={() => setShowAddTx(true)}>+ Transaction</button>
      <button className={s.btnGhost} onClick={() => setShowAddExpense(true)}>+ Expense</button>
    </>
  }
/>

          {/* Org context */}
          {selectedOrg && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", background: "var(--bg-card)", borderRadius: "10px", border: "1px solid var(--border)" }}>
              <span style={{ fontSize: "16px" }}>🏢</span>
              <div>
                <span style={{ fontSize: "13px", fontWeight: 600 }}>{selectedOrg.name}</span>
                <span style={{ fontSize: "11px", color: "var(--text-muted)", marginLeft: "8px" }}>{selectedOrg.location} · {selectedOrg.package} package</span>
              </div>
            </div>
          )}

          {error && (
            <ErrorBanner
              message={error}
              source="dashboard/finance"
              onRetry={selectedOrgId ? loadFinanceData : loadOrgs}
            />
          )}

          {orgsLoading ? (
            <div style={{ padding: 40, textAlign: "center", fontSize: 13, color: "var(--text-muted)" }}>
              Loading organizations...
            </div>
          ) : dataLoading ? (
            <div style={{ padding: 40, textAlign: "center", fontSize: 13, color: "var(--text-muted)" }}>
              Loading finance data...
            </div>
          ) : (
          <>
          {/* Summary cards */}
          <div className={s.summaryCards}>
            {[
              { label: "Total Income", value: formatKES(totalIncome), color: "#3dd68c", sub: `${transactions.filter(t => t.type === "income").length} transactions`, icon: "📈" },
              { label: "Total Expenses", value: formatKES(totalExpenses), color: "#ef4444", sub: `${transactions.filter(t => t.type === "expense").length} transactions`, icon: "📉" },
              { label: "Net Profit", value: formatKES(netProfit), color: netProfit >= 0 ? "#3dd68c" : "#ef4444", sub: netProfit >= 0 ? "Profitable" : "Loss", icon: "💰" },
              { label: "Net Cashflow", value: formatKES(netCashflow), color: netCashflow >= 0 ? "#3dd68c" : "#ef4444", sub: `↑ ${formatKES(totalInflow)} · ↓ ${formatKES(totalOutflow)}`, icon: "💧" },
            ].map((card, i) => (
              <div key={i} className={s.card} style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{card.label}</span>
                  <span style={{ fontSize: "16px" }}>{card.icon}</span>
                </div>
                <div style={{ fontSize: "18px", fontWeight: 700, color: card.color }}>{card.value}</div>
                <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px" }}>{card.sub}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: "4px", borderBottom: "1px solid var(--border)", paddingBottom: "0" }}>
            {(["overview", "transactions", "expenses", "cashflow"] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: "8px 16px", borderRadius: "8px 8px 0 0",
                  border: "none", background: tab === t ? "var(--bg-card)" : "transparent",
                  color: tab === t ? "var(--gold)" : "var(--text-muted)",
                  fontSize: "12px", fontWeight: tab === t ? 700 : 400,
                  cursor: "pointer", fontFamily: "inherit",
                  borderBottom: tab === t ? "2px solid var(--gold)" : "2px solid transparent",
                  textTransform: "capitalize",
                }}
              >{t}</button>
            ))}
          </div>

          {/* OVERVIEW TAB */}
          {tab === "overview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {/* Recent transactions */}
              <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>RECENT TRANSACTIONS</div>
              {transactions.slice(0, 6).map((tx, i) => (
                <div key={tx.id} style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  padding: "12px 14px", background: "var(--bg-card)",
                  borderRadius: "10px", border: "1px solid var(--border)",
                }}>
                  <div style={{
                    width: "36px", height: "36px", borderRadius: "10px", flexShrink: 0,
                    background: tx.type === "income" ? "rgba(61,214,140,0.1)" : "rgba(239,68,68,0.1)",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px",
                  }}>
                    {paymentMethodIcons[tx.payment_method] ?? "💵"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: "2px" }}>{tx.description}</div>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                      {tx.category} · {tx.payment_method} · {timeAgo(tx.date)}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: tx.type === "income" ? "#3dd68c" : "#ef4444" }}>
                      {tx.type === "income" ? "+" : "-"}{formatKES(tx.amount)}
                    </div>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "capitalize" }}>{tx.type}</div>
                  </div>
                </div>
              ))}

              {/* Expense breakdown */}
              <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginTop: "8px", marginBottom: "4px" }}>EXPENSE BREAKDOWN</div>
              {Object.entries(
                expenses.reduce((acc, e) => {
                  acc[e.category] = (acc[e.category] ?? 0) + e.amount;
                  return acc;
                }, {} as Record<string, number>)
              ).sort((a, b) => b[1] - a[1]).map(([cat, amount], i) => {
                const pct = Math.round((amount / expenses.reduce((s, e) => s + e.amount, 0)) * 100) || 0;
                const color = categoryColors[cat] ?? "#6b7280";
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "11px", color: "var(--text-secondary)", width: "80px", textTransform: "capitalize", flexShrink: 0 }}>{cat}</span>
                    <div style={{ flex: 1, height: "6px", borderRadius: "3px", background: "var(--bg-elevated)", overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: "3px", transition: "width 0.5s ease" }} />
                    </div>
                    <span style={{ fontSize: "11px", color, fontWeight: 600, width: "80px", textAlign: "right", flexShrink: 0 }}>{formatKES(amount)}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* TRANSACTIONS TAB */}
          {tab === "transactions" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", gap: "8px" }}>
                {["all", "income", "expense"].map(f => (
                  <button key={f} onClick={() => setTxFilter(f)} className={txFilter === f ? s.filterBtnActive : s.filterBtn} style={{ textTransform: "capitalize" }}>{f}</button>
                ))}
              </div>
              {filteredTx.map(tx => (
                <div key={tx.id} style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  padding: "12px 14px", background: "var(--bg-card)",
                  borderRadius: "10px", border: `1px solid var(--border)`,
                  borderLeft: `3px solid ${tx.type === "income" ? "#3dd68c" : "#ef4444"}`,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "13px", fontWeight: 600 }}>{tx.description}</div>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>
                      {tx.category} · {paymentMethodIcons[tx.payment_method]} {tx.payment_method} · {new Date(tx.date).toLocaleDateString("en-KE")}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: tx.type === "income" ? "#3dd68c" : "#ef4444" }}>
                      {tx.type === "income" ? "+" : "-"}{formatKES(tx.amount)}
                    </div>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "capitalize" }}>{tx.status}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* EXPENSES TAB */}
          {tab === "expenses" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {expenses.map(expense => (
                <div key={expense.id} style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  padding: "12px 14px", background: "var(--bg-card)",
                  borderRadius: "10px", border: "1px solid var(--border)",
                  borderLeft: "3px solid #ef4444",
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "13px", fontWeight: 600 }}>{expense.title}</div>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>
                      {expense.vendor && `${expense.vendor} · `}{expense.category} · {new Date(expense.date).toLocaleDateString("en-KE")}
                    </div>
                    {expense.notes && <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px", fontStyle: "italic" }}>{expense.notes}</div>}
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#ef4444" }}>-{formatKES(expense.amount)}</div>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>{paymentMethodIcons[expense.payment_method]} {expense.payment_method}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* CASHFLOW TAB */}
          {tab === "cashflow" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {/* Cashflow summary */}
              <div style={{ display: "flex", gap: "12px" }}>
                <div className={s.card} style={{ flex: 1 }}>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "6px" }}>Total Inflow</div>
                  <div style={{ fontSize: "20px", fontWeight: 700, color: "#3dd68c" }}>{formatKES(totalInflow)}</div>
                </div>
                <div className={s.card} style={{ flex: 1 }}>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "6px" }}>Total Outflow</div>
                  <div style={{ fontSize: "20px", fontWeight: 700, color: "#ef4444" }}>{formatKES(totalOutflow)}</div>
                </div>
                <div className={s.card} style={{ flex: 1, border: `1px solid ${netCashflow >= 0 ? "rgba(61,214,140,0.3)" : "rgba(239,68,68,0.3)"}` }}>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "6px" }}>Net Position</div>
                  <div style={{ fontSize: "20px", fontWeight: 700, color: netCashflow >= 0 ? "#3dd68c" : "#ef4444" }}>{formatKES(netCashflow)}</div>
                </div>
              </div>

              {/* Cashflow entries */}
              {cashflow.map((entry, i) => (
                <div key={entry.id} style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  padding: "12px 14px", background: "var(--bg-card)",
                  borderRadius: "10px", border: "1px solid var(--border)",
                  borderLeft: `3px solid ${entry.type === "inflow" ? "#3dd68c" : "#ef4444"}`,
                }}>
                  <div style={{
                    width: "32px", height: "32px", borderRadius: "8px", flexShrink: 0,
                    background: entry.type === "inflow" ? "rgba(61,214,140,0.1)" : "rgba(239,68,68,0.1)",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px",
                  }}>
                    {entry.type === "inflow" ? "↑" : "↓"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "13px", fontWeight: 600 }}>{entry.description}</div>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>{new Date(entry.date).toLocaleDateString("en-KE")}</div>
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: entry.type === "inflow" ? "#3dd68c" : "#ef4444" }}>
                    {entry.type === "inflow" ? "+" : "-"}{formatKES(entry.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
          </>
          )}
        </main>
      </div>

      {/* Add Transaction Modal */}
      {showAddTx && (
        <div className={s.modal} onClick={() => setShowAddTx(false)}>
          <div className={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: "15px", fontWeight: 700 }}>New Transaction</div>

            <div style={{ display: "flex", gap: "6px" }}>
              {["income", "expense"].map(type => (
                <button key={type} onClick={() => setNewTx(p => ({ ...p, type: type as "income" | "expense" }))}
                  style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: "12px", fontWeight: 600, textTransform: "capitalize",
                    background: newTx.type === type ? (type === "income" ? "#3dd68c" : "#ef4444") : "var(--bg-elevated)",
                    color: newTx.type === type ? "#07070f" : "var(--text-muted)",
                  }}>{type}</button>
              ))}
            </div>

            {[
              { label: "AMOUNT (KES)", key: "amount", placeholder: "e.g. 25000", type: "number" },
              { label: "DESCRIPTION", key: "description", placeholder: "e.g. Subscription payment" },
              { label: "CATEGORY", key: "category", placeholder: "e.g. subscription, payroll" },
            ].map(field => (
              <div key={field.key}>
                <label style={{ fontSize: "10px", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>{field.label}</label>
                <input type={field.type ?? "text"} value={newTx[field.key as keyof typeof newTx]} onChange={e => setNewTx(p => ({ ...p, [field.key]: e.target.value }))} placeholder={field.placeholder} className={s.input} />
              </div>
            ))}

            <div>
              <label style={{ fontSize: "10px", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>PAYMENT METHOD</label>
              <select value={newTx.payment_method} onChange={e => setNewTx(p => ({ ...p, payment_method: e.target.value }))} className={s.input}>
                {["mpesa", "bank", "cash", "card"].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <div>
              <label style={{ fontSize: "10px", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>DATE</label>
              <input type="date" value={newTx.date} onChange={e => setNewTx(p => ({ ...p, date: e.target.value }))} className={s.input} />
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={handleAddTx} className={s.btnGold} style={{ flex: 1 }}>Save Transaction</button>
              <button onClick={() => setShowAddTx(false)} className={s.btnGhost} style={{ flex: 1 }}>Cancel</button>
            </div>
            {actionError && (
              <div style={{ fontSize: 11, color: "#ef4444" }}>{actionError}</div>
            )}
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {showAddExpense && (
        <div className={s.modal} onClick={() => setShowAddExpense(false)}>
          <div className={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: "15px", fontWeight: 700 }}>New Expense</div>

            {[
              { label: "TITLE", key: "title", placeholder: "e.g. Office Rent" },
              { label: "AMOUNT (KES)", key: "amount", placeholder: "e.g. 45000", type: "number" },
              { label: "CATEGORY", key: "category", placeholder: "e.g. operations, payroll" },
              { label: "VENDOR", key: "vendor", placeholder: "e.g. Landlord, Safaricom" },
              { label: "NOTES", key: "notes", placeholder: "Optional notes" },
            ].map(field => (
              <div key={field.key}>
                <label style={{ fontSize: "10px", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>{field.label}</label>
                <input type={field.type ?? "text"} value={newExpense[field.key as keyof typeof newExpense] as string} onChange={e => setNewExpense(p => ({ ...p, [field.key]: e.target.value }))} placeholder={field.placeholder} className={s.input} />
              </div>
            ))}

            <div style={{ display: "flex", gap: "8px" }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: "10px", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>PAYMENT METHOD</label>
                <select value={newExpense.payment_method} onChange={e => setNewExpense(p => ({ ...p, payment_method: e.target.value }))} className={s.input}>
                  {["mpesa", "bank", "cash", "card"].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: "10px", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>DATE</label>
                <input type="date" value={newExpense.date} onChange={e => setNewExpense(p => ({ ...p, date: e.target.value }))} className={s.input} />
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={handleAddExpense} className={s.btnGold} style={{ flex: 1 }}>Save Expense</button>
              <button onClick={() => setShowAddExpense(false)} className={s.btnGhost} style={{ flex: 1 }}>Cancel</button>
            </div>
            {actionError && (
              <div style={{ fontSize: 11, color: "#ef4444" }}>{actionError}</div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}