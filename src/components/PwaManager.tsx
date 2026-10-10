"use client";

import { useEffect } from "react";

// AUREVYN ships as a desktop installer, not a web app. This removes any service worker
// an earlier build registered, so nobody is stuck on cached code.
export default function PwaManager() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister())).catch(() => {});
    if ("caches" in window) caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => {});
  }, []);
  return null;
}
