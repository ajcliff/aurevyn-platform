"use client";

import { usePathname, useRouter } from "next/navigation";
import Icon, { type IconName } from "@/components/Icon";
import s from "@/styles/founderShell.module.css";

type NavItem = { id: IconName; label: string; path: string };
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
      { id: "overview", label: "Overview", path: "/dashboard" },
      { id: "organizations", label: "Organizations", path: "/dashboard/organizations" },
      { id: "company", label: "Company", path: "/dashboard/company" },
      { id: "actions", label: "Quick actions", path: "/dashboard/actions" },
    ],
  },
  { label: "Platform", items: [{ id: "licensing", label: "Licensing", path: "/dashboard/licensing" }] },
  {
    label: "Money",
    items: [
      { id: "billing", label: "Billing", path: "/dashboard/billing" },
      { id: "finance", label: "Finance", path: "/dashboard/finance" },
    ],
  },
  {
    label: "System",
    items: [
      { id: "mail", label: "Mail", path: "/dashboard/mail" },
      { id: "messages", label: "Contact form", path: "/dashboard/messages" },
      { id: "error-logs", label: "Error logs", path: "/dashboard/error-logs" },
      { id: "control", label: "Control center", path: "/dashboard/control" },
      { id: "settings", label: "Settings", path: "/dashboard/settings" },
      { id: "themes", label: "Theme presets", path: "/dashboard/themes" },
    ],
  },
];

export default function Sidebar({ collapsed, isMobile, mobileOpen, onToggleCollapse, onCloseMobile }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (path: string) => (path === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(path));
  const width = isMobile ? 240 : collapsed ? 64 : 220;
  const showLabels = !collapsed || isMobile;
  const brandLabel = isMobile ? "Close menu" : collapsed ? "Expand sidebar" : "Collapse sidebar";

  function go(path: string) {
    router.push(path);
    if (isMobile) onCloseMobile();
  }

  return (
    <aside
      className={s.side}
      aria-label="Founder navigation"
      style={{
        width,
        zIndex: isMobile ? 200 : 50,
        transform: isMobile ? (mobileOpen ? "translateX(0)" : "translateX(-100%)") : "none",
      }}
    >
      <button
        className={`${s.brand} ${!showLabels ? s.brandCollapsed : ""}`}
        onClick={() => (isMobile ? onCloseMobile() : onToggleCollapse())}
        title={brandLabel}
        aria-label={brandLabel}
      >
        <span className={s.logo}><img src="/icon.png" alt="" /></span>
        {showLabels && <span className={s.wordmark}>AUREVYN</span>}
      </button>

      <nav className={s.nav}>
        {navGroups.map(group => (
          <div key={group.label} className={s.group}>
            {showLabels && <div className={s.groupLabel}>{group.label}</div>}
            {group.items.map(item => (
              <button
                key={item.id}
                className={`${s.item} ${!showLabels ? s.itemCollapsed : ""}`}
                aria-current={isActive(item.path) ? "page" : undefined}
                title={!showLabels ? item.label : undefined}
                aria-label={!showLabels ? item.label : undefined}
                onClick={() => go(item.path)}
              >
                <Icon name={item.id} />
                {showLabels && <span>{item.label}</span>}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className={s.foot}>
        <button
          className={`${s.status} ${!showLabels ? s.statusCollapsed : ""}`}
          onClick={() => go("/dashboard/control")}
          title={!showLabels ? "System status" : undefined}
          aria-label={!showLabels ? "System status" : undefined}
        >
          <Icon name="control" />
          {showLabels && <span>System status</span>}
        </button>
      </div>
    </aside>
  );
}