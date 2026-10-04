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
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function hexToRgb(hex: string): [number, number, number] {
  let clean = hex.replace("#", "");
  if (clean.length === 3) clean = clean.split("").map(c => c + c).join("");
  const n = parseInt(clean, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

// WCAG relative luminance (gamma-corrected)
function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function mix(hex: string, target: string, amount: number): string {
  const [r1, g1, b1] = hexToRgb(hex);
  const [r2, g2, b2] = hexToRgb(target);
  return rgbToHex(r1 + (r2 - r1) * amount, g1 + (g2 - g1) * amount, b1 + (b2 - b1) * amount);
}

// Nudges `fg` toward white or black (whichever direction the background allows)
// until it reaches `min` contrast against `bg`.
function ensureContrast(fg: string, bg: string, min: number): string {
  if (contrastRatio(fg, bg) >= min) return fg;
  const target = luminance(bg) < 0.4 ? "#ffffff" : "#000000";
  for (let step = 1; step <= 20; step++) {
    const candidate = mix(fg, target, step * 0.05);
    if (contrastRatio(candidate, bg) >= min) return candidate;
  }
  return target;
}

// Guarantees a theme is usable no matter what colors were picked: text is readable,
// accent buttons stand out from the page, and borders are visible. Runs on every apply,
// so a bad preset or custom color can never produce invisible buttons or text.
export function sanitizeThemeColors(c: ThemeColors): ThemeColors {
  const out = { ...c };
  out.text_primary = ensureContrast(out.text_primary, out.bg_base, 7);
  out.text_secondary = ensureContrast(out.text_secondary, out.bg_card, 4.5);
  out.text_muted = ensureContrast(out.text_muted, out.bg_card, 3);
  out.gold = ensureContrast(out.gold, out.bg_base, 3);
  out.gold_light = ensureContrast(out.gold_light, out.bg_base, 3.5);
  out.border = ensureContrast(out.border, out.bg_base, 1.25);
  out.border_light = ensureContrast(out.border_light, out.bg_base, 1.6);
  out.green = ensureContrast(out.green, out.bg_base, 3);
  out.amber = ensureContrast(out.amber, out.bg_base, 3);
  out.red = ensureContrast(out.red, out.bg_base, 3);
  return out;
}

// Every CSS variable a theme needs, including derived ones. Single source of truth:
// this exact map is applied live AND cached, so the pre-paint script reproduces the
// theme perfectly instead of a half-applied version.
export function themeToCssVars(input: ThemeColors): Record<string, string> {
  const colors = sanitizeThemeColors(input);
  const vars: Record<string, string> = {};
  for (const [key, value] of Object.entries(colors)) {
    vars[`--${key.replace(/_/g, "-")}`] = value;
  }
  // Text on accent buttons: whichever of dark/light reads better on the accent
  const darkText = "#0a0a0f";
  vars["--gold-contrast"] = contrastRatio(colors.gold, darkText) >= contrastRatio(colors.gold, "#ffffff") ? darkText : "#ffffff";
  vars["--gold-glow"] = hexToRgba(colors.gold, 0.15);
  vars["--gold-glow-strong"] = hexToRgba(colors.gold, 0.3);
  vars["--green-glow"] = hexToRgba(colors.green, 0.2);
  vars["--shadow-gold"] = `0 0 20px ${hexToRgba(colors.gold, 0.15)}`;
  return vars;
}

export const THEME_CACHE_KEY = "aurevyn-active-theme";

export type CachedTheme =
  | { mode: "builtin"; name: string }
  | { mode: "vars"; vars: Record<string, string> };

// `scope` is an org id for org-space themes, omitted for the founder dashboard,
// so each space paints its own saved theme before first render.
export function cacheTheme(theme: CachedTheme, scope?: string) {
  try { localStorage.setItem(scope ? `${THEME_CACHE_KEY}:${scope}` : THEME_CACHE_KEY, JSON.stringify(theme)); } catch {}
}

// Applies a full custom theme and persists it so the next page load paints it immediately
export function applyThemeColors(colors: ThemeColors, scope?: string) {
  const root = document.documentElement;
  const vars = themeToCssVars(colors);
  root.removeAttribute("data-theme");
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
  cacheTheme({ mode: "vars", vars }, scope);
}

// Applies one of the built-in themes and persists it
export function applyBuiltinTheme(name: string, scope?: string) {
  clearCustomThemeColors();
  document.documentElement.setAttribute("data-theme", name);
  cacheTheme({ mode: "builtin", name }, scope);
}

// Clears inline overrides so a built-in theme's static CSS block takes over cleanly
export function clearCustomThemeColors() {
  const root = document.documentElement;
  for (const field of THEME_COLOR_FIELDS) {
    root.style.removeProperty(`--${field.key.replace(/_/g, "-")}`);
  }
  for (const k of ["--gold-glow", "--gold-glow-strong", "--gold-contrast", "--green-glow", "--shadow-gold"]) {
    root.style.removeProperty(k);
  }
}
