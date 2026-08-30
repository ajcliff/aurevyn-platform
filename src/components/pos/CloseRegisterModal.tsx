"use client";

import { useState } from "react";
import s from "@/styles/layout.module.css";

type Props = {
  open: boolean;
  expected: number;
  loading: boolean;
  onClose: () => void;
  onSubmit: (
    actual: number
  ) => Promise<void>;
};

export default function CloseRegisterModal({
  open,
 expected,
  loading,
  onClose,
  onSubmit,
}: Props) {
  const [actual, setActual] =
    useState(expected);

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
        <h2>Close Register</h2>

        <div>
          Expected Cash
        </div>

        <strong>
          KES{" "}
          {expected.toLocaleString()}
        </strong>

        <input
          className={s.input}
          style={{ marginTop: 20 }}
          type="number"
          value={actual}
          onChange={(e) =>
            setActual(Number(e.target.value))
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
              onSubmit(actual)
            }
          >
            Close Register
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