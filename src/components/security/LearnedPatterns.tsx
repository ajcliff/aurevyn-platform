"use client";

export default function LearnedPatterns() {
  return (
    <div
      style={{
        background: "#111827",
        border: "1px solid #1f2937",
        borderRadius: 16,
        padding: 20,
        minHeight: 300,
        color: "white",
      }}
    >
      <h3
        style={{
          marginBottom: 16,
        }}
      >
        Learned Attack Patterns
      </h3>

      <div>Path Traversal Attempts</div>
      <div>Login Brute Force Activity</div>
      <div>API Abuse Detection</div>
      <div>Repeated Scanner Signatures</div>
      <div>Bot Network Behaviour</div>
    </div>
  );
}