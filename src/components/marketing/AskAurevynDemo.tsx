"use client";

import { useState } from "react";

const PROMPTS = [
  {
    q: "What's today's revenue across branches?",
    a: "KSh 812,400 across 4 branches today — up 12% from last Thursday. Mombasa branch is leading at KSh 260,100.",
  },
  {
    q: "Which items are running low?",
    a: "3 items need reordering: Cooking oil 1L (18 units), Bread family pack (6 units), Rice 5kg (22 units). Want a purchase order drafted?",
  },
  {
    q: "Any security alerts this week?",
    a: "One flagged: an unusual login time at the Mombasa branch, 41 minutes ago. No confirmed breaches — everything else is clear.",
  },
];

export default function AskAurevynDemo() {
  const [active, setActive] = useState<number | null>(null);
  const [thinking, setThinking] = useState(false);

  const ask = (i: number) => {
    setThinking(true);
    setActive(null);
    window.setTimeout(() => {
      setThinking(false);
      setActive(i);
    }, 550);
  };

  return (
    <section className="mkt-section mkt-section--tight">
      <div className="mkt-container">
        <div className="mkt-eyebrow mkt-eyebrow--brass">Sheet 04 / Ask Aurevyn</div>
        <h2 className="mkt-h2" style={{ marginTop: 14, maxWidth: 560 }}>
          Ask your business a question. Get a straight answer.
        </h2>
        <p className="mkt-body-lg" style={{ marginTop: 14, maxWidth: 540 }}>
          Ask Aurevyn already knows your data — no dashboards to dig through.
          Try one of these (preview, not live):
        </p>

        <div className="mkt-card mkt-ask">
          <div className="mkt-ask__log">
            {active === null && !thinking && (
              <p className="mkt-dim mkt-mono" style={{ fontSize: "0.8125rem" }}>
                Pick a question below to see a sample answer.
              </p>
            )}
            {thinking && (
              <div className="mkt-ask__thinking">
                <span /><span /><span />
              </div>
            )}
            {active !== null && !thinking && (
              <div className="mkt-ask__bubble">
                <div className="mkt-tag" style={{ marginBottom: 8 }}>Ask Aurevyn</div>
                <p style={{ fontSize: "0.9375rem", lineHeight: 1.6 }}>{PROMPTS[active].a}</p>
              </div>
            )}
          </div>

          <div className="mkt-ask__prompts">
            {PROMPTS.map((p, i) => (
              <button key={p.q} onClick={() => ask(i)} className="mkt-ask__chip">
                {p.q}
              </button>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .mkt-ask {
          margin-top: 40px;
          max-width: 640px;
        }
        .mkt-ask__log {
          min-height: 96px;
          display: flex;
          align-items: center;
        }
        .mkt-ask__bubble {
          border-left: 2px solid var(--mkt-brass);
          padding-left: 16px;
          width: 100%;
        }
        .mkt-ask__thinking {
          display: flex;
          gap: 5px;
        }
        .mkt-ask__thinking span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--mkt-blueprint);
          animation: mkt-bounce 1s ease-in-out infinite;
        }
        .mkt-ask__thinking span:nth-child(2) { animation-delay: 0.15s; }
        .mkt-ask__thinking span:nth-child(3) { animation-delay: 0.3s; }
        @keyframes mkt-bounce {
          0%, 100% { opacity: 0.3; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(-3px); }
        }
        .mkt-ask__prompts {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid var(--mkt-line);
        }
        .mkt-ask__chip {
          background: var(--mkt-ink-2);
          border: 1px solid var(--mkt-line-strong);
          color: var(--mkt-paper-dim);
          font-size: 0.8125rem;
          padding: 9px 14px;
          cursor: pointer;
          transition: border-color 0.15s ease, color 0.15s ease;
        }
        .mkt-ask__chip:hover {
          border-color: var(--mkt-blueprint);
          color: var(--mkt-paper);
        }
      `}</style>
    </section>
  );
}
