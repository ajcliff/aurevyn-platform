import { createClient } from "./supabase";

export type PricedEngine = {
  slug: string;
  name: string;
  tiers: { seats: number; price: number }[];
};

export const UNLIMITED_SEATS = 999999;

// Public price list: every engine with its seat-tier ladder, read straight from
// engine_license_tiers so changing a price in the database changes the website.
export async function getPublicPricing(): Promise<PricedEngine[]> {
  const supabase = createClient();
  const [{ data: engines, error: e1 }, { data: tiers, error: e2 }] = await Promise.all([
    supabase.from("engines").select("id, slug, name"),
    supabase.from("engine_license_tiers").select("engine_id, seats, price").order("seats"),
  ]);
  if (e1 || e2) {
    console.error("Error fetching pricing:", e1 ?? e2);
    return [];
  }
  return (engines ?? [])
    .map(e => ({
      slug: e.slug as string,
      name: e.name as string,
      tiers: (tiers ?? []).filter(t => t.engine_id === e.id).map(t => ({ seats: Number(t.seats), price: Number(t.price) })),
    }))
    .filter(e => e.tiers.length > 0)
    // Biggest earners first so the page leads with what most customers buy
    .sort((a, b) => (b.tiers[0]?.price ?? 0) - (a.tiers[0]?.price ?? 0) || a.name.localeCompare(b.name));
}
