"use client";

import { useEffect, useRef, useState } from "react";
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
  const [report, setReport] = useState<"idle" | "sending" | "sent" | "failed">("idle");

  // Sends this problem to AUREVYN Support (founder's Mail), with the details they need
  async function reportProblem() {
    if (!orgId) return;
    setReport("sending");
    try {
      const details = [
        `Problem: ${message}`,
        `Where: ${source}`,
        code ? `Code: ${code}` : null,
        `Page: ${window.location.pathname}`,
        context ? `Details: ${JSON.stringify(context).slice(0, 1500)}` : null,
      ].filter(Boolean).join("\n");
      const res = await fetch("/api/org/mail", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, action: "send", kind: "support", category: "error", subject: `Problem report: ${source}`.slice(0, 200), body: details }),
      });
      setReport(res.ok ? "sent" : "failed");
    } catch { setReport("failed"); }
  }

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
      {orgId && (
        <button
          onClick={reportProblem}
          disabled={report === "sending" || report === "sent"}
          style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid var(--border-light)", background: "transparent", color: "var(--text-primary)", fontSize: 12, fontWeight: 600, cursor: report === "sent" ? "default" : "pointer", flexShrink: 0, whiteSpace: "nowrap" }}
        >
          {report === "sent" ? "Reported ✓" : report === "sending" ? "Sending…" : report === "failed" ? "Try again" : "Report problem"}
        </button>
      )}
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