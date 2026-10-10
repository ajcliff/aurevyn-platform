"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// Points to the real desktop installer (/download). Hidden inside the desktop app itself.
// "menu" matches the founder top-bar dropdown; "sidebar" matches the org sidebar footer
export default function InstallAppButton({ variant, showLabel = true, menuClassName }: { variant: "menu" | "sidebar"; showLabel?: boolean; menuClassName?: string }) {
  const [inDesktopApp, setInDesktopApp] = useState(true); // hidden until we know, to avoid a flash
  useEffect(() => { setInDesktopApp(navigator.userAgent.includes("AurevynDesktop")); }, []);
  if (inDesktopApp) return null;

  if (variant === "menu") {
    return <Link className={menuClassName} role="menuitem" href="/download">⬇ Get the desktop app</Link>;
  }
  return (
    <Link
      href="/download"
      title="Download the AUREVYN desktop app for Windows"
      style={{ width: "100%", marginTop: 6, padding: "8px 8px", background: "transparent", border: "1px solid var(--gold)", borderRadius: 8, color: "var(--gold)", fontSize: 12, textDecoration: "none", display: "flex", alignItems: "center", justifyContent: showLabel ? "flex-start" : "center", gap: 8, boxSizing: "border-box" }}
    >
      <span>⬇</span>
      {showLabel && <span>Desktop app</span>}
    </Link>
  );
}
