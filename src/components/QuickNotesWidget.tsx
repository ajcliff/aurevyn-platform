"use client";

import { useEffect, useState } from "react";
import Drawer from "@/components/Drawer";
import {
  getActiveQuickNotes,
  getCompletedQuickNotes,
  createQuickNote,
  completeQuickNote,
  reopenQuickNote,
  deleteQuickNote,
  type QuickNote,
  type QuickNoteVisibility,
} from "@/lib/quickNotes";

type Props = {
  orgId: string | null;
};

export default function QuickNotesWidget({ orgId }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"active" | "history">("active");
  const [notes, setNotes] = useState<QuickNote[]>([]);
  const [history, setHistory] = useState<QuickNote[]>([]);
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState<QuickNoteVisibility>("private");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) load();
  }, [open, tab]);

  async function load() {
    setLoading(true);
    if (tab === "active") {
      setNotes(await getActiveQuickNotes(orgId));
    } else {
      setHistory(await getCompletedQuickNotes(orgId));
    }
    setLoading(false);
  }

  async function handleAdd() {
    if (!content.trim()) return;
    const created = await createQuickNote(orgId, content.trim(), visibility);
    if (created) {
      setContent("");
      setNotes((prev) => [created, ...prev]);
    }
  }

  async function handleComplete(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    await completeQuickNote(id);
  }

  async function handleReopen(id: string) {
    setHistory((prev) => prev.filter((n) => n.id !== id));
    await reopenQuickNote(id);
  }

  async function handleDelete(id: string) {
    setHistory((prev) => prev.filter((n) => n.id !== id));
    await deleteQuickNote(id);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        data-mobile-safe
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          zIndex: 9998,
          width: 48,
          height: 48,
          borderRadius: "50%",
          border: "1px solid var(--border)",
          background: "var(--bg-card)",
          color: "var(--text-primary)",
          fontSize: 20,
          cursor: "pointer",
          boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
        }}
        aria-label="Quick notes"
      >
        📝
      </button>

      <Drawer open={open} onClose={() => setOpen(false)} title="Quick Notes" width={400}>
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          <TabButton active={tab === "active"} onClick={() => setTab("active")}>
            Active
          </TabButton>
          <TabButton active={tab === "history"} onClick={() => setTab("history")}>
            History
          </TabButton>
        </div>

        {tab === "active" && (
          <>
            <textarea
              data-mobile-safe
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type a quick note or task..."
              rows={2}
              style={textareaStyle}
            />
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
              <select
                data-mobile-safe
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as QuickNoteVisibility)}
                style={selectStyle}
              >
                <option value="private">Only me</option>
                <option value="shared">Whole team</option>
              </select>
              <button data-mobile-safe onClick={handleAdd} style={primaryButton}>
                Add
              </button>
            </div>

            {loading ? (
              <div style={emptyStyle}>Loading...</div>
            ) : notes.length === 0 ? (
              <div style={emptyStyle}>No active notes.</div>
            ) : (
              notes.map((note) => (
                <div key={note.id} style={noteRow}>
                  <button
                    data-mobile-safe
                    onClick={() => handleComplete(note.id)}
                    style={checkButton}
                    aria-label="Mark complete"
                  >
                    ○
                  </button>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13 }}>{note.content}</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                      {note.visibility === "shared" ? "Team" : "Private"} · {timeAgo(note.created_at)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {tab === "history" && (
          <>
            {loading ? (
              <div style={emptyStyle}>Loading...</div>
            ) : history.length === 0 ? (
              <div style={emptyStyle}>No completed notes yet.</div>
            ) : (
              history.map((note) => (
                <div key={note.id} style={noteRow}>
                  <div style={{ flex: 1, opacity: 0.7 }}>
                    <div style={{ fontSize: 13, textDecoration: "line-through" }}>{note.content}</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                      Completed {note.completed_at ? timeAgo(note.completed_at) : ""}
                    </div>
                  </div>
                  <button data-mobile-safe onClick={() => handleReopen(note.id)} style={ghostButton}>
                    Reopen
                  </button>
                  <button data-mobile-safe onClick={() => handleDelete(note.id)} style={ghostButton}>
                    Delete
                  </button>
                </div>
              ))
            )}
          </>
        )}
      </Drawer>
    </>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      data-mobile-safe
      onClick={onClick}
      style={{
        flex: 1,
        padding: "8px 0",
        borderRadius: 8,
        border: "1px solid var(--border)",
        background: active ? "var(--bg-elevated)" : "transparent",
        color: active ? "var(--text-primary)" : "var(--text-muted)",
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

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

const textareaStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--bg-base)",
  color: "var(--text-primary)",
  fontSize: 13,
  resize: "vertical",
  marginBottom: 8,
};

const selectStyle: React.CSSProperties = {
  padding: "9px 10px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--bg-base)",
  color: "var(--text-primary)",
  fontSize: 12,
};

const primaryButton: React.CSSProperties = {
  flex: 1,
  padding: "9px 16px",
  borderRadius: 8,
  border: "none",
  background: "var(--accent, #3b82f6)",
  color: "#fff",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};

const ghostButton: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--text-secondary)",
  fontSize: 11,
  cursor: "pointer",
};

const checkButton: React.CSSProperties = {
  width: 22,
  height: 22,
  borderRadius: "50%",
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--text-muted)",
  fontSize: 12,
  cursor: "pointer",
  flexShrink: 0,
};

const noteRow: React.CSSProperties = {
  display: "flex",
  gap: 10,
  alignItems: "flex-start",
  padding: "10px 0",
  borderBottom: "1px solid var(--border)",
};

const emptyStyle: React.CSSProperties = {
  fontSize: 13,
  color: "var(--text-muted)",
  textAlign: "center",
  padding: "24px 0",
};
