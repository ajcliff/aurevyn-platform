"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getReceipts, type Receipt } from "@/lib/receipts";
import { getInvoices, type Invoice } from "@/lib/invoices";
import { getOrganizations, type Organization } from "@/lib/organizations";
import { getCompanyExpenses, createCompanyExpense, deleteCompanyExpense, type CompanyExpense, type ExpenseCategory } from "@/lib/companyExpenses";
import { formatError } from "@/lib/errorFormat";
import ErrorBanner from "@/components/ErrorBanner";
import s from "@/styles/layout.module.css";
import PageHeader from "@/components/PageHeader";

type Tab = "income" | "expenses" | "owed";
type Range = "month" | "all";

const CATEGORIES: ExpenseCategory[] = ["hosting", "domains", "apis", "subscriptions", "software", "legal", "marketing", "other"];

const kes = (n: number) => `KES ${Math.round(n).toLocaleString()}`;
const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => new Date().toISOString().slice(0, 7) + "-01";

export default function FounderFinancePage() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [expenses, setExpenses] = useState<CompanyExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("income");
  const [range, setRange] = useState<Range>("month");
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ date: today(), category: "hosting" as ExpenseCategory, vendor: "", description: "", amount: "", notes: "" });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [r, i, o, e] = await Promise.all([getReceipts(), getInvoices(), getOrganizations(), getCompanyExpenses()]);
      setReceipts(r);
      setInvoices(i);
      setOrgs(o);
      setExpenses(e);
    } catch (err) {
      setError(formatError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const orgName = useMemo(() => new Map(orgs.map((o) => [o.id, o.name])), [orgs]);
  const invoiceById = useMemo(() => new Map(invoices.map((i) => [i.id, i])), [invoices]);

  const from = range === "month" ? monthStart() : "0000-01-01";
  const inRange = (isoDate: string) => isoDate.slice(0, 10) >= from;

  const rangeReceipts = receipts.filter((r) => inRange(r.paid_at));
  const rangeExpenses = expenses.filter((e) => inRange(e.date));
  const totalReceived = rangeReceipts.reduce((t, r) => t + Number(r.amount_kes), 0);
  const totalSpent = rangeExpenses.reduce((t, e) => t + Number(e.amount), 0);
  const net = totalReceived - totalSpent;

  const unpaid = invoices.filter((i) => i.status !== "paid");
  const outstanding = unpaid.reduce((t, i) => t + Number(i.amount_kes ?? 0), 0);

  async function addExpense() {
    const amount = Number(form.amount);
    if (!form.description.trim() || !(amount > 0)) return;
    setSaving(true);
    try {
      await createCompanyExpense({
        date: form.date,
        category: form.category,
        vendor: form.vendor.trim() || undefined,
        description: form.description.trim(),
        amount,
        currency: "KES",
        notes: form.notes.trim() || undefined,
      });
      setShowAdd(false);
      setForm({ date: today(), category: "hosting", vendor: "", description: "", amount: "", notes: "" });
      setTab("expenses");
      await load();
    } catch (err) {
      setError(formatError(err));
    } finally {
      setSaving(false);
    }
  }

  async function removeExpense(id: string) {
    if (!window.confirm("Delete this expense?")) return;
    try {
      await deleteCompanyExpense(id);
      setExpenses((list) => list.filter((e) => e.id !== id));
    } catch (err) {
      setError(formatError(err));
    }
  }

  const th: React.CSSProperties = { textAlign: "left", fontSize: 11, color: "var(--text-muted)", fontWeight: 600, padding: "8px 10px", borderBottom: "1px solid var(--border)" };
  const td: React.CSSProperties = { fontSize: 12.5, padding: "9px 10px", borderBottom: "1px solid var(--border)" };

  return (
    <div className="page-shell">
      <div className={s.body}>
        <main className="page-main">
          <PageHeader
            title="AUREVYN finances"
            subtitle="What customers pay AUREVYN, and what AUREVYN spends. Your own books, not any customer's."
            actions={
              <>
                <select value={range} onChange={(e) => setRange(e.target.value as Range)} className={s.input} style={{ width: 130 }}>
                  <option value="month">This month</option>
                  <option value="all">All time</option>
                </select>
                <button className={s.btnGold} onClick={() => setShowAdd(true)}>+ Expense</button>
              </>
            }
          />

          {error && <ErrorBanner message={error} source="dashboard/finance" onRetry={load} />}

          {loading ? (
            <div style={{ padding: 40, textAlign: "center", fontSize: 13, color: "var(--text-muted)" }}>Loading…</div>
          ) : (
            <>
              <div className={s.summaryCards}>
                {[
                  { label: "Received from customers", value: kes(totalReceived), color: "#3dd68c", sub: `${rangeReceipts.length} payment${rangeReceipts.length === 1 ? "" : "s"}` },
                  { label: "Spent", value: kes(totalSpent), color: "#ef4444", sub: `${rangeExpenses.length} expense${rangeExpenses.length === 1 ? "" : "s"}` },
                  { label: "Net", value: kes(net), color: net >= 0 ? "#3dd68c" : "#ef4444", sub: net >= 0 ? "In the black" : "In the red" },
                  { label: "Still owed to AUREVYN", value: kes(outstanding), color: outstanding > 0 ? "#f59e0b" : "var(--text-primary)", sub: `${unpaid.length} unpaid invoice${unpaid.length === 1 ? "" : "s"}` },
                ].map((card) => (
                  <div key={card.label} className={s.card} style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>{card.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: card.color }}>{card.value}</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>{card.sub}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--border)" }}>
                {([["income", "Income"], ["expenses", "Expenses"], ["owed", "Owed to us"]] as [Tab, string][]).map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setTab(id)}
                    style={{
                      padding: "8px 16px", borderRadius: "8px 8px 0 0", border: "none",
                      background: tab === id ? "var(--bg-card)" : "transparent",
                      color: tab === id ? "var(--gold)" : "var(--text-muted)",
                      fontSize: 12, fontWeight: tab === id ? 700 : 400, cursor: "pointer", fontFamily: "inherit",
                      borderBottom: tab === id ? "2px solid var(--gold)" : "2px solid transparent",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {tab === "income" && (
                <div className={s.card} style={{ padding: 0, overflow: "hidden" }}>
                  {rangeReceipts.length === 0 ? (
                    <div style={{ padding: 30, textAlign: "center", fontSize: 13, color: "var(--text-muted)" }}>
                      No customer payments {range === "month" ? "this month" : "yet"}. When a business pays an invoice it appears here with its receipt.
                    </div>
                  ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>{["Date", "Customer", "Invoice", "Receipt", "Method", "Reference", "Amount"].map((h, i) => <th key={h} style={{ ...th, textAlign: i === 6 ? "right" : "left" }}>{h}</th>)}</tr>
                      </thead>
                      <tbody>
                        {rangeReceipts.map((r) => (
                          <tr key={r.id}>
                            <td style={td}>{r.paid_at.slice(0, 10)}</td>
                            <td style={{ ...td, fontWeight: 600 }}>{orgName.get(r.org_id) ?? "Unknown"}</td>
                            <td style={td}>{invoiceById.get(r.invoice_id)?.invoice_no ?? "—"}</td>
                            <td style={td}>{r.receipt_no}</td>
                            <td style={td}>{r.method}</td>
                            <td style={{ ...td, color: "var(--text-muted)" }}>{r.reference ?? "—"}</td>
                            <td style={{ ...td, textAlign: "right", fontWeight: 700, color: "#3dd68c" }}>{kes(Number(r.amount_kes))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {tab === "expenses" && (
                <div className={s.card} style={{ padding: 0, overflow: "hidden" }}>
                  {rangeExpenses.length === 0 ? (
                    <div style={{ padding: 30, textAlign: "center", fontSize: 13, color: "var(--text-muted)" }}>
                      No expenses {range === "month" ? "this month" : "yet"}. Add hosting, domains, tools and anything else AUREVYN pays for.
                    </div>
                  ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>{["Date", "Category", "Vendor", "Description", "Amount", ""].map((h, i) => <th key={i} style={{ ...th, textAlign: i === 4 ? "right" : "left" }}>{h}</th>)}</tr>
                      </thead>
                      <tbody>
                        {rangeExpenses.map((e) => (
                          <tr key={e.id}>
                            <td style={td}>{e.date}</td>
                            <td style={{ ...td, textTransform: "capitalize" }}>{e.category}</td>
                            <td style={td}>{e.vendor ?? "—"}</td>
                            <td style={td}>{e.description}</td>
                            <td style={{ ...td, textAlign: "right", fontWeight: 700, color: "#ef4444" }}>{kes(Number(e.amount))}</td>
                            <td style={{ ...td, textAlign: "right" }}>
                              <button onClick={() => removeExpense(e.id)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 12 }}>Delete</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {tab === "owed" && (
                <div className={s.card} style={{ padding: 0, overflow: "hidden" }}>
                  {unpaid.length === 0 ? (
                    <div style={{ padding: 30, textAlign: "center", fontSize: 13, color: "var(--text-muted)" }}>Nothing outstanding. Every invoice is paid.</div>
                  ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>{["Customer", "Invoice", "Due", "Status", "Amount"].map((h, i) => <th key={h} style={{ ...th, textAlign: i === 4 ? "right" : "left" }}>{h}</th>)}</tr>
                      </thead>
                      <tbody>
                        {unpaid.map((i) => (
                          <tr key={i.id}>
                            <td style={{ ...td, fontWeight: 600 }}>{orgName.get(i.org_id) ?? i.org_name}</td>
                            <td style={td}>{i.invoice_no}</td>
                            <td style={td}>{i.due_date}</td>
                            <td style={{ ...td, color: i.status === "overdue" ? "#ef4444" : "#f59e0b", textTransform: "capitalize" }}>{i.status}</td>
                            <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{kes(Number(i.amount_kes))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                To look at one customer&apos;s own books, open it from <Link href="/dashboard/organizations" style={{ color: "var(--gold)" }}>Organizations</Link>. Nothing you do here touches a customer&apos;s records.
              </div>
            </>
          )}

          {showAdd && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
              <div style={{ width: 440, maxWidth: "94vw", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 24 }}>
                <h2 style={{ marginBottom: 14 }}>Add AUREVYN expense</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", gap: 10 }}>
                    <input className={s.input} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={{ flex: 1 }} />
                    <select className={s.input} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ExpenseCategory })} style={{ flex: 1, textTransform: "capitalize" }}>
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <input className={s.input} placeholder="Vendor (e.g. Vercel, Supabase)" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} />
                  <input className={s.input} placeholder="What was it for? *" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                  <input className={s.input} type="number" min="0" placeholder="Amount (KES) *" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                  <input className={s.input} placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  <button className={s.btnGhost} style={{ flex: 1 }} onClick={() => setShowAdd(false)}>Cancel</button>
                  <button className={s.btnGold} style={{ flex: 1 }} onClick={addExpense} disabled={saving}>{saving ? "Saving…" : "Save expense"}</button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
