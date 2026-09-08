"use client";

import type { ReactNode } from "react";
import RevealOnScroll from "./RevealOnScroll";
import { useTilt } from "./interactions";

function AiIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="mkt-proof-icon">
      <rect x="9" y="9" width="14" height="14" stroke="var(--mkt-brass)" strokeWidth="1.3" />
      <circle cx="13" cy="13" r="1.4" fill="var(--mkt-brass)" />
      <circle cx="19" cy="13" r="1.4" fill="var(--mkt-brass)" />
      <path d="M12 19h8" stroke="var(--mkt-brass)" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M16 2v7M16 23v7M2 16h7M23 16h7" stroke="var(--mkt-brass)" strokeWidth="1" opacity="0.4" />
    </svg>
  );
}

function MpesaIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="mkt-proof-icon">
      <rect x="10" y="4" width="12" height="24" rx="1.5" stroke="var(--mkt-signal)" strokeWidth="1.3" />
      <line x1="10" y1="22" x2="22" y2="22" stroke="var(--mkt-signal)" strokeWidth="1" opacity="0.5" />
      <circle cx="16" cy="25" r="1.3" fill="var(--mkt-signal)" />
      <path d="M13 11l2 3 4-5" stroke="var(--mkt-signal)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="mkt-proof-icon">
      <path d="M16 4l10 4v8c0 7-4.5 10.5-10 12-5.5-1.5-10-5-10-12V8l10-4z" stroke="var(--mkt-alert)" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M12 16l3 3 6-6" stroke="var(--mkt-alert)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ProofCard({ children }: { children: ReactNode }) {
  const ref = useTilt<HTMLDivElement>(4);
  return (
    <div ref={ref} className="mkt-card mkt-proof-card">
      <span className="mkt-proof-card__spotlight" />
      {children}
    </div>
  );
}

export default function ProofSection() {
  return (
    <section className="mkt-section mkt-section--tight">
      <div className="mkt-container">
        <div className="mkt-eyebrow">Sheet 06 / Built in</div>
        <h2 className="mkt-h2" style={{ marginTop: 14, maxWidth: 600 }}>
          The parts other platforms sell as add-ons.
        </h2>

        <RevealOnScroll stagger={90} className="mkt-grid mkt-cols-3 mkt-proof-grid">
          <ProofCard>
            <AiIcon />
            <div className="mkt-badge-live" style={{ marginTop: 14 }}>Live</div>
            <h3 className="mkt-h3" style={{ marginTop: 12 }}>Ask Aurevyn</h3>
            <p className="mkt-body" style={{ marginTop: 10, fontSize: "0.9375rem" }}>
              An AI copilot that already knows your business — ask it for a
              revenue summary, which branches need attention, or what's
              expiring this week, in plain language.
            </p>
          </ProofCard>

          <ProofCard>
            <MpesaIcon />
            <div className="mkt-tag" style={{ marginTop: 14 }}>M-Pesa</div>
            <h3 className="mkt-h3" style={{ marginTop: 12 }}>Native mobile money</h3>
            <p className="mkt-body" style={{ marginTop: 10, fontSize: "0.9375rem" }}>
              STK push at checkout, reconciled straight into finance. Not a
              plugin someone bolted on — it's how the till was built to take
              payment from day one.
            </p>
          </ProofCard>

          <ProofCard>
            <ShieldIcon />
            <div className="mkt-tag" style={{ marginTop: 14 }}>Security</div>
            <h3 className="mkt-h3" style={{ marginTop: 12 }}>Threat monitoring</h3>
            <p className="mkt-body" style={{ marginTop: 10, fontSize: "0.9375rem" }}>
              Every organization is watched for the access patterns that
              precede fraud and breach attempts — a security team, running
              quietly in the background.
            </p>
          </ProofCard>
        </RevealOnScroll>
      </div>

      <style>{`
        .mkt-proof-grid {
          margin-top: 44px;
        }
        .mkt-proof-card {
          position: relative;
          overflow: hidden;
          transform: perspective(900px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg));
          transition: transform 0.15s ease-out, border-color 0.2s ease, background 0.2s ease;
        }
        .mkt-proof-card__spotlight {
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.25s ease;
          background: radial-gradient(200px circle at var(--mx, 50%) var(--my, 50%), var(--mkt-blueprint-glow), transparent 70%);
          mix-blend-mode: screen;
        }
        .mkt-proof-card:hover .mkt-proof-card__spotlight {
          opacity: 1;
        }
        .mkt-proof-icon {
          transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .mkt-proof-card:hover .mkt-proof-icon {
          transform: scale(1.12) rotate(-4deg);
        }
        @media (prefers-reduced-motion: reduce) {
          .mkt-proof-card { transform: none !important; }
          .mkt-proof-icon { transition: none; }
        }
      `}</style>
    </section>
  );
}