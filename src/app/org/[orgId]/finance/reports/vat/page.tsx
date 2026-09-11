"use client";

import { useEffect, useState } from "react";
import { useEngine } from "@/lib/runtime/EngineContext";
import { getVatSummary, type VatSummary } from "@/lib/vat";
import { exportToCSV } from "@/lib/csvExport";

function monthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function VatReportPage() {
  const { organization } = useEngine();

  const [summary, setSummary] = useState<VatSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState(monthStart());
  const [toDate, setToDate] = useState(today());

  useEffect(() => {
    load();
  }, [fromDate, toDate]);

  async function load() {
    setLoading(true);
    const s = await getVatSummary(organization.id, fromDate, toDate);
    setSummary(s);
    setLoading(false);
  }

  function handleExport() {
    if (!summary) return;
    const rows = [
      { Line: "Output VAT — Sales invoices", "Amount (KES)": summary.outputVatInvoices },
      { Line: "Output VAT — POS sales", "Amount (KES)": summary.outputVatPosSales },
      { Line: "Total Output VAT", "Amount (KES)": summary.outputVatTotal },
      { Line: "Input VAT — Purchases received", "Amount (KES)": summary.inputVatPurchases },
      { Line: summary.netVatPayable >= 0 ? "Net VAT Payable" : "Net VAT Refundable", "Amount (KES)": Math.abs(summary.netVatPayable) },
    ];
    exportToCSV(`vat-summary-${organization.id}-${fromDate}-to-${toDate}.csv`, rows);
  }

  if (loading || !summary) return <div>Loading VAT summary...</div>;

  return (
    <div style={{ overflowY: "auto", height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>VAT Summary</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
            Output vs input VAT at {summary.rate}% for {organization.name}. For preparing a KRA VAT return — verify against source documents before filing.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={inputStyle} />
          <span style={{ color: "var(--text-muted)", fontSize: 12 }}>to</span>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={inputStyle} />
          <button style={ghostButton} onClick={handleExport}>Export CSV</button>
        </div>
      </div>

      <div className="card" style={cardStyle}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#3dd68c", marginBottom: 8, textTransform: "uppercase" }}>
          Output VAT (collected on sales)
        </div>
        <div style={rowStyle}>
          <span>Sales invoices</span>
          <span>KES {summary.outputVatInvoices.toLocaleString()}</span>
        </div>
        <div style={rowStyle}>
          <span>POS sales</span>
          <span>KES {summary.outputVatPosSales.toLocaleString()}</span>
        </div>
        <div style={{ ...rowStyle, fontWeight: 700, borderTop: "1px solid var(--border)", marginTop: 4 }}>
          <span>Total Output VAT</span>
          <span style={{ color: "#3dd68c" }}>KES {summary.outputVatTotal.toLocaleString()}</span>
        </div>
      </div>

      <div className="card" style={{ ...cardStyle, marginTop: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#ef4444", marginBottom: 8, textTransform: "uppercase" }}>
          Input VAT (paid on purchases)
        </div>
        <div style={{ ...rowStyle, fontWeight: 700 }}>
          <span>Purchases received in period</span>
          <span style={{ color: "#ef4444" }}>KES {summary.inputVatPurchases.toLocaleString()}</span>
        </div>
      </div>

      <div className="card" style={{ ...cardStyle, marginTop: 16 }}>
        <div style={{ ...rowStyle, fontSize: 18, fontWeight: 700 }}>
          <span>{summary.netVatPayable >= 0 ? "Net VAT Payable" : "Net VAT Refundable"}</span>
          <span style={{ color: summary.netVatPayable >= 0 ? "#ef4444" : "#3dd68c" }}>
            KES {Math.abs(summary.netVatPayable).toLocaleString()}
          </span>
        </div>
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
  display: "flex",
  justifyContent: "space-between",
  padding: "8px 4px",
  borderBottom: "1px solid var(--border)",
  fontSize: 13,
};

const inputStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--bg-base)",
  color: "var(--text-primary)",
  fontSize: 12,
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
