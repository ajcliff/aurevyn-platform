"use client";

import { useEffect, useState } from "react";
import { useEngine } from "@/lib/runtime/EngineContext";
import { getProducts, type InventoryProduct } from "@/lib/inventory";
import {
  getPricelists,
  createPricelist,
  deletePricelist,
  getPricelistItems,
  setPricelistPrice,
  removePricelistPrice,
  type Pricelist,
  type PricelistItem,
} from "@/lib/pricelists";

export default function PricelistsPage() {
  const { organization } = useEngine();

  const [pricelists, setPricelists] = useState<Pricelist[]>([]);
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState<Pricelist | null>(null);
  const [items, setItems] = useState<PricelistItem[]>([]);
  const [search, setSearch] = useState("");

  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const [editValues, setEditValues] = useState<Record<string, string>>({});

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const [pl, p] = await Promise.all([getPricelists(organization.id), getProducts(organization.id)]);
    setPricelists(pl);
    setProducts(p);
    setLoading(false);
  }

  async function openPricelist(pl: Pricelist) {
    setSelected(pl);
    const data = await getPricelistItems(pl.id);
    setItems(data);
    const values: Record<string, string> = {};
    data.forEach((i) => {
      values[i.product_id] = String(i.price);
    });
    setEditValues(values);
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    await createPricelist({ orgId: organization.id, name: newName, description: newDescription });
    setNewName("");
    setNewDescription("");
    setShowNew(false);
    load();
  }

  async function handleDelete(pl: Pricelist) {
    if (!confirm(`Delete pricelist "${pl.name}"? This removes all its custom prices.`)) return;
    await deletePricelist(pl.id, pl.name, organization.id);
    setSelected(null);
    load();
  }

  async function handlePriceChange(productId: string, value: string) {
    setEditValues((prev) => ({ ...prev, [productId]: value }));
  }

  async function handlePriceSave(productId: string) {
    if (!selected) return;
    const value = editValues[productId];

    if (!value || value.trim() === "") {
      await removePricelistPrice(selected.id, productId);
    } else {
      await setPricelistPrice(organization.id, selected.id, productId, Number(value));
    }

    const data = await getPricelistItems(selected.id);
    setItems(data);
  }

  const filteredProducts = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  function itemPriceFor(productId: string): PricelistItem | undefined {
    return items.find((i) => i.product_id === productId);
  }

  if (loading) return <div>Loading pricelists...</div>;

  return (
    <div style={{ overflowY: "auto", height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Pricelists</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
            Set custom pricing for wholesale, branches, or specific customers — base prices stay untouched.
          </p>
        </div>
        <button style={buttonGold} onClick={() => setShowNew(true)}>+ Pricelist</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 2fr" : "1fr", gap: 20 }}>
        <div className="card" style={cardStyle}>
          <h3 style={{ marginBottom: 12 }}>Pricelists</h3>
          {pricelists.map((pl) => (
            <div
              key={pl.id}
              onClick={() => openPricelist(pl)}
              style={{
                padding: "10px 8px",
                borderRadius: 8,
                cursor: "pointer",
                background: selected?.id === pl.id ? "var(--bg-elevated)" : "transparent",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 13 }}>{pl.name}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{pl.description || "No description"}</div>
            </div>
          ))}
          {pricelists.length === 0 && (
            <div style={{ color: "var(--text-muted)", fontSize: 13, padding: 12 }}>
              No pricelists yet. Create one for Wholesale, VIP, or branch-specific pricing.
            </div>
          )}
        </div>

        {selected && (
          <div className="card" style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <h3>{selected.name}</h3>
                <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{selected.description}</p>
              </div>
              <button style={dangerBtn} onClick={() => handleDelete(selected)}>Delete Pricelist</button>
            </div>

            <input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ ...inputStyle, marginBottom: 12 }}
            />

            <div style={{ maxHeight: 400, overflowY: "auto" }}>
              {filteredProducts.map((p) => {
                const override = itemPriceFor(p.id!);
                return (
                  <div
                    key={p.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "2fr 1fr 1fr auto",
                      alignItems: "center",
                      padding: "8px 4px",
                      borderBottom: "1px solid var(--border)",
                      gap: 8,
                    }}
                  >
                    <span style={{ fontSize: 13 }}>{p.name}</span>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Base: KES {Number(p.unit_price).toLocaleString()}</span>
                    <input
                      type="number"
                      placeholder="Custom price (KES)"
                      value={editValues[p.id!] ?? ""}
                      onChange={(e) => handlePriceChange(p.id!, e.target.value)}
                      style={{ ...inputStyle, marginBottom: 0 }}
                    />
                    <button style={ghostButtonSmall} onClick={() => handlePriceSave(p.id!)}>
                      {override ? "Update" : "Set"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {showNew && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h2 style={{ marginBottom: 16 }}>New Pricelist</h2>
            <input placeholder="Name (e.g. Wholesale)" value={newName} onChange={(e) => setNewName(e.target.value)} style={inputStyle} />
            <input placeholder="Description (optional)" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} style={inputStyle} />
            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              <button style={ghostButton} onClick={() => setShowNew(false)}>Cancel</button>
              <button style={{ ...buttonGold, flex: 1 }} onClick={handleCreate}>Create</button>
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
  padding: "6px 12px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--text-secondary)",
  fontSize: 11,
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
  width: 480,
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 16,
  padding: 24,
};