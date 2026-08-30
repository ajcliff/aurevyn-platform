"use client";

import { useEffect, useState } from "react";
import { useEngine } from "@/lib/runtime/EngineContext";
import Drawer from "@/components/Drawer";
import EmptyState from "@/components/EmptyState";
import { getProducts, type InventoryProduct } from "@/lib/inventory";
import { getSuppliers, createSupplier, updateSupplier, type Supplier } from "@/lib/suppliers";
import {
  getPurchaseOrders,
  createManualPurchaseOrder,
  updatePurchaseOrderStatus,
  receivePurchaseOrderItems,
  getPurchaseOrderDocumentUrl,
  type PurchaseOrder,
  type PurchaseOrderStatus,
} from "@/lib/purchaseOrders";

const STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  approved: "Approved",
  ordered: "Ordered",
  partially_received: "Partially Received",
  received: "Received",
  cancelled: "Cancelled",
};

const STATUS_COLORS: Record<PurchaseOrderStatus, string> = {
  approved: "#f5b942",
  ordered: "#5b9cf5",
  partially_received: "#a78bfa",
  received: "#3dd68c",
  cancelled: "var(--text-muted)",
};

type NewItemRow = { productId: string; quantity: number; unitCost: number };

export default function ProcurementPage() {
  const { organization, membership } = useEngine();
  const actorName = membership.isFounder ? "Founder" : membership.userEmail ?? "Team member";

  const [tab, setTab] = useState<"orders" | "suppliers">("orders");
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | PurchaseOrderStatus>("all");

  // New PO drawer
  const [showNewPO, setShowNewPO] = useState(false);
  const [poSupplierId, setPoSupplierId] = useState("");
  const [poItems, setPoItems] = useState<NewItemRow[]>([{ productId: "", quantity: 1, unitCost: 0 }]);
  const [savingPO, setSavingPO] = useState(false);

  // Receive drawer
  const [receivingPO, setReceivingPO] = useState<PurchaseOrder | null>(null);
  const [receiveQtys, setReceiveQtys] = useState<Record<string, number>>({});
  const [receiving, setReceiving] = useState(false);

  // Supplier drawer
  const [showSupplierDrawer, setShowSupplierDrawer] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supName, setSupName] = useState("");
  const [supContact, setSupContact] = useState("");
  const [supPhone, setSupPhone] = useState("");
  const [supEmail, setSupEmail] = useState("");
  const [supTerms, setSupTerms] = useState("");
  const [supCategories, setSupCategories] = useState("");
  const [savingSupplier, setSavingSupplier] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const [o, s, p] = await Promise.all([
      getPurchaseOrders(organization.id),
      getSuppliers(organization.id),
      getProducts(organization.id),
    ]);
    setOrders(o);
    setSuppliers(s);
    setProducts(p);
    setLoading(false);
  }

  const supplierById = (id: string | null) => suppliers.find((s) => s.id === id);
  const productById = (id: string) => products.find((p) => p.id === id);

  const filteredOrders = orders.filter((o) => statusFilter === "all" || o.status === statusFilter);

  const committedSpend = orders
    .filter((o) => o.status === "approved" || o.status === "ordered" || o.status === "partially_received")
    .reduce((sum, o) => sum + Number(o.total_cost), 0);

  const awaitingReceipt = orders.filter(
    (o) => o.status === "approved" || o.status === "ordered" || o.status === "partially_received"
  ).length;

  // ---------- New PO ----------

  function openNewPO() {
    setPoSupplierId(suppliers[0]?.id ?? "");
    setPoItems([{ productId: products[0]?.id ?? "", quantity: 1, unitCost: products[0]?.unit_price ?? 0 }]);
    setShowNewPO(true);
  }

  function closeNewPO() {
    setShowNewPO(false);
  }

  function updateItemRow(index: number, updates: Partial<NewItemRow>) {
    setPoItems((rows) => rows.map((r, i) => (i === index ? { ...r, ...updates } : r)));
  }

  function addItemRow() {
    setPoItems((rows) => [...rows, { productId: products[0]?.id ?? "", quantity: 1, unitCost: products[0]?.unit_price ?? 0 }]);
  }

  function removeItemRow(index: number) {
    setPoItems((rows) => rows.filter((_, i) => i !== index));
  }

  const newPOTotal = poItems.reduce((sum, r) => sum + r.quantity * r.unitCost, 0);

  async function handleCreatePO() {
    const supplier = supplierById(poSupplierId);
    const validItems = poItems.filter((r) => r.productId && r.quantity > 0);
    if (!supplier || validItems.length === 0) return;

    try {
      setSavingPO(true);
      await createManualPurchaseOrder({
        orgId: organization.id,
        supplierId: supplier.id,
        supplierName: supplier.name,
        items: validItems.map((r) => ({ productId: r.productId, quantity: r.quantity, unitCost: r.unitCost })),
        createdByName: actorName,
      });
      closeNewPO();
      load();
    } catch (err) {
      console.error(err);
      alert("Failed to create purchase order");
    } finally {
      setSavingPO(false);
    }
  }

  // ---------- Status actions ----------

  async function handleStatusChange(po: PurchaseOrder, status: PurchaseOrderStatus) {
    await updatePurchaseOrderStatus(po.id, organization.id, status, po.po_number);
    load();
  }

  async function handleViewDocument(docId: string | null) {
    if (!docId) {
      alert("No PDF is attached to this purchase order.");
      return;
    }
    const url = await getPurchaseOrderDocumentUrl(docId);
    if (url) window.open(url, "_blank");
    else alert("Couldn't load the PDF.");
  }

  // ---------- Receiving ----------

  function openReceive(po: PurchaseOrder) {
    setReceivingPO(po);
    const initial: Record<string, number> = {};
    (po.purchase_order_items ?? []).forEach((item) => {
      const remaining = Number(item.quantity) - Number(item.received_quantity);
      initial[item.id] = remaining > 0 ? remaining : 0;
    });
    setReceiveQtys(initial);
  }

  function closeReceive() {
    setReceivingPO(null);
    setReceiveQtys({});
  }

  async function handleConfirmReceive() {
    if (!receivingPO) return;
    const receipts = (receivingPO.purchase_order_items ?? [])
      .map((item) => ({
        itemId: item.id,
        productId: item.product_id,
        receiveQty: Number(receiveQtys[item.id] || 0),
      }))
      .filter((r) => r.receiveQty > 0);

    if (receipts.length === 0) return;

    try {
      setReceiving(true);
      await receivePurchaseOrderItems({
        poId: receivingPO.id,
        orgId: organization.id,
        poNumber: receivingPO.po_number,
        receivedByName: actorName,
        receipts,
      });
      closeReceive();
      load();
    } catch (err) {
      console.error(err);
      alert("Failed to record receipt");
    } finally {
      setReceiving(false);
    }
  }

  // ---------- Suppliers ----------

  function openNewSupplier() {
    setEditingSupplier(null);
    setSupName("");
    setSupContact("");
    setSupPhone("");
    setSupEmail("");
    setSupTerms("");
    setSupCategories("");
    setShowSupplierDrawer(true);
  }

  function openEditSupplier(s: Supplier) {
    setEditingSupplier(s);
    setSupName(s.name);
    setSupContact(s.contact_name ?? "");
    setSupPhone(s.phone ?? "");
    setSupEmail(s.email ?? "");
    setSupTerms(s.payment_terms ?? "");
    setSupCategories(s.categories.join(", "));
    setShowSupplierDrawer(true);
  }

  function closeSupplierDrawer() {
    setShowSupplierDrawer(false);
    setEditingSupplier(null);
  }

  async function handleSaveSupplier() {
    if (!supName.trim()) return;
    const categories = supCategories
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);

    try {
      setSavingSupplier(true);
      if (editingSupplier) {
        await updateSupplier(editingSupplier.id, {
          name: supName,
          contact_name: supContact || null,
          phone: supPhone || null,
          email: supEmail || null,
          payment_terms: supTerms || null,
          categories,
        });
      } else {
        await createSupplier({
          org_id: organization.id,
          name: supName,
          contact_name: supContact || null,
          phone: supPhone || null,
          email: supEmail || null,
          payment_terms: supTerms || null,
          categories,
        });
      }
      closeSupplierDrawer();
      load();
    } catch (err) {
      console.error(err);
      alert("Failed to save supplier");
    } finally {
      setSavingSupplier(false);
    }
  }

  if (loading) return <div>Loading procurement...</div>;

  return (
    <div style={{ overflowY: "auto", height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Procurement</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
            Suppliers and purchase orders for {organization.name}.
          </p>
        </div>
        <button style={buttonGold} onClick={tab === "orders" ? openNewPO : openNewSupplier}>
          {tab === "orders" ? "+ New Purchase Order" : "+ New Supplier"}
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <FilterChip label="Purchase Orders" active={tab === "orders"} onClick={() => setTab("orders")} />
        <FilterChip label="Suppliers" active={tab === "suppliers"} onClick={() => setTab("suppliers")} />
      </div>

      {tab === "orders" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 20 }}>
            <div className="card" style={cardStyle}>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Committed Spend</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>KES {committedSpend.toLocaleString()}</div>
            </div>
            <div className="card" style={cardStyle}>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Total Orders</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{orders.length}</div>
            </div>
            <div className="card" style={cardStyle}>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Awaiting Receipt</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{awaitingReceipt}</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            <FilterChip label="All" active={statusFilter === "all"} onClick={() => setStatusFilter("all")} />
            {(Object.keys(STATUS_LABELS) as PurchaseOrderStatus[]).map((s) => (
              <FilterChip key={s} label={STATUS_LABELS[s]} active={statusFilter === s} onClick={() => setStatusFilter(s)} />
            ))}
          </div>

          <div className="card" style={cardStyle}>
            {filteredOrders.map((po) => {
              const items = po.purchase_order_items ?? [];
              const itemSummary =
                items.length === 1
                  ? `${items[0].inventory_products?.name ?? "Product"} × ${items[0].quantity}`
                  : `${items.length} products`;

              return (
                <div key={po.id} style={{ ...rowStyle, ...poGridCols }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{po.po_number}</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>
                      {po.origin === "manual" ? "Manual" : "From Approval"}
                    </div>
                  </div>
                  <span>{po.suppliers?.name ?? po.supplier_name}</span>
                  <span style={{ color: "var(--text-muted)" }}>{itemSummary}</span>
                  <span style={{ fontWeight: 600 }}>KES {Number(po.total_cost).toLocaleString()}</span>
                  <Badge color={STATUS_COLORS[po.status]}>{STATUS_LABELS[po.status]}</Badge>

                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    {po.document_id && (
                      <button style={ghostButtonSmall} onClick={() => handleViewDocument(po.document_id)}>
                        View PDF
                      </button>
                    )}
                    {po.status === "approved" && (
                      <button style={ghostButtonSmall} onClick={() => handleStatusChange(po, "ordered")}>
                        Mark Ordered
                      </button>
                    )}
                    {(po.status === "ordered" || po.status === "partially_received") && (
                      <button style={ghostButtonSmall} onClick={() => openReceive(po)}>
                        Receive
                      </button>
                    )}
                    {(po.status === "approved" || po.status === "ordered") && (
                      <button style={dangerBtnSmall} onClick={() => handleStatusChange(po, "cancelled")}>
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredOrders.length === 0 && (
              <EmptyState icon="📋" message="No purchase orders yet — create one, or approve a restock request in Approvals." />
            )}
          </div>
        </>
      )}

      {tab === "suppliers" && (
        <div className="card" style={cardStyle}>
          {suppliers.map((s) => (
            <div key={s.id} style={{ ...rowStyle, ...supplierGridCols, cursor: "pointer" }} onClick={() => openEditSupplier(s)}>
              <span style={{ fontWeight: 600 }}>{s.name}</span>
              <span style={{ color: "var(--text-muted)" }}>{s.contact_name || "—"}</span>
              <span style={{ color: "var(--text-muted)" }}>{s.phone || s.email || "—"}</span>
              <span style={{ color: "var(--text-muted)" }}>{s.payment_terms || "—"}</span>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
                {s.categories.slice(0, 3).map((c) => (
                  <Badge key={c} color="var(--text-muted)">{c}</Badge>
                ))}
              </div>
            </div>
          ))}

          {suppliers.length === 0 && (
            <EmptyState icon="🏭" message="No suppliers yet — add one to start creating purchase orders." />
          )}
        </div>
      )}

      {/* New Purchase Order drawer */}
      <Drawer open={showNewPO} onClose={closeNewPO} title="New Purchase Order" width={440}>
        <label style={labelStyle}>Supplier</label>
        <select value={poSupplierId} onChange={(e) => setPoSupplierId(e.target.value)} style={{ ...selectStyle, width: "100%", marginBottom: 14 }}>
          <option value="">Select a supplier...</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        {suppliers.length === 0 && (
          <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: -8, marginBottom: 14 }}>
            No suppliers yet — add one on the Suppliers tab first.
          </p>
        )}

        <SectionDivider label="Line Items" />
        {poItems.map((row, i) => (
          <div key={i} style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "center" }}>
            <select
              value={row.productId}
              onChange={(e) => {
                const p = productById(e.target.value);
                updateItemRow(i, { productId: e.target.value, unitCost: p?.unit_price ?? row.unitCost });
              }}
              style={{ ...selectStyle, flex: 1.4 }}
            >
              <option value="">Product...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              value={row.quantity}
              onChange={(e) => updateItemRow(i, { quantity: Number(e.target.value) })}
              style={{ ...inputStyle, marginBottom: 0, width: 60 }}
              placeholder="Qty"
            />
            <input
              type="number"
              min={0}
              value={row.unitCost}
              onChange={(e) => updateItemRow(i, { unitCost: Number(e.target.value) })}
              style={{ ...inputStyle, marginBottom: 0, width: 80 }}
              placeholder="Cost"
            />
            <button
              onClick={() => removeItemRow(i)}
              disabled={poItems.length === 1}
              style={{ ...ghostButtonSmall, opacity: poItems.length === 1 ? 0.4 : 1 }}
            >
              ✕
            </button>
          </div>
        ))}
        <button style={{ ...ghostButton, marginBottom: 16 }} onClick={addItemRow}>
          + Add line item
        </button>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 16 }}>
          <span style={{ color: "var(--text-muted)" }}>Total</span>
          <span style={{ fontWeight: 700 }}>KES {newPOTotal.toLocaleString()}</span>
        </div>

        <button style={{ ...buttonGold, width: "100%" }} onClick={handleCreatePO} disabled={savingPO || !poSupplierId}>
          {savingPO ? "Creating..." : "Create Purchase Order"}
        </button>
      </Drawer>

      {/* Receive drawer */}
      <Drawer open={!!receivingPO} onClose={closeReceive} title={receivingPO ? `Receive ${receivingPO.po_number}` : ""} width={420}>
        {receivingPO && (
          <>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
              Enter how many units arrived for each product. Partial receipts are fine — you can receive the rest later.
            </p>
            {(receivingPO.purchase_order_items ?? []).map((item) => {
              const remaining = Number(item.quantity) - Number(item.received_quantity);
              return (
                <div key={item.id} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                    <span>{item.inventory_products?.name ?? "Product"}</span>
                    <span style={{ color: "var(--text-muted)" }}>
                      {item.received_quantity} / {item.quantity} received
                    </span>
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={remaining}
                    value={receiveQtys[item.id] ?? 0}
                    onChange={(e) =>
                      setReceiveQtys((prev) => ({ ...prev, [item.id]: Number(e.target.value) }))
                    }
                    style={{ ...inputStyle, marginBottom: 0 }}
                  />
                </div>
              );
            })}
            <button style={{ ...buttonGold, width: "100%", marginTop: 8 }} onClick={handleConfirmReceive} disabled={receiving}>
              {receiving ? "Recording..." : "Confirm Receipt"}
            </button>
          </>
        )}
      </Drawer>

      {/* Supplier drawer */}
      <Drawer open={showSupplierDrawer} onClose={closeSupplierDrawer} title={editingSupplier ? "Edit Supplier" : "New Supplier"} width={400}>
        <label style={labelStyle}>Name</label>
        <input value={supName} onChange={(e) => setSupName(e.target.value)} style={inputStyle} placeholder="Supplier name" />

        <label style={labelStyle}>Contact person</label>
        <input value={supContact} onChange={(e) => setSupContact(e.target.value)} style={inputStyle} placeholder="Contact name" />

        <label style={labelStyle}>Phone</label>
        <input value={supPhone} onChange={(e) => setSupPhone(e.target.value)} style={inputStyle} placeholder="Phone" />

        <label style={labelStyle}>Email</label>
        <input value={supEmail} onChange={(e) => setSupEmail(e.target.value)} style={inputStyle} placeholder="Email" />

        <label style={labelStyle}>Payment terms</label>
        <input value={supTerms} onChange={(e) => setSupTerms(e.target.value)} style={inputStyle} placeholder="e.g. Net 30" />

        <label style={labelStyle}>Categories supplied (comma-separated)</label>
        <input value={supCategories} onChange={(e) => setSupCategories(e.target.value)} style={inputStyle} placeholder="e.g. Beverages, Packaging" />

        <button style={{ ...buttonGold, width: "100%", marginTop: 8 }} onClick={handleSaveSupplier} disabled={savingSupplier}>
          {savingSupplier ? "Saving..." : editingSupplier ? "Save Changes" : "Add Supplier"}
        </button>
      </Drawer>
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 14px",
        borderRadius: 8,
        border: "1px solid var(--border)",
        background: active ? "var(--gold)" : "var(--bg-elevated)",
        color: active ? "#07070f" : "var(--text-secondary)",
        fontSize: 11,
        fontWeight: active ? 700 : 500,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "3px 8px",
        borderRadius: 6,
        background: `${color}1f`,
        border: `1px solid ${color}40`,
        color,
        fontSize: 10,
        fontWeight: 700,
        width: "fit-content",
      }}
    >
      {children}
    </span>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: 0.5, margin: "4px 0 10px" }}>
      {label.toUpperCase()}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 14,
  padding: 20,
};

const rowStyle: React.CSSProperties = {
  display: "grid",
  alignItems: "center",
  padding: "12px 4px",
  borderBottom: "1px solid var(--border)",
  fontSize: 13,
  gap: 8,
};

const poGridCols: React.CSSProperties = {
  gridTemplateColumns: "1fr 1.2fr 1.2fr 1fr 1fr 1.4fr",
};

const supplierGridCols: React.CSSProperties = {
  gridTemplateColumns: "1.2fr 1fr 1.2fr 1fr 1.2fr",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--bg-base)",
  color: "var(--text-primary)",
  marginBottom: 10,
  fontSize: 13,
};

const selectStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--bg-base)",
  color: "var(--text-primary)",
  fontSize: 12,
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  color: "var(--text-muted)",
  marginBottom: 4,
  display: "block",
};

const buttonGold: React.CSSProperties = {
  background: "var(--gold)",
  color: "#07070f",
  border: "none",
  borderRadius: 10,
  padding: "9px 18px",
  fontWeight: 700,
  fontSize: 12,
  cursor: "pointer",
};

const ghostButton: React.CSSProperties = {
  padding: "9px 18px",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--text-secondary)",
  fontSize: 12,
  cursor: "pointer",
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
