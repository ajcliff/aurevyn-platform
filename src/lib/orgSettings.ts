import { createClient } from "./supabase";
import { logActivity } from "@/lib/activity";

export type ThemeName = "rift-valley" | "savannah-dusk" | "highland-tea" | "zanzibar-spice";

export type OrgSettings = {
  org_id: string;
  business_name: string | null;
  business_address: string | null;
  business_phone: string | null;
  logo_path: string | null;
  default_vat_rate: number;
  default_wht_rate: number;
  invoice_prefix: string;
  theme: ThemeName;
  updated_at: string;
};

const DEFAULTS: Omit<OrgSettings, "org_id" | "updated_at"> = {
  business_name: null,
  business_address: null,
  business_phone: null,
  logo_path: null,
  default_vat_rate: 16,
  default_wht_rate: 0,
  invoice_prefix: "INV-",
  theme: "rift-valley",
};

export async function getOrgSettings(orgId: string): Promise<OrgSettings> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("org_settings")
    .select("*")
    .eq("org_id", orgId)
    .maybeSingle();

  if (error) {
    console.error(error);
  }

  if (data) return data as OrgSettings;

  // No row yet — return sensible defaults without writing to the DB
  return { org_id: orgId, updated_at: new Date().toISOString(), ...DEFAULTS };
}

export async function updateOrgSettings(
  orgId: string,
  updates: Partial<Omit<OrgSettings, "org_id" | "updated_at">>
): Promise<OrgSettings | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("org_settings")
    .upsert({ org_id: orgId, ...updates, updated_at: new Date().toISOString() }, { onConflict: "org_id" })
    .select()
    .single();

  if (error) {
    console.error(error);
    return null;
  }

  await logActivity({
    icon: "⚙️",
    title: "Settings updated",
    sub: Object.keys(updates).join(", "),
    org_id: orgId,
  });

  return data as OrgSettings;
}

export async function uploadOrgLogo(orgId: string, file: File): Promise<string | null> {
  const supabase = createClient();

  const ext = file.name.split(".").pop();
  const path = `${orgId}/logo.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("org-logos")
    .upload(path, file, { upsert: true });

  if (uploadError) {
    console.error(uploadError);
    return null;
  }

  const { data } = supabase.storage.from("org-logos").getPublicUrl(path);

  await updateOrgSettings(orgId, { logo_path: path });

  return data.publicUrl;
}

export function getOrgLogoUrl(logoPath: string | null): string | null {
  if (!logoPath) return null;
  const supabase = createClient();
  const { data } = supabase.storage.from("org-logos").getPublicUrl(logoPath);
  return data.publicUrl;
}