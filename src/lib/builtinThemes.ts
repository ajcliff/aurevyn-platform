import { DEFAULT_THEME_COLORS, type ThemeColors } from "./themeColors";

// Preview palettes for the four built-in themes (their live styling still comes from the
// [data-theme] blocks in globals.css). Used only to draw picker cards.
const make = (o: Partial<ThemeColors>): ThemeColors => ({ ...DEFAULT_THEME_COLORS, ...o });

export const BUILTIN_THEMES = [
  { id: "rift-valley", name: "Rift Valley", description: "Aubergine and gold", colors: make({}) },
  { id: "savannah-dusk", name: "Savannah Dusk", description: "Indigo-navy and coral",
    colors: make({ bg_base: "#0B0E1A", bg_card: "#11152A", border_light: "#2B3158", gold: "#E15B4D", gold_light: "#EE7A6E", text_primary: "#E8EAF5", text_secondary: "#8D93B5" }) },
  { id: "highland-tea", name: "Highland Tea", description: "Forest green and copper",
    colors: make({ bg_base: "#0D1410", bg_card: "#121C16", border_light: "#2C4636", gold: "#C87F3B", gold_light: "#DB9857", text_primary: "#E6EFE8", text_secondary: "#8DA697" }) },
  { id: "zanzibar-spice", name: "Zanzibar Spice", description: "Parchment and clove, light mode",
    colors: make({ bg_base: "#F2E8D5", bg_card: "#FBF5E8", border: "#DCCDB0", border_light: "#C7B493", gold: "#5B3A29", gold_light: "#7A5340", text_primary: "#2B1D14", text_secondary: "#6B5745", text_muted: "#8A7660" }) },
] as const;
