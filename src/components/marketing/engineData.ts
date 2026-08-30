export type EngineId = "pos" | "inventory" | "finance" | "crm" | "hr" | "security";

export const ENGINE_META: Record<EngineId, { label: string; color: string; sub: string }> = {
  pos: { label: "POS", color: "var(--mkt-blueprint)", sub: "Sell" },
  inventory: { label: "Inventory", color: "var(--mkt-signal)", sub: "Stock" },
  finance: { label: "Finance", color: "var(--mkt-brass)", sub: "Cashflow" },
  crm: { label: "CRM", color: "var(--mkt-violet)", sub: "Customers" },
  hr: { label: "HR & Payroll", color: "var(--mkt-amber)", sub: "People" },
  security: { label: "Security", color: "var(--mkt-alert)", sub: "Threat watch" },
};

export const ENGINE_ORDER: EngineId[] = ["pos", "inventory", "finance", "crm", "hr", "security"];

// Simple cross-component signal: clicking an engine anywhere on the page
// (hero diagram, engine grid) opens that engine in the product showcase.
export const ENGINE_SELECT_EVENT = "aurevyn:engine-select";

export function selectEngine(id: EngineId) {
  window.dispatchEvent(new CustomEvent(ENGINE_SELECT_EVENT, { detail: id }));
  document.getElementById("product")?.scrollIntoView({ behavior: "smooth", block: "start" });
}
