"use client";

import { useEffect, useState } from "react";
import { useEngine } from "@/lib/runtime/EngineContext";
import { getPendingCheques, updateChequeStatus, type Payment } from "@/lib/payments";
import EmptyState from "@/components/EmptyState";

export default function ChequesPage() {
  const { organization } = useEngine();

  const [cheques, setCheques] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const c = await getPendingCheques(organization.id);
    setCheques(c);
    setLoading(false);
  }

  async function handleClear(id: string, status: "cleared" | "bounced") {
    if (status === "bounced" && !confirm("Mark this cheque as bounced?")) return;
    setActingId(id);
    try {
      await updateChequeStatus(id, organization.id, status);
      load();
    } finally {
      setActingId(null);
    }
  }

  if (loading) return <div>Loading cheques...</div>;

  return (
    <div style={{ overflowY: "auto", height: "100%" }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Pending Cheques</h1>
        <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
          Cheques awaiting clearance for {organization.name}.
        </p>
      </div>

      <div className="card" style={cardStyle}>
        {cheques.map((c) => (
          <div key={c.id} style={{ ...rowStyle, gridTemplateColumns: "1fr 1fr 1fr 1fr auto" }}>
            <span>Cheque #{c.cheque_number}</span>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{c.cheque_bank}</span>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{c.cheque_date}</span>
            <span style={{ fontWeight: 600, textAlign: "right" }}>KES {Number(c.amount).toLocaleString()}</span>
            <span style={{ display: "flex", gap: 6 }}>
              <button
                style={buttonGold}
                onClick={() => handleClear(c.id, "cleared")}
                disabled={actingId === c.id}
              >
                Mark Cleared
              </button>
              <button
                style={ghostButton}
                onClick={() => handleClear(c.id, "bounced")}
                disabled={actingId === c.id}
              >
                Mark Bounced
              </button>
            </span>
          </div>
        ))}
        {cheques.length === 0 && <EmptyState icon="🏦" message="No pending cheques." />}
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 14,
  padding: 20,
};

const rowStyle: React.CSSProperties = {
  display: "grid",
  padding: "10px 0",
  borderBottom: "1px solid var(--border)",
  fontSize: 13,
  alignItems: "center",
  gap: 8,
};

const buttonGold: React.CSSProperties = {
  background: "var(--gold)",
  color: "#07070f",
  border: "none",
  borderRadius: 10,
  padding: "7px 14px",
  fontWeight: 700,
  fontSize: 12,
  cursor: "pointer",
};

const ghostButton: React.CSSProperties = {
  padding: "7px 14px",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--text-secondary)",
  fontSize: 12,
  cursor: "pointer",
};
