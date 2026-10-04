"use client";

import { useEffect, useState } from "react";

// Registers the service worker (production only, because a service worker in dev
// causes exactly the stale-code problems we're avoiding) and offers a safe update.
export default function PwaManager() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;

    let reloading = false;
    const onControllerChange = () => { if (!reloading) { reloading = true; window.location.reload(); } };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    let interval: ReturnType<typeof setInterval> | undefined;
    navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).then((reg) => {
      if (reg.waiting && navigator.serviceWorker.controller) setWaiting(reg.waiting);
      reg.addEventListener("updatefound", () => {
        const worker = reg.installing;
        worker?.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) setWaiting(worker);
        });
      });
      // Look for a new deploy hourly and whenever the app comes back to the foreground
      interval = setInterval(() => reg.update(), 60 * 60 * 1000);
      document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") reg.update(); });
    }).catch((err) => console.error("Service worker registration failed:", err));

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      if (interval) clearInterval(interval);
    };
  }, []);

  if (!waiting) return null;

  return (
    <div role="status" style={{ position: "fixed", left: 16, bottom: "calc(16px + env(safe-area-inset-bottom, 0px))", zIndex: 10001, display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, background: "var(--bg-card, #241420)", color: "var(--text-primary, #F3E9ED)", border: "1px solid var(--gold, #C9A227)", boxShadow: "0 4px 16px rgba(0,0,0,0.35)", fontSize: 13 }}>
      <span>A new version of AUREVYN is ready.</span>
      <button onClick={() => waiting.postMessage("SKIP_WAITING")} style={{ background: "var(--gold, #C9A227)", color: "var(--gold-contrast, #1A0F14)", border: "none", borderRadius: 6, padding: "6px 12px", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>Refresh</button>
    </div>
  );
}
