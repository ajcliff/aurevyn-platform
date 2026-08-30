"use client";

export default function CommandCenter() {
  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        padding: "16px",
        marginBottom: "20px"
      }}
    >
      <div
        style={{
          fontWeight: 700,
          marginBottom: "10px"
        }}
      >
        Command Center
      </div>

      <input
        placeholder="Ask AUREVYN or execute a command..."
        style={{
          width: "100%",
          background: "var(--bg-base)",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          padding: "10px"
        }}
      />
    </div>
  );
}