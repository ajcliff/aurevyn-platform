import { createClient } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";

export type ApprovalType = "expense" | "reimbursement" | "purchase";
export type ApprovalStatus = "pending" | "approved" | "rejected";

export type ApprovalRequest = {
  id: string;
  org_id: string;
  requested_by_user_id: string | null;
  requested_by_name: string | null;
  type: ApprovalType;
  title: string;
  description: string | null;
  amount: number | null;
  status: ApprovalStatus;
  decided_by_name: string | null;
  decided_at: string | null;
  source: string;
  related_id: string | null;
  created_at: string;
};

export async function getApprovalRequests(orgId: string): Promise<ApprovalRequest[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("approval_requests")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function hasPendingAutoRequest(orgId: string, relatedId: string): Promise<boolean> {
  const supabase = createClient();
  const { count } = await supabase
    .from("approval_requests")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .eq("related_id", relatedId)
    .eq("source", "auto_low_stock")
    .eq("status", "pending");

  return (count || 0) > 0;
}

export async function createApprovalRequest(input: {
  orgId: string;
  requestedByUserId: string | null;
  requestedByName: string;
  type: ApprovalType;
  title: string;
  description: string;
  amount: number | null;
  source?: string;
  relatedId?: string;
}): Promise<ApprovalRequest> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("approval_requests")
    .insert({
      org_id: input.orgId,
      requested_by_user_id: input.requestedByUserId,
      requested_by_name: input.requestedByName,
      type: input.type,
      title: input.title,
      description: input.description,
      amount: input.amount,
      status: "pending",
      source: input.source || "manual",
      related_id: input.relatedId || null,
    })
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    icon: "📝",
    title: `${input.type[0].toUpperCase()}${input.type.slice(1)} request submitted`,
    sub: `${input.title}${input.amount ? ` · KES ${input.amount.toLocaleString()}` : ""}`,
    org_id: input.orgId,
  });

  return data;
}

export async function decideApprovalRequest(
  id: string,
  status: "approved" | "rejected",
  decidedByName: string,
  orgId: string,
  title: string
) {
  const supabase = createClient();
  const { error } = await supabase
    .from("approval_requests")
    .update({
      status,
      decided_by_name: decidedByName,
      decided_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;

  await logActivity({
    icon: status === "approved" ? "✅" : "❌",
    title: `Request ${status}`,
    sub: title,
    org_id: orgId,
  });
}

export async function getPendingApprovalCount(orgId: string): Promise<number> {
  const supabase = createClient();
  const { count } = await supabase
    .from("approval_requests")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .eq("status", "pending");

  return count || 0;
}

export async function getPendingApprovalsForOrg(orgId: string): Promise<ApprovalRequest[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("approval_requests")
    .select("*")
    .eq("org_id", orgId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}