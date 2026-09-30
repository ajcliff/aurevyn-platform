"use client";

import { useState } from "react";
import {
  createCompanyMember, updateCompanyMember, deleteCompanyMember,
  type CompanyMember, type MemberType, type MemberStatus,
} from "@/lib/companyTeam";
import Modal from "@/components/founder/Modal";
import ConfirmDialog from "@/components/founder/ConfirmDialog";
import { shortDate } from "./utils";
import f from "@/styles/founder.module.css";
import c from "@/styles/company.module.css";

const typeLabel: Record<MemberType, string> = { founder: "Founder", employee: "Employee", contractor: "Contractor", advisor: "Advisor" };

type Form = { full_name: string; role_title: string; member_type: MemberType; email: string; phone: string; start_date: string; status: MemberStatus; notes: string };
const emptyForm = (): Form => ({ full_name: "", role_title: "", member_type: "employee", email: "", phone: "", start_date: "", status: "active", notes: "" });

type Props = {
  members: CompanyMember[];
  setMembers: React.Dispatch<React.SetStateAction<CompanyMember[]>>;
  onError: (err: unknown, source: string) => void;
  unavailable?: string | null;
};

export default function Team({ members, setMembers, onError, unavailable }: Props) {
  const [showFormer, setShowFormer] = useState(false);
  const [editing, setEditing] = useState<CompanyMember | "new" | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<CompanyMember | null>(null);

  const active = members.filter(m => m.status === "active");
  const former = members.filter(m => m.status === "former");
  const rows = showFormer ? members : active;
  const byType = (Object.keys(typeLabel) as MemberType[]).map(t => ({ t, n: active.filter(m => m.member_type === t).length })).filter(x => x.n > 0);

  const openNew = () => { setForm(emptyForm()); setFormError(null); setEditing("new"); };
  const openEdit = (m: CompanyMember) => {
    setForm({ full_name: m.full_name, role_title: m.role_title, member_type: m.member_type, email: m.email ?? "", phone: m.phone ?? "", start_date: m.start_date ?? "", status: m.status, notes: m.notes ?? "" });
    setFormError(null);
    setEditing(m);
  };

  async function save() {
    if (!form.full_name.trim() || !form.role_title.trim()) { setFormError("Add a name and a role."); return; }
    setFormError(null);
    const payload = {
      full_name: form.full_name.trim(), role_title: form.role_title.trim(), member_type: form.member_type,
      email: form.email || null, phone: form.phone || null, start_date: form.start_date || null, status: form.status, notes: form.notes || null,
    };
    try {
      if (editing === "new") {
        const created = await createCompanyMember(payload);
        setMembers(prev => [...prev, created]);
      } else if (editing) {
        const updated = await updateCompanyMember(editing.id, payload);
        setMembers(prev => prev.map(m => (m.id === updated.id ? updated : m)));
      }
      setEditing(null);
    } catch (err) {
      onError(err, "CompanyPage/saveMember");
      setFormError("This couldn't be saved. Try again.");
    }
  }

  async function remove() {
    if (!deleting) return;
    try {
      await deleteCompanyMember(deleting.id);
      setMembers(prev => prev.filter(m => m.id !== deleting.id));
    } catch (err) { onError(err, "CompanyPage/deleteMember"); }
    setDeleting(null);
  }

  return (
    <div className={f.tabPanel}>
      <div className={f.sectionHead}>
        <div>
          <h2 className={f.sectionTitle}>Team</h2>
          <p className={f.sectionSub} style={{ marginTop: 4 }}>
            {unavailable ? "Not available yet." : active.length === 0 ? "Who works on AUREVYN, and in what role." : `${active.length} active${byType.length ? `: ${byType.map(x => `${x.n} ${typeLabel[x.t].toLowerCase()}${x.n === 1 ? "" : "s"}`).join(", ")}` : ""}.`}
          </p>
        </div>
        <button className={f.primary} onClick={openNew} disabled={!!unavailable}>Add person</button>
      </div>

      {unavailable ? (
        <div className={f.empty}><strong>The team table isn&apos;t set up yet.</strong>Run supabase/company_team_and_documents.sql in the Supabase SQL editor, then reload.</div>
      ) : members.length === 0 ? (
        <div className={f.empty}>
          <strong>No one added yet.</strong>
          Start with yourself, then add employees, contractors and advisors so roles and contact details are in one place.
          <div><button className={f.secondary} onClick={openNew}>Add the first person</button></div>
        </div>
      ) : (
        <>
          {former.length > 0 && (
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: "var(--text-secondary)" }}>
              <input type="checkbox" checked={showFormer} onChange={e => setShowFormer(e.target.checked)} /> Show {former.length} former
            </label>
          )}
          <div className={f.tableWrap}>
            <table className={f.ledger}>
              <thead><tr><th>Person</th><th>Role</th><th>Type</th><th>Contact</th><th>Since</th><th /></tr></thead>
              <tbody>
                {rows.map(m => (
                  <tr key={m.id}>
                    <td>
                      <div className={f.cellMain}>{m.full_name}</div>
                      {m.status === "former" && <div className={f.cellSub}>Former</div>}
                    </td>
                    <td className={f.cellMuted}>{m.role_title}</td>
                    <td><span className={c.tag}>{typeLabel[m.member_type]}</span></td>
                    <td className={f.cellMuted} style={{ whiteSpace: "normal" }}>
                      {m.email && <div>{m.email}</div>}
                      {m.phone && <div>{m.phone}</div>}
                      {!m.email && !m.phone && "—"}
                    </td>
                    <td className={f.cellMuted}>{shortDate(m.start_date)}</td>
                    <td className={f.cellMuted}>
                      <button className={f.linkBtn} onClick={() => openEdit(m)}>Edit</button>
                      <button className={f.linkBtn} style={{ color: "var(--text-secondary)", marginLeft: 12 }} onClick={() => setDeleting(m)}>Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {editing && (
        <Modal title={editing === "new" ? "Add a person" : "Edit person"} onClose={() => setEditing(null)}>
          <div className={f.field}>
            <label htmlFor="tm-name">Full name</label>
            <input id="tm-name" className={f.input} autoFocus value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div className={f.fieldRow}>
            <div className={f.field}>
              <label htmlFor="tm-role">Role</label>
              <input id="tm-role" className={f.input} value={form.role_title} onChange={e => setForm({ ...form, role_title: e.target.value })} placeholder="Lead engineer" />
            </div>
            <div className={f.field}>
              <label htmlFor="tm-type">Type</label>
              <select id="tm-type" className={f.input} value={form.member_type} onChange={e => setForm({ ...form, member_type: e.target.value as MemberType })}>
                {(Object.keys(typeLabel) as MemberType[]).map(t => <option key={t} value={t}>{typeLabel[t]}</option>)}
              </select>
            </div>
          </div>
          <div className={f.fieldRow}>
            <div className={f.field}>
              <label htmlFor="tm-email">Email</label>
              <input id="tm-email" className={f.input} type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className={f.field}>
              <label htmlFor="tm-phone">Phone</label>
              <input id="tm-phone" className={f.input} type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <div className={f.fieldRow}>
            <div className={f.field}>
              <label htmlFor="tm-start">Start date</label>
              <input id="tm-start" className={f.input} type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
            </div>
            <div className={f.field}>
              <label htmlFor="tm-status">Status</label>
              <select id="tm-status" className={f.input} value={form.status} onChange={e => setForm({ ...form, status: e.target.value as MemberStatus })}>
                <option value="active">Active</option><option value="former">Former</option>
              </select>
            </div>
          </div>
          <div className={f.field}>
            <label htmlFor="tm-notes">Notes</label>
            <textarea id="tm-notes" className={f.input} rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={{ resize: "vertical" }} />
          </div>
          {formError && <div className={f.formError} role="alert">{formError}</div>}
          <div className={f.dialogActions}>
            <button className={f.secondary} onClick={() => setEditing(null)}>Cancel</button>
            <button className={f.primary} onClick={save}>{editing === "new" ? "Add person" : "Save changes"}</button>
          </div>
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog title="Remove this person?" message={`${deleting.full_name} will be removed from the directory. To keep the record, mark them as former instead.`} confirmLabel="Remove" onConfirm={remove} onCancel={() => setDeleting(null)} />
      )}
    </div>
  );
}
