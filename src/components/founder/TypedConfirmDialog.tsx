"use client";

import { useState } from "react";
import Modal from "@/components/founder/Modal";
import f from "@/styles/founder.module.css";

/**
 * For destructive actions where a single misclick would be costly
 * (wiping a table, resetting the whole platform). The confirm button
 * stays disabled until the person types the exact phrase back.
 */
export default function TypedConfirmDialog({
  title, message, phrase, confirmLabel, onConfirm, onCancel,
}: { title: string; message: string; phrase: string; confirmLabel: string; onConfirm: () => void; onCancel: () => void }) {
  const [value, setValue] = useState("");
  const match = value.trim() === phrase;

  return (
    <Modal title={title} onClose={onCancel}>
      <p className={f.hint}>{message}</p>
      <div className={f.field}>
        <label htmlFor="typed-confirm">Type <b>{phrase}</b> to confirm</label>
        <input
          id="typed-confirm"
          className={f.input}
          autoFocus
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && match) onConfirm(); }}
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      <div className={f.dialogActions}>
        <button className={f.secondary} onClick={onCancel}>Cancel</button>
        <button className={f.dangerSolid} style={{ flex: "none" }} disabled={!match} onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </Modal>
  );
}
