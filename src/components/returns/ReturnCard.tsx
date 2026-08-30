"use client";

import s from "@/styles/layout.module.css";

export interface ReturnRecord {
  id: string;
  reason: string;
  refund_amount: number;
  status: string;
  created_at: string;
}

type Props = {
  returnItem: ReturnRecord;
  onApprove: () => void;
  onReject: () => void;
};

export default function ReturnCard({
  returnItem,
  onApprove,
  onReject,
}: Props) {
  const statusColor =
    returnItem.status === "approved"
      ? "#22c55e"
      : returnItem.status === "rejected"
      ? "#ef4444"
      : "#facc15";

  return (
    <div className={s.card}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <strong>{returnItem.reason}</strong>

        <span
          style={{
            color: statusColor,
            fontWeight: 700,
            textTransform: "uppercase",
          }}
        >
          {returnItem.status}
        </span>
      </div>

      <div
        style={{
          marginTop: 10,
          color: "var(--text-muted)",
        }}
      >
        Refund
      </div>

      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
        }}
      >
        KES {Number(returnItem.refund_amount).toLocaleString()}
      </div>

      <div
        style={{
          marginTop: 8,
          fontSize: 12,
          color: "var(--text-muted)",
        }}
      >
        {new Date(returnItem.created_at).toLocaleString()}
      </div>

      {returnItem.status === "pending" && (
        <div
          style={{
            display: "flex",
            gap: 10,
            marginTop: 20,
          }}
        >
          <button
            className={s.btnGold}
            style={{ flex: 1 }}
            onClick={onApprove}
          >
            Approve
          </button>

          <button
            className={s.btnGhost}
            style={{ flex: 1 }}
            onClick={onReject}
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
}