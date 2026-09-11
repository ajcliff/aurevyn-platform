"use client";

import type { CSSProperties } from "react";

import { ENGINE_META, selectEngine, type EngineId } from "./engineData";
import { useTilt } from "./interactions";
import RevealOnScroll from "./RevealOnScroll";

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

const ENGINE_ICONS: Record<EngineId, string> = {
  pos: "🛒",
  inventory: "📦",
  finance: "💰",
  crm: "👥",
  hr: "🧑‍💼",
  security: "🛡️",
};

const CORE_THREE = new Set<EngineId>(["pos", "inventory", "finance"]);

function EngineCard({ engine }: { engine: (typeof ENGINES)[number] }) {
  const tiltRef = useTilt<HTMLButtonElement>(5);
  const meta = ENGINE_META[engine.id];
  const isCore = CORE_THREE.has(engine.id);

  return (
    <button
      ref={tiltRef}
      onClick={() => selectEngine(engine.id)}
      className={`mkt-card mkt-engine-card ${isCore ? "mkt-engine-card--core" : "mkt-engine-card--secondary"}`}
      style={{ "--engine-color": meta.color } as CSSProperties}
    >
      <span className="mkt-engine-card__spotlight" />
      <div className="mkt-engine-card__bar" />
      {isCore && <div className="mkt-tag mkt-engine-card__core-badge">Core</div>}
      <div className="mkt-engine-card__top">
        <span className="mkt-engine-card__icon" aria-hidden="true">{ENGINE_ICONS[engine.id]}</span>
        <div className="mkt-tag mkt-engine-card__tag">Engine · {engine.code}</div>
      </div>
      <h3 className="mkt-h3" style={{ marginTop: 16, fontSize: isCore ? "1.4rem" : undefined }}>{meta.label}</h3>
      <p className="mkt-body" style={{ marginTop: 10, fontSize: "0.9375rem" }}>
        {engine.desc}
      </p>
      <span className="mkt-engine-card__cta mkt-mono">See it in action →</span>
    </button>
  );
}

export default function EnginesSection() {
  const core = ENGINES.filter((e) => CORE_THREE.has(e.id));
  const secondary = ENGINES.filter((e) => !CORE_THREE.has(e.id));

  return (
    <section className="mkt-section" id="engines">
      <div className="mkt-container">
        <div className="mkt-section-head">
          <div className="mkt-eyebrow mkt-eyebrow--brass">Sheet 01 / Core engines</div>
          <h2 className="mkt-h2" style={{ marginTop: 14 }}>
            The three that make you money.
          </h2>
          <p className="mkt-body-lg" style={{ marginTop: 14, maxWidth: 620 }}>
            Sell, stock, and cashflow — the 91% — running off one shared
            core, updating each other the instant something happens at the
            till. Three more engines round out the back office, included,
            never upsold.
          </p>
        </div>

        <RevealOnScroll stagger={80} className="mkt-grid mkt-cols-3 mkt-engines-grid mkt-engines-grid--core">
          {core.map((e) => (
            <EngineCard key={e.id} engine={e} />
          ))}
        </RevealOnScroll>

        <div className="mkt-engines-secondary-head">
          <span className="mkt-mono mkt-dim">Also included, no extra cost</span>
        </div>

        <RevealOnScroll stagger={60} className="mkt-grid mkt-cols-3 mkt-engines-grid mkt-engines-grid--secondary">
          {secondary.map((e) => (
            <EngineCard key={e.id} engine={e} />
          ))}
        </RevealOnScroll>
      </div>

      <style>{`
        .mkt-engines-grid {
          margin-top: 32px;
        }
        .mkt-engines-grid--core {
          margin-top: 48px;
        }
        .mkt-engines-secondary-head {
          margin-top: 44px;
          padding-top: 20px;
          border-top: 1px solid var(--mkt-line);
          font-size: 0.75rem;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
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
          transform: perspective(900px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg));
          transition: transform 0.15s ease-out, border-color 0.2s ease, background 0.2s ease;
          width: 100%;
        }
        .mkt-engine-card--core {
          min-height: 280px;
          padding: 28px;
          border-color: var(--mkt-line-strong);
          box-shadow: 0 0 0 1px transparent, 0 24px 48px -28px var(--engine-color);
        }
        .mkt-engine-card--core:hover {
          border-color: var(--engine-color);
        }
        .mkt-engine-card--secondary {
          min-height: 172px;
          padding: 18px 20px;
          opacity: 0.88;
        }
        .mkt-engine-card--secondary:hover {
          opacity: 1;
        }
        .mkt-engine-card--secondary .mkt-engine-card__icon {
          font-size: 1.15rem;
        }
        .mkt-engine-card--secondary h3 {
          font-size: 1.05rem !important;
        }
        .mkt-engine-card--secondary .mkt-body {
          font-size: 0.8125rem !important;
        }
        .mkt-engine-card__spotlight {
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.25s ease;
          background: radial-gradient(220px circle at var(--mx, 50%) var(--my, 50%), var(--engine-color), transparent 70%);
          mix-blend-mode: screen;
          filter: opacity(0.14);
        }
        .mkt-engine-card:hover .mkt-engine-card__spotlight {
          opacity: 1;
        }
        .mkt-engine-card__bar {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: var(--engine-color);
          transform: scaleX(0.3);
          transform-origin: left;
          transition: transform 0.3s ease;
        }
        .mkt-engine-card--core .mkt-engine-card__bar {
          height: 4px;
          transform: scaleX(0.6);
        }
        .mkt-engine-card:hover .mkt-engine-card__bar {
          transform: scaleX(1);
        }
        .mkt-engine-card__core-badge {
          position: absolute;
          top: 16px;
          right: 16px;
          color: var(--mkt-brass-light);
          border-color: var(--mkt-brass);
          background: var(--mkt-ink);
        }
        .mkt-engine-card__top {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .mkt-engine-card__icon {
          font-size: 1.4rem;
          line-height: 1;
          filter: grayscale(0.3);
          transition: filter 0.25s ease, transform 0.25s ease;
        }
        .mkt-engine-card--core .mkt-engine-card__icon {
          font-size: 1.9rem;
        }
        .mkt-engine-card:hover .mkt-engine-card__icon {
          filter: grayscale(0);
          transform: scale(1.1);
        }
        .mkt-engine-card__tag {
          transition: border-color 0.25s ease, color 0.25s ease;
        }
        .mkt-engine-card:hover .mkt-engine-card__tag {
          border-color: var(--engine-color);
          color: var(--engine-color);
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
        @media (prefers-reduced-motion: reduce) {
          .mkt-engine-card {
            transform: none !important;
          }
        }
      `}</style>
    </section>
  );
}