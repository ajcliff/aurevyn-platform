import { createClient } from "@/lib/supabase";
import { getMyMembership } from "@/lib/runtime/getMyMembership";
import { createApprovalRequest } from "@/lib/approvals";

// Petty cash spends above this amount need an approver
export const PETTY_CASH_APPROVAL_LIMIT = 5000;

export type TrailEntry = {
  id: string;
  org_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  summary: string;
  amount: number | null;
  status: "pending" | "completed" | "rejected";
  initiated_by_name: string;
  initiated_at: string;
  authorised_by_name: string | null;
  authorised_at: string | null;
  authorisation: "approver" | "self" | "not_required" | "pending" | null;
  approval_request_id: string | null;
  created_at: string;
};

export class ApprovalRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApprovalRequiredError";
  }
}

export const ACTION_LABELS: Record<string, string> = {
  payroll_paid: "Payroll paid",
  password_reset: "Password reset",
  supplier_payment: "Supplier payment",
  refund: "Refund",
  stock_adjustment: "Stock adjustment",
  credit_limit_change: "Credit limit change",
  petty_cash_spend: "Petty cash spend",
  po_close_short: "Purchase order closed short",
};

type Actor = { userId: string | null; name: string; isApprover: boolean; isFounder: boolean };

export async function getActor(orgId: string): Promise<Actor> {
  const supabase = createClient();
  const membership = await getMyMembership(orgId);
  const { data: { user } } = await supabase.auth.getUser();
  let name = user?.email?.split("@")[0] ?? "Unknown";
  if (membership?.isFounder) name = "AUREVYN Founder";
  else if (user) {
    const { data } = await supabase.from("org_users").select("full_name").eq("org_id", orgId).eq("user_id", user.id).maybeSingle();
    if (data?.full_name) name = data.full_name;
  }
  return {
    userId: user?.id ?? null,
    name,
    isFounder: !!membership?.isFounder,
    isApprover: !!membership && (membership.isFounder || membership.role === "owner" || membership.role === "admin"),
  };
}

export async function getActorName(orgId: string): Promise<string> {
  return (await getActor(orgId)).name;
}

type Input = {
  orgId: string;
  action: keyof typeof ACTION_LABELS;
  entityType: string;
  entityId: string; // stable id of the thing acted on, so an approval can be matched to its retry
  summary: string;
  amount?: number | null;
  requiresApproval?: boolean;
};

const keyFor = (i: Input) => `action:${i.action}:${i.entityId}`;

// Runs a sensitive action under the approval rules and leaves a trail entry:
//   owners/admins authorise their own actions (marked "self"),
//   everyone else needs an approved request first, which is consumed by this run.
export async function withAuthorization<T>(input: Input, run: () => Promise<T>): Promise<T> {
  const supabase = createClient();
  const actor = await getActor(input.orgId);
  const needs = input.requiresApproval !== false;

  let authorisation: TrailEntry["authorisation"] = "not_required";
  let authorisedBy: string | null = null;
  let authorisedAt: string | null = null;
  let approvalRequestId: string | null = null;

  if (needs) {
    if (actor.isApprover) {
      authorisation = actor.isFounder ? "approver" : "self";
      authorisedBy = actor.name;
      authorisedAt = new Date().toISOString();
    } else {
      const { data: approved } = await supabase
        .from("approval_requests")
        .select("id, decided_by_name, decided_at")
        .eq("org_id", input.orgId)
        .eq("requested_by_user_id", actor.userId)
        .eq("source", keyFor(input))
        .eq("status", "approved")
        .order("decided_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!approved) {
        const { data: open } = await supabase
          .from("approval_requests")
          .select("id")
          .eq("org_id", input.orgId)
          .eq("requested_by_user_id", actor.userId)
          .eq("source", keyFor(input))
          .eq("status", "pending")
          .maybeSingle();

        if (!open) {
          const req = await createApprovalRequest({
            orgId: input.orgId,
            requestedByUserId: actor.userId,
            requestedByName: actor.name,
            type: "action",
            title: `${ACTION_LABELS[input.action]}: ${input.summary}`,
            description: `${actor.name} wants to do this. Approve it, then they can complete it.`,
            amount: input.amount ?? null,
            source: keyFor(input),
            relatedId: undefined,
          });
          await supabase.from("audit_trail").insert({
            org_id: input.orgId, action: input.action, entity_type: input.entityType, entity_id: input.entityId,
            summary: input.summary, amount: input.amount ?? null, status: "pending",
            initiated_by_id: actor.userId, initiated_by_name: actor.name, authorisation: "pending", approval_request_id: req.id,
          });
        }
        throw new ApprovalRequiredError(
          open
            ? "This is still waiting for approval. An admin needs to approve it first."
            : "This needs an admin's approval. A request has been sent; you can complete it once it's approved."
        );
      }
      authorisation = "approver";
      authorisedBy = approved.decided_by_name;
      authorisedAt = approved.decided_at;
      approvalRequestId = approved.id;
      // one approval, one action
      await supabase.from("approval_requests").update({ source: `used:${approved.id}` }).eq("id", approved.id);
    }
  }

  const result = await run();

  await supabase.from("audit_trail").insert({
    org_id: input.orgId, action: input.action, entity_type: input.entityType, entity_id: input.entityId,
    summary: input.summary, amount: input.amount ?? null, status: "completed",
    initiated_by_id: actor.userId, initiated_by_name: actor.name,
    authorised_by_name: authorisedBy, authorised_at: authorisedAt, authorisation, approval_request_id: approvalRequestId,
  });

  return result;
}

export async function getTrail(orgId: string, limit = 200): Promise<TrailEntry[]> {
  const { data, error } = await createClient()
    .from("audit_trail")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((e) => ({ ...e, amount: e.amount === null ? null : Number(e.amount) })) as TrailEntry[];
}
