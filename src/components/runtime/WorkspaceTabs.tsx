"use client";

type Props = {
  tabs: string[];
  active: string;
  onChange: (tab: string) => void;
};

export default function WorkspaceTabs({
  tabs,
  active,
  onChange
}: Props) {
  return (
    <div
      style={{
        display: "flex",
        gap: "8px",
        marginBottom: "20px"
      }}
    >
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          style={{
            border:
              active === tab
                ? "1px solid var(--gold)"
                : "1px solid var(--border)",
            background:
              active === tab
                ? "var(--bg-elevated)"
                : "var(--bg-card)",
            color: "var(--text-primary)",
            borderRadius: "8px",
            padding: "8px 12px",
            cursor: "pointer"
          }}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}