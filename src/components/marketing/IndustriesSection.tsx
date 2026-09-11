"use client";

import { useState } from "react";
import Link from "next/link";

const BLUEPRINTS = [
  {
    industry: "Retail",
    detail: "POS, inventory, and pricelists tuned for multi-branch shops and franchises.",
    accent: "var(--mkt-blueprint)",
    accentGlow: "var(--mkt-blueprint-glow)",
    configured: [
      "Barcode-ready POS with split payment and M-Pesa till reconciliation",
      "Multi-branch stock levels with automatic reorder alerts",
      "Loyalty points and customer purchase history",
    ],
  },
  {
    industry: "Healthcare",
    detail: "Patient records, appointments, and billing configured around clinic workflows.",
    accent: "var(--mkt-brass-light)",
    accentGlow: "var(--mkt-brass-glow)",
    configured: [
      "Patient records with visit history and prescriptions",
      "Appointment scheduling by provider and room",
      "Insurance and cash billing in one ledger",
    ],
  },
  {
    industry: "Education",
    detail: "Enrollment, fees, and staff payroll set up the way a school actually runs.",
    accent: "var(--mkt-blueprint)",
    accentGlow: "var(--mkt-blueprint-glow)",
    configured: [
      "Student enrollment and term-based fee tracking",
      "Staff payroll aligned to the academic calendar",
      "Per-term and per-class reporting",
    ],
  },
  {
    industry: "Distribution",
    detail: "Warehousing, transfers, and route-level reporting across multiple sites.",
    accent: "var(--mkt-brass-light)",
    accentGlow: "var(--mkt-brass-glow)",
    configured: [
      "Warehouse-to-warehouse stock transfers",
      "Route-level delivery and sales reporting",
      "Supplier ledger and bulk order management",
    ],
  },
];

export default function IndustriesSection() {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <section className="mkt-section mkt-section--tight" id="industries">
      <div className="mkt-container">
        <div className="mkt-industries__head">
          <div>
            <div className="mkt-eyebrow mkt-eyebrow--brass">Sheet 02 / Blueprints</div>
            <h2 className="mkt-h2" style={{ marginTop: 14 }}>
              Configured for your industry, not a blank canvas.
            </h2>
          </div>
          <p className="mkt-body" style={{ maxWidth: 360 }}>
            A blueprint is a pre-wired set of engines, fields, and reports
            for how your industry actually operates. Click one to see what's
            already set up.
          </p>
        </div>

        <div className="mkt-industries__list">
          {BLUEPRINTS.map((b, i) => {
            const isOpen = open === b.industry;
            return (
              <div
                key={b.industry}
                className="mkt-industries__block"
                style={{
                  ["--ind-accent" as string]: b.accent,
                  ["--ind-glow" as string]: b.accentGlow,
                }}
              >
                <button
                  className={`mkt-industries__row ${isOpen ? "mkt-industries__row--open" : ""}`}
                  onClick={() => setOpen(isOpen ? null : b.industry)}
                  aria-expanded={isOpen}
                >
                  <span className="mkt-industries__dot" />
                  <span className="mkt-mono mkt-dim mkt-industries__index">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="mkt-h3" style={{ fontSize: "1.25rem" }}>{b.industry}</span>
                  <span className="mkt-body" style={{ fontSize: "0.9375rem" }}>{b.detail}</span>
                  <span className={`mkt-industries__chevron ${isOpen ? "mkt-industries__chevron--open" : ""}`}>▾</span>
                </button>

                <div className="mkt-industries__detail-wrap" style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}>
                  <div className="mkt-industries__detail-inner">
                    <div className="mkt-industries__detail">
                      <div className="mkt-tag mkt-industries__tag" style={{ marginBottom: 12 }}>Pre-configured for you</div>
                      <ul className="mkt-industries__ul">
                        {b.configured.map((c) => (
                          <li key={c}>{c}</li>
                        ))}
                      </ul>
                      <Link href="/register" className="mkt-btn mkt-btn--ghost mkt-btn--sm" style={{ marginTop: 14 }}>
                        Start with the {b.industry} blueprint
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        .mkt-industries__head {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 32px;
          flex-wrap: wrap;
        }
        .mkt-industries__list {
          margin-top: 44px;
          border-top: 1px solid var(--mkt-line);
        }
        .mkt-industries__block {
          border-bottom: 1px solid var(--mkt-line);
        }
        .mkt-industries__row {
          all: unset;
          box-sizing: border-box;
          width: 100%;
          display: grid;
          grid-template-columns: 4px 52px 200px 1fr 24px;
          align-items: center;
          gap: 20px;
          padding: 22px 0;
          cursor: pointer;
          transition: background 0.2s ease;
        }
        .mkt-industries__row:hover,
        .mkt-industries__row--open {
          background: var(--ind-glow);
        }
        .mkt-industries__dot {
          width: 4px;
          height: 28px;
          background: var(--mkt-line-strong);
          transition: background 0.25s ease, box-shadow 0.25s ease;
        }
        .mkt-industries__row:hover .mkt-industries__dot,
        .mkt-industries__row--open .mkt-industries__dot {
          background: var(--ind-accent);
          box-shadow: 0 0 12px var(--ind-glow);
        }
        .mkt-industries__index {
          font-size: 0.8125rem;
        }
        .mkt-industries__chevron {
          color: var(--mkt-paper-faint);
          transition: transform 0.2s ease, color 0.2s ease;
          justify-self: end;
        }
        .mkt-industries__chevron--open {
          transform: rotate(180deg);
          color: var(--ind-accent);
        }
        .mkt-industries__detail-wrap {
          display: grid;
          transition: grid-template-rows 0.35s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .mkt-industries__detail-inner {
          overflow: hidden;
        }
        .mkt-industries__detail {
          padding: 0 0 28px 96px;
        }
        .mkt-industries__tag {
          color: var(--ind-accent);
          border-color: var(--ind-accent);
        }
        .mkt-industries__ul {
          margin: 0;
          padding: 0;
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .mkt-industries__ul li {
          font-size: 0.875rem;
          color: var(--mkt-paper-dim);
          padding-left: 16px;
          position: relative;
        }
        .mkt-industries__ul li::before {
          content: "";
          position: absolute;
          left: 0;
          top: 8px;
          width: 5px;
          height: 5px;
          background: var(--ind-accent);
        }
        @media (max-width: 700px) {
          .mkt-industries__row {
            grid-template-columns: 4px 28px 1fr 20px;
            grid-template-rows: auto auto;
          }
          .mkt-industries__row .mkt-body {
            grid-column: 3 / -1;
          }
          .mkt-industries__detail {
            padding-left: 52px;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .mkt-industries__detail-wrap {
            transition: none;
          }
        }
      `}</style>
    </section>
  );
}