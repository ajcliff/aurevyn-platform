"use client";

import { useEffect, useState } from "react";
import { getOrganizations, updateOrganization, deleteOrganization, type Organization } from "@/lib/organizations";
import { getPackages, type Package } from "@/lib/packages";
import { logActivity } from "@/lib/activity";
import { createClient } from "@/lib/supabase";
import { formatError } from "@/lib/errorFormat";
import ErrorBanner from "@/components/ErrorBanner";
import s from "@/styles/layout.module.css";
import DashboardDrawer, { DrawerFieldList } from "@/components/DashboardDrawer";
import PageHeader from "@/components/PageHeader";
import { useSearchParams } from "next/navigation";

const dotColor: Record<string, string> = {
  operational: "#3dd68c",
  warning: "#f59e0b",
  critical: "#ef4444",
};

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [drawerTab, setDrawerTab] = useState("overview");
  const [editData, setEditData] = useState<Partial<Organization>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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
      const [orgsData, packagesData] = await Promise.all([getOrganizations(), getPackages()]);
      setOrgs(orgsData);
      setPackages(packagesData);
    } catch (err) {
      setError(formatError(err));
    } finally {
      setLoading(false);
    }
  }

  const searchParams = useSearchParams();

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

  const filtered = orgs.filter(o => {
    const matchSearch = o.name.toLowerCase().includes(search.toLowerCase()) ||
      o.location.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

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

  return (
    <div className="page-shell">
      <div className={s.body}>
    
     
        <main className={selectedOrg ? "page-main-drawer" : "page-main"}>
          {/* Header */}
<PageHeader
  title="Organizations"
  subtitle={`${orgs.length} total · ${orgs.filter(o => o.status === "operational").length} operational`}
/>
          {/* Filters */}
          <div className={s.filters}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search organizations..."
              className={s.input}
              style={{ width: "240px" }}
            />
            {["all", "operational", "warning", "critical"].map(f => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={statusFilter === f ? s.filterBtnActive : s.filterBtn}
              >
                {f}
              </button>
            ))}
          </div>

          {error && (
            <ErrorBanner message={error} source="dashboard/organizations" onRetry={load} />
          )}

          {loading ? (
            <div style={{ padding: 40, textAlign: "center", fontSize: 13, color: "var(--text-muted)" }}>
              Loading organizations...
            </div>
          ) : (
          <div className={s.table} style={{ overflowY: "auto", maxHeight: "calc(100vh - 280px)" }}>
            <div className={s.tableHeader} style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 1fr 1fr" }}>
              {["Organization", "Location", "Package", "Revenue", "Status"].map(h => (
                <span key={h} style={{ fontSize: "10px", color: "var(--text-muted)", letterSpacing: "0.05em", fontWeight: 600 }}>{h}</span>
              ))}
            </div>

            {filtered.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
                No organizations found
              </div>
            ) : filtered.map((org, i) => (
              <div
                key={org.id}
                className={s.tableRow}
                onClick={() => { setSelectedOrg(org); setDrawerTab("overview"); }}
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1.5fr 1fr 1fr 1fr",
                  borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none",
                  background: selectedOrg?.id === org.id ? "var(--bg-elevated)" : "transparent",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span className={s.dot} style={{ background: dotColor[org.status], boxShadow: `0 0 6px ${dotColor[org.status]}` }} />
                  <span style={{ fontSize: "13px", fontWeight: 600 }}>{org.name}</span>
                </div>
                <span style={{ fontSize: "12px", color: "var(--text-secondary)", alignSelf: "center" }}>{org.location}</span>
                <span style={{ fontSize: "12px", color: "var(--text-secondary)", alignSelf: "center" }}>{org.package}</span>
                <span style={{ fontSize: "12px", color: "var(--text-secondary)", alignSelf: "center" }}>{org.revenue}</span>
                <span style={{ fontSize: "11px", fontWeight: 600, alignSelf: "center", color: dotColor[org.status], textTransform: "capitalize" }}>{org.status}</span>
              </div>
            ))}
          </div>
          )}
        </main>
      </div>

      {/* Detail Drawer */}
      {selectedOrg && (
  <DashboardDrawer
    title={selectedOrg.name}
    statusColor={dotColor[selectedOrg.status]}
    onClose={() => setSelectedOrg(null)}
    tabs={[{ id: "overview", label: "overview" }, { id: "edit", label: "edit" }, { id: "danger", label: "danger" }]}
    activeTab={drawerTab}
    onTabChange={setDrawerTab}
  >
    {drawerTab === "overview" && (
      <DrawerFieldList
        items={[
          { label: "Location", value: selectedOrg.location },
          { label: "Package", value: selectedOrg.package },
          { label: "Revenue", value: selectedOrg.revenue },
          { label: "Status", value: selectedOrg.status },
          { label: "Created", value: new Date(selectedOrg.created_at).toLocaleDateString("en-KE") },
        ]}
      />
    )}

    {drawerTab === "edit" && (
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {[
          { label: "NAME", key: "name", defaultValue: selectedOrg.name },
          { label: "LOCATION", key: "location", defaultValue: selectedOrg.location },
          { label: "REVENUE", key: "revenue", defaultValue: selectedOrg.revenue },
        ].map(field => (
          <div key={field.key}>
            <label style={{ fontSize: "10px", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>{field.label}</label>
            <input
              defaultValue={field.defaultValue}
              onChange={e => setEditData(prev => ({ ...prev, [field.key]: e.target.value }))}
              className={s.input}
            />
          </div>
        ))}
        <div>
          <label style={{ fontSize: "10px", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>PACKAGE</label>
          <select defaultValue={selectedOrg.package} onChange={e => setEditData(prev => ({ ...prev, package: e.target.value }))} className={s.input}>
            {packages.map((p, i) => <option key={i}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: "10px", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>STATUS</label>
          <select defaultValue={selectedOrg.status} onChange={e => setEditData(prev => ({ ...prev, status: e.target.value as Organization["status"] }))} className={s.input}>
            <option value="operational">Operational</option>
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
          </select>
        </div>
        <button onClick={handleUpdate} className={s.btnGold} style={{ width: "100%", marginTop: "4px" }}>Save Changes</button>
        {actionError && (
          <div style={{ fontSize: 11, color: "#ef4444", marginTop: 4 }}>{actionError}</div>
        )}
      </div>
    )}

    {drawerTab === "danger" && (
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <div style={{ padding: "12px", borderRadius: "8px", background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "#ef4444", marginBottom: "6px" }}>Delete Organization</div>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "12px" }}>
            This will permanently remove {selectedOrg.name} and all associated data. This cannot be undone.
          </div>
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)} style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid rgba(239,68,68,0.4)", background: "transparent", color: "#ef4444", fontSize: "12px", cursor: "pointer", fontFamily: "inherit" }}>
              Delete Organization
            </button>
          ) : (
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={handleDelete} style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "none", background: "#ef4444", color: "#fff", fontSize: "12px", cursor: "pointer", fontWeight: 700, fontFamily: "inherit" }}>Confirm Delete</button>
              <button onClick={() => setConfirmDelete(false)} className={s.btnGhost} style={{ flex: 1, padding: "8px" }}>Cancel</button>
            </div>
          )}
          {actionError && (
            <div style={{ fontSize: 11, color: "#ef4444", marginTop: 8 }}>{actionError}</div>
          )}
        </div>
      </div>
    )}
  </DashboardDrawer>
)}

    </div>
  );
}