"use client";

import { useEffect, useState } from "react";

import { getInvoices, updateInvoiceStatus, createInvoice, type Invoice } from "@/lib/invoices";
import { getOrganizations, type Organization } from "@/lib/organizations";
import { getPackages, type Package } from "@/lib/packages";
import { logActivity } from "@/lib/activity";
import { createClient } from "@/lib/supabase";
import s from "@/styles/layout.module.css";
import DashboardDrawer, { DrawerFieldList } from "@/components/DashboardDrawer";
import PageHeader from "@/components/PageHeader";
const statusColor: Record<string, string> = {
  paid: "#3dd68c", pending: "#f59e0b", overdue: "#ef4444",
};

export default function BillingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newInvoice, setNewInvoice] = useState({
    org_name: "", amount: "", status: "pending" as Invoice["status"],
    due_date: "", paid_date: null as string | null, description: "",
  });

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
    const matchSearch = inv.org_name.toLowerCase().includes(search.toLowerCase()) ||
      inv.description.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPaid = invoices.filter(i => i.status === "paid").reduce((sum, i) => sum + (parseInt(i.amount.replace(/[^0-9]/g, "")) || 0), 0);
  const totalPending = invoices.filter(i => i.status === "pending").reduce((sum, i) => sum + (parseInt(i.amount.replace(/[^0-9]/g, "")) || 0), 0);
  const totalOverdue = invoices.filter(i => i.status === "overdue").reduce((sum, i) => sum + (parseInt(i.amount.replace(/[^0-9]/g, "")) || 0), 0);
  const totalMRR = packages.reduce((sum, p) => sum + (parseInt(p.price.replace(/[^0-9]/g, "")) || 0) * p.orgs, 0);

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
    if (!newInvoice.org_name || !newInvoice.amount) return;
    const created = await createInvoice(newInvoice);
    if (created) {
      await logActivity({ icon: "🧾", title: "Invoice created", sub: `${created.amount} — ${created.org_name}` });
      setShowCreate(false);
      setNewInvoice({ org_name: "", amount: "", status: "pending", due_date: "", paid_date: null, description: "" });
    }
  };

  return (
        <div className="page-shell">

          <div className={s.body}>

     
      
        
        <main className={selectedInvoice ? "page-main-drawer" : "page-main"}>

          {/* Header */}
          <PageHeader
  title="Billing"
  subtitle={`${invoices.length} invoices · ${invoices.filter(i => i.status === "overdue").length} overdue`}
  actions={<button className={s.btnGold} onClick={() => setShowCreate(true)}>+ New Invoice</button>}
/>

          {/* Financial summary */}
          <div className={s.summaryCards}>
            {[
              { label: "Monthly MRR", value: `KES ${totalMRR.toLocaleString()}`, color: "var(--gold)", sub: `${packages.reduce((s, p) => s + p.orgs, 0)} subscriptions` },
              { label: "Collected", value: `KES ${totalPaid.toLocaleString()}`, color: "#3dd68c", sub: `${invoices.filter(i => i.status === "paid").length} paid` },
              { label: "Pending", value: `KES ${totalPending.toLocaleString()}`, color: "#f59e0b", sub: `${invoices.filter(i => i.status === "pending").length} invoices` },
              { label: "Overdue", value: `KES ${totalOverdue.toLocaleString()}`, color: "#ef4444", sub: `${invoices.filter(i => i.status === "overdue").length} invoices` },
            ].map((card, i) => (
              <div key={i} className={s.card} style={{ flex: 1 }}>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "6px" }}>{card.label}</div>
                <div style={{ fontSize: "18px", fontWeight: 700, color: card.color }}>{card.value}</div>
                <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px" }}>{card.sub}</div>
              </div>
            ))}
          </div>

          {/* Revenue by package */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
            {packages.map((pkg, i) => {
              const colors: Record<string, string> = { core: "#3dd68c", growth: "#c9a84c", professional: "#a78bfa", enterprise: "#38bdf8" };
              const color = colors[pkg.name] ?? "var(--gold)";
              const revenue = (parseInt(pkg.price.replace(/[^0-9]/g, "")) || 0) * pkg.orgs;
              return (
                <div key={i} style={{ background: "var(--bg-card)", border: `1px solid ${color}30`, borderRadius: "12px", padding: "14px" }}>
                  <div style={{ fontSize: "11px", color, fontWeight: 700, marginBottom: "4px" }}>{pkg.name}</div>
                  <div style={{ fontSize: "16px", fontWeight: 700, color }}>{pkg.price}</div>
                  <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px" }}>{pkg.orgs} orgs · KES {revenue.toLocaleString()}/mo</div>
                </div>
              );
            })}
          </div>

{/* Filters */}
          <div className={s.filters}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search invoices..." className={s.input} style={{ width: "240px" }} />
            {["all", "paid", "pending", "overdue"].map(f => (
              <button key={f} onClick={() => setStatusFilter(f)} className={statusFilter === f ? s.filterBtnActive : s.filterBtn}>{f}</button>
            ))}
          </div>

          {/* Invoice cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>No invoices found</div>
            ) : filtered.map((inv) => (
              <div
                key={inv.id}
                onClick={() => setSelectedInvoice(inv)}
                style={{
                  background: selectedInvoice?.id === inv.id ? "var(--bg-elevated)" : "var(--bg-card)",
                  border: `1px solid ${selectedInvoice?.id === inv.id ? statusColor[inv.status] + "60" : "var(--border)"}`,
                  borderRadius: "12px",
                  padding: "14px 16px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  transition: "all 0.15s ease",
                }}
              >
                {/* Status indicator */}
                <div style={{
                  width: "4px",
                  height: "36px",
                  borderRadius: "2px",
                  background: statusColor[inv.status],
                  flexShrink: 0,
                }} />

                {/* Org + description */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{inv.org_name}</div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{inv.description}</div>
                </div>

                {/* Amount */}
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: statusColor[inv.status] }}>{inv.amount}</div>
                  <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>
                    {inv.due_date ? new Date(inv.due_date).toLocaleDateString("en-KE") : "—"}
                  </div>
                </div>

                {/* Status badge */}
                <div style={{
                  padding: "4px 10px",
                  borderRadius: "20px",
                  background: `${statusColor[inv.status]}15`,
                  border: `1px solid ${statusColor[inv.status]}40`,
                  fontSize: "10px",
                  fontWeight: 700,
                  color: statusColor[inv.status],
                  textTransform: "capitalize",
                  flexShrink: 0,
                }}>
                  {inv.status}
                </div>
              </div>
            ))}
          </div>

         
        </main>
      </div>

      {/* Invoice drawer */}
      {selectedInvoice && (
  <DashboardDrawer
    title="Invoice Details"
    statusColor={statusColor[selectedInvoice.status]}
    onClose={() => setSelectedInvoice(null)}
  >
    <DrawerFieldList
      items={[
        { label: "Organization", value: selectedInvoice.org_name },
        { label: "Amount", value: selectedInvoice.amount },
        { label: "Description", value: selectedInvoice.description },
        { label: "Status", value: selectedInvoice.status, accent: statusColor[selectedInvoice.status] },
        { label: "Due Date", value: selectedInvoice.due_date ? new Date(selectedInvoice.due_date).toLocaleDateString("en-KE") : "—" },
        { label: "Paid Date", value: selectedInvoice.paid_date ? new Date(selectedInvoice.paid_date).toLocaleDateString("en-KE") : "—" },
      ]}
    />
    <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
      {selectedInvoice.status !== "paid" && (
        <button onClick={() => handleMarkPaid(selectedInvoice)} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "none", background: "#3dd68c", color: "#07070f", fontSize: "12px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>✓ Mark as Paid</button>
      )}
      {selectedInvoice.status === "pending" && (
        <button onClick={() => handleMarkOverdue(selectedInvoice)} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid rgba(239,68,68,0.4)", background: "transparent", color: "#ef4444", fontSize: "12px", cursor: "pointer", fontFamily: "inherit" }}>Mark as Overdue</button>
      )}
    </div>
  </DashboardDrawer>
)}

      {/* Create modal */}
      {showCreate && (
        <div className={s.modal} onClick={() => setShowCreate(false)}>
          <div className={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: "15px", fontWeight: 700 }}>New Invoice</div>
            <div>
              <label style={{ fontSize: "10px", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>ORGANIZATION</label>
              <select value={newInvoice.org_name} onChange={e => setNewInvoice(p => ({ ...p, org_name: e.target.value }))} className={s.input}>
                <option value="">Select organization</option>
                {orgs.map((o, i) => <option key={i}>{o.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: "10px", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>AMOUNT</label>
              <input value={newInvoice.amount} onChange={e => setNewInvoice(p => ({ ...p, amount: e.target.value }))} placeholder="e.g. KES 8,000" className={s.input} />
            </div>
            <div>
              <label style={{ fontSize: "10px", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>DESCRIPTION</label>
              <input value={newInvoice.description} onChange={e => setNewInvoice(p => ({ ...p, description: e.target.value }))} placeholder="e.g. growth Package — July 2026" className={s.input} />
            </div>
            <div>
              <label style={{ fontSize: "10px", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>DUE DATE</label>
              <input type="date" value={newInvoice.due_date} onChange={e => setNewInvoice(p => ({ ...p, due_date: e.target.value }))} className={s.input} />
            </div>
            <div>
              <label style={{ fontSize: "10px", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>STATUS</label>
              <select value={newInvoice.status} onChange={e => setNewInvoice(p => ({ ...p, status: e.target.value as Invoice["status"] }))} className={s.input}>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={handleCreate} className={s.btnGold} style={{ flex: 1 }}>Create Invoice</button>
              <button onClick={() => setShowCreate(false)} className={s.btnGhost} style={{ flex: 1 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}