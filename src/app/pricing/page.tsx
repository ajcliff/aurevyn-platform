"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getPublicPricing, type PricedEngine } from "@/lib/pricing";
import MarketingShell from "@/components/marketing/MarketingShell";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import PricingGrid from "@/components/marketing/PricingGrid";

const FAQS = [
  {
    q: "Do I have to buy every engine?",
    a: "No. During your free trial every engine is unlocked. When it ends you choose which engines to keep and how many seats each needs — you only pay for those.",
  },
  {
    q: "What is a seat?",
    a: "One seat is one team member using one engine. Five people on Point of Sale and two on Finance means a 5-seat POS license and a 2-seat Finance license.",
  },
  {
    q: "Can I change seats later?",
    a: "Anytime from your Engines page. Your data stays exactly where it is.",
  },
  {
    q: "How do payments work?",
    a: "M-Pesa, bank transfer, cash and cheque payments are recorded in POS and reconciled into Finance. We issue numbered invoices and receipts for your subscription.",
  },
  {
    q: "What happens after my free trial?",
    a: "You choose your engines and seats and keep going with everything already set up. Nothing is deleted, and there's no forced migration.",
  },
];

export default function PricingPage() {
  const [engines, setEngines] = useState<PricedEngine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPublicPricing().then(setEngines).finally(() => setLoading(false));
  }, []);

  return (
    <MarketingShell>
      <MarketingNav />

      <section className="mkt-section mkt-section--tight" style={{ textAlign: "center" }}>
        <div className="mkt-container">
          <div className="mkt-eyebrow" style={{ justifyContent: "center" }}>Pricing</div>
          <h1 className="mkt-h1" style={{ marginTop: 16, fontSize: "clamp(2.25rem, 4.4vw, 3.25rem)" }}>
            Pay only for the engines you use.
          </h1>
          <p className="mkt-body-lg" style={{ marginTop: 16, maxWidth: 540, marginInline: "auto" }}>
            Every engine is priced by seats — the number of people who use
            it. Run your till on Point of Sale, add Finance when you need
            the books, and leave the rest switched off.
          </p>
        </div>
      </section>

      <section className="mkt-section">
        <div className="mkt-container">
          <PricingGrid engines={engines} loading={loading} />
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
