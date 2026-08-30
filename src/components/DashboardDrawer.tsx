"use client";

import type { ReactNode } from "react";
import s from "@/styles/layout.module.css";

type DrawerTab = {
  id: string;
  label: string;
};

type DashboardDrawerProps = {
  title: ReactNode;
  statusColor?: string;
  onClose: () => void;
  tabs?: DrawerTab[];
  activeTab?: string;
  onTabChange?: (id: string) => void;
  children: ReactNode;
};

export default function DashboardDrawer({
  title,
  statusColor,
  onClose,
  tabs,
  activeTab,
  onTabChange,
  children,
}: DashboardDrawerProps) {
  return (
    <div className={s.drawer}>
      <div style={{ padding: "16px", borderBottom: "1px solid var(--border)" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: tabs ? "12px" : 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
            {statusColor && (
              <span
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: statusColor,
                  boxShadow: `0 0 8px ${statusColor}`,
                  flexShrink: 0,
                }}
              />
            )}
            <span
              style={{
                fontSize: "14px",
                fontWeight: 700,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {title}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              fontSize: "14px",
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        {tabs && (
          <div style={{ display: "flex", gap: "4px" }}>
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => onTabChange?.(t.id)}
                style={{
                  flex: 1,
                  padding: "5px",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  background: activeTab === t.id ? "var(--bg-elevated)" : "transparent",
                  color: activeTab === t.id ? "var(--text-primary)" : "var(--text-muted)",
                  fontSize: "10px",
                  cursor: "pointer",
                  textTransform: "capitalize",
                  fontFamily: "inherit",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>{children}</div>
    </div>
  );
}

type DrawerFieldItem = {
  label: string;
  value: ReactNode;
  accent?: string;
};

export function DrawerFieldList({ items }: { items: DrawerFieldItem[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            background: "var(--bg-elevated)",
            borderRadius: "8px",
            padding: "10px 12px",
            border: "1px solid var(--border)",
          }}
        >
          <div style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: "4px" }}>
            {item.label}
          </div>
          <div
            style={{
              fontSize: "13px",
              color: item.accent ?? "var(--text-primary)",
              textTransform: "capitalize",
              fontWeight: item.accent ? 600 : 400,
            }}
          >
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}