import jsPDF from "jspdf";
import type { Invoice } from "./invoices";
import type { Receipt } from "./receipts";

const kes = (n: number) => `KES ${Number(n).toLocaleString("en-KE")}`;
const day = (d: string | null) => (d ? new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }) : "—");

function header(pdf: jsPDF, title: string, number: string): number {
  pdf.setFontSize(18);
  pdf.text("AUREVYN", 20, 22);
  pdf.setFontSize(11);
  pdf.text(title, 190, 22, { align: "right" });
  pdf.setFontSize(10);
  pdf.text(number, 190, 29, { align: "right" });
  pdf.line(20, 35, 190, 35);
  return 46;
}

export function downloadInvoicePdf(invoice: Invoice) {
  const pdf = new jsPDF();
  let y = header(pdf, "INVOICE", invoice.invoice_no);

  pdf.setFontSize(10);
  pdf.text("Billed to", 20, y);
  pdf.text(invoice.org_name, 20, y + 6);
  pdf.text(`Issued: ${day(invoice.created_at)}`, 190, y, { align: "right" });
  pdf.text(`Due: ${day(invoice.due_date)}`, 190, y + 6, { align: "right" });
  pdf.text(`Status: ${invoice.status.toUpperCase()}`, 190, y + 12, { align: "right" });
  y += 28;

  pdf.line(20, y, 190, y);
  y += 8;
  pdf.setFontSize(9);
  pdf.text("Description", 20, y);
  pdf.text("Amount", 190, y, { align: "right" });
  y += 7;
  pdf.setFontSize(10);
  const lines = pdf.splitTextToSize(invoice.description || "Platform subscription", 120) as string[];
  pdf.text(lines, 20, y);
  pdf.text(kes(invoice.amount_kes), 190, y, { align: "right" });
  y += lines.length * 6 + 6;

  pdf.line(20, y, 190, y);
  y += 9;
  pdf.setFontSize(12);
  pdf.text("Total due", 20, y);
  pdf.text(invoice.status === "paid" ? kes(0) : kes(invoice.amount_kes), 190, y, { align: "right" });
  if (invoice.status === "paid") {
    y += 10;
    pdf.setFontSize(9);
    pdf.text(`Paid in full on ${day(invoice.paid_date)}.`, 20, y);
  }
  pdf.save(`${invoice.invoice_no}.pdf`);
}

export function downloadReceiptPdf(receipt: Receipt, invoice: Invoice | undefined, orgName: string) {
  const pdf = new jsPDF();
  let y = header(pdf, "PAYMENT RECEIPT", receipt.receipt_no);

  pdf.setFontSize(10);
  pdf.text("Received from", 20, y);
  pdf.text(orgName, 20, y + 6);
  pdf.text(`Date: ${day(receipt.paid_at)}`, 190, y, { align: "right" });
  y += 24;

  const row = (label: string, value: string) => {
    pdf.setFontSize(9);
    pdf.text(label, 20, y);
    pdf.setFontSize(10);
    pdf.text(value, 190, y, { align: "right" });
    y += 8;
  };
  row("Invoice", invoice?.invoice_no ?? receipt.invoice_id);
  row("Payment method", receipt.method);
  if (receipt.reference) row("Reference", receipt.reference);
  y += 2;
  pdf.line(20, y, 190, y);
  y += 10;
  pdf.setFontSize(12);
  pdf.text("Amount received", 20, y);
  pdf.text(kes(receipt.amount_kes), 190, y, { align: "right" });
  y += 14;
  pdf.setFontSize(8);
  pdf.text("Thank you for your payment.", 20, y);
  pdf.save(`${receipt.receipt_no}.pdf`);
}
