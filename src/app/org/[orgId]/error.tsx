"use client";

import { useEffect, useState } from "react";
import { formatError } from "@/lib/errorFormat";

export default function OrgError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const message = formatError(error);

  useEffect(() => {
    // Still log to the browser console for anyone who does have dev tools open —
    // this doesn't replace that, it's a fallback for when they don't.
    console.error("Org route error:", error);
  }, [error]);

  function copyDetails() {
    const details = [
      message,
      error.digest ? `Digest: ${error.digest}` : null,
      `Time: ${new Date().toLocaleString()}`,
      `URL: ${typeof window !== "undefined" ? window.location.href : ""}`,
    ]
      .filter(Boolean)
      .join("\n");

    navigator.clipboard.writeText(details);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "var(--bg-base)",
        padding: 20,
      }}
    >
      <div
        style={{
          maxWidth: 440,
          width: "100%",
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: 28,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 28, marginBottom: 10 }}>⚠️</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
          Something went wrong
        </div>
        <div
          style={{
            fontSize: 12,
            color: "var(--text-secondary)",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "10px 12px",
            marginBottom: 16,
            fontFamily: "monospace",
            wordBreak: "break-word",
            textAlign: "left",
          }}
        >
          {message}
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <button
            onClick={reset}
            style={{
              background: "var(--gold)",
              color: "var(--gold-contrast)",
              border: "none",
              borderRadius: 10,
              padding: "9px 18px",
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          <button
            onClick={copyDetails}
            style={{
              background: "transparent",
              color: "var(--text-secondary)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: "9px 18px",
              fontWeight: 600,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            {copied ? "Copied ✓" : "Copy error details"}
          </button>
        </div>

        <div style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 14 }}>
          If this keeps happening, copy the error details above and share them — no terminal access needed.
        </div>
      </div>
    </div>
  );
}
