"use client";

import { useEffect, useState } from "react";
import {
  getRoadmapItems, createRoadmapItem, updateRoadmapItem, deleteRoadmapItem,
  type RoadmapItem, type RoadmapStatus, type RoadmapPriority,
} from "@/lib/roadmap";
import {
  getMaintenanceItems, createMaintenanceItem, markMaintenanceComplete, deleteMaintenanceItem,
  type MaintenanceItem, type MaintenanceCategory, type MaintenanceFrequency,
} from "@/lib/maintenance";
import { formatError } from "@/lib/errorFormat";
import { logError } from "@/lib/errorLog";
import s from "@/styles/layout.module.css";

type Section = "roadmap" | "maintenance";

const AREAS = ["Platform", "Finance Engine", "Procurement", "AI Insights", "Analytics", "Business Ops", "Company Ops", "Marketing", "Other"];

const statusLabel: Record<RoadmapStatus, string> = {
  backlog: "Backlog",
  planned: "Planned",
  in_progress: "In Progress",
  done: "Done",
};

const statusColor: Record<RoadmapStatus, string> = {
  backlog: "#9c9cb8",
  planned: "#3b82f6",
  in_progress: "#f59e0b",
  done: "#4ade80",
};

const priorityColor: Record<RoadmapPriority, string> = {
  low: "#9c9cb8",
  medium: "#f59e0b",
  high: "#ef4444",
};

const categoryLabel: Record<MaintenanceCategory, string> = {
  backups: "Backups",
  security: "Security",
  tax: "Tax",
  dependencies: "Dependencies",
  infrastructure: "Infrastructure",
  other: "Other",
};

const frequencyLabel: Record<MaintenanceFrequency, string> = {
  one_off: "One-off",
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  annual: "Annual",
};

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export default function CompanyPage() {
  const [section, setSection] = useState<Section>("roadmap");

  const [roadmapItems, setRoadmapItems] = useState<RoadmapItem[]>([]);
  const [roadmapFilter, setRoadmapFilter] = useState<RoadmapStatus | "all">("all");
  const [showRoadmapForm, setShowRoadmapForm] = useState(false);
  const [newRoadmap, setNewRoadmap] = useState({ title: "", description: "", area: AREAS[0], priority: "medium" as RoadmapPriority, target_date: "" });

  const [maintenanceItems, setMaintenanceItems] = useState<MaintenanceItem[]>([]);
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [newMaintenance, setNewMaintenance] = useState({ title: "", notes: "", category: "other" as MaintenanceCategory, frequency: "monthly" as MaintenanceFrequency, next_due: "" });

  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoadError(null);
    try {
      const [roadmap, maintenance] = await Promise.all([getRoadmapItems(), getMaintenanceItems()]);
      setRoadmapItems(roadmap);
      setMaintenanceItems(maintenance);
    } catch (err) {
      const message = formatError(err);
      setLoadError(message);
      logError({ source: "CompanyPage", message });
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "9px 12px", borderRadius: "8px",
    border: "1px solid var(--border)", background: "var(--bg-base)",
    color: "var(--text-primary)", fontSize: "13px", outline: "none", fontFamily: "inherit",
  };

  const handleCreateRoadmap = async () => {
    if (!newRoadmap.title.trim()) return;
    setActionError(null);
    try {
      const created = await createRoadmapItem({
        title: newRoadmap.title,
        description: newRoadmap.description || undefined,
        area: newRoadmap.area,
        priority: newRoadmap.priority,
        target_date: newRoadmap.target_date || null,
      });
      setRoadmapItems(prev => [created, ...prev]);
      setNewRoadmap({ title: "", description: "", area: AREAS[0], priority: "medium", target_date: "" });
      setShowRoadmapForm(false);
    } catch (err) {
      const message = formatError(err);
      setActionError(message);
      logError({ source: "CompanyPage/createRoadmap", message });
    }
  };

  const handleStatusChange = async (item: RoadmapItem, status: RoadmapStatus) => {
    try {
      const updated = await updateRoadmapItem(item.id, { status });
      setRoadmapItems(prev => prev.map(r => r.id === item.id ? updated : r));
    } catch (err) {
      const message = formatError(err);
      setActionError(message);
      logError({ source: "CompanyPage/updateStatus", message });
    }
  };

  const handleDeleteRoadmap = async (id: string) => {
    try {
      await deleteRoadmapItem(id);
      setRoadmapItems(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      const message = formatError(err);
      setActionError(message);
      logError({ source: "CompanyPage/deleteRoadmap", message });
    }
  };

  const handleCreateMaintenance = async () => {
    if (!newMaintenance.title.trim() || !newMaintenance.next_due) return;
    setActionError(null);
    try {
      const created = await createMaintenanceItem({
        title: newMaintenance.title,
        notes: newMaintenance.notes || undefined,
        category: newMaintenance.category,
        frequency: newMaintenance.frequency,
        next_due: newMaintenance.next_due,
      });
      setMaintenanceItems(prev => [...prev, created].sort((a, b) => a.next_due.localeCompare(b.next_due)));
      setNewMaintenance({ title: "", notes: "", category: "other", frequency: "monthly", next_due: "" });
      setShowMaintenanceForm(false);
    } catch (err) {
      const message = formatError(err);
      setActionError(message);
      logError({ source: "CompanyPage/createMaintenance", message });
    }
  };

  const handleMarkComplete = async (item: MaintenanceItem) => {
    try {
      const updated = await markMaintenanceComplete(item);
      setMaintenanceItems(prev => prev.map(m => m.id === item.id ? updated : m).sort((a, b) => a.next_due.localeCompare(b.next_due)));
    } catch (err) {
      const message = formatError(err);
      setActionError(message);
      logError({ source: "CompanyPage/markComplete", message });
    }
  };

  const handleDeleteMaintenance = async (id: string) => {
    try {
      await deleteMaintenanceItem(id);
      setMaintenanceItems(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      const message = formatError(err);
      setActionError(message);
      logError({ source: "CompanyPage/deleteMaintenance", message });
    }
  };

  const filteredRoadmap = roadmapFilter === "all" ? roadmapItems : roadmapItems.filter(r => r.status === roadmapFilter);

  const navItems: { id: Section; label: string; icon: string }[] = [
    { id: "roadmap", label: "Roadmap", icon: "🗺" },
    { id: "maintenance", label: "Maintenance", icon: "🛠" },
  ];

  return (
    <div className="page-shell">
      <div className={s.body}>
        <main className={s.settingsMain}>

          <div style={{ width: "200px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "4px" }}>
            <div style={{ fontSize: "11px", color: "var(--gold)", marginBottom: "8px", letterSpacing: "0.08em", fontWeight: 700 }}>
              🏢 COMPANY
            </div>
            {navItems.map(item => (
              <button key={item.id} onClick={() => setSection(item.id)} style={{
                padding: "9px 14px", borderRadius: "8px", border: "none",
                background: section === item.id ? "var(--bg-elevated)" : "transparent",
                color: section === item.id ? "var(--gold)" : "var(--text-secondary)",
                fontSize: "12px", cursor: "pointer", textAlign: "left",
                fontWeight: section === item.id ? 600 : 400,
                borderLeft: section === item.id ? "2px solid var(--gold)" : "2px solid transparent",
                transition: "all 0.15s ease", fontFamily: "inherit",
                display: "flex", alignItems: "center", gap: "8px",
              }}>
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "16px", overflowY: "auto", maxHeight: "calc(100vh - 80px)", maxWidth: "720px" }}>

            {loadError && (
              <div style={{ fontSize: 12, color: "#ef4444", background: "#ef44441a", border: "1px solid #ef444440", borderRadius: 8, padding: "10px 12px" }}>
                {loadError}
              </div>
            )}
            {actionError && (
              <div style={{ fontSize: 12, color: "#ef4444", background: "#ef44441a", border: "1px solid #ef444440", borderRadius: 8, padding: "10px 12px" }}>
                {actionError}
              </div>
            )}

            {section === "roadmap" && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <h2 style={{ fontSize: "18px", fontWeight: 700 }}>Roadmap</h2>
                    <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>Everything waiting to be built, so nothing gets forgotten</p>
                  </div>
                  <button onClick={() => setShowRoadmapForm(prev => !prev)} className={s.btnGold} style={{ width: "auto", padding: "8px 16px" }}>
                    {showRoadmapForm ? "Cancel" : "+ Add Item"}
                  </button>
                </div>

                {showRoadmapForm && (
                  <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                    <input value={newRoadmap.title} onChange={e => setNewRoadmap({ ...newRoadmap, title: e.target.value })} placeholder="Title" style={inputStyle} />
                    <textarea value={newRoadmap.description} onChange={e => setNewRoadmap({ ...newRoadmap, description: e.target.value })} placeholder="Requirements / description" rows={3} style={{ ...inputStyle, resize: "none" }} />
                    <div style={{ display: "flex", gap: "10px" }}>
                      <select value={newRoadmap.area} onChange={e => setNewRoadmap({ ...newRoadmap, area: e.target.value })} style={inputStyle}>
                        {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                      <select value={newRoadmap.priority} onChange={e => setNewRoadmap({ ...newRoadmap, priority: e.target.value as RoadmapPriority })} style={inputStyle}>
                        <option value="low">Low priority</option>
                        <option value="medium">Medium priority</option>
                        <option value="high">High priority</option>
                      </select>
                    </div>
                    <input type="date" value={newRoadmap.target_date} onChange={e => setNewRoadmap({ ...newRoadmap, target_date: e.target.value })} style={inputStyle} />
                    <button onClick={handleCreateRoadmap} className={s.btnGold} style={{ marginTop: "4px" }}>Add to Roadmap</button>
                  </div>
                )}

                <div style={{ display: "flex", gap: "4px" }}>
                  {(["all", "backlog", "planned", "in_progress", "done"] as const).map(f => (
                    <button key={f} onClick={() => setRoadmapFilter(f)} style={{
                      padding: "6px 12px", borderRadius: "8px", border: "1px solid var(--border)",
                      background: roadmapFilter === f ? "var(--bg-elevated)" : "transparent",
                      color: roadmapFilter === f ? "var(--gold)" : "var(--text-muted)",
                      fontSize: "11px", cursor: "pointer", fontFamily: "inherit", fontWeight: roadmapFilter === f ? 600 : 400,
                    }}>
                      {f === "all" ? "All" : statusLabel[f]}
                    </button>
                  ))}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {filteredRoadmap.length === 0 && (
                    <div style={{ fontSize: "13px", color: "var(--text-muted)", textAlign: "center", padding: "24px 0" }}>
                      Nothing here yet.
                    </div>
                  )}
                  {filteredRoadmap.map(item => (
                    <div key={item.id} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "14px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                            <span style={{ fontSize: "13px", fontWeight: 600 }}>{item.title}</span>
                            <span style={{ fontSize: "9px", fontWeight: 700, color: priorityColor[item.priority], textTransform: "uppercase" }}>{item.priority}</span>
                          </div>
                          {item.description && (
                            <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "6px" }}>{item.description}</div>
                          )}
                          <div style={{ display: "flex", gap: "10px", fontSize: "11px", color: "var(--text-muted)" }}>
                            <span>{item.area}</span>
                            {item.target_date && <span>Target: {new Date(item.target_date).toLocaleDateString("en-KE")}</span>}
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "flex-end", flexShrink: 0 }}>
                          <select value={item.status} onChange={e => handleStatusChange(item, e.target.value as RoadmapStatus)} style={{
                            fontSize: "10px", padding: "4px 8px", borderRadius: "6px",
                            border: `1px solid ${statusColor[item.status]}60`, background: "var(--bg-elevated)",
                            color: statusColor[item.status], fontWeight: 600, fontFamily: "inherit", cursor: "pointer",
                          }}>
                            <option value="backlog">Backlog</option>
                            <option value="planned">Planned</option>
                            <option value="in_progress">In Progress</option>
                            <option value="done">Done</option>
                          </select>
                          <button onClick={() => handleDeleteRoadmap(item.id)} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "11px", cursor: "pointer", fontFamily: "inherit" }}>
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {section === "maintenance" && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <h2 style={{ fontSize: "18px", fontWeight: 700 }}>Maintenance</h2>
                    <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>Recurring operational items with real due dates</p>
                  </div>
                  <button onClick={() => setShowMaintenanceForm(prev => !prev)} className={s.btnGold} style={{ width: "auto", padding: "8px 16px" }}>
                    {showMaintenanceForm ? "Cancel" : "+ Add Item"}
                  </button>
                </div>

                {showMaintenanceForm && (
                  <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                    <input value={newMaintenance.title} onChange={e => setNewMaintenance({ ...newMaintenance, title: e.target.value })} placeholder="Title (e.g. Verify off-site backup)" style={inputStyle} />
                    <textarea value={newMaintenance.notes} onChange={e => setNewMaintenance({ ...newMaintenance, notes: e.target.value })} placeholder="Notes" rows={2} style={{ ...inputStyle, resize: "none" }} />
                    <div style={{ display: "flex", gap: "10px" }}>
                      <select value={newMaintenance.category} onChange={e => setNewMaintenance({ ...newMaintenance, category: e.target.value as MaintenanceCategory })} style={inputStyle}>
                        {(Object.keys(categoryLabel) as MaintenanceCategory[]).map(c => <option key={c} value={c}>{categoryLabel[c]}</option>)}
                      </select>
                      <select value={newMaintenance.frequency} onChange={e => setNewMaintenance({ ...newMaintenance, frequency: e.target.value as MaintenanceFrequency })} style={inputStyle}>
                        {(Object.keys(frequencyLabel) as MaintenanceFrequency[]).map(f => <option key={f} value={f}>{frequencyLabel[f]}</option>)}
                      </select>
                    </div>
                    <input type="date" value={newMaintenance.next_due} onChange={e => setNewMaintenance({ ...newMaintenance, next_due: e.target.value })} style={inputStyle} />
                    <button onClick={handleCreateMaintenance} className={s.btnGold} style={{ marginTop: "4px" }}>Add Maintenance Item</button>
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {maintenanceItems.length === 0 && (
                    <div style={{ fontSize: "13px", color: "var(--text-muted)", textAlign: "center", padding: "24px 0" }}>
                      Nothing scheduled yet.
                    </div>
                  )}
                  {maintenanceItems.map(item => {
                    const days = daysUntil(item.next_due);
                    const dueColor = days < 0 ? "#ef4444" : days <= 7 ? "#f59e0b" : "#4ade80";
                    const dueLabel = days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "Due today" : `Due in ${days}d`;
                    return (
                      <div key={item.id} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                            <span style={{ fontSize: "13px", fontWeight: 600 }}>{item.title}</span>
                            <span style={{ fontSize: "9px", color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: "4px", padding: "1px 6px" }}>{categoryLabel[item.category]}</span>
                          </div>
                          {item.notes && <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>{item.notes}</div>}
                          <div style={{ display: "flex", gap: "10px", fontSize: "11px", color: "var(--text-muted)" }}>
                            <span>{frequencyLabel[item.frequency]}</span>
                            {item.last_completed && <span>Last done: {new Date(item.last_completed).toLocaleDateString("en-KE")}</span>}
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px", flexShrink: 0 }}>
                          <span style={{ fontSize: "11px", fontWeight: 700, color: dueColor }}>{dueLabel}</span>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button onClick={() => handleMarkComplete(item)} style={{
                              fontSize: "10px", padding: "5px 10px", borderRadius: "6px",
                              border: "none", background: "#4ade80", color: "#07070f",
                              fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                            }}>
                              Mark Complete
                            </button>
                            <button onClick={() => handleDeleteMaintenance(item.id)} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "11px", cursor: "pointer", fontFamily: "inherit" }}>
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}