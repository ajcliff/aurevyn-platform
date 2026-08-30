export type ThemeColors = {
  bg_base: string;
  bg_surface: string;
  bg_elevated: string;
  bg_card: string;
  bg_hover: string;
  border: string;
  border_light: string;
  gold: string;
  gold_light: string;
  gold_dim: string;
  text_primary: string;
  text_secondary: string;
  text_muted: string;
  green: string;
  amber: string;
  red: string;
};

export const THEME_COLOR_FIELDS: { key: keyof ThemeColors; label: string; group: string }[] = [
  { key: "bg_base", label: "Base Background", group: "Backgrounds" },
  { key: "bg_surface", label: "Surface", group: "Backgrounds" },
  { key: "bg_elevated", label: "Elevated", group: "Backgrounds" },
  { key: "bg_card", label: "Card", group: "Backgrounds" },
  { key: "bg_hover", label: "Hover", group: "Backgrounds" },
  { key: "border", label: "Border", group: "Borders" },
  { key: "border_light", label: "Border (Light)", group: "Borders" },
  { key: "gold", label: "Accent", group: "Accent" },
  { key: "gold_light", label: "Accent (Light)", group: "Accent" },
  { key: "gold_dim", label: "Accent (Dim)", group: "Accent" },
  { key: "text_primary", label: "Primary Text", group: "Text" },
  { key: "text_secondary", label: "Secondary Text", group: "Text" },
  { key: "text_muted", label: "Muted Text", group: "Text" },
  { key: "green", label: "Success", group: "Status" },
  { key: "amber", label: "Warning", group: "Status" },
  { key: "red", label: "Error", group: "Status" },
];

export const DEFAULT_THEME_COLORS: ThemeColors = {
  bg_base: "#1A0F14",
  bg_surface: "#21131A",
  bg_elevated: "#2C1922",
  bg_card: "#24141B",
  bg_hover: "#331C26",
  border: "#3D2530",
  border_light: "#563347",
  gold: "#C9A227",
  gold_light: "#E0BC4A",
  gold_dim: "#7A6017",
  text_primary: "#F0E6D8",
  text_secondary: "#A08B94",
  text_muted: "#5C4652",
  green: "#6FA37A",
  amber: "#E0A344",
  red: "#C1503D",
};

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function relativeLuminance(hex: string): number {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Applies a full theme by setting CSS custom properties directly on <html>,
// including the derived glow/shadow/contrast values the base 16 fields don't cover.
export function applyThemeColors(colors: ThemeColors) {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(colors)) {
    root.style.setProperty(`--${key.replace(/_/g, "-")}`, value);
  }
  root.style.setProperty("--gold-glow", hexToRgba(colors.gold, 0.15));
  root.style.setProperty("--gold-glow-strong", hexToRgba(colors.gold, 0.3));
  root.style.setProperty("--gold-contrast", relativeLuminance(colors.gold) > 0.5 ? "#0a0a0f" : "#ffffff");
  root.style.setProperty("--green-glow", hexToRgba(colors.green, 0.2));
  root.style.setProperty("--shadow-gold", `0 0 20px ${hexToRgba(colors.gold, 0.15)}`);
}

// Clears any inline overrides so a built-in preset's static CSS block takes over cleanly
export function clearCustomThemeColors() {
  const root = document.documentElement;
  for (const field of THEME_COLOR_FIELDS) {
    root.style.removeProperty(`--${field.key.replace(/_/g, "-")}`);
  }
  root.style.removeProperty("--gold-glow");
  root.style.removeProperty("--gold-glow-strong");
  root.style.removeProperty("--gold-contrast");
  root.style.removeProperty("--green-glow");
  root.style.removeProperty("--shadow-gold");
}