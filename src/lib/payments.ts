import { createClient } from "./supabase";
import { logActivity } from "@/lib/activity";

export type PaymentMethod = "mpesa" | "cash" | "card" | "bank_transfer" | "cheque";
export type PaymentStatus = "completed" | "pending" | "cleared" | "bounced";
export type PaymentSourceType = "pos_sale" | "finance_transaction" | "invoice";

export type Payment = {
  id: string;
  org_id: string;

  source_type: PaymentSourceType;
  source_id: string;

  method: PaymentMethod;
  amount: number;
  status: PaymentStatus;

  mpesa_code: string | null;
  mpesa_phone: string | null;

  card_last4: string | null;
  card_type: string | null;

  bank_name: string | null;
  bank_reference: string | null;

  cheque_number: string | null;
  cheque_bank: string | null;
  cheque_date: string | null;

  recorded_by_name: string | null;
  created_at: string;
};

// The method-specific fields a form needs to collect — nothing more, nothing less
export type PaymentDetailsInput = {
  method: PaymentMethod;
  amount: number;

  mpesaCode?: string;
  mpesaPhone?: string;

  cardLast4?: string;
  cardType?: string;

  bankName?: string;
  bankReference?: string;

  chequeNumber?: string;
  chequeBank?: string;
  chequeDate?: string;
};

export const KENYAN_BANKS = [
  "Equity Bank",
  "KCB Bank",
  "Co-operative Bank",
  "Absa Bank Kenya",
  "Standard Chartered",
  "NCBA Bank",
  "DTB Bank",
  "I&M Bank",
  "Family Bank",
  "Stanbic Bank",
  "Other",
];

// Validates only the fields that matter for the chosen method —
// e.g. an M-Pesa payment must have a code, a cheque must have a number
export function validatePaymentDetails(input: PaymentDetailsInput): string | null {
  if (!input.amount || input.amount <= 0) return "Amount must be greater than zero";

  switch (input.method) {
    case "mpesa":
      if (!input.mpesaCode?.trim()) return "M-Pesa transaction code is required";
      if (!/^[A-Z0-9]{10}$/i.test(input.mpesaCode.trim())) return "M-Pesa code should be 10 characters (e.g. QGH7XXXXXX)";
      return null;

    case "card":
      if (!input.cardLast4?.trim()) return "Last 4 digits of the card are required";
      if (!/^\d{4}$/.test(input.cardLast4.trim())) return "Card digits must be exactly 4 numbers";
      return null;

    case "bank_transfer":
      if (!input.bankName?.trim()) return "Select the receiving bank";
      if (!input.bankReference?.trim()) return "Bank reference number is required";
      return null;

    case "cheque":
      if (!input.chequeNumber?.trim()) return "Cheque number is required";
      if (!input.chequeBank?.trim()) return "Issuing bank is required";
      if (!input.chequeDate) return "Cheque date is required";
      return null;

    case "cash":
      return null;

    default:
      return "Unknown payment method";
  }
}

export async function recordPayment(input: {
  orgId: string;
  sourceType: PaymentSourceType;
  sourceId: string;
  details: PaymentDetailsInput;
  recordedByName?: string;
}): Promise<Payment | null> {
  const supabase = createClient();

  const { details } = input;

  // Cheques start as pending until cleared; everything else is completed immediately
  const status: PaymentStatus = details.method === "cheque" ? "pending" : "completed";

  const { data, error } = await supabase
    .from("payments")
    .insert({
      org_id: input.orgId,
      source_type: input.sourceType,
      source_id: input.sourceId,
      method: details.method,
      amount: details.amount,
      status,

      mpesa_code: details.mpesaCode?.trim().toUpperCase() || null,
      mpesa_phone: details.mpesaPhone || null,

      card_last4: details.cardLast4 || null,
      card_type: details.cardType || null,

      bank_name: details.bankName || null,
      bank_reference: details.bankReference || null,

      cheque_number: details.chequeNumber || null,
      cheque_bank: details.chequeBank || null,
      cheque_date: details.chequeDate || null,

      recorded_by_name: input.recordedByName || null,
    })
    .select()
    .single();

  if (error) {
    console.error(error);
    return null;
  }

  await logActivity({
    icon: details.method === "cheque" ? "🧾" : "💳",
    title: "Payment recorded",
    sub: `${methodLabel(details.method)} — KES ${details.amount.toLocaleString()}`,
    org_id: input.orgId,
  });

  return data as Payment;
}

// All completed payments recorded for this org since the given ISO timestamp —
// used for the Overview "today's cash position" breakdown by method.
export async function getPaymentsSince(orgId: string, sinceIso: string): Promise<Payment[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("org_id", orgId)
    .eq("status", "completed")
    .gte("created_at", sinceIso);

  if (error) {
    console.error(error);
    return [];
  }
  return data as Payment[];
}

export async function getPaymentsForSource(sourceType: PaymentSourceType, sourceId: string): Promise<Payment[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("source_type", sourceType)
    .eq("source_id", sourceId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }
  return data as Payment[];
}

export async function getPendingCheques(orgId: string): Promise<Payment[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("org_id", orgId)
    .eq("method", "cheque")
    .eq("status", "pending")
    .order("cheque_date");

  if (error) {
    console.error(error);
    return [];
  }
  return data as Payment[];
}

export async function updateChequeStatus(id: string, orgId: string, status: "cleared" | "bounced") {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("payments")
    .update({ status })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error(error);
    return null;
  }

  await logActivity({
    icon: status === "cleared" ? "✅" : "❌",
    title: `Cheque ${status}`,
    sub: `Cheque #${data.cheque_number}`,
    org_id: orgId,
  });

  return data as Payment;
}

export function methodLabel(method: PaymentMethod): string {
  const labels: Record<PaymentMethod, string> = {
    mpesa: "M-Pesa",
    cash: "Cash",
    card: "Card",
    bank_transfer: "Bank Transfer",
    cheque: "Cheque",
  };
  return labels[method];
}

export async function getPlatformPaymentsSince(sinceIso: string): Promise<Payment[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("status", "completed")
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data as Payment[];
}