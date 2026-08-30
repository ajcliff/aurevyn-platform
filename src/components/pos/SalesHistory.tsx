"use client";

import s from "@/styles/layout.module.css";
import { PosSale } from "@/lib/pos";

type Props = {
  sales: PosSale[];
};

export default function SalesHistory({
  sales,
}: Props) {
  return (
    <div
      className={s.table}
      style={{
        overflowY: "auto",
        maxHeight: "calc(100vh - 220px)",
      }}
    >
      <div
        className={s.tableHeader}
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr 1fr 1fr",
        }}
      >
        <span>Date</span>
        <span>Payment</span>
        <span>Status</span>
        <span>Total</span>
      </div>

      {sales.map((sale) => (
        <div
          key={sale.id}
          className={s.tableRow}
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr 1fr",
          }}
        >
          <span>
            {new Date(sale.created_at ?? "").toLocaleString("en-KE")}
          </span>

          <span>{sale.payment_method}</span>

          <span style={{ color: "#3dd68c" }}>
            {sale.status}
          </span>

          <span>
            KES {Number(sale.total).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}