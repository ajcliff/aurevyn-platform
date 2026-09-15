"use client";

import { useEffect, useState } from "react";
import { useEngine } from "@/lib/runtime/EngineContext";
import { getWarehouses, type Warehouse } from "@/lib/warehouses";
import {
  startStockTake,
  getStockTakes,
  getStockTakeItems,
  recordCount,
  completeStockTake,
  cancelStockTake,
  type StockTake,
  type StockTakeItem,
} from "@/lib/stockTakes";
import EmptyState from "@/components/EmptyState";

export default function StockTakesPage() {
  const { organization, membership } = useEngine();

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [takes, setTakes] = useState<StockTake[]>([]);
  const [loading, setLoading] = useState(true);

  const [showStart, setShowStart] = useState(false);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [starting, setStarting] = useState(false);

  const [activeTake, setActiveTake] = useState<StockTake | null>(null);
  const [items, setItems] = useState<StockTakeItem[]>([]);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const [w, t] = await Promise.all([getWarehouses(organization.id), getStockTakes(organization.id)]);
    setWarehouses(w);
    setTakes(t);
    setLoading(false);
  }

  async function handleStart() {
    if (!selectedWarehouseId) return;
    setStarting(true);
    const take = await startStockTake(organization.id, selectedWarehouseId, membership.userEmail || "Unknown");
    setStarting(false);
    setShowStart(false);
    setSelectedWarehouseId("");
    if (take) {
      await load();
      await openTake(take);
    }
  }

  async function openTake(take: StockTake) {
    setActiveTake(take);
    const takeItems = await getStockTakeItems(take.id!);
    setItems(takeItems);
    const initialCounts: Record<string, string> = {};
    takeItems.forEach((i) => {
      if (i.counted_quantity !== null && i.counted_quantity !== undefined) {
        initialCounts[i.id!] = String(i.counted_quantity);
      }
    });
    setCounts(initialCounts);
  }

  async function handleRecordCount(itemId: string) {
    const value = counts[itemId];
    if (value === undefined || value === "") return;
    await recordCount(itemId, Number(value));
  }

  async function handleComplete() {
    if (!activeTake) return;
    if (!confirm("Complete this stock take? Any counted item with a different quantity than expected will have its stock adjusted to match.")) return;

    setCompleting(true);
    // Save any uncommitted count fields first
    for (const item of items) {
      const value = counts[item.id!];
      if (value !== undefined && value !== "" && Number(value) !== item.counted_quantity) {
        await recordCount(item.id!, Number(value));
      }
    }
    const result = await completeStockTake(activeTake.id!, organization.id, activeTake.warehouse_id);
    setCompleting(false);
    alert(`Stock take completed. ${result.adjusted} item${result.adjusted === 1 ? "" : "s"} adjusted.`);
    setActiveTake(null);
    await load();
  }

  async function handleCancel() {
    if (!activeTake) return;
    if (!confirm("Cancel this stock take? No stock adjustments will be made.")) return;
    await cancelStockTake(activeTake.id!);
    setActiveTake(null);
    await load();
  }

  if (loading) return <div style={{ padding: 20, color: "var(--text-muted)" }}>Loading...</div>;

  if (activeTake) {
    const warehouseName = warehouses.find((w) => w.id === activeTake.warehouse_id)?.name || "Warehouse";
    return (
      <div style={{ padding: "20px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700 }}>Stock Take — {warehouseName}</h1>
            <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Enter what's actually on the shelf for each item. Leave blank to skip.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={ghostButton} onClick={handleCancel}>Cancel Take</button>
            <button style={primaryButton} onClick={handleComplete} disabled={completing}>
              {completing ? "Completing..." : "Complete & Adjust Stock"}
            </button>
          </div>
        </div>

        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ ...rowStyle, gridTemplateColumns: "2fr 1fr 1fr 1fr", background: "var(--bg-elevated)", fontWeight: 600, fontSize: 11, color: "var(--text-muted)" }}>
            <span>PRODUCT</span>
            <span>EXPECTED</span>
            <span>COUNTED</span>
            <span>VARIANCE</span>
          </div>
          {items.map((item) => {
            const countedVal = counts[item.id!];
            const variance = countedVal !== undefined && countedVal !== "" ? Number(countedVal) - item.expected_quantity : null;
            return (
              <div key={item.id} style={{ ...rowStyle, gridTemplateColumns: "2fr 1fr 1fr 1fr" }}>
                <span>{item.product_name} <span style={{ color: "var(--text-muted)", fontSize: 11 }}>({item.sku})</span></span>
                <span>{item.expected_quantity}</span>
                <input
                  type="number"
                  value={countedVal ?? ""}
                  onChange={(e) => setCounts((prev) => ({ ...prev, [item.id!]: e.target.value }))}
                  onBlur={() => handleRecordCount(item.id!)}
                  style={inputStyle}
                  placeholder="Count"
                />
                <span style={{ color: variance === null ? "var(--text-muted)" : variance === 0 ? "#3dd68c" : variance > 0 ? "#3dd68c" : "#ef4444", fontWeight: 600 }}>
                  {variance === null ? "—" : variance > 0 ? `+${variance}` : variance}
                </span>
              </div>
            );
          })}
          {items.length === 0 && <EmptyState icon="📋" message="No stock levels found for this warehouse." />}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>Stock Takes</h1>
          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Physically count stock and reconcile against the system.</p>
        </div>
        <button style={primaryButton} onClick={() => setShowStart(true)}>+ Start Stock Take</button>
      </div>

      {showStart && (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: 16, marginBottom: 16, display: "flex", gap: 10, alignItems: "center" }}>
          <select value={selectedWarehouseId} onChange={(e) => setSelectedWarehouseId(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
            <option value="">Select a warehouse/branch...</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
          <button style={ghostButton} onClick={() => setShowStart(false)}>Cancel</button>
          <button style={primaryButton} onClick={handleStart} disabled={!selectedWarehouseId || starting}>
            {starting ? "Starting..." : "Start"}
          </button>
        </div>
      )}

      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ ...rowStyle, gridTemplateColumns: "1fr 1fr 1fr 1fr", background: "var(--bg-elevated)", fontWeight: 600, fontSize: 11, color: "var(--text-muted)" }}>
          <span>WAREHOUSE</span>
          <span>STATUS</span>
          <span>STARTED</span>
          <span>STARTED BY</span>
        </div>
        {takes.map((take: any) => (
          <div
            key={take.id}
            onClick={() => take.status === "in_progress" && openTake(take)}
            style={{ ...rowStyle, gridTemplateColumns: "1fr 1fr 1fr 1fr", cursor: take.status === "in_progress" ? "pointer" : "default" }}
          >
            <span>{take.warehouses?.name || "—"}</span>
            <span style={{ color: take.status === "completed" ? "#3dd68c" : take.status === "cancelled" ? "var(--text-muted)" : "#f5b800", fontWeight: 600 }}>
              {take.status.replace("_", " ")}
            </span>
            <span>{new Date(take.started_at).toLocaleDateString()}</span>
            <span>{take.started_by || "—"}</span>
          </div>
        ))}
        {takes.length === 0 && <EmptyState icon="📋" message="No stock takes yet." />}
      </div>
    </div>
  );
}

const rowStyle: React.CSSProperties = {
  display: "grid",
  padding: "12px 16px",
  borderBottom: "1px solid var(--border)",
  fontSize: 13,
  alignItems: "center",
  gap: 8,
};

const inputStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--bg-base)",
  color: "var(--text-primary)",
  fontSize: 13,
};

const primaryButton: React.CSSProperties = {
  padding: "9px 16px",
  borderRadius: 8,
  border: "none",
  background: "var(--gold)",
  color: "#000",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};

const ghostButton: React.CSSProperties = {
  padding: "9px 16px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--text-secondary)",
  fontSize: 12,
  cursor: "pointer",
};
