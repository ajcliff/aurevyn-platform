"use client";

import { useState, useEffect, type ReactNode } from "react";
import AskAurevyn from "./AskAurevyn";
import f from "@/styles/founder.module.css";

function getGreeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good night";
}

export default function GreetingHeader({
  headline,
  name = "Cliford",
  actions,
}: {
  headline: string;
  name?: string;
  actions?: ReactNode;
}) {
  const [now, setNow] = useState<Date | null>(null);
  const [showAI, setShowAI] = useState(false);

  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <div className={f.top}>
        <div>
          {/* Time is only known on the client, so the line is empty until mounted (avoids a hydration mismatch). */}
          <p className={f.greeting} style={{ minHeight: 20 }}>
            {now && (
              <>
                {getGreeting(now.getHours())}, {name}. {now.toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "long" })},{" "}
                {now.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit", hour12: false })} in Nairobi.
              </>
            )}
          </p>
          <h1 className={f.headline}>{headline}</h1>
        </div>
        <div className={f.actions}>
          {actions}
          <button className={f.secondary} onClick={() => setShowAI(true)}>Ask AUREVYN AI</button>
        </div>
      </div>
      {showAI && <AskAurevyn onClose={() => setShowAI(false)} />}
    </>
  );
}