"use client";

import { ReactNode } from "react";

type Props = {
  engineName: string;
  engineIcon: string;
  organizationName: string;
  children: ReactNode;
};

export default function WorkspaceShell({
  engineName,
  engineIcon,
  organizationName,
  children
}: Props) {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column"
      }}
    >
      <div
        style={{
          borderBottom: "1px solid var(--border)",
          padding: "16px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "var(--bg-surface)"
        }}
      >
        <div>
          <div
            style={{
              fontSize: "12px",
              color: "var(--text-muted)",
              marginBottom: "4px"
            }}
          >
            {organizationName}
          </div>

          <div
            style={{
              display: "flex",
              gap: "10px",
              alignItems: "center"
            }}
          >
            <span
              style={{
                fontSize: "22px"
              }}
            >
              {engineIcon}
            </span>

            <span
              style={{
                fontWeight: 700,
                fontSize: "18px"
              }}
            >
              {engineName}
            </span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "8px"
          }}
        >
          <button
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "8px 12px",
              cursor: "pointer"
            }}
          >
            Notifications
          </button>

          <button
            style={{
              background: "var(--gold)",
              color: "#111",
              border: "none",
              borderRadius: "8px",
              padding: "8px 12px",
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            Ask AUREVYN
          </button>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px"
        }}
      >
        {children}
      </div>
    </div>
  );
}