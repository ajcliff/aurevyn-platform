"use client";

import Link from "next/link";
import type { Package } from "@/lib/packages";
import { ENGINE_META, ENGINE_ORDER } from "./engineData";
import { useTilt } from "./interactions";

const NON_FEATURED_GLOW = "var(--mkt-blueprint-glow)";

function PricingCard({ pkg, featured, accent }: { pkg: Package; featured: boolean; accent: string }) {
  const tiltRef = useTilt<HTMLDivElement>(4);

  return (
    <div
      ref={tiltRef}
      className={`mkt-card mkt-pricing-card ${featured ? "mkt-pricing-card--featured" : ""}`}
      style={{ ["--pkg-glow" as string]: featured ? "var(--mkt-brass-glow)" : accent }}
    >
      {featured && <div className="mkt-tag mkt-pricing-card__badge">Most chosen</div>}
      <div className="mkt-pricing-card__top">
        <div className="mkt-tag">{pkg.name}</div>
        <div className="mkt-tag mkt-tag--trial">30 days free</div>
      </div>
      <div className="mkt-pricing-card__price">{pkg.price}</div>
      <div className="mkt-pricing-card__price-note mkt-mono">after your trial ends</div>
      <p className="mkt-body" style={{ fontSize: "0.875rem", marginTop: 6, minHeight: 60 }}>
        {pkg.features}
      </p>

      <div className="mkt-pricing-card__engines" title="Every engine — unlocked for your 30-day trial">
        {ENGINE_ORDER.map((id, ei) => (
          <span
            key={id}
            className="mkt-pricing-card__dot"
            style={{ background: ENGINE_META[id].color, animationDelay: `${ei * 0.15}s` }}
          />
        ))}
      </div>

      <Link
        href="/register"
        className={`mkt-btn ${featured ? "mkt-btn--primary" : "mkt-btn--ghost"} mkt-btn--full`}
        style={{ marginTop: 20 }}
      >
        Choose {pkg.name}
      </Link>
    </div>
  );
}

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
        <PricingCard
          key={pkg.id}
          pkg={pkg}
          featured={i === featured}
          accent={NON_FEATURED_GLOW}
        />
      ))}

      <style>{`
        .mkt-pricing-card {
          display: flex;
          flex-direction: column;
          position: relative;
          transform: perspective(900px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg)) translateY(0);
          transition: transform 0.2s ease-out, box-shadow 0.25s ease, border-color 0.25s ease;
        }
        .mkt-pricing-card::after {
          content: "";
          position: absolute;
          inset: 0;
          background: radial-gradient(
            420px circle at var(--mx, 50%) var(--my, 50%),
            var(--pkg-glow, var(--mkt-brass-glow)),
            transparent 60%
          );
          opacity: 0;
          transition: opacity 0.25s ease;
          pointer-events: none;
        }
        .mkt-pricing-card:hover::after {
          opacity: 1;
        }
        .mkt-pricing-card:hover {
          transform: perspective(900px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg)) translateY(-6px);
        }
        .mkt-pricing-card--featured:hover {
          box-shadow: 0 0 0 1px var(--mkt-brass), 0 20px 44px -16px var(--mkt-brass-glow);
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
        .mkt-pricing-card__top {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .mkt-tag--trial {
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
        .mkt-pricing-card__price-note {
          font-size: 0.6875rem;
          color: var(--mkt-paper-faint);
          margin-top: 2px;
        }
        .mkt-pricing-card__engines {
          display: flex;
          align-items: center;
          gap: 7px;
          margin-top: 18px;
          padding-top: 16px;
          border-top: 1px solid var(--mkt-line);
        }
        .mkt-pricing-card__dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          flex-shrink: 0;
          animation: mkt-pricing-dot-pulse 2.4s ease-in-out infinite;
        }
        @keyframes mkt-pricing-dot-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.45; transform: scale(0.8); }
        }
        @media (prefers-reduced-motion: reduce) {
          .mkt-pricing-card__dot {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}