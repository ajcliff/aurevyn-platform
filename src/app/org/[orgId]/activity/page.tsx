"use client";

import { useEffect, useState } from "react";
import { useEngine } from "@/lib/runtime/EngineContext";
import { getOrgActivity, type Activity } from "@/lib/activity";
import Drawer from "@/components/Drawer";
function timeLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString("en-KE", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const ICON_BG: Record<string, string> = {
  "✉": "rgba(91,156,245,0.15)",
  "📄": "rgba(201,168,76,0.15)",
  "📦": "rgba(201,168,76,0.15)",
  "✅": "rgba(61,214,140,0.15)",
  "🛒": "rgba(91,156,245,0.15)",
  "📝": "rgba(245,185,66,0.15)",
};

export default function ActivityTimelinePage() {
  const { organization } = useEngine();
const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Activity | null>(null);
  useEffect(() => {
    getOrgActivity(organization.id).then((data) => {
      setActivity(data);
      setLoading(false);
    });
  }, [organization.id]);

  if (loading) return <div>Loading activity...</div>;

  return (
    <div style={{ overflowY: "auto", height: "100%" }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Activity</h1>
        <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
          Everything that's happened in {organization.name}, most recent first.
        </p>
      </div>

      {activity.length === 0 ? (
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: 24,
            textAlign: "center",
            color: "var(--text-muted)",
            fontSize: 13,
          }}
        >
          Nothing logged yet. Actions across Inventory, POS, CRM, and HR will show up here.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: "12px",
          }}
        >
          {activity.map((a) => (
            <div
              key={a.id}
              onClick={() => setSelected(a)}
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "14px",
                display: "flex",
                flexDirection: "column",
                gap: 8,
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 9,
                    background: ICON_BG[a.icon ?? ""] ?? "var(--bg-elevated)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 15,
                    flexShrink: 0,
                  }}
                >
                  {a.icon}
                </span>
                <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {a.title}
                </div>
              </div>

              <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{a.sub}</div>

              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                {timeLabel(a.created_at)}
                {a.user_name ? ` · ${a.user_name}` : ""}
              </div>
            </div>
          ))}
      </div>
      )}

      <Drawer open={!!selected} onClose={() => setSelected(null)} title={selected?.title ?? ""}>
        {selected && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontSize: 32 }}>{selected.icon}</div>
            <div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Details</div>
              <div style={{ fontSize: 14 }}>{selected.sub}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>When</div>
              <div style={{ fontSize: 14 }}>{timeLabel(selected.created_at)}</div>
            </div>
            {selected.user_name && (
              <div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>By</div>
                <div style={{ fontSize: 14 }}>{selected.user_name}</div>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}