"use client";

import { usePathname, useRouter } from "next/navigation";

type NavItem = { id: string; label: string; icon: string; path: string };
type NavGroup = { label: string; items: NavItem[] };

type Props = {
  collapsed: boolean;
  isMobile: boolean;
  mobileOpen: boolean;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
  founderName: string;
  founderEmail: string;
};

const navGroups: NavGroup[] = [
  {
    label: "Main",
    items: [
      { id: "overview", label: "Overview", icon: "⊞", path: "/dashboard" },
      { id: "organizations", label: "Organizations", icon: "🏢", path: "/dashboard/organizations" },
{ id: "company", label: "Company", icon: "🏛", path: "/dashboard/company" },      { id: "actions", label: "Quick Actions", icon: "✦", path: "/dashboard/actions" },
    ],
  },
{
    label: "Platform",
    items: [
      { id: "packages", label: "Packages", icon: "📦", path: "/dashboard/packages" },
    ],
  },
  {
    label: "Money",
    items: [
      { id: "billing", label: "Billing", icon: "💳", path: "/dashboard/billing" },
      { id: "finance", label: "Finance", icon: "💰", path: "/dashboard/finance" },
    ],
  },
  {
    label: "System",
    items: [
      { id: "error-logs", label: "Error Logs", icon: "🧯", path: "/dashboard/error-logs" },
      { id: "control", label: "Control Center", icon: "🎛", path: "/dashboard/control" },
      { id: "settings", label: "Settings", icon: "⚙", path: "/dashboard/settings" },
      { id: "themes", label: "Theme Presets", icon: "🎨", path: "/dashboard/themes" },
    ],
  
  },
];

export default function Sidebar({
  collapsed,
  isMobile,
  mobileOpen,
  onToggleCollapse,
  onCloseMobile,
  founderName,
  founderEmail,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (path: string) => {
    if (path === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(path);
  };

  const width = isMobile ? 240 : collapsed ? 64 : 220;
  const showLabels = !collapsed || isMobile;

  function go(path: string) {
    router.push(path);
    if (isMobile) onCloseMobile();
  }

  return (
    <aside
      style={{
        width,
        background: "var(--bg-surface)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        position: "fixed",
        left: 0,
        top: 0,
        zIndex: isMobile ? 200 : 50,
        transition: "width 0.15s ease, transform 0.2s ease",
        transform: isMobile ? (mobileOpen ? "translateX(0)" : "translateX(-100%)") : "none",
        overflow: "hidden",
      }}
    >
      {/* Logo */}
      <div
        onClick={() => go("/dashboard")}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed && !isMobile ? "center" : "space-between",
          gap: "10px",
          padding: "18px 16px",
          borderBottom: "1px solid var(--border)",
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              overflow: "hidden",
              flexShrink: 0,
              border: "1px solid var(--border-light)",
            }}
          >
            <img
              src="/icon.png"
              alt="AUREVYN"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          </div>
          {showLabels && (
            <span style={{ fontWeight: 800, fontSize: "15px", color: "var(--text-primary)", letterSpacing: "0.02em", whiteSpace: "nowrap" }}>
              AUREVYN
            </span>
          )}
        </div>

        {!isMobile && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleCollapse(); }}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            style={{
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: 8,
              width: 22,
              height: 22,
              flexShrink: 0,
              cursor: "pointer",
              color: "var(--text-muted)",
              fontSize: 11,
            }}
          >
            {collapsed ? "»" : "«"}
          </button>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "16px 10px" }}>
        {navGroups.map((group) => (
          <div key={group.label} style={{ marginBottom: "20px" }}>
            {showLabels && (
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                  padding: "0 10px 8px",
                  whiteSpace: "nowrap",
                }}
              >
                {group.label}
              </div>
            )}

            {group.items.map((item) => {
              const active = isActive(item.path);
              return (
                <button
                  key={item.id}
                  onClick={() => go(item.path)}
                  title={showLabels ? undefined : item.label}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: showLabels ? "flex-start" : "center",
                    gap: "10px",
                    padding: showLabels ? "9px 10px" : "9px 0",
                    borderRadius: "10px",
                    border: "none",
                    marginBottom: "2px",
                    cursor: "pointer",
                    textAlign: "left",
                    background: active ? "var(--bg-elevated)" : "transparent",
                    color: active ? "var(--gold)" : "var(--text-secondary)",
                    fontWeight: active ? 700 : 500,
                    fontSize: "13px",
                    transition: "all 0.15s ease",
                  }}
                >
                  <span style={{ fontSize: "15px", width: "18px", textAlign: "center", flexShrink: 0 }}>{item.icon}</span>
                  {showLabels && <span style={{ whiteSpace: "nowrap" }}>{item.label}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer account chip */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: showLabels ? "flex-start" : "center",
          gap: "10px",
          padding: showLabels ? "14px 16px" : "14px 0",
          borderTop: "1px solid var(--border)",
          flexShrink: 0,
        }}
      >
        <div
          title={showLabels ? undefined : `${founderName} (${founderEmail})`}
          style={{
            width: "30px",
            height: "30px",
            borderRadius: "50%",
            background: "var(--gold)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            fontSize: "12px",
            color: "#07070f",
            flexShrink: 0,
          }}
        >
          {founderName.charAt(0).toUpperCase()}
        </div>
        {showLabels && (
          <div style={{ overflow: "hidden" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {founderName}
            </div>
            <div style={{ fontSize: "10px", color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {founderEmail || "Founder"}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}