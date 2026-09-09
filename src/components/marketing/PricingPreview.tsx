"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getPackages, type Package } from "@/lib/packages";
import PricingGrid from "./PricingGrid";
import { useCountUp } from "./interactions";

function TrialStrip() {
  const { ref, display } = useCountUp("30");
  return (
    <div className="mkt-trial-strip">
      <span className="mkt-badge-live mkt-trial-strip__badge">Trial active on every new org</span>
      <p className="mkt-trial-strip__text">
        <span className="mkt-num mkt-trial-strip__days">
          <span ref={ref}>{display}</span> days
        </span>
        , every engine unlocked — pick a plan once you know what you'll actually keep.
      </p>

      <style>{`
        .mkt-trial-strip {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          flex-wrap: wrap;
          margin: 32px auto 0;
          padding: 14px 24px;
          max-width: 640px;
          border: 1px solid var(--mkt-brass);
          background: var(--mkt-brass-glow);
        }
        .mkt-trial-strip__badge {
          color: var(--mkt-brass-light);
          flex-shrink: 0;
        }
        .mkt-trial-strip__badge::before {
          background: var(--mkt-brass-light);
          box-shadow: 0 0 0 3px var(--mkt-brass-glow);
        }
        .mkt-trial-strip__text {
          font-size: 0.875rem;
          color: var(--mkt-paper-dim);
          margin: 0;
          text-align: left;
        }
        .mkt-trial-strip__days {
          color: var(--mkt-brass-light);
          font-weight: 600;
          font-size: 0.9375rem;
        }
        @media (max-width: 640px) {
          .mkt-trial-strip {
            flex-direction: column;
            text-align: center;
          }
          .mkt-trial-strip__text {
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
}

export default function PricingPreview() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPackages()
      .then(setPackages)
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="mkt-section mkt-section--tight">
      <div className="mkt-container">
        <div className="mkt-section-head" style={{ textAlign: "center" }}>
          <div className="mkt-eyebrow" style={{ justifyContent: "center" }}>Sheet 05 / Pricing</div>
          <h2 className="mkt-h2" style={{ marginTop: 14 }}>One price, every engine included.</h2>
          <p className="mkt-body-lg" style={{ marginTop: 12, maxWidth: 480, marginInline: "auto" }}>
            No per-module upsell. Pick a tier by the size of your operation.
          </p>
          <TrialStrip />
        </div>

        <div style={{ marginTop: 44 }}>
          <PricingGrid packages={packages} loading={loading} />
        </div>

        <p style={{ textAlign: "center", marginTop: 28 }}>
          <Link href="/pricing" className="mkt-mono" style={{ color: "var(--mkt-blueprint)", fontSize: "0.875rem" }}>
            View full plan comparison →
          </Link>
        </p>
      </div>
    </section>
  );
}