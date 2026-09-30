"use client";

import { useEffect, useState, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getCompanyExpenses, createCompanyExpense, deleteCompanyExpense, type CompanyExpense, type ExpenseCategory } from "@/lib/companyExpenses";
import {
  getScheduledCompanyExpenses, getScheduledPlatformInvoices,
  createScheduleFromExpense, createScheduleFromPlatformInvoice, createScheduledCompanyExpense,
  toggleScheduledExpenseActive, deleteScheduledExpense, toggleScheduledPlatformInvoiceActive, deleteScheduledPlatformInvoice,
  type ScheduledCompanyExpense, type ScheduledPlatformInvoice, type ScheduleFrequency,
} from "@/lib/founderScheduledDocuments";
import { getInvoices, type Invoice } from "@/lib/invoices";
import { getPackages, type Package } from "@/lib/packages";
import { logActivity } from "@/lib/activity";
import { formatError } from "@/lib/errorFormat";
import ErrorBanner from "@/components/ErrorBanner";
import Modal from "@/components/founder/Modal";
import ConfirmDialog from "@/components/founder/ConfirmDialog";
import { daysUntil, kes, shortDate, toNumber, today } from "@/components/company/utils";
import f from "@/styles/founder.module.css";
import c from "@/styles/company.module.css";

// Amounts are treated as KES throughout; the company_expenses table keeps a currency column but this view does not convert.

type Tab = "overview" | "expenses" | "revenue" | "recurring";
const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "expenses", label: "Expenses" },
  { id: "revenue", label: "Revenue" },
  { id: "recurring", label: "Recurring" },
];

const CATEGORIES: ExpenseCategory[] = ["hosting", "domains", "apis", "subscriptions", "software", "legal", "marketing", "other"];
const FREQUENCIES: { id: ScheduleFrequency; label: string }[] = [
  { id: "weekly", label: "Every week" }, { id: "monthly", label: "Every month" }, { id: "quarterly", label: "Every quarter" }, { id: "annual", label: "Every year" },
];
const frequencyLabel = Object.fromEntries(FREQUENCIES.map(x => [x.id, x.label])) as Record<ScheduleFrequency, string>;
const monthlyFactor: Record<ScheduleFrequency, number> = { weekly: 52 / 12, monthly: 1, quarterly: 1 / 3, annual: 1 / 12 };

type Repeat = { kind: "expense"; item: CompanyExpense } | { kind: "invoice"; item: Invoice };
type Removal = { kind: "expense" | "billSchedule" | "invoiceSchedule"; id: string; label: string };

const emptyExpense = () => ({ date: today(), category: "other" as ExpenseCategory, vendor: "", description: "", amount: "", notes: "" });
const emptyBill = () => ({ category: "hosting" as ExpenseCategory, vendor: "", description: "", amount: "", frequency: "monthly" as ScheduleFrequency, startDate: today() });

export default function CompanyFinance({ scopeSelect }: { scopeSelect: ReactNode }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [expenses, setExpenses] = useState<CompanyExpense[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [bills, setBills] = useState<ScheduledCompanyExpense[]>([]);
  const [invoiceSchedules, setInvoiceSchedules] = useState<ScheduledPlatformInvoice[]>([]);

  const [categoryFilter, setCategoryFilter] = useState<"all" | ExpenseCategory>("all");
  const [showExpense, setShowExpense] = useState(false);
  const [expenseForm, setExpenseForm] = useState(emptyExpense);
  const [showBill, setShowBill] = useState(false);
  const [billForm, setBillForm] = useState(emptyBill);
  const [repeat, setRepeat] = useState<Repeat | null>(null);
  const [repeatFrequency, setRepeatFrequency] = useState<ScheduleFrequency>("monthly");
  const [removal, setRemoval] = useState<Removal | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [exp, inv, pkg, sb, si] = await Promise.all([
        getCompanyExpenses(), getInvoices(), getPackages(), getScheduledCompanyExpenses(), getScheduledPlatformInvoices(),
      ]);
      setExpenses(exp); setInvoices(inv); setPackages(pkg); setBills(sb); setInvoiceSchedules(si);
    } catch (err) {
      setError(formatError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ---- numbers ----
  const sumInvoices = (status: Invoice["status"]) => invoices.filter(i => i.status === status).reduce((s, i) => s + toNumber(i.amount), 0);
  const collected = sumInvoices("paid");
  const pending = sumInvoices("pending");
  const overdue = sumInvoices("overdue");
  const spent = expenses.reduce((s, e) => s + e.amount, 0);
  const net = collected - spent;
  const mrr = packages.reduce((s, p) => s + toNumber(p.price) * p.orgs, 0);
  const subscriptions = packages.reduce((s, p) => s + p.orgs, 0);
  const activeBills = bills.filter(b => b.active);
  const monthlyCost = activeBills.reduce((s, b) => s + b.amount * monthlyFactor[b.frequency], 0);
  const coverage = monthlyCost > 0 ? Math.round((mrr / monthlyCost) * 100) : null;
  const spent30 = expenses.filter(e => daysUntil(e.date) >= -30 && daysUntil(e.date) <= 0).reduce((s, e) => s + e.amount, 0);
  const ledgerTotal = collected + spent;
  const collectedShare = ledgerTotal > 0 ? (collected / ledgerTotal) * 100 : 0;

  const byCategory = Object.entries(expenses.reduce((acc, e) => { acc[e.category] = (acc[e.category] ?? 0) + e.amount; return acc; }, {} as Record<string, number>)).sort((a, b) => b[1] - a[1]);
  const shownExpenses = expenses.filter(e => categoryFilter === "all" || e.category === categoryFilter);

  const upcoming = [
    ...activeBills.map(b => ({ id: `b-${b.id}`, date: b.next_run, title: b.description, sub: `Bill${b.vendor ? ` · ${b.vendor}` : ""}`, amount: -b.amount })),
    ...invoiceSchedules.filter(s => s.active).map(s => ({ id: `i-${s.id}`, date: s.next_run, title: `${s.org_name}: ${s.description}`, sub: "Invoice", amount: s.amount })),
  ].filter(u => daysUntil(u.date) <= 30).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 8);

  const headline = loading ? "Loading company finances"
    : ledgerTotal === 0 ? "AUREVYN has no recorded income or expenses yet."
    : net >= 0 ? `AUREVYN is ${kes(net)} ahead to date.` : `AUREVYN is ${kes(Math.abs(net))} behind to date.`;

  // ---- actions ----
  async function addExpense() {
    const amount = parseFloat(expenseForm.amount);
    if (!expenseForm.description.trim() || !amount || amount <= 0) { setActionError("Add a description and an amount above zero."); return; }
    setActionError(null);
    try {
      const created = await createCompanyExpense({
        date: expenseForm.date, category: expenseForm.category, vendor: expenseForm.vendor || undefined,
        description: expenseForm.description.trim(), amount, notes: expenseForm.notes || undefined,
      });
      setExpenses(prev => [created, ...prev].sort((a, b) => b.date.localeCompare(a.date)));
      await logActivity({ icon: "💸", title: "Company expense recorded", sub: `${kes(amount)}: ${created.description}` });
      setShowExpense(false);
    } catch (err) { setActionError(formatError(err)); }
  }

  async function addBill() {
    const amount = parseFloat(billForm.amount);
    if (!billForm.description.trim() || !amount || amount <= 0) { setActionError("Add a description and an amount above zero."); return; }
    setActionError(null);
    try {
      const created = await createScheduledCompanyExpense({
        category: billForm.category, vendor: billForm.vendor || undefined, description: billForm.description.trim(),
        amount, frequency: billForm.frequency, startDate: billForm.startDate,
      });
      setBills(prev => [...prev, created].sort((a, b) => a.next_run.localeCompare(b.next_run)));
      setShowBill(false);
    } catch (err) { setActionError(formatError(err)); }
  }

  async function confirmRepeat() {
    if (!repeat) return;
    setActionError(null);
    try {
      if (repeat.kind === "expense") {
        const created = await createScheduleFromExpense(repeat.item, repeatFrequency);
        setBills(prev => [...prev, created].sort((a, b) => a.next_run.localeCompare(b.next_run)));
      } else {
        const created = await createScheduleFromPlatformInvoice(repeat.item, repeatFrequency);
        setInvoiceSchedules(prev => [...prev, created].sort((a, b) => a.next_run.localeCompare(b.next_run)));
      }
      setRepeat(null);
      setTab("recurring");
    } catch (err) { setActionError(formatError(err)); }
  }

  async function toggleBill(b: ScheduledCompanyExpense) {
    try {
      await toggleScheduledExpenseActive(b.id, !b.active);
      setBills(prev => prev.map(x => (x.id === b.id ? { ...x, active: !b.active } : x)));
    } catch (err) { setError(formatError(err)); }
  }
  async function toggleInvoiceSchedule(s: ScheduledPlatformInvoice) {
    try {
      await toggleScheduledPlatformInvoiceActive(s.id, !s.active);
      setInvoiceSchedules(prev => prev.map(x => (x.id === s.id ? { ...x, active: !s.active } : x)));
    } catch (err) { setError(formatError(err)); }
  }

  async function confirmRemoval() {
    if (!removal) return;
    try {
      if (removal.kind === "expense") { await deleteCompanyExpense(removal.id); setExpenses(prev => prev.filter(e => e.id !== removal.id)); }
      else if (removal.kind === "billSchedule") { await deleteScheduledExpense(removal.id); setBills(prev => prev.filter(b => b.id !== removal.id)); }
      else { await deleteScheduledPlatformInvoice(removal.id); setInvoiceSchedules(prev => prev.filter(s => s.id !== removal.id)); }
    } catch (err) { setError(formatError(err)); }
    setRemoval(null);
  }

  const openExpense = () => { setActionError(null); setExpenseForm(emptyExpense()); setShowExpense(true); };
  const openBill = () => { setActionError(null); setBillForm(emptyBill()); setShowBill(true); };
  const openRepeat = (r: Repeat) => { setActionError(null); setRepeatFrequency("monthly"); setRepeat(r); };

  return (
    <div className={`page-shell ${f.root}`}>
      <main className="page-main">
        <div className={f.page}>
          <div className={f.top}>
            <div>
              <p className={f.greeting}>Finance</p>
              <h1 className={`${f.headline} ${f.headlineWide}`}>{headline}</h1>
            </div>
            <div className={f.actions}>
              {scopeSelect}
              <button className={f.primary} onClick={openExpense}>New expense</button>
            </div>
          </div>

          {error && <ErrorBanner message={error} source="dashboard/finance/company" onRetry={load} />}

          {loading ? (
            <p className={f.status} role="status">Loading company finances…</p>
          ) : (
            <>
              <section aria-label="Collected against spent">
                {ledgerTotal > 0 ? (
                  <div className={f.balance} role="img" aria-label={`Collected ${kes(collected)}, spent ${kes(spent)}`}>
                    <span className={f.segIncome} style={{ width: `${collectedShare}%` }} />
                    <span className={f.segExpense} style={{ width: `${100 - collectedShare}%` }} />
                  </div>
                ) : <div className={f.balanceTrack} />}
                <div className={f.legend}>
                  <div className={f.legendItem}>
                    <span className={f.legendLabel}><i className={f.swatch} style={{ background: "var(--green)" }} />Collected from customers</span>
                    <span className={f.legendValue}>{kes(collected)}</span>
                  </div>
                  <div className={f.legendItem} style={{ alignItems: "flex-end" }}>
                    <span className={f.legendLabel}>Spent on the company<i className={f.swatch} style={{ background: "color-mix(in srgb, var(--red) 80%, var(--bg-base))" }} /></span>
                    <span className={f.legendValue} style={{ paddingLeft: 0, paddingRight: 17 }}>{kes(spent)}</span>
                  </div>
                </div>
              </section>

              <div className={`${f.vitals} ${f.vitalsThree}`}>
                <div className={`${f.vital} ${f.vitalStatic}`}>
                  <span className={f.vitalLabel}>Monthly recurring revenue</span>
                  <span className={f.vitalValue}>{kes(mrr)}</span>
                  <span className={f.vitalSub}>{coverage !== null ? `Covers ${coverage}% of monthly running costs` : `${subscriptions} subscriptions`}</span>
                </div>
                <div className={`${f.vital} ${f.vitalStatic}`}>
                  <span className={f.vitalLabel}>Monthly running costs</span>
                  <span className={f.vitalValue}>{kes(monthlyCost)}</span>
                  <span className={f.vitalSub}>{activeBills.length} active recurring {activeBills.length === 1 ? "bill" : "bills"}</span>
                </div>
                <div className={`${f.vital} ${f.vitalStatic}`}>
                  <span className={f.vitalLabel}>Spent in the last 30 days</span>
                  <span className={f.vitalValue}>{kes(spent30)}</span>
                  <span className={f.vitalSub}>{overdue > 0 ? `${kes(overdue)} still owed to you` : pending > 0 ? `${kes(pending)} waiting to be paid` : "No unpaid invoices"}</span>
                </div>
              </div>

              <div>
                <div className={f.tabs} role="tablist" aria-label="Company finance sections">
                  {TABS.map(t => (
                    <button key={t.id} role="tab" id={`cf-tab-${t.id}`} aria-selected={tab === t.id} aria-controls="cf-panel" className={f.tab} onClick={() => setTab(t.id)}>{t.label}</button>
                  ))}
                </div>

                <div id="cf-panel" role="tabpanel" aria-labelledby={`cf-tab-${tab}`} className={f.tabPanel} style={{ paddingTop: 28 }}>
                  {tab === "overview" && (
                    <div className={f.split}>
                      <section aria-labelledby="cf-spend">
                        <div className={f.sectionHead}>
                          <h2 id="cf-spend" className={f.sectionTitle}>Where the money goes</h2>
                          <span className={f.sectionSub}>{kes(spent)} in total</span>
                        </div>
                        {byCategory.length === 0 ? (
                          <div className={f.empty}><strong>No expenses recorded.</strong>Hosting, domains, APIs, software and other costs will be broken down here.<div><button className={f.secondary} onClick={openExpense}>New expense</button></div></div>
                        ) : (
                          <div className={f.bars}>
                            {byCategory.map(([cat, amount]) => {
                              const pct = spent > 0 ? Math.round((amount / spent) * 100) : 0;
                              return (
                                <div key={cat} className={f.barRow}>
                                  <span className={f.barName}>{cat}</span>
                                  <div className={f.barTrack}><div className={f.barFill} style={{ width: `${pct}%` }} /></div>
                                  <span className={f.barAmt}><b>{kes(amount)}</b> · {pct}%</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </section>

                      <section aria-labelledby="cf-soon">
                        <div className={f.sectionHead}>
                          <h2 id="cf-soon" className={f.sectionTitle}>Coming up in 30 days</h2>
                          <button className={f.linkBtn} onClick={() => setTab("recurring")}>Manage</button>
                        </div>
                        {upcoming.length === 0 ? (
                          <div className={f.empty}><strong>No recurring bills or invoices due.</strong>Repeat an expense or invoice to have it appear here.</div>
                        ) : (
                          <ul className={c.timeline}>
                            {upcoming.map(u => {
                              const d = new Date(u.date);
                              return (
                                <li key={u.id} className={c.timeItem}>
                                  <div className={c.timeDate}>{d.toLocaleDateString("en-KE", { day: "numeric", month: "short" })}</div>
                                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                                    <div><div className={f.feedTitle}>{u.title}</div><div className={f.feedSub}>{u.sub}</div></div>
                                    <span className={u.amount > 0 ? f.income : undefined} style={{ fontFamily: "var(--num)", fontWeight: 600, whiteSpace: "nowrap" }}>{u.amount > 0 ? "+" : "−"}{kes(Math.abs(u.amount))}</span>
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </section>
                    </div>
                  )}

                  {tab === "expenses" && (
                    <>
                      <div className={f.toolbar}>
                        <select className={`${f.select} ${f.selectSm}`} aria-label="Filter by category" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value as "all" | ExpenseCategory)}>
                          <option value="all">All categories</option>
                          {CATEGORIES.map(k => <option key={k} value={k} style={{ textTransform: "capitalize" }}>{k}</option>)}
                        </select>
                        <span className={f.sectionSub}>{shownExpenses.length} {shownExpenses.length === 1 ? "expense" : "expenses"}, {kes(shownExpenses.reduce((s, e) => s + e.amount, 0))}</span>
                      </div>
                      {shownExpenses.length === 0 ? (
                        <div className={f.empty}><strong>{expenses.length === 0 ? "No expenses yet." : "No expenses in this category."}</strong>{expenses.length === 0 ? "Record what the company pays for, then repeat the regular ones." : "Choose another category."}{expenses.length === 0 && <div><button className={f.secondary} onClick={openExpense}>New expense</button></div>}</div>
                      ) : (
                        <div className={f.tableWrap}>
                          <table className={f.ledger}>
                            <thead><tr><th>Date</th><th>Expense</th><th>Category</th><th className={f.num}>Amount</th><th /></tr></thead>
                            <tbody>
                              {shownExpenses.map(e => (
                                <tr key={e.id}>
                                  <td className={f.cellMuted}>{shortDate(e.date)}</td>
                                  <td>
                                    <div className={f.cellMain}>{e.description}</div>
                                    {(e.vendor || e.notes) && <div className={f.cellSub}>{[e.vendor, e.notes].filter(Boolean).join(" · ")}</div>}
                                  </td>
                                  <td><span className={c.tag} style={{ textTransform: "capitalize" }}>{e.category}</span></td>
                                  <td className={f.num}>−{kes(e.amount)}</td>
                                  <td className={f.cellMuted}>
                                    <button className={f.linkBtn} onClick={() => openRepeat({ kind: "expense", item: e })}>Repeat</button>
                                    <button className={f.linkBtn} style={{ color: "var(--text-secondary)", marginLeft: 12 }} onClick={() => setRemoval({ kind: "expense", id: e.id, label: e.description })}>Delete</button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
                  )}

                  {tab === "revenue" && (
                    <>
                      <div className={f.toolbar}>
                        <span className={f.sectionSub}>Collected {kes(collected)} · Pending {kes(pending)} · Overdue {kes(overdue)}</span>
                        <button className={f.secondary} onClick={() => router.push("/dashboard/billing")}>Manage in Billing</button>
                      </div>
                      {invoices.length === 0 ? (
                        <div className={f.empty}><strong>No invoices yet.</strong>Invoices you raise for customer organizations show up here as revenue once they&apos;re paid.</div>
                      ) : (
                        <div className={f.tableWrap}>
                          <table className={f.ledger}>
                            <thead><tr><th>Customer</th><th>Due</th><th>Status</th><th className={f.num}>Amount</th><th /></tr></thead>
                            <tbody>
                              {invoices.map(inv => (
                                <tr key={inv.id}>
                                  <td><div className={f.cellMain}>{inv.org_name}</div><div className={f.cellSub}>{inv.description}</div></td>
                                  <td className={f.cellMuted}>{shortDate(inv.due_date)}</td>
                                  <td><span className={f.pill} data-status={inv.status}>{inv.status}</span></td>
                                  <td className={`${f.num} ${inv.status === "paid" ? f.income : ""}`}>{inv.amount}</td>
                                  <td className={f.cellMuted}><button className={f.linkBtn} onClick={() => openRepeat({ kind: "invoice", item: inv })}>Repeat</button></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
                  )}

                  {tab === "recurring" && (
                    <div className={c.stack}>
                      <section aria-labelledby="cf-bills">
                        <div className={f.sectionHead}>
                          <div>
                            <h2 id="cf-bills" className={f.sectionTitle}>Recurring bills</h2>
                            <p className={f.sectionSub} style={{ marginTop: 4 }}>{kes(monthlyCost)} a month across {activeBills.length} active.</p>
                          </div>
                          <button className={f.primary} onClick={openBill}>New recurring bill</button>
                        </div>
                        {bills.length === 0 ? (
                          <div className={f.empty}><strong>No recurring bills.</strong>Add hosting, domains and subscriptions that renew on a schedule, or use Repeat on an existing expense.</div>
                        ) : (
                          <div className={f.tableWrap}>
                            <table className={f.ledger}>
                              <thead><tr><th>Bill</th><th>Repeats</th><th>Next</th><th>Status</th><th className={f.num}>Amount</th><th /></tr></thead>
                              <tbody>
                                {bills.map(b => (
                                  <tr key={b.id}>
                                    <td><div className={f.cellMain}>{b.description}</div><div className={f.cellSub}>{[b.vendor, b.category].filter(Boolean).join(" · ")}</div></td>
                                    <td className={f.cellMuted}>{frequencyLabel[b.frequency]}</td>
                                    <td className={f.cellMuted}>{b.active ? shortDate(b.next_run) : "—"}</td>
                                    <td><span className={f.pill} data-status={b.active ? "operational" : undefined}>{b.active ? "Active" : "Paused"}</span></td>
                                    <td className={f.num}>−{kes(b.amount)}</td>
                                    <td className={f.cellMuted}>
                                      <button className={f.linkBtn} onClick={() => toggleBill(b)}>{b.active ? "Pause" : "Resume"}</button>
                                      <button className={f.linkBtn} style={{ color: "var(--text-secondary)", marginLeft: 12 }} onClick={() => setRemoval({ kind: "billSchedule", id: b.id, label: b.description })}>Delete</button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </section>

                      <section aria-labelledby="cf-inv">
                        <div className={f.sectionHead}>
                          <div>
                            <h2 id="cf-inv" className={f.sectionTitle}>Recurring invoices</h2>
                            <p className={f.sectionSub} style={{ marginTop: 4 }}>Invoices raised automatically for customers.</p>
                          </div>
                        </div>
                        {invoiceSchedules.length === 0 ? (
                          <div className={f.empty}><strong>No recurring invoices.</strong>Open the Revenue tab and use Repeat on an invoice to bill a customer on a schedule.<div><button className={f.secondary} onClick={() => setTab("revenue")}>Go to Revenue</button></div></div>
                        ) : (
                          <div className={f.tableWrap}>
                            <table className={f.ledger}>
                              <thead><tr><th>Customer</th><th>Repeats</th><th>Next</th><th>Status</th><th className={f.num}>Amount</th><th /></tr></thead>
                              <tbody>
                                {invoiceSchedules.map(s => (
                                  <tr key={s.id}>
                                    <td><div className={f.cellMain}>{s.org_name}</div><div className={f.cellSub}>{s.description}</div></td>
                                    <td className={f.cellMuted}>{frequencyLabel[s.frequency]}</td>
                                    <td className={f.cellMuted}>{s.active ? shortDate(s.next_run) : "—"}</td>
                                    <td><span className={f.pill} data-status={s.active ? "operational" : undefined}>{s.active ? "Active" : "Paused"}</span></td>
                                    <td className={`${f.num} ${f.income}`}>+{kes(s.amount)}</td>
                                    <td className={f.cellMuted}>
                                      <button className={f.linkBtn} onClick={() => toggleInvoiceSchedule(s)}>{s.active ? "Pause" : "Resume"}</button>
                                      <button className={f.linkBtn} style={{ color: "var(--text-secondary)", marginLeft: 12 }} onClick={() => setRemoval({ kind: "invoiceSchedule", id: s.id, label: `${s.org_name}: ${s.description}` })}>Delete</button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </section>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {showExpense && (
        <Modal title="New company expense" onClose={() => setShowExpense(false)}>
          <div className={f.field}>
            <label htmlFor="ce-desc">Description</label>
            <input id="ce-desc" className={f.input} autoFocus value={expenseForm.description} onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })} placeholder="Vercel Pro plan" />
          </div>
          <div className={f.fieldRow}>
            <div className={f.field}>
              <label htmlFor="ce-amount">Amount (KES)</label>
              <input id="ce-amount" className={f.input} type="number" min="0" inputMode="decimal" value={expenseForm.amount} onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })} />
            </div>
            <div className={f.field}>
              <label htmlFor="ce-date">Date</label>
              <input id="ce-date" className={f.input} type="date" value={expenseForm.date} onChange={e => setExpenseForm({ ...expenseForm, date: e.target.value })} />
            </div>
          </div>
          <div className={f.fieldRow}>
            <div className={f.field}>
              <label htmlFor="ce-cat">Category</label>
              <select id="ce-cat" className={f.input} value={expenseForm.category} onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value as ExpenseCategory })}>
                {CATEGORIES.map(k => <option key={k} value={k}>{k[0].toUpperCase() + k.slice(1)}</option>)}
              </select>
            </div>
            <div className={f.field}>
              <label htmlFor="ce-vendor">Vendor</label>
              <input id="ce-vendor" className={f.input} value={expenseForm.vendor} onChange={e => setExpenseForm({ ...expenseForm, vendor: e.target.value })} />
            </div>
          </div>
          <div className={f.field}>
            <label htmlFor="ce-notes">Notes</label>
            <input id="ce-notes" className={f.input} value={expenseForm.notes} onChange={e => setExpenseForm({ ...expenseForm, notes: e.target.value })} />
          </div>
          {actionError && <div className={f.formError} role="alert">{actionError}</div>}
          <div className={f.dialogActions}>
            <button className={f.secondary} onClick={() => setShowExpense(false)}>Cancel</button>
            <button className={f.primary} onClick={addExpense}>Save expense</button>
          </div>
        </Modal>
      )}

      {showBill && (
        <Modal title="New recurring bill" onClose={() => setShowBill(false)}>
          <div className={f.field}>
            <label htmlFor="rb-desc">Description</label>
            <input id="rb-desc" className={f.input} autoFocus value={billForm.description} onChange={e => setBillForm({ ...billForm, description: e.target.value })} placeholder="Supabase Pro" />
          </div>
          <div className={f.fieldRow}>
            <div className={f.field}>
              <label htmlFor="rb-amount">Amount (KES)</label>
              <input id="rb-amount" className={f.input} type="number" min="0" inputMode="decimal" value={billForm.amount} onChange={e => setBillForm({ ...billForm, amount: e.target.value })} />
            </div>
            <div className={f.field}>
              <label htmlFor="rb-freq">Repeats</label>
              <select id="rb-freq" className={f.input} value={billForm.frequency} onChange={e => setBillForm({ ...billForm, frequency: e.target.value as ScheduleFrequency })}>
                {FREQUENCIES.map(x => <option key={x.id} value={x.id}>{x.label}</option>)}
              </select>
            </div>
          </div>
          <div className={f.fieldRow}>
            <div className={f.field}>
              <label htmlFor="rb-cat">Category</label>
              <select id="rb-cat" className={f.input} value={billForm.category} onChange={e => setBillForm({ ...billForm, category: e.target.value as ExpenseCategory })}>
                {CATEGORIES.map(k => <option key={k} value={k}>{k[0].toUpperCase() + k.slice(1)}</option>)}
              </select>
            </div>
            <div className={f.field}>
              <label htmlFor="rb-vendor">Vendor</label>
              <input id="rb-vendor" className={f.input} value={billForm.vendor} onChange={e => setBillForm({ ...billForm, vendor: e.target.value })} />
            </div>
          </div>
          <div className={f.field}>
            <label htmlFor="rb-start">First run</label>
            <input id="rb-start" className={f.input} type="date" value={billForm.startDate} onChange={e => setBillForm({ ...billForm, startDate: e.target.value })} />
          </div>
          {actionError && <div className={f.formError} role="alert">{actionError}</div>}
          <div className={f.dialogActions}>
            <button className={f.secondary} onClick={() => setShowBill(false)}>Cancel</button>
            <button className={f.primary} onClick={addBill}>Save recurring bill</button>
          </div>
        </Modal>
      )}

      {repeat && (
        <Modal title={repeat.kind === "expense" ? "Repeat this expense" : "Repeat this invoice"} onClose={() => setRepeat(null)}>
          <p className={f.hint}>
            {repeat.kind === "expense" ? repeat.item.description : `${repeat.item.org_name}: ${repeat.item.description}`}
          </p>
          <div className={f.field}>
            <label htmlFor="rp-freq">How often</label>
            <select id="rp-freq" className={f.input} autoFocus value={repeatFrequency} onChange={e => setRepeatFrequency(e.target.value as ScheduleFrequency)}>
              {FREQUENCIES.map(x => <option key={x.id} value={x.id}>{x.label}</option>)}
            </select>
          </div>
          {actionError && <div className={f.formError} role="alert">{actionError}</div>}
          <div className={f.dialogActions}>
            <button className={f.secondary} onClick={() => setRepeat(null)}>Cancel</button>
            <button className={f.primary} onClick={confirmRepeat}>Start repeating</button>
          </div>
        </Modal>
      )}

      {removal && (
        <ConfirmDialog title="Delete this?" message={`"${removal.label}" will be removed. This can't be undone.`} confirmLabel="Delete" onConfirm={confirmRemoval} onCancel={() => setRemoval(null)} />
      )}
    </div>
  );
}