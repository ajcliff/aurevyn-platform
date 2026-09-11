import { createClient } from "./supabase";
import { logActivity } from "@/lib/activity";

export type DeliveryStatus = "pending" | "dispatched" | "in_transit" | "delivered" | "cancelled";

export type DeliveryItem = {
  product_name: string;
  quantity: number;
};

export type DeliveryNote = {
  id: string;
  org_id: string;
  delivery_number: string;
  sale_id: string | null;
  customer_name: string | null;
  warehouse_id: string | null;
  vehicle_id: string | null;
  driver_employee_id: string | null;
  status: DeliveryStatus;
  items: DeliveryItem[];
  notes: string | null;
  created_at: string;
  vehicles?: { name: string; plate_number: string | null } | null;
  employees?: { full_name: string } | null;
  warehouses?: { name: string } | null;
};

const SELECT = "*, vehicles(name, plate_number), employees(full_name), warehouses(name)";

export async function getDeliveryNotes(orgId: string): Promise<DeliveryNote[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("delivery_notes")
    .select(SELECT)
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error(error);
    return [];
  }
  return data as unknown as DeliveryNote[];
}

async function generateDeliveryNumber(orgId: string): Promise<string> {
  const supabase = createClient();
  const { count } = await supabase
    .from("delivery_notes")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId);
  return `DN-${String((count || 0) + 1).padStart(5, "0")}`;
}

export async function createDeliveryNote(input: {
  org_id: string;
  customer_name?: string;
  sale_id?: string | null;
  warehouse_id?: string | null;
  vehicle_id?: string | null;
  driver_employee_id?: string | null;
  items: DeliveryItem[];
  notes?: string;
}): Promise<DeliveryNote | null> {
  const supabase = createClient();
  const delivery_number = await generateDeliveryNumber(input.org_id);

  const { data, error } = await supabase
    .from("delivery_notes")
    .insert([{
      org_id: input.org_id,
      delivery_number,
      sale_id: input.sale_id ?? null,
      customer_name: input.customer_name ?? null,
      warehouse_id: input.warehouse_id ?? null,
      vehicle_id: input.vehicle_id ?? null,
      driver_employee_id: input.driver_employee_id ?? null,
      status: "pending",
      items: input.items,
      notes: input.notes ?? null,
    }])
    .select(SELECT)
    .single();
  if (error) throw error;

  await logActivity({
    icon: "🚚",
    title: "Delivery note created",
    sub: `${delivery_number}${input.customer_name ? " — " + input.customer_name : ""}`,
    org_id: input.org_id,
  });

  return data as unknown as DeliveryNote;
}

export async function updateDeliveryStatus(id: string, orgId: string, status: DeliveryStatus): Promise<void> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("delivery_notes")
    .update({ status })
    .eq("id", id)
    .select("delivery_number")
    .single();
  if (error) throw error;

  await logActivity({
    icon: status === "delivered" ? "✅" : status === "cancelled" ? "❌" : "🚚",
    title: `Delivery ${status.replace("_", " ")}`,
    sub: data.delivery_number,
    org_id: orgId,
  });
}

export async function updateDeliveryNote(id: string, updates: Partial<Omit<DeliveryNote, "id" | "created_at">>): Promise<DeliveryNote> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("delivery_notes")
    .update(updates)
    .eq("id", id)
    .select(SELECT)
    .single();
  if (error) throw error;
  return data as unknown as DeliveryNote;
}

export async function deleteDeliveryNote(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("delivery_notes").delete().eq("id", id);
  if (error) throw error;
}
