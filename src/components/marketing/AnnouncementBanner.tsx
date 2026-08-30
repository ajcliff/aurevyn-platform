"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

type Announcement = {
  id: string;
  title: string;
  message: string;
  type: "maintenance" | "update" | "info";
  starts_at: string;
  ends_at: string;
};

function formatWindow(startsAt: string, endsAt: string) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const dateFmt: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const timeFmt: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };
  const sameDay = start.toDateString() === end.toDateString();
  if (sameDay) {
    return `${start.toLocaleDateString(undefined, dateFmt)}, ${start.toLocaleTimeString(undefined, timeFmt)}–${end.toLocaleTimeString(undefined, timeFmt)}`;
  }
  return `${start.toLocaleDateString(undefined, dateFmt)} – ${end.toLocaleDateString(undefined, dateFmt)}`;
}

export default function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const now = new Date().toISOString();

    supabase
      .from("site_announcements")
      .select("*")
      .eq("active", true)
      .gte("ends_at", now)
      .order("starts_at", { ascending: true })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setAnnouncement(data as Announcement);
          setDismissed(localStorage.getItem(`mkt-announcement-dismissed:${data.id}`) === "1");
        }
      });
  }, []);

  if (!announcement || dismissed) return null;

  const isUpcoming = new Date(announcement.starts_at) > new Date();
  const window = formatWindow(announcement.starts_at, announcement.ends_at);

  const dismiss = () => {
    localStorage.setItem(`mkt-announcement-dismissed:${announcement.id}`, "1");
    setDismissed(true);
  };

  return (
    <div className={`mkt-banner mkt-banner--${announcement.type}`}>
      <div className="mkt-container mkt-banner__row">
        <span className="mkt-mono mkt-banner__tag">
          {announcement.type === "maintenance" ? "Maintenance" : announcement.type === "update" ? "Update" : "Notice"}
        </span>
        <span className="mkt-banner__text">
          <strong>{announcement.title}.</strong> {announcement.message}{" "}
          <span className="mkt-dim">
            {isUpcoming ? "Scheduled for" : "Happening now,"} {window}
          </span>
        </span>
        <button onClick={dismiss} className="mkt-banner__close" aria-label="Dismiss">×</button>
      </div>

      <style>{`
        .mkt-banner {
          border-bottom: 1px solid var(--mkt-line);
          background: var(--mkt-ink-2);
        }
        .mkt-banner--maintenance { border-bottom-color: var(--mkt-amber); }
        .mkt-banner--update { border-bottom-color: var(--mkt-blueprint); }
        .mkt-banner--info { border-bottom-color: var(--mkt-line-strong); }
        .mkt-banner__row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 0;
        }
        .mkt-banner__tag {
          flex-shrink: 0;
          font-size: 0.6875rem;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          padding: 3px 8px;
          border: 1px solid var(--mkt-line-strong);
          color: var(--mkt-paper-dim);
        }
        .mkt-banner__text {
          flex: 1;
          font-size: 0.8125rem;
          color: var(--mkt-paper);
          line-height: 1.5;
        }
        .mkt-banner__close {
          background: none;
          border: none;
          color: var(--mkt-paper-faint);
          font-size: 1.125rem;
          line-height: 1;
          cursor: pointer;
          padding: 4px 6px;
          flex-shrink: 0;
        }
        .mkt-banner__close:hover {
          color: var(--mkt-paper);
        }
        @media (max-width: 700px) {
          .mkt-banner__row {
            flex-wrap: wrap;
          }
        }
      `}</style>
    </div>
  );
}