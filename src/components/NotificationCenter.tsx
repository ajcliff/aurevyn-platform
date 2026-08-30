"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { getNotifications, markAsRead, markAllAsRead, type Notification } from "@/lib/notifications";

const typeColors: Record<string, string> = {
  new_org: "#3dd68c",
  overdue_invoice: "#ef4444",
  system_alert: "#f59e0b",
};

const typeIcons: Record<string, string> = {
  new_org: "🏢",
  overdue_invoice: "⚠",
  system_alert: "⚡",
};

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationCenter({ onClose }: { onClose: () => void }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    getNotifications().then(setNotifications);

    const supabase = createClient();
    const channel = supabase
      .channel("notifications-realtime")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
      }, (payload) => {
        setNotifications(prev => [payload.new as Notification, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const unread = notifications.filter(n => !n.read).length;

  const handleMarkRead = async (n: Notification) => {
    if (n.read) return;
    await markAsRead(n.id);
    setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 200,
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "flex-end",
      paddingTop: "60px",
      paddingRight: "290px",
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "360px",
          maxHeight: "500px",
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          boxShadow: "var(--shadow-lg)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "fadeUp 0.2s ease",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "14px 16px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "14px", fontWeight: 700 }}>Notifications</span>
            {unread > 0 && (
              <span style={{
                background: "var(--gold)",
                color: "#07070f",
                fontSize: "10px",
                fontWeight: 700,
                padding: "2px 7px",
                borderRadius: "20px",
              }}>{unread}</span>
            )}
          </div>
          {unread > 0 && (
            <button onClick={handleMarkAllRead} style={{
              background: "none", border: "none",
              color: "var(--gold)", fontSize: "11px",
              cursor: "pointer", fontFamily: "inherit",
            }}>
              Mark all read
            </button>
          )}
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {notifications.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
              No notifications yet
            </div>
          ) : notifications.map((n, i) => (
            <div
              key={n.id}
              onClick={() => handleMarkRead(n)}
              style={{
                padding: "12px 16px",
                borderBottom: i < notifications.length - 1 ? "1px solid var(--border)" : "none",
                background: n.read ? "transparent" : "var(--bg-elevated)",
                cursor: "pointer",
                display: "flex",
                gap: "12px",
                alignItems: "flex-start",
                transition: "background 0.15s ease",
              }}
            >
              <span style={{ fontSize: "18px", flexShrink: 0 }}>{typeIcons[n.type] ?? "🔔"}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: typeColors[n.type] ?? "var(--text-primary)" }}>{n.title}</span>
                  {!n.read && <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--gold)", flexShrink: 0, display: "inline-block" }} />}
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-secondary)", lineHeight: 1.4 }}>{n.message}</div>
                <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px" }}>{timeAgo(n.created_at)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}