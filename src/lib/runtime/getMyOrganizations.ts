import { createClient } from "@/lib/supabase";
import { isFounderUser } from "@/lib/founder";
import type { Organization } from "./models";

export type MyOrgMembership = {
  organization: Organization;
  role: string;
};

export async function getMyOrganizations(): Promise<MyOrgMembership[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  if (await isFounderUser(supabase, user)) {
    // Founder sees every org, not just ones they're an org_user row on
    const { data, error } = await supabase
      .from("organizations")
      .select("*")
      .order("name");
    if (error) {
      console.error(error);
      return [];
    }
    return (data || []).map((org) => ({ organization: org as Organization, role: "owner" }));
  }

  const { data, error } = await supabase
    .from("org_users")
    .select("role, organizations (*)")
    .eq("user_id", user.id);

  if (error) {
    console.error(error);
    return [];
  }

  return (data || [])
    .filter((row: any) => row.organizations)
    .map((row: any) => ({ organization: row.organizations as Organization, role: row.role }));
}