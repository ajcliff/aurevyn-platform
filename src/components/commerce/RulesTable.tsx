"use client";

import s from "@/styles/layout.module.css";
import { CommerceRule } from "@/lib/commerceRules";

type Props = {
  rules: CommerceRule[];
  onSelect: (rule: CommerceRule) => void;
};

export default function RulesTable({
  rules,
  onSelect,
}: Props) {
  return (
    <div className={s.table}>
      <div
        className={s.tableHeader}
        style={{
          display: "grid",
          gridTemplateColumns:
            "2fr 1fr 80px 100px",
        }}
      >
        <span>Rule</span>
        <span>Type</span>
        <span>Priority</span>
        <span>Status</span>
      </div>

      {rules.map((rule) => (
        <div
          key={rule.id}
          className={s.tableRow}
          style={{
            display: "grid",
            gridTemplateColumns:
              "2fr 1fr 80px 100px",
            cursor: "pointer",
          }}
          onClick={() => onSelect(rule)}
        >
          <span>{rule.name}</span>

          <span
            style={{
              textTransform: "capitalize",
            }}
          >
            {rule.type}
          </span>

          <span>{rule.priority}</span>

          <span
            style={{
              color: rule.enabled
                ? "#22c55e"
                : "#ef4444",
              fontWeight: 600,
            }}
          >
            {rule.enabled
              ? "Enabled"
              : "Disabled"}
          </span>
        </div>
      ))}
    </div>
  );
}