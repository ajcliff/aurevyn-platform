"use client";

import { useEffect, useState } from "react";
import { useEngine } from "@/lib/runtime/EngineContext";
import { getStockValueByWarehouse } from "@/lib/warehouses";
import { exportToCSV } from "@/lib/csvExport";

type ReportRow = {
  warehouseName: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  value: number;
  lowStockThreshold: number;
  isLow: boolean;
};

export default function InventoryReportPage() {
  const { organization } = useEngine();
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [warehouseFilter, setWarehouseFilter] = useState<string>("all");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const data = await getStockValueByWarehouse(organization.id);

    const mapped: ReportRow[] = data.map((d: any) => ({
      warehouseName: d.warehouses?.name || "Unknown",
      productName: d.inventory_products?.name || "Unknown",
      quantity: Number(d.quantity),
      unitPrice: Number(d.inventory_products?.unit_price || 0),
      value: Number(d.quantity) * Number(d.inventory_products?.unit_price || 0),
      lowStockThreshold: Number(d.inventory_products?.low_stock_threshold || 0),
      isLow: Number(d.quantity) <= Number(d.inventory_products?.low_stock_threshold || 0),
    }));

    setRows(mapped);
    setLoading(false);
  }

  const warehouseNames = Array.from(new Set(rows.map((r) => r.warehouseName)));
  const filtered = warehouseFilter === "all" ? rows : rows.filter((r) => r.warehouseName === warehouseFilter);
  const totalValue = filtered.reduce((sum, r) => sum + r.value, 0);

  function handleExport() {
    exportToCSV(
      `inventory-report-${organization.id}-${new Date().toISOString().slice(0, 10)}.csv`,
      filtered.map((r) => ({
        Warehouse: r.warehouseName,
        Product: r.productName,
        Quantity: r.quantity,
        "Unit Price (KES)": r.unitPrice,
        "Value (KES)": r.value.toFixed(2),
        "Low Stock?": r.isLow ? "Yes" : "No",
      }))
    );
  }

  if (loading) return <div>Loading report...</div>;

  return (
    <div style={{ overflowY: "auto", height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Inventory Report</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Stock value and levels by warehouse.</p>
        </div>
        <button style={buttonGold} onClick={handleExport}>Export CSV</button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
        <select value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)} style={selectStyle}>
          <option value="all">All warehouses</option>
          {warehouseNames.map((w) => (
            <option key={w} value={w}>{w}</option>
          ))}
        </select>
        <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
          Total value: <strong style={{ color: "var(--gold)" }}>KES {totalValue.toLocaleString()}</strong>
        </div>
      </div>

      <div className="card" style={cardStyle}>
        {filtered.map((r, i) => (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1fr",
              padding: "10px 8px",
              borderBottom: "1px solid var(--border)",
              fontSize: 13,
              alignItems: "center",
            }}
          >
            <span>{r.productName}</span>
            <span style={{ color: "var(--text-muted)" }}>{r.warehouseName}</span>
            <span style={{ color: r.isLow ? "#ef4444" : "var(--text-primary)" }}>{r.quantity} units</span>
            <span>KES {r.unitPrice.toLocaleString()}</span>
            <span style={{ fontWeight: 600 }}>KES {r.value.toLocaleString()}</span>
          </div>
        ))}

        {filtered.length === 0 && (
          <div style={{ color: "var(--text-muted)", fontSize: 13, padding: 12 }}>No stock data yet.</div>
        )}
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 14,
  padding: 8,
};

const selectStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--bg-base)",
  color: "var(--text-primary)",
  fontSize: 12,
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