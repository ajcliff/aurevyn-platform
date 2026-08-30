import { createClient } from "@/lib/supabase";

export interface Customer {
  id?: string;
  org_id: string;

  name: string;
  phone?: string;
  email?: string;

  loyalty_points?: number;
  pricelist_id?: string | null;

  created_at?: string;
}

export async function getCustomers(orgId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("org_id", orgId)
    .order("name");

  if (error) throw error;

  return data ?? [];
}

export async function createCustomer(customer: Customer) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("customers")
    .insert(customer)
    .select()
    .single();

  if (error) throw error;

  return data;
}