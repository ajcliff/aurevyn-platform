"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { Compose, type Person } from "@/components/mail/MailView";

// Drop this next to anything that can be sent to a teammate (an invoice, a purchase order, a payslip, an approval).
// Recipients are read from this organization's members only, and the server refuses anyone outside it.
export default function SendMailButton({ orgId, subject, body, attachments, label = "✉ Send", style }: {
  orgId: string; subject?: string; body?: string; attachments?: { documentId: string; name: string }[]; label?: string; style?: React.CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  const [people, setPeople] = useState<Person[]>([]);
  const [sent, setSent] = useState(false);

  async function start() {
    const supabase = createClient();
    const [{ data: auth }, { data }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from("org_users").select("user_id, full_name, email").eq("org_id", orgId),
    ]);
    setPeople((data ?? []).filter(m => m.user_id !== auth.user?.id).map(m => ({ userId: m.user_id, name: m.full_name, email: m.email })));
    setSent(false);
    setOpen(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={start}
        style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 11, cursor: "pointer", ...style }}
      >
        {sent ? "✓ Sent" : label}
      </button>
      {open && (
        <Compose
          founder={false}
          endpoint="/api/org/mail"
          orgId={orgId}
          people={people}
          orgs={[]}
          initial={{ kind: "internal", subject, body, attachments }}
          onClose={() => setOpen(false)}
          onSent={() => { setOpen(false); setSent(true); }}
        />
      )}
    </>
  );
}
