"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Member = { userId: string; name: string | null; email: string | null; role: string };
type Share = { userId: string; access: "view" | "edit"; name: string | null; email: string | null };
type Info = { name: string; visibility: "org" | "restricted"; canManage: boolean; members: Member[]; shares: Share[] };

const field: React.CSSProperties = { padding: "8px 10px", borderRadius: 8, background: "var(--bg-base)", color: "var(--text-primary)", border: "1px solid var(--border-light)", fontSize: 13, fontFamily: "inherit" };
const btn: React.CSSProperties = { padding: "7px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "1px solid var(--border-light)", background: "transparent", color: "var(--text-primary)", fontFamily: "inherit" };
const gold: React.CSSProperties = { ...btn, background: "var(--gold)", color: "var(--gold-contrast)", borderColor: "var(--gold)" };

async function api(method: "GET" | "POST", payload: Record<string, unknown>) {
  const res = method === "GET"
    ? await fetch(`/api/org/share?${new URLSearchParams(payload as Record<string, string>)}`)
    : await fetch("/api/org/share", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Something went wrong.");
  return json;
}

export default function ShareDialog({ orgId, type, id, onClose, onChanged }: {
  orgId: string; type: "document" | "project"; id: string; onClose: () => void; onChanged?: (visibility: "org" | "restricted") => void;
}) {
  const [info, setInfo] = useState<Info | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [pick, setPick] = useState("");
  const [level, setLevel] = useState<"view" | "edit">("view");
  const [notify, setNotify] = useState(true);

  const load = useCallback(async () => {
    try { setInfo(await api("GET", { orgId, type, id })); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not load sharing."); }
  }, [orgId, type, id]);
  useEffect(() => { load(); }, [load]);

  async function run(payload: Record<string, unknown>) {
    setBusy(true); setError(null); setNote(null);
    try { const r = await api("POST", { orgId, type, id, ...payload }); await load(); return r; }
    catch (e) { setError(e instanceof Error ? e.message : "Something went wrong."); return null; }
    finally { setBusy(false); }
  }

  const sharedIds = new Set((info?.shares ?? []).map(s => s.userId));
  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (info?.members ?? []).filter(m => !sharedIds.has(m.userId) && (!q || (m.name ?? "").toLowerCase().includes(q) || (m.email ?? "").toLowerCase().includes(q)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [info, query]);

  async function setVisibility(v: "org" | "restricted") {
    const r = await run({ action: "set_visibility", visibility: v });
    if (r) onChanged?.(v);
  }

  async function addPerson() {
    if (!pick) return;
    const r = await run({ action: "add", userId: pick, access: level, notify });
    if (r) {
      setPick(""); setQuery("");
      setNote(notify ? (r.emailed ? "Shared and emailed." : "Shared. Email isn't set up yet, so they'll see it under Shared with me.") : "Shared.");
    }
  }

  const manage = !!info?.canManage;

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 10002, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div role="dialog" aria-modal="true" aria-label="Share" onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto", background: "var(--bg-card)", border: "1px solid var(--border-light)", borderRadius: 14, padding: 20, color: "var(--text-primary)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Share {type}</div>
            <div style={{ fontWeight: 700, fontSize: 16, wordBreak: "break-word" }}>{info?.name ?? "…"}</div>
          </div>
          <button style={btn} onClick={onClose} aria-label="Close">Done</button>
        </div>

        {error && <div role="alert" style={{ color: "var(--red)", fontSize: 12, marginBottom: 10 }}>{error}</div>}
        {!info && !error && <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Loading…</div>}

        {info && (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {([["org", "Everyone in the organization"], ["restricted", "Only people I choose"]] as const).map(([v, label]) => (
                <button key={v} disabled={!manage || busy} onClick={() => info.visibility !== v && setVisibility(v)} aria-pressed={info.visibility === v}
                  style={{ ...btn, flex: 1, padding: "9px 8px", borderColor: info.visibility === v ? "var(--gold)" : "var(--border-light)", background: info.visibility === v ? "var(--gold-glow)" : "transparent", opacity: manage ? 1 : 0.6 }}>
                  {v === "restricted" ? "🔒 " : "🏢 "}{label}
                </button>
              ))}
            </div>

            {info.visibility === "restricted" && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 6 }}>PEOPLE WITH ACCESS</div>
                <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden", marginBottom: 14 }}>
                  <div style={{ padding: "8px 12px", fontSize: 12, color: "var(--text-muted)", borderBottom: info.shares.length ? "1px solid var(--border)" : "none" }}>
                    You, org owners and admins always have access.
                  </div>
                  {info.shares.map(s => (
                    <div key={s.userId} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderTop: "1px solid var(--border)" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name ?? s.email}</div>
                        {s.name && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{s.email}</div>}
                      </div>
                      {manage ? (
                        <>
                          <select value={s.access} disabled={busy} aria-label={`Access for ${s.name ?? s.email}`} style={field}
                            onChange={e => run({ action: "add", userId: s.userId, access: e.target.value, notify: false })}>
                            <option value="view">Can view</option><option value="edit">Can edit</option>
                          </select>
                          <button style={btn} disabled={busy} onClick={() => run({ action: "remove", userId: s.userId })}>Remove</button>
                        </>
                      ) : <span style={{ fontSize: 12 }}>{s.access === "edit" ? "Can edit" : "Can view"}</span>}
                    </div>
                  ))}
                </div>

                {manage && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <input value={query} onChange={e => { setQuery(e.target.value); setPick(""); }} placeholder="Search a teammate by name or email" aria-label="Search teammates" style={field} />
                    {(query || pick) && (
                      <div style={{ border: "1px solid var(--border)", borderRadius: 8, maxHeight: 150, overflowY: "auto" }}>
                        {candidates.length === 0 && <div style={{ padding: 10, fontSize: 12, color: "var(--text-muted)" }}>No matching teammates. People must already be members of this organization.</div>}
                        {candidates.map(m => (
                          <button key={m.userId} onClick={() => { setPick(m.userId); setQuery(m.name ?? m.email ?? ""); }}
                            style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 10px", background: pick === m.userId ? "var(--gold-glow)" : "transparent", border: "none", borderBottom: "1px solid var(--border)", color: "var(--text-primary)", cursor: "pointer", fontFamily: "inherit" }}>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{m.name ?? m.email}</div>
                            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{m.email} · {m.role}</div>
                          </button>
                        ))}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <select value={level} onChange={e => setLevel(e.target.value as "view" | "edit")} aria-label="Access level" style={field}>
                        <option value="view">Can view</option><option value="edit">Can edit</option>
                      </select>
                      <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6, color: "var(--text-secondary)" }}>
                        <input type="checkbox" checked={notify} onChange={e => setNotify(e.target.checked)} /> Email them
                      </label>
                      <button style={{ ...gold, marginLeft: "auto" }} disabled={!pick || busy} onClick={addPerson}>Share</button>
                    </div>
                  </div>
                )}
              </>
            )}

            {info.visibility === "org" && (
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Everyone in the organization can see this. Switch to &quot;Only people I choose&quot; to limit it.
              </div>
            )}
            {!manage && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 12 }}>Only the owner of this item or an org admin can change sharing.</div>}
            {note && <div role="status" style={{ fontSize: 12, color: "var(--green)", marginTop: 10 }}>{note}</div>}
          </>
        )}
      </div>
    </div>
  );
}
