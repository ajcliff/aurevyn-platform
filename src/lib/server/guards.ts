import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { requireOrgAccess, type OrgAccess } from "@/lib/runtime/requireOrgAccess";

async function sessionUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll() {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// Platform founder only (email match, same rule as the dashboard gate).
export async function requireFounder(): Promise<{ userId: string; email: string } | null> {
  const user = await sessionUser();
  if (!user || !user.email || user.email !== process.env.NEXT_PUBLIC_FOUNDER_EMAIL) return null;
  return { userId: user.id, email: user.email };
}

// Owner/admin of the claimed org, or the founder. Never trusts a client-supplied org id on its own.
export async function requireOrgAdmin(orgId: string): Promise<OrgAccess | null> {
  const access = await requireOrgAccess(orgId);
  if (!access) return null;
  if (access.isFounder || access.role === "owner" || access.role === "admin") return access;
  return null;
}

// Any member of the claimed org, or the founder.
export async function requireOrgMember(orgId: string): Promise<OrgAccess | null> {
  return requireOrgAccess(orgId);
}
