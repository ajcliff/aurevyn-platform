"use client";

import { useState, useEffect } from "react";
import { createProduct } from "@/lib/inventory";
import { getSuppliers, type Supplier } from "@/lib/suppliers";
import { useEngine } from "@/lib/runtime/EngineContext";
import s from "@/styles/layout.module.css";
import { logActivity } from "@/lib/activity";

export default function AddProductModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { organization } = useEngine();

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [category, setCategory] = useState("");
  const [unit, setUnit] = useState("pcs");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [stock, setStock] = useState("");
  const [threshold, setThreshold] = useState("10");
  const [saving, setSaving] = useState(false);
const [criticalThreshold, setCriticalThreshold] = useState("");
  const [barcode, setBarcode] = useState("");
  const [reorderQuantity, setReorderQuantity] = useState("");
  const [defaultSupplierId, setDefaultSupplierId] = useState("");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  useEffect(() => {
    if (open) getSuppliers(organization.id).then(setSuppliers);
  }, [open, organization.id]);

  if (!open) return null;

  async function save() {
    if (!name || !sku) {
      alert("Name and SKU are required");
      return;
    }

    try {
      setSaving(true);
     await createProduct({
        org_id: organization.id,
        name,
        sku,
        category: category || undefined,
        unit: unit || undefined,
        stock_quantity: Number(stock) || 0,
        low_stock_threshold: Number(threshold) || 0,
        critical_stock_threshold: criticalThreshold ? Number(criticalThreshold) : null,
                unit_price: Number(price) || 0,
        avg_cost: Number(cost) || 0,
        barcode: barcode.trim() || null,
        reorder_quantity: reorderQuantity ? Number(reorderQuantity) : null,
        default_supplier_id: defaultSupplierId || null,
      });

      setName("");
      setSku("");
      setCategory("");
      setUnit("pcs");
      setPrice("");
      setCost("");
      setStock("");
      setThreshold("10");
      setBarcode("");
      setReorderQuantity("");
      setDefaultSupplierId("");

await logActivity({
        icon: "📦",
        title: "Product added",
        sub: name,
        org_id: organization.id,
      });

      onCreated();
      onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to add product");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.7)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
      }}
    >
      <div
        style={{
          width: "480px",
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          padding: "24px",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <h2 style={{ marginBottom: "16px" }}>Add Product</h2>

        <input
          className={s.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Product name"
          style={{ width: "100%", marginBottom: "10px" }}
        />

        <input
          className={s.input}
          value={sku}
          onChange={(e) => setSku(e.target.value)}
          placeholder="SKU"
          style={{ width: "100%", marginBottom: "10px" }}
        />

        <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
          <input
            className={s.input}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Category (optional)"
            style={{ flex: 1 }}
          />

          <input
            className={s.input}
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="Unit (pcs, kg, box...)"
            style={{ width: "140px" }}
          />
        </div>

        <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
          <input
            className={s.input}
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Unit price (KES)"
            style={{ flex: 1 }}
          />

          <input
            className={s.input}
            type="number"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            placeholder="Cost price (KES, optional)"
            style={{ flex: 1 }}
          />

          <input
            className={s.input}
            type="number"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            placeholder="Opening stock"
            style={{ flex: 1 }}
          />
        </div>

<input
          className={s.input}
          type="number"
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
          placeholder="Low stock threshold (warning)"
          style={{ width: "100%", marginBottom: "10px" }}
        />

        <input
          className={s.input}
          type="number"
          value={criticalThreshold}
          onChange={(e) => setCriticalThreshold(e.target.value)}
          placeholder="Critical threshold (auto-creates restock request)"
          style={{ width: "100%", marginBottom: "16px" }}
        />

        <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
          <input
            className={s.input}
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder="Barcode (optional)"
            style={{ flex: 1 }}
          />

          <input
            className={s.input}
            type="number"
            value={reorderQuantity}
            onChange={(e) => setReorderQuantity(e.target.value)}
            placeholder="Reorder quantity"
            style={{ flex: 1 }}
          />
        </div>

        <select
          className={s.input}
          value={defaultSupplierId}
          onChange={(e) => setDefaultSupplierId(e.target.value)}
          style={{ width: "100%", marginBottom: "16px" }}
        >
          <option value="">No default supplier</option>
          {suppliers.map((sup) => (
            <option key={sup.id} value={sup.id}>{sup.name}</option>
          ))}
        </select>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            className={s.btnGhost}
            onClick={onClose}
            style={{ flex: 1 }}
          >
            Cancel
          </button>

          <button
            className={s.btnGold}
            onClick={save}
            disabled={saving}
            style={{ flex: 1 }}
          >
            {saving ? "Saving..." : "Save Product"}
          </button>
        </div>
      </div>
    </div>
  );
}