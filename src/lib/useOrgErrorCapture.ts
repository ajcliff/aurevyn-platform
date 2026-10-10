"use client";

import { useEffect } from "react";
import { logError } from "./errorLog";

// Errors that are browser noise, not bugs worth waking the founder for
const IGNORE = [/ResizeObserver loop/i, /Script error\.?$/i, /AbortError/i, /NetworkError when attempting/i, /Failed to fetch/i, /Load failed/i, /ChunkLoadError/i];

// Sends uncaught errors and unhandled promise rejections from inside an org to the
// founder's Error Logs (with the org attached). De-duplicated and capped per session
// so one broken page can't flood the log.
export function useOrgErrorCapture(orgId: string) {
  useEffect(() => {
    const seen = new Set<string>();
    let sent = 0;

    const report = (message: string, code?: string | null) => {
      if (!message || sent >= 10 || IGNORE.some(r => r.test(message))) return;
      const key = message.slice(0, 160);
      if (seen.has(key)) return;
      seen.add(key); sent++;
      logError({ source: `org${window.location.pathname.replace(`/org/${orgId}`, "") || "/"}`, message: message.slice(0, 500), code: code ?? null, orgId, context: { url: window.location.pathname }, severity: "error" });
    };

    const onError = (e: ErrorEvent) => report(e.message || (e.error instanceof Error ? e.error.message : ""), "uncaught");
    const onRejection = (e: PromiseRejectionEvent) => {
      const r = e.reason;
      report(r instanceof Error ? r.message : typeof r === "string" ? r : r?.message ?? "", "unhandled_rejection");
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => { window.removeEventListener("error", onError); window.removeEventListener("unhandledrejection", onRejection); };
  }, [orgId]);
}
