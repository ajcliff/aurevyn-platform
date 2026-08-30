"use client";

import s from "@/styles/layout.module.css";

export type CartItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
};

type Props = {
  cart: CartItem[];
  paymentMethod: string;
  setPaymentMethod: (value: string) => void;
  total: number;
  loading: boolean;
  increaseQty: (id: string) => void;
  decreaseQty: (id: string) => void;
  removeItem: (id: string) => void;
  completeSale: () => void;
};

export default function Cart({
  cart,
  paymentMethod,
  setPaymentMethod,
  total,
  loading,
  increaseQty,
  decreaseQty,
  removeItem,
  completeSale,
}: Props) {
  return (
    <>
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: 12,
        }}
      >
        {cart.length === 0 && (
          <div
            style={{
              textAlign: "center",
              paddingTop: 40,
            }}
          >
            Cart is empty
          </div>
        )}

        {cart.map((item) => (
          <div
            key={item.productId}
            className={s.card}
            style={{ marginBottom: 10 }}
          >
            <strong>{item.name}</strong>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 10,
              }}
            >
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  className={s.filterBtn}
                  onClick={() => decreaseQty(item.productId)}
                >
                  -
                </button>

                <span>{item.quantity}</span>

                <button
                  className={s.filterBtn}
                  onClick={() => increaseQty(item.productId)}
                >
                  +
                </button>
              </div>

              <button
                className={s.btnGhost}
                onClick={() => removeItem(item.productId)}
              >
                Remove
              </button>
            </div>

            <div
              style={{
                marginTop: 10,
                fontWeight: 700,
              }}
            >
              KES {(item.price * item.quantity).toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          padding: 16,
          borderTop: "1px solid var(--border)",
        }}
      >
        <select
          className={s.input}
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
        >
          <option>M-Pesa</option>
          <option>Cash</option>
          <option>Card</option>
          <option>Bank</option>
        </select>

        <div
          style={{
            marginTop: 15,
            display: "flex",
            justifyContent: "space-between",
            fontWeight: 700,
          }}
        >
          <span>Total</span>

          <span>KES {total.toLocaleString()}</span>
        </div>

        <button
          className={s.btnGold}
          style={{
            width: "100%",
            marginTop: 16,
          }}
          disabled={loading}
          onClick={completeSale}
        >
          {loading ? "Processing..." : "Complete Sale"}
        </button>
      </div>
    </>
  );
}