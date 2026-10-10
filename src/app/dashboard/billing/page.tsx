"use client";

import { useEffect, useState } from "react";
import { getInvoices, type Invoice } from "@/lib/invoices";
import { getReceipts, PAYMENT_METHODS, type Receipt } from "@/lib/receipts";
import { downloadInvoicePdf, downloadReceiptPdf } from "@/lib/billingPdf";
import { getOrganizations, type Organization } from "@/lib/organizations";
import { formatError } from "@/lib/errorFormat";
import { logActivity } from "@/lib/activity";
import { createClient } from "@/lib/supabase";
import DashboardDrawer, { DrawerFieldList } from "@/components/DashboardDrawer";
import Modal from "@/components/founder/Modal";
import f from "@/styles/founder.module.css";

const statusVar: Record<string, string> = { paid: "var(--green)", pending: "var(--amber)", overdue: "var(--red)" };

const toNumber = (v: string | number) => (typeof v === "number" ? v : parseInt(v.replace(/[^0-9]/g, "")) || 0);
const kes = (n: number) => `KES ${n.toLocaleString("en-KE")}`;
const date = (d: string | null) => (d ? new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }) : "—");
const emptyInvoice = () => ({ org_id: "", amount: "", due_date: "", description: "" });

async function billingCall(body: Record<string, unknown>) {
  const res = await fetch("/api/founder/billing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Request failed.");
  return json;
}

export default function BillingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [seats, setSeats] = useState(0);
  const [unlimitedEngines, setUnlimitedEngines] = useState(0);
  const [tab, setTab] = useState<"invoices" | "documents">("invoices");
  const [docFilter, setDocFilter] = useState("all");
  const [showPay, setShowPay] = useState(false);
  const [payMethod, setPayMethod] = useState<string>("M-Pesa");
  const [payRef, setPayRef] = useState("");
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newInvoice, setNewInvoice] = useState(emptyInvoice);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    getInvoices().then(setInvoices);
    getReceipts().then(setReceipts);
    getOrganizations().then(setOrgs);
    const supabase = createClient();
    supabase.from("organization_engines").select("licensed_seats").eq("enabled", true)
      .then(({ data }) => {
        const rows = data ?? [];
        // 999,999 means "Unlimited": count those separately instead of adding them up
        setSeats(rows.filter(r => (r.licensed_seats ?? 0) < 999999).reduce((n, r) => n + (r.licensed_seats ?? 0), 0));
        setUnlimitedEngines(rows.filter(r => (r.licensed_seats ?? 0) >= 999999).length);
      });
    const channel = supabase.channel("invoices-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "invoices" }, () => {
        getInvoices().then(setInvoices);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "receipts" }, () => {
        getReceipts().then(setReceipts);
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const filtered = invoices.filter(inv => {
    const q = search.toLowerCase();
    const matchSearch = inv.org_name.toLowerCase().includes(q) || inv.invoice_no.toLowerCase().includes(q) || (inv.description ?? "").toLowerCase().includes(q);
    return matchSearch && (statusFilter === "all" || inv.status === statusFilter);
  });

  const sum = (status: Invoice["status"]) => invoices.filter(i => i.status === status).reduce((t, i) => t + toNumber(i.amount), 0);
  const count = (status: Invoice["status"]) => invoices.filter(i => i.status === status).length;
  const totalPaid = sum("paid");
  const totalPending = sum("pending");
  const totalOverdue = sum("overdue");

  const headline =
    invoices.length === 0 ? "No invoices yet."
    : count("overdue") > 0 ? `${kes(totalOverdue)} is overdue across ${count("overdue")} ${count("overdue") === 1 ? "invoice" : "invoices"}.`
    : count("pending") > 0 ? `${kes(totalPending)} is waiting to be paid.`
    : "Every invoice is paid.";

  const handleRecordPayment = async () => {
    if (!selectedInvoice) return;
    setSaving(true); setFormError(null);
    try {
      const { invoice: updated } = await billingCall({ action: "record_payment", invoiceId: selectedInvoice.id, method: payMethod, reference: payRef });
      await logActivity({ icon: "💳", title: "Payment received", sub: `${selectedInvoice.invoice_no} · ${selectedInvoice.amount} from ${selectedInvoice.org_name}` });
      setSelectedInvoice(updated);
      setShowPay(false); setPayRef("");
      getInvoices().then(setInvoices); getReceipts().then(setReceipts);
    } catch (e) { setFormError(formatError(e)); }
    finally { setSaving(false); }
  };

  const handleRunBilling = async () => {
    setRunning(true); setNotice(null); setFormError(null);
    try {
      const { created } = await billingCall({ action: "run_subscription_billing" });
      setNotice(created > 0 ? `${created} subscription invoice${created === 1 ? "" : "s"} generated.` : "Nothing due: no organization is at the start of a new billing month.");
      getInvoices().then(setInvoices);
    } catch (e) { setFormError(formatError(e)); }
    finally { setRunning(false); }
  };

  const handleMarkOverdue = async (invoice: Invoice) => {
    try {
      const { invoice: updated } = await billingCall({ action: "mark_overdue", invoiceId: invoice.id });
      await logActivity({ icon: "⚠", title: "Invoice marked overdue", sub: `${invoice.invoice_no} · ${invoice.org_name}` });
      setSelectedInvoice(updated);
      getInvoices().then(setInvoices);
    } catch (e) { setFormError(formatError(e)); }
  };

  const handleCreate = async () => {
    if (!newInvoice.org_id || !newInvoice.amount.trim()) {
      setFormError("Choose an organization and enter an amount.");
      return;
    }
    setSaving(true); setFormError(null);
    try {
      const { invoice: created } = await billingCall({ action: "create_invoice", orgId: newInvoice.org_id, amount: newInvoice.amount, dueDate: newInvoice.due_date, description: newInvoice.description });
      await logActivity({ icon: "🧾", title: "Invoice created", sub: `${created.invoice_no} · ${created.amount} — ${created.org_name}` });
      setShowCreate(false);
      setNewInvoice(emptyInvoice());
      getInvoices().then(setInvoices);
    } catch (e) { setFormError(formatError(e)); }
    finally { setSaving(false); }
  };

  const receiptFor = (invoiceId: string) => receipts.find(r => r.invoice_id === invoiceId);
  const orgName = (id: string) => orgs.find(o => o.id === id)?.name ?? invoices.find(i => i.org_id === id)?.org_name ?? "—";
  const documents = [
    ...invoices.map(i => ({ key: `i-${i.id}`, type: "invoice" as const, no: i.invoice_no, org: i.org_name, date: i.created_at, amount: i.amount_kes, invoice: i, receipt: undefined as Receipt | undefined })),
    ...receipts.map(r => ({ key: `r-${r.id}`, type: "receipt" as const, no: r.receipt_no, org: orgName(r.org_id), date: r.paid_at, amount: r.amount_kes, invoice: invoices.find(i => i.id === r.invoice_id), receipt: r })),
  ].filter(d => docFilter === "all" || d.type === docFilter)
   .filter(d => `${d.no} ${d.org}`.toLowerCase().includes(search.toLowerCase()))
   .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className={`page-shell ${f.root}`}>
      <main className={selectedInvoice ? "page-main-drawer" : "page-main"}>
        <div className={f.page}>
          <div className={f.top}>
            <div>
              <p className={f.greeting}>Billing</p>
              <h1 className={`${f.headline} ${f.headlineWide}`}>{headline}</h1>
            </div>
            <div className={f.actions}>
              <button className={f.secondary} disabled={running} onClick={handleRunBilling} title="Normally runs automatically every night at 6am">{running ? "Running…" : "Run subscription billing"}</button>
              <button className={f.primary} onClick={() => { setFormError(null); setNewInvoice(emptyInvoice()); setShowCreate(true); }}>New invoice</button>
            </div>
          </div>

          {notice && <p className={f.status} role="status">{notice}</p>}

          <div className={f.vitals}>
            <div className={`${f.vital} ${f.vitalStatic}`}>
              <span className={f.vitalLabel}>Licensed seats</span>
              <span className={f.vitalValue}>{seats.toLocaleString("en-KE")}</span>
              <span className={f.vitalSub}>{unlimitedEngines > 0 ? `+ ${unlimitedEngines} unlimited engine licence${unlimitedEngines === 1 ? "" : "s"}` : "across all organizations"}</span>
            </div>
            <div className={`${f.vital} ${f.vitalStatic}`}>
              <span className={f.vitalLabel}>Collected</span>
              <span className={f.vitalValue}>{kes(totalPaid)}</span>
              <span className={f.vitalSub}>{count("paid")} paid</span>
            </div>
            <div className={`${f.vital} ${f.vitalStatic}`}>
              <span className={f.vitalLabel}>Pending</span>
              <span className={f.vitalValue}>{kes(totalPending)}</span>
              <span className={f.vitalSub}>{count("pending")} invoices</span>
            </div>
            <div className={`${f.vital} ${f.vitalStatic}`}>
              <span className={f.vitalLabel}>Overdue</span>
              <span className={`${f.vitalValue} ${totalOverdue > 0 ? f.owed : ""}`}>{kes(totalOverdue)}</span>
              <span className={f.vitalSub}>{count("overdue")} invoices</span>
            </div>
          </div>

          <section aria-labelledby="invoices-title">
            <div className={f.sectionHead}>
              <h2 id="invoices-title" className={f.sectionTitle}>{tab === "invoices" ? "Invoices" : "Documents"}</h2>
              <div className={f.segmented} role="group" aria-label="View">
                <button className={f.segBtn} aria-pressed={tab === "invoices"} onClick={() => setTab("invoices")}>Invoices</button>
                <button className={f.segBtn} aria-pressed={tab === "documents"} onClick={() => setTab("documents")}>Documents</button>
              </div>
            </div>
            <div className={f.toolbar} style={{ padding: "16px 0" }}>
              <input className={`${f.input} ${f.search}`} type="search" aria-label="Search invoices" value={search} onChange={e => setSearch(e.target.value)} placeholder={tab === "invoices" ? "Search by number, organization or description" : "Search by number or organization"} />
              <div className={f.segmented} role="group" aria-label="Filter">
                {(tab === "invoices" ? ["all", "paid", "pending", "overdue"] : ["all", "invoice", "receipt"]).map(s => (
                  <button key={s} className={f.segBtn}
                    aria-pressed={(tab === "invoices" ? statusFilter : docFilter) === s}
                    onClick={() => (tab === "invoices" ? setStatusFilter(s) : setDocFilter(s))}
                    style={{ textTransform: "capitalize" }}>{s}</button>
                ))}
              </div>
            </div>

            {tab === "documents" ? (
              documents.length === 0 ? (
                <div className={f.empty}><strong>No documents yet.</strong>Invoices and receipts appear here as they are issued.</div>
              ) : (
                <div className={f.tableWrap}>
                  <table className={f.ledger}>
                    <thead><tr><th>Number</th><th>Organization</th><th>Date</th><th className={f.num}>Amount</th><th /></tr></thead>
                    <tbody>
                      {documents.map(d => (
                        <tr key={d.key}>
                          <td className={f.cellMain}>{d.no}<div className={f.cellSub} style={{ textTransform: "capitalize" }}>{d.type}</div></td>
                          <td className={f.cellMuted}>{d.org}</td>
                          <td className={f.cellMuted}>{date(d.date)}</td>
                          <td className={f.num}>{kes(d.amount)}</td>
                          <td className={f.num}>
                            <button className={f.secondary} onClick={() => d.receipt ? downloadReceiptPdf(d.receipt, d.invoice, d.org) : d.invoice && downloadInvoicePdf(d.invoice)}>PDF</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : null}

            {tab === "invoices" && (filtered.length === 0 ? (
              <div className={f.empty}>
                <strong>{invoices.length === 0 ? "No invoices yet." : "No invoices match."}</strong>
                {invoices.length === 0 ? "Create one to start tracking what organizations owe." : "Try a different search or status."}
              </div>
            ) : (
              <div className={f.tableWrap}>
                <table className={f.ledger}>
                  <thead><tr><th>Invoice</th><th>Due</th><th>Status</th><th className={f.num}>Amount</th></tr></thead>
                  <tbody>
                    {filtered.map(inv => (
                      <tr key={inv.id} className={`${f.clickable} ${selectedInvoice?.id === inv.id ? f.selected : ""}`} onClick={() => setSelectedInvoice(inv)}>
                        <td>
                          <button className={f.cellBtn} onClick={e => { e.stopPropagation(); setSelectedInvoice(inv); }}>{inv.invoice_no} · {inv.org_name}</button>
                          <div className={f.cellSub}>{inv.description}</div>
                        </td>
                        <td className={f.cellMuted}>{date(inv.due_date)}</td>
                        <td><span className={f.pill} data-status={inv.status}>{inv.status}</span>{inv.claimed_at && inv.status !== "paid" && <div className={f.cellSub} style={{ color: "var(--amber)" }}>Payment claimed</div>}</td>
                        <td className={f.num}>{inv.amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </section>
        </div>
      </main>

      {selectedInvoice && (
        <DashboardDrawer title="Invoice" statusColor={statusVar[selectedInvoice.status]} onClose={() => setSelectedInvoice(null)}>
          <DrawerFieldList
            items={[
              { label: "Invoice", value: selectedInvoice.invoice_no },
              { label: "Organization", value: selectedInvoice.org_name },
              { label: "Amount", value: selectedInvoice.amount },
              { label: "Description", value: selectedInvoice.description },
              { label: "Status", value: selectedInvoice.status, accent: statusVar[selectedInvoice.status] },
              { label: "Due date", value: date(selectedInvoice.due_date) },
              { label: "Paid on", value: date(selectedInvoice.paid_date) },
              ...(selectedInvoice.claimed_at && selectedInvoice.status !== "paid" ? [{ label: "Org says paid", value: `${selectedInvoice.claim_method} · ${selectedInvoice.claim_reference}`, accent: "var(--amber)" }] : []),
            ]}
          />
          {receiptFor(selectedInvoice.id) && (
            <DrawerFieldList
              items={[
                { label: "Receipt", value: receiptFor(selectedInvoice.id)!.receipt_no },
                { label: "Method", value: receiptFor(selectedInvoice.id)!.method },
                { label: "Reference", value: receiptFor(selectedInvoice.id)!.reference ?? "—" },
              ]}
            />
          )}
          {formError && <div className={f.formError} role="alert" style={{ marginTop: 12 }}>{formError}</div>}
          <div className={f.stack} style={{ marginTop: 16 }}>
            {selectedInvoice.status !== "paid" && (
              <button className={`${f.primary} ${f.block}`} onClick={() => { setFormError(null); if (selectedInvoice.claim_method) { setPayMethod(selectedInvoice.claim_method); setPayRef(selectedInvoice.claim_reference ?? ""); } setShowPay(true); }}>{selectedInvoice.claimed_at ? "Confirm payment" : "Record payment"}</button>
            )}
            {selectedInvoice.status === "pending" && (
              <button className={f.dangerBtn} onClick={() => handleMarkOverdue(selectedInvoice)}>Mark as overdue</button>
            )}
            <button className={f.secondary} onClick={() => downloadInvoicePdf(selectedInvoice)}>Download invoice PDF</button>
            {receiptFor(selectedInvoice.id) && (
              <button className={f.secondary} onClick={() => downloadReceiptPdf(receiptFor(selectedInvoice.id)!, selectedInvoice, selectedInvoice.org_name)}>Download receipt PDF</button>
            )}
          </div>
        </DashboardDrawer>
      )}

      {showCreate && (
        <Modal title="New invoice" onClose={() => setShowCreate(false)}>
          <div className={f.field}>
            <label htmlFor="inv-org">Organization</label>
            <select id="inv-org" className={f.input} autoFocus value={newInvoice.org_id} onChange={e => setNewInvoice(p => ({ ...p, org_id: e.target.value }))}>
              <option value="">Choose an organization</option>
              {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
          <div className={f.field}>
            <label htmlFor="inv-amount">Amount</label>
            <input id="inv-amount" className={f.input} value={newInvoice.amount} onChange={e => setNewInvoice(p => ({ ...p, amount: e.target.value }))} placeholder="KES 8,000" />
          </div>
          <div className={f.field}>
            <label htmlFor="inv-desc">Description</label>
            <input id="inv-desc" className={f.input} value={newInvoice.description} onChange={e => setNewInvoice(p => ({ ...p, description: e.target.value }))} placeholder="POS + Inventory, 5 seats, October 2026" />
          </div>
          <div className={f.fieldRow}>
            <div className={f.field}>
              <label htmlFor="inv-due">Due date</label>
              <input id="inv-due" className={f.input} type="date" value={newInvoice.due_date} onChange={e => setNewInvoice(p => ({ ...p, due_date: e.target.value }))} />
            </div>
          </div>
          {formError && <div className={f.formError} role="alert">{formError}</div>}
          <div className={f.dialogActions}>
            <button className={f.secondary} onClick={() => setShowCreate(false)}>Cancel</button>
            <button className={f.primary} disabled={saving} onClick={handleCreate}>Create invoice</button>
          </div>
        </Modal>
      )}

      {showPay && selectedInvoice && (
        <Modal title="Record payment" onClose={() => setShowPay(false)}>
          <p className={f.sectionSub} style={{ marginBottom: 12 }}>{selectedInvoice.invoice_no} · {selectedInvoice.org_name} · {selectedInvoice.amount}</p>
          <div className={f.field}>
            <label htmlFor="pay-method">Payment method</label>
            <select id="pay-method" className={f.input} value={payMethod} onChange={e => setPayMethod(e.target.value)}>
              {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div className={f.field}>
            <label htmlFor="pay-ref">Reference (optional)</label>
            <input id="pay-ref" className={f.input} value={payRef} onChange={e => setPayRef(e.target.value)} placeholder="M-Pesa code, bank ref, cheque no." />
          </div>
          {formError && <div className={f.formError} role="alert">{formError}</div>}
          <div className={f.dialogActions}>
            <button className={f.secondary} onClick={() => setShowPay(false)}>Cancel</button>
            <button className={f.primary} disabled={saving} onClick={handleRecordPayment}>Record &amp; issue receipt</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
