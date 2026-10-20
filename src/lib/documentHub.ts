import jsPDF from "jspdf";
import { createClient } from "@/lib/supabase";
import { getPurchaseOrders, type PurchaseOrder } from "@/lib/purchaseOrders";
import { getInvoices as getOrgInvoices } from "@/lib/orgInvoices";
import { getReceipts } from "@/lib/receipts";
import { downloadReceiptPdf } from "@/lib/billingPdf";
import { openOrgInvoicePdf } from "@/lib/orgInvoicePdf";
import type { Invoice } from "@/lib/invoices";

// Everything the business has produced, in one list. Uploaded files live in the "documents" table;
// the rest already exist in their own tables (purchase orders, receipts, invoices), so Documents
// reads them from there. Nothing is copied, so a record can never be missing from Documents.
export type HubKind = "purchase_order" | "pos_receipt" | "payment_receipt" | "invoice";

export const HUB_LABELS: Record<HubKind, string> = {
  purchase_order: "Purchase Order",
  pos_receipt: "Sales Receipt",
  payment_receipt: "AUREVYN Payment Receipt",
  invoice: "Customer Invoice",
};

export type HubItem = {
  key: string;
  kind: HubKind;
  title: string;
  subtitle: string;
  date: string;
  amount: number | null;
  // Where the record is managed (edit, pay, receive...)
  manageHref: string;
  // Opens the printable copy
  open: () => Promise<void> | void;
};

const kes = (n: number) => `KES ${Number(n).toLocaleString("en-KE")}`;
const dayStr = (d: string) => new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });

function openPdf(pdf: jsPDF) {
  const url = URL.createObjectURL(pdf.output("blob"));
  window.open(url, "_blank");
}

function purchaseOrderPdf(po: PurchaseOrder, orgName: string) {
  const pdf = new jsPDF();
  pdf.setFontSize(18);
  pdf.text(orgName, 20, 22);
  pdf.setFontSize(13);
  pdf.text(`PURCHASE ORDER ${po.po_number}`, 20, 36);
  pdf.setFontSize(10);
  pdf.text(`Supplier: ${po.supplier_name}`, 20, 45);
  pdf.text(`Date: ${dayStr(po.created_at)}`, 20, 51);
  pdf.text(`Status: ${po.status.replace("_", " ")}`, 20, 57);

  let y = 70;
  pdf.setFontSize(9);
  pdf.text("Item", 20, y);
  pdf.text("Qty", 120, y);
  pdf.text("Unit cost", 145, y);
  pdf.text("Total", 190, y, { align: "right" });
  pdf.line(20, y + 3, 190, y + 3);
  y += 10;
  pdf.setFontSize(10);

  const items = (po.purchase_order_items ?? []).filter((i) => Number(i.quantity) > 0);
  const rows = items.length
    ? items.map((i) => ({ name: i.inventory_products?.name ?? "Item", qty: Number(i.quantity), cost: Number(i.unit_cost) }))
    : [{ name: po.inventory_products?.name ?? "Item", qty: Number(po.quantity ?? 0), cost: Number(po.unit_cost ?? 0) }];
  for (const r of rows) {
    pdf.text(r.name, 20, y);
    pdf.text(String(r.qty), 120, y);
    pdf.text(r.cost.toLocaleString(), 145, y);
    pdf.text((r.qty * r.cost).toLocaleString(), 190, y, { align: "right" });
    y += 7;
  }
  pdf.line(20, y, 190, y);
  y += 9;
  pdf.setFontSize(12);
  pdf.text(`TOTAL: ${kes(po.total_cost)}`, 190, y, { align: "right" });
  openPdf(pdf);
}

async function posReceiptPdf(sale: Record<string, unknown>, orgName: string) {
  const { data: items } = await createClient().from("pos_sale_items").select("product_name, quantity, unit_price, total").eq("sale_id", sale.id as string);
  const pdf = new jsPDF({ unit: "mm", format: [80, 40 + (items?.length ?? 0) * 8 + 30] });
  pdf.setFontSize(12);
  pdf.text(orgName, 40, 10, { align: "center" });
  pdf.setFontSize(8);
  pdf.text(new Date(sale.created_at as string).toLocaleString("en-KE"), 40, 16, { align: "center" });
  pdf.text(`Cashier: ${(sale.cashier as string) || "—"}`, 40, 21, { align: "center" });
  let y = 30;
  for (const i of items ?? []) {
    pdf.text(`${i.quantity} x ${i.product_name}`, 6, y);
    pdf.text(Number(i.total).toLocaleString(), 74, y, { align: "right" });
    y += 6;
  }
  pdf.line(6, y, 74, y);
  y += 7;
  pdf.setFontSize(10);
  pdf.text("TOTAL", 6, y);
  pdf.text(kes(Number(sale.total)), 74, y, { align: "right" });
  pdf.setFontSize(8);
  pdf.text(`Paid by ${sale.payment_method as string}`, 6, y + 6);
  openPdf(pdf);
}

export async function getHubItems(orgId: string, orgName: string): Promise<HubItem[]> {
  const base = `/org/${orgId}`;
  const [pos, orgInvoices, salesRes, payReceipts] = await Promise.all([
    getPurchaseOrders(orgId),
    getOrgInvoices(orgId).catch(() => []),
    createClient().from("pos_sales").select("*").eq("org_id", orgId).order("created_at", { ascending: false }).limit(200),
    getReceipts().then((r) => r.filter((x) => x.org_id === orgId)).catch(() => []),
  ]);

  const items: HubItem[] = [];

  // POs that already have an uploaded PDF show up as that file, so skip them here
  for (const po of pos.filter((p) => !p.document_id)) {
    items.push({
      key: `po-${po.id}`, kind: "purchase_order", title: po.po_number,
      subtitle: `${po.supplier_name} · ${po.status.replace("_", " ")}`, date: po.created_at, amount: Number(po.total_cost),
      manageHref: `${base}/procurement`, open: () => purchaseOrderPdf(po, orgName),
    });
  }

  for (const inv of orgInvoices) {
    items.push({
      key: `inv-${inv.id}`, kind: "invoice", title: inv.invoice_number,
      subtitle: `${inv.customers?.name ?? "Customer"} · ${inv.status}`, date: inv.created_at, amount: Number(inv.total),
      manageHref: `${base}/finance/invoices`,
      open: async () => { if (!(await openOrgInvoicePdf(inv.id, orgId, orgName))) window.location.href = `${base}/finance/invoices`; },
    });
  }

  for (const s of (salesRes.data ?? []) as Record<string, unknown>[]) {
    items.push({
      key: `sale-${s.id}`, kind: "pos_receipt", title: `Sale ${String(s.id).slice(-6).toUpperCase()}`,
      subtitle: `${(s.payment_method as string) ?? ""} · ${(s.cashier as string) ?? ""}`.replace(/^ · | · $/g, ""),
      date: s.created_at as string, amount: Number(s.total),
      manageHref: `${base}/pos`, open: () => posReceiptPdf(s, orgName),
    });
  }

  for (const r of payReceipts) {
    items.push({
      key: `rcpt-${r.id}`, kind: "payment_receipt", title: r.receipt_no,
      subtitle: `${r.method} · paid to AUREVYN`, date: r.paid_at, amount: Number(r.amount_kes),
      manageHref: `${base}/billing`,
      open: async () => {
        const { data } = await createClient().from("invoices").select("*").eq("id", r.invoice_id).maybeSingle();
        downloadReceiptPdf(r, (data ?? undefined) as Invoice | undefined, orgName);
      },
    });
  }

  return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
