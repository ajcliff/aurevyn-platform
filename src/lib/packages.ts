import { createClient } from "./supabase";

export type Package = {
  id: string;
  name: string;
  slug: string;
  price: number;
  orgs: number;
  created_at: string;
  engine_slugs: string[];
  requires_any_of: string[] | null;
  is_bundle: boolean;
};

export async function getPackages(): Promise<Package[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("packages")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;

  return data as Package[];
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function createPackage(
  pkg: { name: string; price: number; orgs?: number; engine_slugs?: string[]; requires_any_of?: string[] | null; is_bundle?: boolean }
) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("packages")
    .insert([{
      name: pkg.name,
      price: pkg.price,
      orgs: pkg.orgs ?? 0,
      engine_slugs: pkg.engine_slugs ?? [],
      requires_any_of: pkg.requires_any_of ?? null,
      is_bundle: pkg.is_bundle ?? false,
      slug: slugify(pkg.name),
    }])
    .select()
    .single();

  if (error) {
    console.error("Error creating package:", error);
    return null;
  }

  return data as Package;
}

export async function updatePackage(
  id: string,
  updates: Partial<Pick<Package, "price" | "name" | "engine_slugs" | "is_bundle">>
) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("packages")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating package:", error);
    return null;
  }

  return data as Package;
}

export async function deletePackage(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("packages").delete().eq("id", id);
  if (error) console.error("Error deleting package:", error);
  return !error;
}