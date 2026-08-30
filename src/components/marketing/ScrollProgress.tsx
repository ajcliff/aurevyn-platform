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
      <div className="mkt-scroll-progress__bar" style={{ width: `${progress}%` }} />
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
          height: 100%;
          background: linear-gradient(to right, var(--mkt-blueprint), var(--mkt-brass));
          transition: width 0.1s linear;
        }
      `}</style>
    </div>
  );
}
