export const kes = (n: number) => `KES ${Math.round(n).toLocaleString("en-KE")}`;

/**
 * Coerces a price/amount field to a number. Accepts a formatted string
 * ("KES 15,000/mo"), a plain number (some Supabase numeric columns come
 * back as numbers, not strings), or null/undefined — never throws.
 */
export const toNumber = (v: string | number | null | undefined): number => {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = parseInt(v.replace(/[^0-9]/g, ""), 10);
  return Number.isNaN(n) ? 0 : n;
};

export function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export const shortDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }) : "—";

/** "3 days overdue", "Due today", "Due in 5 days" */
export function relativeDue(days: number): string {
  if (days < 0) return `${Math.abs(days)} ${Math.abs(days) === 1 ? "day" : "days"} overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
}

export const today = () => new Date().toISOString().split("T")[0];