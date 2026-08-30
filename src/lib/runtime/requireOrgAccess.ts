import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { TeamRole } from "@/lib/team";

export type OrgAccess = {
  userId: string;
  userEmail: string | null;
  role: TeamRole;
  isFounder: boolean;
};

/**
 * Server-only. For use inside Next.js Route Handlers (app/api/**/route.ts).
 *
 * API routes receive `organizationId` as a plain value in the request body
 * or query string — nothing stops a client from sending a different org's
 * id unless something checks it against the real session, server-side.
 * This is that check. Any route that reads or changes data scoped to a
 * specific org (payments config, STK triggers, etc.) should call this
 * first, using the request's own claimed organizationId, and bail out on
 * `null` rather than trusting the client-supplied id.
 *
 * Mirrors the same org_users lookup and founder-email bypass already used
 * by proxy.ts (middleware) and lib/runtime/getMyMembership.ts (browser) —
 * this is the same check, just usable from server-side route handlers.
 */
export async function requireOrgAccess(orgId: string): Promise<OrgAccess | null> {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // Route handlers can't reliably mutate response cookies outside
          // an actual Response object. Session refresh is already handled
          // by the proxy middleware on every request — this is read-only.
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const founderEmail = process.env.NEXT_PUBLIC_FOUNDER_EMAIL;
  if (user.email === founderEmail) {
    return { userId: user.id, userEmail: user.email ?? null, role: "owner", isFounder: true };
  }

  const { data: membership } = await supabase
    .from("org_users")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) return null;

  return {
    userId: user.id,
    userEmail: user.email ?? null,
    role: membership.role as TeamRole,
    isFounder: false,
  };
}

/**
 * Convenience wrapper for routes that require founder/owner/admin-level
 * access (e.g. configuring payment provider credentials) rather than just
 * any org member (e.g. initiating a payment at checkout).
 */
export function isAdminAccess(access: OrgAccess): boolean {
  return access.isFounder || access.role === "owner" || access.role === "admin";
}