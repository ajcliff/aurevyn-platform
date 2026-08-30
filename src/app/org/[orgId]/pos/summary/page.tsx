"use client";

import { useEffect, useState } from "react";
import { useEngine } from "@/lib/runtime/EngineContext";
import { getSalesSummary, type SalesSummaryData } from "@/lib/salesSummary";
import jsPDF from "jspdf";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function daysAgoStr(days: number) {
  return new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
}

export default function SalesSummaryPage() {
  const { organization } = useEngine();

  const [startDate, setStartDate] = useState(daysAgoStr(7));
  const [endDate, setEndDate] = useState(todayStr());
  const [summary, setSummary] = useState<SalesSummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const data = await getSalesSummary(organization.id, startDate, endDate);
    setSummary(data);
    setLoading(false);
  }

  function handlePrint() {
    if (!summary) return;

    const doc = new jsPDF();
    let y = 20;

    doc.setFontSize(16);
    doc.text(`Sales Summary — ${organization.name}`, 14, y);
    y += 8;
    doc.setFontSize(10);
    doc.text(`Period: ${startDate} to ${endDate}`, 14, y);
    y += 12;

    doc.setFontSize(12);
    doc.text(`Total Revenue: KES ${summary.totalRevenue.toLocaleString()}`, 14, y);
    y += 7;
    doc.text(`Transactions: ${summary.totalTransactions}`, 14, y);
    y += 7;
    doc.text(`Average Sale: KES ${Math.round(summary.averageSale).toLocaleString()}`, 14, y);
    y += 7;
    doc.text(`Total Discounts Given: KES ${summary.totalDiscounts.toLocaleString()}`, 14, y);
    y += 12;

    doc.setFontSize(13);
    doc.text("By Payment Method", 14, y);
    y += 8;
    doc.setFontSize(10);
    Object.entries(summary.byPaymentMethod).forEach(([method, amount]) => {
      doc.text(`${method}: KES ${amount.toLocaleString()}`, 14, y);
      y += 6;
    });
    y += 8;

    doc.setFontSize(13);
    doc.text("Top Products", 14, y);
    y += 8;
    doc.setFontSize(10);
    summary.topProducts.forEach((p) => {
      doc.text(`${p.name} — ${p.quantity} units — KES ${p.revenue.toLocaleString()}`, 14, y);
      y += 6;
    });

    doc.save(`sales-summary-${organization.id}-${startDate}-to-${endDate}.pdf`);
  }

  if (loading || !summary) return <div>Loading sales summary...</div>;

  return (
    <div style={{ overflowY: "auto", height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Sales Summary</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Report and printable summary for a chosen period.</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} />
          <span style={{ color: "var(--text-muted)" }}>to</span>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={inputStyle} />
          <button style={ghostButton} onClick={load}>Apply</button>
          <button style={buttonGold} onClick={handlePrint}>Print / Export PDF</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 20 }}>
        <div className="card" style={cardStyle}>
          <div style={labelSmall}>Total Revenue</div>
          <div style={valueStyle}>KES {summary.totalRevenue.toLocaleString()}</div>
        </div>
        <div className="card" style={cardStyle}>
          <div style={labelSmall}>Transactions</div>
          <div style={valueStyle}>{summary.totalTransactions}</div>
        </div>
        <div className="card" style={cardStyle}>
          <div style={labelSmall}>Average Sale</div>
          <div style={valueStyle}>KES {Math.round(summary.averageSale).toLocaleString()}</div>
        </div>
        <div className="card" style={cardStyle}>
          <div style={labelSmall}>Discounts Given</div>
          <div style={{ ...valueStyle, color: "#ef4444" }}>KES {summary.totalDiscounts.toLocaleString()}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="card" style={cardStyle}>
          <h3 style={{ marginBottom: 12 }}>By Payment Method</h3>
          {Object.entries(summary.byPaymentMethod).map(([method, amount]) => (
            <div key={method} style={rowStyle}>
              <span style={{ textTransform: "capitalize" }}>{method}</span>
              <span style={{ fontWeight: 600 }}>KES {amount.toLocaleString()}</span>
            </div>
          ))}
        </div>

        <div className="card" style={cardStyle}>
          <h3 style={{ marginBottom: 12 }}>Top Products</h3>
          {summary.topProducts.map((p) => (
            <div key={p.name} style={rowStyle}>
              <span>{p.name} ({p.quantity})</span>
              <span style={{ fontWeight: 600 }}>KES {p.revenue.toLocaleString()}</span>
            </div>
          ))}
          {summary.topProducts.length === 0 && <div style={{ color: "var(--text-muted)", fontSize: 12 }}>No sales in this period.</div>}
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
  padding: "8px 0",
  borderBottom: "1px solid var(--border)",
  fontSize: 13,
};

const labelSmall: React.CSSProperties = { fontSize: 12, color: "var(--text-muted)" };
const valueStyle: React.CSSProperties = { fontSize: 22, fontWeight: 700, marginTop: 4 };

const inputStyle: React.CSSProperties = {
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

const ghostButton: React.CSSProperties = {
  padding: "9px 18px",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--text-secondary)",
  fontSize: 12,
  cursor: "pointer",
};