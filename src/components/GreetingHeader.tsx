"use client";

import { useState, useEffect } from "react";
import AskAurevyn from "./AskAurevyn";

function getGreeting(hour: number) {
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  if (hour < 21) return "Good Evening";
  return "Good Night";
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-KE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatTime(date: Date) {
  return date.toLocaleTimeString("en-KE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default function GreetingHeader() {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(new Date());
  const [showAI, setShowAI] = useState(false);

  useEffect(() => {
    setMounted(true);
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!mounted) return <div style={{ height: "60px" }} />;

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontSize: "26px", fontWeight: "700", color: "var(--text-primary)" }}>
            {getGreeting(now.getHours())}, Cliford
          </h1>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>
            {formatDate(now)} · {formatTime(now)} · Nairobi
          </p>
        </div>
        <button
          onClick={() => setShowAI(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 18px",
            borderRadius: "10px",
            border: "1px solid var(--border)",
            background: "var(--bg-elevated)",
            color: "var(--text-primary)",
            fontSize: "13px",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          ✦ Ask AUREVYN AI
        </button>
      </div>

      {showAI && <AskAurevyn onClose={() => setShowAI(false)} />}
    </>
  );
}