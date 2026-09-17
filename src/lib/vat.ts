import { createClient } from "./supabase";
import { getOrgSettings } from "@/lib/orgSettings";

export type VatSummary = {
  from: string;
  to: string;
  rate: number;
  outputVatInvoices: number;
  outputVatPosSales: number;
  outputVatTotal: number;
  inputVatPurchases: number;
  netVatPayable: number;
};

// Output VAT = VAT collected on sales (org invoices already store vat_amount
// per invoice; POS sales store tax_amount per sale, extracted at checkout).
// Input VAT = VAT paid on purchases, extracted from purchase_orders.vat_amount
// for orders that have actually received goods (not just approved/ordered).
export async function getVatSummary(orgId: string, from: string, to: string): Promise<VatSummary> {
  const supabase = createClient();
  const settings = await getOrgSettings(orgId);

  const [{ data: invoices }, { data: sales }, { data: pos }] = await Promise.all([
    supabase
      .from("org_invoices")
      .select("vat_amount, issue_date")
      .eq("org_id", orgId)
      .gte("issue_date", from)
      .lte("issue_date", to),
    supabase
      .from("purchase_orders")
      .select("vat_amount, status, created_at")
      .eq("org_id", orgId)
      .in("status", ["received", "partially_received"])
      .gte("created_at", from)
      .lte("created_at", to + "T23:59:59"),
    supabase
      .from("pos_sales")
      .select("tax_amount, created_at")
      .eq("org_id", orgId)
      .gte("created_at", from)
      .lte("created_at", to + "T23:59:59"),
  ]);

  const outputVatInvoices = (invoices || []).reduce((sum, i) => sum + Number(i.vat_amount || 0), 0);
  const outputVatPosSales = (pos || []).reduce((sum, s) => sum + Number(s.tax_amount || 0), 0);
  const inputVatPurchases = (sales || []).reduce((sum, p) => sum + Number(p.vat_amount || 0), 0);
  const outputVatTotal = outputVatInvoices + outputVatPosSales;

  return {
    from,
    to,
    rate: settings.default_vat_rate,
    outputVatInvoices,
    outputVatPosSales,
    outputVatTotal,
    inputVatPurchases,
    netVatPayable: outputVatTotal - inputVatPurchases,
  };
}
