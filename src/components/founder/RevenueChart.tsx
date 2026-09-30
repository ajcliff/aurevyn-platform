"use client";

import { useId, useState } from "react";
import f from "@/styles/founder.module.css";

type Props = {
  /** One value per day, oldest first. The last value is today. */
  values: number[];
  format: (n: number) => string;
};

function compact(n: number) {
  if (n >= 1_000_000) return `KES ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `KES ${Math.round(n / 1_000)}K`;
  return `KES ${Math.round(n)}`;
}

function dayLabel(index: number, total: number) {
  const d = new Date();
  d.setDate(d.getDate() - (total - 1 - index));
  return d.toLocaleDateString("en-KE", { day: "numeric", month: "short" });
}

export default function RevenueChart({ values, format }: Props) {
  const gradId = useId();
  const [active, setActive] = useState<number | null>(null);
  const n = values.length;
  const max = Math.max(...values, 0);

  if (n < 2 || max === 0) {
    return (
      <div className={f.chartEmpty}>
        No payments in this period yet. Daily totals appear here as organizations take payments.
      </div>
    );
  }

  const W = 100;
  const H = 100;
  const x = (i: number) => (i / (n - 1)) * W;
  const y = (v: number) => H - 6 - (v / max) * (H - 12);
  const line = values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(v)}`).join(" ");
  const area = `${line} L${W},${H} L0,${H} Z`;

  const setFromPointer = (clientX: number, el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    setActive(Math.round(ratio * (n - 1)));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") setActive(a => Math.max(0, (a ?? n) - 1));
    else if (e.key === "ArrowRight") setActive(a => Math.min(n - 1, (a ?? -1) + 1));
    else if (e.key === "Escape") setActive(null);
  };

  const leftPct = active === null ? 0 : (active / (n - 1)) * 100;
  const topPct = active === null ? 0 : y(values[active]);

  return (
    <div>
      <div
        className={f.chart}
        tabIndex={0}
        role="img"
        aria-label={`Daily payments over the last ${n} days. Highest day ${format(max)}. Use left and right arrow keys to read each day.`}
        onMouseMove={e => setFromPointer(e.clientX, e.currentTarget)}
        onTouchMove={e => setFromPointer(e.touches[0].clientX, e.currentTarget)}
        onMouseLeave={() => setActive(null)}
        onBlur={() => setActive(null)}
        onKeyDown={onKeyDown}
      >
        <span className={f.axisMax}>{compact(max)}</span>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" style={{ stopColor: "var(--gold)", stopOpacity: 0.28 }} />
              <stop offset="100%" style={{ stopColor: "var(--gold)", stopOpacity: 0 }} />
            </linearGradient>
          </defs>
          {[6, 39, 72, 100].map(gy => (
            <line key={gy} className={f.gridLine} x1="0" x2={W} y1={gy} y2={gy} />
          ))}
          <path d={area} fill={`url(#${gradId})`} />
          <path d={line} className={f.line} />
        </svg>

        {active !== null && (
          <>
            <span className={f.cursor} style={{ left: `${leftPct}%` }} />
            <span className={f.cursorDot} style={{ left: `${leftPct}%`, top: `${topPct}%` }} />
            <span className={f.tip} style={{ left: `${Math.min(88, Math.max(12, leftPct))}%` }}>
              {dayLabel(active, n)} · <b>{format(values[active])}</b>
            </span>
          </>
        )}
      </div>
      <div className={f.axisX} aria-hidden="true">
        <span>{dayLabel(0, n)}</span>
        <span>{dayLabel(Math.floor((n - 1) / 2), n)}</span>
        <span>Today</span>
      </div>
    </div>
  );
}