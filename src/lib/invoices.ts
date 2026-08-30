import { createClient } from "./supabase";

export type Invoice = {
  id: string;
  org_name: string;
  amount: string;
  status: "paid" | "pending" | "overdue";
  due_date: string;
  paid_date: string | null;
  description: string;
  created_at: string;
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

export async function updateInvoiceStatus(id: string, status: Invoice["status"]) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("invoices")
    .update({ status, paid_date: status === "paid" ? new Date().toISOString().split("T")[0] : null })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating invoice:", error);
    return null;
  }

  return data as Invoice;
}

export async function createInvoice(invoice: Omit<Invoice, "id" | "created_at">) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("invoices")
    .insert([invoice])
    .select()
    .single();

  if (error) {
    console.error("Error creating invoice:", error);
    return null;
  }

  return data as Invoice;
}