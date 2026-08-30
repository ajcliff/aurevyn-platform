"use client";

import { useState } from "react";
import s from "@/styles/layout.module.css";

import {
  createCustomer,
} from "@/lib/customers";

type Props = {
  open: boolean;
  orgId: string;
  onClose: () => void;
  onCreated: () => void;
};

export default function NewCustomerModal({
  open,
  orgId,
  onClose,
  onCreated,
}: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  async function handleSave() {
    if (!name.trim()) {
      alert("Customer name is required");
      return;
    }

    try {
      setSaving(true);

      await createCustomer({
        org_id: orgId,
        name,
        phone,
        email,
      });

      setName("");
      setPhone("");
      setEmail("");

      onCreated();
      onClose();

    } catch (err) {
      console.error(err);
      alert("Failed to create customer");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.6)",
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
          padding: 24,
          borderRadius: 16,
        }}
      >
        <h2>Add Customer</h2>

        <input
          className={s.input}
          placeholder="Customer Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <div style={{ height: 10 }} />

        <input
          className={s.input}
          placeholder="Phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <div style={{ height: 10 }} />

        <input
          className={s.input}
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <div
          style={{
            display: "flex",
            gap: 10,
            marginTop: 20,
          }}
        >
          <button
            className={s.btnGhost}
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            className={s.btnGold}
            onClick={handleSave}
          >
            {saving ? "Saving..." : "Save Customer"}
          </button>
        </div>
      </div>
    </div>
  );
}