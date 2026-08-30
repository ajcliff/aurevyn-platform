import { createClient } from "./supabase";

export type Supplier = {
  id: string;
  org_id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  payment_terms: string | null;
  categories: string[];
  created_at: string;
};

export async function getSuppliers(orgId: string): Promise<Supplier[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .eq("org_id", orgId)
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createSupplier(
  supplier: Omit<Supplier, "id" | "created_at">
): Promise<Supplier> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("suppliers")
    .insert(supplier)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateSupplier(
  id: string,
  updates: Partial<Omit<Supplier, "id" | "org_id" | "created_at">>
): Promise<Supplier> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("suppliers")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteSupplier(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("suppliers").delete().eq("id", id);
  if (error) throw new Error(error.message);
}