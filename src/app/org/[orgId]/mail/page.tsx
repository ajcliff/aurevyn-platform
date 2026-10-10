"use client";

import { useEngine } from "@/lib/runtime/EngineContext";
import MailView from "@/components/mail/MailView";

export default function OrgMailPage() {
  const { organization } = useEngine();

  return (
    <div style={{ padding: "20px 4px 0", display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Mail</h1>
        <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
          Write to teammates, or to AUREVYN Support about billing, problems and ideas. Replies appear here and by email.
        </p>
      </div>
      <MailView mode="org" orgId={organization.id} />
    </div>
  );
}
