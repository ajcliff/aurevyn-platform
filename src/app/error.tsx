"use client";

import { useEffect, useState } from "react";
import { formatError } from "@/lib/errorFormat";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const message = formatError(error);

  useEffect(() => {
    console.error("Root error:", error);
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
        background: "#1A0F14",
        padding: 20,
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 440,
          width: "100%",
          background: "#24141B",
          border: "1px solid #3D2530",
          borderRadius: 16,
          padding: 28,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 28, marginBottom: 10 }}>⚠️</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#F0E6D8", marginBottom: 8 }}>
          Something went wrong
        </div>
        <div
          style={{
            fontSize: 12,
            color: "#A08B94",
            background: "#2C1922",
            border: "1px solid #3D2530",
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
              background: "#C9A227",
              color: "#1A0F14",
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
              color: "#A08B94",
              border: "1px solid #3D2530",
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
      </div>
    </div>
  );
}
