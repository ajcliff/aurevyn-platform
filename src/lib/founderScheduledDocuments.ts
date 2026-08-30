import { createClient } from "./supabase";
import type { ExpenseCategory, CompanyExpense } from "./companyExpenses";
import type { Organization } from "./organizations";
import type { Invoice } from "./invoices";

export type ScheduleFrequency = "weekly" | "monthly" | "quarterly" | "annual";

export type ScheduledCompanyExpense = {
  id: string;
  category: ExpenseCategory;
  vendor: string | null;
  description: string;
  amount: number;
  currency: string;
  frequency: ScheduleFrequency;
  next_run: string;
  last_run: string | null;
  active: boolean;
  created_at: string;
};

export type ScheduledPlatformInvoice = {
  id: string;
  org_id: string;
  org_name: string;
  description: string;
  amount: number;
  frequency: ScheduleFrequency;
  next_run: string;
  last_run: string | null;
  active: boolean;
  created_at: string;
};

function computeNextRun(from: string, frequency: ScheduleFrequency): string {
  const date = new Date(from);
  switch (frequency) {
    case "weekly": date.setDate(date.getDate() + 7); break;
    case "monthly": date.setMonth(date.getMonth() + 1); break;
    case "quarterly": date.setMonth(date.getMonth() + 3); break;
    case "annual": date.setFullYear(date.getFullYear() + 1); break;
  }
  return date.toISOString().split("T")[0];
}

// ---- Scheduled Company Expenses ----

export async function getScheduledCompanyExpenses(): Promise<ScheduledCompanyExpense[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("scheduled_company_expenses")
    .select("*")
    .order("next_run", { ascending: true });
  if (error) throw error;
  return data as ScheduledCompanyExpense[];
}

// Snapshot an existing expense into a recurring schedule
export async function createScheduleFromExpense(
  expense: CompanyExpense,
  frequency: ScheduleFrequency
): Promise<ScheduledCompanyExpense> {
  const supabase = createClient();
  const nextRun = computeNextRun(new Date().toISOString(), frequency);

  const { data, error } = await supabase
    .from("scheduled_company_expenses")
    .insert({
      category: expense.category,
      vendor: expense.vendor,
      description: expense.description,
      amount: expense.amount,
      currency: expense.currency,
      frequency,
      next_run: nextRun,
    })
    .select()
    .single();
  if (error) throw error;
  return data as ScheduledCompanyExpense;
}

export async function createScheduledCompanyExpense(input: {
  category: ExpenseCategory;
  vendor?: string;
  description: string;
  amount: number;
  currency?: string;
  frequency: ScheduleFrequency;
  startDate: string;
}): Promise<ScheduledCompanyExpense> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("scheduled_company_expenses")
    .insert({
      category: input.category,
      vendor: input.vendor,
      description: input.description,
      amount: input.amount,
      currency: input.currency ?? "KES",
      frequency: input.frequency,
      next_run: input.startDate,
    })
    .select()
    .single();
  if (error) throw error;
  return data as ScheduledCompanyExpense;
}

export async function toggleScheduledExpenseActive(id: string, active: boolean): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("scheduled_company_expenses").update({ active }).eq("id", id);
  if (error) throw error;
}

export async function deleteScheduledExpense(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("scheduled_company_expenses").delete().eq("id", id);
  if (error) throw error;
}

// ---- Scheduled Platform Invoices ----

export async function getScheduledPlatformInvoices(): Promise<ScheduledPlatformInvoice[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("scheduled_platform_invoices")
    .select("*")
    .order("next_run", { ascending: true });
  if (error) throw error;
  return data as ScheduledPlatformInvoice[];
}

// Snapshot an existing platform invoice into a recurring schedule
export async function createScheduleFromPlatformInvoice(
  invoice: Invoice,
  frequency: ScheduleFrequency
): Promise<ScheduledPlatformInvoice> {
  const supabase = createClient();
  const nextRun = computeNextRun(new Date().toISOString(), frequency);
  const numericAmount = parseFloat(invoice.amount.replace(/[^0-9.]/g, "")) || 0;

  // find the org by name since the platform Invoice type only stores org_name
  const { data: org } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("name", invoice.org_name)
    .maybeSingle();

  const { data, error } = await supabase
    .from("scheduled_platform_invoices")
    .insert({
      org_id: org?.id ?? null,
      org_name: invoice.org_name,
      description: invoice.description,
      amount: numericAmount,
      frequency,
      next_run: nextRun,
    })
    .select()
    .single();
  if (error) throw error;
  return data as ScheduledPlatformInvoice;
}

export async function createScheduledPlatformInvoice(input: {
  org: Organization;
  description: string;
  amount: number;
  frequency: ScheduleFrequency;
  startDate: string;
}): Promise<ScheduledPlatformInvoice> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("scheduled_platform_invoices")
    .insert({
      org_id: input.org.id,
      org_name: input.org.name,
      description: input.description,
      amount: input.amount,
      frequency: input.frequency,
      next_run: input.startDate,
    })
    .select()
    .single();
  if (error) throw error;
  return data as ScheduledPlatformInvoice;
}

export async function toggleScheduledPlatformInvoiceActive(id: string, active: boolean): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("scheduled_platform_invoices").update({ active }).eq("id", id);
  if (error) throw error;
}

export async function deleteScheduledPlatformInvoice(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("scheduled_platform_invoices").delete().eq("id", id);
  if (error) throw error;
}