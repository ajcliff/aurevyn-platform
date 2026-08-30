const modules = [
  "Firewall",
  "Rate Limiter",
  "Rules Engine",
  "Threat Intel",
  "Risk Engine",
  "Decision Engine",
  "Scanner",
];

export default function ModuleStatus() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "repeat(auto-fit,minmax(180px,1fr))",
        gap: 12,
      }}
    >
      {modules.map((module) => (
        <div
          key={module}
          style={{
            background: "#0f172a",
            border: "1px solid #14532d",
            borderRadius: 12,
            padding: 16,
          }}
        >
          <div>{module}</div>

          <div
            style={{
              color: "#22c55e",
              marginTop: 10,
            }}
          >
            ACTIVE
          </div>
        </div>
      ))}
    </div>
  );
}