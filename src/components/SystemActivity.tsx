"use client";

import { useEffect, useState } from "react";
import { getActivity, type Activity } from "@/lib/activity";
import { createClient } from "@/lib/supabase";

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function SystemActivity() {
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    getActivity().then(setActivities);

    const supabase = createClient();
    const channel = supabase
      .channel("activity-feed")
    .on("postgres_changes", {
  event: "INSERT",
  schema: "public",
  table: "activity",
}, (payload) => {
  const entry = payload.new as Activity;
  if (entry.org_id) return;
  setActivities(prev => [entry, ...prev].slice(0, 10));
})
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div style={{
      background: "var(--bg-card)",
      border: "1px solid var(--border)",
      borderRadius: "14px",
      padding: "20px",
      flex: 1,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div>
          <div style={{ fontSize: "14px", fontWeight: "600" }}>System Activity</div>
          <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Live system feed</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--green)", display: "inline-block", boxShadow: "0 0 6px var(--green)" }} />
          <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>Live</span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {activities.map((a, i) => (
          <div key={a.id} style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "10px 8px",
            borderRadius: "8px",
            borderBottom: i < activities.length - 1 ? "1px solid var(--border)" : "none",
          }}>
            <span style={{ fontSize: "16px", minWidth: "24px" }}>{a.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "12px", color: "var(--text-primary)" }}>{a.title}</div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{a.sub}</div>
            </div>
            <span style={{ fontSize: "11px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
              {timeAgo(a.created_at)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}