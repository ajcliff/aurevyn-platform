"use client";

import Link from "next/link";
import type { PricedEngine } from "@/lib/pricing";
import { UNLIMITED_SEATS } from "@/lib/pricing";

const kes = (n: number) => `KES ${n.toLocaleString("en-KE")}`;

export default function PricingGrid({
  engines,
  loading = false,
  limit,
}: {
  engines: PricedEngine[];
  loading?: boolean;
  limit?: number;
}) {
  if (loading) {
    return <p className="mkt-dim mkt-mono" style={{ textAlign: "center", padding: "40px 0" }}>Loading pricing…</p>;
  }
  if (engines.length === 0) {
    return (
      <div className="mkt-card" style={{ textAlign: "center", padding: "40px 28px" }}>
        <p className="mkt-body" style={{ fontSize: "0.9375rem" }}>Pricing is being updated — start a free trial and see every engine in action.</p>
      </div>
    );
  }

  const rows = limit ? engines.slice(0, limit) : engines;
  const seatSteps = Array.from(new Set(rows.flatMap(e => e.tiers.map(t => t.seats)))).sort((a, b) => a - b);
  const seatLabel = (s: number) => (s >= UNLIMITED_SEATS ? "Unlimited" : `${s} seats`);

  return (
    <div>
      <div className="mkt-price-wrap">
        <table className="mkt-price-table">
          <thead>
            <tr>
              <th scope="col">Engine</th>
              {seatSteps.map(s => <th key={s} scope="col" className="mkt-price-num">{seatLabel(s)}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map(e => (
              <tr key={e.slug}>
                <th scope="row">{e.name}</th>
                {seatSteps.map(s => {
                  const t = e.tiers.find(x => x.seats === s);
                  return <td key={s} className="mkt-price-num">{t ? kes(t.price) : "—"}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mkt-mono" style={{ textAlign: "center", marginTop: 14, fontSize: "0.75rem", color: "var(--mkt-paper-faint)" }}>
        Prices in KES per month, per engine. One seat = one team member using that engine.
      </p>
      <p style={{ textAlign: "center", marginTop: 20 }}>
        <Link href="/register" className="mkt-btn mkt-btn--primary">Start free trial</Link>
      </p>

      <style>{`
        .mkt-price-wrap { overflow-x: auto; border: 1px solid var(--mkt-line); }
        .mkt-price-table { width: 100%; border-collapse: collapse; min-width: 560px; font-size: 0.9rem; }
        .mkt-price-table th, .mkt-price-table td { padding: 14px 18px; border-bottom: 1px solid var(--mkt-line); text-align: left; }
        .mkt-price-table thead th { font-family: var(--mkt-font-mono); font-size: 0.6875rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--mkt-paper-faint); font-weight: 500; }
        .mkt-price-table tbody th { color: var(--mkt-paper); font-weight: 600; }
        .mkt-price-table tbody td { font-family: var(--mkt-font-mono); color: var(--mkt-paper-dim); }
        .mkt-price-table tbody tr:hover { background: var(--mkt-brass-glow); }
        .mkt-price-table tbody tr:last-child th, .mkt-price-table tbody tr:last-child td { border-bottom: none; }
        .mkt-price-num { text-align: right !important; white-space: nowrap; }
      `}</style>
    </div>
  );
}
