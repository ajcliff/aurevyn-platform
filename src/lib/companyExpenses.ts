import { createClient } from "./supabase";

export type ExpenseCategory = "hosting" | "domains" | "apis" | "subscriptions" | "software" | "legal" | "marketing" | "other";

export type CompanyExpense = {
  id: string;
  date: string;
  category: ExpenseCategory;
  vendor: string | null;
  description: string;
  amount: number;
  currency: string;
  notes: string | null;
  created_at: string;
};

export async function getCompanyExpenses(): Promise<CompanyExpense[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("company_expenses")
    .select("*")
    .order("date", { ascending: false });
  if (error) throw error;
  return data as CompanyExpense[];
}

export async function createCompanyExpense(expense: {
  date: string;
  category: ExpenseCategory;
  vendor?: string;
  description: string;
  amount: number;
  currency?: string;
  notes?: string;
}): Promise<CompanyExpense> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("company_expenses")
    .insert(expense)
    .select()
    .single();
  if (error) throw error;
  return data as CompanyExpense;
}

export async function deleteCompanyExpense(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("company_expenses").delete().eq("id", id);
  if (error) throw error;
}