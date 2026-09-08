"use client";

import Link from "next/link";
import { useRef, type MouseEvent } from "react";
import BlueprintDiagram from "./BlueprintDiagram";
import { useMagnetic, useCountUp } from "./interactions";

function Stat({ value, label }: { value: string; label: string }) {
  const { ref, display } = useCountUp(value);
  return (
    <div>
      <div className="mkt-num mkt-hero__stat-value">
        <span ref={ref}>{display}</span>
      </div>
      <div className="mkt-tag">{label}</div>
    </div>
  );
}

export default function Hero() {
  const diagramWrapRef = useRef<HTMLDivElement>(null);
  const primaryCtaRef = useMagnetic<HTMLAnchorElement>(0.25);
  const ghostCtaRef = useMagnetic<HTMLAnchorElement>(0.25);

  const handleDiagramMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = diagramWrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(1200px) rotateY(${px * 6}deg) rotateX(${-py * 6}deg)`;
  };

  const resetDiagram = () => {
    const el = diagramWrapRef.current;
    if (el) el.style.transform = "perspective(1200px) rotateY(0deg) rotateX(0deg)";
  };

  return (
    <section className="mkt-hero">
      <div className="mkt-container mkt-hero__grid">
        <div>
          <div className="mkt-eyebrow mkt-hero__eyebrow">Business Operating System · Rev 2026</div>

          <h1 className="mkt-h1 mkt-hero__headline" style={{ marginTop: 18 }}>
            <span className="mkt-hero__line">
              <span style={{ transitionDelay: "0ms" }}>Every</span>{" "}
              <span style={{ transitionDelay: "60ms" }}>engine</span>{" "}
              <span style={{ transitionDelay: "120ms" }}>your</span>
            </span>
            <br />
            <span className="mkt-hero__line">
              <span style={{ transitionDelay: "180ms" }}>business</span>{" "}
              <span style={{ transitionDelay: "240ms" }}>runs</span>{" "}
              <span style={{ transitionDelay: "300ms" }}>on.</span>
            </span>
            <br />
            <span className="mkt-hero__line">
              <span style={{ transitionDelay: "380ms", color: "var(--mkt-brass-light)" }}>One core.</span>
            </span>
          </h1>

          <p className="mkt-body-lg mkt-hero__fade-in" style={{ marginTop: 22, maxWidth: 480, transitionDelay: "460ms" }}>
            Aurevyn is a modular operating system for African businesses —
            point of sale, inventory, finance, CRM, payroll, and security
            running off a single core, configured to your industry from day
            one. No six-month rollout. No SAP consultant.
          </p>

          <div className="mkt-hero__ctas mkt-hero__fade-in" style={{ transitionDelay: "520ms" }}>
            <Link ref={primaryCtaRef} href="/register" className="mkt-btn mkt-btn--primary mkt-btn--magnetic">
              Start free trial
            </Link>
            <Link ref={ghostCtaRef} href="/contact" className="mkt-btn mkt-btn--ghost mkt-btn--magnetic">
              Talk to us
            </Link>
          </div>

          <div className="mkt-hero__stats mkt-hero__fade-in" style={{ transitionDelay: "580ms" }}>
            <Stat value="6" label="Core engines" />
            <div className="mkt-divider" style={{ height: "auto", width: 1 }} />
            <Stat value="M-Pesa" label="Native payments" />
            <div className="mkt-divider" style={{ height: "auto", width: 1 }} />
            <Stat value="24/7" label="Threat monitoring" />
          </div>
        </div>

        <div
          ref={diagramWrapRef}
          className="mkt-hero__diagram-wrap"
          onMouseMove={handleDiagramMove}
          onMouseLeave={resetDiagram}
        >
          <BlueprintDiagram />
        </div>
      </div>

      <style>{`
        .mkt-hero {
          padding-top: 76px;
          padding-bottom: 100px;
          border-bottom: 1px solid var(--mkt-line);
          overflow: hidden;
        }
        .mkt-hero__grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
          align-items: center;
        }
        .mkt-hero__eyebrow {
          opacity: 0;
          animation: mkt-fade-up 0.6s ease forwards;
        }
        .mkt-hero__headline {
          overflow: hidden;
        }
        .mkt-hero__line span {
          display: inline-block;
          opacity: 0;
          transform: translateY(100%);
          animation: mkt-word-in 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .mkt-hero__fade-in {
          opacity: 0;
          animation: mkt-fade-up 0.7s ease forwards;
        }
        @keyframes mkt-fade-up {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes mkt-word-in {
          from { opacity: 0; transform: translateY(100%); }
          to { opacity: 1; transform: translateY(0); }
        }
        .mkt-hero__ctas {
          display: flex;
          gap: 14px;
          margin-top: 34px;
          flex-wrap: wrap;
        }
        .mkt-btn--magnetic {
          will-change: transform;
          transition: transform 0.15s ease-out, border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
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
          min-width: 1ch;
          display: inline-block;
        }
        .mkt-hero__diagram-wrap {
          transition: transform 0.25s ease-out;
          transform-style: preserve-3d;
        }
        @media (max-width: 980px) {
          .mkt-hero__grid {
            grid-template-columns: 1fr;
          }
          .mkt-hero__stats {
            gap: 18px;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .mkt-hero__line span,
          .mkt-hero__fade-in,
          .mkt-hero__eyebrow {
            animation: none;
            opacity: 1;
            transform: none;
          }
          .mkt-hero__diagram-wrap {
            transition: none;
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