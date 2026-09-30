export const ENGINE_ICONS: Record<string, string> = {
  inventory: "📦",
  pos: "🛒",
  finance: "💰",
  crm: "👥",
  "hr-payroll": "🧑‍💼",
  analytics: "📊",
  procurement: "📋",
  automation: "🔁",
  "ai-insights": "✨",
  "business-ops": "🧭",
};

// Every top-level org route that isn't itself an engine's own route
// belongs to exactly one engine — gated by that engine, not free-floating.
// The route keeps its URL; only which engine's license unlocks it changes.
export const SEGMENT_TO_ENGINE: Record<string, string> = {
  // Inventory sub-areas
  warehouses: "inventory",
  pricelists: "inventory",
  "stock-takes": "inventory",
  fleet: "inventory",

  // Finance — approvals are overwhelmingly financial (expenses,
  // reimbursements, purchases, salary advances)
  approvals: "finance",

  // HR & Payroll — the Directory/Broadcast admin side. Self-service
  // (your own profile, payslips, leave) lives at /me and is ungated.
  employees: "hr-payroll",

  // Business Operations — the general workspace utilities
  documents: "business-ops",
  knowledge: "business-ops",
  activity: "business-ops",
};

// Org identity and self-service: these aren't features someone buys, so
// they never require an engine license. Users/Settings are still
// role-gated separately (owners/admins only).
export const PLATFORM_SEGMENTS = new Set([
  "me",
  "settings",
  "users",
  "team",
  "engines",
  "welcome",
  "summary",
]);

export const SEGMENT_ICONS: Record<string, string> = {
  warehouses: "🏬",
  pricelists: "🏷️",
  "stock-takes": "📋",
  fleet: "🚚",
  approvals: "✅",
  employees: "🪪",
  documents: "📄",
  knowledge: "📚",
  activity: "🕐",
};

export const NAV_LABELS: Record<string, string> = {
  activity: "Activity",
  approvals: "Approvals",
  documents: "Documents",
  knowledge: "Knowledge Base",
  employees: "HR Directory",
  warehouses: "Warehouses",
  pricelists: "Pricelists",
  "stock-takes": "Stock Takes",
  fleet: "Fleet & Delivery",
  automation: "Automation",
  me: "Self Service",
  users: "Users",
  team: "Users",
  engines: "Engines",
  settings: "Settings",
};
