"use client";

import { useState } from "react";
import { createProduct } from "@/lib/inventory";
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
  const [stock, setStock] = useState("");
  const [threshold, setThreshold] = useState("10");
  const [saving, setSaving] = useState(false);
const [criticalThreshold, setCriticalThreshold] = useState("");

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
      });

      setName("");
      setSku("");
      setCategory("");
      setUnit("pcs");
      setPrice("");
      setStock("");
      setThreshold("10");

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