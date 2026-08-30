"use client";

import { useState } from "react";
import s from "@/styles/layout.module.css";

type Props = {
  open: boolean;
  loading: boolean;
  onClose: () => void;
  onSubmit: (amount: number) => Promise<void>;
};

export default function OpenRegisterModal({
  open,
  loading,
  onClose,
  onSubmit,
}: Props) {
  const [amount, setAmount] =
    useState(0);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.55)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
      }}
    >
      <div
        className={s.card}
        style={{
          width: 420,
        }}
      >
        <h2>Open Register</h2>

        <p
          style={{
            marginBottom: 16,
          }}
        >
          Enter opening float.
        </p>

        <input
          className={s.input}
          type="number"
          value={amount}
          onChange={(e) =>
            setAmount(Number(e.target.value))
          }
        />

        <div
          style={{
            display: "flex",
            gap: 12,
            marginTop: 20,
          }}
        >
          <button
            className={s.btnGold}
            disabled={loading}
            onClick={() =>
              onSubmit(amount)
            }
          >
            Open
          </button>

          <button
            className={s.btnGhost}
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}