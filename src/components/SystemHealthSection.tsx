"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

type Status = "operational" | "warning" | "critical" | "checking";

interface Service {
  name: string;
  detail: string;
  status: Status;
}

const dot: Record<Status, string> = {
  operational: "#4ade80",
  warning: "#f59e0b",
  critical: "#ef4444",
  checking: "#3e3e56",
};

const label: Record<Status, string> = {
  operational: "Operational",
  warning: "Warning",
  critical: "Offline",
  checking: "Checking...",
};

function StatusDot({ status }: { status: Status }) {
  return (
    <span style={{
      display: "inline-block",
      width: "8px",
      height: "8px",
      borderRadius: "50%",
      background: dot[status],
      boxShadow: status !== "checking" ? `0 0 6px ${dot[status]}` : "none",
      flexShrink: 0,
      transition: "background 0.3s ease",
    }} />
  );
}

export default function SystemHealthSection() {
  const [services, setServices] = useState<Service[]>([
    { name: "Supabase API", detail: "REST & Realtime", status: "checking" },
    { name: "Authentication", detail: "Auth service", status: "checking" },
    { name: "Database", detail: "PostgreSQL", status: "checking" },
    { name: "Billing Engine", detail: "Payment hooks", status: "checking" },
    { name: "AI Services", detail: "Claude API", status: "checking" },
    { name: "Org Module", detail: "Organizations", status: "checking" },
    { name: "Notifications", detail: "Alert system", status: "checking" },
    { name: "Realtime", detail: "Live subscriptions", status: "checking" },
    { name: "Storage", detail: "File storage", status: "checking" },
  ]);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);

  const updateService = (
    name: string,
    update: Partial<Service>,
    current: Service[]
  ): Service[] => current.map(s => s.name === name ? { ...s, ...update } : s);

  const checkServices = async () => {
    const supabase = createClient();
    let updated: Service[] = [
      { name: "Supabase API", detail: "REST & Realtime", status: "checking" },
      { name: "Authentication", detail: "Auth service", status: "checking" },
      { name: "Database", detail: "PostgreSQL", status: "checking" },
      { name: "Billing Engine", detail: "Payment hooks", status: "checking" },
      { name: "AI Services", detail: "Claude API", status: "checking" },
      { name: "Org Module", detail: "Organizations", status: "checking" },
      { name: "Notifications", detail: "Alert system", status: "checking" },
      { name: "Realtime", detail: "Live subscriptions", status: "checking" },
      { name: "Storage", detail: "File storage", status: "checking" },
    ];

    setServices([...updated]);

    try {
      const start = Date.now();
      const { error } = await supabase.from("organizations").select("id").limit(1);
      const ms = Date.now() - start;
      updated = updateService("Database", {
        status: error ? "critical" : "operational",
        detail: error ? error.message : `PostgreSQL · ${ms}ms`,
      }, updated);
    } catch {
      updated = updateService("Database", { status: "critical", detail: "Connection failed" }, updated);
    }
    setServices([...updated]);

    try {
      const { data, error } = await supabase.from("organizations").select("id");
      updated = updateService("Org Module", {
        status: error ? "critical" : "operational",
        detail: error ? "Module error" : `${data?.length ?? 0} orgs active`,
      }, updated);
    } catch {
      updated = updateService("Org Module", { status: "critical", detail: "Module offline" }, updated);
    }
    setServices([...updated]);

    try {
      const { error } = await supabase.from("notifications").select("id").limit(1);
      updated = updateService("Notifications", {
        status: error ? "warning" : "operational",
        detail: error ? "Queue error" : "Queue processing",
      }, updated);
    } catch {
      updated = updateService("Notifications", { status: "warning", detail: "Queue issue" }, updated);
    }
    setServices([...updated]);

    try {
      const { error } = await supabase.from("invoices").select("id").limit(1);
      updated = updateService("Billing Engine", {
        status: error ? "warning" : "operational",
        detail: error ? "Billing issue" : "Payment hooks active",
      }, updated);
    } catch {
      updated = updateService("Billing Engine", { status: "warning", detail: "Billing offline" }, updated);
    }
    setServices([...updated]);

    try {
      const start = Date.now();
      const res = await fetch(`https://liqxfdfouuxvokbpvwpk.supabase.co/realtime/v1/api/health`, {
        signal: AbortSignal.timeout(5000),
      });
      const ms = Date.now() - start;
      updated = updateService("Realtime", {
        status: res.ok ? "operational" : "warning",
        detail: res.ok ? `Live subscriptions · ${ms}ms` : "Connection issues",
      }, updated);
    } catch {
      updated = updateService("Realtime", { status: "warning", detail: "Realtime unreachable" }, updated);
    }
    setServices([...updated]);

    const httpChecks: Array<{ name: string; url: string; method?: string }> = [
      { name: "Supabase API", url: "https://liqxfdfouuxvokbpvwpk.supabase.co/rest/v1/" },
      { name: "Authentication", url: "https://liqxfdfouuxvokbpvwpk.supabase.co/auth/v1/health" },
      { name: "Storage", url: "https://liqxfdfouuxvokbpvwpk.supabase.co/storage/v1/status" },
      { name: "AI Services", url: "https://api.anthropic.com" },
    ];

    await Promise.all(httpChecks.map(async ({ name, url, method = "GET" }) => {
      try {
        const start = Date.now();
        const res = await fetch(url, {
          method,
          signal: AbortSignal.timeout(5000),
          headers: method === "POST" ? { "Content-Type": "application/json" } : undefined,
          body: method === "POST" ? JSON.stringify({}) : undefined,
        });
        const ms = Date.now() - start;
        const ok = res.ok || [400, 401, 403, 405].includes(res.status);
        updated = updateService(name, {
          status: ok ? "operational" : ms > 3000 ? "warning" : "operational",
          detail: `${ok ? "Responding" : "Slow"} · ${ms}ms`,
        }, updated);
      } catch {
        updated = updateService(name, {
          status: "warning",
          detail: "Timeout or blocked",
        }, updated);
      }
    }));

    setServices([...updated]);
    setLastChecked(new Date());
  };

  useEffect(() => {
    setMounted(true);
    checkServices();
    const interval = setInterval(checkServices, 30000);
    return () => clearInterval(interval);
  }, []);

  const operational = services.filter(s => s.status === "operational").length;
  const warnings = services.filter(s => s.status === "warning").length;
  const critical = services.filter(s => s.status === "critical").length;
  const checking = services.filter(s => s.status === "checking").length;
  const overallStatus: Status = critical > 0 ? "critical" : warnings > 0 ? "warning" : checking > 0 ? "checking" : "operational";
  const overallPct = checking === 0 ? Math.round((operational / services.length) * 100) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <StatusDot status={overallStatus} />
              <span style={{ fontWeight: 600, fontSize: "14px" }}>
                {overallPct !== null ? `${overallPct}% Operational` : "Checking services..."}
              </span>
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
              Last checked · {mounted && lastChecked
                ? lastChecked.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
                : "—"}
            </div>
          </div>
          <button onClick={checkServices} style={{
            padding: "6px 12px", borderRadius: "6px",
            border: "1px solid var(--border)", background: "transparent",
            color: "var(--text-muted)", fontSize: "11px", cursor: "pointer", fontFamily: "inherit",
          }}>
            ↻ Refresh
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
        {[
          { count: operational, color: "#4ade80", label: "Online" },
          { count: warnings, color: "#f59e0b", label: "Warning" },
          { count: critical, color: "#ef4444", label: "Offline" },
        ].map((s, i) => (
          <div key={i} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px", textAlign: "center" }}>
            <div style={{ fontSize: "24px", fontWeight: 700, color: s.color }}>{s.count}</div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px" }}>
        <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "10px", letterSpacing: "0.05em" }}>SERVICES</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {services.map((service, i) => (
            <div key={i} style={{
              background: "var(--bg-elevated)", border: "1px solid var(--border)",
              borderRadius: "10px", padding: "10px 12px",
              display: "flex", alignItems: "center", gap: "10px",
            }}>
              <StatusDot status={service.status} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }}>{service.name}</div>
                <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "1px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{service.detail}</div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: "10px", color: dot[service.status], fontWeight: 600 }}>{label[service.status]}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ fontSize: "11px", color: "var(--text-muted)", textAlign: "center", padding: "4px 0" }}>
        These are live checks, run every 30 seconds — there's no historical uptime log yet, so only the current status is shown.
      </div>
    </div>
  );
}