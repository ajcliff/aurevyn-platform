"use client";
import Link from "next/link";

import { useEffect, useState } from "react";
import { useEngine } from "@/lib/runtime/EngineContext";
import { getProducts, type InventoryProduct } from "@/lib/inventory";
import {
  getWarehouses,
  createWarehouse,
  setDefaultWarehouse,
  deleteWarehouse,
  getStockLevelsForProduct,
  transferStock,
  getTransferHistory,
  type Warehouse,
  type StockLevel,
} from "@/lib/warehouses";

export default function WarehousesPage() {
  const { organization } = useEngine();

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showNewWarehouse, setShowNewWarehouse] = useState(false);
  const [whName, setWhName] = useState("");
  const [whCode, setWhCode] = useState("");
  const [whAddress, setWhAddress] = useState("");

  const [showTransfer, setShowTransfer] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
  const [fromWarehouse, setFromWarehouse] = useState("");
  const [toWarehouse, setToWarehouse] = useState("");
  const [transferQty, setTransferQty] = useState("");
  const [transferNote, setTransferNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const [w, p, t] = await Promise.all([
      getWarehouses(organization.id),
      getProducts(organization.id),
      getTransferHistory(organization.id),
    ]);
    setWarehouses(w);
    setProducts(p);
    setTransfers(t);
    setLoading(false);
  }

  async function handleCreateWarehouse() {
    if (!whName.trim()) return;
    await createWarehouse({ orgId: organization.id, name: whName, code: whCode, address: whAddress });
    setWhName("");
    setWhCode("");
    setWhAddress("");
    setShowNewWarehouse(false);
    load();
  }

  async function handleSetDefault(id: string) {
    await setDefaultWarehouse(organization.id, id);
    load();
  }

  async function handleDeleteWarehouse(w: Warehouse) {
    if (!confirm(`Delete "${w.name}"?`)) return;
    try {
      await deleteWarehouse(w.id, organization.id, w.name);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete warehouse");
    }
  }

  async function handleProductSelect(productId: string) {
    setSelectedProductId(productId);
    if (productId) {
      const levels = await getStockLevelsForProduct(productId);
      setStockLevels(levels);
    } else {
      setStockLevels([]);
    }
  }

  async function handleTransfer() {
    setError("");
    const product = products.find((p) => p.id === selectedProductId);
    if (!product || !fromWarehouse || !toWarehouse || !transferQty) {
      setError("Please fill in all fields.");
      return;
    }

    try {
      setSaving(true);
      await transferStock({
        orgId: organization.id,
        productId: selectedProductId,
        productName: product.name,
        fromWarehouseId: fromWarehouse,
        toWarehouseId: toWarehouse,
        quantity: Number(transferQty),
        note: transferNote,
        transferredByName: "You",
      });

      setShowTransfer(false);
      setSelectedProductId("");
      setFromWarehouse("");
      setToWarehouse("");
      setTransferQty("");
      setTransferNote("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transfer failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div>Loading warehouses...</div>;

  return (
    <div style={{ overflowY: "auto", height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Warehouses & Locations</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
            Manage where stock physically lives, and move it between locations.
          </p>
        </div>
<div style={{ display: "flex", gap: 8 }}>
          <Link href={`/org/${organization.id}/warehouses/report`} style={{ ...ghostButton, textDecoration: "none", display: "inline-block" }}>
            View Report
          </Link>
          <button style={ghostButton} onClick={() => setShowTransfer(true)}>
            Transfer Stock
          </button>
          <button style={buttonGold} onClick={() => setShowNewWarehouse(true)}>
            + Warehouse
          </button>
        </div>
      </div>

      <div className="card" style={{ ...cardStyle, marginBottom: 20 }}>
        <h3 style={{ marginBottom: 12 }}>Warehouses</h3>

        {warehouses.map((w) => (
          <div
            key={w.id}
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr auto",
              alignItems: "center",
              padding: "10px 8px",
              borderBottom: "1px solid var(--border)",
              gap: 10,
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>
                {w.name} {w.is_default && <span style={{ color: "var(--gold)", fontSize: 11 }}>(Default)</span>}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{w.address || "No address set"}</div>
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{w.code || "—"}</div>
            <div style={{ fontSize: 11, color: w.status === "active" ? "var(--green)" : "var(--text-muted)" }}>
              {w.status}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {!w.is_default && (
                <button style={ghostButton} onClick={() => handleSetDefault(w.id)}>
                  Make Default
                </button>
              )}
              {!w.is_default && (
                <button style={dangerBtn} onClick={() => handleDeleteWarehouse(w)}>
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={cardStyle}>
        <h3 style={{ marginBottom: 12 }}>Recent Transfers</h3>

        {transfers.map((t) => (
          <div
            key={t.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "10px 0",
              borderBottom: "1px solid var(--border)",
              fontSize: 13,
            }}
          >
            <span>
              {t.quantity} × {t.inventory_products?.name} · {t.transferred_by_name}
            </span>
            <span style={{ color: "var(--text-muted)", fontSize: 11 }}>
              {new Date(t.created_at).toLocaleDateString()}
            </span>
          </div>
        ))}

        {transfers.length === 0 && (
          <div style={{ color: "var(--text-muted)", fontSize: 13 }}>No transfers yet.</div>
        )}
      </div>

      {showNewWarehouse && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h2 style={{ marginBottom: 16 }}>New Warehouse</h2>
            <input placeholder="Name (e.g. Babadogo Branch)" value={whName} onChange={(e) => setWhName(e.target.value)} style={inputStyle} />
            <input placeholder="Code (e.g. BBD)" value={whCode} onChange={(e) => setWhCode(e.target.value)} style={inputStyle} />
            <input placeholder="Address (optional)" value={whAddress} onChange={(e) => setWhAddress(e.target.value)} style={inputStyle} />
            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              <button style={ghostButton} onClick={() => setShowNewWarehouse(false)}>Cancel</button>
              <button style={{ ...buttonGold, flex: 1 }} onClick={handleCreateWarehouse}>Create</button>
            </div>
          </div>
        </div>
      )}

      {showTransfer && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h2 style={{ marginBottom: 16 }}>Transfer Stock</h2>

            <label style={labelStyle}>Product</label>
            <select value={selectedProductId} onChange={(e) => handleProductSelect(e.target.value)} style={inputStyle}>
              <option value="">Select product...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.stock_quantity} total)</option>
              ))}
            </select>

            {stockLevels.length > 0 && (
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 10 }}>
                {stockLevels.map((s) => (
                  <div key={s.id}>{s.warehouses?.name}: {s.quantity} units</div>
                ))}
              </div>
            )}

            <label style={labelStyle}>From</label>
            <select value={fromWarehouse} onChange={(e) => setFromWarehouse(e.target.value)} style={inputStyle}>
              <option value="">Select source warehouse...</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>

            <label style={labelStyle}>To</label>
            <select value={toWarehouse} onChange={(e) => setToWarehouse(e.target.value)} style={inputStyle}>
              <option value="">Select destination warehouse...</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>

            <label style={labelStyle}>Quantity</label>
            <input type="number" value={transferQty} onChange={(e) => setTransferQty(e.target.value)} style={inputStyle} />

            <label style={labelStyle}>Note (optional)</label>
            <input value={transferNote} onChange={(e) => setTransferNote(e.target.value)} style={inputStyle} />

            {error && <div style={{ color: "#ef4444", fontSize: 12, marginBottom: 10 }}>{error}</div>}

            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              <button style={ghostButton} onClick={() => setShowTransfer(false)}>Cancel</button>
              <button style={{ ...buttonGold, flex: 1 }} onClick={handleTransfer} disabled={saving}>
                {saving ? "Transferring..." : "Transfer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 14,
  padding: 20,
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

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--text-muted)",
  display: "block",
  marginBottom: 4,
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

const dangerBtn: React.CSSProperties = {
  padding: "9px 18px",
  borderRadius: 10,
  border: "1px solid #ef4444",
  background: "transparent",
  color: "#ef4444",
  fontSize: 12,
  cursor: "pointer",
};

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.7)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 9999,
};

const modalStyle: React.CSSProperties = {
  width: 440,
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 16,
  padding: 24,
  maxHeight: "85vh",
  overflowY: "auto",
};