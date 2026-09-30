"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardDrawer, { DrawerFieldList } from "@/components/DashboardDrawer";
import ConfirmDialog from "@/components/founder/ConfirmDialog";
import { getErrorLogs, deleteErrorLog, clearErrorLogs, type ErrorLogEntry } from "@/lib/errorLog";
import { getOrganizations, type Organization } from "@/lib/organizations";
import f from "@/styles/founder.module.css";

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function ErrorLogsPage() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<ErrorLogEntry[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);

  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [orgFilter, setOrgFilter] = useState("all");

  const [selected, setSelected] = useState<ErrorLogEntry | null>(null);
  const [copied, setCopied] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setLoadFailed(false);
    try {
      const [logsData, orgsData] = await Promise.all([getErrorLogs(200), getOrganizations()]);
      setLogs(logsData);
      setOrgs(orgsData);
    } catch (err) {
      console.error(err);
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }

  const orgName = (orgId: string | null) => orgs.find(o => o.id === orgId)?.name ?? null;
  const sources = useMemo(() => Array.from(new Set(logs.map(l => l.source))).sort(), [logs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter(l => {
      const matchSource = sourceFilter === "all" || l.source === sourceFilter;
      const matchOrg = orgFilter === "all" || l.org_id === orgFilter;
      const matchSearch = !q || l.message.toLowerCase().includes(q) || l.source.toLowerCase().includes(q);
      return matchSource && matchOrg && matchSearch;
    });
  }, [logs, search, sourceFilter, orgFilter]);

  const last24h = useMemo(() => {
    const cutoff = Date.now() - 24 * 3600000;
    return logs.filter(l => new Date(l.created_at).getTime() > cutoff).length;
  }, [logs]);

  async function handleClearAll() {
    setClearing(true);
    try {
      await clearErrorLogs();
      setLogs([]);
      setSelected(null);
    } finally {
      setClearing(false);
      setConfirmClear(false);
    }
  }

  async function handleDelete(id: string) {
    await deleteErrorLog(id);
    setLogs(prev => prev.filter(l => l.id !== id));
    if (selected?.id === id) setSelected(null);
    setConfirmDeleteId(null);
  }

  function copyDetails(entry: ErrorLogEntry) {
    const details = [
      `Message: ${entry.message}`,
      `Source: ${entry.source}`,
      entry.code ? `Code: ${entry.code}` : null,
      entry.org_id ? `Org: ${orgName(entry.org_id) ?? entry.org_id}` : null,
      `Time: ${new Date(entry.created_at).toLocaleString()}`,
      entry.context ? `Context: ${JSON.stringify(entry.context, null, 2)}` : null,
    ].filter(Boolean).join("\n");
    navigator.clipboard.writeText(details);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className={`page-shell ${f.root}`}>
      <main className={selected ? "page-main-drawer" : "page-main"}>
        <div className={f.page}>
          <div className={f.top}>
            <div>
              <p className={f.greeting}>Error logs</p>
              <h1 className={`${f.headline} ${f.headlineWide}`}>
                {loading ? "Loading error logs" : logs.length === 0 ? "Nothing has failed — clean slate." : last24h > 0 ? `${last24h} ${last24h === 1 ? "error" : "errors"} in the last 24 hours.` : "Nothing in the last 24 hours."}
              </h1>
            </div>
            <div className={f.actions}>
              <button className={f.secondary} onClick={load}>Refresh</button>
              <button className={f.secondary} style={{ color: "var(--red)" }} onClick={() => setConfirmClear(true)} disabled={logs.length === 0}>Clear all</button>
            </div>
          </div>

          {loadFailed && (
            <div className={f.empty}><strong>Couldn&apos;t load error logs.</strong><div><button className={f.secondary} onClick={load}>Retry</button></div></div>
          )}

          {loading ? (
            <p className={f.status} role="status">Loading error logs…</p>
          ) : (
            <>
              <div className={f.vitals}>
                <div className={`${f.vital} ${f.vitalStatic}`}>
                  <span className={f.vitalLabel}>Total logged</span>
                  <span className={f.vitalValue}>{logs.length}</span>
                </div>
                <div className={`${f.vital} ${f.vitalStatic}`}>
                  <span className={f.vitalLabel}>Last 24 hours</span>
                  <span className={`${f.vitalValue} ${last24h > 0 ? f.owed : ""}`}>{last24h}</span>
                </div>
                <div className={`${f.vital} ${f.vitalStatic}`}>
                  <span className={f.vitalLabel}>Distinct sources</span>
                  <span className={f.vitalValue}>{sources.length}</span>
                </div>
                <div className={`${f.vital} ${f.vitalStatic}`}>
                  <span className={f.vitalLabel}>Most recent</span>
                  <span className={f.vitalValue}>{logs[0] ? timeAgo(logs[0].created_at) : "—"}</span>
                </div>
              </div>

              <div className={f.toolbar}>
                <input className={`${f.input} ${f.search}`} type="search" placeholder="Search message or source" value={search} onChange={e => setSearch(e.target.value)} aria-label="Search logs" />
                <div className={f.actions}>
                  <select className={`${f.select} ${f.selectSm}`} value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} aria-label="Filter by source">
                    <option value="all">All sources</option>
                    {sources.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <select className={`${f.select} ${f.selectSm}`} value={orgFilter} onChange={e => setOrgFilter(e.target.value)} aria-label="Filter by organization">
                    <option value="all">All orgs</option>
                    {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
              </div>

              {filtered.length === 0 ? (
                <div className={f.empty}>
                  <strong>{logs.length === 0 ? "No errors logged yet." : "No logs match these filters."}</strong>
                  {logs.length === 0 ? "Every failure your pages catch gets written here — nothing silently disappears." : "Try a different search or filter."}
                </div>
              ) : (
                <div className={f.tableWrap}>
                  <table className={f.ledger}>
                    <thead><tr><th>Time</th><th>Source</th><th>Org</th><th>Message</th><th /></tr></thead>
                    <tbody>
                      {filtered.map(log => (
                        <tr key={log.id} className={`${f.clickable} ${selected?.id === log.id ? f.selected : ""}`} onClick={() => setSelected(log)}>
                          <td className={f.cellMuted}>{timeAgo(log.created_at)}</td>
                          <td>
                            {log.severity === "critical" && <span className={f.pill} data-status="critical" style={{ marginRight: 8 }}>Critical</span>}
                            <span className={f.tag}>{log.source}</span>
                          </td>
                          <td className={f.cellMuted}>{orgName(log.org_id) ?? (log.org_id ? "—" : "Platform")}</td>
                          <td className={f.cellSub} style={{ maxWidth: 420, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{log.message}</td>
                          <td className={f.cellMuted}>
                            <button className={f.linkBtn} style={{ color: "var(--text-secondary)" }} onClick={e => { e.stopPropagation(); setConfirmDeleteId(log.id); }}>Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {selected && (
        <DashboardDrawer title="Error detail" onClose={() => setSelected(null)}>
          <div className={f.field} style={{ marginBottom: 16 }}>
            <label>Message</label>
            <div className={f.hint} style={{ background: "var(--bg-elevated)", border: "1px solid var(--rule)", borderRadius: 8, padding: "10px 12px", fontFamily: "monospace", wordBreak: "break-word" }}>
              {selected.message}
            </div>
          </div>
          <DrawerFieldList
            items={[
              { label: "Source", value: selected.source },
              { label: "Org", value: orgName(selected.org_id) ?? (selected.org_id ? selected.org_id : "Platform") },
              ...(selected.code ? [{ label: "Code", value: selected.code }] : []),
              { label: "Time", value: new Date(selected.created_at).toLocaleString() },
            ]}
          />
          {selected.context && (
            <div style={{ marginTop: 16 }}>
              <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>Context</label>
              <pre style={{ fontSize: 11, background: "var(--bg-elevated)", border: "1px solid var(--rule)", borderRadius: 8, padding: "10px 12px", overflowX: "auto", marginTop: 6 }}>
                {JSON.stringify(selected.context, null, 2)}
              </pre>
            </div>
          )}
          <div className={f.dialogActions} style={{ justifyContent: "flex-start", marginTop: 20 }}>
            <button className={f.secondary} onClick={() => copyDetails(selected)}>{copied ? "Copied ✓" : "Copy details"}</button>
            <button className={f.dangerBtn} style={{ width: "auto" }} onClick={() => setConfirmDeleteId(selected.id)}>Delete</button>
          </div>
        </DashboardDrawer>
      )}

      {confirmClear && (
        <ConfirmDialog
          title="Clear all error logs?"
          message={`All ${logs.length} logged errors will be permanently deleted. This can't be undone.`}
          confirmLabel={clearing ? "Clearing…" : "Clear all"}
          onConfirm={handleClearAll}
          onCancel={() => setConfirmClear(false)}
        />
      )}

      {confirmDeleteId && (
        <ConfirmDialog
          title="Delete this log?"
          message="This entry will be permanently deleted."
          confirmLabel="Delete"
          onConfirm={() => handleDelete(confirmDeleteId)}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </div>
  );
}
