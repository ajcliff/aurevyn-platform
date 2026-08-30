"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { getFounderSettings } from "@/lib/founderSettings";

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
          document.documentElement.setAttribute("data-theme", settings.platform_theme);
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