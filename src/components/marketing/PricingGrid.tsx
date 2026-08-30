"use client";

import Link from "next/link";
import type { Package } from "@/lib/packages";

export default function PricingGrid({
  packages,
  loading = false,
}: {
  packages: Package[];
  loading?: boolean;
}) {
  if (loading) {
    return (
      <p className="mkt-dim mkt-mono" style={{ textAlign: "center", padding: "40px 0" }}>
        Loading pricing…
      </p>
    );
  }

  if (packages.length === 0) {
    return (
      <div className="mkt-card" style={{ textAlign: "center", padding: "40px 28px" }}>
        <p className="mkt-body" style={{ fontSize: "0.9375rem" }}>
          No pricing plans found. Check that your Supabase{" "}
          <code className="mkt-mono">packages</code> table has rows, and that
          anonymous <code className="mkt-mono">SELECT</code> is allowed by
          Row Level Security.
        </p>
      </div>
    );
  }

  const featured = Math.min(1, packages.length - 1);

  return (
    <div className="mkt-grid mkt-cols-3 mkt-pricing-grid">
      {packages.map((pkg, i) => (
        <div key={pkg.id} className={`mkt-card mkt-pricing-card ${i === featured ? "mkt-pricing-card--featured" : ""}`}>
          {i === featured && <div className="mkt-tag mkt-pricing-card__badge">Most chosen</div>}
          <div className="mkt-tag">{pkg.name}</div>
          <div className="mkt-pricing-card__price">{pkg.price}</div>
          <p className="mkt-body" style={{ fontSize: "0.875rem", marginTop: 6, minHeight: 60 }}>
            {pkg.features}
          </p>
          <Link
            href="/register"
            className={`mkt-btn ${i === featured ? "mkt-btn--primary" : "mkt-btn--ghost"} mkt-btn--full`}
            style={{ marginTop: 20 }}
          >
            Choose {pkg.name}
          </Link>
        </div>
      ))}

      <style>{`
        .mkt-pricing-card {
          display: flex;
          flex-direction: column;
          position: relative;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .mkt-pricing-card:hover {
          transform: translateY(-4px);
        }
        .mkt-pricing-card--featured:hover {
          box-shadow: 0 0 0 1px var(--mkt-brass), 0 12px 32px -12px var(--mkt-brass-glow);
        }
        .mkt-pricing-card--featured {
          border-color: var(--mkt-brass);
        }
        .mkt-pricing-card--featured::before,
        .mkt-pricing-card--featured::after {
          border-color: var(--mkt-brass);
        }
        .mkt-pricing-card__badge {
          position: absolute;
          top: -11px;
          left: 24px;
          background: var(--mkt-ink);
          color: var(--mkt-brass-light);
          border-color: var(--mkt-brass);
        }
        .mkt-pricing-card__price {
          font-family: var(--mkt-font-mono);
          font-size: 1.75rem;
          font-weight: 600;
          color: var(--mkt-paper);
          margin-top: 18px;
        }
      `}</style>
    </div>
  );
}
