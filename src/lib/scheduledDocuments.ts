import { createClient } from "./supabase";
import type { InvoiceItemInput, OrgInvoiceWithItems } from "./orgInvoices";
import type { PurchaseOrder } from "./purchaseOrders";

export type ScheduleFrequency = "weekly" | "monthly" | "quarterly" | "annual";

export type ScheduledInvoice = {
  id: string;
  org_id: string;
  customer_id: string | null;
  label: string;
  items: InvoiceItemInput[];
  vat_rate: number;
  wht_rate: number;
  notes: string | null;
  due_days_offset: number;
  frequency: ScheduleFrequency;
  next_run: string;
  last_run: string | null;
  active: boolean;
  created_at: string;
  customers?: { name: string } | null;
};

export type ScheduledPurchaseOrder = {
  id: string;
  org_id: string;
  supplier_id: string | null;
  supplier_name: string;
  label: string;
  items: { productId: string; quantity: number; unitCost: number }[];
  frequency: ScheduleFrequency;
  next_run: string;
  last_run: string | null;
  active: boolean;
  created_at: string;
};

function computeNextRun(from: string, frequency: ScheduleFrequency): string {
  const date = new Date(from);
  switch (frequency) {
    case "weekly": date.setDate(date.getDate() + 7); break;
    case "monthly": date.setMonth(date.getMonth() + 1); break;
    case "quarterly": date.setMonth(date.getMonth() + 3); break;
    case "annual": date.setFullYear(date.getFullYear() + 1); break;
  }
  return date.toISOString().split("T")[0];
}

// ---- Scheduled Invoices ----

export async function getScheduledInvoices(orgId: string): Promise<ScheduledInvoice[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("scheduled_invoices")
    .select("*, customers(name)")
    .eq("org_id", orgId)
    .order("next_run", { ascending: true });
  if (error) throw error;
  return data as ScheduledInvoice[];
}

// Snapshot an existing invoice into a new recurring schedule
export async function createScheduleFromInvoice(
  orgId: string,
  invoice: OrgInvoiceWithItems,
  label: string,
  frequency: ScheduleFrequency
): Promise<ScheduledInvoice> {
  const supabase = createClient();
  const nextRun = computeNextRun(new Date().toISOString(), frequency);

  const { data, error } = await supabase
    .from("scheduled_invoices")
    .insert({
      org_id: orgId,
      customer_id: invoice.customer_id,
      label,
      items: invoice.items.map(i => ({ description: i.description, quantity: i.quantity, unit_price: i.unit_price })),
      vat_rate: invoice.vat_rate,
      wht_rate: invoice.wht_rate,
      notes: invoice.notes,
      due_days_offset: 14,
      frequency,
      next_run: nextRun,
    })
    .select("*, customers(name)")
    .single();
  if (error) throw error;
  return data as ScheduledInvoice;
}

export async function createScheduledInvoice(input: {
  orgId: string;
  customerId: string | null;
  label: string;
  items: InvoiceItemInput[];
  vatRate: number;
  whtRate: number;
  notes?: string;
  dueDaysOffset: number;
  frequency: ScheduleFrequency;
  startDate: string;
}): Promise<ScheduledInvoice> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("scheduled_invoices")
    .insert({
      org_id: input.orgId,
      customer_id: input.customerId,
      label: input.label,
      items: input.items,
      vat_rate: input.vatRate,
      wht_rate: input.whtRate,
      notes: input.notes,
      due_days_offset: input.dueDaysOffset,
      frequency: input.frequency,
      next_run: input.startDate,
    })
    .select("*, customers(name)")
    .single();
  if (error) throw error;
  return data as ScheduledInvoice;
}

export async function toggleScheduledInvoiceActive(id: string, active: boolean): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("scheduled_invoices").update({ active }).eq("id", id);
  if (error) throw error;
}

export async function deleteScheduledInvoice(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("scheduled_invoices").delete().eq("id", id);
  if (error) throw error;
}

// ---- Scheduled Purchase Orders ----

export async function getScheduledPurchaseOrders(orgId: string): Promise<ScheduledPurchaseOrder[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("scheduled_purchase_orders")
    .select("*")
    .eq("org_id", orgId)
    .order("next_run", { ascending: true });
  if (error) throw error;
  return data as ScheduledPurchaseOrder[];
}

// Snapshot an existing PO into a new recurring schedule
export async function createScheduleFromPurchaseOrder(
  orgId: string,
  po: PurchaseOrder,
  label: string,
  frequency: ScheduleFrequency
): Promise<ScheduledPurchaseOrder> {
  const supabase = createClient();
  const nextRun = computeNextRun(new Date().toISOString(), frequency);

  const items = (po.purchase_order_items ?? []).map(i => ({
    productId: i.product_id,
    quantity: i.quantity,
    unitCost: i.unit_cost,
  }));

  const { data, error } = await supabase
    .from("scheduled_purchase_orders")
    .insert({
      org_id: orgId,
      supplier_id: po.supplier_id,
      supplier_name: po.supplier_name,
      label,
      items,
      frequency,
      next_run: nextRun,
    })
    .select()
    .single();
  if (error) throw error;
  return data as ScheduledPurchaseOrder;
}

export async function toggleScheduledPurchaseOrderActive(id: string, active: boolean): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("scheduled_purchase_orders").update({ active }).eq("id", id);
  if (error) throw error;
}

export async function deleteScheduledPurchaseOrder(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("scheduled_purchase_orders").delete().eq("id", id);
  if (error) throw error;
}