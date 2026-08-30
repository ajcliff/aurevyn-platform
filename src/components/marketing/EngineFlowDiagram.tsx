"use client";

import type { CSSProperties } from "react";

import { ENGINE_META, selectEngine, type EngineId } from "./engineData";

const FLOW: { id: EngineId; caption: string }[] = [
  { id: "pos", caption: "Sale rings up at the till" },
  { id: "inventory", caption: "Stock decrements instantly" },
  { id: "finance", caption: "Revenue posts to cashflow" },
  { id: "crm", caption: "Customer record updates" },
];

export default function EngineFlowDiagram() {
  return (
    <section className="mkt-section mkt-section--tight">
      <div className="mkt-container">
        <div className="mkt-eyebrow">Sheet 02.5 / How it flows</div>
        <h2 className="mkt-h2" style={{ marginTop: 14, maxWidth: 560 }}>
          One sale. Four engines. Same instant.
        </h2>
        <p className="mkt-body-lg" style={{ marginTop: 14, maxWidth: 540 }}>
          There's no sync job running in the background — there's nothing to
          sync. Every engine reads from the same core, so this is what
          actually happens the moment a sale is rung up.
        </p>

        <div className="mkt-flow">
          {FLOW.map((step, i) => {
            const meta = ENGINE_META[step.id];
            return (
              <div className="mkt-flow__item" key={step.id}>
                <button
                  className="mkt-flow__node"
                  style={{ "--engine-color": meta.color } as CSSProperties}
                  onClick={() => selectEngine(step.id)}
                >
                  <span className="mkt-flow__node-label mkt-mono">{meta.label}</span>
                </button>
                <p className="mkt-flow__caption">{step.caption}</p>

                {i < FLOW.length - 1 && (
                  <div className="mkt-flow__connector" style={{ "--engine-color": meta.color } as CSSProperties}>
                    <span className="mkt-flow__dot" style={{ animationDelay: "0s" }} />
                    <span className="mkt-flow__dot" style={{ animationDelay: "0.5s" }} />
                    <span className="mkt-flow__dot" style={{ animationDelay: "1s" }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        .mkt-flow {
          margin-top: 52px;
          display: flex;
          align-items: flex-start;
        }
        .mkt-flow__item {
          display: flex;
          align-items: flex-start;
          flex: 1;
          position: relative;
        }
        .mkt-flow__item:last-child {
          flex: 0 0 auto;
        }
        .mkt-flow__node {
          width: 96px;
          height: 96px;
          flex-shrink: 0;
          background: var(--mkt-surface);
          border: 1px solid var(--mkt-line-strong);
          border-top: 3px solid var(--engine-color);
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          cursor: pointer;
          transition: border-color 0.15s ease, background 0.15s ease;
        }
        .mkt-flow__node:hover {
          background: var(--mkt-surface-raised);
          border-color: var(--engine-color);
        }
        .mkt-flow__node-label {
          font-size: 0.75rem;
          letter-spacing: 0.04em;
          color: var(--mkt-paper);
          padding: 0 8px;
        }
        .mkt-flow__caption {
          position: absolute;
          top: 106px;
          left: 0;
          width: 96px;
          font-size: 0.75rem;
          color: var(--mkt-paper-faint);
          line-height: 1.4;
          text-align: center;
        }
        .mkt-flow__connector {
          position: relative;
          flex: 1;
          height: 1px;
          background: var(--mkt-line);
          margin-top: 48px;
          margin-inline: 4px;
        }
        .mkt-flow__dot {
          position: absolute;
          top: 50%;
          left: 0;
          width: 6px;
          height: 6px;
          margin-top: -3px;
          border-radius: 50%;
          background: var(--engine-color);
          box-shadow: 0 0 6px var(--engine-color);
          animation: mkt-flow-travel 1.5s linear infinite;
        }
        @keyframes mkt-flow-travel {
          0% { left: 0; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { left: 100%; opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .mkt-flow__dot { animation: none; opacity: 0.6; left: 50%; }
        }
        @media (max-width: 760px) {
          .mkt-flow {
            flex-direction: column;
            align-items: stretch;
            gap: 36px;
          }
          .mkt-flow__item {
            flex-direction: column;
          }
          .mkt-flow__caption {
            position: static;
            width: auto;
            text-align: left;
            margin-top: 10px;
          }
          .mkt-flow__connector {
            display: none;
          }
        }
      `}</style>
    </section>
  );
}
