"use client";

import { useEffect, useState } from "react";
import EmptyState from "@/components/EmptyState";
import { useEngine } from "@/lib/runtime/EngineContext";
import {
  getPurchaseOrders,
  updatePurchaseOrderStatus,
  type PurchaseOrder,
  type PurchaseOrderStatus,
} from "@/lib/purchaseOrders";
import { getPurchaseOrderDocumentUrl } from "@/lib/purchaseOrders";
const STATUS_COLORS: Record<PurchaseOrderStatus, string> = {
  approved: "#f5b942",
  ordered: "#5b9cf5",
  partially_received: "#a78bfa",
  received: "#3dd68c",
  cancelled: "var(--text-muted)",
};

export default function PurchaseOrdersPage() {
  const { organization } = useEngine();

  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | PurchaseOrderStatus>("all");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const data = await getPurchaseOrders(organization.id);
    setOrders(data);
    setLoading(false);
  }

  async function handleViewDocument(docId: string | null) {
    if (!docId) {
      alert("No PDF was generated for this purchase order.");
      return;
    }
    const url = await getPurchaseOrderDocumentUrl(docId);
    if (url) window.open(url, "_blank");
    else alert("Couldn't load the PDF.");
  }

  async function handleStatusChange(po: PurchaseOrder, status: PurchaseOrderStatus) {
    await updatePurchaseOrderStatus(po.id, organization.id, status, po.po_number);
    load();
  }

  const filtered = orders.filter((o) => statusFilter === "all" || o.status === statusFilter);

  const totalCommitted = orders
    .filter((o) => o.status === "approved" || o.status === "ordered")
    .reduce((sum, o) => sum + Number(o.total_cost), 0);

  if (loading) return <div>Loading purchase orders...</div>;

  return (
    <div style={{ overflowY: "auto", height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Purchase Orders</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
            Restocking orders for {organization.name}.
          </p>
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} style={selectStyle}>
          <option value="all">All statuses</option>
          <option value="approved">Approved</option>
          <option value="ordered">Ordered</option>
          <option value="received">Received</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 20 }}>
        <div className="card" style={cardStyle}>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Committed Spend (Approved + Ordered)</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>KES {totalCommitted.toLocaleString()}</div>
        </div>
        <div className="card" style={cardStyle}>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Total Orders</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{orders.length}</div>
        </div>
        <div className="card" style={cardStyle}>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Awaiting Receipt</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>
            {orders.filter((o) => o.status === "approved" || o.status === "ordered").length}
          </div>
        </div>
      </div>

      <div className="card" style={cardStyle}>
        {filtered.map((po) => (
          <div
            key={po.id}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1.5fr 1fr 1fr 1fr auto",
              alignItems: "center",
              padding: "12px 4px",
              borderBottom: "1px solid var(--border)",
              fontSize: 13,
              gap: 8,
            }}
          >
            <span style={{ fontWeight: 600 }}>{po.po_number}</span>
            <span>{po.supplier_name}</span>
            <span style={{ color: "var(--text-muted)" }}>
              {po.inventory_products?.name || "—"} × {po.quantity}
            </span>
            <span style={{ fontWeight: 600 }}>KES {Number(po.total_cost).toLocaleString()}</span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: STATUS_COLORS[po.status],
                textTransform: "uppercase",
              }}
            >
              {po.status}
            </span>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button style={ghostButtonSmall} onClick={() => handleViewDocument(po.document_id)}>
                View PDF
              </button>
              {po.status === "approved" && (
                <button style={ghostButtonSmall} onClick={() => handleStatusChange(po, "ordered")}>
                  Mark Ordered
                </button>
              )}
              {po.status === "ordered" && (
                <button style={ghostButtonSmall} onClick={() => handleStatusChange(po, "received")}>
                  Mark Received
                </button>
              )}
              {(po.status === "approved" || po.status === "ordered") && (
                <button style={dangerBtnSmall} onClick={() => handleStatusChange(po, "cancelled")}>
                  Cancel
                </button>
              )}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <EmptyState icon="📦" message='No purchase orders yet — created when you approve a "purchase" request in Approvals.' />
        )}
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 14,
  padding: 20,
};

const selectStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--bg-base)",
  color: "var(--text-primary)",
  fontSize: 12,
};

const ghostButtonSmall: React.CSSProperties = {
  padding: "5px 10px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--text-secondary)",
  fontSize: 11,
  cursor: "pointer",
};

const dangerBtnSmall: React.CSSProperties = {
  padding: "5px 10px",
  borderRadius: 8,
  border: "1px solid #ef4444",
  background: "transparent",
  color: "#ef4444",
  fontSize: 11,
  cursor: "pointer",
};