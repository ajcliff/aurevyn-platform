import { getSales, type PosSale } from "@/lib/pos";
import { getProducts, type InventoryProduct } from "@/lib/inventory";
import { getOutstandingInvoices, type OrgInvoice } from "@/lib/orgInvoices";
import { getCashflow, type CashflowEntry } from "@/lib/finance";

export type InsightSeverity = "critical" | "warning" | "positive" | "info";
export type InsightCategory = "sales" | "inventory" | "customers" | "finance";

export type Insight = {
  id: string;
  category: InsightCategory;
  severity: InsightSeverity;
  title: string;
  detail: string;
  metric: string | null;
  href: string;
  breakdown?: { label: string; value: string }[];
};

const DAY = 86400000;

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * DAY);
}

function inRange(dateStr: string, from: Date, to: Date): boolean {
  const t = new Date(dateStr).getTime();
  return t >= from.getTime() && t < to.getTime();
}

/* =========================================================
   SALES
========================================================= */

// Week-over-week revenue trend. Skips entirely if there isn't a full prior
// week to compare against, or if the move is too small to be worth surfacing.
function salesTrendInsight(sales: PosSale[], orgId: string): Insight | null {
  const now = new Date();
  const last7 = sales.filter((s) => s.created_at && inRange(s.created_at, daysAgo(7), now));
  const prior7 = sales.filter((s) => s.created_at && inRange(s.created_at, daysAgo(14), daysAgo(7)));
  if (prior7.length === 0) return null;

  const last7Total = last7.reduce((s, x) => s + Number(x.total), 0);
  const prior7Total = prior7.reduce((s, x) => s + Number(x.total), 0);
  if (prior7Total === 0) return null;

  const pct = Math.round(((last7Total - prior7Total) / prior7Total) * 100);
  if (Math.abs(pct) < 5) return null;

  const severity: InsightSeverity = pct <= -10 ? "critical" : pct < 0 ? "warning" : "positive";
  return {
    id: "sales-trend",
    category: "sales",
    severity,
    title: pct < 0 ? `Revenue dropped ${Math.abs(pct)}% vs last week` : `Revenue up ${pct}% vs last week`,
    detail: `KES ${last7Total.toLocaleString()} this week vs KES ${prior7Total.toLocaleString()} last week.`,
    metric: `${pct > 0 ? "+" : ""}${pct}%`,
    href: `/org/${orgId}/pos/summary`,
    breakdown: [
      { label: "This week", value: `KES ${last7Total.toLocaleString()}` },
      { label: "Last week", value: `KES ${prior7Total.toLocaleString()}` },
    ],
  };
}

// Biggest single-product mover week-over-week, ignoring tiny revenue bases
// (a product going from KES 100 to KES 400 is a 300% "surge" that isn't real signal).
function topMoverInsight(sales: PosSale[], orgId: string): Insight | null {
  const now = new Date();
  const thisWeek = new Map<string, number>();
  const lastWeek = new Map<string, number>();

  sales.forEach((s) => {
    if (!s.created_at) return;
    const bucket = inRange(s.created_at, daysAgo(7), now)
      ? thisWeek
      : inRange(s.created_at, daysAgo(14), daysAgo(7))
        ? lastWeek
        : null;
    if (!bucket) return;
    (s.items || []).forEach((i) => bucket.set(i.product_name, (bucket.get(i.product_name) || 0) + Number(i.total)));
  });

  let best: { name: string; pct: number; thisWk: number; lastWk: number } | null = null;
  thisWeek.forEach((thisWk, name) => {
    const lastWk = lastWeek.get(name) || 0;
    if (lastWk < 500) return;
    const pct = Math.round(((thisWk - lastWk) / lastWk) * 100);
    if (!best || Math.abs(pct) > Math.abs(best.pct)) best = { name, pct, thisWk, lastWk };
  });

  if (!best || Math.abs(best.pct) < 25) return null;

  return {
    id: "top-mover",
    category: "sales",
    severity: best.pct > 0 ? "positive" : "warning",
    title: `${best.name} ${best.pct > 0 ? "surged" : "dropped"} ${Math.abs(best.pct)}% this week`,
    detail: `KES ${best.thisWk.toLocaleString()} this week vs KES ${best.lastWk.toLocaleString()} last week.`,
    metric: `${best.pct > 0 ? "+" : ""}${best.pct}%`,
    href: `/org/${orgId}/pos/summary`,
  };
}

/* =========================================================
   INVENTORY
========================================================= */

// Products still in stock that haven't appeared in a single sale in 30 days.
function slowMovingStockInsight(sales: PosSale[], products: InventoryProduct[], orgId: string): Insight | null {
  const since = daysAgo(30);
  const soldNames = new Set<string>();
  sales
    .filter((s) => s.created_at && new Date(s.created_at) >= since)
    .forEach((s) => (s.items || []).forEach((i) => soldNames.add(i.product_name)));

  const slow = products.filter((p) => Number(p.stock_quantity) > 0 && !soldNames.has(p.name));
  if (slow.length === 0) return null;

  return {
    id: "slow-moving-stock",
    category: "inventory",
    severity: slow.length >= 5 ? "warning" : "info",
    title: `${slow.length} product${slow.length === 1 ? "" : "s"} haven't sold in 30 days`,
    detail: slow.slice(0, 5).map((p) => p.name).join(", ") + (slow.length > 5 ? ` +${slow.length - 5} more` : ""),
    metric: `${slow.length}`,
    href: `/org/${orgId}/inventory`,
    breakdown: slow.slice(0, 8).map((p) => ({ label: p.name, value: `${p.stock_quantity} ${p.unit || "units"} in stock` })),
  };
}

/* =========================================================
   CUSTOMERS
========================================================= */

// Customers with a regular buying cadence (3+ orders, avg gap under 45 days)
// who've gone quiet for 60+ days — a churn signal distinct from "no order yet".
function customerChurnInsight(sales: PosSale[], orgId: string): Insight | null {
  const byCustomer = new Map<string, { name: string; dates: number[] }>();

  sales.forEach((s) => {
    if (!s.customer_id || !s.created_at) return;
    const entry = byCustomer.get(s.customer_id) ?? { name: s.customer_name || "Customer", dates: [] };
    entry.dates.push(new Date(s.created_at).getTime());
    byCustomer.set(s.customer_id, entry);
  });

  const now = Date.now();
  const atRisk: { name: string; daysSince: number }[] = [];

  byCustomer.forEach((entry) => {
    if (entry.dates.length < 3) return;
    const sorted = [...entry.dates].sort((a, b) => a - b);
    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i++) gaps.push((sorted[i] - sorted[i - 1]) / DAY);
    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const daysSinceLast = (now - sorted[sorted.length - 1]) / DAY;
    if (avgGap <= 45 && daysSinceLast >= 60) {
      atRisk.push({ name: entry.name, daysSince: Math.round(daysSinceLast) });
    }
  });

  if (atRisk.length === 0) return null;
  atRisk.sort((a, b) => b.daysSince - a.daysSince);

  return {
    id: "customer-churn-risk",
    category: "customers",
    severity: atRisk.length >= 3 ? "warning" : "info",
    title: `${atRisk.length} regular customer${atRisk.length === 1 ? "" : "s"} may be churning`,
    detail: atRisk.slice(0, 5).map((c) => `${c.name} (${c.daysSince}d)`).join(", "),
    metric: `${atRisk.length}`,
    href: `/org/${orgId}/crm`,
    breakdown: atRisk.slice(0, 8).map((c) => ({ label: c.name, value: `${c.daysSince} days since last order` })),
  };
}

/* =========================================================
   FINANCE
========================================================= */

// 30-day net cash flow vs the prior 30 days.
function cashflowTrendInsight(entries: CashflowEntry[], orgId: string): Insight | null {
  const now = new Date();
  const last30 = entries.filter((e) => inRange(e.date, daysAgo(30), now));
  const prior30 = entries.filter((e) => inRange(e.date, daysAgo(60), daysAgo(30)));
  if (prior30.length === 0) return null;

  const net = (arr: CashflowEntry[]) =>
    arr.reduce((s, e) => s + (e.type === "inflow" ? Number(e.amount) : -Number(e.amount)), 0);

  const last30Net = net(last30);
  const prior30Net = net(prior30);
  if (prior30Net === 0) return null;

  const pct = Math.round(((last30Net - prior30Net) / Math.abs(prior30Net)) * 100);
  if (last30Net >= 0 && Math.abs(pct) < 10) return null;

  const severity: InsightSeverity = last30Net < 0 ? "critical" : pct < 0 ? "warning" : "positive";
  return {
    id: "cashflow-trend",
    category: "finance",
    severity,
    title:
      last30Net < 0
        ? "Net cash flow is negative this month"
        : pct < 0
          ? `Net cash flow down ${Math.abs(pct)}%`
          : `Net cash flow up ${pct}%`,
    detail: `Net KES ${last30Net.toLocaleString()} over the last 30 days vs KES ${prior30Net.toLocaleString()} the 30 days before.`,
    metric: `${pct > 0 ? "+" : ""}${pct}%`,
    href: `/org/${orgId}/finance`,
    breakdown: [
      { label: "Last 30 days", value: `KES ${last30Net.toLocaleString()}` },
      { label: "Prior 30 days", value: `KES ${prior30Net.toLocaleString()}` },
    ],
  };
}

// Aging distribution of outstanding invoices — flags when a meaningful chunk
// of receivables has drifted past 60 days, distinct from Overview's flat
// "these invoices are overdue" list.
function receivablesAgingInsight(invoices: OrgInvoice[], orgId: string): Insight | null {
  if (invoices.length === 0) return null;
  const now = new Date();
  const buckets = { current: 0, d30: 0, d60: 0, d90: 0 };

  invoices.forEach((inv) => {
    const days = Math.floor((now.getTime() - new Date(inv.due_date).getTime()) / DAY);
    const amt = Number(inv.total);
    if (days <= 0) buckets.current += amt;
    else if (days <= 30) buckets.d30 += amt;
    else if (days <= 60) buckets.d60 += amt;
    else buckets.d90 += amt;
  });

  const total = buckets.current + buckets.d30 + buckets.d60 + buckets.d90;
  const overdueOld = buckets.d60 + buckets.d90;
  if (total === 0 || overdueOld === 0) return null;

  const pctOld = Math.round((overdueOld / total) * 100);
  if (pctOld < 15) return null;

  return {
    id: "receivables-aging",
    category: "finance",
    severity: pctOld >= 40 ? "critical" : "warning",
    title: `${pctOld}% of receivables are 60+ days overdue`,
    detail: `KES ${overdueOld.toLocaleString()} of KES ${total.toLocaleString()} outstanding is aged past 60 days.`,
    metric: `${pctOld}%`,
    href: `/org/${orgId}/finance/invoices`,
    breakdown: [
      { label: "Current", value: `KES ${buckets.current.toLocaleString()}` },
      { label: "1-30 days", value: `KES ${buckets.d30.toLocaleString()}` },
      { label: "31-60 days", value: `KES ${buckets.d60.toLocaleString()}` },
      { label: "60+ days", value: `KES ${buckets.d90.toLocaleString()}` },
    ],
  };
}

/* =========================================================
   ORCHESTRATOR
========================================================= */

const SEVERITY_ORDER: Record<InsightSeverity, number> = {
  critical: 0,
  warning: 1,
  positive: 2,
  info: 3,
};

export async function getInsights(orgId: string, installedSlugs: string[]): Promise<Insight[]> {
  const hasPos = installedSlugs.includes("pos");
  const hasInventory = installedSlugs.includes("inventory");
  const hasFinance = installedSlugs.includes("finance");

  const [sales, products, cashflow, outstandingInvoices] = await Promise.all([
    hasPos ? getSales(orgId) : Promise.resolve([] as PosSale[]),
    hasInventory ? getProducts(orgId) : Promise.resolve([] as InventoryProduct[]),
    hasFinance ? getCashflow(orgId) : Promise.resolve([] as CashflowEntry[]),
    hasFinance ? getOutstandingInvoices(orgId) : Promise.resolve([] as OrgInvoice[]),
  ]);

  const insights: Insight[] = [];

  if (hasPos) {
    const trend = salesTrendInsight(sales, orgId);
    if (trend) insights.push(trend);

    const mover = topMoverInsight(sales, orgId);
    if (mover) insights.push(mover);

    const churn = customerChurnInsight(sales, orgId);
    if (churn) insights.push(churn);
  }

  if (hasPos && hasInventory) {
    const slow = slowMovingStockInsight(sales, products, orgId);
    if (slow) insights.push(slow);
  }

  if (hasFinance) {
    const cf = cashflowTrendInsight(cashflow, orgId);
    if (cf) insights.push(cf);

    const rec = receivablesAgingInsight(outstandingInvoices, orgId);
    if (rec) insights.push(rec);
  }

  return insights.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}