"use client";

import { useEffect, useState } from "react";
import { getInvoices, updateInvoiceStatus, createInvoice, type Invoice } from "@/lib/invoices";
import { getOrganizations, type Organization } from "@/lib/organizations";
import { getPackages, type Package } from "@/lib/packages";
import { logActivity } from "@/lib/activity";
import { createClient } from "@/lib/supabase";
import DashboardDrawer, { DrawerFieldList } from "@/components/DashboardDrawer";
import Modal from "@/components/founder/Modal";
import f from "@/styles/founder.module.css";

const statusVar: Record<string, string> = { paid: "var(--green)", pending: "var(--amber)", overdue: "var(--red)" };

const toNumber = (v: string | number) => (typeof v === "number" ? v : parseInt(v.replace(/[^0-9]/g, "")) || 0);
const kes = (n: number) => `KES ${n.toLocaleString("en-KE")}`;
const date = (d: string | null) => (d ? new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }) : "—");
const emptyInvoice = () => ({ org_name: "", amount: "", status: "pending" as Invoice["status"], due_date: "", paid_date: null as string | null, description: "" });

export default function BillingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newInvoice, setNewInvoice] = useState(emptyInvoice);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    getInvoices().then(setInvoices);
    getOrganizations().then(setOrgs);
    getPackages().then(setPackages);
    const supabase = createClient();
    const channel = supabase.channel("invoices-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "invoices" }, () => {
        getInvoices().then(setInvoices);
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const filtered = invoices.filter(inv => {
    const q = search.toLowerCase();
    const matchSearch = inv.org_name.toLowerCase().includes(q) || inv.description.toLowerCase().includes(q);
    return matchSearch && (statusFilter === "all" || inv.status === statusFilter);
  });

  const sum = (status: Invoice["status"]) => invoices.filter(i => i.status === status).reduce((t, i) => t + toNumber(i.amount), 0);
  const count = (status: Invoice["status"]) => invoices.filter(i => i.status === status).length;
  const totalPaid = sum("paid");
  const totalPending = sum("pending");
  const totalOverdue = sum("overdue");
  const totalMRR = packages.reduce((t, p) => t + toNumber(p.price) * p.orgs, 0);
  const subscriptions = packages.reduce((t, p) => t + p.orgs, 0);

  const headline =
    invoices.length === 0 ? "No invoices yet."
    : count("overdue") > 0 ? `${kes(totalOverdue)} is overdue across ${count("overdue")} ${count("overdue") === 1 ? "invoice" : "invoices"}.`
    : count("pending") > 0 ? `${kes(totalPending)} is waiting to be paid.`
    : "Every invoice is paid.";

  const handleMarkPaid = async (invoice: Invoice) => {
    const updated = await updateInvoiceStatus(invoice.id, "paid");
    if (updated) {
      await logActivity({ icon: "💳", title: "Payment received", sub: `${invoice.amount} from ${invoice.org_name}` });
      setSelectedInvoice(updated);
    }
  };

  const handleMarkOverdue = async (invoice: Invoice) => {
    const updated = await updateInvoiceStatus(invoice.id, "overdue");
    if (updated) {
      await logActivity({ icon: "⚠", title: "Invoice marked overdue", sub: invoice.org_name });
      setSelectedInvoice(updated);
    }
  };

  const handleCreate = async () => {
    if (!newInvoice.org_name || !newInvoice.amount.trim()) {
      setFormError("Choose an organization and enter an amount.");
      return;
    }
    setFormError(null);
    const created = await createInvoice(newInvoice);
    if (created) {
      await logActivity({ icon: "🧾", title: "Invoice created", sub: `${created.amount} — ${created.org_name}` });
      setShowCreate(false);
      setNewInvoice(emptyInvoice());
    } else {
      setFormError("The invoice couldn't be saved. Check the details and try again.");
    }
  };

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
              <button className={f.primary} onClick={() => { setFormError(null); setNewInvoice(emptyInvoice()); setShowCreate(true); }}>New invoice</button>
            </div>
          </div>

          <div className={f.vitals}>
            <div className={`${f.vital} ${f.vitalStatic}`}>
              <span className={f.vitalLabel}>Monthly recurring revenue</span>
              <span className={f.vitalValue}>{kes(totalMRR)}</span>
              <span className={f.vitalSub}>{subscriptions} subscriptions</span>
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

          {packages.length > 0 && (
            <section aria-labelledby="by-package">
              <div className={f.sectionHead}>
                <h2 id="by-package" className={f.sectionTitle}>Revenue by package</h2>
              </div>
              <div className={f.tableWrap}>
                <table className={f.ledger}>
                  <thead><tr><th>Package</th><th>Price</th><th>Organizations</th><th className={f.num}>Monthly revenue</th></tr></thead>
                  <tbody>
                    {packages.map(pkg => (
                      <tr key={pkg.id}>
                        <td className={f.cellMain} style={{ textTransform: "capitalize" }}>{pkg.name}</td>
                       <td className={f.cellMuted}>{kes(toNumber(pkg.price))}</td>
                        <td className={f.cellMuted}>{pkg.price}</td>
                        <td className={f.cellMuted}>{pkg.orgs}</td>
                        <td className={f.num}>{kes(toNumber(pkg.price) * pkg.orgs)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <section aria-labelledby="invoices-title">
            <div className={f.sectionHead}>
              <h2 id="invoices-title" className={f.sectionTitle}>Invoices</h2>
              <span className={f.sectionSub}>{filtered.length} shown</span>
            </div>
            <div className={f.toolbar} style={{ padding: "16px 0" }}>
              <input className={`${f.input} ${f.search}`} type="search" aria-label="Search invoices" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by organization or description" />
              <div className={f.segmented} role="group" aria-label="Filter by status">
                {["all", "paid", "pending", "overdue"].map(s => (
                  <button key={s} className={f.segBtn} aria-pressed={statusFilter === s} onClick={() => setStatusFilter(s)} style={{ textTransform: "capitalize" }}>{s}</button>
                ))}
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className={f.empty}>
                <strong>{invoices.length === 0 ? "No invoices yet." : "No invoices match."}</strong>
                {invoices.length === 0 ? "Create one to start tracking what organizations owe." : "Try a different search or status."}
              </div>
            ) : (
              <div className={f.tableWrap}>
                <table className={f.ledger}>
                  <thead><tr><th>Organization</th><th>Due</th><th>Status</th><th className={f.num}>Amount</th></tr></thead>
                  <tbody>
                    {filtered.map(inv => (
                      <tr key={inv.id} className={`${f.clickable} ${selectedInvoice?.id === inv.id ? f.selected : ""}`} onClick={() => setSelectedInvoice(inv)}>
                        <td>
                          <button className={f.cellBtn} onClick={e => { e.stopPropagation(); setSelectedInvoice(inv); }}>{inv.org_name}</button>
                          <div className={f.cellSub}>{inv.description}</div>
                        </td>
                        <td className={f.cellMuted}>{date(inv.due_date)}</td>
                        <td><span className={f.pill} data-status={inv.status}>{inv.status}</span></td>
                        <td className={f.num}>{inv.amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>

      {selectedInvoice && (
        <DashboardDrawer title="Invoice" statusColor={statusVar[selectedInvoice.status]} onClose={() => setSelectedInvoice(null)}>
          <DrawerFieldList
            items={[
              { label: "Organization", value: selectedInvoice.org_name },
              { label: "Amount", value: selectedInvoice.amount },
              { label: "Description", value: selectedInvoice.description },
              { label: "Status", value: selectedInvoice.status, accent: statusVar[selectedInvoice.status] },
              { label: "Due date", value: date(selectedInvoice.due_date) },
              { label: "Paid on", value: date(selectedInvoice.paid_date) },
            ]}
          />
          <div className={f.stack} style={{ marginTop: 16 }}>
            {selectedInvoice.status !== "paid" && (
              <button className={`${f.primary} ${f.block}`} onClick={() => handleMarkPaid(selectedInvoice)}>Mark as paid</button>
            )}
            {selectedInvoice.status === "pending" && (
              <button className={f.dangerBtn} onClick={() => handleMarkOverdue(selectedInvoice)}>Mark as overdue</button>
            )}
          </div>
        </DashboardDrawer>
      )}

      {showCreate && (
        <Modal title="New invoice" onClose={() => setShowCreate(false)}>
          <div className={f.field}>
            <label htmlFor="inv-org">Organization</label>
            <select id="inv-org" className={f.input} autoFocus value={newInvoice.org_name} onChange={e => setNewInvoice(p => ({ ...p, org_name: e.target.value }))}>
              <option value="">Choose an organization</option>
              {orgs.map(o => <option key={o.id}>{o.name}</option>)}
            </select>
          </div>
          <div className={f.field}>
            <label htmlFor="inv-amount">Amount</label>
            <input id="inv-amount" className={f.input} value={newInvoice.amount} onChange={e => setNewInvoice(p => ({ ...p, amount: e.target.value }))} placeholder="KES 8,000" />
          </div>
          <div className={f.field}>
            <label htmlFor="inv-desc">Description</label>
            <input id="inv-desc" className={f.input} value={newInvoice.description} onChange={e => setNewInvoice(p => ({ ...p, description: e.target.value }))} placeholder="Growth package, July 2026" />
          </div>
          <div className={f.fieldRow}>
            <div className={f.field}>
              <label htmlFor="inv-due">Due date</label>
              <input id="inv-due" className={f.input} type="date" value={newInvoice.due_date} onChange={e => setNewInvoice(p => ({ ...p, due_date: e.target.value }))} />
            </div>
            <div className={f.field}>
              <label htmlFor="inv-status">Status</label>
              <select id="inv-status" className={f.input} value={newInvoice.status} onChange={e => setNewInvoice(p => ({ ...p, status: e.target.value as Invoice["status"] }))}>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>
          {formError && <div className={f.formError} role="alert">{formError}</div>}
          <div className={f.dialogActions}>
            <button className={f.secondary} onClick={() => setShowCreate(false)}>Cancel</button>
            <button className={f.primary} onClick={handleCreate}>Create invoice</button>
          </div>
        </Modal>
      )}
    </div>
  );
}