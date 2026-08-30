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
import { getCompanyExpenses, createCompanyExpense, deleteCompanyExpense, type CompanyExpense, type ExpenseCategory } from "@/lib/companyExpenses";
import { getCompanyProfile, saveCompanyProfile, type CompanyProfile } from "@/lib/companyProfile";
import {
  getScheduledCompanyExpenses, createScheduleFromExpense, toggleScheduledExpenseActive, deleteScheduledExpense,
  getScheduledPlatformInvoices, createScheduleFromPlatformInvoice, toggleScheduledPlatformInvoiceActive, deleteScheduledPlatformInvoice,
  type ScheduledCompanyExpense, type ScheduledPlatformInvoice, type ScheduleFrequency,
} from "@/lib/founderScheduledDocuments";
import { getInvoices, type Invoice } from "@/lib/invoices";
import { formatError } from "@/lib/errorFormat";
import { logError } from "@/lib/errorLog";
import s from "@/styles/layout.module.css";

type Section = "profile" | "roadmap" | "maintenance" | "expenses" | "automation";

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
  const [section, setSection] = useState<Section>("profile");

  const [roadmapItems, setRoadmapItems] = useState<RoadmapItem[]>([]);
  const [roadmapFilter, setRoadmapFilter] = useState<RoadmapStatus | "all">("all");
  const [showRoadmapForm, setShowRoadmapForm] = useState(false);
  const [newRoadmap, setNewRoadmap] = useState({ title: "", description: "", area: AREAS[0], priority: "medium" as RoadmapPriority, target_date: "" });

  const [maintenanceItems, setMaintenanceItems] = useState<MaintenanceItem[]>([]);
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [newMaintenance, setNewMaintenance] = useState({ title: "", notes: "", category: "other" as MaintenanceCategory, frequency: "monthly" as MaintenanceFrequency, next_due: "" });

  const [expenses, setExpenses] = useState<CompanyExpense[]>([]);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [newExpense, setNewExpense] = useState({ date: new Date().toISOString().split("T")[0], category: "other" as ExpenseCategory, vendor: "", description: "", amount: "" });

  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    legal_name: "", trading_name: "", registration_number: "", tax_pin: "",
    company_type: "", industry: "", website: "", official_email: "", phone: "",
    registered_address: "", country: "Kenya", currency: "KES", timezone: "Africa/Nairobi", description: "",
  });

  const [platformInvoices, setPlatformInvoices] = useState<Invoice[]>([]);
  const [scheduledExpenses, setScheduledExpenses] = useState<ScheduledCompanyExpense[]>([]);
  const [scheduledPlatformInvoices, setScheduledPlatformInvoices] = useState<ScheduledPlatformInvoice[]>([]);
  const [automationTab, setAutomationTab] = useState<"invoices" | "expenses">("invoices");
  const [scheduleTarget, setScheduleTarget] = useState<{ type: "invoice" | "expense"; item: Invoice | CompanyExpense } | null>(null);
  const [scheduleFrequency, setScheduleFrequency] = useState<ScheduleFrequency>("monthly");
  const [schedulingBusy, setSchedulingBusy] = useState(false);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoadError(null);
    try {
      const [roadmap, maintenance, expenseList, companyProfile, pInvoices, sExpenses, sInvoices] = await Promise.all([
        getRoadmapItems(), getMaintenanceItems(), getCompanyExpenses(), getCompanyProfile(),
        getInvoices(), getScheduledCompanyExpenses(), getScheduledPlatformInvoices(),
      ]);
      setRoadmapItems(roadmap);
      setMaintenanceItems(maintenance);
      setExpenses(expenseList);
      setProfile(companyProfile);
      setPlatformInvoices(pInvoices);
      setScheduledExpenses(sExpenses);
      setScheduledPlatformInvoices(sInvoices);

      if (companyProfile) {
        setProfileForm({
          legal_name: companyProfile.legal_name, trading_name: companyProfile.trading_name ?? "",
          registration_number: companyProfile.registration_number ?? "", tax_pin: companyProfile.tax_pin ?? "",
          company_type: companyProfile.company_type ?? "", industry: companyProfile.industry ?? "",
          website: companyProfile.website ?? "", official_email: companyProfile.official_email ?? "",
          phone: companyProfile.phone ?? "", registered_address: companyProfile.registered_address ?? "",
          country: companyProfile.country, currency: companyProfile.currency, timezone: companyProfile.timezone,
          description: companyProfile.description ?? "",
        });
      } else {
        setEditingProfile(true);
      }
    } catch (err) {
      const message = formatError(err);
      setLoadError(message);
      logError({ source: "CompanyPage", message });
    }
  }

  const handleSaveProfile = async () => {
    if (!profileForm.legal_name.trim()) return;
    setActionError(null);
    try {
      const saved = await saveCompanyProfile(profileForm, profile?.id);
      setProfile(saved);
      setEditingProfile(false);
    } catch (err) {
      const message = formatError(err);
      setActionError(message);
      logError({ source: "CompanyPage/saveProfile", message });
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "9px 12px", borderRadius: "8px",
    border: "1px solid var(--border)", background: "var(--bg-base)",
    color: "var(--text-primary)", fontSize: "13px", outline: "none", fontFamily: "inherit",
  };

  const handleCreateExpense = async () => {
    if (!newExpense.description.trim() || !newExpense.amount) return;
    setActionError(null);
    try {
      const created = await createCompanyExpense({
        date: newExpense.date,
        category: newExpense.category,
        vendor: newExpense.vendor || undefined,
        description: newExpense.description,
        amount: parseFloat(newExpense.amount),
      });
      setExpenses(prev => [created, ...prev]);
      setNewExpense({ date: new Date().toISOString().split("T")[0], category: "other", vendor: "", description: "", amount: "" });
      setShowExpenseForm(false);
    } catch (err) {
      const message = formatError(err);
      setActionError(message);
      logError({ source: "CompanyPage/createExpense", message });
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      await deleteCompanyExpense(id);
      setExpenses(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      const message = formatError(err);
      setActionError(message);
      logError({ source: "CompanyPage/deleteExpense", message });
    }
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

  async function confirmSchedule() {
    if (!scheduleTarget) return;
    setSchedulingBusy(true);
    setActionError(null);
    try {
      if (scheduleTarget.type === "invoice") {
        const created = await createScheduleFromPlatformInvoice(scheduleTarget.item as Invoice, scheduleFrequency);
        setScheduledPlatformInvoices(prev => [...prev, created].sort((a, b) => a.next_run.localeCompare(b.next_run)));
      } else {
        const created = await createScheduleFromExpense(scheduleTarget.item as CompanyExpense, scheduleFrequency);
        setScheduledExpenses(prev => [...prev, created].sort((a, b) => a.next_run.localeCompare(b.next_run)));
      }
      setScheduleTarget(null);
    } catch (err) {
      const message = formatError(err);
      setActionError(message);
      logError({ source: "CompanyPage/confirmSchedule", message });
    } finally {
      setSchedulingBusy(false);
    }
  }

  async function handleToggleExpenseSchedule(sc: ScheduledCompanyExpense) {
    try {
      await toggleScheduledExpenseActive(sc.id, !sc.active);
      setScheduledExpenses(prev => prev.map(x => x.id === sc.id ? { ...x, active: !x.active } : x));
    } catch (err) {
      setActionError(formatError(err));
    }
  }

  async function handleDeleteExpenseSchedule(id: string) {
    try {
      await deleteScheduledExpense(id);
      setScheduledExpenses(prev => prev.filter(x => x.id !== id));
    } catch (err) {
      setActionError(formatError(err));
    }
  }

  async function handleToggleInvoiceSchedule(sc: ScheduledPlatformInvoice) {
    try {
      await toggleScheduledPlatformInvoiceActive(sc.id, !sc.active);
      setScheduledPlatformInvoices(prev => prev.map(x => x.id === sc.id ? { ...x, active: !x.active } : x));
    } catch (err) {
      setActionError(formatError(err));
    }
  }

  async function handleDeleteInvoiceSchedule(id: string) {
    try {
      await deleteScheduledPlatformInvoice(id);
      setScheduledPlatformInvoices(prev => prev.filter(x => x.id !== id));
    } catch (err) {
      setActionError(formatError(err));
    }
  }

  const filteredRoadmap = roadmapFilter === "all" ? roadmapItems : roadmapItems.filter(r => r.status === roadmapFilter);

  const navItems: { id: Section; label: string; icon: string }[] = [
    { id: "profile", label: "Profile", icon: "🏛" },
    { id: "roadmap", label: "Roadmap", icon: "🗺" },
    { id: "expenses", label: "Expenses", icon: "💸" },
    { id: "maintenance", label: "Maintenance", icon: "🛠" },
    { id: "automation", label: "Automation", icon: "🔁" },
  ];

  return (
    <div className="page-shell">
      <div className={s.body}>
        <main className={s.settingsMain}>

          <div style={{ width: "200px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "4px" }}>
            <div style={{ marginBottom: "12px" }}>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--gold)" }}>
                {profile?.legal_name || "AUREVYN"}
              </div>
              <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>Company HQ</div>
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

            {section === "profile" && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <h2 style={{ fontSize: "22px", fontWeight: 700 }}>{profile?.legal_name || "Set up your company"}</h2>
                    <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
                      {profile?.trading_name ? `Trading as ${profile.trading_name}` : "AUREVYN's own identity — not a customer organization"}
                    </p>
                  </div>
                  {profile && !editingProfile && (
                    <button onClick={() => setEditingProfile(true)} className={s.btnGhost} style={{ width: "auto", padding: "8px 16px" }}>Edit</button>
                  )}
                </div>

                {!editingProfile && profile && (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
                      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px", textAlign: "center" }}>
                        <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--gold)" }}>{roadmapItems.filter(r => r.status !== "done").length}</div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>Open Roadmap Items</div>
                      </div>
                      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px", textAlign: "center" }}>
                        <div style={{ fontSize: "20px", fontWeight: 700, color: "#f59e0b" }}>{maintenanceItems.filter(m => daysUntil(m.next_due) <= 7).length}</div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>Maintenance Due Soon</div>
                      </div>
                      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px", textAlign: "center" }}>
                        <div style={{ fontSize: "20px", fontWeight: 700 }}>KES {expenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString()}</div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>Total Expenses</div>
                      </div>
                    </div>

                    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                      {[
                        { label: "Registration No.", value: profile.registration_number },
                        { label: "Tax PIN", value: profile.tax_pin },
                        { label: "Industry", value: profile.industry },
                        { label: "Official Email", value: profile.official_email },
                        { label: "Phone", value: profile.phone },
                        { label: "Address", value: profile.registered_address },
                        { label: "Currency", value: profile.currency },
                      ].filter(f => f.value).map(f => (
                        <div key={f.label} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                          <span style={{ color: "var(--text-muted)" }}>{f.label}</span>
                          <span>{f.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {editingProfile && (
                  <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                    <input value={profileForm.legal_name} onChange={e => setProfileForm({ ...profileForm, legal_name: e.target.value })} placeholder="Legal company name" style={inputStyle} />
                    <input value={profileForm.trading_name} onChange={e => setProfileForm({ ...profileForm, trading_name: e.target.value })} placeholder="Trading name (optional)" style={inputStyle} />
                    <div style={{ display: "flex", gap: "10px" }}>
                      <input value={profileForm.registration_number} onChange={e => setProfileForm({ ...profileForm, registration_number: e.target.value })} placeholder="Registration number" style={inputStyle} />
                      <input value={profileForm.tax_pin} onChange={e => setProfileForm({ ...profileForm, tax_pin: e.target.value })} placeholder="KRA PIN" style={inputStyle} />
                    </div>
                    <input value={profileForm.industry} onChange={e => setProfileForm({ ...profileForm, industry: e.target.value })} placeholder="Industry" style={inputStyle} />
                    <textarea value={profileForm.description} onChange={e => setProfileForm({ ...profileForm, description: e.target.value })} placeholder="Short description" rows={2} style={{ ...inputStyle, resize: "none" }} />
                    <div style={{ display: "flex", gap: "10px" }}>
                      <input value={profileForm.official_email} onChange={e => setProfileForm({ ...profileForm, official_email: e.target.value })} placeholder="Official email" style={inputStyle} />
                      <input value={profileForm.phone} onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })} placeholder="Phone" style={inputStyle} />
                    </div>
                    <input value={profileForm.website} onChange={e => setProfileForm({ ...profileForm, website: e.target.value })} placeholder="Website" style={inputStyle} />
                    <textarea value={profileForm.registered_address} onChange={e => setProfileForm({ ...profileForm, registered_address: e.target.value })} placeholder="Registered address" rows={2} style={{ ...inputStyle, resize: "none" }} />
                    <div style={{ display: "flex", gap: "10px" }}>
                      <input value={profileForm.currency} onChange={e => setProfileForm({ ...profileForm, currency: e.target.value })} placeholder="Currency" style={inputStyle} />
                      <input value={profileForm.country} onChange={e => setProfileForm({ ...profileForm, country: e.target.value })} placeholder="Country" style={inputStyle} />
                    </div>
                    <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                      <button onClick={handleSaveProfile} className={s.btnGold}>Save Profile</button>
                      {profile && <button onClick={() => setEditingProfile(false)} className={s.btnGhost}>Cancel</button>}
                    </div>
                  </div>
                )}
              </>
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

            {section === "expenses" && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <h2 style={{ fontSize: "18px", fontWeight: 700 }}>Expenses</h2>
                    <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>What AUREVYN itself spends money on</p>
                  </div>
                  <button onClick={() => setShowExpenseForm(prev => !prev)} className={s.btnGold} style={{ width: "auto", padding: "8px 16px" }}>
                    {showExpenseForm ? "Cancel" : "+ Add Expense"}
                  </button>
                </div>

                <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px", textAlign: "center" }}>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Total (all time)</div>
                  <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--gold)" }}>
                    KES {expenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString()}
                  </div>
                </div>

                {showExpenseForm && (
                  <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                    <input type="date" value={newExpense.date} onChange={e => setNewExpense({ ...newExpense, date: e.target.value })} style={inputStyle} />
                    <select value={newExpense.category} onChange={e => setNewExpense({ ...newExpense, category: e.target.value as ExpenseCategory })} style={inputStyle}>
                      <option value="hosting">Hosting</option>
                      <option value="domains">Domains</option>
                      <option value="apis">APIs</option>
                      <option value="subscriptions">Subscriptions</option>
                      <option value="software">Software</option>
                      <option value="legal">Legal</option>
                      <option value="marketing">Marketing</option>
                      <option value="other">Other</option>
                    </select>
                    <input value={newExpense.vendor} onChange={e => setNewExpense({ ...newExpense, vendor: e.target.value })} placeholder="Vendor (e.g. Supabase, Vercel)" style={inputStyle} />
                    <input value={newExpense.description} onChange={e => setNewExpense({ ...newExpense, description: e.target.value })} placeholder="Description" style={inputStyle} />
                    <input type="number" value={newExpense.amount} onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })} placeholder="Amount (KES)" style={inputStyle} />
                    <button onClick={handleCreateExpense} className={s.btnGold} style={{ marginTop: "4px" }}>Add Expense</button>
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {expenses.length === 0 && (
                    <div style={{ fontSize: "13px", color: "var(--text-muted)", textAlign: "center", padding: "24px 0" }}>
                      No expenses logged yet.
                    </div>
                  )}
                  {expenses.map(e => (
                    <div key={e.id} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                          <span style={{ fontSize: "13px", fontWeight: 600 }}>{e.description}</span>
                          <span style={{ fontSize: "9px", color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: "4px", padding: "1px 6px", textTransform: "capitalize" }}>{e.category}</span>
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                          {new Date(e.date).toLocaleDateString("en-KE")}{e.vendor ? ` · ${e.vendor}` : ""}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
                        <span style={{ fontSize: "14px", fontWeight: 700 }}>{e.currency} {e.amount.toLocaleString()}</span>
                        <button onClick={() => handleDeleteExpense(e.id)} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "11px", cursor: "pointer", fontFamily: "inherit" }}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {section === "automation" && (
              <>
                <div>
                  <h2 style={{ fontSize: "18px", fontWeight: 700 }}>Automation</h2>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>Turn any expense or platform invoice into a recurring schedule</p>
                </div>

                <div style={{ display: "flex", gap: "4px" }}>
                  {(["invoices", "expenses"] as const).map(t => (
                    <button key={t} onClick={() => setAutomationTab(t)} style={{
                      flex: 1, padding: "8px", borderRadius: "8px", border: "1px solid var(--border)",
                      background: automationTab === t ? "var(--gold)" : "var(--bg-card)",
                      color: automationTab === t ? "#0a0a0f" : "var(--text-secondary)",
                      fontSize: "12px", fontWeight: automationTab === t ? 700 : 400,
                      cursor: "pointer", fontFamily: "inherit",
                    }}>
                      {t === "invoices" ? "Platform Invoices" : "Company Expenses"}
                    </button>
                  ))}
                </div>

                {scheduleTarget && (
                  <div style={{ background: "var(--bg-card)", border: "1px solid var(--gold)", borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div style={{ fontSize: "13px", fontWeight: 600 }}>
                      Schedule this {scheduleTarget.type === "invoice" ? "invoice" : "expense"}
                    </div>
                    <select value={scheduleFrequency} onChange={e => setScheduleFrequency(e.target.value as ScheduleFrequency)} style={inputStyle}>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="annual">Annual</option>
                    </select>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button onClick={confirmSchedule} disabled={schedulingBusy} className={s.btnGold} style={{ width: "auto", padding: "8px 16px" }}>
                        {schedulingBusy ? "Saving..." : "Confirm Schedule"}
                      </button>
                      <button onClick={() => setScheduleTarget(null)} className={s.btnGhost} style={{ width: "auto", padding: "8px 16px" }}>Cancel</button>
                    </div>
                  </div>
                )}

                {automationTab === "invoices" && (
                  <>
                    <div>
                      <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--gold)", marginBottom: "10px" }}>ACTIVE SCHEDULES</div>
                      {scheduledPlatformInvoices.length === 0 ? (
                        <div style={{ fontSize: "13px", color: "var(--text-muted)", textAlign: "center", padding: "20px 0" }}>No recurring platform invoices yet.</div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          {scheduledPlatformInvoices.map(sv => (
                            <div key={sv.id} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "10px", padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", opacity: sv.active ? 1 : 0.5 }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: "13px", fontWeight: 600 }}>{sv.org_name}</div>
                                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                                  KES {sv.amount.toLocaleString()} · {sv.frequency} · Next: {new Date(sv.next_run).toLocaleDateString("en-KE")}
                                </div>
                              </div>
                              <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                                <button onClick={() => handleToggleInvoiceSchedule(sv)} style={{ fontSize: "10px", padding: "5px 10px", borderRadius: "6px", border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", cursor: "pointer", fontFamily: "inherit" }}>
                                  {sv.active ? "Pause" : "Resume"}
                                </button>
                                <button onClick={() => handleDeleteInvoiceSchedule(sv.id)} style={{ fontSize: "10px", padding: "5px 10px", borderRadius: "6px", border: "none", background: "transparent", color: "#ef4444", cursor: "pointer", fontFamily: "inherit" }}>
                                  Delete
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", marginBottom: "10px" }}>PICK AN INVOICE TO SCHEDULE</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {platformInvoices.slice(0, 20).map(inv => (
                          <div key={inv.id} style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "10px", padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: "13px", fontWeight: 600 }}>{inv.org_name}</div>
                              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{inv.amount} · {inv.description}</div>
                            </div>
                            <button
                              onClick={() => { setScheduleTarget({ type: "invoice", item: inv }); setScheduleFrequency("monthly"); }}
                              style={{ fontSize: "10px", padding: "6px 12px", borderRadius: "6px", border: "1px solid var(--gold)", background: "transparent", color: "var(--gold)", cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}
                            >
                              + Schedule
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {automationTab === "expenses" && (
                  <>
                    <div>
                      <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--gold)", marginBottom: "10px" }}>ACTIVE SCHEDULES</div>
                      {scheduledExpenses.length === 0 ? (
                        <div style={{ fontSize: "13px", color: "var(--text-muted)", textAlign: "center", padding: "20px 0" }}>No recurring expenses yet.</div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          {scheduledExpenses.map(se => (
                            <div key={se.id} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "10px", padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", opacity: se.active ? 1 : 0.5 }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: "13px", fontWeight: 600 }}>{se.description}</div>
                                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                                  {se.currency} {se.amount.toLocaleString()} · {se.frequency} · Next: {new Date(se.next_run).toLocaleDateString("en-KE")}
                                </div>
                              </div>
                              <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                                <button onClick={() => handleToggleExpenseSchedule(se)} style={{ fontSize: "10px", padding: "5px 10px", borderRadius: "6px", border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", cursor: "pointer", fontFamily: "inherit" }}>
                                  {se.active ? "Pause" : "Resume"}
                                </button>
                                <button onClick={() => handleDeleteExpenseSchedule(se.id)} style={{ fontSize: "10px", padding: "5px 10px", borderRadius: "6px", border: "none", background: "transparent", color: "#ef4444", cursor: "pointer", fontFamily: "inherit" }}>
                                  Delete
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", marginBottom: "10px" }}>PICK AN EXPENSE TO SCHEDULE</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {expenses.slice(0, 20).map(exp => (
                          <div key={exp.id} style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "10px", padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: "13px", fontWeight: 600 }}>{exp.description}</div>
                              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{exp.currency} {exp.amount.toLocaleString()}{exp.vendor ? ` · ${exp.vendor}` : ""}</div>
                            </div>
                            <button
                              onClick={() => { setScheduleTarget({ type: "expense", item: exp }); setScheduleFrequency("monthly"); }}
                              style={{ fontSize: "10px", padding: "6px 12px", borderRadius: "6px", border: "1px solid var(--gold)", background: "transparent", color: "var(--gold)", cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}
                            >
                              + Schedule
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}