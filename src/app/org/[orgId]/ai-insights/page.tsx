"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useEngine } from "@/lib/runtime/EngineContext";
import Drawer from "@/components/Drawer";
import EmptyState from "@/components/EmptyState";
import { getInsights, type Insight, type InsightSeverity, type InsightCategory } from "@/lib/insights";

const SEVERITY_LABELS: Record<InsightSeverity, string> = {
  critical: "Critical",
  warning: "Warning",
  positive: "Positive",
  info: "Info",
};

const SEVERITY_COLORS: Record<InsightSeverity, string> = {
  critical: "#ef4444",
  warning: "#f5b942",
  positive: "#3dd68c",
  info: "#5b9cf5",
};

const SEVERITY_ICONS: Record<InsightSeverity, string> = {
  critical: "🔴",
  warning: "🟡",
  positive: "🟢",
  info: "🔵",
};

const CATEGORY_LABELS: Record<InsightCategory, string> = {
  sales: "Sales",
  inventory: "Inventory",
  customers: "Customers",
  finance: "Finance",
};

const CATEGORY_ICONS: Record<InsightCategory, string> = {
  sales: "📈",
  inventory: "📦",
  customers: "👥",
  finance: "💰",
};

export default function AiInsightsPage() {
  const { organization, installedEngines } = useEngine();
  const router = useRouter();

  const installedSlugs = useMemo(
    () => installedEngines.map((e) => e.engines?.slug).filter((s): s is string => Boolean(s)),
    [installedEngines]
  );

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [severityFilter, setSeverityFilter] = useState<"all" | InsightSeverity>("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | InsightCategory>("all");
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [showDismissed, setShowDismissed] = useState(false);
  const [selected, setSelected] = useState<Insight | null>(null);
  const [lastGenerated, setLastGenerated] = useState<Date | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const data = await getInsights(organization.id, installedSlugs);
    setInsights(data);
    setLastGenerated(new Date());
    setLoading(false);
  }

  async function handleRefresh() {
    setRefreshing(true);
    const data = await getInsights(organization.id, installedSlugs);
    setInsights(data);
    setLastGenerated(new Date());
    setRefreshing(false);
  }

  function handleDismiss(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    setDismissed((prev) => new Set(prev).add(id));
    if (selected?.id === id) setSelected(null);
  }

  function handleRestore(id: string) {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  const categoriesPresent = useMemo(
    () => Array.from(new Set(insights.map((i) => i.category))) as InsightCategory[],
    [insights]
  );

  const visible = insights.filter((i) => {
    if (!showDismissed && dismissed.has(i.id)) return false;
    if (severityFilter !== "all" && i.severity !== severityFilter) return false;
    if (categoryFilter !== "all" && i.category !== categoryFilter) return false;
    return true;
  });

  const activeCount = insights.filter((i) => !dismissed.has(i.id)).length;
  const dismissedCount = dismissed.size;
  const criticalCount = insights.filter((i) => i.severity === "critical" && !dismissed.has(i.id)).length;

  if (loading) return <div>Scanning your data for insights...</div>;

  return (
    <div style={{ overflowY: "auto", height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>AI Insights</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
            Automatically generated patterns and anomalies across {organization.name}.
            {lastGenerated && (
              <span style={{ opacity: 0.7 }}> Last checked {lastGenerated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.</span>
            )}
          </p>
        </div>
        <button style={ghostButton} onClick={handleRefresh} disabled={refreshing}>
          {refreshing ? "Refreshing..." : "↻ Refresh"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 20 }}>
        <div className="card" style={cardStyle}>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Active Insights</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{activeCount}</div>
        </div>
        <div className="card" style={cardStyle}>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Needing Urgent Attention</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: criticalCount > 0 ? SEVERITY_COLORS.critical : undefined }}>
            {criticalCount}
          </div>
        </div>
        <div className="card" style={cardStyle}>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Dismissed</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{dismissedCount}</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
        <FilterChip label="All" active={severityFilter === "all"} onClick={() => setSeverityFilter("all")} />
        {(Object.keys(SEVERITY_LABELS) as InsightSeverity[]).map((s) => (
          <FilterChip
            key={s}
            label={`${SEVERITY_ICONS[s]} ${SEVERITY_LABELS[s]}`}
            active={severityFilter === s}
            onClick={() => setSeverityFilter(s)}
          />
        ))}
      </div>

      {categoriesPresent.length > 1 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
          <FilterChip label="All categories" active={categoryFilter === "all"} onClick={() => setCategoryFilter("all")} />
          {categoriesPresent.map((c) => (
            <FilterChip
              key={c}
              label={`${CATEGORY_ICONS[c]} ${CATEGORY_LABELS[c]}`}
              active={categoryFilter === c}
              onClick={() => setCategoryFilter(c)}
            />
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <div className="card" style={cardStyle}>
          <EmptyState
            icon={insights.length === 0 ? "✨" : "🙌"}
            message={
              insights.length === 0
                ? "No notable patterns right now — check back as more data comes in."
                : showDismissed
                  ? "Nothing matches this filter."
                  : "You're caught up — every insight has been reviewed."
            }
          />
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          {visible.map((insight) => {
            const isDismissed = dismissed.has(insight.id);
            return (
              <div
                key={insight.id}
                onClick={() => setSelected(insight)}
                style={{
                  ...cardStyle,
                  padding: 16,
                  cursor: "pointer",
                  opacity: isDismissed ? 0.5 : 1,
                  borderLeft: `3px solid ${SEVERITY_COLORS[insight.severity]}`,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <Badge color={SEVERITY_COLORS[insight.severity]}>
                    {CATEGORY_ICONS[insight.category]} {CATEGORY_LABELS[insight.category]}
                  </Badge>
                  {isDismissed ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRestore(insight.id);
                      }}
                      style={restoreButtonStyle}
                    >
                      Restore
                    </button>
                  ) : (
                    <button onClick={(e) => handleDismiss(e, insight.id)} style={dismissButtonStyle} title="Dismiss">
                      ✕
                    </button>
                  )}
                </div>

                <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.3 }}>{insight.title}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.4, flex: 1 }}>{insight.detail}</div>

                {insight.metric && (
                  <div style={{ fontSize: 20, fontWeight: 800, color: SEVERITY_COLORS[insight.severity] }}>
                    {insight.metric}
                  </div>
                )}

                <div style={{ fontSize: 11, color: "var(--gold)", fontWeight: 600, marginTop: 4 }}>View details →</div>
              </div>
            );
          })}
        </div>
      )}

      {dismissedCount > 0 && (
        <div style={{ marginTop: 16, textAlign: "center" }}>
          <button style={ghostButtonSmall} onClick={() => setShowDismissed((v) => !v)}>
            {showDismissed ? "Hide dismissed" : `Show ${dismissedCount} dismissed`}
          </button>
        </div>
      )}

      <Drawer open={!!selected} onClose={() => setSelected(null)} title={selected?.title ?? ""} width={420}>
        {selected && (
          <>
            <Badge color={SEVERITY_COLORS[selected.severity]}>
              {CATEGORY_ICONS[selected.category]} {CATEGORY_LABELS[selected.category]} · {SEVERITY_LABELS[selected.severity]}
            </Badge>

            {selected.metric && (
              <div style={{ fontSize: 32, fontWeight: 800, color: SEVERITY_COLORS[selected.severity], margin: "16px 0 4px" }}>
                {selected.metric}
              </div>
            )}

            <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 20 }}>
              {selected.detail}
            </p>

            {selected.breakdown && selected.breakdown.length > 0 && (
              <>
                <SectionDivider label="Breakdown" />
                <div className="card" style={{ ...cardStyle, padding: 8, marginBottom: 20 }}>
                  {selected.breakdown.map((b, i) => (
                    <div key={i} style={breakdownRowStyle}>
                      <span style={{ fontSize: 12 }}>{b.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 700 }}>{b.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button style={{ ...buttonGold, flex: 1 }} onClick={() => router.push(selected.href)}>
                Open in {CATEGORY_LABELS[selected.category]} →
              </button>
              {!dismissed.has(selected.id) && (
                <button
                  style={ghostButton}
                  onClick={(e) => {
                    handleDismiss(e, selected.id);
                  }}
                >
                  Dismiss
                </button>
              )}
            </div>
          </>
        )}
      </Drawer>
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 14px",
        borderRadius: 8,
        border: "1px solid var(--border)",
        background: active ? "var(--gold)" : "var(--bg-elevated)",
        color: active ? "#07070f" : "var(--text-secondary)",
        fontSize: 11,
        fontWeight: active ? 700 : 500,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "3px 8px",
        borderRadius: 6,
        background: `${color}1f`,
        border: `1px solid ${color}40`,
        color,
        fontSize: 10,
        fontWeight: 700,
        width: "fit-content",
      }}
    >
      {children}
    </span>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: 0.5, margin: "4px 0 10px" }}>
      {label.toUpperCase()}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 14,
  padding: 20,
};

const breakdownRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  padding: "8px 10px",
  borderBottom: "1px solid var(--border)",
};

const buttonGold: React.CSSProperties = {
  background: "var(--gold)",
  color: "#07070f",
  border: "none",
  borderRadius: 10,
  padding: "9px 18px",
  fontWeight: 700,
  fontSize: 12,
  cursor: "pointer",
};

const ghostButton: React.CSSProperties = {
  padding: "9px 18px",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--text-secondary)",
  fontSize: 12,
  cursor: "pointer",
};

const ghostButtonSmall: React.CSSProperties = {
  padding: "5px 10px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--text-secondary)",
  fontSize: 11,
  cursor: "pointer",
};

const dismissButtonStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "var(--text-muted)",
  fontSize: 13,
  cursor: "pointer",
  lineHeight: 1,
  padding: 2,
};

const restoreButtonStyle: React.CSSProperties = {
  background: "transparent",
  border: "1px solid var(--border)",
  borderRadius: 6,
  color: "var(--gold)",
  fontSize: 10,
  fontWeight: 700,
  cursor: "pointer",
  padding: "3px 8px",
};