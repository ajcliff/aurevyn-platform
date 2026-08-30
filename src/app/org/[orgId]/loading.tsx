export default function OrgLoading() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "var(--bg-base)" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid var(--border)", borderTopColor: "var(--gold)", animation: "orgLoadingSpin 0.7s linear infinite" }} />
        <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Loading...</div>
      </div>
      <style>{`@keyframes orgLoadingSpin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}