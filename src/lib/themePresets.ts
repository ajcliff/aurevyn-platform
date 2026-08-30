import { createClient } from "./supabase";
import type { ThemeColors } from "./themeColors";

export type ThemePreset = ThemeColors & {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
};

export async function getThemePresets(): Promise<ThemePreset[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("theme_presets")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as ThemePreset[];
}

export async function createThemePreset(preset: ThemeColors & { name: string; description?: string }): Promise<ThemePreset> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("theme_presets")
    .insert(preset)
    .select()
    .single();
  if (error) throw error;
  return data as ThemePreset;
}

export async function updateThemePreset(id: string, preset: Partial<ThemeColors & { name: string; description: string }>): Promise<ThemePreset> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("theme_presets")
    .update(preset)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as ThemePreset;
}

export async function deleteThemePreset(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("theme_presets").delete().eq("id", id);
  if (error) throw error;
}