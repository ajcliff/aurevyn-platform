"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import NotificationCenter from "@/components/NotificationCenter";

type Props = {
  isMobile: boolean;
  onOpenMobile: () => void;
  founderName: string;
  onOpenSearch: () => void;
};

export default function TopBar({ isMobile, onOpenMobile, founderName, onOpenSearch }: Props) {
  const router = useRouter();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const supabase = createClient();

  // Notification count
  useEffect(() => {
    supabase.from("notifications").select("id", { count: "exact" }).eq("read", false)
      .then(({ count }) => setUnreadCount(count ?? 0));

    const channel = supabase.channel(`notif-count-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => {
        supabase.from("notifications").select("id", { count: "exact" }).eq("read", false)
          .then(({ count }) => setUnreadCount(count ?? 0));
      }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <>
      <header style={{
        position: "fixed",
        top: 0, left: isMobile ? 0 : "var(--sidebar-width)", right: 0,
        height: "var(--topbar-height)",
        background: "var(--bg-surface)",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 16px",
        zIndex: 40,
        gap: "8px",
      }}>
        {/* Hamburger — mobile only */}
        {isMobile && (
          <button
            onClick={onOpenMobile}
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              width: 32,
              height: 32,
              cursor: "pointer",
              fontSize: 15,
              flexShrink: 0,
              color: "var(--text-secondary)",
            }}
          >
            ☰
          </button>
        )}

        {/* Search / command palette trigger */}
        <button
          onClick={onOpenSearch}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "7px 12px",
            borderRadius: "8px",
            border: "1px solid var(--border)",
            background: "var(--bg-card)",
            color: "var(--text-muted)",
            fontSize: "12px",
            cursor: "pointer",
            fontFamily: "inherit",
            textAlign: "left",
            flex: 1,
            maxWidth: "360px",
          }}
        >
          <span>🔍</span>
          <span style={{ flex: 1 }}>Search or jump to...</span>
          <span style={{
            fontSize: "10px", color: "var(--text-muted)",
            border: "1px solid var(--border)", borderRadius: "4px",
            padding: "1px 5px", flexShrink: 0,
          }}>⌘K</span>
        </button>

        {/* Right side */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
          {/* Notification bell */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowNotifications(prev => !prev)}
              style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: "16px", position: "relative", padding: "4px" }}
            >
              🔔
              {unreadCount > 0 && (
                <span style={{
                  position: "absolute", top: "-2px", right: "-2px",
                  background: "var(--gold)", color: "#07070f",
                  borderRadius: "50%", width: "14px", height: "14px",
                  fontSize: "8px", display: "flex", alignItems: "center",
                  justifyContent: "center", fontWeight: "bold",
                }}>{unreadCount}</span>
              )}
            </button>
            {showNotifications && <NotificationCenter onClose={() => setShowNotifications(false)} />}
          </div>

          {/* User badge */}
          <div style={{ position: "relative" }}>
            <div onClick={() => setShowMenu(prev => !prev)} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
              <div style={{
                width: "28px", height: "28px", borderRadius: "50%",
                background: "var(--gold-dim)", display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: "11px", fontWeight: "bold", color: "var(--gold-light)",
              }}>{founderName.charAt(0).toUpperCase()}</div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }}>{founderName}</span>
                <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>Founder</span>
              </div>
              <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>▾</span>
            </div>

            {showMenu && (
              <div style={{
                position: "absolute", top: "calc(100% + 8px)", right: 0,
                background: "var(--bg-elevated)", border: "1px solid var(--border)",
                borderRadius: "10px", padding: "6px", minWidth: "140px",
                boxShadow: "var(--shadow-lg)", zIndex: 100,
              }}>
                <button onClick={handleSignOut} style={{
                  width: "100%", padding: "8px 12px", borderRadius: "8px",
                  border: "none", background: "transparent", color: "#ef4444",
                  fontSize: "12px", cursor: "pointer", textAlign: "left",
                  display: "flex", alignItems: "center", gap: "8px", fontFamily: "inherit",
                }}>
                  ⎋ Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
}