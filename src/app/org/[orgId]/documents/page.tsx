"use client";

import { useEffect, useRef, useState } from "react";
import { useEngine } from "@/lib/runtime/EngineContext";
import {
  getDocuments,
  getArchivedDocuments,
  uploadDocument,
  getSignedDocumentUrl,
  requestDocumentDeletion,
  restoreDocument,
  type Document,
  type DocumentCategory,
} from "@/lib/documents";
import { getPendingApprovalsForOrg, type ApprovalRequest } from "@/lib/approvals";

const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  receipt: "Receipt",
  invoice: "Invoice",
  contract: "Contract",
  purchase_order: "Purchase Order",
  hr: "HR File",
  report: "Report",
  other: "Other",
};

export default function DocumentsPage() {
  const { organization, membership } = useEngine();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [view, setView] = useState<"active" | "archived">("active");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [archived, setArchived] = useState<Document[]>([]);
  const [pendingDeletions, setPendingDeletions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<"all" | DocumentCategory>("all");
  const [pendingCategory, setPendingCategory] = useState<DocumentCategory>("other");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const [active, archivedDocs, approvals] = await Promise.all([
      getDocuments(organization.id),
      getArchivedDocuments(organization.id),
      getPendingApprovalsForOrg(organization.id),
    ]);
    setDocuments(active);
    setArchived(archivedDocs);
    setPendingDeletions(
      new Set(
        approvals
          .filter((a: ApprovalRequest) => a.type === "document_deletion" && a.related_id)
          .map((a: ApprovalRequest) => a.related_id as string)
      )
    );
    setLoading(false);
  }

  async function handleView(doc: Document) {
    const url = await getSignedDocumentUrl(doc.file_path);
    if (url) {
      window.open(url, "_blank");
    } else {
      alert("Couldn't open this document. Please try again.");
    }
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      await uploadDocument(organization.id, file, pendingCategory, membership.userEmail || "You");
      await load();
    } catch (err) {
      console.error(err);
      alert("Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRequestDeletion(doc: Document) {
    if (pendingDeletions.has(doc.id)) {
      alert("A deletion request for this document is already pending approval.");
      return;
    }
    if (!confirm(`Request deletion of "${doc.name}"? This needs approval before it's archived, and the file stays recoverable for 90 days after that.`)) return;

    await requestDocumentDeletion(doc, organization.id, membership.userId, membership.userEmail || "You");
    alert("Deletion requested — it'll show up under Approvals for someone with approval rights to review.");
    load();
  }

  async function handleRestore(doc: Document) {
    if (!confirm(`Restore "${doc.name}" back to active documents?`)) return;
    await restoreDocument(doc.id, organization.id, doc.name);
    load();
  }

  function daysRemaining(expiresAt: string | null): number {
    if (!expiresAt) return 0;
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  const list = view === "active" ? documents : archived;
  const filtered = list.filter((d) => categoryFilter === "all" || d.category === categoryFilter);

  function formatSize(bytes: number | null): string {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (loading) return <div>Loading documents...</div>;

  return (
    <div style={{ overflowY: "auto", height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Documents</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
            Receipts, invoices, contracts, and files for {organization.name}.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select
            value={pendingCategory}
            onChange={(e) => setPendingCategory(e.target.value as DocumentCategory)}
            style={selectStyle}
          >
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          <input ref={fileInputRef} type="file" onChange={handleFileSelected} style={{ display: "none" }} />
          <button style={buttonGold} onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? "Uploading..." : "+ Upload"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <FilterChip label={`Active (${documents.length})`} active={view === "active"} onClick={() => setView("active")} />
        <FilterChip label={`Archived (${archived.length})`} active={view === "archived"} onClick={() => setView("archived")} />
      </div>

      {view === "archived" && (
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
          Archived files are permanently removed 90 days after archiving unless restored.
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <FilterChip label="All" active={categoryFilter === "all"} onClick={() => setCategoryFilter("all")} />
        {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
          <FilterChip
            key={value}
            label={label}
            active={categoryFilter === value}
            onClick={() => setCategoryFilter(value as DocumentCategory)}
          />
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: 16,
        }}
      >
        {filtered.map((doc) => (
          <div key={doc.id} className="card" style={cardStyle}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>📄</div>
            <div style={{ fontWeight: 600, fontSize: 13, wordBreak: "break-word" }}>{doc.name}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
              {CATEGORY_LABELS[doc.category]} · {formatSize(doc.file_size)}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
              {new Date(doc.created_at).toLocaleDateString()} · {doc.uploaded_by_name}
            </div>

            {view === "active" && pendingDeletions.has(doc.id) && (
              <div style={{ marginTop: 8, fontSize: 11, color: "#f5b942", background: "rgba(245,185,66,0.1)", border: "1px solid rgba(245,185,66,0.3)", borderRadius: 8, padding: "4px 8px", display: "inline-block" }}>
                🔔 Deletion pending approval
              </div>
            )}

            {view === "archived" && (
              <div style={{ marginTop: 8, fontSize: 11, color: "#ef4444" }}>
                {daysRemaining(doc.archive_expires_at)} day{daysRemaining(doc.archive_expires_at) === 1 ? "" : "s"} until permanent removal
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button
                onClick={() => handleView(doc)}
                style={{ ...ghostButton, textAlign: "center", flex: 1 }}
              >
                View
              </button>
              {view === "active" ? (
                <button style={dangerBtn} onClick={() => handleRequestDeletion(doc)}>
                  Request deletion
                </button>
              ) : (
                <button style={ghostButton} onClick={() => handleRestore(doc)}>
                  Restore
                </button>
              )}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div style={{ color: "var(--text-muted)", fontSize: 13, gridColumn: "1 / -1", textAlign: "center", padding: 40 }}>
            {view === "active"
              ? "No documents yet. Upload receipts, invoices, or files to keep them all in one place."
              : "Nothing archived right now."}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 14px",
        borderRadius: 8,
        border: "1px solid var(--border)",
        background: active ? "var(--gold)" : "var(--bg-elevated)",
        color: active ? "#07070f" : "var(--text-secondary)",
        fontSize: 11,
        fontWeight: active ? 700 : 500,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

const cardStyle: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 14,
  padding: 16,
};

const selectStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--bg-base)",
  color: "var(--text-primary)",
  fontSize: 12,
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
  padding: "6px 12px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--text-secondary)",
  fontSize: 11,
  cursor: "pointer",
};

const dangerBtn: React.CSSProperties = {
  padding: "6px 12px",
  borderRadius: 8,
  border: "1px solid #ef4444",
  background: "transparent",
  color: "#ef4444",
  fontSize: 11,
  cursor: "pointer",
};