"use client";

import type { CSSProperties } from "react";

import { ENGINE_META, selectEngine, type EngineId } from "./engineData";

const ENGINES: { id: EngineId; code: string; desc: string }[] = [
  {
    id: "pos",
    code: "01",
    desc: "Ring up sales, split payments, and take M-Pesa at the till — online or offline, synced the moment you're back on signal.",
  },
  {
    id: "inventory",
    code: "02",
    desc: "Stock levels, transfers, and reorder alerts across every warehouse and till, updated in real time as sales happen.",
  },
  {
    id: "finance",
    code: "03",
    desc: "Cashflow, expenses, and transactions roll up automatically from every other engine — no month-end reconciliation scramble.",
  },
  {
    id: "crm",
    code: "04",
    desc: "Every customer, order, and conversation in one record, so the person on the phone knows what the person at the till sold.",
  },
  {
    id: "hr",
    code: "05",
    desc: "Staff records, shifts, and payroll runs that stay in step with the sales and hours actually logged on the floor.",
  },
  {
    id: "security",
    code: "06",
    desc: "Live threat monitoring and anomaly detection across your organization, watching for the patterns that precede fraud.",
  },
];

export default function EnginesSection() {
  return (
    <section className="mkt-section" id="engines">
      <div className="mkt-container">
        <div className="mkt-section-head">
          <div className="mkt-eyebrow">Sheet 01 / Engines</div>
          <h2 className="mkt-h2" style={{ marginTop: 14 }}>
            Six engines. One shared core.
          </h2>
          <p className="mkt-body-lg" style={{ marginTop: 14, maxWidth: 620 }}>
            Every engine reads and writes to the same core — sell something
            at the till and inventory, finance, and CRM all update in the
            same instant. Click one to see it in action.
          </p>
        </div>

        <div className="mkt-grid mkt-cols-3" style={{ marginTop: 48 }}>
          {ENGINES.map((e) => {
            const meta = ENGINE_META[e.id];
            return (
              <button
                key={e.id}
                onClick={() => selectEngine(e.id)}
                className="mkt-card mkt-engine-card"
                style={{ "--engine-color": meta.color } as CSSProperties}
              >
                <div className="mkt-engine-card__bar" />
                <div className="mkt-tag">Engine · {e.code}</div>
                <h3 className="mkt-h3" style={{ marginTop: 16 }}>{meta.label}</h3>
                <p className="mkt-body" style={{ marginTop: 10, fontSize: "0.9375rem" }}>
                  {e.desc}
                </p>
                <span className="mkt-engine-card__cta mkt-mono">See it in action →</span>
              </button>
            );
          })}
        </div>
      </div>

      <style>{`
        .mkt-engine-card {
          min-height: 230px;
          display: flex;
          flex-direction: column;
          text-align: left;
          cursor: pointer;
          font-family: var(--mkt-font-sans);
          color: inherit;
          position: relative;
          overflow: hidden;
        }
        .mkt-engine-card__bar {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: var(--engine-color);
        }
        .mkt-engine-card__cta {
          margin-top: auto;
          padding-top: 14px;
          font-size: 0.75rem;
          color: var(--engine-color);
          opacity: 0;
          transform: translateX(-4px);
          transition: opacity 0.15s ease, transform 0.15s ease;
        }
        .mkt-engine-card:hover .mkt-engine-card__cta {
          opacity: 1;
          transform: translateX(0);
        }
      `}</style>
    </section>
  );
}
