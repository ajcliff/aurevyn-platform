"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import StatCard from "@/components/StatCard";
import Sparkline from "@/components/Sparkline";
import SystemActivity from "@/components/SystemActivity";
import OrgsNeedingAttention from "@/components/OrgsNeedingAttention";
import GreetingHeader from "@/components/GreetingHeader";
import ErrorBanner from "@/components/ErrorBanner";
import { getOrganizations, updateOrganization, type Organization } from "@/lib/organizations";
import { getPackages, type Package } from "@/lib/packages";
import { getPlatformPaymentsSince } from "@/lib/payments";
import { formatError } from "@/lib/errorFormat";
import { createClient } from "@/lib/supabase";
import s from "@/styles/layout.module.css";
import { logError } from "@/lib/errorLog";

type Range = "7d" | "30d";

export default function Home() {
  const router = useRouter();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<Range>("7d");
  const [dailyRevenue, setDailyRevenue] = useState<number[]>([]);
  const [growthPct, setGrowthPct] = useState<number | null>(null);

  const days = range === "7d" ? 7 : 30;

  const loadRevenue = useCallback(async (days: number) => {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days * 2); // fetch double the window so we can compare period-over-period
      since.setHours(0, 0, 0, 0);

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
    loadRevenue(days);

    const supabase = createClient();

    const orgsChannel = supabase
      .channel("orgs-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "organizations" }, () => {
        getOrganizations().then(setOrgs).catch((err) => setError(formatError(err)));
      })
      .subscribe();

    const packagesChannel = supabase
      .channel("packages-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "packages" }, () => {
        getPackages().then(setPackages).catch((err) => setError(formatError(err)));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(orgsChannel);
      supabase.removeChannel(packagesChannel);
    };
  }, []);

  useEffect(() => {
    loadRevenue(days);
  }, [range, loadRevenue, days]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [orgsData, packagesData] = await Promise.all([getOrganizations(), getPackages()]);
      setOrgs(orgsData);
      setPackages(packagesData);
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

  return (
    <div className={s.shell}>
      <div className={s.body}>
        <main className={s.main}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <GreetingHeader />
            <div style={{ display: "flex", gap: "4px" }}>
              {(["7d", "30d"] as const).map(r => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  style={{
                    padding: "6px 14px", borderRadius: "8px", border: "1px solid var(--border)",
                    background: range === r ? "var(--bg-elevated)" : "transparent",
                    color: range === r ? "var(--gold)" : "var(--text-muted)",
                    fontSize: "11px", fontWeight: range === r ? 600 : 400,
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  {r === "7d" ? "7 Days" : "30 Days"}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <ErrorBanner
              message={error}
              source="dashboard/overview"
              onRetry={load}
            />
          )}

          {loading ? (
            <div style={{ padding: 20, fontSize: 13, color: "var(--text-muted)" }}>Loading overview...</div>
          ) : (
            <>
              <div className={s.summaryCards}>
                <StatCard
                  label="Monthly Revenue"
                  value={`KES ${totalRevenue.toLocaleString()}`}
                  sub={growthPct === null ? `Last ${days} days` : `${growthPct >= 0 ? "↑" : "↓"} ${Math.abs(growthPct)}% vs prior ${days}d`}
                  subColor={growthPct === null || growthPct >= 0 ? "var(--green)" : "#ef4444"}
                  icon="📈"
                  onClick={() => router.push("/dashboard/finance")}
                  chart={<Sparkline values={dailyRevenue} />}
                />
                <StatCard
                  label="Active Organizations"
                  value={`${orgs.length}`}
                  sub={`${activeOrgs} operational`}
                  icon="🏢"
                  onClick={() => router.push("/dashboard/organizations")}
                />
                <StatCard
                  label="Packages"
                  value={`${packages.length}`}
                  sub={`${packages.reduce((sum, p) => sum + p.orgs, 0)} subscriptions`}
                  icon="📦"
                  onClick={() => router.push("/dashboard/packages")}
                />
                <StatCard
                  label="System Health"
                  value="View status"
                  sub="Live service checks"
                  subColor="var(--green)"
                  icon="⚡"
                  onClick={() => router.push("/dashboard/control")}
                />
              </div>

              <div style={{ display: "flex", gap: "16px", flex: 1 }}>
                <OrgsNeedingAttention orgs={orgs} onStatusChange={handleOrgStatusChange} />
                <SystemActivity />
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}