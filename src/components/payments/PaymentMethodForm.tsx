"use client";

import { useEffect, useState } from "react";
import s from "@/styles/layout.module.css";
import {
  KENYAN_BANKS,
  validatePaymentDetails,
  type PaymentMethod,
  type PaymentDetailsInput,
} from "@/lib/payments";

type Props = {
  amount: number;
  onAmountChange: (amount: number) => void;
  onChange: (details: PaymentDetailsInput | null) => void;
  onRemove?: () => void;
  showRemove?: boolean;
};

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "mpesa", label: "M-Pesa" },
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cheque", label: "Cheque" },
];

export default function PaymentMethodForm({ amount, onAmountChange, onChange, onRemove, showRemove }: Props) {
  const [method, setMethod] = useState<PaymentMethod>("mpesa");

  const [mpesaCode, setMpesaCode] = useState("");
  const [mpesaPhone, setMpesaPhone] = useState("");

  const [cardLast4, setCardLast4] = useState("");
  const [cardType, setCardType] = useState("visa");

  const [bankName, setBankName] = useState("");
  const [bankReference, setBankReference] = useState("");

  const [chequeNumber, setChequeNumber] = useState("");
  const [chequeBank, setChequeBank] = useState("");
  const [chequeDate, setChequeDate] = useState("");

  const [touched, setTouched] = useState(false);

  function buildDetails(): PaymentDetailsInput {
    return {
      method,
      amount,
      mpesaCode,
      mpesaPhone,
      cardLast4,
      cardType,
      bankName,
      bankReference,
      chequeNumber,
      chequeBank,
      chequeDate,
    };
  }

  function emitChange() {
    const details = buildDetails();
    const error = validatePaymentDetails(details);
    onChange(error ? null : details);
  }

  function handleMethodChange(next: PaymentMethod) {
    setMethod(next);
    setTouched(false);

    const details: PaymentDetailsInput = {
      method: next,
      amount,
      mpesaCode: "",
      mpesaPhone,
      cardLast4: "",
      cardType,
      bankName: "",
      bankReference: "",
      chequeNumber: "",
      chequeBank: "",
      chequeDate: "",
    };

    const error = validatePaymentDetails(details);
    onChange(error ? null : details);
  }

  // Re-validate whenever the amount changes (e.g. the split editor rebalances it)
  useEffect(() => {
    emitChange();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount]);

  const currentError = touched ? validatePaymentDetails(buildDetails()) : null;

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 12, marginBottom: 10 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-end", marginBottom: 4 }}>
        <div style={{ flex: 1 }}>
          <label className={s.label}>Payment Method</label>
          <select
            className={s.input}
            value={method}
            onChange={(e) => handleMethodChange(e.target.value as PaymentMethod)}
          >
            {METHODS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        <div style={{ width: 130 }}>
          <label className={s.label}>Amount (KES)</label>
          <input
            className={s.input}
            type="number"
            value={amount}
            onChange={(e) => onAmountChange(Number(e.target.value) || 0)}
            onBlur={() => { setTouched(true); emitChange(); }}
          />
        </div>

        {showRemove && (
          <button
            type="button"
            className={s.btnGhost}
            style={{ padding: "8px 12px", marginBottom: 2 }}
            onClick={onRemove}
          >
            ✕
          </button>
        )}
      </div>

      {method === "mpesa" && (
        <>
          <label className={s.label}>M-Pesa Transaction Code</label>
          <input
            className={s.input}
            placeholder="e.g. QGH7X8YZ12"
            value={mpesaCode}
            maxLength={10}
            style={{ textTransform: "uppercase" }}
            onChange={(e) => setMpesaCode(e.target.value)}
            onBlur={() => { setTouched(true); emitChange(); }}
          />

          <label className={s.label}>Payer's Phone Number (optional)</label>
          <input
            className={s.input}
            type="tel"
            placeholder="07XXXXXXXX"
            value={mpesaPhone}
            onChange={(e) => setMpesaPhone(e.target.value)}
            onBlur={() => { setTouched(true); emitChange(); }}
          />
        </>
      )}

      {method === "card" && (
        <>
          <label className={s.label}>Card Type</label>
          <select className={s.input} value={cardType} onChange={(e) => { setCardType(e.target.value); emitChange(); }}>
            <option value="visa">Visa</option>
            <option value="mastercard">Mastercard</option>
          </select>

          <label className={s.label}>Last 4 Digits</label>
          <input
            className={s.input}
            type="text"
            inputMode="numeric"
            placeholder="1234"
            maxLength={4}
            value={cardLast4}
            onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, ""))}
            onBlur={() => { setTouched(true); emitChange(); }}
          />
        </>
      )}

      {method === "bank_transfer" && (
        <>
          <label className={s.label}>Receiving Bank</label>
          <select
            className={s.input}
            value={bankName}
            onChange={(e) => { setBankName(e.target.value); emitChange(); }}
          >
            <option value="">Select bank</option>
            {KENYAN_BANKS.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>

          <label className={s.label}>Bank Reference Number</label>
          <input
            className={s.input}
            placeholder="Transfer reference"
            value={bankReference}
            onChange={(e) => setBankReference(e.target.value)}
            onBlur={() => { setTouched(true); emitChange(); }}
          />
        </>
      )}

      {method === "cheque" && (
        <>
          <label className={s.label}>Cheque Number</label>
          <input
            className={s.input}
            placeholder="e.g. 000123"
            value={chequeNumber}
            onChange={(e) => setChequeNumber(e.target.value)}
            onBlur={() => { setTouched(true); emitChange(); }}
          />

          <label className={s.label}>Issuing Bank</label>
          <select
            className={s.input}
            value={chequeBank}
            onChange={(e) => { setChequeBank(e.target.value); emitChange(); }}
          >
            <option value="">Select bank</option>
            {KENYAN_BANKS.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>

          <label className={s.label}>Cheque Date</label>
          <input
            className={s.input}
            type="date"
            value={chequeDate}
            onChange={(e) => { setChequeDate(e.target.value); emitChange(); }}
          />

          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
            Cheques are recorded as pending until manually marked cleared in Finance.
          </div>
        </>
      )}

      {method === "cash" && (
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
          No additional details needed for cash.
        </div>
      )}

      {currentError && (
        <div style={{ color: "#ef4444", fontSize: 12, marginTop: 6 }}>{currentError}</div>
      )}
    </div>
  );
}