"use client";

import { useMemo, useState } from "react";
import {
  createRoadmapItem, updateRoadmapItem, deleteRoadmapItem,
  type RoadmapItem, type RoadmapStatus, type RoadmapPriority,
} from "@/lib/roadmap";
import Modal from "@/components/founder/Modal";
import ConfirmDialog from "@/components/founder/ConfirmDialog";
import { daysUntil, shortDate } from "@/components/company/utils";
import f from "@/styles/founder.module.css";
import c from "@/styles/company.module.css";

export const AREAS = ["Platform", "Finance Engine", "Procurement", "AI Insights", "Analytics", "Business Ops", "Company Ops", "Marketing", "Other"];

export const COLUMNS: { id: RoadmapStatus; label: string }[] = [
  { id: "backlog", label: "Backlog" },
  { id: "planned", label: "Planned" },
  { id: "in_progress", label: "In progress" },
  { id: "done", label: "Done" },
];

const priorityRank: Record<RoadmapPriority, number> = { high: 0, medium: 1, low: 2 };
const priorityLabel: Record<RoadmapPriority, string> = { high: "High priority", medium: "Medium priority", low: "Low priority" };

type Form = { title: string; description: string; area: string; priority: RoadmapPriority; target_date: string; status: RoadmapStatus };
const emptyForm = (): Form => ({ title: "", description: "", area: AREAS[0], priority: "medium", target_date: "", status: "backlog" });

type Props = {
  items: RoadmapItem[];
  setItems: React.Dispatch<React.SetStateAction<RoadmapItem[]>>;
  onError: (err: unknown, source: string) => void;
};

export default function Roadmap({ items, setItems, onError }: Props) {
  const [view, setView] = useState<"board" | "list">("board");
  const [areaFilter, setAreaFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | RoadmapPriority>("all");
  const [editing, setEditing] = useState<RoadmapItem | "new" | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<RoadmapItem | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<RoadmapStatus | null>(null);

  const areas = useMemo(() => Array.from(new Set([...AREAS, ...items.map(i => i.area)])), [items]);

  const visible = items
    .filter(i => (areaFilter === "all" || i.area === areaFilter) && (priorityFilter === "all" || i.priority === priorityFilter))
    .sort((a, b) =>
      priorityRank[a.priority] - priorityRank[b.priority] ||
      (a.target_date ?? "9999").localeCompare(b.target_date ?? "9999"));

  const counts = COLUMNS.map(col => ({ ...col, n: items.filter(i => i.status === col.id).length }));
  const donePct = items.length ? Math.round((counts[3].n / items.length) * 100) : 0;

  const openNew = () => { setForm(emptyForm()); setFormError(null); setEditing("new"); };
  const openEdit = (item: RoadmapItem) => {
    setForm({ title: item.title, description: item.description ?? "", area: item.area, priority: item.priority, target_date: item.target_date ?? "", status: item.status });
    setFormError(null);
    setEditing(item);
  };

  async function save() {
    if (!form.title.trim()) { setFormError("Give the item a title."); return; }
    setFormError(null);
    try {
      if (editing === "new") {
        let created = await createRoadmapItem({
          title: form.title.trim(), description: form.description || undefined,
          area: form.area, priority: form.priority, target_date: form.target_date || null,
        });
        if (form.status !== "backlog") created = await updateRoadmapItem(created.id, { status: form.status });
        setItems(prev => [created, ...prev]);
      } else if (editing) {
        const updated = await updateRoadmapItem(editing.id, {
          title: form.title.trim(), description: form.description || null,
          area: form.area, priority: form.priority, target_date: form.target_date || null, status: form.status,
        });
        setItems(prev => prev.map(i => (i.id === updated.id ? updated : i)));
      }
      setEditing(null);
    } catch (err) {
      onError(err, "CompanyPage/saveRoadmap");
      setFormError("The item couldn't be saved. Try again.");
    }
  }

  async function move(item: RoadmapItem, status: RoadmapStatus) {
    if (item.status === status) return;
    const before = items;
    setItems(prev => prev.map(i => (i.id === item.id ? { ...i, status } : i)));
    try {
      const updated = await updateRoadmapItem(item.id, { status });
      setItems(prev => prev.map(i => (i.id === item.id ? updated : i)));
    } catch (err) {
      setItems(before);
      onError(err, "CompanyPage/moveRoadmap");
    }
  }

  async function remove() {
    if (!deleting) return;
    try {
      await deleteRoadmapItem(deleting.id);
      setItems(prev => prev.filter(i => i.id !== deleting.id));
    } catch (err) {
      onError(err, "CompanyPage/deleteRoadmap");
    }
    setDeleting(null);
  }

  const targetInfo = (item: RoadmapItem) => {
    if (!item.target_date) return null;
    const late = item.status !== "done" && daysUntil(item.target_date) < 0;
    return <span className={late ? c.late : undefined}>{late ? "Overdue, " : "Target "}{shortDate(item.target_date)}</span>;
  };

  const StatusSelect = ({ item }: { item: RoadmapItem }) => (
    <select className={`${f.select} ${f.selectSm}`} aria-label={`Status of ${item.title}`} value={item.status} onChange={e => move(item, e.target.value as RoadmapStatus)}>
      {COLUMNS.map(col => <option key={col.id} value={col.id}>{col.label}</option>)}
    </select>
  );

  return (
    <div className={f.tabPanel}>
      <div className={f.sectionHead}>
        <div>
          <h2 className={f.sectionTitle}>Product roadmap</h2>
          <p className={f.sectionSub} style={{ marginTop: 4 }}>
            {items.length === 0 ? "Everything you plan to build, in one place." : `${items.length} items, ${donePct}% done.`}
          </p>
        </div>
        <button className={f.primary} onClick={openNew}>Add item</button>
      </div>

      {items.length > 0 && (
        <div className={f.toolbar}>
          <div className={f.actions}>
            <select className={`${f.select} ${f.selectSm}`} aria-label="Filter by area" value={areaFilter} onChange={e => setAreaFilter(e.target.value)}>
              <option value="all">All areas</option>
              {areas.map(a => <option key={a}>{a}</option>)}
            </select>
            <select className={`${f.select} ${f.selectSm}`} aria-label="Filter by priority" value={priorityFilter} onChange={e => setPriorityFilter(e.target.value as "all" | RoadmapPriority)}>
              <option value="all">Any priority</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div className={f.segmented} role="group" aria-label="View">
            <button className={f.segBtn} aria-pressed={view === "board"} onClick={() => setView("board")}>Board</button>
            <button className={f.segBtn} aria-pressed={view === "list"} onClick={() => setView("list")}>List</button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className={f.empty}>
          <strong>Nothing on the roadmap yet.</strong>
          Add features, fixes and ideas so nothing gets forgotten. Drag cards between columns as work moves along.
          <div><button className={f.secondary} onClick={openNew}>Add the first item</button></div>
        </div>
      ) : view === "board" ? (
        <div className={c.board}>
          {COLUMNS.map(col => {
            const colItems = visible.filter(i => i.status === col.id);
            return (
              <div
                key={col.id}
                className={`${c.col} ${overCol === col.id ? c.colOver : ""}`}
                onDragOver={e => { e.preventDefault(); setOverCol(col.id); }}
                onDragLeave={() => setOverCol(o => (o === col.id ? null : o))}
                onDrop={e => {
                  e.preventDefault();
                  const item = items.find(i => i.id === dragId);
                  setOverCol(null); setDragId(null);
                  if (item) move(item, col.id);
                }}
              >
                <div className={c.colHead}>{col.label}<span>{colItems.length}</span></div>
                {colItems.length === 0 && <div className={c.colEmpty}>Nothing here.</div>}
                {colItems.map(item => (
                  <div
                    key={item.id}
                    className={`${c.item} ${dragId === item.id ? c.itemDragging : ""}`}
                    draggable
                    onDragStart={e => { setDragId(item.id); e.dataTransfer.setData("text/plain", item.id); e.dataTransfer.effectAllowed = "move"; }}
                    onDragEnd={() => { setDragId(null); setOverCol(null); }}
                  >
                    <div className={c.itemTitle}>{item.title}</div>
                    {item.description && <div className={c.itemDesc}>{item.description}</div>}
                    <div className={c.itemMeta}>
                      <span className={c.mark} data-tone={item.priority}>{priorityLabel[item.priority]}</span>
                      <span>{item.area}</span>
                      {targetInfo(item)}
                    </div>
                    <div className={c.itemFoot}>
                      <StatusSelect item={item} />
                      <div className={c.itemActions}>
                        <button className={f.linkBtn} onClick={() => openEdit(item)}>Edit</button>
                        <button className={f.linkBtn} style={{ color: "var(--text-secondary)" }} onClick={() => setDeleting(item)}>Delete</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      ) : visible.length === 0 ? (
        <div className={f.empty}><strong>No items match.</strong>Try a different area or priority.</div>
      ) : (
        <div className={f.tableWrap}>
          <table className={f.ledger}>
            <thead><tr><th>Item</th><th>Area</th><th>Priority</th><th>Target</th><th>Status</th><th /></tr></thead>
            <tbody>
              {visible.map(item => (
                <tr key={item.id}>
                  <td>
                    <div className={f.cellMain}>{item.title}</div>
                    {item.description && <div className={f.cellSub}>{item.description}</div>}
                  </td>
                  <td className={f.cellMuted}>{item.area}</td>
                  <td><span className={c.mark} data-tone={item.priority} style={{ textTransform: "capitalize" }}>{item.priority}</span></td>
                  <td className={f.cellMuted}>{targetInfo(item) ?? "—"}</td>
                  <td><StatusSelect item={item} /></td>
                  <td className={f.cellMuted}>
                    <button className={f.linkBtn} onClick={() => openEdit(item)}>Edit</button>{" "}
                    <button className={f.linkBtn} style={{ color: "var(--text-secondary)", marginLeft: 12 }} onClick={() => setDeleting(item)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <Modal title={editing === "new" ? "New roadmap item" : "Edit roadmap item"} onClose={() => setEditing(null)}>
          <div className={f.field}>
            <label htmlFor="rm-title">Title</label>
            <input id="rm-title" className={f.input} autoFocus value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Payroll approvals" />
          </div>
          <div className={f.field}>
            <label htmlFor="rm-desc">What needs to happen</label>
            <textarea id="rm-desc" className={`${f.input} ${c.input ?? ""}`} rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ resize: "vertical" }} />
          </div>
          <div className={f.fieldRow}>
            <div className={f.field}>
              <label htmlFor="rm-area">Area</label>
              <select id="rm-area" className={f.input} value={form.area} onChange={e => setForm({ ...form, area: e.target.value })}>
                {areas.map(a => <option key={a}>{a}</option>)}
              </select>
            </div>
            <div className={f.field}>
              <label htmlFor="rm-priority">Priority</label>
              <select id="rm-priority" className={f.input} value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as RoadmapPriority })}>
                <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
              </select>
            </div>
          </div>
          <div className={f.fieldRow}>
            <div className={f.field}>
              <label htmlFor="rm-status">Status</label>
              <select id="rm-status" className={f.input} value={form.status} onChange={e => setForm({ ...form, status: e.target.value as RoadmapStatus })}>
                {COLUMNS.map(col => <option key={col.id} value={col.id}>{col.label}</option>)}
              </select>
            </div>
            <div className={f.field}>
              <label htmlFor="rm-target">Target date</label>
              <input id="rm-target" className={f.input} type="date" value={form.target_date} onChange={e => setForm({ ...form, target_date: e.target.value })} />
            </div>
          </div>
          {formError && <div className={f.formError} role="alert">{formError}</div>}
          <div className={f.dialogActions}>
            <button className={f.secondary} onClick={() => setEditing(null)}>Cancel</button>
            <button className={f.primary} onClick={save}>{editing === "new" ? "Add to roadmap" : "Save changes"}</button>
          </div>
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog title="Delete this item?" message={`"${deleting.title}" will be removed from the roadmap. This can't be undone.`} confirmLabel="Delete item" onConfirm={remove} onCancel={() => setDeleting(null)} />
      )}
    </div>
  );
}