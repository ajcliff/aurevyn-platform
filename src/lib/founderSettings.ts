import { createClient } from "./supabase";
import type { ThemeName } from "./orgSettings";

export type FounderSettings = {
  user_id: string;
  full_name: string | null;
  location: string | null;
  platform_name: string;
  default_currency: string;
  default_package: string;
  timezone: string;
  platform_theme: ThemeName;
  theme_preset_id: string | null;
  notify_new_org: boolean;
  notify_payment_received: boolean;
  notify_payment_overdue: boolean;
  notify_module_activated: boolean;
  notify_system_alerts: boolean;
  notify_weekly_report: boolean;
  updated_at: string;
};

const DEFAULTS: Omit<FounderSettings, "user_id" | "updated_at"> = {
  full_name: null,
  location: null,
  platform_name: "AUREVYN",
  default_currency: "KES",
  default_package: "Starter",
  timezone: "Africa/Nairobi",
  platform_theme: "rift-valley",
  theme_preset_id: null,
  notify_new_org: true,
  notify_payment_received: true,
  notify_payment_overdue: true,
  notify_module_activated: false,
  notify_system_alerts: true,
  notify_weekly_report: true,
};

export async function getFounderSettings(userId: string): Promise<FounderSettings> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("founder_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    return {
      user_id: userId,
      updated_at: new Date().toISOString(),
      ...DEFAULTS,
    };
  }

  return data as FounderSettings;
}

export async function updateFounderSettings(
  userId: string,
  updates: Partial<Omit<FounderSettings, "user_id" | "updated_at">>
): Promise<FounderSettings> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("founder_settings")
    .upsert({ user_id: userId, ...updates, updated_at: new Date().toISOString() }, { onConflict: "user_id" })
    .select()
    .single();

  if (error) throw error;

  return data as FounderSettings;
}