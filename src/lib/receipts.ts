import { createClient } from "./supabase";

export type Receipt = {
  id: string;
  receipt_no: string;
  invoice_id: string;
  org_id: string;
  amount_kes: number;
  method: string;
  reference: string | null;
  paid_at: string;
  created_at: string;
};

export const PAYMENT_METHODS = ["M-Pesa", "Bank transfer", "Cash", "Cheque", "Other"] as const;

// RLS decides what comes back: the founder sees every receipt, an org owner/admin sees their own org's.
export async function getReceipts(): Promise<Receipt[]> {
  const { data, error } = await createClient().from("receipts").select("*").order("created_at", { ascending: false });
  if (error) {
    console.error("Error fetching receipts:", error);
    return [];
  }
  return (data ?? []) as Receipt[];
}
