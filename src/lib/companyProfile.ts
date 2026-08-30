import { createClient } from "./supabase";

export type CompanyProfile = {
  id: string;
  legal_name: string;
  trading_name: string | null;
  registration_number: string | null;
  tax_pin: string | null;
  company_type: string | null;
  industry: string | null;
  description: string | null;
  website: string | null;
  official_email: string | null;
  phone: string | null;
  registered_address: string | null;
  country: string;
  currency: string;
  timezone: string;
  updated_at: string;
};

export async function getCompanyProfile(): Promise<CompanyProfile | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("company_profile")
    .select("*")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as CompanyProfile | null;
}

export async function saveCompanyProfile(
  profile: Omit<CompanyProfile, "id" | "updated_at">,
  existingId?: string
): Promise<CompanyProfile> {
  const supabase = createClient();

  if (existingId) {
    const { data, error } = await supabase
      .from("company_profile")
      .update({ ...profile, updated_at: new Date().toISOString() })
      .eq("id", existingId)
      .select()
      .single();
    if (error) throw error;
    return data as CompanyProfile;
  }

  const { data, error } = await supabase
    .from("company_profile")
    .insert(profile)
    .select()
    .single();
  if (error) throw error;
  return data as CompanyProfile;
}