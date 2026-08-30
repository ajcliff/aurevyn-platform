"use client";

import { useEffect, useState } from "react";
import { logActivity } from "@/lib/activity";
import { updateStock } from "@/lib/inventory";
import { getWarehouses, type Warehouse } from "@/lib/warehouses";
import { formatError } from "@/lib/errorFormat";

type Props = {
  productId: string;
  productName: string;
  orgId: string;
  onUpdated: () => void;
};

export default function StockActions({
  productId,
  productName,
  orgId,
  onUpdated
}: Props) {
  const [qty, setQty] = useState("");
  const [loading, setLoading] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[] | null>(null);
  const [warehouseId, setWarehouseId] = useState("");

  useEffect(() => {
    getWarehouses(orgId).then((list) => {
      setWarehouses(list);
      const defaultWarehouse = list.find((w) => w.is_default) ?? list[0];
      if (defaultWarehouse) setWarehouseId(defaultWarehouse.id);
    });
  }, [orgId]);

  const [error, setError] = useState<string | null>(null);

  async function stockIn() {
    if (!qty || !warehouseId) return;

    try {
      setLoading(true);
      setError(null);

      await updateStock(
        productId,
        Number(qty),
        "stock_in",
        `Stock In - ${productName}`,
        warehouseId
      );

      await logActivity({
        icon: "📥",
        title: "Stock added",
        sub: `${qty} × ${productName}`,
        org_id: orgId,
      });

      setQty("");
      onUpdated();
    } catch (err: any) {
      setError(formatError(err));
    } finally {
      setLoading(false);
    }
  }

  async function stockOut() {
    if (!qty || !warehouseId) return;

    try {
      setLoading(true);
      setError(null);

      await updateStock(
        productId,
        Number(qty),
        "stock_out",
        `Stock Out - ${productName}`,
        warehouseId
      );

      await logActivity({
        icon: "📤",
        title: "Stock removed",
        sub: `${qty} × ${productName}`,
        org_id: orgId,
      });

      setQty("");
      onUpdated();
    } catch (err: any) {
      setError(formatError(err));
    } finally {
      setLoading(false);
    }
  }

  if (warehouses !== null && warehouses.length === 0) {
    return (
      <div
        style={{
          marginTop: "12px",
          padding: "10px",
          borderRadius: "8px",
          background: "var(--bg-elevated)",
          fontSize: "12px",
          color: "var(--text-muted)",
        }}
      >
        No warehouse exists yet. Create one under Warehouses before adjusting stock.
      </div>
    );
  }

  return (
    <div style={{ marginTop: "12px" }}>
      {warehouses !== null && warehouses.length > 1 && (
        <select
          value={warehouseId}
          onChange={(e) => setWarehouseId(e.target.value)}
          style={{
            width: "100%",
            marginBottom: "8px",
            padding: "8px",
            borderRadius: "8px",
            border: "1px solid var(--border)",
            background: "var(--bg-base)",
            color: "var(--text-primary)",
            fontSize: "12px",
          }}
        >
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
      )}

      <input
        type="number"
        placeholder="Qty"
        value={qty}
        onChange={(e) =>
          setQty(e.target.value)
        }
        style={{
          width: "100%",
          marginBottom: "8px"
        }}
      />

      {error && (
        <div style={{ fontSize: "11px", color: "#ef4444", marginBottom: "8px" }}>
          {error}
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: "8px"
        }}
      >
        <button
          disabled={loading || !warehouseId}
          onClick={stockIn}
          style={{
            flex: 1,
            background:
              "var(--green)",
            border: "none",
            padding: "8px",
            borderRadius: "8px",
            cursor: "pointer"
          }}
        >
          Stock In
        </button>

        <button
          disabled={loading || !warehouseId}
          onClick={stockOut}
          style={{
            flex: 1,
            background: "#ef4444",
            border: "none",
            padding: "8px",
            borderRadius: "8px",
            cursor: "pointer"
          }}
        >
          Stock Out
        </button>
      </div>
    </div>
  );
}
