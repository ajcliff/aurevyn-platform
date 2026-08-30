type Props = {
  icon: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

export default function EmptyState({ icon, message, actionLabel, onAction }: Props) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: "28px 16px",
        maxWidth: 280,
        margin: "0 auto",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 22, opacity: 0.5 }}>{icon}</div>
      <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{message}</div>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          style={{
            marginTop: 4,
            padding: "6px 14px",
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "transparent",
            color: "var(--gold)",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}