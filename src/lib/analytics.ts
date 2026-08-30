import { getSales, type PosSale } from "@/lib/pos";
import { getProducts, getMovements, type InventoryProduct } from "@/lib/inventory";
import { getOutstandingInvoices, type OrgInvoice } from "@/lib/orgInvoices";
import { getPaymentsSince, methodLabel, type Payment, type PaymentMethod } from "@/lib/payments";

/* =========================================================
   DATE RANGE
========================================================= */

export type RangePreset = "week" | "month" | "quarter" | "custom";

export type DateRange = { from: Date; to: Date };

export function getPresetRange(preset: Exclude<RangePreset, "custom">): DateRange {
  const to = new Date();
  const from = new Date();
  if (preset === "week") from.setDate(to.getDate() - 7);
  if (preset === "month") from.setMonth(to.getMonth() - 1);
  if (preset === "quarter") from.setMonth(to.getMonth() - 3);
  from.setHours(0, 0, 0, 0);
  return { from, to };
}

function inRange(dateStr: string, range: DateRange): boolean {
  const t = new Date(dateStr).getTime();
  return t >= range.from.getTime() && t <= range.to.getTime();
}

/* =========================================================
   SALES TREND
========================================================= */

export type DailyRevenuePoint = { date: string; revenue: number; transactions: number };

export function getSalesTrend(sales: PosSale[], range: DateRange): DailyRevenuePoint[] {
  const byDay = new Map<string, { revenue: number; count: number }>();

  sales
    .filter((s) => s.created_at && inRange(s.created_at, range))
    .forEach((s) => {
      const day = new Date(s.created_at!).toISOString().slice(0, 10);
      const entry = byDay.get(day) ?? { revenue: 0, count: 0 };
      entry.revenue += Number(s.total);
      entry.count += 1;
      byDay.set(day, entry);
    });

  return Array.from(byDay.entries())
    .map(([date, v]) => ({ date, revenue: v.revenue, transactions: v.count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/* =========================================================
   TOP / BOTTOM PRODUCTS
========================================================= */

export type ProductPerformance = { name: string; revenue: number; quantity: number };

export function getTopBottomProducts(
  sales: PosSale[],
  range: DateRange,
  limit = 5
): { top: ProductPerformance[]; bottom: ProductPerformance[] } {
  const totals = new Map<string, ProductPerformance>();

  sales
    .filter((s) => s.created_at && inRange(s.created_at, range))
    .forEach((s) =>
      (s.items || []).forEach((i) => {
        const existing = totals.get(i.product_name);
        if (existing) {
          existing.revenue += Number(i.total);
          existing.quantity += Number(i.quantity);
        } else {
          totals.set(i.product_name, { name: i.product_name, revenue: Number(i.total), quantity: Number(i.quantity) });
        }
      })
    );

  const all = Array.from(totals.values());
  const top = [...all].sort((a, b) => b.revenue - a.revenue).slice(0, limit);
  const bottom = [...all].sort((a, b) => a.revenue - b.revenue).slice(0, limit);
  return { top, bottom };
}

/* =========================================================
   REVENUE BY PAYMENT METHOD
========================================================= */

export type PaymentMethodBreakdown = { method: PaymentMethod; label: string; amount: number; count: number };

export function getRevenueByPaymentMethod(payments: Payment[], range: DateRange): PaymentMethodBreakdown[] {
  const totals = new Map<PaymentMethod, { amount: number; count: number }>();

  payments
    .filter((p) => p.status !== "bounced" && inRange(p.created_at, range))
    .forEach((p) => {
      const entry = totals.get(p.method) ?? { amount: 0, count: 0 };
      entry.amount += Number(p.amount);
      entry.count += 1;
      totals.set(p.method, entry);
    });

  return Array.from(totals.entries())
    .map(([method, v]) => ({ method, label: methodLabel(method), amount: v.amount, count: v.count }))
    .sort((a, b) => b.amount - a.amount);
}

/* =========================================================
   RECEIVABLES AGING
========================================================= */

export type AgingBucket = { label: string; amount: number };

export function getReceivablesAgingBuckets(invoices: OrgInvoice[]): AgingBucket[] {
  const now = new Date();
  const buckets = { current: 0, d30: 0, d60: 0, d90: 0 };

  invoices.forEach((inv) => {
    const days = Math.floor((now.getTime() - new Date(inv.due_date).getTime()) / 86400000);
    const amt = Number(inv.total);
    if (days <= 0) buckets.current += amt;
    else if (days <= 30) buckets.d30 += amt;
    else if (days <= 60) buckets.d60 += amt;
    else buckets.d90 += amt;
  });

  return [
    { label: "Current", amount: buckets.current },
    { label: "1-30 days", amount: buckets.d30 },
    { label: "31-60 days", amount: buckets.d60 },
    { label: "60+ days", amount: buckets.d90 },
  ];
}

/* =========================================================
   INVENTORY TURNOVER
========================================================= */

export type InventoryTurnover = {
  turnoverRatio: number | null;
  stockOutValue: number;
  currentInventoryValue: number;
};

// Approximates a turnover ratio as (value of stock sold out in range) / (current
// inventory value) — a simplification of COGS / average inventory, since this
// project doesn't track historical inventory value snapshots. Reads the most
// recent 500 movements; fine for a baseline view, but a very high-volume org
// could have more stock-outs in range than that window covers.
export async function getInventoryTurnover(
  orgId: string,
  products: InventoryProduct[],
  range: DateRange
): Promise<InventoryTurnover> {
  const movements = await getMovements(orgId, 500);
  const priceByProduct = new Map(products.map((p) => [p.id, Number(p.unit_price)]));

  const stockOutValue = movements
    .filter((m) => m.type === "stock_out" && m.created_at && inRange(m.created_at, range))
    .reduce((s, m) => s + Number(m.quantity) * (priceByProduct.get(m.product_id) || 0), 0);

  const currentInventoryValue = products.reduce((s, p) => s + Number(p.stock_quantity) * Number(p.unit_price), 0);
  const turnoverRatio = currentInventoryValue > 0 ? stockOutValue / currentInventoryValue : null;

  return { turnoverRatio, stockOutValue, currentInventoryValue };
}