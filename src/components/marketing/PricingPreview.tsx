"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getPackages, type Package } from "@/lib/packages";
import PricingGrid from "./PricingGrid";

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
