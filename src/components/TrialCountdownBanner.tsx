"use client";

import { useEffect, useState } from "react";
import { getTrialInfo } from "@/lib/trial";

type Props = {
  orgId: string;
};

export default function TrialCountdownBanner({ orgId }: Props) {
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [inGracePeriod, setInGracePeriod] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    getTrialInfo(orgId).then((info) => {
      setDaysLeft(info.daysLeft);
      setInGracePeriod(info.inGracePeriod);
    });
  }, [orgId]);

  if (daysLeft === null || dismissed) return null;
  // Only bother showing this in the last week of the trial or during grace -
  // no need to nag on day one.
  if (!inGracePeriod && daysLeft > 7) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9997,
        background: inGracePeriod ? "#dc2626" : "#f5b800",
        color: inGracePeriod ? "#fff" : "#1a1200",
        fontSize: 12,
        fontWeight: 600,
        padding: "8px 12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
      }}
    >
      <span>
        {inGracePeriod
          ? `Your trial ended — ${daysLeft} day${daysLeft === 1 ? "" : "s"} left to pick a plan before access pauses.`
          : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left in your free trial.`}
      </span>
      <button
        onClick={() => setDismissed(true)}
        style={{
          background: "transparent",
          border: "none",
          color: "inherit",
          fontWeight: 700,
          fontSize: 14,
          cursor: "pointer",
          padding: "0 4px",
          flexShrink: 0,
        }}
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}
