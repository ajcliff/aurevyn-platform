"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";
import { CATEGORY_LABEL, getMessages, getMyReads, getThreads, isUnread, mailApi, type MailMessage, type MailThread } from "@/lib/mail";

type Props =
  | { mode: "org"; orgId: string }
  | { mode: "founder"; orgId?: undefined };

type Person = { userId: string; name: string | null; email: string | null };

const field: React.CSSProperties = { padding: "9px 11px", borderRadius: 8, background: "var(--bg-base)", color: "var(--text-primary)", border: "1px solid var(--border-light)", fontSize: 13, fontFamily: "inherit", width: "100%" };
const btn: React.CSSProperties = { padding: "7px 13px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "1px solid var(--border-light)", background: "transparent", color: "var(--text-primary)", fontFamily: "inherit" };
const gold: React.CSSProperties = { ...btn, background: "var(--gold)", color: "var(--gold-contrast)", borderColor: "var(--gold)" };

const when = (iso: string) => {
  const d = new Date(iso), now = new Date();
  return d.toDateString() === now.toDateString()
    ? d.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("en-KE", { day: "numeric", month: "short" });
};

export default function MailView(props: Props) {
  const founder = props.mode === "founder";
  const endpoint = founder ? "/api/founder/mail" : "/api/org/mail";
  const orgScope = props.orgId;

  const [me, setMe] = useState<string | null>(null);
  const [threads, setThreads] = useState<MailThread[]>([]);
  const [reads, setReads] = useState<Record<string, string | null>>({});
  const [orgNames, setOrgNames] = useState<Record<string, string>>({});
  const [people, setPeople] = useState<Person[]>([]);
  const [orgList, setOrgList] = useState<{ id: string; name: string }[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MailMessage[]>([]);
  const [filter, setFilter] = useState<"all" | "unread" | "open" | "closed">(founder ? "open" : "all");
  const [error, setError] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = () => setNarrow(window.innerWidth < 860);
    check(); window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const loadThreads = useCallback(async () => {
    const [t, r] = await Promise.all([getThreads(orgScope), founder ? Promise.resolve({}) : getMyReads()]);
    setThreads(t); setReads(r as Record<string, string | null>);
  }, [orgScope, founder]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
    (async () => {
      if (founder) {
        const { data } = await supabase.from("organizations").select("id, name").order("name");
        setOrgList(data ?? []); setOrgNames(Object.fromEntries((data ?? []).map(o => [o.id, o.name])));
      } else {
        const { data } = await supabase.from("org_users").select("user_id, full_name, email").eq("org_id", orgScope!);
        setPeople((data ?? []).map(m => ({ userId: m.user_id, name: m.full_name, email: m.email })));
      }
    })();
    loadThreads();
    const poll = setInterval(() => { if (document.visibilityState === "visible") loadThreads(); }, 30000);
    return () => clearInterval(poll);
  }, [founder, orgScope, loadThreads]);

  // Deep link from an email: ?thread=<id>
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("thread");
    if (id) setActiveId(id);
  }, []);

  const active = threads.find(t => t.id === activeId) ?? null;

  const open = useCallback(async (t: MailThread) => {
    setActiveId(t.id); setError(null); setReply("");
    setMessages(await getMessages(t.id));
    try { await mailApi(endpoint, { orgId: orgScope, action: "read", threadId: t.id }); loadThreads(); } catch { /* unread marker is non-critical */ }
  }, [endpoint, orgScope, loadThreads]);

  // Opening via deep link once threads have loaded
  useEffect(() => { if (activeId && active && messages.length === 0) open(active); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [active?.id]);
  useEffect(() => { scroller.current?.scrollTo({ top: scroller.current.scrollHeight }); }, [messages.length]);

  async function act(payload: Record<string, unknown>) {
    setBusy(true); setError(null);
    try { return await mailApi(endpoint, { orgId: orgScope, ...payload }); }
    catch (e) { setError(e instanceof Error ? e.message : "Something went wrong."); return null; }
    finally { setBusy(false); }
  }

  async function sendReply() {
    if (!active || !reply.trim()) return;
    const r = await act({ action: "reply", threadId: active.id, body: reply });
    if (r) { setReply(""); setMessages(await getMessages(active.id)); loadThreads(); }
  }

  async function setStatus(status: "open" | "closed") {
    if (!active) return;
    const r = await act(founder ? { action: "set_status", threadId: active.id, status } : { action: "close", threadId: active.id });
    if (r) loadThreads();
  }

  const shown = useMemo(() => threads.filter(t => {
    if (filter === "unread") return isUnread(t, me, reads, founder);
    if (filter === "open" || filter === "closed") return t.status === filter;
    return true;
  }), [threads, filter, me, reads, founder]);

  const unreadCount = threads.filter(t => isUnread(t, me, reads, founder)).length;
  const showList = !narrow || !active;
  const showThread = !narrow || !!active;

  return (
    <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "340px 1fr", gap: 14, minHeight: 540, height: "calc(100vh - 190px)", color: "var(--text-primary)" }}>
      {showList && (
        <div style={{ border: "1px solid var(--border)", borderRadius: 12, background: "var(--bg-card)", display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ padding: 12, display: "flex", gap: 8, alignItems: "center", borderBottom: "1px solid var(--border)" }}>
            <button style={{ ...gold, flex: 1 }} onClick={() => setComposing(true)}>✎ New message</button>
          </div>
          <div style={{ padding: "8px 12px", display: "flex", gap: 6, flexWrap: "wrap", borderBottom: "1px solid var(--border)" }}>
            {(founder ? (["open", "unread", "closed", "all"] as const) : (["all", "unread"] as const)).map(f => (
              <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f}
                style={{ ...btn, padding: "4px 10px", borderColor: filter === f ? "var(--gold)" : "var(--border-light)", background: filter === f ? "var(--gold-glow)" : "transparent", textTransform: "capitalize" }}>
                {f}{f === "unread" && unreadCount > 0 ? ` (${unreadCount})` : ""}
              </button>
            ))}
          </div>
          <div style={{ overflowY: "auto", flex: 1 }}>
            {shown.length === 0 && <div style={{ padding: 20, textAlign: "center", fontSize: 13, color: "var(--text-muted)" }}>No messages here.</div>}
            {shown.map(t => {
              const unread = isUnread(t, me, reads, founder);
              return (
                <button key={t.id} onClick={() => open(t)}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "11px 14px", border: "none", borderBottom: "1px solid var(--border)", background: t.id === activeId ? "var(--gold-glow)" : "transparent", color: "var(--text-primary)", cursor: "pointer", fontFamily: "inherit" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {unread && <span aria-label="Unread" style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--gold)", flexShrink: 0 }} />}
                    <span style={{ fontWeight: unread ? 800 : 600, fontSize: 13, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.subject}</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)", flexShrink: 0 }}>{when(t.last_message_at)}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3, display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {founder && <span style={{ color: "var(--text-secondary)" }}>{orgNames[t.org_id] ?? "Organization"}</span>}
                    <span>{t.kind === "support" ? (founder ? t.created_by_name : "AUREVYN Support") : "Team"}</span>
                    {t.kind === "support" && t.category !== "general" && <span>· {CATEGORY_LABEL[t.category]}</span>}
                    {t.status === "closed" && <span>· Closed</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {showThread && (
        <div style={{ border: "1px solid var(--border)", borderRadius: 12, background: "var(--bg-card)", display: "flex", flexDirection: "column", minHeight: 0 }}>
          {!active ? (
            <div style={{ margin: "auto", textAlign: "center", color: "var(--text-muted)", fontSize: 13, padding: 20 }}>Select a message to read it.</div>
          ) : (
            <>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
                {narrow && <button style={btn} onClick={() => { setActiveId(null); setMessages([]); }}>← Back</button>}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{active.subject}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {founder ? `${orgNames[active.org_id] ?? "Organization"} · ` : ""}{active.kind === "support" ? CATEGORY_LABEL[active.category] : "Team message"}{active.status === "closed" ? " · Closed" : ""}
                  </div>
                </div>
                {active.kind === "support" && (
                  active.status === "open"
                    ? <button style={btn} disabled={busy} onClick={() => setStatus("closed")}>Close</button>
                    : founder ? <button style={btn} disabled={busy} onClick={() => setStatus("open")}>Reopen</button> : null
                )}
              </div>

              <div ref={scroller} style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                {messages.map(m => {
                  const mine = m.sender_id === me;
                  return (
                    <div key={m.id} style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "82%", border: `1px solid ${m.from_founder ? "var(--gold)" : "var(--border-light)"}`, background: mine ? "var(--gold-glow)" : "var(--bg-base)", borderRadius: 12, padding: "9px 12px" }}>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>{mine ? "You" : m.sender_name ?? "Unknown"} · {new Date(m.created_at).toLocaleString("en-KE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
                      {m.recipients && (m.recipients.to.length > 0 || m.recipients.cc.length > 0) && (
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>
                          {m.recipients.to.length > 0 && <>To: {m.recipients.to.map(r => r.name ?? r.email).join(", ")}</>}
                          {m.recipients.cc.length > 0 && <>{m.recipients.to.length > 0 ? " · " : ""}Cc: {m.recipients.cc.map(r => r.name ?? r.email).join(", ")}</>}
                        </div>
                      )}
                      <div style={{ fontSize: 13, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{m.body}</div>
                    </div>
                  );
                })}
              </div>

              <div style={{ padding: 12, borderTop: "1px solid var(--border)" }}>
                {error && <div role="alert" style={{ color: "var(--red)", fontSize: 12, marginBottom: 8 }}>{error}</div>}
                <textarea value={reply} onChange={e => setReply(e.target.value)} rows={3} placeholder={active.status === "closed" ? "Replying will reopen this conversation" : "Write a reply"} aria-label="Reply" style={{ ...field, resize: "vertical" }}
                  onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") sendReply(); }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Ctrl+Enter to send</span>
                  <button style={gold} disabled={busy || !reply.trim()} onClick={sendReply}>{busy ? "Sending…" : "Send reply"}</button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {composing && (
        <Compose founder={founder} endpoint={endpoint} orgId={orgScope} people={people.filter(p => p.userId !== me)} orgs={orgList}
          onClose={() => setComposing(false)}
          onSent={async (threadId) => { setComposing(false); await loadThreads(); const t = (await getThreads(orgScope)).find(x => x.id === threadId); if (t) open(t); }} />
      )}
    </div>
  );
}

function Compose({ founder, endpoint, orgId, people, orgs, onClose, onSent }: {
  founder: boolean; endpoint: string; orgId?: string; people: Person[]; orgs: { id: string; name: string }[];
  onClose: () => void; onSent: (threadId: string) => void;
}) {
  const [kind, setKind] = useState<"support" | "internal">("support");
  const [toOrg, setToOrg] = useState(orgs[0]?.id ?? "");
  const [picked, setPicked] = useState<string[]>([]);
  const [cc, setCc] = useState<string[]>([]);
  const [showCc, setShowCc] = useState(false);
  const [category, setCategory] = useState("general");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsRecipients = !founder && kind === "internal" && picked.length === 0;
  const orgChoice = founder ? (toOrg || orgs[0]?.id || "") : "";

  async function send() {
    setBusy(true); setError(null);
    try {
      const payload = founder
        ? { action: "send", orgId: orgChoice, subject, body, category }
        : { orgId, action: "send", kind, subject, body, category, toUserIds: picked, ccUserIds: cc };
      const r = await mailApi(endpoint, payload);
      onSent(r.threadId);
    } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong."); setBusy(false); }
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 10002, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div role="dialog" aria-modal="true" aria-label="New message" onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 520, maxHeight: "92vh", overflowY: "auto", background: "var(--bg-card)", border: "1px solid var(--border-light)", borderRadius: 14, padding: 20, color: "var(--text-primary)", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <strong style={{ fontSize: 16 }}>New message</strong>
          <button style={btn} onClick={onClose}>Cancel</button>
        </div>

        {founder ? (
          <select value={toOrg} onChange={e => setToOrg(e.target.value)} aria-label="Organization" style={field}>
            {orgs.map(o => <option key={o.id} value={o.id}>To: {o.name} (owners and admins)</option>)}
          </select>
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            {([["support", "📬 AUREVYN Support"], ["internal", "👥 Teammates"]] as const).map(([k, label]) => (
              <button key={k} onClick={() => setKind(k)} aria-pressed={kind === k}
                style={{ ...btn, flex: 1, padding: 9, borderColor: kind === k ? "var(--gold)" : "var(--border-light)", background: kind === k ? "var(--gold-glow)" : "transparent" }}>{label}</button>
            ))}
          </div>
        )}

        {!founder && kind === "internal" && (
          <PeoplePicker label="To" people={people.filter(p => !cc.includes(p.userId))} picked={picked} onChange={setPicked} />
        )}
        {!founder && (showCc || cc.length > 0) && (
          <PeoplePicker label="Cc" people={people.filter(p => !picked.includes(p.userId))} picked={cc} onChange={setCc} />
        )}
        {!founder && !showCc && cc.length === 0 && (
          <button type="button" style={{ ...btn, alignSelf: "flex-start", padding: "4px 10px" }} onClick={() => setShowCc(true)}>+ Cc a teammate</button>
        )}

        {(founder || kind === "support") && (
          <select value={category} onChange={e => setCategory(e.target.value)} aria-label="Topic" style={field}>
            {Object.entries(CATEGORY_LABEL).map(([k, l]) => <option key={k} value={k}>Topic: {l}</option>)}
          </select>
        )}

        <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject" aria-label="Subject" maxLength={200} style={field} />
        <textarea value={body} onChange={e => setBody(e.target.value)} rows={7} placeholder="Write your message" aria-label="Message" style={{ ...field, resize: "vertical" }} />

        {error && <div role="alert" style={{ color: "var(--red)", fontSize: 12 }}>{error}</div>}
        <button style={{ ...gold, padding: 10 }} disabled={busy || !subject.trim() || !body.trim() || needsRecipients || (founder && !orgChoice)} onClick={send}>
          {busy ? "Sending…" : "Send"}
        </button>
      </div>
    </div>
  );
}

function PeoplePicker({ label, people, picked, onChange }: { label: string; people: Person[]; picked: string[]; onChange: (ids: string[]) => void }) {
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const matches = people.filter(p => !picked.includes(p.userId) && (!needle || (p.name ?? "").toLowerCase().includes(needle) || (p.email ?? "").toLowerCase().includes(needle)));
  const chosen = people.filter(p => picked.includes(p.userId));
  return (
    <div>
      {chosen.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
          {chosen.map(p => (
            <button key={p.userId} onClick={() => onChange(picked.filter(id => id !== p.userId))} title="Remove"
              style={{ ...btn, padding: "3px 10px", background: "var(--gold)", color: "var(--gold-contrast)", borderColor: "var(--gold)" }}>{p.name ?? p.email} ✕</button>
          ))}
        </div>
      )}
      <input value={q} onChange={e => setQ(e.target.value)} placeholder={`${label}: search teammates by name or email`} aria-label={`${label}: search teammates`} style={field} />
      {q && (
        <div style={{ border: "1px solid var(--border)", borderRadius: 8, marginTop: 6, maxHeight: 140, overflowY: "auto" }}>
          {matches.length === 0 && <div style={{ padding: 10, fontSize: 12, color: "var(--text-muted)" }}>No matching teammates.</div>}
          {matches.map(p => (
            <button key={p.userId} onClick={() => { onChange([...picked, p.userId]); setQ(""); }}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 10px", background: "transparent", border: "none", borderBottom: "1px solid var(--border)", color: "var(--text-primary)", cursor: "pointer", fontFamily: "inherit" }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name ?? p.email}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{p.email}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
