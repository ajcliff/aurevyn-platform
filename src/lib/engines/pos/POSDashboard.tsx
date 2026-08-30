"use client";

import {
  useEffect,
  useMemo,
  useState
} from "react";

import {
  getProducts
} from "./service";

import {
  addToCart,
  removeFromCart,
  increaseQty,
  decreaseQty,
  calculateSubtotal,
  calculateTax,
  calculateTotal,
  type CartItem
} from "./cart";

import {
  completeSale
} from "./checkout";

import {
  useEngine
} from "@/lib/runtime/EngineContext";

type Product = {
  id: string;
  name: string;
  selling_price: number;
  stock_quantity: number;
};

export default function POSDashboard() {
  const { organization } =
    useEngine();

  const [products, setProducts] =
    useState<Product[]>([]);

  const [cart, setCart] =
    useState<CartItem[]>([]);

  const [paymentMethod,
    setPaymentMethod] =
    useState<
      "Cash" |
      "M-Pesa" |
      "Card" |
      "Bank"
    >("Cash");

  const [loading,
    setLoading] =
    useState(false);

  useEffect(() => {
    void loadProducts();
  }, []);

  async function loadProducts() {
    try {
      const data =
        await getProducts();

      setProducts(
        data as Product[]
      );
    } catch (err) {
      console.error(err);
    }
  }

  const subtotal =
    useMemo(
      () =>
        calculateSubtotal(
          cart
        ),
      [cart]
    );

  const tax =
    useMemo(
      () =>
        calculateTax(
          subtotal
        ),
      [subtotal]
    );

  const total =
    useMemo(
      () =>
        calculateTotal(
          subtotal,
          tax,
          0
        ),
      [subtotal, tax]
    );

  async function handleSale() {
    if (!cart.length) {
      alert(
        "Cart is empty"
      );
      return;
    }

    try {
      setLoading(true);

      await completeSale({
        org_id:
          organization.id,

        cart,

        subtotal,

        tax_amount:
          tax,

        discount_amount:
          0,

        total,

        payment_method:
          paymentMethod
      });

      setCart([]);

      await loadProducts();

      alert(
        "Sale Completed"
      );
    } catch (err) {
      console.error(err);

      alert(
        "Failed to complete sale"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "1fr 360px",
        gap: "20px"
      }}
    >
      <div>
        <h2>
          Products
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fill,minmax(220px,1fr))",
            gap: "12px"
          }}
        >
          {products.map(
            (product) => (
              <div
                key={
                  product.id
                }
                onClick={() =>
                  setCart(
                    addToCart(
                      cart,
                      {
                        product_id:
                          product.id,
                        name:
                          product.name,
                        price:
                          product.selling_price,
                        quantity: 1
                      }
                    )
                  )
                }
                style={{
                  background:
                    "var(--bg-card)",
                  border:
                    "1px solid var(--border)",
                  borderRadius:
                    "12px",
                  padding:
                    "16px",
                  cursor:
                    "pointer"
                }}
              >
                <div>
                  {
                    product.name
                  }
                </div>

                <div
                  style={{
                    color:
                      "var(--gold)"
                  }}
                >
                  KES{" "}
                  {Number(
                    product.selling_price
                  ).toLocaleString()}
                </div>

                <div
                  style={{
                    color:
                      "var(--text-muted)"
                  }}
                >
                  Stock:
                  {" "}
                  {
                    product.stock_quantity
                  }
                </div>
              </div>
            )
          )}
        </div>
      </div>

      <div
        style={{
          background:
            "var(--bg-card)",
          border:
            "1px solid var(--border)",
          borderRadius:
            "16px",
          padding:
            "16px"
        }}
      >
        <h2>Cart</h2>

        {cart.map(
          (item) => (
            <div
              key={
                item.product_id
              }
              style={{
                marginBottom:
                  "12px"
              }}
            >
              <div>
                {
                  item.name
                }
              </div>

              <div
                style={{
                  display:
                    "flex",
                  gap: "6px"
                }}
              >
                <button
                  onClick={() =>
                    setCart(
                      decreaseQty(
                        cart,
                        item.product_id
                      )
                    )
                  }
                >
                  -
                </button>

                <span>
                  {
                    item.quantity
                  }
                </span>

                <button
                  onClick={() =>
                    setCart(
                      increaseQty(
                        cart,
                        item.product_id
                      )
                    )
                  }
                >
                  +
                </button>

                <button
                  onClick={() =>
                    setCart(
                      removeFromCart(
                        cart,
                        item.product_id
                      )
                    )
                  }
                >
                  Remove
                </button>
              </div>
            </div>
          )
        )}

        <hr />

        <div>
          Subtotal:
          {" "}
          KES{" "}
          {subtotal.toLocaleString()}
        </div>

        <div>
          VAT:
          {" "}
          KES{" "}
          {tax.toLocaleString()}
        </div>

        <div
          style={{
            fontWeight:
              700,
            marginTop:
              "10px"
          }}
        >
          Total:
          {" "}
          KES{" "}
          {total.toLocaleString()}
        </div>

        <select
          value={
            paymentMethod
          }
          onChange={(e) =>
            setPaymentMethod(
              e.target
                .value as
                | "Cash"
                | "M-Pesa"
                | "Card"
                | "Bank"
            )
          }
          style={{
            width: "100%",
            marginTop:
              "16px"
          }}
        >
          <option>
            Cash
          </option>

          <option>
            M-Pesa
          </option>

          <option>
            Card
          </option>

          <option>
            Bank
          </option>
        </select>

        <button
          onClick={
            handleSale
          }
          disabled={
            loading
          }
          style={{
            width: "100%",
            marginTop:
              "16px",
            padding:
              "12px",
            background:
              "var(--gold)",
            border:
              "none",
            borderRadius:
              "10px",
            cursor:
              "pointer"
          }}
        >
          {loading
            ? "Processing..."
            : "Complete Sale"}
        </button>
      </div>
    </div>
  );
}