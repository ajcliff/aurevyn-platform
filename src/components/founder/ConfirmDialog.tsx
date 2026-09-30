"use client";

import Modal from "@/components/founder/Modal";
import f from "@/styles/founder.module.css";

export default function ConfirmDialog({
  title, message, confirmLabel, onConfirm, onCancel,
}: { title: string; message: string; confirmLabel: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className={f.hint}>{message}</p>
      <div className={f.dialogActions}>
        <button className={f.secondary} onClick={onCancel}>Cancel</button>
        <button className={f.dangerSolid} style={{ flex: "none" }} onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </Modal>
  );
}