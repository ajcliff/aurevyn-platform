"use client";

import { useEffect, useState } from "react";

export default function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const pct = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
      setProgress(Math.min(100, Math.max(0, pct)));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="mkt-scroll-progress" aria-hidden="true">
      <div className="mkt-scroll-progress__bar" style={{ width: `${progress}%` }}>
        <span className="mkt-scroll-progress__glow" />
      </div>
      <style>{`
        .mkt-scroll-progress {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          z-index: 60;
          background: transparent;
        }
        .mkt-scroll-progress__bar {
          position: relative;
          height: 100%;
          background: linear-gradient(to right, var(--mkt-blueprint), var(--mkt-brass));
          transition: width 0.12s ease-out;
        }
        .mkt-scroll-progress__glow {
          position: absolute;
          right: -6px;
          top: 50%;
          transform: translateY(-50%);
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: var(--mkt-brass-light);
          box-shadow: 0 0 10px 2px var(--mkt-brass-glow), 0 0 3px 1px var(--mkt-brass-light);
          opacity: 0.9;
        }
        @media (prefers-reduced-motion: reduce) {
          .mkt-scroll-progress__bar { transition: none; }
        }
      `}</style>
    </div>
  );
}