"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { getOrganizations, type Organization } from "@/lib/organizations";
import { getPackages, type Package } from "@/lib/packages";
import { formatError } from "@/lib/errorFormat";
import ErrorBanner from "@/components/ErrorBanner";
import ConfirmDialog from "@/components/founder/ConfirmDialog";
import TypedConfirmDialog from "@/components/founder/TypedConfirmDialog";
import SystemHealthSection from "@/components/SystemHealthSection";
import f from "@/styles/founder.module.css";

type Section = "overview" | "packages" | "organizations" | "modules" | "health" | "danger";
type ModuleLimit = {
  id: string;
  package_name: string;
  module_name: string;
  enabled: boolean;
  ai_enabled: boolean;
  max_users: number;
  max_records: number;
  max_branches: number;
};

const TABS: { id: Section; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "packages", label: "Packages & limits" },
  { id: "organizations", label: "Organizations" },
  { id: "modules", label: "Module access" },
  { id: "health", label: "System health" },
  { id: "danger", label: "Danger zone" },
];

const MODULES = ["Point of Sale", "Inventory Management", "HR & Payroll", "CRM", "Analytics", "AI Insights"];
const kes = (n: number) => `KES ${Math.round(n).toLocaleString("en-KE")}`;

export default function ControlPage() {
  const [section, setSection] = useState<Section>("overview");
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [limits, setLimits] = useState<ModuleLimit[]>([]);
  const [stats, setStats] = useState({ orgs: 0, invoices: 0, modules: 0, notifications: 0, movements: 0 });
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [confirmWipe, setConfirmWipe] = useState<{ table: string; label: string } | null>(null);
  const [confirmWipeAll, setConfirmWipeAll] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setPageLoading(true);
    setPageError(null);
    try {
      const supabase = createClient();
      const [orgData, packageData, limitsRes, invoiceRes, moduleRes, notifRes, movementRes] = await Promise.all([
        getOrganizations(),
        getPackages(),
        supabase.from("package_module_limits").select("*").order("package_name"),
        supabase.from("invoices").select("*", { count: "exact", head: true }),
        supabase.from("modules").select("*", { count: "exact", head: true }),
        supabase.from("notifications").select("*", { count: "exact", head: true }),
        supabase.from("inventory_movements").select("*", { count: "exact", head: true }),
      ]);

      if (limitsRes.error) throw limitsRes.error;
      if (invoiceRes.error) throw invoiceRes.error;
      if (moduleRes.error) throw moduleRes.error;
      if (notifRes.error) throw notifRes.error;
      if (movementRes.error) throw movementRes.error;

      setOrgs(orgData);
      setPackages(packageData);
      setLimits((limitsRes.data ?? []) as ModuleLimit[]);
      setStats({
        orgs: orgData.length,
        invoices: invoiceRes.count ?? 0,
        modules: moduleRes.count ?? 0,
        notifications: notifRes.count ?? 0,
        movements: movementRes.count ?? 0,
      });
    } catch (err) {
      setPageError(formatError(err));
    } finally {
      setPageLoading(false);
    }
  }

  function notify(msg: string) {
    setMessage(msg);
    setTimeout(() => setMessage(""), 3000);
  }

  async function handleAssignPackage(orgId: string, packageName: string) {
    setActionError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("organizations").update({ package: packageName }).eq("id", orgId);
      if (error) throw error;
      setOrgs(prev => prev.map(o => o.id === orgId ? { ...o, package: packageName } : o));
      notify("Package updated.");
    } catch (err) {
      setActionError(formatError(err));
    }
  }

  async function handleUpdateOrgStatus(orgId: string, status: string) {
    setActionError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("organizations").update({ status }).eq("id", orgId);
      if (error) throw error;
      setOrgs(prev => prev.map(o => o.id === orgId ? { ...o, status: status as Organization["status"] } : o));
      notify("Status updated.");
    } catch (err) {
      setActionError(formatError(err));
    }
  }

  async function handleToggleLimit(limit: ModuleLimit) {
    setActionError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("package_module_limits").update({ enabled: !limit.enabled }).eq("id", limit.id);
      if (error) throw error;
      setLimits(prev => prev.map(l => l.id === limit.id ? { ...l, enabled: !limit.enabled } : l));
    } catch (err) {
      setActionError(formatError(err));
    }
  }

  async function handleToggleAi(limit: ModuleLimit) {
    setActionError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("package_module_limits").update({ ai_enabled: !limit.ai_enabled }).eq("id", limit.id);
      if (error) throw error;
      setLimits(prev => prev.map(l => l.id === limit.id ? { ...l, ai_enabled: !limit.ai_enabled } : l));
    } catch (err) {
      setActionError(formatError(err));
    }
  }

  async function handleUpdateLimitField(limit: ModuleLimit, field: "max_users" | "max_records" | "max_branches", value: string) {
    setActionError(null);
    const numVal = value === "-1" || value.trim() === "" ? -1 : parseInt(value, 10) || 0;
    try {
      const supabase = createClient();
      const { error } = await supabase.from("package_module_limits").update({ [field]: numVal }).eq("id", limit.id);
      if (error) throw error;
      setLimits(prev => prev.map(l => l.id === limit.id ? { ...l, [field]: numVal } : l));
      notify("Limit updated.");
    } catch (err) {
      setActionError(formatError(err));
    }
  }

  async function handleWipeTable(table: string) {
    setActionError(null);
    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;
      await loadData();
      notify(`${table} wiped.`);
    } catch (err) {
      setActionError(formatError(err));
    } finally {
      setBusy(false);
      setConfirmWipe(null);
    }
  }

  async function handleWipeAll() {
    setActionError(null);
    setBusy(true);
    try {
      const supabase = createClient();
      const tables = ["inventory_movements", "inventory_products", "notifications", "activity", "invoices", "organizations"];
      for (const table of tables) {
        const { error } = await supabase.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
        if (error) throw error;
      }
      await loadData();
      notify("Platform reset complete.");
    } catch (err) {
      setActionError(formatError(err));
    } finally {
      setBusy(false);
      setConfirmWipeAll(false);
    }
  }

  const wipeItems = [
    { label: "Wipe all notifications", table: "notifications", desc: "Clears all notification history.", tone: "warn" as const },
    { label: "Wipe all activity logs", table: "activity", desc: "Clears every entry in the platform activity feed.", tone: "warn" as const },
    { label: "Wipe all invoices", table: "invoices", desc: "Deletes every invoice record on the platform.", tone: "bad" as const },
    { label: "Wipe all organizations", table: "organizations", desc: "Removes every organization from the platform.", tone: "bad" as const },
  ];

  return (
    <div className={`page-shell ${f.root}`}>
      <main className="page-main">
        <div className={f.page}>
          <div className={f.top}>
            <div>
              <p className={f.greeting}>Control center</p>
              <h1 className={f.headline}>{pageLoading ? "Loading control center" : "Platform-wide settings and safeguards."}</h1>
            </div>
            {message && <span style={{ fontSize: 12, color: "var(--green)" }}>✓ {message}</span>}
          </div>

          {pageError && <ErrorBanner message={pageError} source="dashboard/control" onRetry={loadData} />}

          <div className={f.tabs} role="tablist" aria-label="Control center sections">
            {TABS.map(t => (
              <button key={t.id} role="tab" id={`ctl-tab-${t.id}`} aria-selected={section === t.id} aria-controls="ctl-panel" className={f.tab} onClick={() => setSection(t.id)} style={t.id === "danger" ? { color: section === t.id ? "var(--red)" : undefined } : undefined}>
                {t.label}
              </button>
            ))}
          </div>

          <div id="ctl-panel" role="tabpanel" aria-labelledby={`ctl-tab-${section}`} className={f.tabPanel} style={{ paddingTop: 8 }}>
            {pageLoading ? (
              <p className={f.status} role="status">Loading control center…</p>
            ) : (
              <>
                {section === "overview" && (
                  <div className={f.stack}>
                    <div className={f.statGrid}>
                      {[
                        { label: "Organizations", value: stats.orgs },
                        { label: "Invoices", value: stats.invoices },
                        { label: "Modules", value: stats.modules },
                        { label: "Notifications", value: stats.notifications },
                        { label: "Inventory movements", value: stats.movements },
                        { label: "Packages", value: packages.length },
                        { label: "Limits defined", value: limits.length },
                      ].map((s, i) => (
                        <div key={i} className={f.stat}>
                          <div className={f.statTop}><span className={f.statLabel}>{s.label}</span></div>
                          <div className={f.statValue}>{s.value}</div>
                        </div>
                      ))}
                    </div>

                    <div>
                      <div className={f.sectionSub} style={{ marginBottom: 10 }}>Quick actions</div>
                      <div className={f.actions}>
                        <button className={f.secondary} onClick={() => setSection("packages")}>Manage packages</button>
                        <button className={f.secondary} onClick={() => setSection("organizations")}>Manage orgs</button>
                        <button className={f.secondary} onClick={() => setSection("modules")}>Module access</button>
                        <button className={f.secondary} style={{ color: "var(--red)" }} onClick={() => setSection("danger")}>Danger zone</button>
                      </div>
                    </div>
                  </div>
                )}

                {section === "packages" && (
                  packages.length === 0 ? (
                    <div className={f.empty}><strong>No packages yet.</strong>Create one from Quick actions or the Packages page.</div>
                  ) : (
                    <div className={f.stack}>
                      {packages.map(pkg => {
                        const key = pkg.name.toLowerCase();
                        const pkgLimits = limits.filter(l => l.package_name === key);
                        return (
                          <div key={pkg.id} style={{ border: "1px solid var(--rule-strong)", borderRadius: 12, overflow: "hidden" }}>
                            <div style={{ padding: "14px 16px", background: "var(--tint)", borderBottom: "1px solid var(--rule)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <span style={{ fontSize: 14, fontWeight: 700, textTransform: "capitalize" }}>{pkg.name}</span>
                                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{kes(pkg.price)}/mo</span>
                              </div>
                              <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{pkg.orgs} orgs</span>
                            </div>
                            {pkgLimits.length === 0 ? (
                              <div className={f.empty} style={{ padding: 16 }}>No module limits defined for this package yet.</div>
                            ) : (
                              <div style={{ padding: "8px 16px" }}>
                                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr", gap: 8, padding: "8px 0", fontSize: 10, color: "var(--text-secondary)", fontWeight: 600, letterSpacing: "0.04em" }}>
                                  <span>MODULE</span><span>ENABLED</span><span>MAX USERS</span><span>MAX RECORDS</span><span>MAX BRANCHES</span><span>AI</span>
                                </div>
                                {pkgLimits.map(limit => (
                                  <div key={limit.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr", gap: 8, padding: "8px 0", borderTop: "1px solid var(--rule)", alignItems: "center" }}>
                                    <span style={{ fontSize: 12 }}>{limit.module_name}</span>
                                    <button className={f.switch} role="switch" aria-checked={limit.enabled} aria-label={`${limit.module_name} enabled for ${pkg.name}`} onClick={() => handleToggleLimit(limit)} />
                                    {(["max_users", "max_records", "max_branches"] as const).map(field => (
                                      <input key={field} className={`${f.input} ${f.selectSm}`} defaultValue={limit[field]} onBlur={e => handleUpdateLimitField(limit, field, e.target.value)} placeholder="-1=∞" style={{ width: 64 }} />
                                    ))}
                                    <button className={f.switch} role="switch" aria-checked={limit.ai_enabled} aria-label={`AI for ${limit.module_name} on ${pkg.name}`} onClick={() => handleToggleAi(limit)} />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )
                )}

                {section === "organizations" && (
                  orgs.length === 0 ? (
                    <div className={f.empty}><strong>No organizations yet.</strong></div>
                  ) : (
                    <div className={f.tableWrap}>
                      <table className={f.ledger}>
                        <thead><tr><th>Organization</th><th>Package</th><th>Status</th><th>Revenue</th></tr></thead>
                        <tbody>
                          {orgs.map(org => (
                            <tr key={org.id}>
                              <td><div className={f.cellMain}>{org.name}</div><div className={f.cellSub}>{org.location}</div></td>
                              <td>
                                <select className={`${f.select} ${f.selectSm}`} defaultValue={org.package} onChange={e => handleAssignPackage(org.id, e.target.value)}>
                                  {packages.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                                </select>
                              </td>
                              <td>
                                <select className={`${f.select} ${f.selectSm}`} defaultValue={org.status} onChange={e => handleUpdateOrgStatus(org.id, e.target.value)}>
                                  <option value="operational">Operational</option>
                                  <option value="warning">Warning</option>
                                  <option value="critical">Critical</option>
                                </select>
                              </td>
                              <td className={f.cellMuted}>{org.revenue}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                )}

                {section === "modules" && (
                  packages.length === 0 ? (
                    <div className={f.empty}><strong>No packages yet.</strong>Module access compares packages against each other — create packages first.</div>
                  ) : (
                    <div className={f.tableWrap}>
                      <table className={f.ledger}>
                        <thead>
                          <tr>
                            <th>Module</th>
                            {packages.map(p => <th key={p.id} style={{ textTransform: "capitalize", textAlign: "center" }}>{p.name}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {MODULES.map(mod => (
                            <tr key={mod}>
                              <td className={f.cellMain}>{mod}</td>
                              {packages.map(p => {
                                const limit = limits.find(l => l.package_name === p.name.toLowerCase() && l.module_name === mod);
                                return (
                                  <td key={p.id} style={{ textAlign: "center" }}>
                                    {limit?.enabled ? <span className={f.check} role="img" aria-label="Included">✓</span> : <span className={f.dash} role="img" aria-label="Not included">—</span>}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                )}

                {section === "health" && <SystemHealthSection />}

                {section === "danger" && (
                  <div className={f.stack}>
                    <p className={f.hint} style={{ color: "var(--red)" }}>
                      Every action below permanently deletes data and asks you to confirm first — there is no undo after that.
                    </p>

                    {wipeItems.map(item => (
                      <div key={item.table} className={f.notice}>
                        <div className={f.noticeMain}>
                          <div className={f.noticeTitle} style={{ color: item.tone === "bad" ? "var(--red)" : "var(--amber)" }}>{item.label}</div>
                          <div className={f.noticeDesc}>{item.desc}</div>
                        </div>
                        <button className={f.dangerBtn} style={{ width: "auto" }} disabled={busy} onClick={() => setConfirmWipe({ table: item.table, label: item.label })}>
                          {busy ? "Working…" : "Wipe"}
                        </button>
                      </div>
                    ))}

                    <div style={{ border: "1px solid var(--red)", borderRadius: 12, padding: 16 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--red)", marginBottom: 4 }}>⚠ Full platform reset</div>
                      <div className={f.hint} style={{ marginBottom: 12 }}>
                        Wipes organizations, invoices, activity, notifications, and inventory. Packages and module limits are kept. Use this to start fresh before going live.
                      </div>
                      <button className={f.dangerSolid} style={{ flex: "none" }} disabled={busy} onClick={() => setConfirmWipeAll(true)}>
                        {busy ? "Resetting…" : "Reset entire platform"}
                      </button>
                    </div>

                    {actionError && <div className={f.formError} role="alert">{actionError}</div>}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {confirmWipe && (
        <ConfirmDialog
          title={confirmWipe.label + "?"}
          message={`Every row in "${confirmWipe.table}" will be permanently deleted. This can't be undone.`}
          confirmLabel={busy ? "Wiping…" : "Wipe"}
          onConfirm={() => handleWipeTable(confirmWipe.table)}
          onCancel={() => setConfirmWipe(null)}
        />
      )}

      {confirmWipeAll && (
        <TypedConfirmDialog
          title="Reset the entire platform?"
          message="Organizations, invoices, activity, notifications, and inventory will all be permanently deleted. Packages and module limits are kept. This can't be undone."
          phrase="RESET PLATFORM"
          confirmLabel={busy ? "Resetting…" : "Reset platform"}
          onConfirm={handleWipeAll}
          onCancel={() => setConfirmWipeAll(false)}
        />
      )}
    </div>
  );
}
