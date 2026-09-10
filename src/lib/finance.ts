import { createClient } from "./supabase";
import { logActivity } from "@/lib/activity";

export type FinanceAccount = {
  id: string;
  org_id: string;
  name: string;
  type: string;
  category: string;
  balance: number;
  currency: string;
  status?: string;
  created_at: string;
};

export async function createAccount(account: Omit<FinanceAccount, "id" | "created_at">) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("finance_accounts")
    .insert([account])
    .select()
    .single();
  if (error) {
    console.error(error);
    return null;
  }

  await logActivity({
    icon: account.type === "cash" ? "💵" : "🏦",
    title: "Finance account added",
    sub: account.name,
    org_id: account.org_id,
  });

  return data as FinanceAccount;
}

export async function createTransactionLogged(tx: Omit<FinanceTransaction, "id" | "created_at">) {
  const created = await createTransaction(tx);
  if (created) {
    await logActivity({
      icon: tx.type === "income" ? "💰" : "💸",
      title: `${tx.type === "income" ? "Income" : "Expense"} recorded`,
      sub: `KES ${Number(tx.amount).toLocaleString()} — ${tx.description}`,
      org_id: tx.org_id,
    });
  }
  return created;
}

export type FinanceTransaction = {
  id: string;
  org_id: string;
  account_id: string | null;
  type: "income" | "expense" | "transfer";
  amount: number;
  currency: string;
  description: string;
  category: string;
  reference: string;
  payment_method: string;
  status: string;
  date: string;
  created_at: string;
  coa_id?: string | null;
  cost_center_id?: string | null;
};

export type FinanceExpense = {
  id: string;
  org_id: string;
  title: string;
  amount: number;
  currency: string;
  category: string;
  vendor: string;
  payment_method: string;
  status: string;
  date: string;
  notes: string;
  created_at: string;
};

export type CashflowEntry = {
  id: string;
  org_id: string;
  type: "inflow" | "outflow";
  amount: number;
  description: string;
  date: string;
  created_at: string;
};

export async function getFinanceAccounts(orgId: string): Promise<FinanceAccount[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("finance_accounts")
    .select("*")
    .eq("org_id", orgId)
    .neq("status", "archived")
    .order("type");
  if (error) { console.error(error); return []; }
  return data as FinanceAccount[];
}

export async function updateAccount(id: string, updates: Partial<FinanceAccount>) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("finance_accounts")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;

  await logActivity({
    icon: "✏️",
    title: "Finance account updated",
    sub: (data as FinanceAccount).name,
    org_id: (data as FinanceAccount).org_id,
  });

  return data as FinanceAccount;
}

export async function archiveAccount(id: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("finance_accounts")
    .update({ status: "archived" })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;

  await logActivity({
    icon: "🗄️",
    title: "Finance account archived",
    sub: (data as FinanceAccount).name,
    org_id: (data as FinanceAccount).org_id,
  });

  return true;
}

export async function getFinanceTransactions(orgId: string): Promise<FinanceTransaction[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("finance_transactions")
    .select("*")
    .eq("org_id", orgId)
    .order("date", { ascending: false });
  if (error) throw error;
  return data as FinanceTransaction[];
}

export async function getFinanceExpenses(orgId: string): Promise<FinanceExpense[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("finance_expenses")
    .select("*")
    .eq("org_id", orgId)
    .order("date", { ascending: false });
  if (error) throw error;
  return data as FinanceExpense[];
}

export async function getCashflow(orgId: string): Promise<CashflowEntry[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("finance_cashflow")
    .select("*")
    .eq("org_id", orgId)
    .order("date", { ascending: false });
  if (error) throw error;
  return data as CashflowEntry[];
}

export async function createTransaction(tx: Omit<FinanceTransaction, "id" | "created_at">) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("finance_transactions")
    .insert([tx])
    .select()
    .single();
  if (error) throw error;
  return data as FinanceTransaction;
}

export async function createExpense(expense: Omit<FinanceExpense, "id" | "created_at">) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("finance_expenses")
    .insert([expense])
    .select()
    .single();
  if (error) throw error;
  return data as FinanceExpense;
}

export async function updateTransaction(id: string, updates: Partial<FinanceTransaction>) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("finance_transactions")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;

  await logActivity({
    icon: "✏️",
    title: "Finance transaction updated",
    sub: (data as FinanceTransaction).description,
    org_id: (data as FinanceTransaction).org_id,
  });

  return data as FinanceTransaction;
}

export async function deleteTransaction(id: string) {
  const supabase = createClient();

  const { data, error: fetchError } = await supabase
    .from("finance_transactions")
    .select("*")
    .eq("id", id)
    .single();
  if (fetchError) throw fetchError;

  const { error } = await supabase
    .from("finance_transactions")
    .delete()
    .eq("id", id);
  if (error) throw error;

  await logActivity({
    icon: "🗑️",
    title: "Finance transaction deleted",
    sub: `KES ${Number((data as FinanceTransaction).amount).toLocaleString()} — ${(data as FinanceTransaction).description}`,
    org_id: (data as FinanceTransaction).org_id,
  });

  return true;
}

export async function updateExpense(id: string, updates: Partial<FinanceExpense>) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("finance_expenses")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;

  await logActivity({
    icon: "✏️",
    title: "Finance expense updated",
    sub: (data as FinanceExpense).title,
    org_id: (data as FinanceExpense).org_id,
  });

  return data as FinanceExpense;
}

export async function deleteExpense(id: string) {
  const supabase = createClient();

  const { data, error: fetchError } = await supabase
    .from("finance_expenses")
    .select("*")
    .eq("id", id)
    .single();
  if (fetchError) throw fetchError;

  const { error } = await supabase
    .from("finance_expenses")
    .delete()
    .eq("id", id);
  if (error) throw error;

  await logActivity({
    icon: "🗑️",
    title: "Finance expense deleted",
    sub: `KES ${Number((data as FinanceExpense).amount).toLocaleString()} — ${(data as FinanceExpense).title}`,
    org_id: (data as FinanceExpense).org_id,
  });

  return true;
}