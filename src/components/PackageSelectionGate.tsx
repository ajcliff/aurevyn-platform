"use client";

import { useEffect, useState } from "react";
import { getSellablePackages, confirmPackageSelection, type SellablePackage } from "@/lib/trial";

type Props = {
  orgId: string;
  orgName: string;
  onConfirmed: () => void;
};

export default function PackageSelectionGate({ orgId, orgName, onConfirmed }: Props) {
  const [packages, setPackages] = useState<SellablePackage[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSellablePackages().then((pkgs) => {
      setPackages(pkgs);
      setLoading(false);
    });
  }, []);

  async function handleConfirm() {
    if (!selected) return;
    setConfirming(true);
    const ok = await confirmPackageSelection(orgId, orgName, selected);
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
      }}
    >
      <div style={{ maxWidth: 720, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#fff", marginBottom: 8 }}>
            Your free trial has ended
          </h1>
          <p style={{ fontSize: 14, color: "#9ca3af" }}>
            Pick the plan that fits how you've actually been using AUREVYN — you can change this later.
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", color: "#9ca3af" }}>Loading plans...</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14, marginBottom: 24 }}>
            {packages.map((pkg) => (
              <button
                key={pkg.slug}
                onClick={() => setSelected(pkg.slug)}
                style={{
                  textAlign: "left",
                  padding: "18px 20px",
                  borderRadius: 14,
                  border: selected === pkg.slug ? "2px solid #f5b800" : "1px solid #333",
                  background: selected === pkg.slug ? "#f5b80014" : "#161616",
                  cursor: "pointer",
                  color: "#fff",
                }}
              >
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{pkg.name}</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#f5b800", marginBottom: 8 }}>{pkg.price}</div>
                <div style={{ fontSize: 12, color: "#9ca3af", lineHeight: 1.5 }}>{pkg.features}</div>
              </button>
            ))}
          </div>
        )}

        <button
          onClick={handleConfirm}
          disabled={!selected || confirming}
          style={{
            width: "100%",
            padding: "14px 0",
            borderRadius: 10,
            border: "none",
            background: selected ? "#f5b800" : "#333",
            color: selected ? "#000" : "#666",
            fontWeight: 700,
            fontSize: 14,
            cursor: selected ? "pointer" : "not-allowed",
          }}
        >
          {confirming ? "Setting up your plan..." : "Confirm plan"}
        </button>

        <p style={{ textAlign: "center", fontSize: 12, color: "#6b7280", marginTop: 14 }}>
          We'll send an invoice to your account — no card needed right now.
        </p>
      </div>
    </div>
  );
}
