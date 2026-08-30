import { createClient } from "./supabase";
import type { ThemeColors } from "./themeColors";

export async function getOrgCustomTheme(orgId: string): Promise<ThemeColors | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("org_custom_themes")
    .select("*")
    .eq("org_id", orgId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { org_id, updated_at, ...colors } = data;
  return colors as ThemeColors;
}

export async function saveOrgCustomTheme(orgId: string, colors: ThemeColors): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("org_custom_themes")
    .upsert({ org_id: orgId, ...colors, updated_at: new Date().toISOString() });
  if (error) throw error;
}