"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";

interface Message {
  from: "user" | "ai";
  text: string;
}

const suggestions = [
  "Show revenue summary",
  "Which orgs need attention?",
  "Recommend growth strategies",
  "List expiring packages",
  "How is system health?",
];

export default function AskAurevyn({ onClose }: { onClose: () => void }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { from: "ai", text: "Hello Cliford! 👋 I'm your AUREVYN intelligence layer. Give me a moment to load your platform data..." },
  ]);
  const [loading, setLoading] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    const loadPlatformData = async () => {
      const supabase = createClient();

      const [
        { data: orgs },
        { data: invoices },
        { data: packages },
        { data: modules },
        { data: notifications },
      ] = await Promise.all([
        supabase.from("organizations").select("*"),
        supabase.from("invoices").select("*"),
        supabase.from("packages").select("*"),
        supabase.from("modules").select("*"),
        supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(5),
      ]);

      const totalRevenue = orgs?.reduce((sum, o) => sum + (parseInt(o.revenue?.replace(/[^0-9]/g, "") ?? "0") || 0), 0) ?? 0;
      const activeOrgs = orgs?.filter(o => o.status === "operational").length ?? 0;
      const warningOrgs = orgs?.filter(o => o.status === "warning") ?? [];
      const criticalOrgs = orgs?.filter(o => o.status === "critical") ?? [];
      const overdueInvoices = invoices?.filter(i => i.status === "overdue") ?? [];
      const pendingInvoices = invoices?.filter(i => i.status === "pending") ?? [];
      const activeModules = modules?.filter(m => m.status === "active").length ?? 0;
      const totalOverdue = overdueInvoices.reduce((sum, i) => sum + (parseInt(i.amount?.replace(/[^0-9]/g, "") ?? "0") || 0), 0);
      const totalPending = pendingInvoices.reduce((sum, i) => sum + (parseInt(i.amount?.replace(/[^0-9]/g, "") ?? "0") || 0), 0);

      const prompt = `You are AUREVYN Intelligence, the AI business assistant for the AUREVYN platform — a modular enterprise SaaS operating layer for organizations across Africa, primarily Kenya. The founder is Cliford.

LIVE PLATFORM DATA (pulled right now from the database):

ORGANIZATIONS (${orgs?.length ?? 0} total):
- Active/Operational: ${activeOrgs}
- Warning: ${warningOrgs.map(o => o.name).join(", ") || "None"}
- Critical: ${criticalOrgs.map(o => o.name).join(", ") || "None"}
- Full list: ${orgs?.map(o => `${o.name} (${o.location}, ${o.status}, ${o.revenue}, ${o.package} package)`).join("; ") ?? "None"}

REVENUE:
- Total monthly revenue: KES ${totalRevenue.toLocaleString()}
- Overdue amount: KES ${totalOverdue.toLocaleString()} across ${overdueInvoices.length} invoice(s)
- Pending amount: KES ${totalPending.toLocaleString()} across ${pendingInvoices.length} invoice(s)

PACKAGES (${packages?.length ?? 0} total):
${packages?.map(p => `- ${p.name}: ${p.price}, ${p.orgs} orgs subscribed`).join("\n") ?? "None"}

MODULES:
- Active: ${activeModules} of ${modules?.length ?? 0} total
- Most used: ${modules?.sort((a, b) => b.orgs_using - a.orgs_using).slice(0, 3).map(m => m.name).join(", ") ?? "None"}

RECENT ALERTS:
${notifications?.map(n => `- ${n.title}: ${n.message}`).join("\n") ?? "None"}

INSTRUCTIONS:
- Be concise, sharp, and insightful
- Respond as a seasoned business intelligence assistant
- Use bullet points for lists
- Keep responses under 150 words unless asked for detail
- Reference specific org names, amounts, and numbers from the data above
- Always speak in present tense about current platform state`;

      setSystemPrompt(prompt);
      setDataLoaded(true);
      setMessages([{
        from: "ai",
        text: `Hello Cliford! 👋 I've loaded your live platform data. You have ${orgs?.length ?? 0} organizations, KES ${totalRevenue.toLocaleString()} in monthly revenue, and ${overdueInvoices.length > 0 ? `⚠ ${overdueInvoices.length} overdue invoice(s) needing attention` : "all invoices are current"}. What would you like to know?`,
      }]);
    };

    loadPlatformData();
  }, []);

  const send = async (text: string) => {
    if (!text.trim() || loading || !dataLoaded) return;
    const userMsg: Message = { from: "user", text };
    setMessages(prev => [...prev, userMsg]);
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
            ...messages.map(m => ({ role: m.from === "user" ? "user" : "assistant", content: m.text })),
            { role: "user", content: text },
          ],
        }),
      });

const data = await response.json();
      if (data.error) {
        setMessages(prev => [...prev, { from: "ai", text: "AI services are currently unavailable. Full intelligence coming soon — your platform data is loaded and ready. 🚀" }]);
      } else {
        const reply = data.content?.[0]?.text ?? "Something went wrong. Try again.";
        setMessages(prev => [...prev, { from: "ai", text: reply }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { from: "ai", text: `Error: ${String(err)}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: "520px", maxWidth: "95vw", height: "600px", maxHeight: "90vh",
        background: "var(--bg-surface)", border: "1px solid var(--border)",
        borderRadius: "20px", display: "flex", flexDirection: "column",
        overflow: "hidden", boxShadow: "var(--shadow-lg)",
        animation: "fadeUp 0.2s ease",
      }}>

        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "32px", height: "32px", borderRadius: "50%", overflow: "hidden",
              border: "2px solid var(--gold)", flexShrink: 0,
            }}>
              <img src="/icon.png" alt="AUREVYN" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 700 }}>Ask AUREVYN</div>
              <div style={{ fontSize: "10px", color: dataLoaded ? "var(--green)" : "var(--text-muted)" }}>
                {dataLoaded ? "● Live data loaded" : "● Loading platform data..."}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "16px", padding: "4px 8px", borderRadius: "6px" }}>✕</button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: "12px" }}>
          {messages.map((m, i) => (
            <div key={i} style={{
              alignSelf: m.from === "user" ? "flex-end" : "flex-start",
              maxWidth: "85%",
              background: m.from === "user" ? "var(--gold-dim)" : "var(--bg-elevated)",
              color: m.from === "user" ? "var(--gold-light)" : "var(--text-primary)",
              padding: "10px 14px",
              borderRadius: m.from === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
              fontSize: "13px", lineHeight: "1.5",
              border: "1px solid var(--border)",
              whiteSpace: "pre-wrap",
            }}>
              {m.text}
            </div>
          ))}

          {loading && (
            <div style={{
              alignSelf: "flex-start", background: "var(--bg-elevated)",
              border: "1px solid var(--border)", padding: "10px 14px",
              borderRadius: "14px 14px 14px 4px", fontSize: "13px", color: "var(--text-muted)",
            }}>
              Thinking...
            </div>
          )}

          {messages.length === 1 && !loading && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "4px" }}>
              {suggestions.map((s, i) => (
                <button key={i} onClick={() => send(s)} style={{
                  padding: "6px 12px", borderRadius: "20px",
                  border: "1px solid var(--border)", background: "var(--bg-elevated)",
                  color: "var(--text-secondary)", fontSize: "11px", cursor: "pointer",
                  fontFamily: "inherit",
                }}>
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Input */}
        <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", gap: "8px", alignItems: "center" }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && send(input)}
            placeholder={dataLoaded ? "Ask anything about your network..." : "Loading data..."}
            disabled={!dataLoaded}
            style={{
              flex: 1, padding: "10px 14px", borderRadius: "10px",
              border: "1px solid var(--border)", background: "var(--bg-elevated)",
              color: "var(--text-primary)", fontSize: "13px", outline: "none",
              fontFamily: "inherit", opacity: dataLoaded ? 1 : 0.5,
            }}
          />
          <button onClick={() => send(input)} disabled={loading || !dataLoaded} style={{
            width: "36px", height: "36px", borderRadius: "10px", border: "none",
            background: loading || !dataLoaded ? "var(--bg-elevated)" : "var(--gold)",
            color: loading || !dataLoaded ? "var(--text-muted)" : "#07070f",
            fontSize: "14px", cursor: loading || !dataLoaded ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>➤</button>
        </div>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}