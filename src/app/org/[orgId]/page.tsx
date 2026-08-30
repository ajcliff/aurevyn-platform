"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEngine } from "@/lib/runtime/EngineContext";
import { getLowStockProducts, type InventoryProduct } from "@/lib/inventory";
import { getSales, getTopSellingProducts, type PosSale, type TopSellingProduct } from "@/lib/pos";
import { getPendingLeaveRequestsForOrg } from "@/lib/employeeHub";
import { getPendingInvites, type TeamInvite } from "@/lib/team";
import { getOutstandingInvoices } from "@/lib/orgInvoices";
import { getPaymentsSince, methodLabel, type Payment } from "@/lib/payments";
import { getPurchaseOrders, type PurchaseOrder } from "@/lib/purchaseOrders";
import type { OrgInvoice } from "@/lib/orgInvoices";

type AttentionItem = {
  id: string;
  label: string;
  detail: string;
  href: string;
  severity: "high" | "medium";
};

export default function OrgOverviewPage() {
  const { organization, installedEngines, membership } = useEngine();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [lowStock, setLowStock] = useState<InventoryProduct[]>([]);
  const [sales, setSales] = useState<PosSale[]>([]);
  const [pendingLeave, setPendingLeave] = useState<any[]>([]);
  const [pendingInvites, setPendingInvites] = useState<TeamInvite[]>([]);
  const [outstandingInvoices, setOutstandingInvoices] = useState<OrgInvoice[]>([]);
  const [todayPayments, setTodayPayments] = useState<Payment[]>([]);
  const [topProducts, setTopProducts] = useState<TopSellingProduct[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);

  const hasEngine = (slug: string) => installedEngines.some((e) => e.engines?.slug === slug);
  const canManageTeam = membership.role === "owner" || membership.role === "admin";

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(Date.now() - 7 * 86400000);

    const tasks: Promise<void>[] = [];

    if (hasEngine("inventory")) {
      tasks.push(getLowStockProducts(organization.id).then(setLowStock));
      tasks.push(
        getPurchaseOrders(organization.id).then((all) =>
          setPurchaseOrders(all.filter((po) => po.status === "approved" || po.status === "ordered"))
        )
      );
    }
    if (hasEngine("pos")) {
      tasks.push(getSales(organization.id).then(setSales));
      tasks.push(getTopSellingProducts(organization.id, startOfWeek.toISOString()).then(setTopProducts));
    }
    if (hasEngine("finance")) {
      tasks.push(getOutstandingInvoices(organization.id).then(setOutstandingInvoices));
    }
    tasks.push(getPaymentsSince(organization.id, startOfToday.toISOString()).then(setTodayPayments));

    if (hasEngine("hr-payroll") && canManageTeam) {
      tasks.push(getPendingLeaveRequestsForOrg(organization.id).then(setPendingLeave));
    }
    if (canManageTeam) {
      tasks.push(getPendingInvites(organization.id).then(setPendingInvites));
    }

    await Promise.all(tasks);
    setLoading(false);
  }

  // ---- Today's cash position, by payment method ----
  const paymentsByMethod = new Map<string, number>();
  let todayCashTotal = 0;
  todayPayments.forEach((p) => {
    todayCashTotal += Number(p.amount);
    paymentsByMethod.set(p.method, (paymentsByMethod.get(p.method) || 0) + Number(p.amount));
  });

  // ---- Weekly trend ----
  const last7Days = sales.filter((s) => {
    const days = (Date.now() - new Date(s.created_at!).getTime()) / 86400000;
    return days <= 7;
  });
  const prior7Days = sales.filter((s) => {
    const days = (Date.now() - new Date(s.created_at!).getTime()) / 86400000;
    return days > 7 && days <= 14;
  });
  const last7Total = last7Days.reduce((sum, s) => sum + Number(s.total), 0);
  const prior7Total = prior7Days.reduce((sum, s) => sum + Number(s.total), 0);
  const weekTrend = prior7Total > 0 ? Math.round(((last7Total - prior7Total) / prior7Total) * 100) : null;

  // ---- Receivables ----
  const today = new Date();
  const receivablesTotal = outstandingInvoices.reduce((sum, inv) => sum + Number(inv.total), 0);
  const overdueInvoices = outstandingInvoices.filter((inv) => new Date(inv.due_date) < today);

  // ---- Payables ----
  const payablesTotal = purchaseOrders.reduce((sum, po) => sum + Number(po.total_cost), 0);

  // ---- Needs Attention ----
  const attentionItems: AttentionItem[] = [];

  lowStock.forEach((p) => {
    attentionItems.push({
      id: `stock-${p.id}`,
      label: `${p.name} is low on stock`,
      detail: `${p.stock_quantity} ${p.unit || "units"} left`,
      href: `/org/${organization.id}/inventory`,
      severity: "high",
    });
  });

  overdueInvoices.forEach((inv) => {
    const daysOverdue = Math.floor((today.getTime() - new Date(inv.due_date).getTime()) / 86400000);
    attentionItems.push({
      id: `invoice-${inv.id}`,
      label: `Invoice ${inv.invoice_number} is overdue`,
      detail: `${inv.customers?.name || "Customer"} · KES ${Number(inv.total).toLocaleString()} · ${daysOverdue}d overdue`,
      href: `/org/${organization.id}/finance/invoices`,
      severity: "high",
    });
  });

  pendingLeave.forEach((lv) => {
    attentionItems.push({
      id: `leave-${lv.id}`,
      label: `${lv.employees?.full_name || "An employee"} requested leave`,
      detail: `${lv.leave_type} · ${lv.start_date} → ${lv.end_date}`,
      href: `/org/${organization.id}/employees`,
      severity: "medium",
    });
  });

  pendingInvites.forEach((inv) => {
    attentionItems.push({
      id: `invite-${inv.id}`,
      label: `Invite still pending for ${inv.email}`,
      detail: `Sent as ${inv.role}`,
      href: `/org/${organization.id}/team`,
      severity: "medium",
    });
  });

  if (loading) return <div>Loading overview...</div>;

  return (
    <div style={{ overflowY: "auto", height: "100%" }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>{organization.name}</h1>
        <p style={{ color: "var(--text-muted)", fontSize: 12 }}>{organization.location}</p>
      </div>

      {/* Quick actions */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {hasEngine("pos") && (
          <button onClick={() => router.push(`/org/${organization.id}/pos`)} style={quickActionStyle}>
            🛒 New Sale
          </button>
        )}
        {hasEngine("finance") && (
          <button onClick={() => router.push(`/org/${organization.id}/finance`)} style={quickActionStyle}>
            💸 Record Expense
          </button>
        )}
        <button onClick={() => router.push(`/org/${organization.id}/approvals`)} style={quickActionStyle}>
          ✅ View Approvals
        </button>
      </div>

      {/* Needs Attention — compact table rows */}
      <div className="card" style={{ ...compactCardStyle, marginBottom: 14, width: "fit-content", maxWidth: "100%" }}>
        <h3 style={compactHeadingStyle}>Needs Attention</h3>

        {attentionItems.length === 0 ? (
          <div style={{ color: "var(--text-muted)", fontSize: 12, padding: "4px 2px" }}>
            Nothing urgent right now.
          </div>
        ) : (
          <div
            style={{
              maxHeight: 220,
              overflowY: "auto",
              display: "grid",
              gridTemplateColumns: "max-content max-content",
              columnGap: 14,
              width: "fit-content",
              maxWidth: "100%",
            }}
          >
            {attentionItems
              .sort((a, b) => (a.severity === "high" ? -1 : 1))
              .map((item) => (
                <Link key={item.id} href={item.href} style={{ display: "contents" }}>
                  <div
                    style={{
                      whiteSpace: "nowrap",
                      padding: "6px 0",
                      borderBottom: "1px solid var(--border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <span style={{ fontSize: 11.5, fontWeight: 600 }}>{item.label}</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}> — {item.detail}</span>
                  </div>
                  <span
                    style={{
                      alignSelf: "center",
                      fontSize: 9,
                      padding: "1px 6px",
                      borderRadius: 999,
                      borderBottom: "1px solid var(--border)",
                      background: item.severity === "high" ? "#ef444422" : "#e8b92322",
                      color: item.severity === "high" ? "#ef4444" : "#e8b923",
                    }}
                  >
                    {item.severity === "high" ? "Urgent" : "Pending"}
                  </span>
                </Link>
              ))}
          </div>
        )}
      </div>

      {/* Compact stat tiles: Receivables, Payables, Today's cash */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${[hasEngine("finance"), hasEngine("inventory"), true].filter(Boolean).length}, 1fr)`,
          gap: 10,
          marginBottom: 14,
        }}
      >
        {hasEngine("finance") && (
          <div className="card" style={statTileStyle}>
            <div style={statLabelStyle}>Receivables</div>
            <div style={statValueStyle}>KES {receivablesTotal.toLocaleString()}</div>
            <div style={{ fontSize: 10.5, color: overdueInvoices.length > 0 ? "#ef4444" : "var(--text-muted)" }}>
              {outstandingInvoices.length} outstanding
              {overdueInvoices.length > 0 && ` · ${overdueInvoices.length} overdue`}
            </div>
          </div>
        )}

        {hasEngine("inventory") && (
          <div className="card" style={statTileStyle}>
            <div style={statLabelStyle}>Payables</div>
            <div style={statValueStyle}>KES {payablesTotal.toLocaleString()}</div>
            <div style={{ fontSize: 10.5, color: "var(--text-muted)" }}>
              {purchaseOrders.length} PO{purchaseOrders.length === 1 ? "" : "s"} pending
            </div>
          </div>
        )}

        <div className="card" style={statTileStyle}>
          <div style={statLabelStyle}>Today's Cash</div>
          <div style={statValueStyle}>KES {todayCashTotal.toLocaleString()}</div>
          {hasEngine("pos") && weekTrend !== null ? (
            <div style={{ fontSize: 10.5, color: weekTrend >= 0 ? "#3dd68c" : "#ef4444" }}>
              {weekTrend > 0 ? "+" : ""}{weekTrend}% vs last week
            </div>
          ) : (
            <div style={{ fontSize: 10.5, color: "var(--text-muted)" }}>received so far today</div>
          )}
        </div>
      </div>

      {/* Cash by method — compact table rows */}
      {paymentsByMethod.size > 0 && (
        <div className="card" style={{ ...compactCardStyle, marginBottom: 14, width: "fit-content", maxWidth: "100%" }}>
          <h3 style={compactHeadingStyle}>Cash By Method — Today</h3>
          {Array.from(paymentsByMethod.entries()).map(([method, amount], i, arr) => (
            <div
              key={method}
              style={{
                display: "flex",
                alignItems: "center",
                width: "fit-content",
                maxWidth: "100%",
                padding: "6px 0 6px 6px",
                minHeight: 28,
                gap: 14,
                borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none",
              }}
            >
              <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{methodLabel(method as any)}</span>
              <span style={{ fontSize: 12.5, fontWeight: 700 }}>KES {amount.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}

      {/* What's selling — compact table rows */}
      {hasEngine("pos") && topProducts.length > 0 && (
        <div className="card" style={{ ...compactCardStyle, width: "fit-content", maxWidth: "100%" }}>
          <h3 style={compactHeadingStyle}>What's Selling — Last 7 Days</h3>
          {topProducts.map((p, i) => (
            <div
              key={p.product_name}
              style={{
                display: "flex",
                alignItems: "center",
                width: "fit-content",
                maxWidth: "100%",
                padding: "6px 0 6px 6px",
                minHeight: 28,
                gap: 14,
                borderBottom: i < topProducts.length - 1 ? "1px solid var(--border)" : "none",
              }}
            >
              <span style={{ fontSize: 11.5 }}>
                <span style={{ color: "var(--text-muted)", marginRight: 6 }}>{i + 1}.</span>
                {p.product_name}
              </span>
              <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                <strong style={{ color: "var(--text-primary)", fontWeight: 700 }}>
                  KES {p.revenue.toLocaleString()}
                </strong>{" "}
                · {p.quantity_sold} sold
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const compactCardStyle: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: "12px 14px",
};

const compactHeadingStyle: React.CSSProperties = {
  fontSize: 12.5,
  fontWeight: 700,
  marginBottom: 8,
  color: "var(--text-primary)",
};

const statTileStyle: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: "12px 14px",
};

const statLabelStyle: React.CSSProperties = {
  fontSize: 10.5,
  color: "var(--text-muted)",
  marginBottom: 3,
};

const statValueStyle: React.CSSProperties = {
  fontSize: 17,
  fontWeight: 700,
  marginBottom: 2,
};

const quickActionStyle: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  padding: "8px 14px",
  fontSize: 12,
  fontWeight: 600,
  color: "var(--text-primary)",
  cursor: "pointer",
};
