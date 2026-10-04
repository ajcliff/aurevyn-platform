"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import RevenueChart from "@/components/RevenueChart";
import SystemActivity from "@/components/SystemActivity";
import OrgsNeedingAttention from "@/components/OrgsNeedingAttention";
import GreetingHeader from "@/components/GreetingHeader";
import ErrorBanner from "@/components/ErrorBanner";
import { getOrganizations, updateOrganization, type Organization } from "@/lib/organizations";
import { getPlatformPaymentsSince } from "@/lib/payments";
import { formatError } from "@/lib/errorFormat";
import { createClient } from "@/lib/supabase";
import { logError } from "@/lib/errorLog";
import f from "@/styles/founder.module.css";

type Range = "7d" | "30d";

const kes = (n: number) => `KES ${Math.round(n).toLocaleString("en-KE")}`;

export default function Home() {
  const router = useRouter();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<Range>("7d");
  const [dailyRevenue, setDailyRevenue] = useState<number[]>([]);
  const [growthPct, setGrowthPct] = useState<number | null>(null);

  const days = range === "7d" ? 7 : 30;

  const loadRevenue = useCallback(async (days: number) => {
    try {
      // Two back-to-back windows of `days` days, ending today, so we can compare period-over-period.
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const since = new Date(today);
      since.setDate(since.getDate() - (days * 2 - 1));

      const payments = await getPlatformPaymentsSince(since.toISOString());

      const buckets: number[] = Array(days * 2).fill(0);
      const startTime = since.getTime();
      const msPerDay = 86400000;

      for (const p of payments) {
        const dayIndex = Math.floor((new Date(p.created_at).getTime() - startTime) / msPerDay);
        if (dayIndex >= 0 && dayIndex < buckets.length) buckets[dayIndex] += p.amount;
      }

      const currentPeriod = buckets.slice(days);
      const priorPeriod = buckets.slice(0, days);
      const currentTotal = currentPeriod.reduce((a, b) => a + b, 0);
      const priorTotal = priorPeriod.reduce((a, b) => a + b, 0);

      setDailyRevenue(currentPeriod);
      setGrowthPct(priorTotal > 0 ? Math.round(((currentTotal - priorTotal) / priorTotal) * 100) : null);
    } catch (err) {
      // revenue trend is a nice-to-have — don't block the rest of the page on it
      console.error("Failed to load revenue trend:", err);
    }
  }, []);

  useEffect(() => {
    load();

    const supabase = createClient();

    const orgsChannel = supabase
      .channel("orgs-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "organizations" }, () => {
        getOrganizations().then(setOrgs).catch((err) => setError(formatError(err)));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(orgsChannel);
    };
  }, []);

  useEffect(() => {
    loadRevenue(days);
  }, [loadRevenue, days]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const orgsData = await getOrganizations();
      setOrgs(orgsData);
    } catch (err) {
      const message = formatError(err);
      setError(message);
      logError({ source: "dashboard/overview", message });
    } finally {
      setLoading(false);
    }
  }

  async function handleOrgStatusChange(id: string, status: Organization["status"]) {
    const prev = orgs;
    setOrgs(o => o.map(org => org.id === id ? { ...org, status } : org));
    try {
      await updateOrganization(id, { status });
    } catch (err) {
      setOrgs(prev);
      setError(formatError(err));
    }
  }

  const totalRevenue = orgs.reduce((sum, org) => {
    const num = parseInt(org.revenue.replace(/[^0-9]/g, "")) || 0;
    return sum + num;
  }, 0);

  const activeOrgs = orgs.filter(o => o.status === "operational").length;
  const flagged = orgs.length - activeOrgs;
  const licensedOrgs = orgs.filter(o => o.package_confirmed_at).length;
  const periodTotal = dailyRevenue.reduce((a, b) => a + b, 0);

  const headline = loading
    ? "Checking on your organizations"
    : orgs.length === 0
      ? "No organizations yet."
      : flagged === 0
        ? orgs.length === 1 ? "Your organization is running." : `All ${orgs.length} organizations are running.`
        : flagged === 1 ? "1 organization needs you." : `${flagged} organizations need you.`;

  return (
    <div className={`page-shell ${f.root}`}>
      <main className="page-main">
        <div className={f.page}>
          <GreetingHeader
            headline={headline}
            actions={
              <div className={f.segmented} role="group" aria-label="Time range">
                {(["7d", "30d"] as const).map(r => (
                  <button key={r} className={f.segBtn} aria-pressed={range === r} onClick={() => setRange(r)}>
                    {r === "7d" ? "7 days" : "30 days"}
                  </button>
                ))}
              </div>
            }
          />

          {error && <ErrorBanner message={error} source="dashboard/overview" onRetry={load} />}

          {loading ? (
            <p className={f.status} role="status">Loading overview…</p>
          ) : (
            <>
              <section className={f.revenue} aria-label="Revenue">
                <div>
                  <div className={f.figLabel}>Monthly revenue</div>
                  <div className={f.fig}>{kes(totalRevenue)}</div>
                  <p className={f.figNote}>
                    {kes(periodTotal)} in payments over the last {days} days
                    {growthPct === null ? "." : (
                      <>
                        , <span className={growthPct >= 0 ? f.up : f.down}>{growthPct >= 0 ? "up" : "down"} {Math.abs(growthPct)}%</span>{" "}
                        on the {days} days before.
                      </>
                    )}
                  </p>
                </div>
                <div className={f.chartWrap}>
                  <RevenueChart values={dailyRevenue} format={kes} />
                </div>
              </section>

              <div className={f.vitals}>
                <button className={f.vital} onClick={() => router.push("/dashboard/organizations")}>
                  <span className={f.vitalLabel}>Organizations</span>
                  <span className={f.vitalValue}>{orgs.length}</span>
                  <span className={f.vitalSub}>{activeOrgs} operational</span>
                </button>
                <button className={f.vital} onClick={() => router.push("/dashboard/licensing")}>
                  <span className={f.vitalLabel}>Licensed</span>
                  <span className={f.vitalValue}>{licensedOrgs}</span>
                  <span className={f.vitalSub}>{orgs.length - licensedOrgs} on free trial</span>
                </button>
                <button className={f.vital} onClick={() => router.push("/dashboard/finance")}>
                  <span className={f.vitalLabel}>Finance</span>
                  <span className={f.vitalValue}>Open ledger</span>
                  <span className={f.vitalSub}>Income, expenses and cashflow</span>
                </button>
                <button className={f.vital} onClick={() => router.push("/dashboard/control")}>
                  <span className={f.vitalLabel}>System health</span>
                  <span className={f.vitalValue}>Check status</span>
                  <span className={f.vitalSub}>Live service checks</span>
                </button>
              </div>

              <div className={f.split}>
                <OrgsNeedingAttention orgs={orgs} onStatusChange={handleOrgStatusChange} />
                <SystemActivity />
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}