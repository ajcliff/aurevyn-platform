import { createClient } from "./supabase";
import { logActivity } from "@/lib/activity";

export type Vehicle = {
  id: string;
  org_id: string;
  name: string;
  type: string;
  plate_number: string | null;
  capacity: string | null;
  status: string;
  created_at: string;
};

export async function getVehicles(orgId: string): Promise<Vehicle[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .eq("org_id", orgId)
    .order("name");
  if (error) {
    console.error(error);
    return [];
  }
  return data as Vehicle[];
}

export async function createVehicle(input: {
  org_id: string;
  name: string;
  type: string;
  plate_number?: string;
  capacity?: string;
}): Promise<Vehicle | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("vehicles")
    .insert([{ ...input, status: "active" }])
    .select()
    .single();
  if (error) throw error;

  await logActivity({
    icon: "🚐",
    title: "Vehicle added",
    sub: input.name,
    org_id: input.org_id,
  });

  return data as Vehicle;
}

export async function updateVehicle(id: string, updates: Partial<Vehicle>): Promise<Vehicle> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("vehicles")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Vehicle;
}

export async function deleteVehicle(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("vehicles").delete().eq("id", id);
  if (error) throw error;
}
