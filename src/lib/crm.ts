import { createClient } from "@/lib/supabase";

export type CustomerStatus = "lead" | "active" | "inactive";
export type DealStage = "new" | "contacted" | "proposal" | "won" | "lost";
export type ActivityType = "call" | "email" | "meeting" | "note";

export type Customer = {
  id: string;
  org_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  status: CustomerStatus;
  source: string | null;
  pricelist_id: string | null;
  created_at: string;
};

export type Deal = {
  id: string;
  org_id: string;
  customer_id: string;
  title: string;
  value: number;
  stage: DealStage;
  expected_close_date: string | null;
  created_at: string;
};

export type Activity = {
  id: string;
  org_id: string;
  customer_id: string;
  type: ActivityType;
  notes: string | null;
  created_at: string;
};

export async function getCustomers(orgId: string): Promise<Customer[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });
  if (error) { console.error(error); return []; }
  return data as Customer[];
}

export async function createCustomer(record: Omit<Customer, "id" | "created_at">) {
  const supabase = createClient();
  const { data, error } = await supabase.from("customers").insert(record).select().single();
  if (error) throw error;
  return data as Customer;
}

export async function getDeals(orgId: string): Promise<Deal[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("deals")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });
  if (error) { console.error(error); return []; }
  return data as Deal[];
}

export async function getDealsForCustomer(orgId: string, customerId: string): Promise<Deal[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("deals")
    .select("*")
    .eq("org_id", orgId)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) { console.error(error); return []; }
  return data as Deal[];
}

export async function createDeal(record: Omit<Deal, "id" | "created_at">) {
  const supabase = createClient();
  const { data, error } = await supabase.from("deals").insert(record).select().single();
  if (error) throw error;
  return data as Deal;
}

export async function updateDealStage(id: string, stage: DealStage) {
  const supabase = createClient();
  const { data, error } = await supabase.from("deals").update({ stage }).eq("id", id).select().single();
  if (error) throw error;
  return data as Deal;
}

export async function getActivitiesForCustomer(orgId: string, customerId: string): Promise<Activity[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .eq("org_id", orgId)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) { console.error(error); return []; }
  return data as Activity[];
}

export async function createActivity(record: Omit<Activity, "id" | "created_at">) {
  const supabase = createClient();
  const { data, error } = await supabase.from("activities").insert(record).select().single();
  if (error) throw error;
  return data as Activity;
}
