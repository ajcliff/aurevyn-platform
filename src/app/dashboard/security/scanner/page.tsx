"use client";

import { useEffect, useState } from "react";

type ScanResult = {
  dependencies: unknown[];
  routes: unknown[];
  environment: unknown[];
};

export default function SecurityScannerPage() {
  const [scan, setScan] =
    useState<ScanResult | null>(null);

  async function runScan() {
    const res = await fetch(
      "/api/security/scan"
    );

    const data = await res.json();

    setScan(data);
  }

  useEffect(() => {
    runScan();
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h1>Vulnerability Scanner</h1>

      <button onClick={runScan}>
        Run Scan
      </button>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(3,1fr)",
          gap: 20,
          marginTop: 20,
        }}
      >
        <Card
          title="Dependencies"
          value={
            scan?.dependencies.length || 0
          }
        />

        <Card
          title="Routes"
          value={
            scan?.routes.length || 0
          }
        />

        <Card
          title="Environment"
          value={
            scan?.environment.length || 0
          }
        />
      </div>
    </div>
  );
}

function Card({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  return (
    <div
      style={{
        background: "#111",
        padding: 20,
        borderRadius: 12,
      }}
    >
      <div>{title}</div>
      <h2>{value}</h2>
    </div>
  );
}