"use client";

import { useEffect, useState } from "react";
import { updateProduct, archiveProduct, type InventoryProduct } from "@/lib/inventory";
import s from "@/styles/layout.module.css";
import { useEngine } from "@/lib/runtime/EngineContext";
import { logActivity } from "@/lib/activity";


export default function EditProductModal({
  product,
  onClose,
  onUpdated,
}: {
  product: InventoryProduct | null;
  onClose: () => void;
  onUpdated: () => void;
}) {
const { organization } = useEngine();

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [unit, setUnit] = useState("");
  const [price, setPrice] = useState("");
  const [threshold, setThreshold] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (product) {
      setName(product.name);
      setCategory(product.category || "");
      setUnit(product.unit || "");
      setPrice(String(product.unit_price));
      setThreshold(String(product.low_stock_threshold));
    }
  }, [product]);

  if (!product) return null;

  async function save() {
    try {
      setSaving(true);
    await updateProduct(product!.id!, {
        name,
        category: category || undefined,
        unit: unit || undefined,
        unit_price: Number(price) || 0,
        low_stock_threshold: Number(threshold) || 0,
      });
      await logActivity({
        icon: "✏️",
        title: "Product updated",
        sub: name,
        org_id: organization.id,
      });
      onUpdated();
      onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to update product");
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive() {
    if (!confirm(`Archive "${product!.name}"? It will be hidden from your active inventory.`)) return;

    try {
      setSaving(true);
    await archiveProduct(product!.id!);
      await logActivity({
        icon: "🗑️",
        title: "Product archived",
        sub: product!.name,
        org_id: organization.id,
      });
      onUpdated();
      onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to archive product");
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
        <h2 style={{ marginBottom: "16px" }}>Edit Product</h2>

        <input
          className={s.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Product name"
          style={{ width: "100%", marginBottom: "10px" }}
        />

        <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
          <input
            className={s.input}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Category"
            style={{ flex: 1 }}
          />

          <input
            className={s.input}
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="Unit"
            style={{ width: "140px" }}
          />
        </div>

        <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
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
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            placeholder="Low stock threshold"
            style={{ flex: 1 }}
          />
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            className={s.btnGhost}
            onClick={handleArchive}
            disabled={saving}
            style={{ color: "#ef4444" }}
          >
            Archive
          </button>

          <div style={{ flex: 1 }} />

          <button className={s.btnGhost} onClick={onClose}>
            Cancel
          </button>

          <button className={s.btnGold} onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}