"use client";

import { useState } from "react";
import { usePwaInstall } from "@/lib/usePwaInstall";

// "menu" matches the founder top-bar dropdown; "sidebar" matches the org sidebar footer
export default function InstallAppButton({ variant, showLabel = true, menuClassName }: { variant: "menu" | "sidebar"; showLabel?: boolean; menuClassName?: string }) {
  const { installed, canPrompt, showIosHint, promptInstall } = usePwaInstall();
  const [hint, setHint] = useState(false);

  if (installed || (!canPrompt && !showIosHint)) return null;

  const onClick = () => (canPrompt ? promptInstall() : setHint((h) => !h));

  const iosHint = hint && (
    <div role="note" style={{ fontSize: 11, lineHeight: 1.4, color: "var(--text-secondary)", padding: "6px 8px" }}>
      Tap the Share button in Safari, then &quot;Add to Home Screen&quot;.
    </div>
  );

  if (variant === "menu") {
    return (
      <>
        <button className={menuClassName} role="menuitem" onClick={onClick}>⬇ Install app</button>
        {iosHint}
      </>
    );
  }

  return (
    <>
      <button
        onClick={onClick}
        title="Install AUREVYN as an app"
        style={{ width: "100%", marginTop: 6, padding: "8px 8px", background: "transparent", border: "1px solid var(--gold)", borderRadius: 8, color: "var(--gold)", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: showLabel ? "flex-start" : "center", gap: 8 }}
      >
        <span>⬇</span>
        {showLabel && <span>Install app</span>}
      </button>
      {iosHint}
    </>
  );
}
