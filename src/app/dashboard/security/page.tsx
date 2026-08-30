"use client";

import { useEffect, useState } from "react";
import ThreatMap
from "@/components/security/ThreatMap";
type SecurityStats = {
  securityScore: number;
  requests: number;
  blocked: number;
  threats: number;
  riskScore: number;
};

import MetricCard from "@/components/security/MetricCard";
import ThreatFeed from "@/components/security/ThreatFeed";
import AttackerTable from "@/components/security/AttackerTable";
import ModuleStatus from "@/components/security/ModuleStatus";
import LearnedPatterns
from "@/components/security/LearnedPatterns";


export default function SecurityPage() {
  const [stats, setStats] =
    useState<SecurityStats>({
      securityScore: 100,
      requests: 0,
      blocked: 0,
      threats: 0,
      riskScore: 0,
    });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(
          "/api/security/stats"
        );

        const data = await res.json();

        setStats(data);
      } catch (err) {
        console.error(err);
      }
    };

    load();

    const interval =
      setInterval(load, 3000);

    return () =>
      clearInterval(interval);
  }, []);

  return (
  <div
    style={{
      background:
"radial-gradient(circle at top,#13233f 0%,#08111f 35%,#020617 100%)",
      minHeight: "100vh",
      padding:20,
      color: "white",
    }}
  >
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom:18
      }}
    >
<div
  style={{
    display: "grid",
    gridTemplateColumns: "2fr 1.2fr 1.2fr",
   gap:16,
    marginBottom:18,
    alignItems: "stretch",
  }}
>
        <h1
          style={{
           fontSize:28,
letterSpacing:1,
            fontWeight:600,
           margin:0,
          }}
        >
          AUREVYN Security Operations Center
        </h1>

        <div
          style={{
           color:"#64748b",
fontSize:14,
            marginTop: 6,
          }}
        >
          Real-time Threat Monitoring & Response
        </div>
      </div>

      <div
        style={{
          background: "#052e16",
         color:"#22c55e",
          padding:"8px 14px",
          borderRadius: 999,
          border: "1px solid #14532d",
          fontWeight:600,
fontSize:13
        }}
      >
        SYSTEM SECURE
      </div>
    </div>

    {/* Metrics */}

<div
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(5,1fr)",
    gap: 16,
    marginBottom:18,
    
  }}
>
      <MetricCard
        title="Security Score"
        value={stats.securityScore}
      />

      <MetricCard
        title="Requests"
        value={stats.requests}
      />

      <MetricCard
        title="Blocked"
        value={stats.blocked}
      />

      <MetricCard
        title="Threats"
        value={stats.threats}
      />

      <MetricCard
        title="Risk Score"
        value={stats.riskScore}
      />
    </div>

    {/* Main Operations Row */}

<div
  style={{
    display: "grid",
    gridTemplateColumns: "2fr 1.2fr 1.2fr",
   gap:16,
   marginBottom:18,
    alignItems: "stretch",
  }}
>
      <ThreatFeed />

      <ThreatMap />

      <AttackerTable />
    </div>

    {/* Analysis Row */}

<div
  style={{
    display: "grid",
    gridTemplateColumns: "2fr 1fr",
    gap:16,
    marginBottom:18,
    alignItems: "stretch",
  }}
>
      <div

      >
        <h3
          style={{
            marginTop: 0,
            marginBottom:18,
          }}
        >
          Security Overview
        </h3>

        <div
          style={{
            height: 220,
            borderRadius: 12,
           background:
"linear-gradient(180deg,#111827,#020617)",
            border: "1px solid #1e293b",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            color: "#64748b",
          }}
        >
        <div
  style={{
    display: "flex",
    alignItems: "flex-end",
    gap:16,
    height: 180,
    width: "100%",
  }}
>
  {[45, 90, 70, 120, 80, 160, 100, 180, 130, 150].map((height, index) => (
    <div
      key={index}
      style={{
        flex: 1,
        height,
        borderRadius: 8,
        background: "linear-gradient(180deg,#38bdf8,#2563eb)",
      }}
    />
  ))}
</div>
        </div>
      </div>

      <LearnedPatterns />
    </div>

    {/* Security Modules */}

    <div
      style={{
        marginTop: 24,
      }}
    >
      <h2
        style={{
          marginBottom:18
        }}
      >
        Security Modules
      </h2>

<div
  style={{
    background: "#0f172a",
    border: "1px solid #1e293b",
    borderRadius: 16,
    padding: 20,
    display: "flex",
    flexDirection: "column",
  }}
>
        <ModuleStatus />
      </div>
    </div>
  </div>
);
}

