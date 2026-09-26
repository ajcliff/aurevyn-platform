"use client";

import { useEffect, useState } from "react";
import { getOrganizations, type Organization } from "@/lib/organizations";
import { logActivity } from "@/lib/activity";
import { formatError } from "@/lib/errorFormat";
import ErrorBanner from "@/components/ErrorBanner";
import Modal from "@/components/founder/Modal";
import CompanyFinance from "@/components/finance/CompanyFinance";
import { getFinanceTransactions, getFinanceExpenses, getCashflow, createTransaction, createExpense, type FinanceTransaction, type FinanceExpense, type CashflowEntry } from "@/lib/finance";
import { getLedgerPnL, type LedgerPnL } from "@/lib/journal";
import f from "@/styles/founder.module.css";

type Tab = "overview" | "transactions" | "expenses" | "cashflow";
type TxFilter = "all" | "income" | "expense";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "transactions", label: "Transactions" },
  { id: "expenses", label: "Expenses" },
  { id: "cashflow", label: "Cashflow" },
];

const COMPANY_SCOPE = "company";

const methodLabel: Record<string, string> = { mpesa: "M-Pesa", bank: "Bank", cash: "Cash", card: "Card" };
const method = (m: string) => methodLabel[m] ?? m;

const today = () => new Date().toISOString().split("T")[0];
const shortDate = (d: string) => new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });

function formatKES(amount: number) {
  return `${amount < 0 ? "−" : ""}KES ${Math.abs(amount).toLocaleString("en-KE")}`;
}

const emptyTx = () => ({ type: "income" as "income" | "expense", amount: "", description: "", category: "", payment_method: "mpesa", date: today() });
const emptyExpense = () => ({ title: "", amount: "", category: "", vendor: "", payment_method: "mpesa", date: today(), notes: "", status: "paid" });

const TxTable = ({ rows, showStatus }: { rows: FinanceTransaction[]; showStatus?: boolean }) => (
  <div className={f.tableWrap}>
    <table className={f.ledger}>
      <thead>
        <tr>
          <th>Date</th>
          <th>Description</th>
          <th>Method</th>
          {showStatus && <th>Status</th>}
          <th className={f.num}>Amount</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(tx => (
          <tr key={tx.id}>
            <td className={f.cellMuted}>{shortDate(tx.date)}</td>
            <td>
              <div className={f.cellMain}>{tx.description}</div>
              {tx.category && <div className={f.cellSub}>{tx.category}</div>}
            </td>
            <td className={f.cellMuted}>{method(tx.payment_method)}</td>
            {showStatus && <td className={f.cellMuted} style={{ textTransform: "capitalize" }}>{tx.status}</td>}
            <td className={`${f.num} ${tx.type === "income" ? f.income : ""}`}>
              {tx.type === "income" ? "+" : "−"}{formatKES(tx.amount)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default function FinancePage() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState(COMPANY_SCOPE);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [expenses, setExpenses] = useState<FinanceExpense[]>([]);
  const [cashflow, setCashflow] = useState<CashflowEntry[]>([]);
  const [pnl, setPnl] = useState<LedgerPnL>({ totalIncome: 0, totalExpenses: 0, netProfit: 0 });
  const [tab, setTab] = useState<Tab>("overview");
  const [txFilter, setTxFilter] = useState<TxFilter>("all");
  const [showAddTx, setShowAddTx] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [newTx, setNewTx] = useState(emptyTx);
  const [newExpense, setNewExpense] = useState(emptyExpense);
  const [orgsLoading, setOrgsLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => { loadOrgs(); }, []);

  async function loadOrgs() {
    setOrgsLoading(true);
    setError(null);
    try {
      const orgsData = await getOrganizations();
      setOrgs(orgsData);
    } catch (err) {
      setError(formatError(err));
    } finally {
      setOrgsLoading(false);
    }
  }

  useEffect(() => {
    if (!selectedOrgId || selectedOrgId === COMPANY_SCOPE) return;
    loadFinanceData();
  }, [selectedOrgId]);

  async function loadFinanceData() {
    setDataLoading(true);
    setError(null);
    try {
      const [txData, expData, cfData, pnlData] = await Promise.all([
        getFinanceTransactions(selectedOrgId),
        getFinanceExpenses(selectedOrgId),
        getCashflow(selectedOrgId),
        getLedgerPnL(selectedOrgId),
      ]);
      setTransactions(txData);
      setExpenses(expData);
      setCashflow(cfData);
      setPnl(pnlData);
    } catch (err) {
      setError(formatError(err));
    } finally {
      setDataLoading(false);
    }
  }

  const { totalIncome, totalExpenses, netProfit } = pnl;
  const totalInflow = cashflow.filter(c => c.type === "inflow").reduce((sum, c) => sum + c.amount, 0);
  const totalOutflow = cashflow.filter(c => c.type === "outflow").reduce((sum, c) => sum + c.amount, 0);
  const netCashflow = totalInflow - totalOutflow;
  const filteredTx = transactions.filter(t => txFilter === "all" || t.type === txFilter);
  const selectedOrg = orgs.find(o => o.id === selectedOrgId);

  const expenseTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
  const byCategory = Object.entries(
    expenses.reduce((acc, e) => {
      const key = e.category || "uncategorised";
      acc[key] = (acc[key] ?? 0) + e.amount;
      return acc;
    }, {} as Record<string, number>)
  ).sort((a, b) => b[1] - a[1]);

  const ledgerTotal = totalIncome + totalExpenses;
  const incomeShare = ledgerTotal > 0 ? (totalIncome / ledgerTotal) * 100 : 0;

  const headline = !selectedOrg
    ? "No organizations yet."
    : ledgerTotal === 0
      ? `${selectedOrg.name} has no ledger entries yet.`
      : netProfit >= 0
        ? `${selectedOrg.name} is ${formatKES(netProfit)} in profit to date.`
        : `${selectedOrg.name} is ${formatKES(Math.abs(netProfit))} in loss to date.`;

  const openTx = () => { setActionError(null); setNewTx(emptyTx()); setShowAddTx(true); };
  const openExpense = () => { setActionError(null); setNewExpense(emptyExpense()); setShowAddExpense(true); };

  const handleAddTx = async () => {
    const amount = parseFloat(newTx.amount);
    if (!selectedOrgId) return;
    if (!amount || amount <= 0 || !newTx.description.trim()) {
      setActionError("Enter an amount above zero and a description.");
      return;
    }
    setActionError(null);
    try {
      const created = await createTransaction({
        org_id: selectedOrgId,
        account_id: null,
        type: newTx.type,
        amount,
        currency: "KES",
        description: newTx.description,
        category: newTx.category,
        reference: "",
        payment_method: newTx.payment_method,
        status: "completed",
        date: newTx.date,
      });
      await logActivity({ icon: newTx.type === "income" ? "💰" : "💸", title: `${newTx.type === "income" ? "Income" : "Expense"} recorded`, sub: `${formatKES(amount)} — ${newTx.description}` });
      setTransactions(prev => [created, ...prev]);
      setShowAddTx(false);
      setNewTx(emptyTx());
    } catch (err) {
      setActionError(formatError(err));
    }
  };

  const handleAddExpense = async () => {
    const amount = parseFloat(newExpense.amount);
    if (!selectedOrgId) return;
    if (!amount || amount <= 0 || !newExpense.title.trim()) {
      setActionError("Enter a title and an amount above zero.");
      return;
    }
    setActionError(null);
    try {
      const created = await createExpense({
        org_id: selectedOrgId,
        title: newExpense.title,
        amount,
        currency: "KES",
        category: newExpense.category,
        vendor: newExpense.vendor,
        payment_method: newExpense.payment_method,
        status: newExpense.status,
        date: newExpense.date,
        notes: newExpense.notes,
      });
      await logActivity({ icon: "💸", title: "Expense recorded", sub: `${formatKES(amount)} — ${newExpense.title}` });
      setExpenses(prev => [created, ...prev]);
      setShowAddExpense(false);
      setNewExpense(emptyExpense());
    } catch (err) {
      setActionError(formatError(err));
    }
  };

  const scopeSelect = (
    <select aria-label="Whose finances" value={selectedOrgId} onChange={e => setSelectedOrgId(e.target.value)} className={f.select}>
      <option value={COMPANY_SCOPE}>AUREVYN (company)</option>
      {orgs.length > 0 && (
        <optgroup label="Customer organizations">
          {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </optgroup>
      )}
    </select>
  );

  if (selectedOrgId === COMPANY_SCOPE) return <CompanyFinance scopeSelect={scopeSelect} />;

  return (
    <div className={`page-shell ${f.root}`}>
      <main className="page-main">
        <div className={f.page}>
          <div className={f.top}>
            <div>
              <p className={f.greeting}>Finance</p>
              <h1 className={`${f.headline} ${f.headlineWide}`}>{orgsLoading ? "Loading organizations" : headline}</h1>
            </div>
            <div className={f.actions}>
              {scopeSelect}
              <button className={f.primary} onClick={openTx} disabled={!selectedOrgId}>New transaction</button>
              <button className={f.secondary} onClick={openExpense} disabled={!selectedOrgId}>New expense</button>
            </div>
          </div>

          {error && (
            <ErrorBanner message={error} source="dashboard/finance" onRetry={selectedOrgId ? loadFinanceData : loadOrgs} />
          )}

          {orgsLoading || dataLoading ? (
            <p className={f.status} role="status">{orgsLoading ? "Loading organizations…" : "Loading finance data…"}</p>
          ) : !selectedOrg ? (
            <div className={f.empty}>
              <strong>Add an organization first.</strong>
              Finance is tracked per organization. Once one exists, its ledger appears here.
            </div>
          ) : (
            <>
              <section aria-label="Income against expenses">
                {ledgerTotal > 0 ? (
                  <div className={f.balance} role="img" aria-label={`Income ${formatKES(totalIncome)}, expenses ${formatKES(totalExpenses)}`}>
                    <span className={f.segIncome} style={{ width: `${incomeShare}%` }} />
                    <span className={f.segExpense} style={{ width: `${100 - incomeShare}%` }} />
                  </div>
                ) : (
                  <div className={f.balanceTrack} />
                )}
                <div className={f.legend}>
                  <div className={f.legendItem}>
                    <span className={f.legendLabel}><i className={f.swatch} style={{ background: "var(--green)" }} />Income</span>
                    <span className={f.legendValue}>{formatKES(totalIncome)}</span>
                  </div>
                  <div className={f.legendItem} style={{ alignItems: "flex-end" }}>
                    <span className={f.legendLabel}>Expenses<i className={f.swatch} style={{ background: "color-mix(in srgb, var(--red) 80%, var(--bg-base))" }} /></span>
                    <span className={f.legendValue} style={{ paddingLeft: 0, paddingRight: 17 }}>{formatKES(totalExpenses)}</span>
                  </div>
                </div>
              </section>

              <div className={`${f.vitals} ${f.vitalsThree}`}>
                <div className={`${f.vital} ${f.vitalStatic}`}>
                  <span className={f.vitalLabel}>Cash in</span>
                  <span className={f.vitalValue}>{formatKES(totalInflow)}</span>
                  <span className={f.vitalSub}>{cashflow.filter(c => c.type === "inflow").length} inflows</span>
                </div>
                <div className={`${f.vital} ${f.vitalStatic}`}>
                  <span className={f.vitalLabel}>Cash out</span>
                  <span className={f.vitalValue}>{formatKES(totalOutflow)}</span>
                  <span className={f.vitalSub}>{cashflow.filter(c => c.type === "outflow").length} outflows</span>
                </div>
                <div className={`${f.vital} ${f.vitalStatic}`}>
                  <span className={f.vitalLabel}>Net cash position</span>
                  <span className={`${f.vitalValue} ${netCashflow < 0 ? f.down : ""}`}>{formatKES(netCashflow)}</span>
                  <span className={f.vitalSub}>{netCashflow >= 0 ? "More coming in than going out" : "More going out than coming in"}</span>
                </div>
              </div>

              <div>
                <div className={f.tabs} role="tablist" aria-label="Finance sections">
                  {TABS.map(t => (
                    <button key={t.id} role="tab" id={`tab-${t.id}`} aria-selected={tab === t.id} aria-controls="finance-panel" className={f.tab} onClick={() => setTab(t.id)}>
                      {t.label}
                    </button>
                  ))}
                </div>

                <div id="finance-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className={f.tabPanel} style={{ paddingTop: 28 }}>
                  {tab === "overview" && (
                    <div className={f.split}>
                      <section aria-labelledby="recent-title">
                        <div className={f.sectionHead}>
                          <h2 id="recent-title" className={f.sectionTitle}>Recent transactions</h2>
                          {transactions.length > 6 && <button className={f.linkBtn} onClick={() => setTab("transactions")}>See all {transactions.length}</button>}
                        </div>
                        {transactions.length === 0 ? (
                          <div className={f.empty}>
                            <strong>No transactions yet.</strong>
                            Record income or an expense to start this organization&apos;s ledger.
                            <div><button className={f.secondary} onClick={openTx}>New transaction</button></div>
                          </div>
                        ) : (
                          <TxTable rows={transactions.slice(0, 6)} />
                        )}
                      </section>

                      <section aria-labelledby="spend-title">
                        <div className={f.sectionHead}>
                          <h2 id="spend-title" className={f.sectionTitle}>Where the money goes</h2>
                          <span className={f.sectionSub}>{formatKES(expenseTotal)} in expenses</span>
                        </div>
                        {byCategory.length === 0 ? (
                          <div className={f.empty}>
                            <strong>No expenses recorded.</strong>
                            Spending by category shows up here once you add an expense.
                          </div>
                        ) : (
                          <div className={f.bars}>
                            {byCategory.map(([cat, amount]) => {
                              const pct = expenseTotal > 0 ? Math.round((amount / expenseTotal) * 100) : 0;
                              return (
                                <div key={cat} className={f.barRow}>
                                  <span className={f.barName} title={cat}>{cat}</span>
                                  <div className={f.barTrack}><div className={f.barFill} style={{ width: `${pct}%` }} /></div>
                                  <span className={f.barAmt}><b>{formatKES(amount)}</b> · {pct}%</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </section>
                    </div>
                  )}

                  {tab === "transactions" && (
                    <>
                      <div className={f.toolbar}>
                        <div className={f.segmented} role="group" aria-label="Filter transactions">
                          {(["all", "income", "expense"] as TxFilter[]).map(k => (
                            <button key={k} className={f.segBtn} aria-pressed={txFilter === k} onClick={() => setTxFilter(k)} style={{ textTransform: "capitalize" }}>{k}</button>
                          ))}
                        </div>
                        <span className={f.sectionSub}>{filteredTx.length} shown</span>
                      </div>
                      {filteredTx.length === 0 ? (
                        <div className={f.empty}>
                          <strong>{txFilter === "all" ? "No transactions yet." : `No ${txFilter} transactions.`}</strong>
                          {txFilter === "all" ? "Record one to see it here." : "Try another filter, or record a new one."}
                          <div><button className={f.secondary} onClick={openTx}>New transaction</button></div>
                        </div>
                      ) : (
                        <TxTable rows={filteredTx} showStatus />
                      )}
                    </>
                  )}

                  {tab === "expenses" && (
                    expenses.length === 0 ? (
                      <div className={f.empty}>
                        <strong>No expenses recorded.</strong>
                        Add rent, software, payroll or any other cost to track it here.
                        <div><button className={f.secondary} onClick={openExpense}>New expense</button></div>
                      </div>
                    ) : (
                      <div className={f.tableWrap}>
                        <table className={f.ledger}>
                          <thead>
                            <tr><th>Date</th><th>Expense</th><th>Category</th><th>Method</th><th className={f.num}>Amount</th></tr>
                          </thead>
                          <tbody>
                            {expenses.map(e => (
                              <tr key={e.id}>
                                <td className={f.cellMuted}>{shortDate(e.date)}</td>
                                <td>
                                  <div className={f.cellMain}>{e.title}</div>
                                  {(e.vendor || e.notes) && <div className={f.cellSub}>{[e.vendor, e.notes].filter(Boolean).join(" · ")}</div>}
                                </td>
                                <td className={f.cellMuted} style={{ textTransform: "capitalize" }}>{e.category || "—"}</td>
                                <td className={f.cellMuted}>{method(e.payment_method)}</td>
                                <td className={f.num}>−{formatKES(e.amount)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  )}

                  {tab === "cashflow" && (
                    cashflow.length === 0 ? (
                      <div className={f.empty}>
                        <strong>No cashflow yet.</strong>
                        Money in and out of this organization appears here as it is recorded.
                      </div>
                    ) : (
                      <div className={f.tableWrap}>
                        <table className={f.ledger}>
                          <thead>
                            <tr><th>Date</th><th>Description</th><th>Direction</th><th className={f.num}>Amount</th></tr>
                          </thead>
                          <tbody>
                            {cashflow.map(c => (
                              <tr key={c.id}>
                                <td className={f.cellMuted}>{shortDate(c.date)}</td>
                                <td className={f.cellMain}>{c.description}</td>
                                <td className={f.cellMuted}>{c.type === "inflow" ? "Cash in" : "Cash out"}</td>
                                <td className={`${f.num} ${c.type === "inflow" ? f.income : ""}`}>{c.type === "inflow" ? "+" : "−"}{formatKES(c.amount)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {showAddTx && (
        <Modal title="New transaction" onClose={() => setShowAddTx(false)}>
          <div className={f.typeToggle} role="group" aria-label="Transaction type">
            {(["income", "expense"] as const).map(type => (
              <button key={type} data-kind={type} aria-pressed={newTx.type === type} onClick={() => setNewTx(p => ({ ...p, type }))} style={{ textTransform: "capitalize" }}>{type}</button>
            ))}
          </div>
          <div className={f.field}>
            <label htmlFor="tx-amount">Amount (KES)</label>
            <input id="tx-amount" className={f.input} type="number" min="0" inputMode="decimal" autoFocus value={newTx.amount} onChange={e => setNewTx(p => ({ ...p, amount: e.target.value }))} placeholder="25000" />
          </div>
          <div className={f.field}>
            <label htmlFor="tx-desc">Description</label>
            <input id="tx-desc" className={f.input} value={newTx.description} onChange={e => setNewTx(p => ({ ...p, description: e.target.value }))} placeholder="Subscription payment" />
          </div>
          <div className={f.field}>
            <label htmlFor="tx-cat">Category</label>
            <input id="tx-cat" className={f.input} value={newTx.category} onChange={e => setNewTx(p => ({ ...p, category: e.target.value }))} placeholder="subscription, payroll" />
          </div>
          <div className={f.fieldRow}>
            <div className={f.field}>
              <label htmlFor="tx-method">Payment method</label>
              <select id="tx-method" className={f.input} value={newTx.payment_method} onChange={e => setNewTx(p => ({ ...p, payment_method: e.target.value }))}>
                {Object.keys(methodLabel).map(m => <option key={m} value={m}>{method(m)}</option>)}
              </select>
            </div>
            <div className={f.field}>
              <label htmlFor="tx-date">Date</label>
              <input id="tx-date" className={f.input} type="date" value={newTx.date} onChange={e => setNewTx(p => ({ ...p, date: e.target.value }))} />
            </div>
          </div>
          {actionError && <div className={f.formError} role="alert">{actionError}</div>}
          <div className={f.dialogActions}>
            <button className={f.secondary} onClick={() => setShowAddTx(false)}>Cancel</button>
            <button className={f.primary} onClick={handleAddTx}>Save transaction</button>
          </div>
        </Modal>
      )}

      {showAddExpense && (
        <Modal title="New expense" onClose={() => setShowAddExpense(false)}>
          <div className={f.field}>
            <label htmlFor="ex-title">Title</label>
            <input id="ex-title" className={f.input} autoFocus value={newExpense.title} onChange={e => setNewExpense(p => ({ ...p, title: e.target.value }))} placeholder="Office rent" />
          </div>
          <div className={f.field}>
            <label htmlFor="ex-amount">Amount (KES)</label>
            <input id="ex-amount" className={f.input} type="number" min="0" inputMode="decimal" value={newExpense.amount} onChange={e => setNewExpense(p => ({ ...p, amount: e.target.value }))} placeholder="45000" />
          </div>
          <div className={f.fieldRow}>
            <div className={f.field}>
              <label htmlFor="ex-cat">Category</label>
              <input id="ex-cat" className={f.input} value={newExpense.category} onChange={e => setNewExpense(p => ({ ...p, category: e.target.value }))} placeholder="operations" />
            </div>
            <div className={f.field}>
              <label htmlFor="ex-vendor">Vendor</label>
              <input id="ex-vendor" className={f.input} value={newExpense.vendor} onChange={e => setNewExpense(p => ({ ...p, vendor: e.target.value }))} placeholder="Safaricom" />
            </div>
          </div>
          <div className={f.fieldRow}>
            <div className={f.field}>
              <label htmlFor="ex-method">Payment method</label>
              <select id="ex-method" className={f.input} value={newExpense.payment_method} onChange={e => setNewExpense(p => ({ ...p, payment_method: e.target.value }))}>
                {Object.keys(methodLabel).map(m => <option key={m} value={m}>{method(m)}</option>)}
              </select>
            </div>
            <div className={f.field}>
              <label htmlFor="ex-date">Date</label>
              <input id="ex-date" className={f.input} type="date" value={newExpense.date} onChange={e => setNewExpense(p => ({ ...p, date: e.target.value }))} />
            </div>
          </div>
          <div className={f.field}>
            <label htmlFor="ex-notes">Notes (optional)</label>
            <input id="ex-notes" className={f.input} value={newExpense.notes} onChange={e => setNewExpense(p => ({ ...p, notes: e.target.value }))} />
          </div>
          {actionError && <div className={f.formError} role="alert">{actionError}</div>}
          <div className={f.dialogActions}>
            <button className={f.secondary} onClick={() => setShowAddExpense(false)}>Cancel</button>
            <button className={f.primary} onClick={handleAddExpense}>Save expense</button>
          </div>
        </Modal>
      )}
    </div>
  );
}