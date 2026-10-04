"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getTrialInfo } from "@/lib/trial";

type Props = {
  orgId: string;
};

export default function TrialCountdownBanner({ orgId }: Props) {
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [inGracePeriod, setInGracePeriod] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const router = useRouter();

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
        bottom: 16,
        left: "50%",
        transform: "translateX(-50%)",
        width: "max-content",
        maxWidth: "calc(100vw - 24px)",
        borderRadius: 10,
        boxShadow: "0 4px 16px rgba(0,0,0,0.35)",
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
        onClick={() => router.push(`/org/${orgId}/engines`)}
        style={{ background: "rgba(0,0,0,0.18)", border: "none", color: "inherit", fontWeight: 700, fontSize: 12, cursor: "pointer", padding: "4px 10px", borderRadius: 6, flexShrink: 0 }}
      >
        Choose plan
      </button>
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
