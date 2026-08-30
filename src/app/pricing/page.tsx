"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getPackages, type Package } from "@/lib/packages";
import MarketingShell from "@/components/marketing/MarketingShell";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import PricingGrid from "@/components/marketing/PricingGrid";

const FAQS = [
  {
    q: "Does every plan include every engine?",
    a: "Yes. POS, Inventory, Finance, CRM, HR & Payroll, and Security ship on every tier — plans scale by organizations and usage, not by which engines you're allowed to switch on.",
  },
  {
    q: "Can I change plans later?",
    a: "Anytime. Upgrades apply immediately; downgrades take effect at the start of your next billing cycle. Your data stays exactly where it is.",
  },
  {
    q: "Is M-Pesa included?",
    a: "Native STK push at checkout is built into the POS engine on every plan, reconciled straight into Finance — no separate integration to pay for.",
  },
  {
    q: "What happens after my free trial?",
    a: "You choose a plan and keep going with everything already set up. Nothing is deleted, and there's no forced migration.",
  },
];

export default function PricingPage() {
  const [packages, setPackages] = useState<Package[]>([]);

  useEffect(() => {
    getPackages().then(setPackages);
  }, []);

  return (
    <MarketingShell>
      <MarketingNav />

      <section className="mkt-section mkt-section--tight" style={{ textAlign: "center" }}>
        <div className="mkt-container">
          <div className="mkt-eyebrow" style={{ justifyContent: "center" }}>Pricing</div>
          <h1 className="mkt-h1" style={{ marginTop: 16, fontSize: "clamp(2.25rem, 4.4vw, 3.25rem)" }}>
            One price, every engine included.
          </h1>
          <p className="mkt-body-lg" style={{ marginTop: 16, maxWidth: 540, marginInline: "auto" }}>
            No per-module upsell, no per-seat surprises. Pick the tier that
            fits how many organizations you run, upgrade the day you need
            to.
          </p>
        </div>
      </section>

      <section className="mkt-section">
        <div className="mkt-container">
          <PricingGrid packages={packages} />
        </div>
      </section>

      <section className="mkt-section mkt-section--tight">
        <div className="mkt-container">
          <div className="mkt-eyebrow mkt-eyebrow--brass">FAQ</div>
          <h2 className="mkt-h2" style={{ marginTop: 14, maxWidth: 520 }}>
            Questions worth answering up front.
          </h2>

          <div className="mkt-faq">
            {FAQS.map((f) => (
              <div key={f.q} className="mkt-faq__row">
                <h3 className="mkt-h3" style={{ fontSize: "1.0625rem" }}>{f.q}</h3>
                <p className="mkt-body" style={{ marginTop: 8, fontSize: "0.9375rem" }}>{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mkt-cta">
        <div className="mkt-container mkt-cta__inner">
          <div>
            <h2 className="mkt-h2">Still deciding?</h2>
            <p className="mkt-body-lg" style={{ marginTop: 12, maxWidth: 420 }}>
              Start free — no card required — and pick a plan once you know
              which engines you actually use.
            </p>
          </div>
          <Link href="/register" className="mkt-btn mkt-btn--primary">
            Start free trial
          </Link>
        </div>
      </section>

      <MarketingFooter />

      <style>{`
        .mkt-faq {
          margin-top: 40px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 32px 48px;
        }
        .mkt-faq__row {
          padding-top: 20px;
          border-top: 1px solid var(--mkt-line);
        }
        @media (max-width: 700px) {
          .mkt-faq { grid-template-columns: 1fr; }
        }
      `}</style>
    </MarketingShell>
  );
}
