"use client";

import { useEffect, useState } from "react";
import { useEngine } from "@/lib/runtime/EngineContext";
import { getPayables, getPayablesAgingBuckets, recordSupplierPayment, type PayableOrder } from "@/lib/creditors";
import { updatePurchaseOrderDueDate } from "@/lib/purchaseOrders";
import PaymentMethodForm from "@/components/payments/PaymentMethodForm";
import { type PaymentDetailsInput } from "@/lib/payments";
import EmptyState from "@/components/EmptyState";

export default function CreditorsPage() {
  const { organization } = useEngine();

  const [payables, setPayables] = useState<PayableOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const [dueDateEdits, setDueDateEdits] = useState<Record<string, string>>({});

  const [payingPo, setPayingPo] = useState<PayableOrder | null>(null);
  const [payDetails, setPayDetails] = useState<PaymentDetailsInput | null>(null);
  const [paySaving, setPaySaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const p = await getPayables(organization.id);
    setPayables(p);
    setLoading(false);
  }

  const aging = getPayablesAgingBuckets(payables);
  const totalOwed = payables.reduce((s, p) => s + Math.max(0, p.amount_owed), 0);
  const outstanding = payables.filter((p) => p.amount_owed > 0);

  async function handleSaveDueDate(po: PayableOrder) {
    const newDate = dueDateEdits[po.id];
    if (newDate === undefined) return;
    await updatePurchaseOrderDueDate(po.id, newDate || null);
    setDueDateEdits((prev) => {
      const next = { ...prev };
      delete next[po.id];
      return next;
    });
    load();
  }

  async function handlePay() {
    if (!payingPo || !payDetails) {
      alert("Complete the payment details first");
      return;
    }
    try {
      setPaySaving(true);
      await recordSupplierPayment({
        orgId: organization.id,
        poId: payingPo.id,
        details: { ...payDetails, amount: payDetails.amount || payingPo.amount_owed },
      });
      setPayingPo(null);
      setPayDetails(null);
      load();
    } finally {
      setPaySaving(false);
    }
  }

  if (loading) return <div>Loading creditors...</div>;

  return (
    <div style={{ overflowY: "auto", height: "100%" }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Creditors (Payables)</h1>
        <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
          Amounts owed to suppliers for {organization.name}.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, marginBottom: 20 }}>
        <div className="card" style={cardStyle}>
          <div style={labelSmall}>Total Owed</div>
          <div style={{ ...valueStyle, color: "#ef4444" }}>KES {totalOwed.toLocaleString()}</div>
        </div>
        {aging.map((b) => (
          <div className="card" style={cardStyle} key={b.label}>
            <div style={labelSmall}>{b.label}</div>
            <div style={valueStyle}>KES {b.amount.toLocaleString()}</div>
          </div>
        ))}
      </div>

      <div className="card" style={cardStyle}>
        <h3 style={{ marginBottom: 12 }}>Outstanding Purchase Orders</h3>

        {outstanding.map((po) => (
          <div key={po.id} style={{ ...rowStyle, gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr auto" }}>
            <span>{po.po_number}</span>
            <span>{po.supplier_name}</span>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {dueDateEdits[po.id] !== undefined ? (
                <input
                  type="date"
                  value={dueDateEdits[po.id]}
                  onChange={(e) => setDueDateEdits((prev) => ({ ...prev, [po.id]: e.target.value }))}
                  onBlur={() => handleSaveDueDate(po)}
                  style={smallInputStyle}
                  autoFocus
                />
              ) : (
                <span
                  style={{ cursor: "pointer", textDecoration: "underline dotted" }}
                  onClick={() => setDueDateEdits((prev) => ({ ...prev, [po.id]: po.due_date || "" }))}
                  title="Click to set due date"
                >
                  {po.due_date || "Set due date"}
                </span>
              )}
            </span>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Paid KES {po.amount_paid.toLocaleString()}</span>
            <span style={{ fontWeight: 600, color: "#ef4444", textAlign: "right" }}>
              KES {po.amount_owed.toLocaleString()}
            </span>
            <button style={buttonGold} onClick={() => { setPayingPo(po); setPayDetails(null); }}>
              Pay
            </button>
          </div>
        ))}

        {outstanding.length === 0 && <EmptyState icon="✅" message="No outstanding payables." />}
      </div>

      {payingPo && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h2 style={{ marginBottom: 4 }}>Pay {payingPo.supplier_name}</h2>
            <p style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 16 }}>
              {payingPo.po_number} — KES {payingPo.amount_owed.toLocaleString()} owed
            </p>

            <PaymentMethodForm
              amount={payingPo.amount_owed}
              onAmountChange={() => {}}
              onChange={setPayDetails}
            />

            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              <button style={ghostButton} onClick={() => { setPayingPo(null); setPayDetails(null); }}>Cancel</button>
              <button style={{ ...buttonGold, flex: 1 }} onClick={handlePay} disabled={paySaving}>
                {paySaving ? "Saving..." : "Record Payment"}
              </button>
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

const rowStyle: React.CSSProperties = {
  display: "grid",
  padding: "10px 0",
  borderBottom: "1px solid var(--border)",
  fontSize: 13,
  alignItems: "center",
  gap: 8,
};

const labelSmall: React.CSSProperties = { fontSize: 12, color: "var(--text-muted)" };
const valueStyle: React.CSSProperties = { fontSize: 18, fontWeight: 700, marginTop: 4 };

const smallInputStyle: React.CSSProperties = {
  padding: "4px 6px",
  borderRadius: 6,
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
  padding: "7px 14px",
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
  width: 440,
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 16,
  padding: 24,
  maxHeight: "85vh",
  overflowY: "auto",
};
