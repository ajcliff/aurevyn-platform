"use client";

import { useEffect, useState } from "react";
import s from "@/styles/layout.module.css";
import PaymentMethodForm from "./PaymentMethodForm";
import { type PaymentDetailsInput } from "@/lib/payments";

type Props = {
  totalAmount: number;
  onChange: (lines: PaymentDetailsInput[], isValid: boolean, changeDue: number) => void;
};

function makeEmptyLine(amount: number): PaymentDetailsInput {
  return {
    method: "mpesa",
    amount,
    mpesaCode: "",
    mpesaPhone: "",
    cardLast4: "",
    cardType: "visa",
    bankName: "",
    bankReference: "",
    chequeNumber: "",
    chequeBank: "",
    chequeDate: "",
  };
}

export default function SplitPaymentEditor({ totalAmount, onChange }: Props) {
  const [lines, setLines] = useState<PaymentDetailsInput[]>([makeEmptyLine(totalAmount)]);
  const [lineValidity, setLineValidity] = useState<boolean[]>([false]);

  const totalPaid = lines.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
  const balanceRemaining = totalAmount - totalPaid;
  const allCash = lines.every((l) => l.method === "cash");
  const changeDue = balanceRemaining < -0.01 && allCash ? Math.abs(balanceRemaining) : 0;

  const balanceOk = Math.abs(balanceRemaining) < 0.01 || (balanceRemaining < -0.01 && allCash);
  const isValid = lines.length > 0 && lineValidity.every(Boolean) && balanceOk;

  useEffect(() => {
    onChange(lines, isValid, changeDue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, lineValidity]);

  function updateLineAmount(index: number, amount: number) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, amount } : l)));
  }

  function updateLineDetails(index: number, details: PaymentDetailsInput | null) {
    setLineValidity((prev) => prev.map((v, i) => (i === index ? details !== null : v)));
    if (details) {
      setLines((prev) => prev.map((l, i) => (i === index ? { ...details, amount: l.amount } : l)));
    }
  }

  function addLine() {
    const remaining = Math.max(totalAmount - totalPaid, 0);
    setLines((prev) => [...prev, makeEmptyLine(remaining)]);
    setLineValidity((prev) => [...prev, false]);
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
    setLineValidity((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div>
      {lines.map((line, i) => (
        <PaymentMethodForm
          key={i}
          amount={line.amount}
          onAmountChange={(amt) => updateLineAmount(i, amt)}
          onChange={(details) => updateLineDetails(i, details)}
          onRemove={() => removeLine(i)}
          showRemove={lines.length > 1}
        />
      ))}

      <button type="button" className={s.btnGhost} style={{ width: "100%", marginBottom: 12 }} onClick={addLine}>
        + Add Another Payment Method
      </button>

      <div style={{ fontSize: 13, marginTop: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Total Due</span>
          <span>KES {totalAmount.toLocaleString()}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Total Entered</span>
          <span>KES {totalPaid.toLocaleString()}</span>
        </div>

        {balanceRemaining > 0.01 && (
          <div style={{ display: "flex", justifyContent: "space-between", color: "#ef4444", fontWeight: 700, marginTop: 6 }}>
            <span>Balance Remaining</span>
            <span>KES {balanceRemaining.toLocaleString()}</span>
          </div>
        )}

        {changeDue > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", color: "#3dd68c", fontWeight: 700, marginTop: 6 }}>
            <span>Change Due</span>
            <span>KES {changeDue.toLocaleString()}</span>
          </div>
        )}

        {balanceRemaining < -0.01 && !allCash && (
          <div style={{ color: "#ef4444", fontSize: 12, marginTop: 6 }}>
            Overpayment is only allowed when paying fully by cash.
          </div>
        )}
      </div>
    </div>
  );
}