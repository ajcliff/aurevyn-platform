"use client";

import { CSSProperties, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";
import {
  Activity,
  ActivityType,
  Customer,
  CustomerStatus,
  Deal,
  DealStage,
  createActivity,
  createCustomer,
  createDeal,
  getActivitiesForCustomer,
  getCustomers,
  getDeals,
  getDealsForCustomer,
  updateDealStage,
} from "@/lib/crm";
import { getPricelists, assignCustomerPricelist, type Pricelist } from "@/lib/pricelists";
import { getInvoicesForCustomer, type OrgInvoice } from "@/lib/orgInvoices";
import { getSalesForCustomer } from "@/lib/pos";
import { getPaymentsForSource, methodLabel, type Payment } from "@/lib/payments";
import { exportToCSV } from "@/lib/csvExport";
import { logActivity } from "@/lib/activity";

const STAGES: DealStage[] = ["new", "contacted", "proposal", "won", "lost"];
const ACTIVITY_TYPES: ActivityType[] = ["call", "email", "meeting", "note"];

const INVOICE_STATUS_COLORS: Record<string, string> = {
  draft: "var(--text-muted)",
  sent: "#f5b942",
  paid: "#3dd68c",
  overdue: "#ef4444",
  cancelled: "var(--text-muted)",
};

const styles: Record<string, CSSProperties> = {
  page: { padding: 24, background: "#07070f", minHeight: "100vh", color: "#fff", display: "grid", gridTemplateColumns: "1fr 320px", gap: 20 },
  main: { display: "flex", flexDirection: "column", gap: 20, minWidth: 0 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 22, fontWeight: 600, margin: 0 },
  summaryGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 14 },
  card: { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: 18 },
  cardLabel: { fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5 },
  cardValue: { fontSize: 24, fontWeight: 600, marginTop: 6 },
  section: { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 20 },
  sectionTitle: { fontSize: 15, fontWeight: 600, margin: 0, marginBottom: 14 },
  rowControls: { display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" },
  input: { background: "#0f0f1a", border: "1px solid var(--border)", color: "#fff", borderRadius: 10, padding: "8px 12px", fontSize: 13, minWidth: 180 },
  select: { background: "#0f0f1a", border: "1px solid var(--border)", color: "#fff", borderRadius: 10, padding: "8px 12px", fontSize: 13 },
  primary: { background: "var(--gold)", color: "#000", border: "none", borderRadius: 10, padding: "8px 14px", fontWeight: 600, cursor: "pointer", fontSize: 13 },
  ghost: { background: "transparent", color: "#fff", border: "1px solid var(--border)", borderRadius: 10, padding: "8px 14px", cursor: "pointer", fontSize: 13 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { textAlign: "left", padding: "10px 8px", color: "var(--text-muted)", fontWeight: 500, borderBottom: "1px solid var(--border)", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 },
  td: { padding: "12px 8px", borderBottom: "1px solid var(--border)", cursor: "pointer" },
  pipeline: { display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12 },
  col: { background: "#0f0f1a", border: "1px solid var(--border)", borderRadius: 12, padding: 12, minHeight: 200 },
  colHeader: { display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 10 },
  dealCard: { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: 10, marginBottom: 8, fontSize: 12 },
  badge: (color: string): CSSProperties => ({ display: "inline-block", padding: "2px 8px", borderRadius: 999, fontSize: 10, background: color, color: "#000", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 }),
  side: { display: "flex", flexDirection: "column", gap: 14 },
  modalBackdrop: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 },
  modal: { width: 480, maxWidth: "90vw", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 22 },
  field: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 },
  label: { fontSize: 12, color: "var(--text-muted)" },
  timelineItem: { padding: "10px 0", borderBottom: "1px solid var(--border)", fontSize: 13 },
  subSection: { marginTop: 20, marginBottom: 8 },
  linkRow: { display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 13, alignItems: "center" },
};

function statusBadge(s: CustomerStatus) {
  const map: Record<CustomerStatus, string> = { lead: "#c9a227", active: "var(--green)", inactive: "#555" };
  return <span style={styles.badge(map[s])}>{s}</span>;
}

export default function CrmDashboard({ orgId }: { orgId: string }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | CustomerStatus>("all");

  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState<Customer | null>(null);

  const supabase = createClient();

  useEffect(() => {
    load();
  }, [orgId]);

  async function load() {
    setLoading(true);
    const [c, d] = await Promise.all([getCustomers(orgId), getDeals(orgId)]);
    setCustomers(c);
    setDeals(d);
    setLoading(false);
  }

  // Real-time: reflect changes from other team members without a refresh
  useEffect(() => {
    if (!orgId) return;

    const channel = supabase
      .channel("crm-dashboard")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "customers", filter: `org_id=eq.${orgId}` },
        () => getCustomers(orgId).then(setCustomers)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "deals", filter: `org_id=eq.${orgId}` },
        () => getDeals(orgId).then(setDeals)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId]);

  const activeDeals = useMemo(() => deals.filter((d) => d.stage !== "won" && d.stage !== "lost"), [deals]);
  const pipelineValue = useMemo(() => activeDeals.reduce((s, d) => s + Number(d.value || 0), 0), [activeDeals]);
  const wonThisMonth = useMemo(() => {
    const now = new Date();
    return deals.filter((d) => {
      if (d.stage !== "won") return false;
      const c = new Date(d.created_at);
      return c.getMonth() === now.getMonth() && c.getFullYear() === now.getFullYear();
    }).length;
  }, [deals]);

  const filtered = useMemo(() => {
    return customers.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (search && !`${c.name} ${c.email ?? ""} ${c.company ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [customers, search, statusFilter]);

  function handleExportCSV() {
    const rows = filtered.map((c) => ({
      Name: c.name,
      Company: c.company || "",
      Email: c.email || "",
      Phone: c.phone || "",
      Status: c.status,
      Source: c.source || "",
    }));
    exportToCSV(`customers-${orgId}-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  }

  async function handleCreate(input: Omit<Customer, "id" | "created_at" | "org_id">) {
    const c = await createCustomer({ ...input, org_id: orgId });
    setShowNew(false);
    await logActivity({
      icon: "👥",
      title: "Customer added",
      sub: c.name,
      org_id: orgId,
    });
  }

  async function moveDeal(id: string, stage: DealStage) {
    const updated = await updateDealStage(id, stage);
    await logActivity({
      icon: "📈",
      title: `Deal moved to ${stage}`,
      sub: updated.title,
      org_id: orgId,
    });
  }

  // Inline status change straight from the table row — no need to open the modal
  async function handleInlineStatusChange(customerId: string, status: CustomerStatus, e: React.MouseEvent) {
    e.stopPropagation();
    const supabase = createClient();
    await supabase.from("customers").update({ status }).eq("id", customerId);
  }

  return (
    <div style={{ ...styles.page, background: "transparent", minHeight: 0, padding: 0 }}>
      <div style={styles.main}>
        <div style={styles.header}>
          <h1 style={styles.title}>CRM</h1>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={styles.ghost} onClick={handleExportCSV}>Export CSV</button>
            <button style={styles.primary} onClick={() => setShowNew(true)}>+ Customer</button>
          </div>
        </div>

        <div style={styles.summaryGrid}>
          <div style={styles.card}><div style={styles.cardLabel}>Total Customers</div><div style={styles.cardValue}>{customers.length}</div></div>
          <div style={styles.card}><div style={styles.cardLabel}>Active Deals</div><div style={styles.cardValue}>{activeDeals.length}</div></div>
          <div style={styles.card}><div style={styles.cardLabel}>Pipeline Value</div><div style={styles.cardValue}>KES {pipelineValue.toLocaleString()}</div></div>
          <div style={styles.card}><div style={styles.cardLabel}>Won This Month</div><div style={styles.cardValue}>{wonThisMonth}</div></div>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Pipeline</h2>
          <div style={styles.pipeline}>
            {STAGES.map((stage) => {
              const stageDeals = deals.filter((d) => d.stage === stage);
              return (
                <div key={stage} style={styles.col}>
                  <div style={styles.colHeader}><span>{stage}</span><span>{stageDeals.length}</span></div>
                  {stageDeals.map((d) => (
                    <div key={d.id} style={styles.dealCard}>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>{d.title}</div>
                      <div style={{ color: "var(--text-muted)" }}>KES {Number(d.value).toLocaleString()}</div>
                      <select
                        style={{ ...styles.select, marginTop: 6, width: "100%" }}
                        value={d.stage}
                        onChange={(e) => moveDeal(d.id, e.target.value as DealStage)}
                      >
                        {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Customers</h2>
          <div style={styles.rowControls}>
            <input style={styles.input} placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <select style={styles.select} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "all" | CustomerStatus)}>
              <option value="all">All statuses</option>
              <option value="lead">Lead</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          {loading ? <div style={{ color: "var(--text-muted)" }}>Loading…</div> : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Company</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} onClick={() => setSelected(c)}>
                    <td style={styles.td}>{c.name}</td>
                    <td style={styles.td}>{c.company ?? "—"}</td>
                    <td style={styles.td}>{c.email ?? "—"}</td>
                    <td style={styles.td}>
                      <select
                        value={c.status}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handleInlineStatusChange(c.id, e.target.value as CustomerStatus, e as any)}
                        style={{ ...styles.select, padding: "3px 8px", fontSize: 11 }}
                      >
                        <option value="lead">lead</option>
                        <option value="active">active</option>
                        <option value="inactive">inactive</option>
                      </select>
                    </td>
                  </tr>
                ))}
                {!filtered.length && <tr><td style={styles.td} colSpan={4}>No customers.</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <aside style={styles.side}>
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Summary</h2>
          <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7 }}>
            <div>Leads: {customers.filter((c) => c.status === "lead").length}</div>
            <div>Active: {customers.filter((c) => c.status === "active").length}</div>
            <div>Inactive: {customers.filter((c) => c.status === "inactive").length}</div>
            <div style={{ marginTop: 10, color: "var(--gold)" }}>Open deals: {activeDeals.length}</div>
          </div>
        </div>
      </aside>

      {showNew && <NewCustomerModal onClose={() => setShowNew(false)} onSubmit={handleCreate} />}
      {selected && <CustomerDetailModal orgId={orgId} customer={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function NewCustomerModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (v: Omit<Customer, "id" | "created_at" | "org_id">) => void }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", status: "lead" as CustomerStatus, source: "" });
  return (
    <div style={styles.modalBackdrop} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>New Customer</h3>
        {(["name", "email", "phone", "company", "source"] as const).map((k) => (
          <div key={k} style={styles.field}>
            <label style={styles.label}>{k}</label>
            <input style={styles.input} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
          </div>
        ))}
        <div style={styles.field}>
          <label style={styles.label}>status</label>
          <select style={styles.select} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as CustomerStatus })}>
            <option value="lead">Lead</option><option value="active">Active</option><option value="inactive">Inactive</option>
          </select>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
          <button style={styles.ghost} onClick={onClose}>Cancel</button>
          <button
            style={styles.primary}
            disabled={!form.name}
            onClick={() =>
              onSubmit({
                ...form,
                email: form.email || null,
                phone: form.phone || null,
                company: form.company || null,
                source: form.source || null,
                pricelist_id: null,
              })
            }
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

function CustomerDetailModal({ orgId, customer, onClose }: { orgId: string; customer: Customer; onClose: () => void }) {
  const [acts, setActs] = useState<Activity[]>([]);
  const [cDeals, setCDeals] = useState<Deal[]>([]);
  const [dealTitle, setDealTitle] = useState("");
  const [dealValue, setDealValue] = useState("");

  const [pricelists, setPricelists] = useState<Pricelist[]>([]);
  const [pricelistId, setPricelistId] = useState(customer.pricelist_id || "");
  const [savingPricelist, setSavingPricelist] = useState(false);

const [invoices, setInvoices] = useState<OrgInvoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [posSales, setPosSales] = useState<any[]>([]);
  const [activityType, setActivityType] = useState<ActivityType>("note");
  const [activityNote, setActivityNote] = useState("");
  const [loggingActivity, setLoggingActivity] = useState(false);

  useEffect(() => {
    loadAll();
  }, [orgId, customer.id]);

async function loadAll() {
    const [a, d, pl, inv, sales] = await Promise.all([
      getActivitiesForCustomer(orgId, customer.id),
      getDealsForCustomer(orgId, customer.id),
      getPricelists(orgId),
      getInvoicesForCustomer(orgId, customer.id),
      getSalesForCustomer(orgId, customer.id),
    ]);
    setActs(a);
    setCDeals(d);
    setPricelists(pl);
    setInvoices(inv);
    setPosSales(sales);

    const paymentLists = await Promise.all(inv.map((i) => getPaymentsForSource("invoice", i.id)));
    setPayments(paymentLists.flat());
  }

  async function addDeal() {
    if (!dealTitle) return;
    const d = await createDeal({ org_id: orgId, customer_id: customer.id, title: dealTitle, value: Number(dealValue) || 0, stage: "new", expected_close_date: null });
    setCDeals((prev) => [d, ...prev]);
    setDealTitle(""); setDealValue("");
  }

  async function handlePricelistChange(id: string) {
    setPricelistId(id);
    try {
      setSavingPricelist(true);
      await assignCustomerPricelist(customer.id, id || null);
    } finally {
      setSavingPricelist(false);
    }
  }

  async function handleLogActivity() {
    if (!activityNote.trim()) return;
    try {
      setLoggingActivity(true);
      const a = await createActivity({
        org_id: orgId,
        customer_id: customer.id,
        type: activityType,
        notes: activityNote,
      });
      setActs((prev) => [a, ...prev]);
      setActivityNote("");

      await logActivity({
        icon: "📝",
        title: `${activityType} logged`,
        sub: `${customer.name} — ${activityNote.slice(0, 40)}`,
        org_id: orgId,
      });
    } finally {
      setLoggingActivity(false);
    }
  }

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalInvoiced = invoices.reduce((sum, i) => sum + Number(i.total), 0);

  return (
    <div style={styles.modalBackdrop} onClick={onClose}>
      <div style={{ ...styles.modal, width: 600, height: "100%", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>{customer.name}</h3>
          {statusBadge(customer.status)}
        </div>
        <div style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>{customer.company ?? "—"} · {customer.email ?? "—"}</div>

        {/* Pricelist — cross-engine link into POS pricing */}
        <div style={styles.subSection}>
          <h4 style={{ marginBottom: 8 }}>Pricelist</h4>
          <select
            style={styles.select}
            value={pricelistId}
            onChange={(e) => handlePricelistChange(e.target.value)}
            disabled={savingPricelist}
          >
            <option value="">No custom pricelist (base prices)</option>
            {pricelists.map((pl) => (
              <option key={pl.id} value={pl.id}>{pl.name}</option>
            ))}
          </select>
          <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
            Applied automatically when this customer is selected at POS checkout.
          </p>
        </div>

{/* Purchase History — cross-engine link into POS */}
        <div style={styles.subSection}>
          <h4 style={{ marginBottom: 8 }}>Purchase History (POS)</h4>
          {posSales.map((sale: any) => (
            <div key={sale.id} style={styles.linkRow}>
              <span>{new Date(sale.created_at).toLocaleDateString("en-KE")}</span>
              <span style={{ color: "var(--text-muted)" }}>{sale.payment_method}</span>
              <span style={{ fontWeight: 600 }}>KES {Number(sale.total).toLocaleString()}</span>
            </div>
          ))}
          {!posSales.length && <div style={{ color: "var(--text-muted)", fontSize: 13 }}>No POS purchases yet.</div>}
        </div>

        {/* Invoices — cross-engine link into Finance */}



        {/* Invoices — cross-engine link into Finance */}
        <div style={styles.subSection}>
          <h4 style={{ marginBottom: 8 }}>
            Invoices {invoices.length > 0 && <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>· KES {totalInvoiced.toLocaleString()} total, KES {totalPaid.toLocaleString()} paid</span>}
          </h4>
          {invoices.map((inv) => (
            <div key={inv.id} style={styles.linkRow}>
              <span>{inv.invoice_number}</span>
              <span style={{ color: "var(--text-muted)" }}>KES {Number(inv.total).toLocaleString()}</span>
              <span style={{ color: INVOICE_STATUS_COLORS[inv.status], fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>
                {inv.status}
              </span>
            </div>
          ))}
          {!invoices.length && <div style={{ color: "var(--text-muted)", fontSize: 13 }}>No invoices yet.</div>}
        </div>

        {/* Payment history — cross-engine link into the shared payments ledger */}
        {payments.length > 0 && (
          <div style={styles.subSection}>
            <h4 style={{ marginBottom: 8 }}>Payment History</h4>
            {payments.map((p) => (
              <div key={p.id} style={styles.linkRow}>
                <span>{methodLabel(p.method)}</span>
                <span style={{ color: "var(--text-muted)" }}>{new Date(p.created_at).toLocaleDateString("en-KE")}</span>
                <span style={{ color: "#3dd68c", fontWeight: 600 }}>KES {Number(p.amount).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}

        <h4 style={styles.subSection}>Deals</h4>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input style={styles.input} placeholder="Deal title" value={dealTitle} onChange={(e) => setDealTitle(e.target.value)} />
          <input style={styles.input} placeholder="Value" value={dealValue} onChange={(e) => setDealValue(e.target.value)} />
          <button style={styles.primary} onClick={addDeal}>Add</button>
        </div>
        {cDeals.map((d) => (
          <div key={d.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 13, display: "flex", justifyContent: "space-between" }}>
            <span>{d.title}</span><span style={{ color: "var(--text-muted)" }}>KES {Number(d.value).toLocaleString()} · {d.stage}</span>
          </div>
        ))}
        {!cDeals.length && <div style={{ color: "var(--text-muted)", fontSize: 13 }}>No deals.</div>}

        <h4 style={styles.subSection}>Activity</h4>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <select style={styles.select} value={activityType} onChange={(e) => setActivityType(e.target.value as ActivityType)}>
            {ACTIVITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input
            style={{ ...styles.input, flex: 1 }}
            placeholder="Log a note about this customer..."
            value={activityNote}
            onChange={(e) => setActivityNote(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogActivity()}
          />
          <button style={styles.primary} onClick={handleLogActivity} disabled={loggingActivity}>
            {loggingActivity ? "..." : "Log"}
          </button>
        </div>
        {acts.map((a) => (
          <div key={a.id} style={styles.timelineItem}>
            <div style={{ color: "var(--gold)", fontSize: 11, textTransform: "uppercase" }}>{a.type} · {new Date(a.created_at).toLocaleString()}</div>
            <div>{a.notes ?? ""}</div>
          </div>
        ))}
        {!acts.length && <div style={{ color: "var(--text-muted)", fontSize: 13 }}>No activity yet.</div>}

        <div style={{ textAlign: "right", marginTop: 16 }}>
          <button style={styles.ghost} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
