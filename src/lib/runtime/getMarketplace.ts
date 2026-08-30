import { createClient } from "@/lib/supabase";

export async function getMarketplace() {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("engines")
    .select("*")
    .eq("status", "active")
    .order("name");

  if (error) throw error;

  return data || [];
}