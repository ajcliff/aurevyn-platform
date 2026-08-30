"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { getFounderSettings } from "@/lib/founderSettings";
import { getThemePresets } from "@/lib/themePresets";
import { applyThemeColors, clearCustomThemeColors } from "@/lib/themeColors";

export default function FounderThemeProvider() {
  useEffect(() => {
    let active = true;

    async function applyTheme() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !active) return;

        const settings = await getFounderSettings(user.id);
if (active) {
  if (settings.theme_preset_id) {
document.documentElement.removeAttribute("data-theme");
clearCustomThemeColors();    const presets = await getThemePresets();
    const preset = presets.find(p => p.id === settings.theme_preset_id);
    if (preset && active) {
      applyThemeColors(preset);
      localStorage.setItem("aurevyn-active-theme", JSON.stringify({ mode: "colors", colors: preset }));
    }
  } else {
    document.documentElement.setAttribute("data-theme", settings.platform_theme);
    localStorage.setItem("aurevyn-active-theme", JSON.stringify({ mode: "builtin", name: settings.platform_theme }));
  }
}
      } catch (err) {
        console.error("Failed to load founder theme:", err);
      }
    }

    applyTheme();

    return () => {
      active = false;
      document.documentElement.removeAttribute("data-theme");
    };
  }, []);

  return null;
}