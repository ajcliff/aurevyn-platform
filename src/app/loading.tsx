export default function RootLoading() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "#1A0F14",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            border: "2px solid #3D2530",
            borderTopColor: "#C9A227",
            animation: "rootLoadingSpin 0.7s linear infinite",
          }}
        />
        <div style={{ fontSize: 12, color: "#A08B94", fontFamily: "sans-serif" }}>Loading...</div>
      </div>
      <style>{`
        @keyframes rootLoadingSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
