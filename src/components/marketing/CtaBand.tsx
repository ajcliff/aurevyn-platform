"use client";

import Link from "next/link";
import { useMagnetic } from "./interactions";

export default function CtaBand() {
  const primaryRef = useMagnetic<HTMLAnchorElement>(0.3);
  const ghostRef = useMagnetic<HTMLAnchorElement>(0.3);

  return (
    <section className="mkt-cta">
      <div className="mkt-cta__glow" aria-hidden="true" />
      <div className="mkt-container mkt-cta__inner">
        <div>
          <div className="mkt-eyebrow mkt-eyebrow--brass">Sheet 08 / Get started</div>
          <h2 className="mkt-h2" style={{ marginTop: 14 }}>
            Bring your business onto one core.
          </h2>
          <p className="mkt-body-lg" style={{ marginTop: 12, maxWidth: 460 }}>
            Set up your first engine in minutes. No card required to start.
          </p>
        </div>
        <div className="mkt-cta__ctas">
          <Link ref={primaryRef} href="/register" className="mkt-btn mkt-btn--primary mkt-btn--magnetic">
            Start free trial
          </Link>
          <Link ref={ghostRef} href="/contact" className="mkt-btn mkt-btn--ghost mkt-btn--magnetic">
            Talk to us
          </Link>
        </div>
      </div>

      <style>{`
        .mkt-cta {
          position: relative;
          padding-block: 100px;
          border-bottom: 1px solid var(--mkt-line);
          overflow: hidden;
        }
        .mkt-cta__glow {
          position: absolute;
          top: 50%;
          left: 12%;
          width: 480px;
          height: 480px;
          transform: translateY(-50%);
          background: radial-gradient(circle, var(--mkt-brass-glow), transparent 70%);
          pointer-events: none;
          animation: mkt-cta-glow-drift 10s ease-in-out infinite;
        }
        @keyframes mkt-cta-glow-drift {
          0%, 100% { transform: translateY(-50%) translateX(0) scale(1); opacity: 0.7; }
          50% { transform: translateY(-46%) translateX(30px) scale(1.08); opacity: 1; }
        }
        .mkt-cta__inner {
          position: relative;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 32px;
          flex-wrap: wrap;
        }
        .mkt-cta__ctas {
          display: flex;
          gap: 14px;
          flex-wrap: wrap;
        }
        .mkt-btn--magnetic {
          will-change: transform;
          transition: transform 0.15s ease-out, border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
        }
        @media (prefers-reduced-motion: reduce) {
          .mkt-cta__glow { animation: none; }
        }
      `}</style>
    </section>
  );
}