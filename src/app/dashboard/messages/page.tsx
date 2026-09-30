"use client";

import { useEffect, useState } from "react";
import DashboardDrawer, { DrawerFieldList } from "@/components/DashboardDrawer";
import ConfirmDialog from "@/components/founder/ConfirmDialog";
import { getContactMessages, deleteContactMessage, type ContactMessage } from "@/lib/contactMessages";
import f from "@/styles/founder.module.css";

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function MessagesPage() {
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ContactMessage | null>(null);
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ContactMessage | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setLoadFailed(false);
    try {
      setMessages(await getContactMessages(200));
    } catch (err) {
      console.error(err);
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }

  const filtered = messages.filter(m => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q) ||
      (m.subject ?? "").toLowerCase().includes(q) || m.message.toLowerCase().includes(q);
  });

  async function handleDelete(m: ContactMessage) {
    setDeleting(true);
    try {
      await deleteContactMessage(m.id);
      setMessages(prev => prev.filter(x => x.id !== m.id));
      if (selected?.id === m.id) setSelected(null);
    } finally {
      setDeleting(false);
      setConfirmDelete(null);
    }
  }

  function copyEmail(email: string) {
    navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className={`page-shell ${f.root}`}>
      <main className={selected ? "page-main-drawer" : "page-main"}>
        <div className={f.page}>
          <div className={f.top}>
            <div>
              <p className={f.greeting}>Messages</p>
              <h1 className={`${f.headline} ${f.headlineWide}`}>
                {loading ? "Loading messages" : messages.length === 0 ? "No messages yet." : `${messages.length} ${messages.length === 1 ? "submission" : "submissions"} from the contact form.`}
              </h1>
            </div>
            <div className={f.actions}>
              <button className={f.secondary} onClick={load}>Refresh</button>
            </div>
          </div>

          {loadFailed && (
            <div className={f.empty}><strong>Couldn&apos;t load messages.</strong><div><button className={f.secondary} onClick={load}>Retry</button></div></div>
          )}

          {loading ? (
            <p className={f.status} role="status">Loading messages…</p>
          ) : (
            <>
              <div className={`${f.vitals} ${f.vitalsThree}`} style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
                <div className={`${f.vital} ${f.vitalStatic}`}>
                  <span className={f.vitalLabel}>Total messages</span>
                  <span className={f.vitalValue}>{messages.length}</span>
                </div>
                <div className={`${f.vital} ${f.vitalStatic}`}>
                  <span className={f.vitalLabel}>Most recent</span>
                  <span className={f.vitalValue}>{messages[0] ? timeAgo(messages[0].created_at) : "—"}</span>
                </div>
              </div>

              <input
                className={f.input}
                type="search"
                placeholder="Search name, email, subject, or message"
                value={search}
                onChange={e => setSearch(e.target.value)}
                aria-label="Search messages"
              />

              {filtered.length === 0 ? (
                <div className={f.empty}>
                  <strong>{messages.length === 0 ? "No messages yet." : "No messages match your search."}</strong>
                  {messages.length === 0 && "Submissions from the public contact form will show up here."}
                </div>
              ) : (
                <div className={f.inbox}>
                  {filtered.map(m => (
                    <button key={m.id} className={f.inboxItem} onClick={() => setSelected(m)}>
                      <span className={f.inboxIcon} aria-hidden="true">✉️</span>
                      <span className={f.inboxMain}>
                        <span className={f.inboxTop}>
                          <span className={f.inboxFrom}>{m.name}</span>
                        </span>
                        <span className={f.inboxSubject}>{m.subject || "No subject"}</span>
                        <span className={f.inboxPreview}>{m.message}</span>
                      </span>
                      <span className={f.inboxTime}>{timeAgo(m.created_at)}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {selected && (
        <DashboardDrawer title="Message" onClose={() => setSelected(null)}>
          <DrawerFieldList
            items={[
              { label: "From", value: selected.name },
              { label: "Email", value: selected.email },
              ...(selected.subject ? [{ label: "Subject", value: selected.subject }] : []),
              { label: "Time", value: new Date(selected.created_at).toLocaleString() },
            ]}
          />
          <div style={{ marginTop: 16 }}>
            <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>Message</label>
            <div className={f.hint} style={{ background: "var(--bg-elevated)", border: "1px solid var(--rule)", borderRadius: 8, padding: "10px 12px", marginTop: 6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {selected.message}
            </div>
          </div>
          <div className={f.dialogActions} style={{ justifyContent: "flex-start", marginTop: 20 }}>
            <button className={f.secondary} onClick={() => copyEmail(selected.email)}>{copied ? "Copied ✓" : "Copy email"}</button>
            <button className={f.dangerBtn} style={{ width: "auto" }} disabled={deleting} onClick={() => setConfirmDelete(selected)}>
              {deleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        </DashboardDrawer>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Delete this message?"
          message="This can't be undone."
          confirmLabel="Delete"
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
