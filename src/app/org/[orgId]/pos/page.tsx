"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  getCurrentOrg
} from "@/lib/runtime/currentOrg";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";
import CustomerSelector from "@/components/pos/CustomerSelector";
import SplitPaymentEditor from "@/components/payments/SplitPaymentEditor";
import { recordPayment, methodLabel, type PaymentDetailsInput } from "@/lib/payments";
import {
  getProducts,
  updateStock,
  type InventoryProduct
} from "@/lib/inventory";
import { exportToCSV } from "@/lib/csvExport";
import {
  getSales,
  createSale,
  type PosSale,
  type PosSaleItem
} from "@/lib/pos";
import { getWarehouses, deductStockFromWarehouse, type Warehouse } from "@/lib/warehouses";
import { getEffectivePrice, getPricelists, type Pricelist } from "@/lib/pricelists";
import { type Customer } from "@/lib/customers";

import s from "@/styles/layout.module.css";
import ReceiptModal from "@/components/pos/ReceiptModal";
import NewCustomerModal from "@/components/pos/NewCustomerModal";

import {
  getDiscounts,
  type Discount
} from "@/lib/discount";


import ProductGrid from "@/components/pos/ProductGrid";

import {
  getPromotions,
  type Promotion
} from "@/lib/promotions";

type CartItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
};

export default function POSPage() {
 const { orgId: orgIdFromUrl } = useParams<{ orgId: string }>();

 const [orgId, setOrgId] =
  useState("");

const [orgName, setOrgName] =
  useState("");

const [promotions, setPromotions] =
  useState<Promotion[]>([]);
  const [products, setProducts] = useState<InventoryProduct[]>([]);
const [sales, setSales] = useState<PosSale[]>([]);
const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
const [selectedWarehouseId, setSelectedWarehouseId] = useState("");

const todaySales = useMemo(() => {
  const today = new Date().toDateString();

  return sales.filter(
    (sale) =>
      new Date(
        sale.created_at
      ).toDateString() === today
  );
}, [sales]);

const todayRevenue =
  todaySales.reduce(
    (sum, sale) =>
      sum + Number(sale.total),
    0
  );

const transactionCount =
  todaySales.length;

const averageSale =
  transactionCount
    ? todayRevenue /
      transactionCount
    : 0;
  const [tab, setTab] = useState<"sales" | "history">("sales");

  const [search, setSearch] = useState("");

  const [cart, setCart] = useState<CartItem[]>([]);

const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
const [pricelists, setPricelists] = useState<Pricelist[]>([]);
// "" = use the selected customer's own assigned pricelist (default, automatic).
// "base" = force base price regardless of customer. Anything else = a specific
// pricelist id, manually chosen for this sale.
const [pricelistOverride, setPricelistOverride] = useState("");
  const [loading, setLoading] = useState(false);

const [showReceipt, setShowReceipt] = useState(false);

const [completedSale, setCompletedSale] =
  useState<PosSale | null>(null);


  const [checkoutOpen, setCheckoutOpen] = useState(false);

const [paymentLines, setPaymentLines] = useState<PaymentDetailsInput[]>([]);
const [paymentValid, setPaymentValid] = useState(false);
const [changeDue, setChangeDue] = useState(0);

const [showCustomerModal, setShowCustomerModal] = useState(false);

const [discounts, setDiscounts] =
  useState<Discount[]>([]);

const [selectedDiscountId, setSelectedDiscountId] =
  useState("");

const [customerRefreshKey, setCustomerRefreshKey] = useState(0);

  const supabase = createClient();

  useEffect(() => {
  if (orgIdFromUrl) void loadOrganization();
}, [orgIdFromUrl]);
async function loadOrganization() {
  const org = await getCurrentOrg(orgIdFromUrl);

  if (!org) return;

setOrgId(org.id);
  setOrgName(org.name);

const [
  productsData,
  salesData,
  promotionsData,
  discountsData,
  warehousesData,
  pricelistsData
] = await Promise.all([
  getProducts(org.id),
  getSales(org.id),
  getPromotions(org.id),
  getDiscounts(org.id),
  getWarehouses(org.id),
  getPricelists(org.id)
]);

setProducts(productsData);
setSales(salesData);
setPromotions(promotionsData);
setDiscounts(discountsData);
setWarehouses(warehousesData);
setPricelists(pricelistsData);

const defaultWarehouse = warehousesData.find((w) => w.is_default);
if (defaultWarehouse) {
  setSelectedWarehouseId(defaultWarehouse.id);
}

}

  useEffect(() => {
    const channel = supabase
      .channel("pos-page")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pos_sales"
        },
        () => {
if (orgId) {
  getSales(orgId)
    .then(setSales)
    .catch(console.error);
}
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [products, search]);

  const cartTotal = useMemo(() => {
    return cart.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0
    );
  }, [cart]);

  const subtotal = cartTotal;

  const selectedDiscount = discounts.find((d) => d.id === selectedDiscountId);

  const discountAmount = useMemo(() => {
    if (!selectedDiscount) return 0;
    if (selectedDiscount.type === "percentage") {
      return subtotal * (selectedDiscount.value / 100);
    }
    return Math.min(selectedDiscount.value, subtotal);
  }, [selectedDiscount, subtotal]);

const grandTotal =
  subtotal - discountAmount;


function handleExportSalesCSV() {
  const rows = sales.map((sale) => ({
    Date: new Date(sale.created_at!).toLocaleString("en-KE"),
    Customer: sale.customer_name,
    "Payment Method": sale.payment_method,
    Status: sale.status,
    "Total (KES)": sale.total,
    Cashier: sale.cashier,
  }));

  exportToCSV(`sales-${orgId}-${new Date().toISOString().slice(0, 10)}.csv`, rows);
}

  async function addToCart(product: InventoryProduct) {
    const currentInCart = cart.find((i) => i.productId === product.id)?.quantity ?? 0;

    if (currentInCart + 1 > product.stock_quantity) {
      alert(`Only ${product.stock_quantity} units of "${product.name}" in stock`);
      return;
    }

    const activePricelistId =
      pricelistOverride === ""
        ? selectedCustomer?.pricelist_id ?? null
        : pricelistOverride === "base"
        ? null
        : pricelistOverride;

    const effectivePrice = await getEffectivePrice(
      product.id!,
      Number(product.unit_price),
      activePricelistId
    );

    setCart((prev) => {
      const existing = prev.find(
        (i) => i.productId === product.id
      );

      if (existing) {
        return prev.map((i) =>
          i.productId === product.id
            ? {
                ...i,
                quantity: i.quantity + 1
              }
            : i
        );
      }

      return [
        ...prev,
        {
          productId: product.id!,
          name: product.name,
          price: effectivePrice,
          quantity: 1
        }
      ];
    });
  }

  function increaseQty(productId: string) {
    const product = products.find((p) => p.id === productId);
    const current = cart.find((item) => item.productId === productId);

    if (product && current && current.quantity + 1 > product.stock_quantity) {
      alert(`Only ${product.stock_quantity} units of "${product.name}" in stock`);
      return;
    }

    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? {
              ...item,
              quantity: item.quantity + 1
            }
          : item
      )
    );
  }

  function decreaseQty(productId: string) {
    setCart((prev) =>
      prev
        .map((item) =>
          item.productId === productId
            ? {
                ...item,
                quantity: item.quantity - 1
              }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  function removeItem(productId: string) {
    setCart((prev) =>
      prev.filter((i) => i.productId !== productId)
    );
  }

  async function handleCompleteSale() {
   if (!orgId) return;

    if (cart.length === 0) {
      alert("Cart is empty");
      return;
    }

    if (!paymentValid || paymentLines.length === 0) {
      alert("Complete the payment details before finishing the sale");
      return;
    }

    try {
      setLoading(true);

      const items: PosSaleItem[] = cart.map((item) => ({
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        total: item.quantity * item.price
      }));

      const methodSummary = paymentLines.map((l) => methodLabel(l.method)).join(" + ");

      const sale: PosSale = {
        customer_name:
  selectedCustomer?.name || "Walk-in Customer",
        customer_id: selectedCustomer?.id || null,
       org_id: orgId,
        items,
      total: grandTotal,
        payment_method: methodSummary,
        cashier: "AUREVYN POS",
        status: "completed",
        warehouse_id: selectedWarehouseId || null,
        discount_id: selectedDiscountId || null,
        discount_amount: discountAmount
      };

      const created = await createSale(sale);
setCompletedSale({
  ...created,
  items,
});

      for (const line of paymentLines) {
        await recordPayment({
          orgId,
          sourceType: "pos_sale",
          sourceId: created.id,
          details: line,
        });
      }

      for (const item of cart) {
        await updateStock(
          item.productId,
          item.quantity,
          "stock_out",
          `POS Sale ${created.id}`
        );

        if (selectedWarehouseId) {
          await deductStockFromWarehouse(item.productId, selectedWarehouseId, item.quantity);
        }
      }

await logActivity({
        icon: "🛒",
        title: "POS Sale Completed",
        sub: `KES ${cartTotal.toLocaleString()}`,
        org_id: orgId,
      });

      setCart([]);
      setSelectedDiscountId("");
      setPaymentLines([]);
      setPaymentValid(false);
      setChangeDue(0);

const [productsData, salesData] =
  await Promise.all([
    getProducts(orgId),
    getSales(orgId)
  ]);

setProducts(productsData);
setSales(salesData);

     setShowReceipt(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("Sale failed:", message, error);
      alert(`Failed to complete sale: ${message}`);
    } finally {
      setLoading(false);
    }
  }

const selectedOrgName =
  orgName;
const searchParams = useSearchParams();

const saleId = searchParams.get("sale");
return (
    <div style={{ display: "flex", height: "100%", minHeight: 0, gap: "20px" }}>
      {/* Main column */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
        <div style={{ flexShrink: 0 }}>
          <h1 className={s.pageTitle}>Point of Sale</h1>
          <p className={s.pageSub}>
            Sell products, manage transactions and process payments
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(140px,1fr))",
              gap: "12px",
              marginTop: "16px",
              marginBottom: "16px",
            }}
          >
            <div className={s.card}>
              <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                Today's Revenue
              </div>
              <div style={{ fontSize: "22px", fontWeight: 700 }}>
                KES {todayRevenue.toLocaleString()}
              </div>
            </div>

            <div className={s.card}>
              <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                Transactions
              </div>
              <div style={{ fontSize: "22px", fontWeight: 700 }}>
                {transactionCount}
              </div>
            </div>

            <div className={s.card}>
              <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                Average Sale
              </div>
              <div style={{ fontSize: "22px", fontWeight: 700 }}>
                KES {Math.round(averageSale).toLocaleString()}
              </div>
            </div>

            <div className={s.card}>
              <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                Products
              </div>
              <div style={{ fontSize: "22px", fontWeight: 700 }}>
                {products.length}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "12px",
              marginBottom: "16px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <input
              className={s.input}
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: "240px" }}
            />

            {warehouses.length > 1 && (
              <select
                className={s.input}
                value={selectedWarehouseId}
                onChange={(e) => setSelectedWarehouseId(e.target.value)}
                style={{ width: "180px" }}
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    Selling from: {w.name}
                  </option>
                ))}
              </select>
            )}

            <div style={{ display: "flex", gap: "6px" }}>
              <button
                className={tab === "sales" ? s.filterBtnActive : s.filterBtn}
                onClick={() => setTab("sales")}
              >
                Sales
              </button>

              <button
                className={tab === "history" ? s.filterBtnActive : s.filterBtn}
                onClick={() => setTab("history")}
              >
                History
              </button>

<button
                className={s.filterBtn}
                onClick={() => window.open(`/org/${orgId}/pos/return`, "_self")}
              >
                Returns
              </button>

              <button
                className={s.filterBtn}
                onClick={() => window.open(`/org/${orgId}/pos/summary`, "_self")}
              >
                Sales Summary
              </button>

              <button className={s.filterBtn} onClick={handleExportSalesCSV}>
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable content area */}
        <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
          {tab === "sales" && (
            <ProductGrid products={filteredProducts} addToCart={addToCart} />
          )}

          {tab === "history" && (
            <div className={s.table}>
              {sales.map((sale) => (
                <div
                  key={sale.id}
                  className={s.tableRow}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr 1fr 1fr auto",
                    alignItems: "center",
                  }}
                >
                  <span>{new Date(sale.created_at).toLocaleString("en-KE")}</span>
                  <span>{sale.payment_method}</span>
                  <span>{sale.status}</span>
                  <span>KES {Number(sale.total).toLocaleString()}</span>
                  <button
                    className={s.filterBtn}
                    onClick={() => window.location.assign(`/org/${orgId}/pos/return/${sale.id}`)}
                  >
                    Return
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cart panel */}
      <div
        style={{
          width: 320,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "16px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <div style={{ fontSize: "16px", fontWeight: 700 }}>Cart</div>
          <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
            {selectedOrgName}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "12px", minHeight: 0 }}>
          {cart.length === 0 && (
            <div style={{ textAlign: "center", paddingTop: "40px", color: "var(--text-muted)" }}>
              Cart is empty
            </div>
          )}

          {cart.map((item) => (
            <div
              key={item.productId}
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                padding: "10px",
                marginBottom: "10px",
              }}
            >
              <div style={{ fontSize: "13px", fontWeight: 600 }}>{item.name}</div>

              <div
                style={{
                  marginTop: "8px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", gap: "6px" }}>
                  <button className={s.filterBtn} onClick={() => decreaseQty(item.productId)}>
                    -
                  </button>
                  <div style={{ minWidth: "24px", textAlign: "center" }}>{item.quantity}</div>
                  <button className={s.filterBtn} onClick={() => increaseQty(item.productId)}>
                    +
                  </button>
                </div>

                <button className={s.btnGhost} onClick={() => removeItem(item.productId)}>
                  Remove
                </button>
              </div>

              <div style={{ marginTop: "8px", fontSize: "12px", color: "var(--gold)" }}>
                KES {(item.quantity * item.price).toLocaleString()}
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: "16px", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
          <CustomerSelector
            orgId={orgId}
            value={selectedCustomer?.id || ""}
            onChange={(c) => {
              setSelectedCustomer(c);
              setPricelistOverride(""); // back to automatic (that customer's own pricelist) on switch
            }}
            refreshKey={customerRefreshKey}
          />

          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>
              Pricelist for this sale
            </div>
            <select
              value={pricelistOverride}
              onChange={(e) => setPricelistOverride(e.target.value)}
              className={s.input}
              style={{ width: "100%" }}
            >
              <option value="">
                {selectedCustomer?.pricelist_id ? "Customer's assigned pricelist" : "Base price"}
              </option>
              <option value="base">Base price</option>
              {pricelists.map((pl) => (
                <option key={pl.id} value={pl.id}>
                  {pl.name}
                </option>
              ))}
            </select>
          </div>

          <button
            className={s.btnGhost}
            style={{ width: "100%", marginTop: 8 }}
            onClick={() => setShowCustomerModal(true)}
          >
            + New Customer
          </button>

          <br />
          <br />

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "12px",
              fontWeight: 700,
            }}
          >
            <span>Total</span>
            <span>KES {cartTotal.toLocaleString()}</span>
          </div>

          <button
            className={s.btnGold}
            onClick={() => setCheckoutOpen(true)}
            style={{ width: "100%" }}
          >
            Checkout
          </button>
        </div>
      </div>

      {checkoutOpen && (
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
            style={{
              width: 560,
              background: "var(--bg-card)",
              borderRadius: 18,
              padding: 24,
              border: "1px solid var(--border)",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <h2>Checkout</h2>

            <div style={{ marginTop: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <span>Subtotal</span>
                <strong>KES {subtotal.toLocaleString()}</strong>
              </div>

              <label>Discount</label>
              <select
                className={s.input}
                value={selectedDiscountId}
                onChange={(e) => setSelectedDiscountId(e.target.value)}
              >
                <option value="">No discount</option>
                {discounts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.type === "percentage" ? `${d.value}%` : `KES ${d.value}`})
                  </option>
                ))}
              </select>

              {discountAmount > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 13, color: "#ef4444" }}>
                  <span>Discount</span>
                  <span>-KES {discountAmount.toLocaleString()}</span>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
                <span>Total</span>
                <strong>KES {grandTotal.toLocaleString()}</strong>
              </div>

              <div style={{ marginTop: 20 }}>
                <SplitPaymentEditor
                  totalAmount={grandTotal}
                  onChange={(lines, valid, change) => {
                    setPaymentLines(lines);
                    setPaymentValid(valid);
                    setChangeDue(change);
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
                <button className={s.btnGhost} onClick={() => setCheckoutOpen(false)}>
                  Cancel
                </button>
                <button
                  className={s.btnGold}
                  style={{ flex: 1 }}
                  disabled={!paymentValid || loading}
                  onClick={async () => {
                    await handleCompleteSale();
                    setCheckoutOpen(false);
                  }}
                >
                  {loading ? "Processing..." : "Complete Payment"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ReceiptModal
        open={showReceipt}
        sale={completedSale}
        onClose={() => {
          setShowReceipt(false);
          setCompletedSale(null);
        }}
      />

      <NewCustomerModal
        open={showCustomerModal}
        orgId={orgId}
        onClose={() => setShowCustomerModal(false)}
        onCreated={() => setCustomerRefreshKey((v) => v + 1)}
      />
    </div>
  );
}
