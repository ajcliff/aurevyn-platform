type Props = {
  title: string;
  value: string | number;
  color?: string;
};

export default function MetricCard({
  title,
  value,
  color = "#22c55e",
}: Props) {
  return (
    <div
      style={{
        background: "#0f172a",
        border: "1px solid #1e293b",
        borderRadius: 16,
        padding: 20,
        minHeight: 120,
      }}
    >
      <div
        style={{
          color: "#94a3b8",
          fontSize: 13,
          marginBottom: 12,
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 34,
          fontWeight: 700,
          color,
        }}
      >
        {value}
      </div>
    </div>
  );
}