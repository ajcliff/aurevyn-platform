"use client";

import { useEffect, useState } from "react";
import { useEngine } from "@/lib/runtime/EngineContext";
import {
  getApprovalRequests,
  createApprovalRequest,
  decideApprovalRequest,
  type ApprovalRequest,
  type ApprovalType,
} from "@/lib/approvals";
import { createPurchaseOrderFromApproval, linkPurchaseOrderDocument } from "@/lib/purchaseOrders";
import { getProducts, type InventoryProduct } from "@/lib/inventory";
import { uploadDocument } from "@/lib/documents";
import { getOrgSettings, getOrgLogoUrl } from "@/lib/orgSettings";
import jsPDF from "jspdf";
import EmptyState from "@/components/EmptyState";
import Drawer from "@/components/Drawer";

export default function ApprovalsPage() {
  const { organization, membership } = useEngine();

  const canApprove =
    membership.isFounder || membership.role === "owner" || membership.role === "admin" || membership.role === "manager";

  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  const [type, setType] = useState<ApprovalType>("expense");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [requesterName, setRequesterName] = useState("");
  const [saving, setSaving] = useState(false);

  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [poRequest, setPoRequest] = useState<ApprovalRequest | null>(null);
  const [poProductId, setPoProductId] = useState("");
  const [poSupplier, setPoSupplier] = useState("");
  const [poQuantity, setPoQuantity] = useState("");
  const [poUnitCost, setPoUnitCost] = useState("");
  const [creatingPo, setCreatingPo] = useState(false);
const [viewingRequest, setViewingRequest] = useState<ApprovalRequest | null>(null);


  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const [data, productData] = await Promise.all([
      getApprovalRequests(organization.id),
      getProducts(organization.id),
    ]);
    setRequests(data);
    setProducts(productData);
    setLoading(false);
  }

  const pending = requests.filter((r) => r.status === "pending");
  const approvedThisMonth = requests.filter((r) => {
    if (r.status !== "approved" || !r.decided_at) return false;
    const d = new Date(r.decided_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const approvedValue = approvedThisMonth.reduce((sum, r) => sum + Number(r.amount || 0), 0);

  async function handleSubmit() {
    if (!title.trim() || !requesterName.trim()) return;

    try {
      setSaving(true);
      await createApprovalRequest({
        orgId: organization.id,
        requestedByUserId: membership.userId,
        requestedByName: requesterName,
        type,
        title,
        description,
        amount: amount ? Number(amount) : null,
      });

      setTitle("");
      setDescription("");
      setAmount("");
      setShowNew(false);
      load();
    } catch (err) {
      console.error(err);
      alert("Failed to submit request");
    } finally {
      setSaving(false);
    }
  }

  async function handleDecide(r: ApprovalRequest, status: "approved" | "rejected") {
    // Purchase requests open the PO capture modal instead of approving directly —
    // quantity, supplier, and unit cost need to be recorded before it's truly "approved"
    if (r.type === "purchase" && status === "approved") {
      setPoRequest(r);
      setPoProductId(r.related_id || "");
      setPoSupplier("");
      setPoQuantity("");
      setPoUnitCost("");
      return;
    }

    const deciderName = membership.isFounder ? "Founder" : "Approver";
    await decideApprovalRequest(r.id, status, deciderName, organization.id, r.title);
    load();
  }

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

  async function generatePurchaseOrderPdf(input: {
    poNumber: string;
    supplierName: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
    productName: string;
  }): Promise<File> {
    const settings = await getOrgSettings(organization.id);
    const businessName = settings.business_name || organization.name;
    const logoUrl = getOrgLogoUrl(settings.logo_path);

    const pdf = new jsPDF();
    let y = 20;

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
    if (settings.business_address) {
      pdf.text(settings.business_address, textX, y);
      y += 5;
    }
    if (settings.business_phone) {
      pdf.text(`Tel: ${settings.business_phone}`, textX, y);
      y += 5;
    }

    y = Math.max(y, 38);
    y += 8;
    pdf.setFontSize(14);
    pdf.text(`PURCHASE ORDER ${input.poNumber}`, 20, y);

    y += 10;
    pdf.setFontSize(10);
    pdf.text(`Supplier: ${input.supplierName}`, 20, y);
    y += 6;
    pdf.text(`Date: ${new Date().toISOString().slice(0, 10)}`, 20, y);

    y += 14;
    pdf.text("Item", 20, y);
    pdf.text("Qty", 120, y);
    pdf.text("Unit Cost", 145, y);
    pdf.text("Total", 190, y, { align: "right" });
    y += 4;
    pdf.line(20, y, 190, y);
    y += 8;

    pdf.text(input.productName, 20, y);
    pdf.text(String(input.quantity), 120, y);
    pdf.text(input.unitCost.toLocaleString(), 145, y);
    pdf.text(input.totalCost.toLocaleString(), 190, y, { align: "right" });

    y += 14;
    pdf.line(20, y, 190, y);
    y += 10;
    pdf.setFontSize(13);
    pdf.text(`TOTAL: KES ${input.totalCost.toLocaleString()}`, 190, y, { align: "right" });

    const blob = pdf.output("blob");
    return new File([blob], `${input.poNumber}.pdf`, { type: "application/pdf" });
  }

  async function handleConfirmPurchaseOrder() {
    if (!poRequest) return;
    if (!poSupplier.trim() || !poQuantity || !poUnitCost) {
      alert("Fill in supplier, quantity, and unit cost");
      return;
    }

    const deciderName = membership.isFounder ? "Founder" : "Approver";

    try {
      setCreatingPo(true);

      const po = await createPurchaseOrderFromApproval({
        orgId: organization.id,
        approvalRequestId: poRequest.id,
        approvalTitle: poRequest.title,
        productId: poProductId || null,
        supplierName: poSupplier,
        quantity: Number(poQuantity),
        unitCost: Number(poUnitCost),
        decidedByName: deciderName,
      });

      if (po) {
        const productName = products.find((p) => p.id === poProductId)?.name || poRequest.title;

        const file = await generatePurchaseOrderPdf({
          poNumber: po.po_number,
          supplierName: poSupplier,
          quantity: Number(poQuantity),
          unitCost: Number(poUnitCost),
          totalCost: Number(poQuantity) * Number(poUnitCost),
          productName,
        });

        const doc = await uploadDocument(organization.id, file, "purchase_order", deciderName);
        await linkPurchaseOrderDocument(po.id, doc.id);
      }

      setPoRequest(null);
      load();
    } finally {
      setCreatingPo(false);
    }
  }

  if (loading) return <div>Loading approvals...</div>;

  return (
    <div style={{ overflowY: "auto", height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Approvals</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
            Expenses, reimbursements, and purchase requests.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <a href={`/org/${organization.id}/inventory/purchase-orders`} style={ghostButton}>
            View Purchase Orders →
          </a>
          <button style={buttonGold} onClick={() => setShowNew(true)}>
            + New Request
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 20 }}>
        <div className="card" style={cardStyle}>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Pending</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: pending.length > 0 ? "#e8b923" : undefined }}>
            {pending.length}
          </div>
        </div>
        <div className="card" style={cardStyle}>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Approved This Month</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>KES {approvedValue.toLocaleString()}</div>
        </div>
        <div className="card" style={cardStyle}>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Total Requests</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{requests.length}</div>
        </div>
      </div>

     <h3 style={{ marginBottom: 12 }}>All Requests</h3>

      {requests.length === 0 ? (
        <div className="card" style={{ ...cardStyle, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
          No requests yet.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
          {requests.map((r) => (
            <div
              key={r.id}
              onClick={() => setViewingRequest(r)}
              className="card"
              style={{ ...cardStyle, padding: 14, cursor: "pointer", display: "flex", flexDirection: "column", gap: 8 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{r.title}</div>
                <StatusBadge status={r.status} />
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "capitalize" }}>
                {r.type} · {r.requested_by_name}
              </div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                {r.amount ? `KES ${Number(r.amount).toLocaleString()}` : "—"}
              </div>
            </div>
          ))}
        </div>
      )}
       

      {poRequest && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h2 style={{ marginBottom: 6 }}>Create Purchase Order</h2>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
              Approving "{poRequest.title}" — enter the order details.
            </p>

            <label style={labelStyle}>Product</label>
            <select value={poProductId} onChange={(e) => setPoProductId(e.target.value)} style={inputStyle}>
              <option value="">No specific product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
              ))}
            </select>

            <label style={labelStyle}>Supplier</label>
            <input
              value={poSupplier}
              onChange={(e) => setPoSupplier(e.target.value)}
              style={inputStyle}
              placeholder="e.g. Benchmark Distributors"
            />

            <label style={labelStyle}>Quantity</label>
            <input
              type="number"
              value={poQuantity}
              onChange={(e) => setPoQuantity(e.target.value)}
              style={inputStyle}
            />

            <label style={labelStyle}>Unit Cost (KES)</label>
            <input
              type="number"
              value={poUnitCost}
              onChange={(e) => setPoUnitCost(e.target.value)}
              style={inputStyle}
            />

            {poQuantity && poUnitCost && (
              <div style={{ fontSize: 13, marginTop: 8, color: "var(--gold)" }}>
                Total: KES {(Number(poQuantity) * Number(poUnitCost)).toLocaleString()}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button style={ghostButton} onClick={() => setPoRequest(null)}>Cancel</button>
              <button style={{ ...buttonGold, flex: 1 }} onClick={handleConfirmPurchaseOrder} disabled={creatingPo}>
                {creatingPo ? "Creating..." : "Approve & Create PO"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showNew && (


        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h2 style={{ marginBottom: 16 }}>New Request</h2>

            <label style={labelStyle}>Your name</label>
            <input value={requesterName} onChange={(e) => setRequesterName(e.target.value)} style={inputStyle} />

            <label style={labelStyle}>Type</label>
            <select value={type} onChange={(e) => setType(e.target.value as ApprovalType)} style={inputStyle}>
              <option value="expense">Expense</option>
              <option value="reimbursement">Reimbursement</option>
              <option value="purchase">Purchase</option>
            </select>

            <label style={labelStyle}>Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} placeholder="e.g. Office supplies" />

            <label style={labelStyle}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ ...inputStyle, minHeight: 70 }}
            />

            <label style={labelStyle}>Amount (KES, optional)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={inputStyle}
            />

            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              <button style={ghostButton} onClick={() => setShowNew(false)}>
                Cancel
              </button>
              <button style={{ ...buttonGold, flex: 1 }} onClick={handleSubmit} disabled={saving}>
                {saving ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </div>
        </div>
      )}

<Drawer open={!!viewingRequest} onClose={() => setViewingRequest(null)} title={viewingRequest?.title ?? ""}>
        {viewingRequest && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Type</div>
              <div style={{ fontSize: 14, textTransform: "capitalize" }}>{viewingRequest.type}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Requested By</div>
              <div style={{ fontSize: 14 }}>{viewingRequest.requested_by_name}</div>
            </div>
            {viewingRequest.description && (
              <div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Description</div>
                <div style={{ fontSize: 14 }}>{viewingRequest.description}</div>
              </div>
            )}
            {viewingRequest.amount && (
              <div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Amount</div>
                <div style={{ fontSize: 14 }}>KES {Number(viewingRequest.amount).toLocaleString()}</div>
              </div>
            )}
            <div>
              <StatusBadge status={viewingRequest.status} />
            </div>
            {viewingRequest.status === "pending" && canApprove && (
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button
                  style={{ ...successBtn, flex: 1, padding: "10px" }}
                  onClick={() => { handleDecide(viewingRequest, "approved"); setViewingRequest(null); }}
                >
                  Approve
                </button>
                <button
                  style={{ ...dangerBtn, flex: 1, padding: "10px" }}
                  onClick={() => { handleDecide(viewingRequest, "rejected"); setViewingRequest(null); }}
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        )}
      </Drawer>

    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "#e8b923",
    approved: "#3dd68c",
    rejected: "#ef4444",
  };
  return (
    <span style={{ fontSize: 11, color: colors[status], textTransform: "capitalize" }}>{status}</span>
  );
}

const cardStyle: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 14,
  padding: 20,
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

const successBtn: React.CSSProperties = {
  background: "var(--green)",
  color: "#000",
  border: "none",
  borderRadius: 8,
  padding: "5px 10px",
  fontSize: 11,
  fontWeight: 600,
  cursor: "pointer",
};

const dangerBtn: React.CSSProperties = {
  background: "transparent",
  color: "#ef4444",
  border: "1px solid #ef4444",
  borderRadius: 8,
  padding: "5px 10px",
  fontSize: 11,
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
  width: 440,
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 16,
  padding: 24,
};