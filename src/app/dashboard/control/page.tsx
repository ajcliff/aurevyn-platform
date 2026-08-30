"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { getOrganizations, type Organization } from "@/lib/organizations";
import { getPackages, type Package } from "@/lib/packages";
import { formatError } from "@/lib/errorFormat";
import ErrorBanner from "@/components/ErrorBanner";
import s from "@/styles/layout.module.css";
import SystemHealthSection from "@/components/SystemHealthSection";

type Section = "overview" | "packages" | "organizations" | "modules" | "health" | "danger";

export default function ControlPage() {
  const [section, setSection] = useState<Section>("overview");
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [limits, setLimits] = useState<any[]>([]);
  const [stats, setStats] = useState({ orgs: 0, invoices: 0, modules: 0, notifications: 0, movements: 0 });
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setPageLoading(true);
    setPageError(null);
    try {
      const supabase = createClient();

      const [orgData, packageData, limitsRes, invoiceRes, moduleRes, notifRes] = await Promise.all([
        getOrganizations(),
        getPackages(),
        supabase.from("package_module_limits").select("*").order("package_name"),
        supabase.from("invoices").select("*", { count: "exact", head: true }),
        supabase.from("modules").select("*", { count: "exact", head: true }),
        supabase.from("notifications").select("*", { count: "exact", head: true }),
      ]);

      if (limitsRes.error) throw limitsRes.error;
      if (invoiceRes.error) throw invoiceRes.error;
      if (moduleRes.error) throw moduleRes.error;
      if (notifRes.error) throw notifRes.error;

      setOrgs(orgData);
      setPackages(packageData);
      setLimits(limitsRes.data ?? []);
      setStats({
        orgs: orgData.length,
        invoices: invoiceRes.count ?? 0,
        modules: moduleRes.count ?? 0,
        notifications: notifRes.count ?? 0,
        movements: 0,
      });
    } catch (err) {
      setPageError(formatError(err));
    } finally {
      setPageLoading(false);
    }
  };

  const notify = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 3000);
  };

  const handleAssignPackage = async (orgId: string, packageName: string) => {
    setActionError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("organizations").update({ package: packageName }).eq("id", orgId);
      if (error) throw error;
      await loadData();
      notify(`Package updated successfully`);
    } catch (err) {
      setActionError(formatError(err));
    }
  };

  const handleUpdateOrgStatus = async (orgId: string, status: string) => {
    setActionError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("organizations").update({ status }).eq("id", orgId);
      if (error) throw error;
      await loadData();
      notify(`Organization status updated`);
    } catch (err) {
      setActionError(formatError(err));
    }
  };

  const handleToggleLimit = async (id: string, enabled: boolean) => {
    setActionError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("package_module_limits").update({ enabled: !enabled }).eq("id", id);
      if (error) throw error;
      await loadData();
      notify(`Module limit updated`);
    } catch (err) {
      setActionError(formatError(err));
    }
  };

  const handleUpdateLimit = async (id: string, field: string, value: string) => {
    setActionError(null);
    try {
      const supabase = createClient();
      const numVal = value === "-1" || value === "" ? -1 : parseInt(value) || 0;
      const { error } = await supabase.from("package_module_limits").update({ [field]: numVal }).eq("id", id);
      if (error) throw error;
      notify(`Limit updated`);
    } catch (err) {
      setActionError(formatError(err));
    }
  };

  const handleWipeTable = async (table: string) => {
    setActionError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;
      await loadData();
      notify(`${table} wiped successfully`);
    } catch (err) {
      setActionError(formatError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleWipeAll = async () => {
    setActionError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const tables = ["inventory_movements", "inventory_products", "notifications", "activity", "invoices", "organizations"];
      for (const table of tables) {
        const { error } = await supabase.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
        if (error) throw error;
      }
      await loadData();
      notify("Platform reset complete");
    } catch (err) {
      setActionError(formatError(err));
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    padding: "6px 10px", borderRadius: "6px",
    border: "1px solid var(--border)", background: "var(--bg-base)",
    color: "var(--text-primary)", fontSize: "11px", outline: "none",
    fontFamily: "inherit", width: "100%",
  };

  const packageColors: Record<string, string> = {
    core: "#3dd68c", growth: "#c9a84c",
    professional: "#a78bfa", enterprise: "#38bdf8",
  };

  const navItems: { id: Section; label: string; icon: string }[] = [
    { id: "overview", label: "Overview", icon: "⊞" },
    { id: "packages", label: "Packages & Limits", icon: "📦" },
    { id: "organizations", label: "Organizations", icon: "🏢" },
    { id: "modules", label: "Module Access", icon: "⬡" },
    { id: "health", label: "System Health", icon: "⚡" },
    { id: "danger", label: "Danger Zone", icon: "⚠" },
  ];

  return (
    <div className="page-shell">
    
      <div className={s.body}>
        
        
        <main className={s.settingsMain}>

          {/* Left nav */}
          <div style={{ width: "200px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "4px" }}>
            <div style={{ fontSize: "11px", color: "var(--gold)", marginBottom: "8px", letterSpacing: "0.08em", fontWeight: 700 }}>
              ⚡ CONTROL CENTER
            </div>
            {navItems.map(item => (
              <button key={item.id} onClick={() => setSection(item.id)} style={{
                padding: "9px 14px", borderRadius: "8px", border: "none",
                background: section === item.id ? "var(--bg-elevated)" : "transparent",
                color: section === item.id
                  ? item.id === "danger" ? "#ef4444" : "var(--gold)"
                  : item.id === "danger" ? "#ef444480" : "var(--text-secondary)",
                fontSize: "12px", cursor: "pointer", textAlign: "left",
                fontWeight: section === item.id ? 600 : 400,
                borderLeft: section === item.id
                  ? `2px solid ${item.id === "danger" ? "#ef4444" : "var(--gold)"}`
                  : "2px solid transparent",
                transition: "all 0.15s ease", fontFamily: "inherit",
                display: "flex", alignItems: "center", gap: "8px",
              }}>
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}

            {message && (
              <div style={{
                marginTop: "16px", padding: "10px 12px", borderRadius: "8px",
                background: "rgba(61,214,140,0.1)", border: "1px solid rgba(61,214,140,0.3)",
                fontSize: "11px", color: "var(--green)",
              }}>
                ✓ {message}
              </div>
            )}
          </div>

          {/* Content */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "16px", overflowY: "auto", maxHeight: "calc(100vh - 80px)" }}>

            {pageError && (
              <ErrorBanner message={pageError} source="dashboard/control" onRetry={loadData} />
            )}

            {pageLoading ? (
              <div style={{ padding: 40, textAlign: "center", fontSize: 13, color: "var(--text-muted)" }}>
                Loading control center...
              </div>
            ) : (
            <>
            {/* OVERVIEW */}
            {section === "overview" && (
              <>
                <div>
                  <h2 style={{ fontSize: "18px", fontWeight: 700 }}>Founder Control Center</h2>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>Full platform control — no Supabase needed</p>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
                  {[
                    { label: "Organizations", value: stats.orgs, color: "var(--gold)", icon: "🏢" },
                    { label: "Invoices", value: stats.invoices, color: "#3dd68c", icon: "💳" },
                    { label: "Modules", value: stats.modules, color: "#a78bfa", icon: "⬡" },
                    { label: "Notifications", value: stats.notifications, color: "#f59e0b", icon: "🔔" },
                    { label: "Packages", value: packages.length, color: "#38bdf8", icon: "📦" },
                    { label: "Limits Defined", value: limits.length, color: "#3dd68c", icon: "⚙" },
                  ].map((s, i) => (
                    <div key={i} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{s.label}</span>
                        <span style={{ fontSize: "16px" }}>{s.icon}</span>
                      </div>
                      <div style={{ fontSize: "24px", fontWeight: 700, color: s.color }}>{s.value}</div>
                    </div>
                  ))}
                </div>

                <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px" }}>
                  <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: "12px" }}>Quick Actions</div>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {[
                      { label: "Manage Packages", action: () => setSection("packages") },
                      { label: "Manage Orgs", action: () => setSection("organizations") },
                      { label: "Module Access", action: () => setSection("modules") },
                      { label: "Danger Zone", action: () => setSection("danger") },
                    ].map((a, i) => (
                      <button key={i} onClick={a.action} className={s.btnGold} style={{ fontSize: "11px", padding: "7px 14px" }}>
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* PACKAGES & LIMITS */}
            {section === "packages" && (
              <>
                <div>
                  <h2 style={{ fontSize: "18px", fontWeight: 700 }}>Packages & Limits</h2>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>Define what each package unlocks</p>
                </div>

                {["core", "growth", "professional", "enterprise"].map(pkgName => {
                  const pkg = packages.find(p => p.name === pkgName);
                  const pkgLimits = limits.filter(l => l.package_name === pkgName);
                  const color = packageColors[pkgName] ?? "var(--gold)";
                  return (
                    <div key={pkgName} style={{ background: "var(--bg-card)", border: `1px solid ${color}30`, borderRadius: "12px", overflow: "hidden" }}>
                      <div style={{ padding: "14px 16px", background: `${color}10`, borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span style={{ fontSize: "14px", fontWeight: 700, color }}>{pkgName}</span>
                          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{pkg?.price ?? "—"}</span>
                        </div>
                        <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{pkg?.orgs ?? 0} orgs</span>
                      </div>
                      <div style={{ padding: "12px 16px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr", gap: "8px", marginBottom: "8px" }}>
                          {["Module", "Enabled", "Max Users", "Max Records", "Max Branches", "AI"].map(h => (
                            <span key={h} style={{ fontSize: "9px", color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.05em" }}>{h}</span>
                          ))}
                        </div>
                        {pkgLimits.map(limit => (
                          <div key={limit.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr", gap: "8px", padding: "6px 0", borderBottom: "1px solid var(--border)", alignItems: "center" }}>
                            <span style={{ fontSize: "11px", color: "var(--text-primary)" }}>{limit.module_name}</span>
                            <div onClick={() => handleToggleLimit(limit.id, limit.enabled)} style={{
                              width: "32px", height: "18px", borderRadius: "9px",
                              background: limit.enabled ? color : "var(--bg-elevated)",
                              border: "1px solid var(--border)", cursor: "pointer",
                              position: "relative", transition: "background 0.2s ease",
                            }}>
                              <div style={{ position: "absolute", top: "2px", left: limit.enabled ? "14px" : "2px", width: "12px", height: "12px", borderRadius: "50%", background: "#fff", transition: "left 0.2s ease" }} />
                            </div>
                            {["max_users", "max_records", "max_branches"].map(field => (
                              <input key={field} defaultValue={limit[field]} onBlur={e => handleUpdateLimit(limit.id, field, e.target.value)}
                                style={{ ...inputStyle, width: "60px" }} placeholder="-1=∞" />
                            ))}
                            <div onClick={async () => {
                              const supabase = createClient();
                              await supabase.from("package_module_limits").update({ ai_enabled: !limit.ai_enabled }).eq("id", limit.id);
                              await loadData();
                            }} style={{
                              width: "32px", height: "18px", borderRadius: "9px",
                              background: limit.ai_enabled ? "#a78bfa" : "var(--bg-elevated)",
                              border: "1px solid var(--border)", cursor: "pointer",
                              position: "relative", transition: "background 0.2s ease",
                            }}>
                              <div style={{ position: "absolute", top: "2px", left: limit.ai_enabled ? "14px" : "2px", width: "12px", height: "12px", borderRadius: "50%", background: "#fff", transition: "left 0.2s ease" }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {/* ORGANIZATIONS */}
            {section === "organizations" && (
              <>
                <div>
                  <h2 style={{ fontSize: "18px", fontWeight: 700 }}>Organizations</h2>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>Assign packages and manage org status</p>
                </div>
              <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden", overflowY: "auto", maxHeight: "calc(100vh - 220px)" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", padding: "10px 16px", borderBottom: "1px solid var(--border)", background: "var(--bg-elevated)" }}>
                    {["Organization", "Package", "Status", "Actions"].map(h => (
                      <span key={h} style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.05em" }}>{h}</span>
                    ))}
                  </div>
                  {orgs.map((org, i) => (
                    <div key={org.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", padding: "12px 16px", borderBottom: i < orgs.length - 1 ? "1px solid var(--border)" : "none", alignItems: "center", gap: "8px" }}>
                      <div>
                        <div style={{ fontSize: "12px", fontWeight: 600 }}>{org.name}</div>
                        <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>{org.location}</div>
                      </div>
                      <select defaultValue={org.package} onChange={e => handleAssignPackage(org.id, e.target.value)} style={{ ...inputStyle, width: "auto" }}>
                        {["core", "growth", "professional", "enterprise"].map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                      <select defaultValue={org.status} onChange={e => handleUpdateOrgStatus(org.id, e.target.value)} style={{ ...inputStyle, width: "auto" }}>
                        {["operational", "warning", "critical"].map(st => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                      <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>{org.revenue}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* MODULE ACCESS */}
            {section === "modules" && (
              <>
                <div>
                  <h2 style={{ fontSize: "18px", fontWeight: 700 }}>Module Access</h2>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>See which modules each package unlocks</p>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "var(--bg-elevated)" }}>
                        <th style={{ padding: "10px 16px", textAlign: "left", fontSize: "10px", color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.05em" }}>MODULE</th>
                        {["core", "growth", "professional", "enterprise"].map(p => (
                          <th key={p} style={{ padding: "10px 16px", textAlign: "center", fontSize: "10px", color: packageColors[p], fontWeight: 600, letterSpacing: "0.05em" }}>{p.toUpperCase()}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {["Point of Sale", "Inventory Management", "HR & Payroll", "CRM", "Analytics", "AI Insights"].map((mod, i) => (
                        <tr key={mod} style={{ borderBottom: "1px solid var(--border)", background: i % 2 === 0 ? "var(--bg-card)" : "transparent" }}>
                          <td style={{ padding: "10px 16px", fontSize: "12px", fontWeight: 600 }}>{mod}</td>
                          {["core", "growth", "professional", "enterprise"].map(pkg => {
                            const limit = limits.find(l => l.package_name === pkg && l.module_name === mod);
                            return (
                              <td key={pkg} style={{ padding: "10px 16px", textAlign: "center" }}>
                                {limit?.enabled
                                  ? <span style={{ color: packageColors[pkg], fontSize: "14px" }}>✓</span>
                                  : <span style={{ color: "var(--text-muted)", fontSize: "14px" }}>—</span>
                                }
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* SYSTEM HEALTH */}
{section === "health" && (
  <>
    <div>
      <h2 style={{ fontSize: "18px", fontWeight: 700 }}>System Health</h2>
      <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>Live service status across the platform</p>
    </div>
    <SystemHealthSection />
  </>
)}

            {/* DANGER ZONE */}
            {section === "danger" && (
              <>
                <div>
                  <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#ef4444" }}>Danger Zone</h2>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>Irreversible actions — no confirmation dialogs, use with caution</p>
                </div>

                {[
                  { label: "Wipe All Notifications", table: "notifications", color: "#f59e0b", desc: "Clear all notification history" },
                  { label: "Wipe All Activity Logs", table: "activity", color: "#f59e0b", desc: "Clear all activity feed entries" },
                  { label: "Wipe All Invoices", table: "invoices", color: "#ef4444", desc: "Delete all invoice records" },
                  { label: "Wipe All Organizations", table: "organizations", color: "#ef4444", desc: "Remove all orgs from the platform" },
                ].map((item, i) => (
                  <div key={i} style={{ background: "var(--bg-card)", border: `1px solid ${item.color}30`, borderRadius: "12px", padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px" }}>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: item.color }}>{item.label}</div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>{item.desc}</div>
                    </div>
                    <button
                      onClick={() => handleWipeTable(item.table)}
                      disabled={loading}
                      style={{ padding: "8px 16px", borderRadius: "8px", border: `1px solid ${item.color}60`, background: "transparent", color: item.color, fontSize: "12px", cursor: loading ? "not-allowed" : "pointer", whiteSpace: "nowrap", flexShrink: 0, fontFamily: "inherit" }}
                    >
                      {loading ? "Working..." : "Wipe"}
                    </button>
                  </div>
                ))}

                <div style={{ background: "var(--bg-card)", border: "1px solid #ef444460", borderRadius: "12px", padding: "16px" }}>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#ef4444", marginBottom: "4px" }}>⚠ Full Platform Reset</div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "12px" }}>
                    Wipes organizations, invoices, activity, notifications and inventory. Packages and module limits are preserved. Use this to start fresh before going live.
                  </div>
                  <button onClick={handleWipeAll} disabled={loading} style={{ padding: "10px 20px", borderRadius: "8px", border: "none", background: "#ef4444", color: "#fff", fontSize: "12px", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
                    {loading ? "Resetting..." : "Reset Entire Platform"}
                  </button>
                </div>

                {actionError && (
                  <div style={{ fontSize: 12, color: "#ef4444", background: "#ef44441a", border: "1px solid #ef444440", borderRadius: 8, padding: "10px 12px" }}>
                    {actionError}
                  </div>
                )}
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