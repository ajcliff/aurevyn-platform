"use client";

import { useEffect, type ReactNode } from "react";
import layout from "@/styles/layout.module.css"; // geometry only (fixed to the right edge)
import f from "@/styles/founder.module.css";

type DrawerTab = { id: string; label: string };

type DashboardDrawerProps = {
  title: ReactNode;
  /** A CSS colour for the status dot beside the title (kept for compatibility). */
  statusColor?: string;
  onClose: () => void;
  tabs?: DrawerTab[];
  activeTab?: string;
  onTabChange?: (id: string) => void;
  children: ReactNode;
};

export default function DashboardDrawer({ title, statusColor, onClose, tabs, activeTab, onTabChange, children }: DashboardDrawerProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <aside className={`${layout.drawer} ${f.root} ${f.drawerRoot}`} aria-label="Details">
      <div className={`${f.drawerHead} ${tabs ? "" : f.drawerHeadPlain}`}>
        <div className={f.drawerTitleRow}>
          <div className={f.drawerTitle}>
            {statusColor && <span className={f.statusDot} style={{ background: statusColor }} aria-hidden="true" />}
            <span>{title}</span>
          </div>
          <button className={f.closeBtn} onClick={onClose} aria-label="Close details">✕</button>
        </div>

        {tabs && (
          <div className={`${f.tabs} ${f.drawerTabs}`} role="tablist" style={{ borderBottom: 0 }}>
            {tabs.map(t => (
              <button key={t.id} role="tab" aria-selected={activeTab === t.id} className={f.tab} onClick={() => onTabChange?.(t.id)} style={{ textTransform: "capitalize" }}>
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={f.drawerBody}>{children}</div>
    </aside>
  );
}

type DrawerFieldItem = { label: string; value: ReactNode; accent?: string };

export function DrawerFieldList({ items }: { items: DrawerFieldItem[] }) {
  return (
    <dl className={f.fields}>
      {items.map((item, i) => (
        <div key={i} className={f.fieldItem}>
          <dt>{item.label}</dt>
          <dd style={item.accent ? { color: item.accent, fontWeight: 600 } : undefined}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}