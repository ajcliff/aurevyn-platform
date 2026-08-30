import { createClient } from "@/lib/supabase";
import type { PosSale } from "@/lib/pos";

export type SalesSummaryData = {
  totalRevenue: number;
  totalTransactions: number;
  averageSale: number;
  totalDiscounts: number;
  byPaymentMethod: Record<string, number>;
  topProducts: { name: string; quantity: number; revenue: number }[];
  sales: PosSale[];
};

export async function getSalesSummary(
  orgId: string,
  startDate: string,
  endDate: string
): Promise<SalesSummaryData> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("pos_sales")
    .select("*")
    .eq("org_id", orgId)
    .gte("created_at", startDate)
    .lte("created_at", `${endDate}T23:59:59`)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const sales = (data || []) as PosSale[];

  const totalRevenue = sales.reduce((s, sale) => s + Number(sale.total), 0);
  const totalTransactions = sales.length;
  const averageSale = totalTransactions ? totalRevenue / totalTransactions : 0;
  const totalDiscounts = sales.reduce((s, sale) => s + Number(sale.discount_amount || 0), 0);

  const byPaymentMethod: Record<string, number> = {};
  sales.forEach((sale) => {
    byPaymentMethod[sale.payment_method] = (byPaymentMethod[sale.payment_method] || 0) + Number(sale.total);
  });

  const productTotals: Record<string, { quantity: number; revenue: number }> = {};
  sales.forEach((sale) => {
    (sale.items || []).forEach((item) => {
      if (!productTotals[item.product_name]) {
        productTotals[item.product_name] = { quantity: 0, revenue: 0 };
      }
      productTotals[item.product_name].quantity += Number(item.quantity);
      productTotals[item.product_name].revenue += Number(item.total);
    });
  });

  const topProducts = Object.entries(productTotals)
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  return { totalRevenue, totalTransactions, averageSale, totalDiscounts, byPaymentMethod, topProducts, sales };
}