import { createClient } from "@/lib/supabase";

export type RuntimeOrganization = {
  id: string;
  name: string;
  location: string;
  status: string;
  revenue: string;
  package: string;
};

export async function getCurrentOrg(orgId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", orgId)
    .single();

  if (error) throw error;

  return data as RuntimeOrganization;
}