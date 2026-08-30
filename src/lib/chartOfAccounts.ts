import { createClient } from "./supabase";
import { logActivity } from "@/lib/activity";

export type AccountType = "asset" | "liability" | "equity" | "income" | "expense";

export type ChartAccount = {
  id: string;
  org_id: string;
  code: string;
  name: string;
  account_type: AccountType;
  parent_id: string | null;
  is_active: boolean;
  created_at: string;
};

export type CostCenter = {
  id: string;
  org_id: string;
  name: string;
  code: string;
  is_active: boolean;
  created_at: string;
};

export async function getChartOfAccounts(orgId: string): Promise<ChartAccount[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("chart_of_accounts")
    .select("*")
    .eq("org_id", orgId)
    .order("code");

  if (error) {
    console.error(error);
    return [];
  }
  return data as ChartAccount[];
}

export async function createAccount(input: {
  orgId: string;
  code: string;
  name: string;
  accountType: AccountType;
  parentId?: string | null;
}): Promise<ChartAccount | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("chart_of_accounts")
    .insert({
      org_id: input.orgId,
      code: input.code,
      name: input.name,
      account_type: input.accountType,
      parent_id: input.parentId || null,
    })
    .select()
    .single();

  if (error) {
    console.error(error);
    return null;
  }

  await logActivity({
    icon: "📊",
    title: "Chart of Accounts entry added",
    sub: `${input.code} — ${input.name}`,
    org_id: input.orgId,
  });

  return data as ChartAccount;
}

export async function updateAccount(id: string, updates: Partial<Pick<ChartAccount, "name" | "is_active" | "parent_id">>) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("chart_of_accounts")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error(error);
    return null;
  }
  return data as ChartAccount;
}

export async function deleteAccount(id: string, orgId: string, label: string) {
  const supabase = createClient();
  const { error } = await supabase.from("chart_of_accounts").delete().eq("id", id);
  if (error) {
    console.error(error);
    return;
  }

  await logActivity({
    icon: "🗑️",
    title: "Chart of Accounts entry removed",
    sub: label,
    org_id: orgId,
  });
}

export async function getCostCenters(orgId: string): Promise<CostCenter[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("cost_centers")
    .select("*")
    .eq("org_id", orgId)
    .order("name");

  if (error) {
    console.error(error);
    return [];
  }
  return data as CostCenter[];
}

export async function createCostCenter(input: { orgId: string; name: string; code: string }): Promise<CostCenter | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("cost_centers")
    .insert({ org_id: input.orgId, name: input.name, code: input.code })
    .select()
    .single();

  if (error) {
    console.error(error);
    return null;
  }

  await logActivity({
    icon: "🏷️",
    title: "Cost Center created",
    sub: `${input.code} — ${input.name}`,
    org_id: input.orgId,
  });

  return data as CostCenter;
}

export async function deleteCostCenter(id: string, orgId: string, label: string) {
  const supabase = createClient();
  const { error } = await supabase.from("cost_centers").delete().eq("id", id);
  if (error) {
    console.error(error);
    return;
  }

  await logActivity({
    icon: "🗑️",
    title: "Cost Center removed",
    sub: label,
    org_id: orgId,
  });
}

// Standard Kenyan SME chart — seeded once per org, skipped if already seeded
const DEFAULT_ACCOUNTS: { code: string; name: string; account_type: AccountType }[] = [
  { code: "1000", name: "Assets", account_type: "asset" },
  { code: "1100", name: "Cash in Hand", account_type: "asset" },
  { code: "1200", name: "Bank Accounts", account_type: "asset" },
  { code: "1300", name: "Mobile Money (M-Pesa)", account_type: "asset" },
  { code: "1400", name: "Accounts Receivable", account_type: "asset" },
  { code: "1500", name: "Inventory", account_type: "asset" },

  { code: "2000", name: "Liabilities", account_type: "liability" },
  { code: "2100", name: "Accounts Payable", account_type: "liability" },
  { code: "2200", name: "VAT Payable", account_type: "liability" },
  { code: "2300", name: "Withholding Tax Payable", account_type: "liability" },

  { code: "3000", name: "Equity", account_type: "equity" },
  { code: "3100", name: "Owner's Capital", account_type: "equity" },
  { code: "3200", name: "Retained Earnings", account_type: "equity" },

  { code: "4000", name: "Income", account_type: "income" },
  { code: "4100", name: "Sales Revenue", account_type: "income" },
  { code: "4200", name: "Other Income", account_type: "income" },

  { code: "5000", name: "Expenses", account_type: "expense" },
  { code: "5100", name: "Cost of Goods Sold", account_type: "expense" },
  { code: "5200", name: "Rent", account_type: "expense" },
  { code: "5300", name: "Salaries & Wages", account_type: "expense" },
  { code: "5400", name: "Utilities", account_type: "expense" },
  { code: "5500", name: "Transport", account_type: "expense" },
  { code: "5600", name: "Other Expenses", account_type: "expense" },
];

export async function seedDefaultChartOfAccounts(orgId: string) {
  const existing = await getChartOfAccounts(orgId);
  if (existing.length > 0) return existing;

  const supabase = createClient();
  const rows = DEFAULT_ACCOUNTS.map((a) => ({ org_id: orgId, ...a }));

  const { data, error } = await supabase.from("chart_of_accounts").insert(rows).select();

  if (error) {
    console.error(error);
    return [];
  }

  await logActivity({
    icon: "📊",
    title: "Chart of Accounts initialized",
    sub: `${DEFAULT_ACCOUNTS.length} default accounts`,
    org_id: orgId,
  });

  return data as ChartAccount[];
}