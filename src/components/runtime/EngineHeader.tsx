"use client";

type Props = {
  title: string;
  subtitle: string;
};

export default function EngineHeader({
  title,
  subtitle
}: Props) {
  return (
    <div
      style={{
        marginBottom: "24px"
      }}
    >
      <h1
        style={{
          margin: 0,
          fontSize: "28px",
          fontWeight: 700
        }}
      >
        {title}
      </h1>

      <p
        style={{
          marginTop: "8px",
          color: "var(--text-secondary)"
        }}
      >
        {subtitle}
      </p>
    </div>
  );
}