"use client";

import { useEffect, useId, type ReactNode } from "react";
import f from "@/styles/founder.module.css";

export default function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const titleId = useId();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className={f.backdrop} onClick={onClose}>
      <div className={f.dialog} role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={e => e.stopPropagation()}>
        <h2 id={titleId} className={f.dialogTitle}>{title}</h2>
        {children}
      </div>
    </div>
  );
}