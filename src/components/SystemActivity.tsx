"use client";

import { useEffect, useState } from "react";
import { getActivity, type Activity } from "@/lib/activity";
import { createClient } from "@/lib/supabase";
import f from "@/styles/founder.module.css";

function timeAgo(dateStr: string) {
  const diff = Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000));
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function SystemActivity() {
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    getActivity().then(setActivities);

    const supabase = createClient();
    const channel = supabase
      .channel("activity-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity" }, payload => {
        const entry = payload.new as Activity;
        if (entry.org_id) return;
        setActivities(prev => [entry, ...prev].slice(0, 10));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <section aria-labelledby="activity-title">
      <div className={f.sectionHead}>
        <h2 id="activity-title" className={f.sectionTitle}>Activity</h2>
        <span className={f.live}>Live</span>
      </div>

      {activities.length === 0 ? (
        <div className={f.empty}>
          <strong>No activity yet.</strong>
          Sign-ups, payments and status changes appear here as they happen.
        </div>
      ) : (
        <ul className={f.feed}>
          {activities.map(a => (
            <li key={a.id} className={f.feedItem}>
              <span className={f.feedDot} aria-hidden="true" />
              <div>
                <div className={f.feedTitle}>{a.title}</div>
                <div className={f.feedSub}>{a.sub}</div>
              </div>
              <span className={f.feedTime}>{timeAgo(a.created_at)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}