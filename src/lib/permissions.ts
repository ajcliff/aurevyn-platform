import type { TeamRole } from "./team";
import type { MyMembership } from "./runtime/getMyMembership";

export type Capability =
  | "manage_team"
  | "manage_org_settings"
  | "manage_engine_access"
  | "approve_requests"
  | "view_financial_reports"
  | "use_engines"
  | "manage_billing";

const ROLE_CAPABILITIES: Record<TeamRole, Capability[]> = {
  owner: [
    "manage_team", "manage_org_settings", "manage_engine_access",
    "approve_requests", "view_financial_reports", "use_engines", "manage_billing",
  ],
  admin: [
    "manage_team", "manage_org_settings", "manage_engine_access",
    "approve_requests", "view_financial_reports", "use_engines",
  ],
  manager: ["approve_requests", "view_financial_reports", "use_engines"],
  staff: ["use_engines"],
};

export function hasPermission(membership: MyMembership | null, capability: Capability): boolean {
  if (!membership) return false;
  if (membership.isFounder) return true;
  return ROLE_CAPABILITIES[membership.role]?.includes(capability) ?? false;
}

// Convenience helpers for the checks that show up repeatedly across the app
export function canManageTeam(membership: MyMembership | null): boolean {
  return hasPermission(membership, "manage_team");
}

export function canManageOrgSettings(membership: MyMembership | null): boolean {
  return hasPermission(membership, "manage_org_settings");
}

export function canApproveRequests(membership: MyMembership | null): boolean {
  return hasPermission(membership, "approve_requests");
}

export function canManageBilling(membership: MyMembership | null): boolean {
  return hasPermission(membership, "manage_billing");
}