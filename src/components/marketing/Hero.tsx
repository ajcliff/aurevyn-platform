import Link from "next/link";
import BlueprintDiagram from "./BlueprintDiagram";

export default function Hero() {
  return (
    <section className="mkt-hero">
      <div className="mkt-container mkt-hero__grid">
        <div>
          <div className="mkt-eyebrow">Business Operating System · Rev 2026</div>

          <h1 className="mkt-h1" style={{ marginTop: 18 }}>
            Every engine your
            <br />
            business runs on.
            <br />
            <span style={{ color: "var(--mkt-brass-light)" }}>One core.</span>
          </h1>

          <p className="mkt-body-lg" style={{ marginTop: 22, maxWidth: 480 }}>
            Aurevyn is a modular operating system for African businesses —
            point of sale, inventory, finance, CRM, payroll, and security
            running off a single core, configured to your industry from day
            one. No six-month rollout. No SAP consultant.
          </p>

          <div className="mkt-hero__ctas">
            <Link href="/register" className="mkt-btn mkt-btn--primary">
              Start free trial
            </Link>
            <Link href="/contact" className="mkt-btn mkt-btn--ghost">
              Talk to us
            </Link>
          </div>

          <div className="mkt-hero__stats">
            <div>
              <div className="mkt-num mkt-hero__stat-value">6</div>
              <div className="mkt-tag">Core engines</div>
            </div>
            <div className="mkt-divider" style={{ height: "auto", width: 1 }} />
            <div>
              <div className="mkt-num mkt-hero__stat-value">M-Pesa</div>
              <div className="mkt-tag">Native payments</div>
            </div>
            <div className="mkt-divider" style={{ height: "auto", width: 1 }} />
            <div>
              <div className="mkt-num mkt-hero__stat-value">24/7</div>
              <div className="mkt-tag">Threat monitoring</div>
            </div>
          </div>
        </div>

        <BlueprintDiagram />
      </div>

      <style>{`
        .mkt-hero {
          padding-top: 76px;
          padding-bottom: 100px;
          border-bottom: 1px solid var(--mkt-line);
        }
        .mkt-hero__grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
          align-items: center;
        }
        .mkt-hero__ctas {
          display: flex;
          gap: 14px;
          margin-top: 34px;
          flex-wrap: wrap;
        }
        .mkt-hero__stats {
          display: flex;
          align-items: center;
          gap: 24px;
          margin-top: 52px;
          padding-top: 28px;
          border-top: 1px solid var(--mkt-line);
        }
        .mkt-hero__stats .mkt-divider {
          background: var(--mkt-line);
          align-self: stretch;
        }
        .mkt-hero__stat-value {
          font-size: 1.375rem;
          font-weight: 600;
          color: var(--mkt-paper);
          margin-bottom: 6px;
        }
        @media (max-width: 980px) {
          .mkt-hero__grid {
            grid-template-columns: 1fr;
          }
          .mkt-hero__stats {
            gap: 18px;
          }
        }
        @media (max-width: 520px) {
          .mkt-hero__stats {
            flex-direction: column;
            align-items: flex-start;
          }
          .mkt-hero__stats .mkt-divider {
            width: 100% !important;
            height: 1px !important;
          }
        }
      `}</style>
    </section>
  );
}
