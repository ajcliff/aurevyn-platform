import { createClient } from "./supabase";

export type MemberType = "founder" | "employee" | "contractor" | "advisor";
export type MemberStatus = "active" | "former";

export type CompanyMember = {
  id: string;
  full_name: string;
  role_title: string;
  member_type: MemberType;
  email: string | null;
  phone: string | null;
  start_date: string | null;
  status: MemberStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type CompanyMemberInput = {
  full_name: string;
  role_title: string;
  member_type: MemberType;
  email?: string | null;
  phone?: string | null;
  start_date?: string | null;
  status: MemberStatus;
  notes?: string | null;
};

export async function getCompanyMembers(): Promise<CompanyMember[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("company_team_members")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data as CompanyMember[];
}

export async function createCompanyMember(input: CompanyMemberInput): Promise<CompanyMember> {
  const supabase = createClient();
  const { data, error } = await supabase.from("company_team_members").insert(input).select().single();
  if (error) throw error;
  return data as CompanyMember;
}

export async function updateCompanyMember(id: string, updates: Partial<CompanyMemberInput>): Promise<CompanyMember> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("company_team_members")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as CompanyMember;
}

export async function deleteCompanyMember(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("company_team_members").delete().eq("id", id);
  if (error) throw error;
}