"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  getCurrentOrg
} from "@/lib/runtime/currentOrg";
import { useParams } from "next/navigation";
import { createClient, isMobileViewport } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";
import CustomerSelector from "@/components/pos/CustomerSelector";
import SplitPaymentEditor from "@/components/payments/SplitPaymentEditor";
import { recordPayment, methodLabel, type PaymentDetailsInput } from "@/lib/payments";
import { getFinanceAccounts, type FinanceAccount } from "@/lib/finance";
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
import { getWarehouses, getStockLevelsMap, type Warehouse } from "@/lib/warehouses";
import { getEffectivePrice, getPricelists, type Pricelist } from "@/lib/pricelists";
import { type Customer } from "@/lib/customers";
import { getCreditBalance, reserveCredit, linkCreditToSale, cancelCredit, creditErrorMessage } from "@/lib/customerCredit";

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
import { queueOfflineSale, syncQueuedSales, getQueuedSales } from "@/lib/posOfflineQueue";

type CompletedSale = {
  id: string;
  total: number;
  payment_method: string;
  cashier: string;
  created_at?: string;
  items: PosSaleItem[];
};

type CartItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
};

const UNCATEGORIZED = "Uncategorized";
const categoryOf = (p: InventoryProduct) => p.category?.trim() || UNCATEGORIZED;

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
const [financeAccounts, setFinanceAccounts] = useState<FinanceAccount[]>([]);
const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
const [stockLevels, setStockLevels] = useState<Record<string, Record<string, number>>>({});

const todaySales = useMemo(() => {
  const today = new Date().toDateString();

  return sales.filter(
    (sale) =>
      sale.created_at &&
      new Date(sale.created_at).toDateString() === today
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
  const [openCategory, setOpenCategory] = useState<string | null>(null);

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
  useState<CompletedSale | null>(null);
const [pendingSyncCount, setPendingSyncCount] = useState(0);
const [syncing, setSyncing] = useState(false);


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
const [onCredit, setOnCredit] = useState(false);
useEffect(() => {
  const id = selectedCustomer?.id;
  if (!id || !selectedCustomer?.credit_limit) return;
  let active = true;
  getCreditBalance(id).then((b) => { if (active) setCreditBalance(b); });
  return () => { active = false; };
}, [selectedCustomer?.id, selectedCustomer?.credit_limit, checkoutOpen]);
const [creditBalance, setCreditBalance] = useState(0);
const creditLimit = Number(selectedCustomer?.credit_limit ?? 0);
const creditAvailable = Math.max(0, creditLimit - creditBalance);

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
  pricelistsData,
  stockLevelsData,
  financeAccountsData
] = await Promise.all([
  getProducts(org.id),
  getSales(org.id),
  getPromotions(org.id),
  getDiscounts(org.id),
  getWarehouses(org.id),
  getPricelists(org.id),
  getStockLevelsMap(org.id),
  getFinanceAccounts(org.id)
]);

setProducts(productsData);
setSales(salesData);
setPromotions(promotionsData);
setDiscounts(discountsData);
setWarehouses(warehousesData);
setPricelists(pricelistsData);
setStockLevels(stockLevelsData);
setFinanceAccounts(financeAccountsData);

const defaultWarehouse = warehousesData.find((w) => w.is_default);
if (defaultWarehouse) {
  setSelectedWarehouseId(defaultWarehouse.id);
}

}

  useEffect(() => {
    if (!orgId) return;

    setPendingSyncCount(getQueuedSales().length);

    async function trySync() {
      if (getQueuedSales().length === 0) return;
      setSyncing(true);
      const result = await syncQueuedSales(orgId);
      setPendingSyncCount(getQueuedSales().length);
      setSyncing(false);
      if (result.synced > 0) {
        const [productsData, salesData, stockLevelsData] = await Promise.all([getProducts(orgId), getSales(orgId), getStockLevelsMap(orgId)]);
        setProducts(productsData);
        setSales(salesData);
        setStockLevels(stockLevelsData);
      }
    }

    trySync();
    window.addEventListener("online", trySync);
    return () => window.removeEventListener("online", trySync);
  }, [orgId]);

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
    const q = search.trim().toLowerCase();
    return products.filter(
      (p) =>
        (!openCategory || categoryOf(p) === openCategory) &&
        (!q || p.name.toLowerCase().includes(q) || (p.sku ?? "").toLowerCase().includes(q))
    );
  }, [products, search, openCategory]);

  // Same drawers as Inventory: one per product category
  const drawers = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of products) counts.set(categoryOf(p), (counts.get(categoryOf(p)) ?? 0) + 1);
    return [...counts.entries()]
      .sort(([a], [b]) => (a === UNCATEGORIZED ? 1 : b === UNCATEGORIZED ? -1 : a.localeCompare(b)))
      .map(([name, count]) => ({ name, count }));
  }, [products]);

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

  function availableStockFor(product: InventoryProduct): number {
    if (selectedWarehouseId && stockLevels[product.id!]) {
      const levelQty = stockLevels[product.id!][selectedWarehouseId];
      if (levelQty !== undefined) return levelQty;
    }
    return Number(product.stock_quantity);
  }

  async function addToCart(product: InventoryProduct) {
    const currentInCart = cart.find((i) => i.productId === product.id)?.quantity ?? 0;
    const available = availableStockFor(product);

    if (currentInCart + 1 > available) {
      alert(`Only ${available} units of "${product.name}" in stock${selectedWarehouseId ? " at this branch" : ""}`);
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

    if (product && current) {
      const available = availableStockFor(product);
      if (current.quantity + 1 > available) {
        alert(`Only ${available} units of "${product.name}" in stock${selectedWarehouseId ? " at this branch" : ""}`);
        return;
      }
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

  // Maps a payment method to this org's matching bank/cash/mobile-money
  // account. Picks the first active match — fine for the common case of one
  // till/account per type; orgs with more than one of the same type won't
  // get a specific match here and fall back to Unspecified Cash.
  function resolveFinanceAccountId(method: PaymentDetailsInput["method"]): string | undefined {
    const wantType = method === "mpesa" ? "mobile_money" : method === "cash" ? "cash" : "bank";
    return financeAccounts.find((a) => a.type === wantType && a.status === "active")?.id;
  }

  async function handleCompleteSale() {
   if (!orgId) return;

    if (cart.length === 0) {
      alert("Cart is empty");
      return;
    }

    if (onCredit) {
      if (!selectedCustomer?.id || creditLimit <= 0) {
        alert("Pick a customer with a credit limit to sell on credit.");
        return;
      }
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        alert("Credit sales need a connection so the customer's balance is checked. Take payment now, or wait until you're back online.");
        return;
      }
    } else if (!paymentValid || paymentLines.length === 0) {
      alert("Complete the payment details before finishing the sale");
      return;
    }

    let sale: PosSale | undefined;

    try {
      setLoading(true);

      const items: PosSaleItem[] = cart.map((item) => ({
        product_id: item.productId,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        total: item.quantity * item.price
      }));

      const methodSummary = onCredit ? "Credit" : paymentLines.map((l) => methodLabel(l.method)).join(" + ");

      // Only attribute to a specific bank/mobile-money/cash account when the
      // whole sale used one payment method — a split-tender sale (part cash,
      // part M-Pesa) would need the ledger entry itself split by line to
      // attribute correctly, which postSaleJournal doesn't do yet. Falls
      // back to the generic "Unspecified Cash" bucket in that case, same as
      // before this change.
      const financeAccountId =
        !onCredit && paymentLines.length === 1 ? resolveFinanceAccountId(paymentLines[0].method) : undefined;

      sale = {
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

      const isOffline = typeof navigator !== "undefined" && !navigator.onLine;

      if (isOffline) {
        queueOfflineSale(
          sale,
          paymentLines,
          cart.map((item) => ({ productId: item.productId, quantity: item.quantity })),
          selectedWarehouseId || null
        );
        setPendingSyncCount(getQueuedSales().length);

        setCart([]);
        setSelectedDiscountId("");
        setPaymentLines([]);
        setPaymentValid(false);
        setChangeDue(0);
        setLoading(false);
        alert("No connection right now — this sale has been saved on your phone and will sync automatically once you're back online.");
        return;
      }

      // On mobile, use the write-enabled client for this one deliberately-supported
      // flow. On desktop this is identical to the normal client (mobile lock is a
      // no-op there), so behavior is unchanged outside of small screens.
      const saleClient = isMobileViewport() ? createClient({ allowMobileWrites: true }) : createClient();

      // Credit: reserve it first (the database refuses anything over the limit), then sell
      let creditEntryId: string | null = null;
      if (onCredit && selectedCustomer?.id) {
        try {
          creditEntryId = await reserveCredit(
            { orgId, customerId: selectedCustomer.id, amount: grandTotal, termsDays: selectedCustomer.credit_terms_days ?? 30, recordedBy: "AUREVYN POS" },
            saleClient
          );
        } catch (creditErr) {
          alert(creditErrorMessage(creditErr));
          return;
        }
      }

      let created;
      try {
        created = await createSale(sale, saleClient, financeAccountId, { onCredit });
      } catch (saleErr) {
        if (creditEntryId) await cancelCredit(creditEntryId, saleClient);
        throw saleErr;
      }
      if (creditEntryId) await linkCreditToSale(creditEntryId, created.id, saleClient);
setCompletedSale({
  ...created,
  id: created.id!,
  cashier: created.cashier ?? sale.cashier ?? "System",
  items,
});

      for (const line of onCredit ? [] : paymentLines) {
        await recordPayment({
          orgId,
          sourceType: "pos_sale",
          sourceId: created.id,
          details: line,
          financeAccountId,
        }, saleClient);
      }

      for (const item of cart) {
        await updateStock(
          item.productId,
          item.quantity,
          "stock_out",
          `POS Sale ${created.id}`,
          selectedWarehouseId || undefined,
          saleClient
        );
      }

await logActivity({
        icon: "🛒",
        title: "POS Sale Completed",
        sub: `KES ${cartTotal.toLocaleString()}`,
        org_id: orgId,
      }, saleClient);

      setCart([]);
      setSelectedDiscountId("");
      setPaymentLines([]);
      setPaymentValid(false);
      setChangeDue(0);
      setOnCredit(false);

const [productsData, salesData, stockLevelsData] =
  await Promise.all([
    getProducts(orgId),
    getSales(orgId),
    getStockLevelsMap(orgId)
  ]);

setProducts(productsData);
setSales(salesData);
setStockLevels(stockLevelsData);

     setShowReceipt(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("Sale failed:", message, error);

      const looksLikeNetworkFailure =
        typeof navigator !== "undefined" && !navigator.onLine ||
        /fetch|network|Failed to fetch/i.test(message);

      if (looksLikeNetworkFailure && sale && !onCredit) {
        queueOfflineSale(
          sale,
          paymentLines,
          cart.map((item) => ({ productId: item.productId, quantity: item.quantity })),
          selectedWarehouseId || null
        );
        setPendingSyncCount(getQueuedSales().length);
        setCart([]);
        setSelectedDiscountId("");
        setPaymentLines([]);
        setPaymentValid(false);
        setChangeDue(0);
        alert("Connection dropped mid-sale — it's been saved on your phone and will sync automatically once you're back online.");
      } else {
        alert(`Failed to complete sale: ${message}`);
      }
    } finally {
      setLoading(false);
    }
  }

const selectedOrgName =
  orgName;
const searchParams = useSearchParams();

const saleId = searchParams.get("sale");
return (
    <div className="pos-mobile-enabled" style={{ display: "flex", height: "100%", minHeight: 0, gap: "20px" }}>
      {/* Main column */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
        <div style={{ flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
            <h1 className={s.pageTitle} style={{ margin: 0 }}>Point of Sale</h1>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap", fontSize: 13, color: "var(--text-secondary)" }}>
              <span>Today <strong style={{ color: "var(--text-primary)" }}>KES {todayRevenue.toLocaleString()}</strong></span>
              <span><strong style={{ color: "var(--text-primary)" }}>{transactionCount}</strong> sale{transactionCount === 1 ? "" : "s"}</span>
              <span>Average <strong style={{ color: "var(--text-primary)" }}>KES {Math.round(averageSale).toLocaleString()}</strong></span>
            </div>
          </div>

          {pendingSyncCount > 0 && (
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: syncing ? "#3dd68c" : "#f59e0b",
                background: syncing ? "#3dd68c20" : "#f59e0b20",
                border: `1px solid ${syncing ? "#3dd68c" : "#f59e0b"}40`,
                borderRadius: 8,
                padding: "6px 10px",
                display: "inline-block",
                marginBottom: 10,
              }}
            >
              {syncing
                ? "Syncing offline sales…"
                : `${pendingSyncCount} sale${pendingSyncCount === 1 ? "" : "s"} saved offline, waiting to sync`}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "center", flexWrap: "wrap" }}>
            <input
              className={s.input}
              placeholder="Search name or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: "1 1 220px", maxWidth: 320 }}
            />

            {warehouses.length > 1 && (
              <select
                className={s.input}
                value={selectedWarehouseId}
                onChange={(e) => setSelectedWarehouseId(e.target.value)}
                style={{ width: 180 }}
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    Selling from: {w.name}
                  </option>
                ))}
              </select>
            )}

            <div style={{ flex: 1 }} />

            <button className={tab === "sales" ? s.filterBtnActive : s.filterBtn} onClick={() => setTab("sales")}>
              Sales
            </button>
            <button className={tab === "history" ? s.filterBtnActive : s.filterBtn} onClick={() => setTab("history")}>
              History
            </button>
            <button className={s.filterBtn} onClick={() => window.open(`/org/${orgId}/pos/return`, "_self")}>
              Returns
            </button>
            <button className={s.filterBtn} onClick={() => window.open(`/org/${orgId}/pos/summary`, "_self")}>
              Sales Summary
            </button>
            <button className={s.filterBtn} onClick={handleExportSalesCSV}>
              Export CSV
            </button>
          </div>

          {tab === "sales" && drawers.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14, maxHeight: 118, overflowY: "auto" }}>
              {drawers.map((drawer) => (
                <div
                  key={drawer.name}
                  role="button"
                  tabIndex={0}
                  onClick={() => setOpenCategory(openCategory === drawer.name ? null : drawer.name)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setOpenCategory(openCategory === drawer.name ? null : drawer.name); }}
                  className={s.card}
                  style={{
                    padding: "8px 14px",
                    cursor: "pointer",
                    minWidth: 110,
                    borderColor: openCategory === drawer.name ? "var(--gold)" : undefined,
                  }}
                >
                  <div style={{ height: 3, width: 24, background: "var(--border)", borderRadius: 2, marginBottom: 6 }} />
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{drawer.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {drawer.count} item{drawer.count === 1 ? "" : "s"}
                  </div>
                </div>
              ))}
            </div>
          )}
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
                  <span>{sale.created_at ? new Date(sale.created_at).toLocaleString("en-KE") : "—"}</span>
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
          width: 340,
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
              style={{ padding: "10px 4px", borderBottom: "1px solid var(--border)" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{item.name}</div>
                <div style={{ fontSize: 13, color: "var(--gold)", fontWeight: 600, whiteSpace: "nowrap" }}>
                  KES {(item.quantity * item.price).toLocaleString()}
                </div>
              </div>
              <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <button className={s.filterBtn} onClick={() => decreaseQty(item.productId)}>-</button>
                  <div style={{ minWidth: 24, textAlign: "center" }}>{item.quantity}</div>
                  <button className={s.filterBtn} onClick={() => increaseQty(item.productId)}>+</button>
                </div>
                <button className={s.btnGhost} style={{ padding: "2px 8px", fontSize: 12 }} onClick={() => removeItem(item.productId)}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: 16, borderTop: "1px solid var(--border)", flexShrink: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          <CustomerSelector
            orgId={orgId}
            value={selectedCustomer?.id || ""}
            onChange={(c) => {
              setSelectedCustomer(c);
              setOnCredit(false);
              setCreditBalance(0);
              setPricelistOverride(""); // back to automatic (that customer's own pricelist) on switch
            }}
            refreshKey={customerRefreshKey}
          />

          <div style={{ display: "flex", gap: 8 }}>
            <select
              value={pricelistOverride}
              onChange={(e) => setPricelistOverride(e.target.value)}
              className={s.input}
              aria-label="Pricelist for this sale"
              style={{ flex: 1, minWidth: 0 }}
            >
              <option value="">
                {selectedCustomer?.pricelist_id ? "Pricelist: customer's own" : "Pricelist: base price"}
              </option>
              <option value="base">Pricelist: base price</option>
              {pricelists.map((pl) => (
                <option key={pl.id} value={pl.id}>
                  Pricelist: {pl.name}
                </option>
              ))}
            </select>
            <button className={s.btnGhost} onClick={() => setShowCustomerModal(true)}>
              + Customer
            </button>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 4, fontWeight: 700 }}>
            <span>Total</span>
            <span style={{ fontSize: 20 }}>KES {cartTotal.toLocaleString()}</span>
          </div>

          <button className={s.btnGold} onClick={() => setCheckoutOpen(true)} style={{ width: "100%", padding: "12px 0" }}>
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

              {creditLimit > 0 && (
                <div style={{ marginTop: 16, padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 10, fontSize: 13 }}>
                  <label style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer", fontWeight: 600 }}>
                    <input type="checkbox" checked={onCredit} onChange={(e) => setOnCredit(e.target.checked)} />
                    Sell on credit to {selectedCustomer?.name}
                  </label>
                  <div style={{ marginTop: 6, color: "var(--text-muted)", fontSize: 12 }}>
                    Owes KES {creditBalance.toLocaleString()} · Limit KES {creditLimit.toLocaleString()} · Available KES {creditAvailable.toLocaleString()}
                  </div>
                  {onCredit && grandTotal > creditAvailable && (
                    <div style={{ marginTop: 6, color: "#ef4444", fontWeight: 600, fontSize: 12 }}>
                      Over the credit limit by KES {(grandTotal - creditAvailable).toLocaleString()}. Take part payment now or remove items.
                    </div>
                  )}
                </div>
              )}

              <div style={{ marginTop: 20, display: onCredit ? "none" : "block" }}>
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
                  disabled={(onCredit ? grandTotal > creditAvailable : !paymentValid) || loading}
                  onClick={async () => {
                    await handleCompleteSale();
                    setCheckoutOpen(false);
                  }}
                >
                  {loading ? "Processing..." : onCredit ? "Complete on Credit" : "Complete Payment"}
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
