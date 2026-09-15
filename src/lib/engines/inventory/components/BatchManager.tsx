"use client";

import { useEffect, useState } from "react";
import { getBatchesForProduct, createBatch, deleteBatch, type InventoryBatch } from "@/lib/inventoryBatches";

type Props = {
  productId: string;
  orgId: string;
};

export default function BatchManager({ productId, orgId }: Props) {
  const [batches, setBatches] = useState<InventoryBatch[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [batchNumber, setBatchNumber] = useState("");
  const [quantity, setQuantity] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, [productId]);

  async function load() {
    setBatches(await getBatchesForProduct(productId));
  }

  async function handleAdd() {
    if (!quantity) return;
    setSaving(true);
    await createBatch({
      org_id: orgId,
      product_id: productId,
      batch_number: batchNumber || null,
      quantity: Number(quantity),
      expiry_date: expiryDate || null,
    });
    setBatchNumber("");
    setQuantity("");
    setExpiryDate("");
    setShowAdd(false);
    setSaving(false);
    await load();
  }

  async function handleDelete(id: string) {
    await deleteBatch(id);
    await load();
  }

  function daysUntil(dateStr: string) {
    const diff = new Date(dateStr).getTime() - Date.now();
    return Math.ceil(diff / (24 * 60 * 60 * 1000));
  }

  return (
    <div style={{ marginTop: 6, marginBottom: 6, fontSize: 11 }}>
      {batches.map((b) => {
        const daysLeft = b.expiry_date ? daysUntil(b.expiry_date) : null;
        const expiringSoon = daysLeft !== null && daysLeft <= 30;
        return (
          <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 0" }}>
            <span style={{ color: "var(--text-muted)" }}>
              {b.batch_number || "Unlabeled"} — {b.quantity} units
              {b.expiry_date && (
                <span style={{ color: expiringSoon ? "#ef4444" : "var(--text-muted)", marginLeft: 6 }}>
                  · exp {new Date(b.expiry_date).toLocaleDateString("en-KE")}
                  {daysLeft !== null && daysLeft <= 30 && ` (${daysLeft <= 0 ? "expired" : `${daysLeft}d left`})`}
                </span>
              )}
            </span>
            <span style={{ color: "#ef4444", cursor: "pointer" }} onClick={() => handleDelete(b.id!)}>✕</span>
          </div>
        );
      })}
      {batches.length === 0 && !showAdd && <div style={{ color: "var(--text-muted)" }}>No batches tracked.</div>}

      {showAdd ? (
        <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
          <input
            value={batchNumber}
            onChange={(e) => setBatchNumber(e.target.value)}
            placeholder="Batch #"
            style={{ ...miniInput, width: 70 }}
          />
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Qty"
            style={{ ...miniInput, width: 50 }}
          />
          <input
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            style={{ ...miniInput, width: 110 }}
          />
          <span style={{ color: "var(--gold)", cursor: "pointer" }} onClick={handleAdd}>{saving ? "..." : "Add"}</span>
          <span style={{ color: "var(--text-muted)", cursor: "pointer" }} onClick={() => setShowAdd(false)}>Cancel</span>
        </div>
      ) : (
        <div style={{ color: "var(--gold)", cursor: "pointer", marginTop: 4 }} onClick={() => setShowAdd(true)}>
          + add batch
        </div>
      )}
    </div>
  );
}

const miniInput: React.CSSProperties = {
  padding: "3px 6px",
  borderRadius: 4,
  border: "1px solid var(--border)",
  background: "var(--bg-base)",
  color: "var(--text-primary)",
  fontSize: 10,
};
