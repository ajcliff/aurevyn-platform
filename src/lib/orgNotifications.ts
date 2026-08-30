import { getLowStockProducts, type InventoryProduct } from "@/lib/inventory";
import { getPendingLeaveRequestsForOrg, getRecentLeaveDecisionsForEmployee } from "@/lib/employeeHub";
import { getMyBroadcasts, type Broadcast } from "@/lib/employeeHub";
import { getPendingInvites, type TeamInvite } from "@/lib/team";
import { getPendingApprovalsForOrg } from "@/lib/approvals";

export type OrgNotification = {
  id: string;
  icon: string;
  title: string;
  detail: string;
  href: string;
  time: string;
};

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diffMs / 3600000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export async function getOrgNotifications(params: {
  orgId: string;
  hasInventory: boolean;
  hasHR: boolean;
  canManageTeam: boolean;
  canApprove: boolean;
  employeeId: string | null;
  department: string | null;
}): Promise<OrgNotification[]> {
  const { orgId, hasInventory, hasHR, canManageTeam, canApprove, employeeId, department } = params;
  
  const items: OrgNotification[] = [];

  if (hasInventory) {
    const lowStock = await getLowStockProducts(orgId);
    lowStock.forEach((p: InventoryProduct) => {
      items.push({
        id: `stock-${p.id}`,
        icon: "📦",
        title: `${p.name} is low on stock`,
        detail: `${p.stock_quantity} ${p.unit || "units"} left`,
        href: `/org/${orgId}/inventory`,
        time: "",
      });
    });
  }

  if (hasHR && canManageTeam) {
    const leave = await getPendingLeaveRequestsForOrg(orgId);
    leave.forEach((lv: any) => {
      items.push({
        id: `leave-${lv.id}`,
        icon: "🧑‍💼",
        title: `${lv.employees?.full_name || "An employee"} requested leave`,
        detail: `${lv.leave_type} · ${lv.start_date} → ${lv.end_date}`,
        href: `/org/${orgId}/employees`,
        time: timeAgo(lv.created_at),
      });
    });
  }

  if (canManageTeam) {
    const invites = await getPendingInvites(orgId);
    invites.forEach((inv: TeamInvite) => {
      items.push({
        id: `invite-${inv.id}`,
        icon: "✉",
        title: `Invite pending for ${inv.email}`,
        detail: `Sent as ${inv.role}`,
        href: `/org/${orgId}/team`,
        time: timeAgo(inv.created_at),
      });
    });
  }

if (canApprove) {
    const approvals = await getPendingApprovalsForOrg(orgId);
    approvals.forEach((a) => {
      items.push({
        id: `approval-${a.id}`,
        icon: "✅",
        title: `${a.type[0].toUpperCase()}${a.type.slice(1)} request pending`,
        detail: `${a.title}${a.amount ? ` · KES ${a.amount.toLocaleString()}` : ""}`,
        href: `/org/${orgId}/approvals`,
        time: "",
      });
    });
  }

  if (employeeId) {
    const broadcasts = await getMyBroadcasts(orgId, department, employeeId);
    broadcasts.slice(0, 5).forEach((b: Broadcast) => {
      items.push({
        id: `broadcast-${b.id}`,
        icon: "📣",
        title: b.title,
        detail: b.message,
        href: `/org/${orgId}/employees`,
        time: timeAgo(b.created_at),
      });
    });

    const leaveDecisions = await getRecentLeaveDecisionsForEmployee(employeeId);
    leaveDecisions.forEach((lv: any) => {
      items.push({
        id: `leave-decision-${lv.id}`,
        icon: lv.status === "approved" ? "✅" : "❌",
        title: `Your leave request was ${lv.status}`,
        detail: `${lv.leave_type} · ${lv.start_date} → ${lv.end_date}`,
        href: `/org/${orgId}/me`,
        time: timeAgo(lv.updated_at),
      });
    });
  }

  return items;
}