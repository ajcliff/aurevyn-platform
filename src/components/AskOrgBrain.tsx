"use client";

import { useEffect, useState } from "react";
import { buildOrgBrainPrompt } from "@/lib/orgBrainContext";

interface Message {
  from: "user" | "ai";
  text: string;
}

const suggestions = [
  "What needs my attention today?",
  "Summarize this week's sales",
  "Any pending approvals?",
  "How's inventory looking?",
];

export default function AskOrgBrain({
  orgId,
  orgName,
  installedSlugs,
  onClose,
}: {
  orgId: string;
  orgName: string;
  installedSlugs: string[];
  onClose: () => void;
}) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { from: "ai", text: `Loading ${orgName}'s live data...` },
  ]);
  const [loading, setLoading] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    buildOrgBrainPrompt(orgId, orgName, installedSlugs).then((prompt) => {
      setSystemPrompt(prompt);
      setDataLoaded(true);
      setMessages([
        {
          from: "ai",
          text: `I've loaded ${orgName}'s live data — inventory, sales, and whatever else you've got running. What would you like to know?`,
        },
      ]);
    });
  }, [orgId]);

  const send = async (text: string) => {
    if (!text.trim() || loading || !dataLoaded) return;
    setMessages((prev) => [...prev, { from: "user", text }]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-5",
          max_tokens: 1000,
          system: systemPrompt,
          messages: [
            ...messages.map((m) => ({ role: m.from === "user" ? "user" : "assistant", content: m.text })),
            { role: "user", content: text },
          ],
        }),
      });

      const data = await response.json();
      if (data.error) {
        setMessages((prev) => [...prev, { from: "ai", text: "AI services are temporarily unavailable — try again shortly." }]);
      } else {
        const reply = data.content?.[0]?.text ?? "Something went wrong. Try again.";
        setMessages((prev) => [...prev, { from: "ai", text: reply }]);
      }
    } catch (err) {
      setMessages((prev) => [...prev, { from: "ai", text: `Error: ${String(err)}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "520px",
          maxWidth: "95vw",
          height: "600px",
          maxHeight: "90vh",
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "20px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: "14px", fontWeight: 700 }}>Ask AUREVYN — {orgName}</div>
            <div style={{ fontSize: "10px", color: dataLoaded ? "var(--green)" : "var(--text-muted)" }}>
              {dataLoaded ? "● Live data loaded" : "● Loading..."}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "16px" }}
          >
            ✕
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: "12px" }}>
          {messages.map((m, i) => (
            <div
              key={i}
              style={{
                alignSelf: m.from === "user" ? "flex-end" : "flex-start",
                maxWidth: "85%",
                background: m.from === "user" ? "var(--gold-dim)" : "var(--bg-elevated)",
                color: m.from === "user" ? "var(--gold-light)" : "var(--text-primary)",
                padding: "10px 14px",
                borderRadius: m.from === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                fontSize: "13px",
                lineHeight: "1.5",
                border: "1px solid var(--border)",
                whiteSpace: "pre-wrap",
              }}
            >
              {m.text}
            </div>
          ))}

          {loading && (
            <div style={{ alignSelf: "flex-start", color: "var(--text-muted)", fontSize: "13px" }}>Thinking...</div>
          )}

          {messages.length === 1 && !loading && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => send(s)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "20px",
                    border: "1px solid var(--border)",
                    background: "var(--bg-elevated)",
                    color: "var(--text-secondary)",
                    fontSize: "11px",
                    cursor: "pointer",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", gap: "8px" }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send(input)}
            placeholder={dataLoaded ? "Ask about your business..." : "Loading..."}
            disabled={!dataLoaded}
            style={{
              flex: 1,
              padding: "10px 14px",
              borderRadius: "10px",
              border: "1px solid var(--border)",
              background: "var(--bg-elevated)",
              color: "var(--text-primary)",
              fontSize: "13px",
              outline: "none",
            }}
          />
          <button
            onClick={() => send(input)}
            disabled={loading || !dataLoaded}
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              border: "none",
              background: loading || !dataLoaded ? "var(--bg-elevated)" : "var(--gold)",
              color: loading || !dataLoaded ? "var(--text-muted)" : "#07070f",
              cursor: loading || !dataLoaded ? "not-allowed" : "pointer",
            }}
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}