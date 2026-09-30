"use client";

import { useState } from "react";
import {
  createMaintenanceItem, updateMaintenanceItem, markMaintenanceComplete, deleteMaintenanceItem,
  type MaintenanceItem, type MaintenanceCategory, type MaintenanceFrequency,
} from "@/lib/maintenance";
import Modal from "@/components/founder/Modal";
import ConfirmDialog from "@/components/founder/ConfirmDialog";
import { daysUntil, relativeDue, shortDate } from "./utils";
import f from "@/styles/founder.module.css";
import c from "@/styles/company.module.css";

export const categoryLabel: Record<MaintenanceCategory, string> = {
  backups: "Backups", security: "Security", tax: "Tax and statutory", dependencies: "Dependencies", infrastructure: "Infrastructure", other: "Other",
};
const frequencyLabel: Record<MaintenanceFrequency, string> = {
  one_off: "One-off", weekly: "Weekly", monthly: "Monthly", quarterly: "Quarterly", annual: "Every year",
};

// Starting points only. Dates and deadlines differ per obligation, so check the current rules with KRA, BRS and your county.
const TEMPLATES: { title: string; category: MaintenanceCategory; frequency: MaintenanceFrequency }[] = [
  { title: "VAT return", category: "tax", frequency: "monthly" },
  { title: "PAYE and payroll deductions", category: "tax", frequency: "monthly" },
  { title: "Income tax return", category: "tax", frequency: "annual" },
  { title: "Annual company returns", category: "tax", frequency: "annual" },
  { title: "Business permit renewal", category: "tax", frequency: "annual" },
  { title: "Restore test from backup", category: "backups", frequency: "quarterly" },
  { title: "Review who has admin access", category: "security", frequency: "quarterly" },
  { title: "Update dependencies", category: "dependencies", frequency: "monthly" },
];

type Form = { title: string; notes: string; category: MaintenanceCategory; frequency: MaintenanceFrequency; next_due: string };
const emptyForm = (): Form => ({ title: "", notes: "", category: "other", frequency: "monthly", next_due: "" });

type Props = {
  items: MaintenanceItem[];
  setItems: React.Dispatch<React.SetStateAction<MaintenanceItem[]>>;
  onError: (err: unknown, source: string) => void;
};

const sortItems = (list: MaintenanceItem[]) => [...list].sort((a, b) => a.next_due.localeCompare(b.next_due));
const isDone = (i: MaintenanceItem) => i.frequency === "one_off" && !!i.last_completed;

export default function Compliance({ items, setItems, onError }: Props) {
  const [filter, setFilter] = useState<"all" | MaintenanceCategory>("all");
  const [editing, setEditing] = useState<MaintenanceItem | "new" | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<MaintenanceItem | null>(null);

  const shown = items.filter(i => filter === "all" || i.category === filter);
  const open = shown.filter(i => !isDone(i));
  const groups = [
    { key: "overdue", label: "Overdue", rows: open.filter(i => daysUntil(i.next_due) < 0) },
    { key: "week", label: "Due this week", rows: open.filter(i => { const d = daysUntil(i.next_due); return d >= 0 && d <= 7; }) },
    { key: "month", label: "Due in the next 30 days", rows: open.filter(i => { const d = daysUntil(i.next_due); return d > 7 && d <= 30; }) },
    { key: "later", label: "Later", rows: open.filter(i => daysUntil(i.next_due) > 30) },
    { key: "done", label: "Completed one-offs", rows: shown.filter(isDone) },
  ].filter(g => g.rows.length > 0);

  const overdueCount = items.filter(i => !isDone(i) && daysUntil(i.next_due) < 0).length;
  const usedCategories = Array.from(new Set(items.map(i => i.category)));

  const openNew = () => { setForm(emptyForm()); setFormError(null); setEditing("new"); };
  const openEdit = (item: MaintenanceItem) => {
    setForm({ title: item.title, notes: item.notes ?? "", category: item.category, frequency: item.frequency, next_due: item.next_due });
    setFormError(null);
    setEditing(item);
  };

  async function save() {
    if (!form.title.trim() || !form.next_due) { setFormError("Add a title and the next due date."); return; }
    setFormError(null);
    try {
      if (editing === "new") {
        const created = await createMaintenanceItem({ title: form.title.trim(), notes: form.notes || undefined, category: form.category, frequency: form.frequency, next_due: form.next_due });
        setItems(prev => sortItems([...prev, created]));
      } else if (editing) {
        const updated = await updateMaintenanceItem(editing.id, { title: form.title.trim(), notes: form.notes || null, category: form.category, frequency: form.frequency, next_due: form.next_due });
        setItems(prev => sortItems(prev.map(i => (i.id === updated.id ? updated : i))));
      }
      setEditing(null);
    } catch (err) {
      onError(err, "CompanyPage/saveMaintenance");
      setFormError("This couldn't be saved. Try again.");
    }
  }

  async function complete(item: MaintenanceItem) {
    try {
      const updated = await markMaintenanceComplete(item);
      setItems(prev => sortItems(prev.map(i => (i.id === item.id ? updated : i))));
    } catch (err) { onError(err, "CompanyPage/completeMaintenance"); }
  }

  async function remove() {
    if (!deleting) return;
    try {
      await deleteMaintenanceItem(deleting.id);
      setItems(prev => prev.filter(i => i.id !== deleting.id));
    } catch (err) { onError(err, "CompanyPage/deleteMaintenance"); }
    setDeleting(null);
  }

  return (
    <div className={f.tabPanel}>
      <div className={f.sectionHead}>
        <div>
          <h2 className={f.sectionTitle}>Compliance and upkeep</h2>
          <p className={f.sectionSub} style={{ marginTop: 4 }}>
            {items.length === 0 ? "Tax filings, permits, backups and security checks, each with a real due date." : overdueCount > 0 ? `${overdueCount} overdue.` : "Nothing overdue."}
          </p>
        </div>
        <button className={f.primary} onClick={openNew}>Add obligation</button>
      </div>

      {usedCategories.length > 1 && (
        <div className={f.segmented} role="group" aria-label="Filter by category" style={{ alignSelf: "flex-start" }}>
          <button className={f.segBtn} aria-pressed={filter === "all"} onClick={() => setFilter("all")}>All</button>
          {usedCategories.map(cat => (
            <button key={cat} className={f.segBtn} aria-pressed={filter === cat} onClick={() => setFilter(cat)}>{categoryLabel[cat]}</button>
          ))}
        </div>
      )}

      {items.length === 0 ? (
        <div className={f.empty}>
          <strong>Nothing scheduled yet.</strong>
          Add what the company has to do on a schedule so it never slips: filings, renewals, backup checks. There are common starting points when you add one.
          <div><button className={f.secondary} onClick={openNew}>Add the first one</button></div>
        </div>
      ) : shown.length === 0 ? (
        <div className={f.empty}><strong>Nothing in this category.</strong></div>
      ) : (
        <div>
          {groups.map(g => (
            <section key={g.key} aria-label={g.label}>
              <h3 className={c.groupTitle}>{g.label}<span>{g.rows.length}</span></h3>
              {g.rows.map(item => {
                const d = daysUntil(item.next_due);
                const done = isDone(item);
                return (
                  <div key={item.id} className={c.dueRow}>
                    <div>
                      <div className={c.dueTitle}>{item.title}<span className={c.tag}>{categoryLabel[item.category]}</span></div>
                      {item.notes && <div className={c.dueNotes}>{item.notes}</div>}
                      <div className={c.dueMeta}>
                        {frequencyLabel[item.frequency]}
                        {item.last_completed && ` · last done ${shortDate(item.last_completed)}`}
                      </div>
                    </div>
                    <div className={c.dueSide}>
                      {done ? (
                        <span className={c.when}>Completed {shortDate(item.last_completed)}</span>
                      ) : (
                        <span className={`${c.when} ${d < 0 ? c.late : d <= 7 ? c.soon : ""}`} style={{ fontWeight: d <= 7 ? 600 : 400 }}>
                          {relativeDue(d)} · {shortDate(item.next_due)}
                        </span>
                      )}
                      <div className={c.dueActions}>
                        {!done && <button className={f.secondary} style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => complete(item)}>Mark done</button>}
                        <button className={f.linkBtn} onClick={() => openEdit(item)}>Edit</button>
                        <button className={f.linkBtn} style={{ color: "var(--text-secondary)" }} onClick={() => setDeleting(item)}>Delete</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </section>
          ))}
        </div>
      )}

      {editing && (
        <Modal title={editing === "new" ? "Add an obligation" : "Edit obligation"} onClose={() => setEditing(null)}>
          {editing === "new" && (
            <div className={f.field}>
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Start from a common one</span>
              <div className={c.templates}>
                {TEMPLATES.map(t => (
                  <button key={t.title} type="button" className={c.chip} onClick={() => setForm(p => ({ ...p, title: t.title, category: t.category, frequency: t.frequency }))}>{t.title}</button>
                ))}
              </div>
              <span className={f.hint}>These fill in the title and how often it repeats. Confirm the actual deadline with the authority.</span>
            </div>
          )}
          <div className={f.field}>
            <label htmlFor="cp-title">Title</label>
            <input id="cp-title" className={f.input} autoFocus value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className={f.fieldRow}>
            <div className={f.field}>
              <label htmlFor="cp-cat">Category</label>
              <select id="cp-cat" className={f.input} value={form.category} onChange={e => setForm({ ...form, category: e.target.value as MaintenanceCategory })}>
                {(Object.keys(categoryLabel) as MaintenanceCategory[]).map(k => <option key={k} value={k}>{categoryLabel[k]}</option>)}
              </select>
            </div>
            <div className={f.field}>
              <label htmlFor="cp-freq">Repeats</label>
              <select id="cp-freq" className={f.input} value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value as MaintenanceFrequency })}>
                {(Object.keys(frequencyLabel) as MaintenanceFrequency[]).map(k => <option key={k} value={k}>{frequencyLabel[k]}</option>)}
              </select>
            </div>
          </div>
          <div className={f.field}>
            <label htmlFor="cp-due">Next due</label>
            <input id="cp-due" className={f.input} type="date" value={form.next_due} onChange={e => setForm({ ...form, next_due: e.target.value })} />
          </div>
          <div className={f.field}>
            <label htmlFor="cp-notes">Notes</label>
            <textarea id="cp-notes" className={f.input} rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={{ resize: "vertical" }} />
          </div>
          {formError && <div className={f.formError} role="alert">{formError}</div>}
          <div className={f.dialogActions}>
            <button className={f.secondary} onClick={() => setEditing(null)}>Cancel</button>
            <button className={f.primary} onClick={save}>{editing === "new" ? "Add obligation" : "Save changes"}</button>
          </div>
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog title="Delete this obligation?" message={`"${deleting.title}" and its due date will be removed.`} confirmLabel="Delete" onConfirm={remove} onCancel={() => setDeleting(null)} />
      )}
    </div>
  );
}