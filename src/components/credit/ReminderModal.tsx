"use client";

import { useEffect, useMemo, useState } from "react";
import type { CreditSummary } from "@/lib/customerCredit";
import { logActivity } from "@/lib/activity";
import {
  BUILTIN_REMINDERS,
  REMINDER_FIELDS,
  deleteTemplate,
  fillTemplate,
  getTemplates,
  saveTemplate,
  toInternationalPhone,
  unfilledGaps,
  type MessageTemplate,
} from "@/lib/messageTemplates";

const kes = (n: number) => `KES ${Math.round(n).toLocaleString()}`;

type Channel = "whatsapp" | "sms" | "email";

// Opens the message ready to send in WhatsApp, the phone's SMS app, or the user's mail app.
// Nothing is sent from our servers, so it works today, with no mail domain set up.
export default function ReminderModal({ orgId, orgName, row, onClose }: { orgId: string; orgName: string; row: CreditSummary; onClose: () => void }) {
  const c = row.customer;
  const [saved, setSaved] = useState<MessageTemplate[]>([]);
  const templates = useMemo(() => [...BUILTIN_REMINDERS, ...saved], [saved]);
  const [templateId, setTemplateId] = useState(BUILTIN_REMINDERS[0].id);
  const [subject, setSubject] = useState(BUILTIN_REMINDERS[0].subject);
  const [body, setBody] = useState(BUILTIN_REMINDERS[0].body);
  const [channel, setChannel] = useState<Channel>(c.phone ? "whatsapp" : "email");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  useEffect(() => {
    getTemplates(orgId).then(setSaved).catch(() => {});
  }, [orgId]);

  const values = {
    customer_name: c.name,
    business_name: orgName,
    amount_owed: kes(row.balance),
    amount_overdue: kes(row.overdue > 0 ? row.overdue : row.balance),
    oldest_due: row.oldestDue ?? "the due date",
  };
  const finalBody = fillTemplate(body, values);
  const finalSubject = fillTemplate(subject, values);
  const gaps = unfilledGaps(finalBody);
  const current = templates.find((t) => t.id === templateId);

  function pick(id: string) {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setTemplateId(id);
    setSubject(t.subject);
    setBody(t.body);
    setError("");
    setInfo("");
  }

  async function send() {
    setError("");
    if (gaps.length) return setError(`Fill in the gap${gaps.length > 1 ? "s" : ""} first: ${gaps.map((g) => `[${g}]`).join(", ")}`);
    if (channel !== "email" && !c.phone) return setError("This customer has no phone number.");
    if (channel === "email" && !c.email) return setError("This customer has no email address. Add one under Edit.");

    const text = encodeURIComponent(finalBody);
    const url =
      channel === "whatsapp" ? `https://wa.me/${toInternationalPhone(c.phone!)}?text=${text}`
      : channel === "sms" ? `sms:+${toInternationalPhone(c.phone!)}?&body=${text}`
      : `mailto:${c.email}?subject=${encodeURIComponent(finalSubject)}&body=${text}`;
    window.open(url, "_blank");

    logActivity({
      icon: "🔔",
      title: "Payment reminder opened",
      sub: `${c.name} · ${kes(row.balance)} · ${channel === "whatsapp" ? "WhatsApp" : channel === "sms" ? "SMS" : "email"}`,
      org_id: orgId,
    }).catch(() => {});
  }

  async function saveAsTemplate() {
    setError("");
    setInfo("");
    const name = window.prompt("Name this template (for example: Gentle nudge)");
    if (!name?.trim()) return;
    try {
      await saveTemplate(orgId, { name: name.trim(), subject, body });
      setSaved(await getTemplates(orgId));
      setInfo("Saved. Everyone in your business can use it.");
    } catch {
      setError("Only owners and admins can save templates.");
    }
  }

  async function removeTemplate() {
    if (!current || current.builtin) return;
    if (!window.confirm(`Delete the template "${current.name}"?`)) return;
    try {
      await deleteTemplate(current.id);
      setSaved(await getTemplates(orgId));
      pick(BUILTIN_REMINDERS[0].id);
    } catch {
      setError("Only owners and admins can delete templates.");
    }
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div>
            <h2 style={{ fontSize: 17 }}>Send reminder</h2>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{c.name} owes {kes(row.balance)}{row.overdue > 0 ? ` (${kes(row.overdue)} overdue)` : ""}</div>
          </div>
          <button style={ghost} onClick={onClose}>Close</button>
        </div>

        <label style={label}>Template</label>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <select style={{ ...input, flex: 1 }} value={templateId} onChange={(e) => pick(e.target.value)}>
            {templates.map((t) => <option key={t.id} value={t.id}>{t.builtin ? t.name : `${t.name} (yours)`}</option>)}
          </select>
          {current && !current.builtin && <button style={ghost} onClick={removeTemplate}>Delete</button>}
        </div>

        <label style={label}>Message</label>
        <textarea style={{ ...input, minHeight: 110 }} value={body} onChange={(e) => setBody(e.target.value)} />
        <div style={{ fontSize: 11, color: "var(--text-muted)", margin: "4px 0 10px" }}>
          Filled in for each customer: {REMINDER_FIELDS.join(" ")}. Replace anything in [square brackets] with your own details, then save it as a template so you only do it once.
        </div>

        <label style={label}>What the customer will see</label>
        <div style={{ ...input, whiteSpace: "pre-wrap", marginBottom: 10, background: "var(--bg-base)" }}>{finalBody}</div>

        {channel === "email" && (
          <>
            <label style={label}>Subject</label>
            <input style={{ ...input, marginBottom: 10 }} value={subject} onChange={(e) => setSubject(e.target.value)} />
          </>
        )}

        <label style={label}>Send by</label>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {([["whatsapp", "WhatsApp"], ["sms", "SMS"], ["email", "Email"]] as [Channel, string][]).map(([v, text]) => (
            <button key={v} onClick={() => setChannel(v)} style={{ ...ghost, flex: 1, ...(channel === v ? { borderColor: "var(--gold)", color: "var(--gold)", fontWeight: 700 } : {}) }}>{text}</button>
          ))}
        </div>

        {error && <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 8 }}>{error}</div>}
        {info && <div style={{ color: "#3dd68c", fontSize: 13, marginBottom: 8 }}>{info}</div>}

        <div style={{ display: "flex", gap: 8 }}>
          <button style={ghost} onClick={saveAsTemplate}>Save as template</button>
          <button style={{ ...gold, flex: 1 }} onClick={send}>Open {channel === "whatsapp" ? "WhatsApp" : channel === "sms" ? "SMS" : "email"}</button>
        </div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>
          This opens the message ready to send from your own phone or mail app, so it comes from you.
        </div>
      </div>
    </div>
  );
}

const overlay: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 10000 };
const modal: React.CSSProperties = { width: 520, maxWidth: "94vw", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 22, maxHeight: "90vh", overflowY: "auto" };
const label: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 };
const input: React.CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-base)", color: "var(--text-primary)", fontSize: 13 };
const gold: React.CSSProperties = { background: "var(--gold)", color: "var(--gold-contrast)", border: "none", borderRadius: 10, padding: "8px 16px", fontWeight: 700, fontSize: 12, cursor: "pointer" };
const ghost: React.CSSProperties = { padding: "8px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 12, cursor: "pointer" };
