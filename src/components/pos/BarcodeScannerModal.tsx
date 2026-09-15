"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
};

export default function BarcodeScannerModal({ open, onClose, onScan }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    import("html5-qrcode").then(({ Html5Qrcode }) => {
      if (cancelled || !containerRef.current) return;

      const scanner = new Html5Qrcode(containerRef.current.id);
      scannerRef.current = scanner;

      scanner
        .start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 150 } },
          (decodedText: string) => {
            onScan(decodedText);
          },
          () => {
            // per-frame "not found yet" - expected, ignore
          }
        )
        .catch((err: unknown) => {
          setError("Couldn't access the camera. Check permissions and try again.");
          console.error(err);
        });
    });

    return () => {
      cancelled = true;
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current.clear?.();
      }
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.85)",
        zIndex: 10001,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div style={{ maxWidth: 400, width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>Scan a barcode</span>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: "none", color: "#fff", fontSize: 20, cursor: "pointer" }}
          >
            ✕
          </button>
        </div>

        <div id="barcode-scanner-viewport" ref={containerRef} style={{ width: "100%", borderRadius: 12, overflow: "hidden" }} />

        {error && (
          <div style={{ color: "#ef4444", fontSize: 12, marginTop: 10, textAlign: "center" }}>{error}</div>
        )}

        <p style={{ color: "#9ca3af", fontSize: 12, textAlign: "center", marginTop: 12 }}>
          Point the camera at a barcode. It'll add the item automatically once recognized.
        </p>
      </div>
    </div>
  );
}
