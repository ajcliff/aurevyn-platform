interface StatCardProps {
  label: string;
  value: string;
  sub: string;
  subColor?: string;
  icon: string;
  onClick?: () => void;
  chart?: React.ReactNode;
}

export default function StatCard({ label, value, sub, subColor = "var(--green)", icon, onClick, chart }: StatCardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "14px",
        padding: "20px 24px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        flex: 1,
        cursor: onClick ? "pointer" : "default",
        transition: "border-color 0.15s ease",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{label}</span>
        <span style={{ fontSize: "18px" }}>{icon}</span>
      </div>
      <span style={{ fontSize: "26px", fontWeight: "700", color: "var(--text-primary)" }}>{value}</span>
      <span style={{ fontSize: "12px", color: subColor }}>{sub}</span>
      {chart && <div style={{ marginTop: "4px" }}>{chart}</div>}
    </div>
  );
}