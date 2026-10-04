"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getOrganizations, updateOrganization, deleteOrganization, planLabel, type Organization } from "@/lib/organizations";
import { logActivity } from "@/lib/activity";
import { createClient } from "@/lib/supabase";
import { formatError } from "@/lib/errorFormat";
import ErrorBanner from "@/components/ErrorBanner";
import DashboardDrawer, { DrawerFieldList } from "@/components/DashboardDrawer";
import { getEngines, getOrgEngines, activateEngine, deactivateEngine, type Engine, type OrgEngine } from "@/lib/engines";
import f from "@/styles/founder.module.css";

const statusVar: Record<string, string> = {
  operational: "var(--green)",
  warning: "var(--amber)",
  critical: "var(--red)",
};

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [drawerTab, setDrawerTab] = useState("overview");
  const [editData, setEditData] = useState<Partial<Organization>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [allEngines, setAllEngines] = useState<Engine[]>([]);
  const [orgEngines, setOrgEngines] = useState<OrgEngine[]>([]);
  const [engineBusy, setEngineBusy] = useState<string | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    load();
    const supabase = createClient();
    const channel = supabase
      .channel("orgs-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "organizations" }, () => {
        getOrganizations().then(setOrgs).catch((err) => setError(formatError(err)));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [orgsData, enginesData] = await Promise.all([getOrganizations(), getEngines()]);
      setOrgs(orgsData);
      setAllEngines(enginesData);
    } catch (err) {
      setError(formatError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const highlightId = searchParams.get("highlight");
    if (highlightId && orgs.length > 0) {
      const match = orgs.find(o => o.id === highlightId);
      if (match) {
        setSelectedOrg(match);
        setDrawerTab("overview");
      }
    }
  }, [orgs, searchParams]);

  useEffect(() => {
    if (!selectedOrg) { setOrgEngines([]); return; }
    getOrgEngines(selectedOrg.id).then(setOrgEngines).catch(err => setActionError(formatError(err)));
  }, [selectedOrg?.id]);

  const filtered = orgs.filter(o => {
    const q = search.toLowerCase();
    const matchSearch = o.name.toLowerCase().includes(q) || o.location.toLowerCase().includes(q);
    return matchSearch && (statusFilter === "all" || o.status === statusFilter);
  });

  const openOrg = (org: Organization) => {
    setSelectedOrg(org);
    setDrawerTab("overview");
    setEditData({});
    setActionError(null);
    setConfirmDelete(false);
  };

  const handleToggleEngine = async (engine: Engine) => {
    if (!selectedOrg) return;
    setEngineBusy(engine.id);
    setActionError(null);
    const isEnabled = orgEngines.find(oe => oe.engine_id === engine.id)?.enabled ?? false;
    try {
      if (isEnabled) await deactivateEngine(selectedOrg.id, engine.id);
      else await activateEngine(selectedOrg.id, engine.id, "founder");
      setOrgEngines(await getOrgEngines(selectedOrg.id));
    } catch (err) {
      setActionError(formatError(err));
    } finally {
      setEngineBusy(null);
    }
  };

  const handleUpdate = async () => {
    if (!selectedOrg) return;
    setActionError(null);
    try {
      const updated = await updateOrganization(selectedOrg.id, editData);
      await logActivity({ icon: "✏️", title: "Organization updated", sub: updated.name });
      setSelectedOrg(updated);
      setEditData({});
    } catch (err) {
      setActionError(formatError(err));
    }
  };

  const handleDelete = async () => {
    if (!selectedOrg) return;
    setActionError(null);
    try {
      await deleteOrganization(selectedOrg.id);
      await logActivity({ icon: "🗑️", title: "Organization removed", sub: selectedOrg.name });
      setSelectedOrg(null);
      setConfirmDelete(false);
    } catch (err) {
      setActionError(formatError(err));
    }
  };

  const running = orgs.filter(o => o.status === "operational").length;

  return (
    <div className={`page-shell ${f.root}`}>
      <main className={selectedOrg ? "page-main-drawer" : "page-main"}>
        <div className={f.page}>
          <div className={f.top}>
            <div>
              <p className={f.greeting}>Organizations</p>
              <h1 className={f.headline}>
                {loading ? "Loading organizations" : orgs.length === 0 ? "No organizations yet." : `${orgs.length} ${orgs.length === 1 ? "organization" : "organizations"}, ${running} running.`}
              </h1>
            </div>
          </div>

          <div className={f.toolbar}>
            <input
              className={`${f.input} ${f.search}`}
              type="search"
              aria-label="Search organizations"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or location"
            />
            <div className={f.segmented} role="group" aria-label="Filter by status">
              {["all", "operational", "warning", "critical"].map(s => (
                <button key={s} className={f.segBtn} aria-pressed={statusFilter === s} onClick={() => setStatusFilter(s)} style={{ textTransform: "capitalize" }}>{s}</button>
              ))}
            </div>
          </div>

          {error && <ErrorBanner message={error} source="dashboard/organizations" onRetry={load} />}

          {loading ? (
            <p className={f.status} role="status">Loading organizations…</p>
          ) : filtered.length === 0 ? (
            <div className={f.empty}>
              <strong>{orgs.length === 0 ? "No organizations yet." : "No organizations match."}</strong>
              {orgs.length === 0 ? "Organizations appear here as people register." : "Try a different search or status filter."}
            </div>
          ) : (
            <div className={f.tableWrap}>
              <table className={f.ledger}>
                <thead>
                  <tr><th>Organization</th><th>Location</th><th>Plan</th><th>Revenue</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {filtered.map(org => (
                    <tr key={org.id} className={`${f.clickable} ${selectedOrg?.id === org.id ? f.selected : ""}`} onClick={() => openOrg(org)}>
                      <td><button className={f.cellBtn} onClick={e => { e.stopPropagation(); openOrg(org); }}>{org.name}</button></td>
                      <td className={f.cellMuted}>{org.location}</td>
                      <td className={f.cellMuted} style={{ textTransform: "capitalize" }}>{planLabel(org)}</td>
                      <td className={f.cellMuted}>{org.revenue}</td>
                      <td><span className={f.pill} data-status={org.status}>{org.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {selectedOrg && (
        <DashboardDrawer
          title={selectedOrg.name}
          statusColor={statusVar[selectedOrg.status]}
          onClose={() => setSelectedOrg(null)}
          tabs={[{ id: "overview", label: "Overview" }, { id: "edit", label: "Edit" }, { id: "engines", label: "Engines" }, { id: "danger", label: "Delete" }]}
          activeTab={drawerTab}
          onTabChange={t => { setDrawerTab(t); setActionError(null); }}
        >
          {drawerTab === "overview" && (
            <DrawerFieldList
              items={[
                { label: "Location", value: selectedOrg.location },
                { label: "Plan", value: planLabel(selectedOrg) },
                { label: "Revenue", value: selectedOrg.revenue },
                { label: "Status", value: selectedOrg.status, accent: statusVar[selectedOrg.status] },
                { label: "Created", value: new Date(selectedOrg.created_at).toLocaleDateString("en-KE") },
              ]}
            />
          )}

          {drawerTab === "edit" && (
            <div className={f.stack}>
              {([
                { label: "Name", key: "name", value: selectedOrg.name },
                { label: "Location", key: "location", value: selectedOrg.location },
                { label: "Revenue", key: "revenue", value: selectedOrg.revenue },
              ] as const).map(field => (
                <div key={field.key} className={f.field}>
                  <label htmlFor={`org-${field.key}`}>{field.label}</label>
                  <input id={`org-${field.key}`} className={f.input} defaultValue={field.value} onChange={e => setEditData(prev => ({ ...prev, [field.key]: e.target.value }))} />
                </div>
              ))}
              <div className={f.field}>
                <label htmlFor="org-status">Status</label>
                <select id="org-status" className={f.input} defaultValue={selectedOrg.status} onChange={e => setEditData(prev => ({ ...prev, status: e.target.value as Organization["status"] }))}>
                  <option value="operational">Operational</option>
                  <option value="warning">Warning</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <button className={`${f.primary} ${f.block}`} onClick={handleUpdate}>Save changes</button>
              {actionError && <div className={f.formError} role="alert">{actionError}</div>}
            </div>
          )}

          {drawerTab === "engines" && (
            <div>
              <p className={f.hint}>Turn engines on or off for this organization. Changes here override the org's licenses, and no payment is involved. Use Licensing to manage seats and offers.</p>
              {allEngines.map(engine => {
                const enabled = orgEngines.find(oe => oe.engine_id === engine.id)?.enabled ?? false;
                return (
                  <div key={engine.id} className={f.switchRow}>
                    <div>
                      <div className={f.rowName}>{engine.name}</div>
                      <div className={f.rowSub}>{engine.category}</div>
                    </div>
                    <button
                      className={f.switch}
                      role="switch"
                      aria-checked={enabled}
                      aria-label={`${engine.name} for ${selectedOrg.name}`}
                      disabled={engineBusy === engine.id}
                      onClick={() => handleToggleEngine(engine)}
                    />
                  </div>
                );
              })}
              {actionError && <div className={f.formError} role="alert" style={{ marginTop: 12 }}>{actionError}</div>}
            </div>
          )}

          {drawerTab === "danger" && (
            <div className={f.dangerBox}>
              <h3>Delete organization</h3>
              <p className={f.hint} style={{ marginBottom: 14 }}>This permanently removes {selectedOrg.name} and all of its data. It can&apos;t be undone.</p>
              {!confirmDelete ? (
                <button className={f.dangerBtn} onClick={() => setConfirmDelete(true)}>Delete {selectedOrg.name}</button>
              ) : (
                <div className={f.rowActions}>
                  <button className={f.dangerSolid} onClick={handleDelete}>Yes, delete it</button>
                  <button className={f.secondary} style={{ flex: 1 }} onClick={() => setConfirmDelete(false)}>Cancel</button>
                </div>
              )}
              {actionError && <div className={f.formError} role="alert" style={{ marginTop: 12 }}>{actionError}</div>}
            </div>
          )}
        </DashboardDrawer>
      )}
    </div>
  );
}