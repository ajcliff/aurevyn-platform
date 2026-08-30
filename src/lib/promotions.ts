import { createClient } from "@/lib/supabase";

export interface Promotion {
  id: string;
  org_id: string;
  name: string;
  type: "percentage" | "fixed";
  value: number;
  active: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
  created_at?: string;
}

export async function getPromotions(orgId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("promotions")
    .select("*")
    .eq("org_id", orgId)
    .eq("active", true)
    .order("name");

  if (error) throw error;

  return (data ?? []) as Promotion[];
}