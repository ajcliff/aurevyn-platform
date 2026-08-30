"use client";

import { useEffect, useState } from "react";

type SecurityEvent = {
  id: string;
  timestamp: number;
  level: string;
  event: string;
  ip?: string;
};

export default function ThreatFeed() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/security/events");
      const data = await res.json();

      setEvents(data);
    };

    load();

    const interval = setInterval(load, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        background: "#0f172a",
        border: "1px solid #1e293b",
        borderRadius: 16,
        padding: 20,
        height: 420,
        overflowY: "auto",
      }}
    >
      <h3
        style={{
          marginBottom: 16,
          color: "#fff",
        }}
      >
        Live Threat Feed
      </h3>

      {events.length === 0 && (
        <div
          style={{
            color: "#64748b",
          }}
        >
          Waiting for security events...
        </div>
      )}

      {events.map((event) => (
        <div
          key={event.id}
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "10px 0",
            borderBottom:
              "1px solid rgba(255,255,255,.05)",
            color: "#fff",
            fontSize: 13,
          }}
        >
          <span>
            {new Date(
              event.timestamp
            ).toLocaleTimeString()}
          </span>

          <span>{event.event}</span>

          <span>{event.level}</span>

          <span>{event.ip || "-"}</span>
        </div>
      ))}
    </div>
  );
}