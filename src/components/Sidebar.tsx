"use client";

import { usePathname, useRouter } from "next/navigation";

type NavItem = {
  id: string;
  label: string;
  icon: string;
  path: string;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

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
      {
        id: "organizations",
        label: "Organizations",
        icon: "🏢",
        path: "/dashboard/organizations",
      },
      {
        id: "company",
        label: "Company",
        icon: "🏛",
        path: "/dashboard/company",
      },
      {
        id: "actions",
        label: "Quick Actions",
        icon: "✦",
        path: "/dashboard/actions",
      },
    ],
  },
  {
    label: "Platform",
    items: [
      {
        id: "packages",
        label: "Packages",
        icon: "📦",
        path: "/dashboard/packages",
      },
    ],
  },
  {
    label: "Money",
    items: [
      {
        id: "billing",
        label: "Billing",
        icon: "💳",
        path: "/dashboard/billing",
      },
      {
        id: "finance",
        label: "Finance",
        icon: "💰",
        path: "/dashboard/finance",
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        id: "messages",
        label: "Messages",
        icon: "✉️",
        path: "/dashboard/messages",
      },
      {
        id: "error-logs",
        label: "Error Logs",
        icon: "🧯",
        path: "/dashboard/error-logs",
      },
      {
        id: "control",
        label: "Control Center",
        icon: "🎛",
        path: "/dashboard/control",
      },
      {
        id: "settings",
        label: "Settings",
        icon: "⚙",
        path: "/dashboard/settings",
      },
      {
        id: "themes",
        label: "Theme Presets",
        icon: "🎨",
        path: "/dashboard/themes",
      },
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
    if (path === "/dashboard") {
      return pathname === "/dashboard";
    }

    return pathname.startsWith(path);
  };

const width = isMobile ? 240 : collapsed ? 64 : 220;  const showLabels = !collapsed || isMobile;

  function go(path: string) {
    router.push(path);

    if (isMobile) {
      onCloseMobile();
    }
  }

  function handleLogoClick() {
    if (isMobile) {
      onCloseMobile();
      return;
    }

    onToggleCollapse();
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
        transition: "width 0.2s ease, transform 0.2s ease",
        transform: isMobile
          ? mobileOpen
            ? "translateX(0)"
            : "translateX(-100%)"
          : "none",
        overflow: "hidden",
      }}
    >
      {/* =========================================================
          AUREVYN HEADER
      ========================================================== */}

      <button
        onClick={handleLogoClick}
        title={
          isMobile
            ? "Close menu"
            : collapsed
            ? "Expand Aurevyn"
            : "Collapse Aurevyn"
        }
        aria-label={
          isMobile
            ? "Close menu"
            : collapsed
            ? "Expand Aurevyn"
            : "Collapse Aurevyn"
        }
        style={{
          width: "100%",
minHeight: "68px",
padding: collapsed && !isMobile ? "12px 0" : "12px 16px",          display: "flex",
          alignItems: "center",
          justifyContent:
            collapsed && !isMobile ? "center" : "flex-start",
          gap: "12px",
          border: "none",
          borderBottom: "1px solid var(--border)",
          background: "transparent",
          cursor: "pointer",
          color: "inherit",
          flexShrink: 0,
          transition: "background 0.15s ease",
        }}
      >
        {/* Logo */}
        <div
          style={{
width: "34px",
height: "34px",
borderRadius: "9px",            overflow: "hidden",
            flexShrink: 0,
            border: "1px solid var(--border-light)",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.02)",
          }}
        >
          <img
            src="/icon.png"
            alt="Aurevyn"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        </div>

        {/* Wordmark */}
        {showLabels && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              minWidth: 0,
            }}
          >
            <span
              style={{
                fontWeight: 850,
                fontSize: "15px",
                lineHeight: 1,
                color: "var(--text-primary)",
                letterSpacing: "0.04em",
                whiteSpace: "nowrap",
              }}
            >
              AUREVYN
            </span>

            <span
              style={{
                marginTop: "5px",
                fontSize: "9px",
                lineHeight: 1,
                color: "var(--text-muted)",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
              }}
            >
              Core
            </span>
          </div>
        )}
      </button>

      {/* =========================================================
          NAVIGATION
      ========================================================== */}

      <nav
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          padding: "18px 10px",
        }}
      >
        {navGroups.map((group) => (
          <div
            key={group.label}
            style={{
              marginBottom: "22px",
            }}
          >
            {showLabels && (
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
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
                  title={!showLabels ? item.label : undefined}
                  style={{
                    width: "100%",
                    height: "40px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: showLabels
                      ? "flex-start"
                      : "center",
                    gap: "11px",
                    padding: showLabels ? "0 11px" : "0",
                    borderRadius: "10px",
                    border: "none",
                    marginBottom: "3px",
                    cursor: "pointer",
                    textAlign: "left",
                    background: active
                      ? "var(--bg-elevated)"
                      : "transparent",
                    color: active
                      ? "var(--gold)"
                      : "var(--text-secondary)",
                    fontWeight: active ? 700 : 500,
                    fontSize: "13px",
                    transition: "all 0.15s ease",
                  }}
                >
                  <span
                    style={{
                      width: "20px",
                      fontSize: "16px",
                      lineHeight: 1,
                      textAlign: "center",
                      flexShrink: 0,
                    }}
                  >
                    {item.icon}
                  </span>

                  {showLabels && (
                    <span
                      style={{
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {item.label}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* =========================================================
          SYSTEM STATUS
      ========================================================== */}

      <div
        style={{
          borderTop: "1px solid var(--border)",
          padding: collapsed && !isMobile ? "14px 0" : "14px",
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => go("/dashboard/control")}
          title={!showLabels ? "Aurevyn system status" : undefined}
          style={{
            width: "100%",
            minHeight: "48px",
            display: "flex",
            alignItems: "center",
            justifyContent: showLabels
              ? "flex-start"
              : "center",
            gap: "10px",
            padding: showLabels ? "8px 10px" : "8px 0",
            borderRadius: "10px",
            border: "1px solid var(--border)",
            background: "rgba(255,255,255,0.02)",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          {/* Status indicator */}
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(52, 211, 153, 0.08)",
              border: "1px solid rgba(52, 211, 153, 0.15)",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: "#34d399",
                boxShadow: "0 0 8px rgba(52, 211, 153, 0.6)",
              }}
            />
          </div>

          {showLabels && (
            <div
              style={{
                minWidth: 0,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  whiteSpace: "nowrap",
                }}
              >
                System Operational
              </div>

              <div
                style={{
                  marginTop: "3px",
                  fontSize: "9px",
                  color: "var(--text-muted)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                Aurevyn Core
              </div>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
}