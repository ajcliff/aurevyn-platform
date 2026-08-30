"use client";

import s from "@/styles/layout.module.css";

type Props = {
  icon: string;
  name: string;
  category: string;
  active?: boolean;
  onClick: () => void;
};

export default function EngineCard({
  icon,
  name,
  category,
  active,
  onClick
}: Props) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active
          ? "var(--bg-elevated)"
          : "var(--bg-card)",
        border: active
          ? "1px solid var(--gold)"
          : "1px solid var(--border)",
        borderRadius: "12px",
        padding: "16px",
        cursor: "pointer",
        width: "100%",
        textAlign: "left"
      }}
    >
      <div
        style={{
          fontSize: "24px",
          marginBottom: "10px"
        }}
      >
        {icon}
      </div>

      <div
        style={{
          fontWeight: 700,
          marginBottom: "4px"
        }}
      >
        {name}
      </div>

      <div
        style={{
          fontSize: "12px",
          color: "var(--text-muted)"
        }}
      >
        {category}
      </div>
    </button>
  );
}