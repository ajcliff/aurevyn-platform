"use client";

import { useEffect, useRef } from "react";
import { logError } from "@/lib/errorLog";

type Props = {
  message: string;
  source: string;
  orgId?: string | null;
  code?: string | null;
  context?: Record<string, unknown> | null;
  onRetry?: () => void;
};

export default function ErrorBanner({ message, source, orgId, code, context, onRetry }: Props) {
  const loggedRef = useRef<string | null>(null);

  useEffect(() => {
    const key = `${source}:${message}`;
    if (loggedRef.current === key) return;
    loggedRef.current = key;
    logError({ source, message, orgId, code, context });
  }, [source, message, orgId, code, context]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "14px 16px",
        borderRadius: 12,
        border: "1px solid #ef444440",
        background: "#ef44441a",
        marginBottom: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
        <span style={{ fontSize: 13, color: "var(--text-primary)", wordBreak: "break-word" }}>{message}</span>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            padding: "6px 14px",
            borderRadius: 8,
            border: "1px solid #ef444460",
            background: "transparent",
            color: "#ef4444",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            flexShrink: 0,
            whiteSpace: "nowrap",
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
}