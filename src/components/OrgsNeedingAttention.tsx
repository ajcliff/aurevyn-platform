"use client";

import { useRouter } from "next/navigation";
import type { Organization } from "@/lib/organizations";

const statusColor: Record<string, string> = {
  warning: "#f59e0b",
  critical: "#ef4444",
};

const statusLabel: Record<string, string> = {
  warning: "Needs review",
  critical: "Critical",
};

export default function OrgsNeedingAttention({
  orgs,
  onStatusChange,
}: {
  orgs: Organization[];
  onStatusChange: (id: string, status: Organization["status"]) => void;
}) {
  const router = useRouter();
  const flagged = orgs
    .filter(o => o.status !== "operational")
    .sort((a, b) => (a.status === "critical" ? -1 : 1));

  return (
    <div style={{
      background: "var(--bg-card)",
      border: "1px solid var(--border)",
      borderRadius: "16px",
      padding: "20px",
      display: "flex",
      flexDirection: "column",
      gap: "12px",
      flex: 1,
    }}>
      <div>
        <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>Orgs Needing Attention</h3>
        <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--text-muted)" }}>
          {flagged.length === 0 ? "All organizations operational" : `${flagged.length} organization${flagged.length !== 1 ? "s" : ""} flagged`}
        </p>
      </div>

      {flagged.length === 0 ? (
        <div style={{ padding: "24px 0", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
          ✓ Nothing needs your attention right now.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {flagged.map(org => (
            <div
              key={org.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 12px",
                borderRadius: "10px",
                background: "var(--bg-elevated)",
                border: `1px solid ${statusColor[org.status]}30`,
              }}
            >
              <span
                onClick={() => router.push(`/dashboard/organizations?highlight=${org.id}`)}
                style={{
                  width: "8px", height: "8px", borderRadius: "50%",
                  background: statusColor[org.status], boxShadow: `0 0 6px ${statusColor[org.status]}`,
                  flexShrink: 0, cursor: "pointer",
                }}
              />
              <div
                onClick={() => router.push(`/dashboard/organizations?highlight=${org.id}`)}
                style={{ flex: 1, minWidth: 0, cursor: "pointer" }}
              >
                <div style={{ fontSize: "13px", fontWeight: 600 }}>{org.name}</div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{org.location} · {org.package}</div>
              </div>
              <select
                value={org.status}
                onClick={e => e.stopPropagation()}
                onChange={e => onStatusChange(org.id, e.target.value as Organization["status"])}
                style={{
                  fontSize: "10px", fontWeight: 700, color: statusColor[org.status],
                  textTransform: "uppercase", flexShrink: 0,
                  background: "var(--bg-card)", border: `1px solid ${statusColor[org.status]}60`,
                  borderRadius: "6px", padding: "3px 6px", fontFamily: "inherit", cursor: "pointer",
                }}
              >
                <option value="operational">Operational</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
