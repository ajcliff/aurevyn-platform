"use client";

import { useEffect, useRef, useState } from "react";
import { getDocuments, uploadDocument, type Document } from "@/lib/documents";
import type { Attachment } from "@/lib/attachments";

const small: React.CSSProperties = { padding: "5px 11px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "1px solid var(--border-light)", background: "transparent", color: "var(--text-primary)", fontFamily: "inherit" };

// Attach files from the organization's Documents, or upload a new one on the spot (it is saved to Documents too).
export default function AttachmentPicker({ orgId, uploaderName, value, onChange }: {
  orgId: string; uploaderName: string; value: Attachment[]; onChange: (v: Attachment[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [docs, setDocs] = useState<Document[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) getDocuments(orgId).then(setDocs).catch(() => setDocs([]));
  }, [open, orgId]);

  const has = (id: string) => value.some(a => a.documentId === id);
  const toggle = (d: Document) =>
    onChange(has(d.id) ? value.filter(a => a.documentId !== d.id) : value.length >= 10 ? value : [...value, { documentId: d.id, name: d.name }]);

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true); setError("");
    try {
      const doc = await uploadDocument(orgId, file, "other", uploaderName);
      setDocs(prev => [doc, ...prev]);
      onChange([...value, { documentId: doc.id, name: doc.name }]);
    } catch { setError("Upload failed. Try again."); }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  const shown = docs.filter(d => d.name.toLowerCase().includes(q.toLowerCase())).slice(0, 50);

  return (
    <div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <button type="button" style={small} onClick={() => setOpen(o => !o)}>📎 Attach from Documents{value.length ? ` (${value.length})` : ""}</button>
        {value.map(a => (
          <button key={a.documentId} type="button" title="Remove" onClick={() => onChange(value.filter(x => x.documentId !== a.documentId))}
            style={{ ...small, background: "var(--gold-glow)", borderColor: "var(--gold)" }}>{a.name} ✕</button>
        ))}
      </div>
      {open && (
        <div style={{ border: "1px solid var(--border)", borderRadius: 8, marginTop: 8, padding: 8 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search documents" aria-label="Search documents"
              style={{ flex: 1, padding: "7px 10px", borderRadius: 8, background: "var(--bg-base)", color: "var(--text-primary)", border: "1px solid var(--border-light)", fontSize: 12 }} />
            <input ref={fileRef} type="file" onChange={upload} style={{ display: "none" }} />
            <button type="button" style={small} disabled={busy} onClick={() => fileRef.current?.click()}>{busy ? "Uploading…" : "+ Upload new"}</button>
          </div>
          {error && <div style={{ color: "var(--red)", fontSize: 12, marginBottom: 6 }}>{error}</div>}
          <div style={{ maxHeight: 160, overflowY: "auto" }}>
            {shown.length === 0 && <div style={{ padding: 8, fontSize: 12, color: "var(--text-muted)" }}>No documents found.</div>}
            {shown.map(d => (
              <label key={d.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 4px", fontSize: 12, borderBottom: "1px solid var(--border)", cursor: "pointer" }}>
                <input type="checkbox" checked={has(d.id)} onChange={() => toggle(d)} />
                <span style={{ flex: 1, wordBreak: "break-word" }}>{d.name}</span>
                <span style={{ color: "var(--text-muted)", textTransform: "capitalize" }}>{d.category.replace("_", " ")}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
