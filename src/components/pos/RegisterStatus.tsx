"use client";

import s from "@/styles/layout.module.css";
import { RegisterSession } from "@/lib/register";

type Props = {
  session: RegisterSession | null;
  onOpen: () => void;
  onClose: () => void;
};

export default function RegisterStatus({
  session,
  onOpen,
  onClose,
}: Props) {
  if (!session) {
    return (
      <div className={s.card}>
        <h3>Register</h3>

        <p
          style={{
            color: "#ef4444",
            marginTop: 8,
          }}
        >
          CLOSED
        </p>

        <button
          className={s.btnGold}
          style={{ marginTop: 16 }}
          onClick={onOpen}
        >
          Open Register
        </button>
      </div>
    );
  }

  return (
    <div className={s.card}>
      <h3>Register</h3>

      <p
        style={{
          color: "#3dd68c",
          marginTop: 8,
        }}
      >
        OPEN
      </p>

      <div style={{ marginTop: 12 }}>
        Float: KES{" "}
        {session.opening_float.toLocaleString()}
      </div>

      <div>
        Opened:
        {" "}
        {new Date(
          session.opened_at
        ).toLocaleString("en-KE")}
      </div>

      <button
        className={s.btnGhost}
        style={{ marginTop: 18 }}
        onClick={onClose}
      >
        Close Register
      </button>
    </div>
  );
}