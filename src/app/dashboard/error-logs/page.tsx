"use client";

import { useEffect, useMemo, useState } from "react";
import Drawer from "@/components/Drawer";
import EmptyState from "@/components/EmptyState";
import { getErrorLogs, deleteErrorLog, clearErrorLogs, type ErrorLogEntry } from "@/lib/errorLog";
import { getOrganizations, type Organization } from "@/lib/organizations";
import PageHeader from "@/components/PageHeader";

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
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

  useEffect(() => {
    load();
  }, []);

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

  const orgName = (orgId: string | null) => orgs.find((o) => o.id === orgId)?.name ?? null;

  const sources = useMemo(() => Array.from(new Set(logs.map((l) => l.source))).sort(), [logs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((l) => {
      const matchSource = sourceFilter === "all" || l.source === sourceFilter;
      const matchOrg = orgFilter === "all" || l.org_id === orgFilter;
      const matchSearch =
        !q || l.message.toLowerCase().includes(q) || l.source.toLowerCase().includes(q);
      return matchSource && matchOrg && matchSearch;
    });
  }, [logs, search, sourceFilter, orgFilter]);

  const last24h = useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return logs.filter((l) => new Date(l.created_at).getTime() > cutoff).length;
  }, [logs]);

  async function handleClearAll() {
    if (!confirm(`Delete all ${logs.length} error logs? This can't be undone.`)) return;
    try {
      setClearing(true);
      await clearErrorLogs();
      setLogs([]);
      setSelected(null);
    } finally {
      setClearing(false);
    }
  }

  async function handleDelete(id: string) {
    await deleteErrorLog(id);
    setLogs((prev) => prev.filter((l) => l.id !== id));
    if (selected?.id === id) setSelected(null);
  }

  function copyDetails(entry: ErrorLogEntry) {
    const details = [
      `Message: ${entry.message}`,
      `Source: ${entry.source}`,
      entry.code ? `Code: ${entry.code}` : null,
      entry.org_id ? `Org: ${orgName(entry.org_id) ?? entry.org_id}` : null,
      `Time: ${new Date(entry.created_at).toLocaleString()}`,
      entry.context ? `Context: ${JSON.stringify(entry.context, null, 2)}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    navigator.clipboard.writeText(details);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) return <div style={{ padding: 20, fontSize: 13, color: "var(--text-muted)" }}>Loading error logs...</div>;

  if (loadFailed) {
    return (
      <div style={{ padding: 20 }}>
        <EmptyState icon="⚠️" message="Couldn't load error logs." actionLabel="Retry" onAction={load} />
      </div>
    );
  }

  return (
    <div style={{ overflowY: "auto", height: "100%" }}>
      <PageHeader
  title="Error Logs"
  subtitle="Every failure your pages catch gets written here — nothing silently disappears anymore."
  actions={
    <>
      <button style={ghostButton} onClick={load}>Refresh</button>
      <button style={dangerButton} onClick={handleClearAll} disabled={clearing || logs.length === 0}>
        {clearing ? "Clearing..." : "Clear All"}
      </button>
    </>
  }
/>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
        <StatCard label="Total logged" value={logs.length} />
        <StatCard label="Last 24 hours" value={last24h} accent={last24h > 0 ? "#ef4444" : undefined} />
        <StatCard label="Distinct sources" value={sources.length} />
        <StatCard label="Most recent" value={logs[0] ? timeAgo(logs[0].created_at) : "—"} small />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          placeholder="Search message or source..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle, flex: "1 1 220px", marginBottom: 0 }}
        />
        <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} style={selectStyle}>
          <option value="all">All sources</option>
          {sources.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select value={orgFilter} onChange={(e) => setOrgFilter(e.target.value)} style={selectStyle}>
          <option value="all">All orgs</option>
          {orgs.map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
      </div>

      <div className="card" style={cardStyle}>
        {filtered.length === 0 ? (
          <EmptyState
            icon="🧯"
            message={logs.length === 0 ? "No errors logged yet — clean slate." : "No logs match these filters."}
          />
        ) : (
          <>
            <div style={{ ...rowStyle, ...gridCols, borderBottom: "1px solid var(--border)", color: "var(--text-muted)", fontSize: 11, fontWeight: 600 }}>
              <span>TIME</span>
              <span>SOURCE</span>
              <span>ORG</span>
              <span>MESSAGE</span>
            </div>
            {filtered.map((log) => (
              <div
                key={log.id}
                onClick={() => setSelected(log)}
                style={{ ...rowStyle, ...gridCols, cursor: "pointer" }}
              >
                <span style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                  {timeAgo(log.created_at)}
                </span>
                <span style={{ fontSize: 11 }}>
                  <span style={sourceTagStyle}>{log.source}</span>
                </span>
                <span style={{ fontSize: 12, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {orgName(log.org_id) ?? (log.org_id ? "—" : "Platform")}
                </span>
                <span style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {log.message}
                </span>
              </div>
            ))}
          </>
        )}
      </div>

      <Drawer open={!!selected} onClose={() => setSelected(null)} title="Error Detail" width={460}>
        {selected && (
          <>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>MESSAGE</div>
            <div
              style={{
                fontSize: 13,
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "10px 12px",
                marginBottom: 14,
                wordBreak: "break-word",
                fontFamily: "monospace",
              }}
            >
              {selected.message}
            </div>

            <DetailRow label="Source" value={selected.source} />
            <DetailRow label="Org" value={orgName(selected.org_id) ?? (selected.org_id ? selected.org_id : "Platform")} />
            {selected.code && <DetailRow label="Code" value={selected.code} />}
            <DetailRow label="Time" value={new Date(selected.created_at).toLocaleString()} />

            {selected.context && (
              <>
                <div style={{ fontSize: 11, color: "var(--text-muted)", margin: "14px 0 4px" }}>CONTEXT</div>
                <pre
                  style={{
                    fontSize: 11,
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    padding: "10px 12px",
                    overflowX: "auto",
                    marginBottom: 14,
                  }}
                >
                  {JSON.stringify(selected.context, null, 2)}
                </pre>
              </>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
              <button style={{ ...ghostButton, flex: 1 }} onClick={() => copyDetails(selected)}>
                {copied ? "Copied ✓" : "Copy Details"}
              </button>
              <button style={{ ...dangerButton, flex: 1 }} onClick={() => handleDelete(selected.id)}>
                Delete
              </button>
            </div>
          </>
        )}
      </Drawer>
    </div>
  );
}

function StatCard({ label, value, accent, small }: { label: string; value: string | number; accent?: string; small?: boolean }) {
  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: small ? 16 : 22, fontWeight: 700, color: accent ?? "var(--text-primary)" }}>{value}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <span style={{ fontWeight: 600, textAlign: "right" }}>{value}</span>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 14,
  padding: 8,
};

const rowStyle: React.CSSProperties = {
  display: "grid",
  padding: "10px 12px",
  borderBottom: "1px solid var(--border)",
  fontSize: 13,
  alignItems: "center",
  gap: 8,
};

const gridCols: React.CSSProperties = {
  gridTemplateColumns: "0.7fr 1fr 0.9fr 2fr",
};

const sourceTagStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "2px 8px",
  borderRadius: 6,
  background: "var(--bg-elevated)",
  border: "1px solid var(--border)",
  fontSize: 10.5,
  fontWeight: 600,
  color: "var(--text-secondary)",
};

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--bg-base)",
  color: "var(--text-primary)",
  fontSize: 13,
};

const selectStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--bg-base)",
  color: "var(--text-primary)",
  fontSize: 12,
};

const ghostButton: React.CSSProperties = {
  padding: "9px 16px",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--text-secondary)",
  fontSize: 12,
  cursor: "pointer",
};

const dangerButton: React.CSSProperties = {
  padding: "9px 16px",
  borderRadius: 10,
  border: "1px solid #ef444460",
  background: "transparent",
  color: "#ef4444",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};