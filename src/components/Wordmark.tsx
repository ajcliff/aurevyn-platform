"use client";

import type { CSSProperties } from "react";

// The AUREVYN mark: an "A" drawn as a blue peak with a gold crossbar (a ledger line),
// next to the name in widely spaced capitals.
const SIZE_MAP: Record<"sm" | "md" | "lg", { font: string; mark: number; gap: number; tracking: string }> = {
  sm: { font: "0.95rem", mark: 22, gap: 9, tracking: "0.16em" },
  md: { font: "1.15rem", mark: 28, gap: 11, tracking: "0.16em" },
  lg: { font: "clamp(1.75rem, 5.2vw, 2.6rem)", mark: 46, gap: 16, tracking: "0.14em" },
};

export default function Wordmark({
  size = "md",
  accent = "var(--mkt-blueprint)",
  className,
}: {
  size?: "sm" | "md" | "lg";
  accent?: string;
  className?: string;
}) {
  const s = SIZE_MAP[size];
  return (
    <span
      className={className}
      aria-label="AUREVYN"
      style={
        {
          display: "inline-flex",
          alignItems: "center",
          gap: s.gap,
          fontFamily: "var(--mkt-font-sans)",
          fontWeight: 700,
          fontSize: s.font,
          letterSpacing: s.tracking,
          color: "var(--mkt-paper)",
          lineHeight: 1,
          whiteSpace: "nowrap",
        } as CSSProperties
      }
    >
      <svg width={s.mark} height={s.mark} viewBox="0 0 32 32" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
        <path d="M5 27 L16 5 L27 27" stroke={accent} strokeWidth="3.4" strokeLinecap="square" strokeLinejoin="miter" />
        <path d="M10.2 20 H21.8" stroke="var(--mkt-brass)" strokeWidth="3.4" strokeLinecap="square" />
      </svg>
      <span aria-hidden="true">AUREVYN</span>
    </span>
  );
}
