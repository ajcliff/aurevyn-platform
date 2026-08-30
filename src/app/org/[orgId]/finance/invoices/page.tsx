"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useEngine } from "@/lib/runtime/EngineContext";
import jsPDF from "jspdf";
import { getCustomers, type Customer } from "@/lib/customers";
import {
  getInvoices,
  getInvoice,
  createInvoice,
  updateInvoiceStatus,
  markInvoicePaid,
  deleteInvoice,
  type OrgInvoice,
  type OrgInvoiceWithItems,
  type InvoiceItemInput,
} from "@/lib/orgInvoices";
import PaymentMethodForm from "@/components/payments/PaymentMethodForm";
import { type PaymentDetailsInput } from "@/lib/payments";
import { getOrgSettings, getOrgLogoUrl, type OrgSettings } from "@/lib/orgSettings";
import EmptyState from "@/components/EmptyState";
const STATUS_COLORS: Record<string, string> = {
  draft: "var(--text-muted)",
  sent: "#f5b942",
  paid: "#3dd68c",
  overdue: "#ef4444",
  cancelled: "var(--text-muted)",
};

export default function InvoicesPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const { organization } = useEngine();

  const [invoices, setInvoices] = useState<OrgInvoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const [viewing, setViewing] = useState<OrgInvoiceWithItems | null>(null);

  
  const [showMarkPaid, setShowMarkPaid] = useState(false);
  const [paidDetails, setPaidDetails] = useState<PaymentDetailsInput | null>(null);
  const [markingPaid, setMarkingPaid] = useState(false);

  
  const [showNew, setShowNew] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [vatRate, setVatRate] = useState("16");
  const [whtRate, setWhtRate] = useState("0");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<InvoiceItemInput[]>([
    { description: "", quantity: 1, unit_price: 0 },
  ]);
  const [saving, setSaving] = useState(false);
const [orgSettings, setOrgSettings] = useState<OrgSettings | null>(null);

  useEffect(() => {
    load();
  }, []);

async function load() {
    setLoading(true);
    const [inv, cust, settings] = await Promise.all([
      getInvoices(organization.id),
      getCustomers(organization.id),
      getOrgSettings(organization.id),
    ]);
    setInvoices(inv);
    setCustomers(cust);
    setOrgSettings(settings);
    setVatRate(String(settings.default_vat_rate));
    setWhtRate(String(settings.default_wht_rate));
    setLoading(false);
  }

  // jsPDF needs an embedded image as a data URL, not just a hosted URL —
  // fetches the logo once and converts it in-browser
  async function loadImageAsDataUrl(url: string): Promise<string | null> {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.error("Failed to load logo for PDF:", err);
      return null;
    }
  }

  function updateItem(index: number, field: keyof InvoiceItemInput, value: string) {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              [field]: field === "description" ? value : Number(value),
            }
          : item
      )
    );
  }

  function addItemRow() {
    setItems((prev) => [...prev, { description: "", quantity: 1, unit_price: 0 }]);
  }

  function removeItemRow(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  const draftSubtotal = items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);
  const draftVat = draftSubtotal * (Number(vatRate) / 100);
  const draftTotal = draftSubtotal + draftVat;

  async function handleCreate() {
    if (!dueDate) return alert("Set a due date");
    const validItems = items.filter((i) => i.description.trim() && i.quantity > 0);
    if (validItems.length === 0) return alert("Add at least one line item");

    try {
      setSaving(true);
      await createInvoice({
        orgId: organization.id,
        customerId: customerId || null,
        dueDate,
        vatRate: Number(vatRate),
        notes,
        items: validItems,
      });
      setShowNew(false);
      setCustomerId("");
      setDueDate("");
      setVatRate("16");
      setWhtRate("0");
      setNotes("");
      setItems([{ description: "", quantity: 1, unit_price: 0 }]);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function openInvoice(id: string) {
    const full = await getInvoice(id);
    if (full) setViewing(full);
  }

async function handleStatusChange(status: "sent" | "cancelled") {
    if (!viewing) return;

    await updateInvoiceStatus(viewing.id, organization.id, status);
    const refreshed = await getInvoice(viewing.id);
    setViewing(refreshed);
    load();
  }

  async function handleConfirmMarkPaid() {
    if (!viewing || !paidDetails) return;

    try {
      setMarkingPaid(true);
      await markInvoicePaid(viewing.id, organization.id, paidDetails);
      const refreshed = await getInvoice(viewing.id);
      setViewing(refreshed);
      setShowMarkPaid(false);
      setPaidDetails(null);
      load();
    } finally {
      setMarkingPaid(false);
    }
  }
  async function handleDelete() {
    if (!viewing) return;
    if (!confirm(`Delete invoice ${viewing.invoice_number}? This cannot be undone.`)) return;

    await deleteInvoice(viewing.id, viewing.invoice_number, organization.id);
    setViewing(null);
    load();
  }

async function handleDownloadPDF() {
    if (!viewing) return;

    const pdf = new jsPDF();
    let y = 20;

    const businessName = orgSettings?.business_name || organization.name;
    const logoUrl = getOrgLogoUrl(orgSettings?.logo_path ?? null);

    if (logoUrl) {
      const dataUrl = await loadImageAsDataUrl(logoUrl);
      if (dataUrl) {
        try {
          pdf.addImage(dataUrl, "PNG", 20, y - 8, 24, 24);
        } catch (err) {
          console.error("Could not embed logo in PDF:", err);
        }
      }
    }

    const textX = logoUrl ? 52 : 20;

    pdf.setFontSize(20);
    pdf.text(businessName, textX, y);

    y += 8;
    pdf.setFontSize(10);
    if (orgSettings?.business_address) {
      pdf.text(orgSettings.business_address, textX, y);
      y += 5;
    }
    if (orgSettings?.business_phone) {
      pdf.text(`Tel: ${orgSettings.business_phone}`, textX, y);
      y += 5;
    }

    y = Math.max(y, 38);
    y += 8;
    pdf.setFontSize(14);
    pdf.text(`INVOICE ${viewing.invoice_number}`, 20, y);
    
    y += 10;
    pdf.setFontSize(10);
    pdf.text(`Bill To: ${viewing.customers?.name || "Walk-in Customer"}`, 20, y);
    y += 6;
    pdf.text(`Issue Date: ${viewing.issue_date}`, 20, y);
    y += 6;
    pdf.text(`Due Date: ${viewing.due_date}`, 20, y);
    y += 6;
    pdf.text(`Status: ${viewing.status.toUpperCase()}`, 20, y);

    y += 14;
    pdf.setFontSize(10);
    pdf.text("Description", 20, y);
    pdf.text("Qty", 120, y);
    pdf.text("Unit Price", 145, y);
    pdf.text("Total", 190, y, { align: "right" });
    y += 4;
    pdf.line(20, y, 190, y);
    y += 8;

    viewing.items.forEach((item) => {
      pdf.text(item.description, 20, y);
      pdf.text(String(item.quantity), 120, y);
      pdf.text(Number(item.unit_price).toLocaleString(), 145, y);
      pdf.text(Number(item.total).toLocaleString(), 190, y, { align: "right" });
      y += 8;
    });

    y += 6;
    pdf.line(20, y, 190, y);
    y += 10;

    pdf.text(`Subtotal: KES ${Number(viewing.subtotal).toLocaleString()}`, 190, y, { align: "right" });
    y += 7;
    pdf.text(`VAT (${viewing.vat_rate}%): KES ${Number(viewing.vat_amount).toLocaleString()}`, 190, y, { align: "right" });
    y += 10;

    pdf.setFontSize(14);
    pdf.text(`TOTAL: KES ${Number(viewing.total).toLocaleString()}`, 190, y, { align: "right" });

    if (viewing.notes) {
      y += 15;
      pdf.setFontSize(10);
      pdf.text(`Notes: ${viewing.notes}`, 20, y);
    }

    y += 20;
    pdf.setFontSize(10);
    pdf.text("Thank you for your business — AUREVYN", 20, y);

    pdf.save(`${viewing.invoice_number}.pdf`);
  }

  if (loading) return <div>Loading invoices...</div>;

  return (
    <div style={{ overflowY: "auto", height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Invoices</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
            Customer-facing AR invoices for {organization.name}.
          </p>
        </div>
        <button style={buttonGold} onClick={() => setShowNew(true)}>+ New Invoice</button>
      </div>
<label style={labelStyle}>Withholding Tax Rate (%) — optional</label>
            <input type="number" value={whtRate} onChange={(e) => setWhtRate(e.target.value)} style={inputStyle} />
      <div className="card" style={cardStyle}>
        {invoices.map((inv) => (
          <div
            key={inv.id}
            onClick={() => openInvoice(inv.id)}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1.5fr 1fr 1fr auto",
              alignItems: "center",
              padding: "12px 4px",
              borderBottom: "1px solid var(--border)",
              fontSize: 13,
              cursor: "pointer",
              gap: 8,
            }}
          >
            <span style={{ fontWeight: 600 }}>{inv.invoice_number}</span>
            <span>{inv.customers?.name || "No customer"}</span>
            <span style={{ color: "var(--text-muted)" }}>Due {inv.due_date}</span>
            <span style={{ fontWeight: 600 }}>KES {Number(inv.total).toLocaleString()}</span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: STATUS_COLORS[inv.status],
                textTransform: "uppercase",
              }}
            >
              {inv.status}
            </span>
          </div>
        ))}
       {invoices.length === 0 && <EmptyState icon="🧾" message="No invoices yet." actionLabel="+ New Invoice" onAction={() => setShowNew(true)} />}
      </div>

      {showNew && (
        <div style={overlayStyle}>
          <div style={{ ...modalStyle, width: 600 }}>
            <h2 style={{ marginBottom: 16 }}>New Invoice</h2>

            <label style={labelStyle}>Customer</label>
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} style={inputStyle}>
              <option value="">No specific customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <label style={labelStyle}>Due Date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={inputStyle} />

            <label style={labelStyle}>VAT Rate (%)</label>
            <input type="number" value={vatRate} onChange={(e) => setVatRate(e.target.value)} style={inputStyle} />

            <label style={labelStyle}>Line Items</label>
            {items.map((item, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 80px 100px auto", gap: 6, marginBottom: 6 }}>
                <input
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) => updateItem(i, "description", e.target.value)}
                  style={{ ...inputStyle, marginBottom: 0 }}
                />
                <input
                  type="number"
                  placeholder="Qty"
                  value={item.quantity}
                  onChange={(e) => updateItem(i, "quantity", e.target.value)}
                  style={{ ...inputStyle, marginBottom: 0 }}
                />
                <input
                  type="number"
                  placeholder="Unit price"
                  value={item.unit_price}
                  onChange={(e) => updateItem(i, "unit_price", e.target.value)}
                  style={{ ...inputStyle, marginBottom: 0 }}
                />
                <button style={ghostButtonSmall} onClick={() => removeItemRow(i)}>✕</button>
              </div>
            ))}
            <button style={ghostButton} onClick={addItemRow}>+ Add Line</button>

            <label style={labelStyle}>Notes (optional)</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} style={inputStyle} />

<div style={{ marginTop: 16, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
              <div style={rowSpread}><span>Subtotal</span><span>KES {draftSubtotal.toLocaleString()}</span></div>
              <div style={rowSpread}><span>VAT ({vatRate}%)</span><span>KES {draftVat.toLocaleString()}</span></div>
              <div style={{ ...rowSpread, fontWeight: 700 }}><span>Total (Invoiced)</span><span>KES {draftTotal.toLocaleString()}</span></div>
              {Number(whtRate) > 0 && (
                <>
                  <div style={{ ...rowSpread, color: "#ef4444" }}><span>WHT ({whtRate}%)</span><span>-KES {(draftSubtotal * (Number(whtRate) / 100)).toLocaleString()}</span></div>
                  <div style={{ ...rowSpread, fontWeight: 700, color: "#3dd68c" }}><span>Net Payable</span><span>KES {(draftTotal - draftSubtotal * (Number(whtRate) / 100)).toLocaleString()}</span></div>
                </>
              )}
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button style={ghostButton} onClick={() => setShowNew(false)}>Cancel</button>
              <button style={{ ...buttonGold, flex: 1 }} onClick={handleCreate} disabled={saving}>
                {saving ? "Creating..." : "Create Invoice"}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewing && (
        <div style={overlayStyle}>
          <div style={{ ...modalStyle, width: 560 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <h2>{viewing.invoice_number}</h2>
                <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {viewing.customers?.name || "No customer"} · Due {viewing.due_date}
                </p>
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: STATUS_COLORS[viewing.status],
                  textTransform: "uppercase",
                }}
              >
                {viewing.status}
              </span>
            </div>

            <div style={{ marginTop: 16 }}>
              {viewing.items.map((item) => (
                <div key={item.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", fontSize: 13, padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                  <span>{item.description}</span>
                  <span>{item.quantity}</span>
                  <span>KES {Number(item.unit_price).toLocaleString()}</span>
                  <span style={{ textAlign: "right" }}>KES {Number(item.total).toLocaleString()}</span>
                </div>
              ))}
            </div>
<div style={{ marginTop: 16 }}>
              <div style={rowSpread}><span>Subtotal</span><span>KES {Number(viewing.subtotal).toLocaleString()}</span></div>
              <div style={rowSpread}><span>VAT ({viewing.vat_rate}%)</span><span>KES {Number(viewing.vat_amount).toLocaleString()}</span></div>
              <div style={{ ...rowSpread, fontWeight: 700 }}><span>Total (Invoiced)</span><span>KES {Number(viewing.total).toLocaleString()}</span></div>
              {Number(viewing.wht_rate) > 0 && (
                <>
                  <div style={{ ...rowSpread, color: "#ef4444" }}><span>WHT ({viewing.wht_rate}%)</span><span>-KES {Number(viewing.wht_amount).toLocaleString()}</span></div>
                  <div style={{ ...rowSpread, fontWeight: 700, color: "#3dd68c" }}><span>Net Payable</span><span>KES {(Number(viewing.total) - Number(viewing.wht_amount)).toLocaleString()}</span></div>
                </>
              )}
            </div>

            {viewing.notes && (
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 12 }}>{viewing.notes}</p>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 24, flexWrap: "wrap" }}>
              {viewing.status === "draft" && (
                <button style={ghostButton} onClick={() => handleStatusChange("sent")}>Mark as Sent</button>
              )}
{(viewing.status === "sent" || viewing.status === "overdue") && (
                <button style={buttonGold} onClick={() => setShowMarkPaid(true)}>Mark as Paid</button>
              )}              {viewing.status !== "paid" && viewing.status !== "cancelled" && (
                <button style={ghostButton} onClick={() => handleStatusChange("cancelled")}>Cancel Invoice</button>
              )}
              <button style={ghostButton} onClick={handleDownloadPDF}>📄 PDF</button>
              <button style={dangerBtn} onClick={handleDelete}>Delete</button>
<button style={ghostButton} onClick={() => setViewing(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {showMarkPaid && viewing && (
        <div style={overlayStyle}>
          <div style={{ ...modalStyle, width: 460 }}>
            <h2 style={{ marginBottom: 16 }}>Mark {viewing.invoice_number} as Paid</h2>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
              Total: KES {Number(viewing.total).toLocaleString()}
            </p>

            <PaymentMethodForm
              amount={Number(viewing.total)}
              onAmountChange={() => {}}
              onChange={setPaidDetails}
            />

            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              <button style={ghostButton} onClick={() => { setShowMarkPaid(false); setPaidDetails(null); }}>
                Cancel
              </button>
              <button
                style={{ ...buttonGold, flex: 1 }}
                disabled={!paidDetails || markingPaid}
                onClick={handleConfirmMarkPaid}
              >
                {markingPaid ? "Recording..." : "Confirm Payment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 14,
  padding: 20,
};

const rowSpread: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  fontSize: 13,
  padding: "4px 0",
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--text-muted)",
  display: "block",
  marginBottom: 4,
  marginTop: 10,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--bg-base)",
  color: "var(--text-primary)",
  marginBottom: 6,
  fontSize: 13,
};

const buttonGold: React.CSSProperties = {
  background: "var(--gold)",
  color: "#07070f",
  border: "none",
  borderRadius: 10,
  padding: "9px 18px",
  fontWeight: 700,
  fontSize: 12,
  cursor: "pointer",
};

const ghostButton: React.CSSProperties = {
  padding: "9px 18px",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--text-secondary)",
  fontSize: 12,
  cursor: "pointer",
};

const ghostButtonSmall: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--text-secondary)",
  fontSize: 12,
  cursor: "pointer",
};

const dangerBtn: React.CSSProperties = {
  padding: "9px 18px",
  borderRadius: 10,
  border: "1px solid #ef4444",
  background: "transparent",
  color: "#ef4444",
  fontSize: 12,
  cursor: "pointer",
};

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.7)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 9999,
};

const modalStyle: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 16,
  padding: 24,
  maxHeight: "85vh",
  overflowY: "auto",
};