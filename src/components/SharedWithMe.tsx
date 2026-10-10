"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { getSignedDocumentUrl } from "@/lib/documents";

type Row = {
  key: string;
  kind: "document" | "project";
  name: string;
  detail: string;
  access: "view" | "edit";
  filePath?: string;
};

// Everything teammates have shared with the signed-in user. Lives on /me, which isn't tied
// to an engine license, so people can open what's shared with them even without a seat.
export default function SharedWithMe({ orgId }: { orgId: string }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: shares, error: e1 } = await supabase.from("resource_shares")
          .select("resource_type, resource_id, access").eq("org_id", orgId).eq("user_id", user.id);
        if (e1) throw e1;

        const docIds = (shares ?? []).filter(s => s.resource_type === "document").map(s => s.resource_id);
        const projIds = (shares ?? []).filter(s => s.resource_type === "project").map(s => s.resource_id);
        const [docs, projs] = await Promise.all([
          docIds.length ? supabase.from("documents").select("id, name, category, file_path, created_at").in("id", docIds) : Promise.resolve({ data: [] as never[] }),
          projIds.length ? supabase.from("ops_projects").select("id, name, status, progress, due_date").in("id", projIds) : Promise.resolve({ data: [] as never[] }),
        ]);
        const accessOf = (id: string) => (shares ?? []).find(s => s.resource_id === id)?.access as "view" | "edit";

        const out: Row[] = [
          ...((docs.data ?? []) as { id: string; name: string; category: string; file_path: string; created_at: string }[]).map(d => ({
            key: d.id, kind: "document" as const, name: d.name, filePath: d.file_path, access: accessOf(d.id),
            detail: `${d.category.replace("_", " ")} · ${new Date(d.created_at).toLocaleDateString()}`,
          })),
          ...((projs.data ?? []) as { id: string; name: string; status: string; progress: number; due_date: string | null }[]).map(p => ({
            key: p.id, kind: "project" as const, name: p.name, access: accessOf(p.id),
            detail: `${p.status.replace("_", " ")} · ${p.progress}%${p.due_date ? ` · due ${new Date(p.due_date).toLocaleDateString()}` : ""}`,
          })),
        ];
        setRows(out);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load shared items.");
      }
    })();
  }, [orgId]);

  async function open(row: Row) {
    if (!row.filePath) return;
    const url = await getSignedDocumentUrl(row.filePath);
    if (url) window.open(url, "_blank", "noopener");
  }

  return (
    <div className="card" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: 16, marginTop: 14 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Shared with me</h3>
      {error && <div role="alert" style={{ color: "var(--red)", fontSize: 12 }}>{error}</div>}
      {!error && rows === null && <div style={{ color: "var(--text-muted)", fontSize: 12 }}>Loading…</div>}
      {rows?.length === 0 && <div style={{ color: "var(--text-muted)", fontSize: 12 }}>Nothing has been shared with you yet.</div>}
      {rows?.map(r => (
        <div key={r.key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderTop: "1px solid var(--border)" }}>
          <span aria-hidden="true" style={{ fontSize: 18 }}>{r.kind === "document" ? "📄" : "📁"}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "capitalize" }}>{r.detail}</div>
          </div>
          <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{r.access === "edit" ? "Can edit" : "Can view"}</span>
          {r.kind === "document" && (
            <button onClick={() => open(r)} style={{ padding: "5px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "1px solid var(--border-light)", background: "transparent", color: "var(--text-primary)" }}>Open</button>
          )}
        </div>
      ))}
    </div>
  );
}
