"use client";

import { useEffect, useMemo, useState } from "react";
import { useEngine } from "@/lib/runtime/EngineContext";
import { getSales, type PosSale } from "@/lib/pos";
import { getProducts, type InventoryProduct } from "@/lib/inventory";
import { getOutstandingInvoices, type OrgInvoice } from "@/lib/orgInvoices";
import { getPaymentsSince, type Payment } from "@/lib/payments";
import { exportToCSV } from "@/lib/csvExport";
import {
  getPresetRange,
  getSalesTrend,
  getTopBottomProducts,
  getRevenueByPaymentMethod,
  getReceivablesAgingBuckets,
  getInventoryTurnover,
  type DateRange,
  type RangePreset,
  type InventoryTurnover,
} from "@/lib/analytics";

export default function AnalyticsPage() {
  const { organization, installedEngines } = useEngine();
  const installedSlugs = useMemo(
    () => installedEngines.map((e) => e.engines?.slug).filter((s): s is string => Boolean(s)),
    [installedEngines]
  );
  const hasPos = installedSlugs.includes("pos");
  const hasInventory = installedSlugs.includes("inventory");
  const hasFinance = installedSlugs.includes("finance");

  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState<PosSale[]>([]);
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [invoices, setInvoices] = useState<OrgInvoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [turnover, setTurnover] = useState<InventoryTurnover | null>(null);

  const [preset, setPreset] = useState<RangePreset>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const range: DateRange = useMemo(() => {
    if (preset === "custom" && customFrom && customTo) {
      const from = new Date(customFrom);
      from.setHours(0, 0, 0, 0);
      const to = new Date(customTo);
      to.setHours(23, 59, 59, 999);
      return { from, to };
    }
    return getPresetRange(preset === "custom" ? "month" : preset);
  }, [preset, customFrom, customTo]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (hasInventory && products.length > 0) {
      getInventoryTurnover(organization.id, products, range).then(setTurnover);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, products]);

  async function load() {
    setLoading(true);
    const since90 = new Date();
    since90.setDate(since90.getDate() - 90);

    const [s, p, inv, pay] = await Promise.all([
      hasPos ? getSales(organization.id) : Promise.resolve([] as PosSale[]),
      hasInventory ? getProducts(organization.id) : Promise.resolve([] as InventoryProduct[]),
      hasFinance ? getOutstandingInvoices(organization.id) : Promise.resolve([] as OrgInvoice[]),
      hasPos ? getPaymentsSince(organization.id, since90.toISOString()) : Promise.resolve([] as Payment[]),
    ]);
    setSales(s);
    setProducts(p);
    setInvoices(inv);
    setPayments(pay);
    setLoading(false);
  }

  const trend = useMemo(() => getSalesTrend(sales, range), [sales, range]);
  const { top, bottom } = useMemo(() => getTopBottomProducts(sales, range, 5), [sales, range]);
  const paymentBreakdown = useMemo(() => getRevenueByPaymentMethod(payments, range), [payments, range]);
  const aging = useMemo(() => getReceivablesAgingBuckets(invoices), [invoices]);

  const totalRevenue = trend.reduce((s, d) => s + d.revenue, 0);
  const totalTransactions = trend.reduce((s, d) => s + d.transactions, 0);
  const avgOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
  const totalOutstanding = invoices.reduce((s, i) => s + Number(i.total), 0);

  function handleExport() {
    const rows = [
      { Section: "Summary", Metric: "Total Revenue", Value: totalRevenue },
      { Section: "Summary", Metric: "Transactions", Value: totalTransactions },
      { Section: "Summary", Metric: "Avg Order Value", Value: Math.round(avgOrderValue) },
      ...(hasFinance ? [{ Section: "Summary", Metric: "Outstanding Receivables", Value: totalOutstanding }] : []),
      ...trend.map((d) => ({ Section: "Daily Revenue", Metric: d.date, Value: d.revenue })),
      ...top.map((p) => ({ Section: "Top Products", Metric: p.name, Value: p.revenue })),
      ...bottom.map((p) => ({ Section: "Bottom Products", Metric: p.name, Value: p.revenue })),
      ...paymentBreakdown.map((p) => ({ Section: "Revenue by Payment Method", Metric: p.label, Value: p.amount })),
      ...(hasFinance ? aging.map((a) => ({ Section: "Receivables Aging", Metric: a.label, Value: a.amount })) : []),
      ...(hasInventory && turnover
        ? [{ Section: "Inventory", Metric: "Turnover Ratio", Value: turnover.turnoverRatio ? turnover.turnoverRatio.toFixed(2) : "N/A" }]
        : []),
    ];
    exportToCSV(`analytics-${organization.id}-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  }

  if (loading) return <div>Loading analytics...</div>;

  return (
    <div style={{ overflowY: "auto", height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Analytics</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
            Sales, revenue, and receivables trends for {organization.name}.
          </p>
        </div>
        <button style={ghostButton} onClick={handleExport}>Export CSV</button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <FilterChip label="This Week" active={preset === "week"} onClick={() => setPreset("week")} />
        <FilterChip label="This Month" active={preset === "month"} onClick={() => setPreset("month")} />
        <FilterChip label="This Quarter" active={preset === "quarter"} onClick={() => setPreset("quarter")} />
        <span style={{ color: "var(--text-muted)", fontSize: 12 }}>or</span>
        <input
          type="date"
          value={customFrom}
          onChange={(e) => {
            setCustomFrom(e.target.value);
            setPreset("custom");
          }}
          style={inputStyle}
        />
        <span style={{ color: "var(--text-muted)", fontSize: 12 }}>to</span>
        <input
          type="date"
          value={customTo}
          onChange={(e) => {
            setCustomTo(e.target.value);
            setPreset("custom");
          }}
          style={inputStyle}
        />
      </div>

      {!hasPos && !hasFinance && (
        <div className="card" style={{ ...cardStyle, marginBottom: 20 }}>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Install POS or Finance to start seeing analytics here.
          </p>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: `repeat(${hasFinance ? 4 : 3}, 1fr)`, gap: 16, marginBottom: 20 }}>
        <StatCard label="Total Revenue" value={`KES ${totalRevenue.toLocaleString()}`} />
        <StatCard label="Transactions" value={totalTransactions.toLocaleString()} />
        <StatCard label="Avg Order Value" value={`KES ${Math.round(avgOrderValue).toLocaleString()}`} />
        {hasFinance && <StatCard label="Outstanding Receivables" value={`KES ${totalOutstanding.toLocaleString()}`} />}
      </div>

      {hasPos && (
        <div className="card" style={{ ...cardStyle, marginBottom: 20 }}>
          <SectionHeading title="Sales Trend" />
          {trend.length === 0 ? (
            <EmptyNote text="No sales in this range." />
          ) : (
            <TrendChart data={trend} />
          )}
        </div>
      )}

      {hasPos && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          <div className="card" style={cardStyle}>
            <SectionHeading title="Top Products" />
            {top.length === 0 ? <EmptyNote text="No product sales in this range." /> : <BarList data={top.map((p) => ({ label: p.name, value: p.revenue, sub: `${p.quantity} sold` }))} color="#3dd68c" />}
          </div>
          <div className="card" style={cardStyle}>
            <SectionHeading title="Bottom Products" />
            {bottom.length === 0 ? <EmptyNote text="No product sales in this range." /> : <BarList data={bottom.map((p) => ({ label: p.name, value: p.revenue, sub: `${p.quantity} sold` }))} color="#ef4444" />}
          </div>
        </div>
      )}

      {hasPos && (
        <div className="card" style={{ ...cardStyle, marginBottom: 20 }}>
          <SectionHeading title="Revenue by Payment Method" />
          {paymentBreakdown.length === 0 ? (
            <EmptyNote text="No payments recorded in this range." />
          ) : (
            <BarList data={paymentBreakdown.map((p) => ({ label: p.label, value: p.amount, sub: `${p.count} payment${p.count === 1 ? "" : "s"}` }))} color="var(--gold)" />
          )}
        </div>
      )}

      {hasFinance && (
        <div className="card" style={{ ...cardStyle, marginBottom: 20 }}>
          <SectionHeading title="Receivables Aging" />
          {invoices.length === 0 ? (
            <EmptyNote text="No outstanding invoices." />
          ) : (
            <BarList data={aging.map((a) => ({ label: a.label, value: a.amount }))} color="#5b9cf5" />
          )}
        </div>
      )}

      {hasInventory && (
        <div className="card" style={cardStyle}>
          <SectionHeading title="Inventory Turnover" />
          {turnover ? (
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 28, fontWeight: 800 }}>
                {turnover.turnoverRatio !== null ? turnover.turnoverRatio.toFixed(2) + "×" : "N/A"}
              </span>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                KES {turnover.stockOutValue.toLocaleString()} sold out of stock vs KES {turnover.currentInventoryValue.toLocaleString()} in current inventory value, over this range.
              </span>
            </div>
          ) : (
            <EmptyNote text="Calculating..." />
          )}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   COMPONENTS
========================================================= */

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card" style={cardStyle}>
      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function SectionHeading({ title }: { title: string }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 14, textTransform: "uppercase", letterSpacing: 0.5 }}>
      {title}
    </div>
  );
}

function EmptyNote({ text }: { text: string }) {
  return <p style={{ fontSize: 12, color: "var(--text-muted)", padding: "8px 0" }}>{text}</p>;
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 14px",
        borderRadius: 8,
        border: "1px solid var(--border)",
        background: active ? "var(--gold)" : "var(--bg-elevated)",
        color: active ? "#07070f" : "var(--text-secondary)",
        fontSize: 11,
        fontWeight: active ? 700 : 500,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

// Compact SVG bar chart for the sales-trend section — plain SVG driven by CSS
// vars (not a chart library) so it respects all four app themes automatically.
function TrendChart({ data }: { data: { date: string; revenue: number; transactions: number }[] }) {
  const width = 760;
  const height = 160;
  const paddingBottom = 24;
  const max = Math.max(...data.map((d) => d.revenue), 1);
  const barGap = 4;
  const barWidth = Math.max((width - barGap * (data.length - 1)) / data.length, 2);
  const showEveryNthLabel = Math.ceil(data.length / 8) || 1;

  return (
    <svg viewBox={`0 0 ${width} ${height + paddingBottom}`} style={{ width: "100%", height: "auto", overflow: "visible" }}>
      {data.map((d, i) => {
        const barHeight = (d.revenue / max) * (height - 10);
        const x = i * (barWidth + barGap);
        const y = height - barHeight;
        return (
          <g key={d.date}>
            <rect x={x} y={y} width={barWidth} height={barHeight} rx={2} style={{ fill: "var(--gold)", opacity: 0.85 }}>
              <title>{`${d.date}: KES ${d.revenue.toLocaleString()} (${d.transactions} sale${d.transactions === 1 ? "" : "s"})`}</title>
            </rect>
            {i % showEveryNthLabel === 0 && (
              <text
                x={x + barWidth / 2}
                y={height + 16}
                textAnchor="middle"
                style={{ fill: "var(--text-muted)", fontSize: 9 }}
              >
                {d.date.slice(5)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// Horizontal bar list — used for top/bottom products, payment methods, and
// receivables aging. Proportional width bars driven by CSS vars.
function BarList({ data, color }: { data: { label: string; value: number; sub?: string }[]; color: string }) {
  const max = Math.max(...data.map((d) => Math.abs(d.value)), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {data.map((d, i) => (
        <div key={i}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
            <span>{d.label}</span>
            <span style={{ fontWeight: 700 }}>
              KES {d.value.toLocaleString()}
              {d.sub && <span style={{ fontWeight: 400, color: "var(--text-muted)" }}> · {d.sub}</span>}
            </span>
          </div>
          <div style={{ height: 6, borderRadius: 4, background: "var(--bg-elevated)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(Math.abs(d.value) / max) * 100}%`, background: color, borderRadius: 4 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 14,
  padding: 20,
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