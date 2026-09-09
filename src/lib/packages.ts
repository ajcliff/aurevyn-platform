import { createClient } from "./supabase";

export type Package = {
  id: string;
  name: string;
  slug: string;
  price: string;
  features: string;
  orgs: number;
  created_at: string;
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
  pkg: Omit<Package, "id" | "created_at" | "slug">
) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("packages")
    .insert([{ ...pkg, slug: slugify(pkg.name) }])
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
  updates: Partial<Pick<Package, "price" | "features" | "name">>
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