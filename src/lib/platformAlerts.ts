import { createClient } from "@/lib/supabase";

export type PlatformAlert = {
  id: string;
  icon: string;
  text: string;
  time: string;
  color: string;
};

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diffMs / 3600000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export async function getPlatformAlerts(): Promise<PlatformAlert[]> {
  const supabase = createClient();
  const alerts: PlatformAlert[] = [];

  const { data: orgs } = await supabase
    .from("organizations")
    .select("id, name, status")
    .neq("status", "operational");

  (orgs || []).forEach((org) => {
    alerts.push({
      id: `org-${org.id}`,
      icon: org.status === "critical" ? "⚠" : "🔔",
      text: `${org.name} — status: ${org.status}`,
      time: "",
      color: org.status === "critical" ? "#ef4444" : "#f59e0b",
    });
  });

  const { data: staleInvites } = await supabase
    .from("team_invites")
    .select("id, email, org_id, created_at, organizations(name)")
    .eq("status", "pending")
    .lt("created_at", new Date(Date.now() - 3 * 86400000).toISOString());

  (staleInvites || []).forEach((inv: any) => {
    alerts.push({
      id: `invite-${inv.id}`,
      icon: "✉",
      text: `${inv.email} hasn't accepted their invite (${inv.organizations?.name || "org"})`,
      time: timeAgo(inv.created_at),
      color: "#c9a84c",
    });
  });

  return alerts;
}