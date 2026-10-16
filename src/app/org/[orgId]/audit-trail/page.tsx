"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useEngine } from "@/lib/runtime/EngineContext";
import { getTrail, ACTION_LABELS, type TrailEntry } from "@/lib/auditTrail";
import { getApprovalRequests, type ApprovalRequest } from "@/lib/approvals";
import EmptyState from "@/components/EmptyState";

const kes = (n: number) => `KES ${Math.round(n).toLocaleString()}`;
const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-KE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "";

type Row = {
  key: string;
  action: string;
  summary: string;
  amount: number | null;
  state: "awaiting" | "approved" | "rejected" | "completed";
  initiatedBy: string;
  initiatedAt: string;
  authorisedBy: string | null;
  authorisedAt: string | null;
  note: string;
};

const STATE: Record<Row["state"], { label: string; color: string }> = {
  awaiting: { label: "Awaiting approval", color: "#f59e0b" },
  approved: { label: "Approved, not yet done", color: "#38bdf8" },
  rejected: { label: "Rejected", color: "#ef4444" },
  completed: { label: "Completed", color: "#3dd68c" },
};

// The trail is append-only: a request leaves a "pending" entry, and finishing it leaves a "completed" one.
// Merge the two (and the approval's own decision) into one line per action.
function buildRows(trail: TrailEntry[], requests: ApprovalRequest[]): Row[] {
  const reqById = new Map(requests.map((r) => [r.id, r]));
  const completedReqIds = new Set(
    trail.filter((t) => t.status === "completed" && t.approval_request_id)
      .map((t) => t.approval_request_id as string)
  );
  const rows: Row[] = [];

  for (const t of trail) {
    const reqId = t.approval_request_id;
    if (t.status === "completed") {
      const req = reqId ? reqById.get(reqId) : undefined;
      rows.push({
        key: t.id, action: t.action, summary: t.summary, amount: t.amount, state: "completed",
        initiatedBy: req?.requested_by_name ?? t.initiated_by_name,
        initiatedAt: req?.created_at ?? t.initiated_at,
        authorisedBy: t.authorised_by_name, authorisedAt: t.authorised_at,
        note: t.authorisation === "self" ? "Self-approved by the owner" : t.authorisation === "not_required" ? "No approval needed" : "",
      });
    } else if (t.status === "pending" && reqId && !completedReqIds.has(reqId)) {
      const req = reqById.get(reqId);
      const decided = req && req.status !== "pending";
      rows.push({
        key: t.id, action: t.action, summary: t.summary, amount: t.amount,
        state: !req || req.status === "pending" ? "awaiting" : req.status === "approved" ? "approved" : "rejected",
        initiatedBy: t.initiated_by_name, initiatedAt: t.initiated_at,
        authorisedBy: decided ? req!.decided_by_name : null, authorisedAt: decided ? req!.decided_at : null,
        note: req?.status === "rejected" ? "Rejected by" : req?.stage === "department" ? "Waiting for department head" : req?.dept_decided_by_name ? `Endorsed by ${req.dept_decided_by_name}` : "",
      });
    }
  }
  return rows;
}

export default function AuditTrailPage() {
  const { organization } = useEngine();
  const orgId = organization.id;
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");

  useEffect(() => {
    (async () => {
      const [trail, reqs] = await Promise.all([getTrail(orgId), getApprovalRequests(orgId)]);
      setRows(buildRows(trail, reqs));
      setLoading(false);
    })();
  }, [orgId]);

  const shown = useMemo(
    () => rows.filter((r) => (actionFilter === "all" || r.action === actionFilter) && (stateFilter === "all" || r.state === stateFilter)),
    [rows, actionFilter, stateFilter]
  );

  const select: React.CSSProperties = {
    padding: "7px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-base)", color: "var(--text-primary)", fontSize: 12,
  };

  return (
    <div style={{ padding: 24, overflowY: "auto", height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 20, marginBottom: 4 }}>Audit Trail</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", maxWidth: 640 }}>
            Every sensitive action: what was started, where it stands, who started it, and who authorised it and when. Payroll, supplier payments, refunds, stock adjustments, credit limits and large petty cash spends are recorded here.
          </p>
        </div>
        <Link href={`/org/${orgId}/approvals`} style={{ fontSize: 12, fontWeight: 700, color: "var(--gold)", textDecoration: "none", border: "1px solid var(--gold)", borderRadius: 8, padding: "7px 12px" }}>
          Open approvals
        </Link>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <select style={select} value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
          <option value="all">All actions</option>
          {Object.entries(ACTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select style={select} value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}>
          <option value="all">Any status</option>
          {Object.entries(STATE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {loading ? (
        "Loading..."
      ) : shown.length === 0 ? (
        <EmptyState icon="🧾" message="Nothing recorded yet. Sensitive actions will appear here as they happen." />
      ) : (
        <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", background: "var(--bg-card)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.6fr 100px 150px 1fr 1fr", gap: 12, padding: "9px 14px", fontSize: 11, color: "var(--text-muted)", fontWeight: 600, borderBottom: "1px solid var(--border)" }}>
            <span>What</span><span>Amount</span><span>Status</span><span>Started by</span><span>Authorised by</span>
          </div>
          {shown.map((r) => (
            <div key={r.key} style={{ display: "grid", gridTemplateColumns: "1.6fr 100px 150px 1fr 1fr", gap: 12, padding: "11px 14px", borderBottom: "1px solid var(--border)", fontSize: 13, alignItems: "start" }}>
              <span>
                <b>{ACTION_LABELS[r.action] ?? r.action}</b>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{r.summary}</div>
              </span>
              <span style={{ fontWeight: 600 }}>{r.amount !== null ? kes(r.amount) : "—"}</span>
              <span style={{ color: STATE[r.state].color, fontWeight: 600, fontSize: 12 }}>{STATE[r.state].label}</span>
              <span>
                {r.initiatedBy}
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{when(r.initiatedAt)}</div>
              </span>
              <span>
                {r.authorisedBy ? (
                  <>
                    {r.state === "rejected" ? `Rejected by ${r.authorisedBy}` : r.authorisedBy}
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{when(r.authorisedAt)}{r.note && r.state !== "rejected" ? ` · ${r.note}` : ""}</div>
                  </>
                ) : (
                  <span style={{ color: "var(--text-muted)" }}>{r.state === "awaiting" ? (r.note || "Waiting") : r.note || "—"}</span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
