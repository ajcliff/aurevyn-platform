import jsPDF from "jspdf";
import { getOrgSettings, getOrgLogoUrl } from "@/lib/orgSettings";
import { getInvoice, type OrgInvoiceWithItems } from "@/lib/orgInvoices";

// One printable customer invoice, used by the Invoices page (download) and Documents (open in a new tab).
const kes = (n: number) => `KES ${Number(n).toLocaleString("en-KE")}`;

// jsPDF needs an embedded image as a data URL, so the logo is fetched and converted in the browser.
async function logoDataUrl(url: string): Promise<string | null> {
  try {
    const blob = await (await fetch(url)).blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function buildOrgInvoicePdf(inv: OrgInvoiceWithItems, orgId: string, orgName: string): Promise<jsPDF> {
  const settings = await getOrgSettings(orgId).catch(() => null);
  const pdf = new jsPDF();
  const PAGE_BOTTOM = 275;
  let y = 20;

  const businessName = settings?.business_name || orgName;
  const logoUrl = getOrgLogoUrl(settings?.logo_path ?? null);
  const logo = logoUrl ? await logoDataUrl(logoUrl) : null;
  if (logo) {
    try { pdf.addImage(logo, "PNG", 20, y - 8, 24, 24); } catch { /* a logo that cannot be embedded is skipped */ }
  }
  const textX = logo ? 52 : 20;
  pdf.setFontSize(20);
  pdf.text(businessName, textX, y);
  y += 8;
  pdf.setFontSize(10);
  if (settings?.business_address) { pdf.text(settings.business_address, textX, y); y += 5; }
  if (settings?.business_phone) { pdf.text(`Tel: ${settings.business_phone}`, textX, y); y += 5; }

  y = Math.max(y, 38) + 8;
  pdf.setFontSize(14);
  pdf.text(`INVOICE ${inv.invoice_number}`, 20, y);
  pdf.setFontSize(10);
  y += 10;
  pdf.text(`Bill To: ${inv.customers?.name || "Walk-in Customer"}`, 20, y);
  pdf.text(`Issue date: ${inv.issue_date}`, 190, y, { align: "right" });
  y += 6;
  pdf.text(`Status: ${inv.status.toUpperCase()}`, 20, y);
  pdf.text(`Due date: ${inv.due_date}`, 190, y, { align: "right" });

  const tableHead = () => {
    pdf.setFontSize(10);
    pdf.text("Description", 20, y);
    pdf.text("Qty", 120, y);
    pdf.text("Unit price", 145, y);
    pdf.text("Total", 190, y, { align: "right" });
    y += 4;
    pdf.line(20, y, 190, y);
    y += 8;
  };
  y += 14;
  tableHead();

  for (const item of inv.items) {
    const lines = pdf.splitTextToSize(item.description || "", 92) as string[];
    const rowHeight = Math.max(lines.length, 1) * 5 + 3;
    if (y + rowHeight > PAGE_BOTTOM) { pdf.addPage(); y = 20; tableHead(); }
    pdf.text(lines, 20, y);
    pdf.text(String(item.quantity), 120, y);
    pdf.text(Number(item.unit_price).toLocaleString("en-KE"), 145, y);
    pdf.text(Number(item.total).toLocaleString("en-KE"), 190, y, { align: "right" });
    y += rowHeight;
  }

  if (y + 60 > PAGE_BOTTOM) { pdf.addPage(); y = 20; }
  y += 2;
  pdf.line(20, y, 190, y);
  y += 9;
  pdf.setFontSize(10);
  pdf.text(`Subtotal: ${kes(inv.subtotal)}`, 190, y, { align: "right" });
  y += 7;
  pdf.text(`VAT (${inv.vat_rate}%): ${kes(inv.vat_amount)}`, 190, y, { align: "right" });
  y += 8;
  pdf.setFontSize(14);
  pdf.text(`TOTAL: ${kes(inv.total)}`, 190, y, { align: "right" });
  if (Number(inv.wht_amount) > 0) {
    y += 8;
    pdf.setFontSize(10);
    pdf.text(`Withholding tax (${inv.wht_rate}%) to be deducted by the payer: ${kes(inv.wht_amount)}`, 190, y, { align: "right" });
    y += 6;
    pdf.text(`Net payable: ${kes(Number(inv.total) - Number(inv.wht_amount))}`, 190, y, { align: "right" });
  }
  if (inv.notes) {
    y += 14;
    pdf.setFontSize(10);
    const notes = pdf.splitTextToSize(`Notes: ${inv.notes}`, 170) as string[];
    pdf.text(notes, 20, y);
    y += notes.length * 5;
  }
  y += 14;
  pdf.setFontSize(10);
  pdf.text(`Thank you for your business. ${businessName}`, 20, y);
  return pdf;
}

export async function downloadOrgInvoicePdf(inv: OrgInvoiceWithItems, orgId: string, orgName: string) {
  const pdf = await buildOrgInvoicePdf(inv, orgId, orgName);
  pdf.save(`${inv.invoice_number}.pdf`);
}

// For Documents: loads the invoice by id and opens the printable copy in a new tab.
export async function openOrgInvoicePdf(invoiceId: string, orgId: string, orgName: string): Promise<boolean> {
  const inv = await getInvoice(invoiceId);
  if (!inv) return false;
  const pdf = await buildOrgInvoicePdf(inv, orgId, orgName);
  window.open(URL.createObjectURL(pdf.output("blob")), "_blank");
  return true;
}
