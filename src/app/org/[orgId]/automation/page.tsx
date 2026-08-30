"use client";

import { useEffect, useState } from "react";
import { useEngine } from "@/lib/runtime/EngineContext";
import { getInvoices, getInvoice, type OrgInvoice } from "@/lib/orgInvoices";
import { getPurchaseOrders, type PurchaseOrder } from "@/lib/purchaseOrders";
import {
  getScheduledInvoices, createScheduleFromInvoice, toggleScheduledInvoiceActive, deleteScheduledInvoice,
  getScheduledPurchaseOrders, createScheduleFromPurchaseOrder, toggleScheduledPurchaseOrderActive, deleteScheduledPurchaseOrder,
  type ScheduledInvoice, type ScheduledPurchaseOrder, type ScheduleFrequency,
} from "@/lib/scheduledDocuments";
import EmptyState from "@/components/EmptyState";

type Tab = "invoices" | "purchase-orders";

const frequencyLabel: Record<ScheduleFrequency, string> = {
  weekly: "Weekly", monthly: "Monthly", quarterly: "Quarterly", annual: "Annual",
};

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export default function AutomationPage() {
  const { organization } = useEngine();
  const [tab, setTab] = useState<Tab>("invoices");

  const [invoices, setInvoices] = useState<OrgInvoice[]>([]);
  const [scheduledInvoices, setScheduledInvoices] = useState<ScheduledInvoice[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [scheduledPOs, setScheduledPOs] = useState<ScheduledPurchaseOrder[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [scheduleTarget, setScheduleTarget] = useState<{ type: "invoice" | "po"; id: string } | null>(null);
  const [scheduleLabel, setScheduleLabel] = useState("");
  const [scheduleFrequency, setScheduleFrequency] = useState<ScheduleFrequency>("monthly");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [inv, sInv, po, sPo] = await Promise.all([
        getInvoices(organization.id),
        getScheduledInvoices(organization.id),
        getPurchaseOrders(organization.id),
        getScheduledPurchaseOrders(organization.id),
      ]);
      setInvoices(inv);
      setScheduledInvoices(sInv);
      setPurchaseOrders(po);
      setScheduledPOs(sPo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load automation data");
    } finally {
      setLoading(false);
    }
  }

  function openScheduleForm(type: "invoice" | "po", id: string, defaultLabel: string) {
    setScheduleTarget({ type, id });
    setScheduleLabel(defaultLabel);
    setScheduleFrequency("monthly");
  }

  async function confirmSchedule() {
    if (!scheduleTarget || !scheduleLabel.trim()) return;
    setSaving(true);
    setError(null);
    try {
      if (scheduleTarget.type === "invoice") {
        const full = await getInvoice(scheduleTarget.id);
        if (!full) throw new Error("Invoice not found");
        const created = await createScheduleFromInvoice(organization.id, full, scheduleLabel, scheduleFrequency);
        setScheduledInvoices(prev => [...prev, created].sort((a, b) => a.next_run.localeCompare(b.next_run)));
      } else {
        const po = purchaseOrders.find(p => p.id === scheduleTarget.id);
        if (!po) throw new Error("Purchase order not found");
        const created = await createScheduleFromPurchaseOrder(organization.id, po, scheduleLabel, scheduleFrequency);
        setScheduledPOs(prev => [...prev, created].sort((a, b) => a.next_run.localeCompare(b.next_run)));
      }
      setScheduleTarget(null);
      setScheduleLabel("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create schedule");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleInvoice(s: ScheduledInvoice) {
    try {
      await toggleScheduledInvoiceActive(s.id, !s.active);
      setScheduledInvoices(prev => prev.map(x => x.id === s.id ? { ...x, active: !x.active } : x));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update schedule");
    }
  }

  async function handleDeleteInvoiceSchedule(id: string) {
    try {
      await deleteScheduledInvoice(id);
      setScheduledInvoices(prev => prev.filter(x => x.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete schedule");
    }
  }

  async function handleTogglePO(s: ScheduledPurchaseOrder) {
    try {
      await toggleScheduledPurchaseOrderActive(s.id, !s.active);
      setScheduledPOs(prev => prev.map(x => x.id === s.id ? { ...x, active: !x.active } : x));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update schedule");
    }
  }

  async function handleDeletePOSchedule(id: string) {
    try {
      await deleteScheduledPurchaseOrder(id);
      setScheduledPOs(prev => prev.filter(x => x.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete schedule");
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "9px 12px", borderRadius: "8px",
    border: "1px solid var(--border)", background: "var(--bg-base)",
    color: "var(--text-primary)", fontSize: "13px", outline: "none", fontFamily: "inherit",
  };

  const scheduledInvoiceIds = new Set(scheduledInvoices.map(() => "")); // invoices don't track source id, no dedupe needed by design (a template can be reused)

  if (loading) {
    return <div style={{ padding: 24, fontSize: 13, color: "var(--text-muted)" }}>Loading automation...</div>;
  }

  return (
    <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px", maxWidth: "800px" }}>
      <div>
        <h1 style={{ fontSize: "22px", fontWeight: 700 }}>Automation</h1>
        <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>
          Turn any invoice or purchase order into a recurring schedule
        </p>
      </div>

      {error && (
        <div style={{ fontSize: 12, color: "#ef4444", background: "#ef44441a", border: "1px solid #ef444440", borderRadius: 8, padding: "10px 12px" }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: "4px" }}>
        {(["invoices", "purchase-orders"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: "8px", borderRadius: "8px", border: "1px solid var(--border)",
            background: tab === t ? "var(--gold)" : "var(--bg-card)",
            color: tab === t ? "#0a0a0f" : "var(--text-secondary)",
            fontSize: "12px", fontWeight: tab === t ? 700 : 400,
            cursor: "pointer", fontFamily: "inherit",
          }}>
            {t === "invoices" ? "Invoices" : "Purchase Orders"}
          </button>
        ))}
      </div>

      {scheduleTarget && (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--gold)", borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ fontSize: "13px", fontWeight: 600 }}>Schedule this {scheduleTarget.type === "invoice" ? "invoice" : "purchase order"}</div>
          <input value={scheduleLabel} onChange={e => setScheduleLabel(e.target.value)} placeholder="Label (e.g. Monthly retainer - Acme)" style={inputStyle} />
          <select value={scheduleFrequency} onChange={e => setScheduleFrequency(e.target.value as ScheduleFrequency)} style={inputStyle}>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="annual">Annual</option>
          </select>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={confirmSchedule} disabled={saving} className="btn-gold" style={{ padding: "8px 16px", borderRadius: "8px", border: "none", background: "var(--gold)", color: "#0a0a0f", fontWeight: 700, fontSize: "12px", cursor: "pointer", fontFamily: "inherit" }}>
              {saving ? "Saving..." : "Confirm Schedule"}
            </button>
            <button onClick={() => setScheduleTarget(null)} style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: "12px", cursor: "pointer", fontFamily: "inherit" }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {tab === "invoices" && (
        <>
          <div>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--gold)", marginBottom: "10px" }}>ACTIVE SCHEDULES</div>
            {scheduledInvoices.length === 0 ? (
              <EmptyState icon="🔁" message="No recurring invoices set up yet." />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {scheduledInvoices.map(s => {
                  const days = daysUntil(s.next_run);
                  return (
                    <div key={s.id} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "10px", padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", opacity: s.active ? 1 : 0.5 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "13px", fontWeight: 600 }}>{s.label}</div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                          {s.customers?.name ?? "No customer"} · {frequencyLabel[s.frequency]} · Next: {new Date(s.next_run).toLocaleDateString("en-KE")}
                          {s.active && days <= 3 && ` (in ${days}d)`}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                        <button onClick={() => handleToggleInvoice(s)} style={{ fontSize: "10px", padding: "5px 10px", borderRadius: "6px", border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", cursor: "pointer", fontFamily: "inherit" }}>
                          {s.active ? "Pause" : "Resume"}
                        </button>
                        <button onClick={() => handleDeleteInvoiceSchedule(s.id)} style={{ fontSize: "10px", padding: "5px 10px", borderRadius: "6px", border: "none", background: "transparent", color: "#ef4444", cursor: "pointer", fontFamily: "inherit" }}>
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", marginBottom: "10px" }}>YOUR INVOICES — PICK ONE TO SCHEDULE</div>
            {invoices.length === 0 ? (
              <EmptyState icon="📄" message="No invoices yet — create one in Finance first." />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {invoices.slice(0, 20).map(inv => (
                  <div key={inv.id} style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "10px", padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "13px", fontWeight: 600 }}>{inv.invoice_number} · {inv.customers?.name ?? "No customer"}</div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>KES {inv.total.toLocaleString()} · {inv.status}</div>
                    </div>
                    <button
                      onClick={() => openScheduleForm("invoice", inv.id, `${inv.customers?.name ?? "Invoice"} — recurring`)}
                      style={{ fontSize: "10px", padding: "6px 12px", borderRadius: "6px", border: "1px solid var(--gold)", background: "transparent", color: "var(--gold)", cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}
                    >
                      + Schedule
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {tab === "purchase-orders" && (
        <>
          <div>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--gold)", marginBottom: "10px" }}>ACTIVE SCHEDULES</div>
            {scheduledPOs.length === 0 ? (
              <EmptyState icon="🔁" message="No recurring purchase orders set up yet." />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {scheduledPOs.map(s => {
                  const days = daysUntil(s.next_run);
                  return (
                    <div key={s.id} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "10px", padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", opacity: s.active ? 1 : 0.5 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "13px", fontWeight: 600 }}>{s.label}</div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                          {s.supplier_name} · {frequencyLabel[s.frequency]} · Next: {new Date(s.next_run).toLocaleDateString("en-KE")}
                          {s.active && days <= 3 && ` (in ${days}d)`}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                        <button onClick={() => handleTogglePO(s)} style={{ fontSize: "10px", padding: "5px 10px", borderRadius: "6px", border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", cursor: "pointer", fontFamily: "inherit" }}>
                          {s.active ? "Pause" : "Resume"}
                        </button>
                        <button onClick={() => handleDeletePOSchedule(s.id)} style={{ fontSize: "10px", padding: "5px 10px", borderRadius: "6px", border: "none", background: "transparent", color: "#ef4444", cursor: "pointer", fontFamily: "inherit" }}>
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", marginBottom: "10px" }}>YOUR PURCHASE ORDERS — PICK ONE TO SCHEDULE</div>
            {purchaseOrders.length === 0 ? (
              <EmptyState icon="📋" message="No purchase orders yet." />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {purchaseOrders.slice(0, 20).map(po => (
                  <div key={po.id} style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "10px", padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "13px", fontWeight: 600 }}>{po.po_number} · {po.supplier_name}</div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>KES {po.total_cost.toLocaleString()} · {po.status}</div>
                    </div>
                    <button
                      onClick={() => openScheduleForm("po", po.id, `${po.supplier_name} — recurring order`)}
                      style={{ fontSize: "10px", padding: "6px 12px", borderRadius: "6px", border: "1px solid var(--gold)", background: "transparent", color: "var(--gold)", cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}
                    >
                      + Schedule
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}