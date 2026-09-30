"use client";

import { useEffect, useState } from "react";
import { getEnginePricing, confirmEngineSelection, type PricedEngine } from "@/lib/trial";

type Props = {
  orgId: string;
  orgName: string;
  onConfirmed: () => void;
};

const seatLabel = (n: number) => (n >= 999999 ? "Unlimited" : `${n} seats`);

// Shown once the trial (and its grace period) is over. Per engine: tick it,
// then pick how many seats — one user, one seat. The total is just the sum
// of each chosen engine's seat tier, so nobody pays for an engine or a seat
// they don't use.
export default function PackageSelectionGate({ orgId, orgName, onConfirmed }: Props) {
  const [engines, setEngines] = useState<PricedEngine[]>([]);
  // engineId -> chosen seat count (absent = engine not selected)
  const [picked, setPicked] = useState<Record<string, number>>({});
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getEnginePricing(orgId).then((data) => {
      setEngines(data);
      setLoading(false);
    });
  }, [orgId]);

  function defaultSeats(engine: PricedEngine): number {
    // Smallest tier that already covers everyone holding a seat today
    const fit = engine.tiers.find((t) => t.seats >= Math.max(engine.seatsInUse, 1));
    return (fit ?? engine.tiers[engine.tiers.length - 1]).seats;
  }

  function toggle(engine: PricedEngine) {
    setPicked((prev) => {
      const next = { ...prev };
      if (engine.id in next) delete next[engine.id];
      else next[engine.id] = defaultSeats(engine);
      return next;
    });
  }

  function setSeats(engineId: string, seats: number) {
    setPicked((prev) => ({ ...prev, [engineId]: seats }));
  }

  const total = engines.reduce((sum, e) => {
    const seats = picked[e.id];
    if (!seats) return sum;
    return sum + (e.tiers.find((t) => t.seats === seats)?.price ?? 0);
  }, 0);
  const count = Object.keys(picked).length;

  async function handleConfirm() {
    setConfirming(true);
    setError(null);
    const result = await confirmEngineSelection(
      orgId,
      orgName,
      Object.entries(picked).map(([engineId, seats]) => ({ engineId, seats }))
    );
    setConfirming(false);
    if (result.ok) onConfirmed();
    else setError(result.error || "Something went wrong confirming your plan. Please try again.");
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 20000,
        background: "rgba(10,10,10,0.94)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: 20,
        overflowY: "auto",
      }}
    >
      <div style={{ maxWidth: 680, width: "100%", padding: "40px 0" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#fff", marginBottom: 8 }}>Your free trial has ended</h1>
          <p style={{ fontSize: 14, color: "#9ca3af" }}>
            You had every engine for 30 days — now pick what you actually use and how many people need each one.
            One user, one seat.
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", color: "#9ca3af" }}>Loading engines...</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            {engines.map((engine) => {
              const isChecked = engine.id in picked;
              const seats = picked[engine.id];
              return (
                <div
                  key={engine.id}
                  style={{
                    padding: "12px 16px",
                    borderRadius: 10,
                    border: isChecked ? "2px solid #f5b800" : "1px solid #333",
                    background: isChecked ? "#f5b80014" : "#161616",
                    color: "#fff",
                  }}
                >
                  <button
                    onClick={() => toggle(engine)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      width: "100%",
                      textAlign: "left",
                      background: "transparent",
                      border: "none",
                      color: "#fff",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span
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
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 500 }}>{engine.name}</span>
                      {engine.seatsInUse > 0 && (
                        <span style={{ fontSize: 11, color: "#9ca3af" }}>{engine.seatsInUse} in use</span>
                      )}
                    </span>
                    <span style={{ fontSize: 13, color: "#9ca3af" }}>
                      from KES {engine.tiers[0].price.toLocaleString()}/mo
                    </span>
                  </button>

                  {isChecked && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                      {engine.tiers.map((t) => {
                        const tooSmall = t.seats < engine.seatsInUse;
                        return (
                          <button
                            key={t.seats}
                            disabled={tooSmall}
                            onClick={() => setSeats(engine.id, t.seats)}
                            title={tooSmall ? `${engine.seatsInUse} users already use this engine` : undefined}
                            style={{
                              padding: "5px 12px",
                              borderRadius: 14,
                              fontSize: 12,
                              cursor: tooSmall ? "not-allowed" : "pointer",
                              opacity: tooSmall ? 0.35 : 1,
                              border: seats === t.seats ? "1px solid #f5b800" : "1px solid #444",
                              background: seats === t.seats ? "#f5b800" : "transparent",
                              color: seats === t.seats ? "#000" : "#ddd",
                              fontWeight: seats === t.seats ? 700 : 400,
                            }}
                          >
                            {seatLabel(t.seats)} · KES {t.price.toLocaleString()}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
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
            {count} engine{count === 1 ? "" : "s"} selected
          </span>
          <span style={{ fontSize: 18, fontWeight: 700, color: "#f5b800" }}>KES {total.toLocaleString()}/mo</span>
        </div>

        {error && <div style={{ color: "#ff6b6b", fontSize: 13, marginBottom: 12, textAlign: "center" }}>{error}</div>}

        <button
          onClick={handleConfirm}
          disabled={count === 0 || confirming}
          style={{
            width: "100%",
            padding: "14px 0",
            borderRadius: 10,
            border: "none",
            background: count > 0 ? "#f5b800" : "#333",
            color: count > 0 ? "#000" : "#666",
            fontWeight: 700,
            fontSize: 14,
            cursor: count > 0 ? "pointer" : "not-allowed",
          }}
        >
          {confirming ? "Setting up your plan..." : "Confirm plan"}
        </button>

        <p style={{ textAlign: "center", fontSize: 12, color: "#6b7280", marginTop: 14 }}>
          We'll send an invoice to your account — no card needed right now. You can change seats any time from Engines.
        </p>
      </div>
    </div>
  );
}
