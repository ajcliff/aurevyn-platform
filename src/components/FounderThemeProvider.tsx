"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { getFounderSettings } from "@/lib/founderSettings";
import { getThemePresets } from "@/lib/themePresets";
import { applyThemeColors, applyBuiltinTheme } from "@/lib/themeColors";

// The saved theme is already painted by the pre-paint script in the root layout.
// This only reconciles it with the database (e.g. changed on another device) and
// never removes the theme on unmount, so navigation can't flash default colors.
export default function FounderThemeProvider() {
  useEffect(() => {
    let active = true;

    async function reconcile() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !active) return;

        const settings = await getFounderSettings(user.id);
        if (!active) return;

        if (settings.theme_preset_id) {
          const presets = await getThemePresets();
          const preset = presets.find(p => p.id === settings.theme_preset_id);
          if (preset && active) { applyThemeColors(preset); return; }
        }
        applyBuiltinTheme(settings.platform_theme);
      } catch (err) {
        console.error("Failed to load founder theme:", err);
      }
    }

    reconcile();
    return () => { active = false; };
  }, []);

  return null;
}
