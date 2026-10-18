import { createClient } from "@/lib/supabase";

// Reusable messages. {curly} words are filled in automatically from the customer's account.
// [Square] words are gaps the business fills in once (a till number, a name) and then saves as its own template.
export type MessageTemplate = {
  id: string;
  name: string;
  subject: string;
  body: string;
  builtin?: boolean;
};

export const REMINDER_FIELDS = [
  "{customer_name}",
  "{business_name}",
  "{amount_owed}",
  "{amount_overdue}",
  "{oldest_due}",
] as const;

export const BUILTIN_REMINDERS: MessageTemplate[] = [
  {
    id: "builtin-friendly",
    builtin: true,
    name: "Friendly reminder",
    subject: "Payment reminder from {business_name}",
    body:
      "Hello {customer_name}, this is a friendly reminder from {business_name}. " +
      "Your balance of {amount_owed} is due ({amount_overdue} was due on {oldest_due}). " +
      "You can pay via [M-Pesa till or paybill number]. " +
      "If you have already paid, please ignore this message. Thank you.",
  },
  {
    id: "builtin-firm",
    builtin: true,
    name: "Overdue, firm",
    subject: "Overdue balance: {business_name}",
    body:
      "Dear {customer_name}, your account with {business_name} is overdue. " +
      "{amount_overdue} has been unpaid since {oldest_due}, and your total balance is {amount_owed}. " +
      "Please pay via [M-Pesa till or paybill number] or call [phone number] to agree a payment date.",
  },
  {
    id: "builtin-thanks",
    builtin: true,
    name: "Balance statement",
    subject: "Your balance with {business_name}",
    body:
      "Hello {customer_name}, thank you for shopping with {business_name}. " +
      "Your current balance is {amount_owed}. Pay via [M-Pesa till or paybill number] whenever you are ready.",
  },
];

export const BUILTIN_MAIL: MessageTemplate[] = [
  {
    id: "builtin-mail-stock",
    builtin: true,
    name: "Stock request",
    subject: "Stock request: [item]",
    body: "Hello,\n\nWe are running low on [item]. Please arrange [quantity] units by [date].\n\nThank you.",
  },
  {
    id: "builtin-mail-meeting",
    builtin: true,
    name: "Meeting invite",
    subject: "Meeting: [topic]",
    body: "Hello,\n\nPlease join a short meeting about [topic] on [date] at [time], at [place].\n\nPlease reply if you cannot make it.",
  },
  {
    id: "builtin-mail-document",
    builtin: true,
    name: "Document for review",
    subject: "Please review: [document name]",
    body: "Hello,\n\nI have attached [document name]. Please review it and reply by [date] with any changes.\n\nThank you.",
  },
];

export function fillTemplate(text: string, values: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (m, key) => (key in values ? values[key] : m));
}

// Anything still in [square brackets] is a gap nobody has filled yet
export function unfilledGaps(text: string): string[] {
  return Array.from(text.matchAll(/\[([^\]]+)\]/g)).map((m) => m[1]);
}

// 0712 345 678, +254712345678 and 254712345678 all become 254712345678
export function toInternationalPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("254")) return digits;
  if (digits.startsWith("0")) return `254${digits.slice(1)}`;
  if (digits.length === 9) return `254${digits}`;
  return digits;
}

export async function getTemplates(orgId: string, kind = "credit_reminder"): Promise<MessageTemplate[]> {
  const { data } = await createClient()
    .from("message_templates")
    .select("id, name, subject, body")
    .eq("org_id", orgId)
    .eq("kind", kind)
    .order("created_at");
  return (data ?? []) as MessageTemplate[];
}

export async function saveTemplate(orgId: string, input: { name: string; subject: string; body: string }, kind = "credit_reminder") {
  const { error } = await createClient().from("message_templates").insert({ org_id: orgId, kind, ...input });
  if (error) throw error;
}

export async function deleteTemplate(id: string) {
  const { error } = await createClient().from("message_templates").delete().eq("id", id);
  if (error) throw error;
}
