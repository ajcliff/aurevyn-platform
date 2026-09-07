"use client";

import { useEffect, useState } from "react";
import Drawer from "@/components/Drawer";
import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";
import {
  getContactMessages,
  deleteContactMessage,
  type ContactMessage,
} from "@/lib/contactMessages";

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

export default function MessagesPage() {
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ContactMessage | null>(null);
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setLoadFailed(false);
    try {
      const data = await getContactMessages(200);
      setMessages(data);
    } catch (err) {
      console.error(err);
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }

  const filtered = messages.filter((m) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      m.name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      (m.subject ?? "").toLowerCase().includes(q) ||
      m.message.toLowerCase().includes(q)
    );
  });

  async function handleDelete(id: string) {
    if (!confirm("Delete this message? This can't be undone.")) return;
    setDeleting(true);
    try {
      await deleteContactMessage(id);
      setMessages((prev) => prev.filter((m) => m.id !== id));
      setSelected(null);
    } finally {
      setDeleting(false);
    }
  }

  function copyEmail(email: string) {
    navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) return <div style={{ padding: 20, fontSize: 13, color: "var(--text-muted)" }}>Loading messages...</div>;

  if (loadFailed) {
    return (
      <div style={{ padding: 20 }}>
        <EmptyState icon="⚠️" message="Couldn't load messages." actionLabel="Retry" onAction={load} />
      </div>
    );
  }

  return (
    <div style={{ overflowY: "auto", height: "100%" }}>
      <PageHeader
        title="Messages"
        subtitle="Submissions from the public contact form."
        actions={
          <button style={ghostButton} onClick={load}>Refresh</button>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 16 }}>
        <StatCard label="Total messages" value={messages.length} />
        <StatCard label="Most recent" value={messages[0] ? timeAgo(messages[0].created_at) : "—"} small />
      </div>

      <div style={{ marginBottom: 16 }}>
        <input
          placeholder="Search name, email, subject, or message..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle, width: "100%" }}
        />
      </div>

      <div className="card" style={cardStyle}>
        {filtered.length === 0 ? (
          <EmptyState
            icon="✉️"
            message={messages.length === 0 ? "No messages yet." : "No messages match your search."}
          />
        ) : (
          <>
            <div style={{ ...rowStyle, ...gridCols, borderBottom: "1px solid var(--border)", color: "var(--text-muted)", fontSize: 11, fontWeight: 600 }}>
              <span>TIME</span>
              <span>FROM</span>
              <span>SUBJECT</span>
              <span>MESSAGE</span>
            </div>
            {filtered.map((m) => (
              <div
                key={m.id}
                onClick={() => setSelected(m)}
                style={{ ...rowStyle, ...gridCols, cursor: "pointer" }}
              >
                <span style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                  {timeAgo(m.created_at)}
                </span>
                <span style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {m.name}
                </span>
                <span style={{ fontSize: 12, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {m.subject || "—"}
                </span>
                <span style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {m.message}
                </span>
              </div>
            ))}
          </>
        )}
      </div>

      <Drawer open={!!selected} onClose={() => setSelected(null)} title="Message" width={460}>
        {selected && (
          <>
            <DetailRow label="From" value={selected.name} />
            <DetailRow label="Email" value={selected.email} />
            {selected.subject && <DetailRow label="Subject" value={selected.subject} />}
            <DetailRow label="Time" value={new Date(selected.created_at).toLocaleString()} />

            <div style={{ fontSize: 11, color: "var(--text-muted)", margin: "14px 0 4px" }}>MESSAGE</div>
            <div
              style={{
                fontSize: 13,
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "10px 12px",
                marginBottom: 14,
                wordBreak: "break-word",
                whiteSpace: "pre-wrap",
              }}
            >
              {selected.message}
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
              <button style={{ ...ghostButton, flex: 1 }} onClick={() => copyEmail(selected.email)}>
                {copied ? "Copied ✓" : "Copy Email"}
              </button>
              <button
                style={{ ...dangerButton, flex: 1 }}
                onClick={() => handleDelete(selected.id)}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </>
        )}
      </Drawer>
    </div>
  );
}

function StatCard({ label, value, small }: { label: string; value: string | number; small?: boolean }) {
  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: small ? 16 : 22, fontWeight: 700, color: "var(--text-primary)" }}>{value}</div>
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
  gridTemplateColumns: "0.7fr 1fr 1fr 2fr",
};

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--bg-base)",
  color: "var(--text-primary)",
  fontSize: 13,
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
