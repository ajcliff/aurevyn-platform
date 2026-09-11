"use client";

import type { CSSProperties } from "react";

const SIZE_MAP: Record<"sm" | "md" | "lg", { font: string; dot: number; gap: number }> = {
  sm: { font: "1.05rem", dot: 8, gap: 8 },
  md: { font: "1.3rem", dot: 9, gap: 9 },
  lg: { font: "clamp(2rem, 6vw, 3.1rem)", dot: 16, gap: 14 },
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
      style={
        {
          display: "inline-flex",
          alignItems: "center",
          gap: s.gap,
          fontFamily: "var(--mkt-font-sans)",
          fontWeight: 800,
          fontSize: s.font,
          letterSpacing: "0.01em",
          color: "var(--mkt-paper)",
          lineHeight: 1,
          whiteSpace: "nowrap",
        } as CSSProperties
      }
    >
      <span
        aria-hidden="true"
        style={{
          width: s.dot,
          height: s.dot,
          background: accent,
          boxShadow: `0 0 0 4px color-mix(in srgb, ${accent} 18%, transparent)`,
          flexShrink: 0,
        }}
      />
      AUREVYN
    </span>
  );
}