"use client";

import { useState } from "react";
import {
  createCompanyDocument, updateCompanyDocument, deleteCompanyDocument,
  type CompanyDocument, type DocumentType,
} from "@/lib/companyDocuments";
import Modal from "@/components/founder/Modal";
import ConfirmDialog from "@/components/founder/ConfirmDialog";
import { daysUntil, shortDate } from "@/components/company/utils";
import f from "@/styles/founder.module.css";
import c from "@/styles/company.module.css";

export const docTypeLabel: Record<DocumentType, string> = {
  registration: "Registration", tax: "Tax", licence: "Licence or permit", contract: "Contract", policy: "Policy", insurance: "Insurance", other: "Other",
};

/** valid | expiring (within 60 days) | expired | none */
export function docState(d: CompanyDocument): "valid" | "expiring" | "expired" | "none" {
  if (!d.expires_on) return "none";
  const days = daysUntil(d.expires_on);
  return days < 0 ? "expired" : days <= 60 ? "expiring" : "valid";
}

const stateText = { valid: "Valid", expiring: "Expiring soon", expired: "Expired", none: "No expiry" };
const stateAttr = { valid: "operational", expiring: "warning", expired: "critical", none: undefined } as const;

type Form = { title: string; doc_type: DocumentType; reference: string; issued_on: string; expires_on: string; link: string; notes: string };
const emptyForm = (): Form => ({ title: "", doc_type: "registration", reference: "", issued_on: "", expires_on: "", link: "", notes: "" });

type Props = {
  docs: CompanyDocument[];
  setDocs: React.Dispatch<React.SetStateAction<CompanyDocument[]>>;
  onError: (err: unknown, source: string) => void;
  unavailable?: string | null;
};

export default function Documents({ docs, setDocs, onError, unavailable }: Props) {
  const [typeFilter, setTypeFilter] = useState<"all" | DocumentType>("all");
  const [editing, setEditing] = useState<CompanyDocument | "new" | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<CompanyDocument | null>(null);

  const order = { expired: 0, expiring: 1, valid: 2, none: 3 };
  const rows = docs
    .filter(d => typeFilter === "all" || d.doc_type === typeFilter)
    .sort((a, b) => order[docState(a)] - order[docState(b)] || (a.expires_on ?? "").localeCompare(b.expires_on ?? ""));
  const attention = docs.filter(d => ["expired", "expiring"].includes(docState(d))).length;
  const usedTypes = Array.from(new Set(docs.map(d => d.doc_type)));

  const openNew = () => { setForm(emptyForm()); setFormError(null); setEditing("new"); };
  const openEdit = (d: CompanyDocument) => {
    setForm({ title: d.title, doc_type: d.doc_type, reference: d.reference ?? "", issued_on: d.issued_on ?? "", expires_on: d.expires_on ?? "", link: d.link ?? "", notes: d.notes ?? "" });
    setFormError(null);
    setEditing(d);
  };

  async function save() {
    if (!form.title.trim()) { setFormError("Give the document a title."); return; }
    if (form.link && !/^https?:\/\//i.test(form.link)) { setFormError("The link should start with https://"); return; }
    setFormError(null);
    const payload = {
      title: form.title.trim(), doc_type: form.doc_type, reference: form.reference || null,
      issued_on: form.issued_on || null, expires_on: form.expires_on || null, link: form.link || null, notes: form.notes || null,
    };
    try {
      if (editing === "new") {
        const created = await createCompanyDocument(payload);
        setDocs(prev => [created, ...prev]);
      } else if (editing) {
        const updated = await updateCompanyDocument(editing.id, payload);
        setDocs(prev => prev.map(d => (d.id === updated.id ? updated : d)));
      }
      setEditing(null);
    } catch (err) {
      onError(err, "CompanyPage/saveDocument");
      setFormError("This couldn't be saved. Try again.");
    }
  }

  async function remove() {
    if (!deleting) return;
    try {
      await deleteCompanyDocument(deleting.id);
      setDocs(prev => prev.filter(d => d.id !== deleting.id));
    } catch (err) { onError(err, "CompanyPage/deleteDocument"); }
    setDeleting(null);
  }

  return (
    <div className={f.tabPanel}>
      <div className={f.sectionHead}>
        <div>
          <h2 className={f.sectionTitle}>Legal and records</h2>
          <p className={f.sectionSub} style={{ marginTop: 4 }}>
            {unavailable ? "Not available yet." : docs.length === 0 ? "Certificates, licences, contracts and policies, with expiry dates." : attention > 0 ? `${attention} expired or expiring within 60 days.` : `${docs.length} on file, none expiring soon.`}
          </p>
        </div>
        <button className={f.primary} onClick={openNew} disabled={!!unavailable}>Add document</button>
      </div>

      {unavailable ? (
        <div className={f.empty}><strong>The documents table isn&apos;t set up yet.</strong>Run supabase/company_team_and_documents.sql in the Supabase SQL editor, then reload.</div>
      ) : docs.length === 0 ? (
        <div className={f.empty}>
          <strong>No documents recorded.</strong>
          Keep track of the certificate of incorporation, KRA PIN certificate, business permit, key contracts and insurance. Each entry links to where the file is stored, and expiry dates feed the overview.
          <div><button className={f.secondary} onClick={openNew}>Add the first document</button></div>
        </div>
      ) : (
        <>
          {usedTypes.length > 1 && (
            <div className={f.segmented} role="group" aria-label="Filter by type" style={{ alignSelf: "flex-start" }}>
              <button className={f.segBtn} aria-pressed={typeFilter === "all"} onClick={() => setTypeFilter("all")}>All</button>
              {usedTypes.map(t => <button key={t} className={f.segBtn} aria-pressed={typeFilter === t} onClick={() => setTypeFilter(t)}>{docTypeLabel[t]}</button>)}
            </div>
          )}
          <div className={f.tableWrap}>
            <table className={f.ledger}>
              <thead><tr><th>Document</th><th>Type</th><th>Reference</th><th>Issued</th><th>Expires</th><th>Status</th><th /></tr></thead>
              <tbody>
                {rows.map(d => {
                  const st = docState(d);
                  return (
                    <tr key={d.id}>
                      <td>
                        <div className={f.cellMain}>{d.link ? <a href={d.link} target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "underline" }}>{d.title}</a> : d.title}</div>
                        {d.notes && <div className={f.cellSub}>{d.notes}</div>}
                      </td>
                      <td><span className={c.tag}>{docTypeLabel[d.doc_type]}</span></td>
                      <td className={f.cellMuted}>{d.reference || "—"}</td>
                      <td className={f.cellMuted}>{shortDate(d.issued_on)}</td>
                      <td className={f.cellMuted}>{shortDate(d.expires_on)}</td>
                      <td><span className={f.pill} data-status={stateAttr[st]}>{stateText[st]}</span></td>
                      <td className={f.cellMuted}>
                        <button className={f.linkBtn} onClick={() => openEdit(d)}>Edit</button>
                        <button className={f.linkBtn} style={{ color: "var(--text-secondary)", marginLeft: 12 }} onClick={() => setDeleting(d)}>Delete</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {editing && (
        <Modal title={editing === "new" ? "Add a document" : "Edit document"} onClose={() => setEditing(null)}>
          <div className={f.field}>
            <label htmlFor="dc-title">Title</label>
            <input id="dc-title" className={f.input} autoFocus value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Certificate of incorporation" />
          </div>
          <div className={f.fieldRow}>
            <div className={f.field}>
              <label htmlFor="dc-type">Type</label>
              <select id="dc-type" className={f.input} value={form.doc_type} onChange={e => setForm({ ...form, doc_type: e.target.value as DocumentType })}>
                {(Object.keys(docTypeLabel) as DocumentType[]).map(t => <option key={t} value={t}>{docTypeLabel[t]}</option>)}
              </select>
            </div>
            <div className={f.field}>
              <label htmlFor="dc-ref">Reference number</label>
              <input id="dc-ref" className={f.input} value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} />
            </div>
          </div>
          <div className={f.fieldRow}>
            <div className={f.field}>
              <label htmlFor="dc-issued">Issued</label>
              <input id="dc-issued" className={f.input} type="date" value={form.issued_on} onChange={e => setForm({ ...form, issued_on: e.target.value })} />
            </div>
            <div className={f.field}>
              <label htmlFor="dc-exp">Expires</label>
              <input id="dc-exp" className={f.input} type="date" value={form.expires_on} onChange={e => setForm({ ...form, expires_on: e.target.value })} />
            </div>
          </div>
          <div className={f.field}>
            <label htmlFor="dc-link">Link to the file</label>
            <input id="dc-link" className={f.input} type="url" value={form.link} onChange={e => setForm({ ...form, link: e.target.value })} placeholder="https://drive.google.com/…" />
          </div>
          <div className={f.field}>
            <label htmlFor="dc-notes">Notes</label>
            <textarea id="dc-notes" className={f.input} rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={{ resize: "vertical" }} />
          </div>
          {formError && <div className={f.formError} role="alert">{formError}</div>}
          <div className={f.dialogActions}>
            <button className={f.secondary} onClick={() => setEditing(null)}>Cancel</button>
            <button className={f.primary} onClick={save}>{editing === "new" ? "Add document" : "Save changes"}</button>
          </div>
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog title="Delete this document record?" message={`"${deleting.title}" will be removed from this list. The file itself isn't touched.`} confirmLabel="Delete" onConfirm={remove} onCancel={() => setDeleting(null)} />
      )}
    </div>
  );
}