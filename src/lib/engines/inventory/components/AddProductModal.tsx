"use client";

import { useState, useEffect } from "react";
import { createProduct } from "@/lib/inventory";
import { getSuppliers, type Supplier } from "@/lib/suppliers";
import { useEngine } from "@/lib/runtime/EngineContext";
import s from "@/styles/layout.module.css";
import { logActivity } from "@/lib/activity";

const UNITS = [
  { value: "pcs", label: "Pieces (pcs)" },
  { value: "kg", label: "Kilograms (kg)" },
  { value: "g", label: "Grams (g)" },
  { value: "l", label: "Litres (l)" },
  { value: "ml", label: "Millilitres (ml)" },
  { value: "box", label: "Boxes" },
  { value: "carton", label: "Cartons" },
  { value: "packet", label: "Packets" },
  { value: "dozen", label: "Dozens" },
  { value: "bottle", label: "Bottles" },
  { value: "m", label: "Metres (m)" },
];

const NEW_CATEGORY = "__new__";

function makeSku(name: string): string {
  const letters = name.replace(/[^a-zA-Z0-9 ]/g, "").trim().split(/\s+/).filter(Boolean);
  const prefix = (letters.length > 1 ? letters.map((w) => w[0]).join("") : (letters[0] ?? "ITM").slice(0, 3)).toUpperCase();
  return `${prefix}-${String(Date.now()).slice(-5)}`;
}

function Field({ label, hint, children, flex }: { label: string; hint?: string; children: React.ReactNode; flex?: number }) {
  return (
    <label style={{ display: "block", flex: flex ?? 1, minWidth: 0 }}>
      <span style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "var(--text-primary)" }}>{label}</span>
      {children}
      {hint && <span style={{ display: "block", fontSize: 11, marginTop: 3, color: "var(--text-muted)" }}>{hint}</span>}
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>
    </div>
  );
}

export default function AddProductModal({
  open,
  onClose,
  onCreated,
  categories = [],
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  categories?: string[];
}) {
  const { organization } = useEngine();

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [categoryChoice, setCategoryChoice] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [unit, setUnit] = useState("pcs");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [stock, setStock] = useState("");
  const [threshold, setThreshold] = useState("");
  const [criticalThreshold, setCriticalThreshold] = useState("");
  const [reorderQuantity, setReorderQuantity] = useState("");
  const [defaultSupplierId, setDefaultSupplierId] = useState("");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) getSuppliers(organization.id).then(setSuppliers);
  }, [open, organization.id]);

  if (!open) return null;

  const priceN = Number(price) || 0;
  const costN = Number(cost) || 0;
  const profit = priceN - costN;
  const marginPct = priceN > 0 && costN > 0 ? (profit / priceN) * 100 : null;
  const category = categoryChoice === NEW_CATEGORY ? newCategory.trim() : categoryChoice;
  const stockValue = (Number(stock) || 0) * costN;

  function reset() {
    setName(""); setSku(""); setBarcode(""); setCategoryChoice(""); setNewCategory("");
    setUnit("pcs"); setPrice(""); setCost(""); setStock(""); setThreshold("");
    setCriticalThreshold(""); setReorderQuantity(""); setDefaultSupplierId(""); setError("");
  }

  async function save() {
    setError("");
    if (!name.trim()) return setError("Give the product a name customers and staff will recognise.");
    if (!(priceN > 0)) return setError("Enter the selling price. It's what the till charges.");
    if (cost && costN > priceN && !confirm("Cost is higher than the selling price, so you'd sell at a loss. Save anyway?")) return;

    const low = threshold ? Number(threshold) : 0;
    const crit = criticalThreshold ? Number(criticalThreshold) : null;
    if (crit !== null && low > 0 && crit > low) return setError("The critical level must be lower than the low-stock level.");

    try {
      setSaving(true);
      await createProduct({
        org_id: organization.id,
        name: name.trim(),
        sku: sku.trim() || makeSku(name),
        category: category || undefined,
        unit: unit || "pcs",
        stock_quantity: Number(stock) || 0,
        low_stock_threshold: low,
        critical_stock_threshold: crit,
        unit_price: priceN,
        avg_cost: cost ? costN : null,
        barcode: barcode.trim() || null,
        reorder_quantity: reorderQuantity ? Number(reorderQuantity) : null,
        default_supplier_id: defaultSupplierId || null,
      });

      await logActivity({ icon: "📦", title: "Product added", sub: name.trim(), org_id: organization.id });
      reset();
      onCreated();
      onClose();
    } catch (err) {
      console.error(err);
      const msg = (err as { message?: string })?.message ?? "";
      setError(/duplicate|unique/i.test(msg) ? "That SKU or barcode is already used by another product." : "Could not save the product. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const input = { width: "100%" } as const;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999 }}>
      <div style={{ width: 540, maxWidth: "94vw", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 24, maxHeight: "92vh", overflowY: "auto" }}>
        <h2 style={{ marginBottom: 4 }}>Add product</h2>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 18 }}>
          Only the name and selling price are required. The rest keeps your stock and profit reports accurate.
        </p>

        <Section title="What is it?">
          <Field label="Product name *" hint="As customers say it, e.g. “Unga Jogoo 2kg”">
            <input className={s.input} style={input} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </Field>
          <div style={{ display: "flex", gap: 10 }}>
            <Field label="Category" hint="Groups products into drawers in Stock and POS">
              <select className={s.input} style={input} value={categoryChoice} onChange={(e) => setCategoryChoice(e.target.value)}>
                <option value="">No category</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                <option value={NEW_CATEGORY}>+ New category…</option>
              </select>
              {categoryChoice === NEW_CATEGORY && (
                <input className={s.input} style={{ ...input, marginTop: 6 }} value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="e.g. Beverages" />
              )}
            </Field>
            <Field label="Sold by" hint="How you count or weigh it" flex={0.7}>
              <select className={s.input} style={input} value={unit} onChange={(e) => setUnit(e.target.value)}>
                {UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </Field>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Field label="SKU" hint="Leave blank and we'll generate one">
              <input className={s.input} style={input} value={sku} onChange={(e) => setSku(e.target.value)} />
            </Field>
            <Field label="Barcode" hint="Scan it here with your scanner">
              <input className={s.input} style={input} value={barcode} onChange={(e) => setBarcode(e.target.value)} />
            </Field>
          </div>
        </Section>

        <Section title="Pricing">
          <div style={{ display: "flex", gap: 10 }}>
            <Field label="Selling price (KES) *" hint="What the customer pays per unit">
              <input className={s.input} style={input} type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} />
            </Field>
            <Field label="Buying cost (KES)" hint="What you pay your supplier per unit">
              <input className={s.input} style={input} type="number" min="0" value={cost} onChange={(e) => setCost(e.target.value)} />
            </Field>
          </div>
          {marginPct !== null && (
            <div style={{ fontSize: 12, padding: "8px 10px", borderRadius: 8, background: "var(--bg-hover, rgba(255,255,255,.04))", color: profit >= 0 ? "var(--text-primary)" : "var(--danger, #e5484d)" }}>
              Profit per unit: <b>KES {profit.toLocaleString()}</b> · Margin: <b>{marginPct.toFixed(1)}%</b>
            </div>
          )}
        </Section>

        <Section title="Stock">
          <Field label="Quantity on hand now" hint={stockValue > 0 ? `Worth about KES ${stockValue.toLocaleString()} at cost` : "What is on the shelf today. You can adjust it later."}>
            <input className={s.input} style={input} type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} />
          </Field>
          <div style={{ display: "flex", gap: 10 }}>
            <Field label="Warn me when stock falls to" hint="Shows on the low-stock list">
              <input className={s.input} style={input} type="number" min="0" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
            </Field>
            <Field label="Urgent when it falls to" hint="Raises a restock request for approval">
              <input className={s.input} style={input} type="number" min="0" value={criticalThreshold} onChange={(e) => setCriticalThreshold(e.target.value)} />
            </Field>
          </div>
        </Section>

        <Section title="Restocking">
          <div style={{ display: "flex", gap: 10 }}>
            <Field label="Usual supplier" hint="Used when a restock order is drafted">
              <select className={s.input} style={input} value={defaultSupplierId} onChange={(e) => setDefaultSupplierId(e.target.value)}>
                <option value="">None yet</option>
                {suppliers.map((sup) => <option key={sup.id} value={sup.id}>{sup.name}</option>)}
              </select>
            </Field>
            <Field label="Usual order quantity" hint="How many you buy each time">
              <input className={s.input} style={input} type="number" min="0" value={reorderQuantity} onChange={(e) => setReorderQuantity(e.target.value)} />
            </Field>
          </div>
        </Section>

        {error && <div style={{ color: "var(--danger, #e5484d)", fontSize: 13, marginBottom: 12 }}>{error}</div>}

        <div style={{ display: "flex", gap: 10 }}>
          <button className={s.btnGhost} onClick={() => { reset(); onClose(); }} style={{ flex: 1 }}>Cancel</button>
          <button className={s.btnGold} onClick={save} disabled={saving} style={{ flex: 1 }}>
            {saving ? "Saving..." : "Save product"}
          </button>
        </div>
      </div>
    </div>
  );
}
