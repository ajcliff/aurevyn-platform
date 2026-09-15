"use client";

import { useEffect, useState } from "react";
import { getEnginePricing, confirmEngineSelection, type PricedEngine } from "@/lib/trial";

type Props = {
  orgId: string;
  orgName: string;
  onConfirmed: () => void;
};

export default function PackageSelectionGate({ orgId, orgName, onConfirmed }: Props) {
  const [engines, setEngines] = useState<PricedEngine[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEnginePricing().then((data) => {
      setEngines(data);
      setLoading(false);
    });
  }, []);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const total = engines
    .filter((e) => selected.has(e.id))
    .reduce((sum, e) => sum + Number(e.monthly_price), 0);

  async function handleConfirm() {
    setConfirming(true);
    const ok = await confirmEngineSelection(orgId, orgName, Array.from(selected));
    setConfirming(false);
    if (ok) {
      onConfirmed();
    } else {
      alert("Something went wrong confirming your plan. Please try again.");
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 20000,
        background: "rgba(10,10,10,0.92)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        overflowY: "auto",
      }}
    >
      <div style={{ maxWidth: 640, width: "100%", padding: "40px 0" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#fff", marginBottom: 8 }}>
            Your free trial has ended
          </h1>
          <p style={{ fontSize: 14, color: "#9ca3af" }}>
            You had every engine for 30 days — now pick exactly what you actually use. You only pay for what you check below.
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", color: "#9ca3af" }}>Loading engines...</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            {engines.map((engine) => {
              const isChecked = selected.has(engine.id);
              return (
                <button
                  key={engine.id}
                  onClick={() => toggle(engine.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    textAlign: "left",
                    padding: "12px 16px",
                    borderRadius: 10,
                    border: isChecked ? "2px solid #f5b800" : "1px solid #333",
                    background: isChecked ? "#f5b80014" : "#161616",
                    cursor: "pointer",
                    color: "#fff",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 5,
                        border: isChecked ? "none" : "1px solid #555",
                        background: isChecked ? "#f5b800" : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        color: "#000",
                        flexShrink: 0,
                      }}
                    >
                      {isChecked && "✓"}
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{engine.name}</span>
                  </div>
                  <span style={{ fontSize: 13, color: "#9ca3af" }}>
                    KES {Number(engine.monthly_price).toLocaleString()}/mo
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "14px 18px",
            borderRadius: 10,
            background: "#161616",
            border: "1px solid #333",
            marginBottom: 16,
          }}
        >
          <span style={{ fontSize: 13, color: "#9ca3af" }}>
            {selected.size} engine{selected.size === 1 ? "" : "s"} selected
          </span>
          <span style={{ fontSize: 18, fontWeight: 700, color: "#f5b800" }}>
            KES {total.toLocaleString()}/mo
          </span>
        </div>

        <button
          onClick={handleConfirm}
          disabled={selected.size === 0 || confirming}
          style={{
            width: "100%",
            padding: "14px 0",
            borderRadius: 10,
            border: "none",
            background: selected.size > 0 ? "#f5b800" : "#333",
            color: selected.size > 0 ? "#000" : "#666",
            fontWeight: 700,
            fontSize: 14,
            cursor: selected.size > 0 ? "pointer" : "not-allowed",
          }}
        >
          {confirming ? "Setting up your plan..." : "Confirm plan"}
        </button>

        <p style={{ textAlign: "center", fontSize: 12, color: "#6b7280", marginTop: 14 }}>
          We'll send an invoice to your account — no card needed right now. You can adjust your engines later.
        </p>
      </div>
    </div>
  );
}
