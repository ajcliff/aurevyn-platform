"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import NotificationCenter from "@/components/NotificationCenter";
import InstallAppButton from "@/components/InstallAppButton";
import Icon from "@/components/Icon";
import s from "@/styles/founderShell.module.css";

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

  useEffect(() => {
    const refresh = () =>
      supabase.from("notifications").select("id", { count: "exact" }).eq("read", false)
        .then(({ count }) => setUnreadCount(count ?? 0));
    refresh();

    const channel = supabase.channel(`notif-count-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, refresh)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <header className={s.bar} style={{ left: isMobile ? 0 : "var(--sidebar-width)" }}>
      {isMobile && (
        <button className={s.iconBtn} onClick={onOpenMobile} aria-label="Open menu"><Icon name="menu" /></button>
      )}

      <button className={s.searchBtn} onClick={onOpenSearch} aria-label="Search or jump to a page">
        <Icon name="search" size={16} />
        <span>Search or jump to…</span>
        {!isMobile && <span className={s.kbd}>⌘K</span>}
      </button>

      <div className={s.right}>
        <div style={{ position: "relative" }}>
          <button
            className={s.iconBtn}
            onClick={() => setShowNotifications(prev => !prev)}
            aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
            aria-expanded={showNotifications}
          >
            <Icon name="bell" />
            {unreadCount > 0 && <span className={s.badge}>{unreadCount > 99 ? "99+" : unreadCount}</span>}
          </button>
          {showNotifications && <NotificationCenter onClose={() => setShowNotifications(false)} />}
        </div>

        <div style={{ position: "relative" }}>
          <button className={s.user} onClick={() => setShowMenu(prev => !prev)} aria-haspopup="menu" aria-expanded={showMenu}>
            <span className={s.avatar}>{founderName.charAt(0).toUpperCase()}</span>
            <span className={s.userText}>
              <span className={s.userName}>{founderName}</span>
              <span className={s.userRole}>Founder</span>
            </span>
            <Icon name="chevron" size={14} />
          </button>

          {showMenu && (
            <div className={s.menu} role="menu">
              <InstallAppButton variant="menu" menuClassName={s.menuItem} />
              <button className={s.menuItem} role="menuitem" onClick={handleSignOut}>
                <Icon name="logout" size={16} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}