"use client";

import { useEffect, useRef, useState } from "react";
import { useEngine } from "@/lib/runtime/EngineContext";
import {
  getDocuments,
  uploadDocument,
  getSignedDocumentUrl,
  deleteDocument,
  type Document,
  type DocumentCategory,
} from "@/lib/documents";

const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  receipt: "Receipt",
  invoice: "Invoice",
  contract: "Contract",
  hr: "HR File",
  report: "Report",
  other: "Other",
};

export default function DocumentsPage() {
  const { organization } = useEngine();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<"all" | DocumentCategory>("all");
  const [pendingCategory, setPendingCategory] = useState<DocumentCategory>("other");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const data = await getDocuments(organization.id);
    setDocuments(data);
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
      await uploadDocument(organization.id, file, pendingCategory, "You");
      await load();
    } catch (err) {
      console.error(err);
      alert("Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(doc: Document) {
    if (!confirm(`Delete "${doc.name}"?`)) return;
    await deleteDocument(doc.id, doc.file_path, organization.id, doc.name);
    load();
  }

  const filtered = documents.filter((d) => categoryFilter === "all" || d.category === categoryFilter);

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

           <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button
                onClick={() => handleView(doc)}
                style={{ ...ghostButton, textAlign: "center", flex: 1 }}
              >
                View
              </button>
              <button style={dangerBtn} onClick={() => handleDelete(doc)}>
                Delete
              </button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div style={{ color: "var(--text-muted)", fontSize: 13, gridColumn: "1 / -1", textAlign: "center", padding: 40 }}>
            No documents yet. Upload receipts, invoices, or files to keep them all in one place.
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