import { createClient } from "./supabase";

export type Invoice = {
  id: string;
  org_id: string;
  invoice_no: string;
  amount_kes: number;
  org_name: string;
  amount: string;
  status: "paid" | "pending" | "overdue";
  due_date: string;
  paid_date: string | null;
  description: string;
  created_at: string;
  kind: "manual" | "subscription" | "upgrade";
  claim_method: string | null;
  claim_reference: string | null;
  claimed_at: string | null;
};

export async function getInvoices(): Promise<Invoice[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching invoices:", error);
    return [];
  }

  return data as Invoice[];
}
