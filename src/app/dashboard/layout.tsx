"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import CommandPalette, { type CommandItem } from "@/components/CommandPalette";
import FounderThemeProvider from "@/components/FounderThemeProvider";
import { createClient } from "@/lib/supabase";
import { getFounderSettings } from "@/lib/founderSettings";
import EmptyState from "@/components/EmptyState";
import styles from "@/styles/layout.module.css";

const MOBILE_BREAKPOINT = 900;

const founderCommands: CommandItem[] = [
  { id: "overview", label: "Overview", icon: "⊞", path: "/dashboard" },
  { id: "organizations", label: "Organizations", icon: "🏢", path: "/dashboard/organizations" },
  { id: "company", label: "Company", icon: "🏢", path: "/dashboard/company" },
  { id: "actions", label: "Quick Actions", icon: "✦", path: "/dashboard/actions" },
  { id: "packages", label: "Packages", icon: "📦", path: "/dashboard/packages" },
  { id: "billing", label: "Billing", icon: "💳", path: "/dashboard/billing" },
  { id: "finance", label: "Finance", icon: "💰", path: "/dashboard/finance" },
  { id: "error-logs", label: "Error Logs", icon: "🧯", path: "/dashboard/error-logs" },
  { id: "control", label: "Control Center", icon: "🎛", path: "/dashboard/control" },
  { id: "themes", label: "Theme Presets", icon: "🎨", path: "/dashboard/themes" },
  { id: "settings", label: "Settings", icon: "⚙", path: "/dashboard/settings" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [founderName, setFounderName] = useState<string | null>(null);
  const [founderEmail, setFounderEmail] = useState("");
  const [paletteOpen, setPaletteOpen] = useState(false);

  // null = still checking, false = not the founder, true = verified founder
  const [isFounder, setIsFounder] = useState<boolean | null>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Founder identity check — this is the actual access gate for the whole dashboard.
  // Anyone who is NOT this exact email gets turned away before anything else loads.
  useEffect(() => {
    let active = true;
    async function verifyFounder() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          if (active) {
            setIsFounder(false);
            router.replace("/login");
          }
          return;
        }

        const founderEmail = process.env.NEXT_PUBLIC_FOUNDER_EMAIL;
        const verified = !!founderEmail && user.email === founderEmail;

        if (!active) return;

        if (!verified) {
          setIsFounder(false);
          return;
        }

        setFounderEmail(user.email ?? "");
        const settings = await getFounderSettings(user.id);
        if (active) {
          setFounderName(settings.full_name);
          setIsFounder(true);
        }
      } catch (err) {
        console.error("Failed to verify founder identity:", err);
        if (active) setIsFounder(false);
      }
    }
    verifyFounder();
    return () => { active = false; };
  }, [router]);

  const sidebarWidth = isMobile ? 0 : collapsed ? 64 : 220;
  const displayName = founderName || founderEmail.split("@")[0] || "Founder";

  if (isFounder === null) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "var(--bg-base)" }}>
        <EmptyState icon="⏳" message="Verifying access..." />
      </div>
    );
  }

  if (isFounder === false) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "var(--bg-base)" }}>
        <EmptyState
          icon="🔒"
          message="This area is restricted to the AUREVYN founder account."
          actionLabel="Go to your organizations"
onAction={() => { window.location.href = "/login"; }}        />
      </div>
    );
  }

  return (
    <div
      className={styles.shell}
      style={{ ["--sidebar-width" as any]: `${sidebarWidth}px` }}
    >
      <FounderThemeProvider />

      {isMobile && mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 150 }}
        />
      )}

      <Sidebar
        collapsed={collapsed}
        isMobile={isMobile}
        mobileOpen={mobileOpen}
        onToggleCollapse={() => setCollapsed((c) => !c)}
        onCloseMobile={() => setMobileOpen(false)}
        founderName={displayName}
        founderEmail={founderEmail}
      />
      <div className={styles.main}>
        <TopBar
          isMobile={isMobile}
          onOpenMobile={() => setMobileOpen(true)}
          founderName={displayName}
          onOpenSearch={() => setPaletteOpen(true)}
        />
        <div className={styles.content}>
          {children}
        </div>
      </div>
      <CommandPalette
        items={founderCommands}
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
      />
    </div>
  );
}