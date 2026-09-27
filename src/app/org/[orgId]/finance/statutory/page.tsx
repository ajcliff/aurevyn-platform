"use client";

import { useEffect, useState } from "react";
import { useEngine } from "@/lib/runtime/EngineContext";
import {
  getStatutoryLiabilityBalance,
  getStatutoryBreakdown,
  recordStatutoryRemittance,
  type StatutoryBreakdown,
} from "@/lib/statutory";
import { getFinanceAccounts, type FinanceAccount } from "@/lib/finance";

const kes = (n: number) => `KES ${Number(n).toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;

function monthStart(offset = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() - offset, 1);
  return d.toISOString().slice(0, 10);
}
function monthEnd(offset = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() - offset + 1, 0);
  return d.toISOString().slice(0, 10);
}

export default function StatutoryReportPage() {
  const { organization, membership } = useEngine();

  const [liability, setLiability] = useState(0);
  const [periodStart, setPeriodStart] = useState(monthStart());
  const [periodEnd, setPeriodEnd] = useState(monthEnd());
  const [breakdown, setBreakdown] = useState<StatutoryBreakdown>({ nssf: 0, shif: 0, ahl: 0, paye: 0, employerContributions: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  const [showRemit, setShowRemit] = useState(false);
  const [remitAmount, setRemitAmount] = useState("");
  const [financeAccounts, setFinanceAccounts] = useState<FinanceAccount[]>([]);
  const [remitAccountId, setRemitAccountId] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const [bal, bd, fa] = await Promise.all([
      getStatutoryLiabilityBalance(organization.id),
      getStatutoryBreakdown(organization.id, periodStart, periodEnd),
      getFinanceAccounts(organization.id),
    ]);
    setLiability(bal);
    setBreakdown(bd);
    setFinanceAccounts(fa.filter((a) => a.status === "active"));
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodStart, periodEnd]);

  async function handleRemit() {
    const amount = Number(remitAmount);
    if (!amount || amount <= 0) return;
    setSaving(true);
    try {
      const deciderName = membership.isFounder ? "Founder" : "Approver";
      await recordStatutoryRemittance({
        orgId: organization.id,
        amount,
        date: new Date().toISOString().slice(0, 10),
        financeAccountId: remitAccountId || undefined,
        decidedByName: deciderName,
      });
      setShowRemit(false);
      setRemitAmount("");
      load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>Statutory Remittance</h1>
      <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>
        NSSF, SHIF, and Housing Levy withheld from payroll, plus PAYE — what you owe KRA/NSSF/SHA and what's already been paid.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24, maxWidth: 700 }}>
        <div style={cardStyle}>
          <div style={labelSmall}>Currently Owed</div>
          <div style={{ ...valueStyle, color: liability > 0 ? "#ef4444" : "#3dd68c" }}>{kes(liability)}</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Live balance — reflects any remittances already recorded</div>
          <button style={{ ...buttonGold, marginTop: 12 }} onClick={() => { setRemitAmount(String(liability)); setRemitAccountId(financeAccounts[0]?.id || ""); setShowRemit(true); }} disabled={liability <= 0}>
            Record Remittance
          </button>
        </div>

        <div style={cardStyle}>
          <div style={labelSmall}>Period Breakdown</div>
          <div style={{ display: "flex", gap: 8, margin: "8px 0" }}>
            <input type="date" style={smallInputStyle} value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
            <input type="date" style={smallInputStyle} value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
          </div>
        </div>
      </div>

      <div style={{ ...cardStyle, maxWidth: 700 }}>
        {loading ? (
          "Loading..."
        ) : (
          <>
            <div style={rowStyle}><span>NSSF (employee)</span><span>{kes(breakdown.nssf)}</span></div>
            <div style={rowStyle}><span>SHIF</span><span>{kes(breakdown.shif)}</span></div>
            <div style={rowStyle}><span>Affordable Housing Levy (employee)</span><span>{kes(breakdown.ahl)}</span></div>
            <div style={rowStyle}><span>PAYE</span><span>{kes(breakdown.paye)}</span></div>
            <div style={rowStyle}><span>Employer contributions (NSSF + AHL match)</span><span>{kes(breakdown.employerContributions)}</span></div>
            <div style={{ ...rowStyle, borderBottom: "none", fontWeight: 700, fontSize: 15 }}>
              <span>Total for period</span><span>{kes(breakdown.total)}</span>
            </div>
          </>
        )}
      </div>

      {showRemit && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h2 style={{ marginBottom: 6 }}>Record Statutory Remittance</h2>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
              Confirms a payment to KRA/NSSF/SHA and reduces the owed balance.
            </p>

            <label style={labelSmall}>Amount (KES)</label>
            <input type="number" style={{ ...smallInputStyle, width: "100%", padding: "8px 10px", marginTop: 4, marginBottom: 12 }} value={remitAmount} onChange={(e) => setRemitAmount(e.target.value)} />

            <label style={labelSmall}>Paid from</label>
            {financeAccounts.length === 0 ? (
              <p style={{ fontSize: 12, color: "var(--text-muted)" }}>No bank/cash/mobile-money accounts set up — this will post to an unspecified cash bucket instead.</p>
            ) : (
              <select style={{ ...smallInputStyle, width: "100%", padding: "8px 10px", marginTop: 4 }} value={remitAccountId} onChange={(e) => setRemitAccountId(e.target.value)}>
                {financeAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button style={ghostButton} onClick={() => setShowRemit(false)}>Cancel</button>
              <button style={{ ...buttonGold, flex: 1 }} onClick={handleRemit} disabled={saving}>
                {saving ? "Recording..." : "Confirm Remittance"}
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
  display: "flex",
  justifyContent: "space-between",
  padding: "10px 0",
  borderBottom: "1px solid var(--border)",
  fontSize: 13,
};

const labelSmall: React.CSSProperties = { fontSize: 12, color: "var(--text-muted)" };
const valueStyle: React.CSSProperties = { fontSize: 22, fontWeight: 700, marginTop: 4 };

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
