import { createClient } from "./supabase";
import { logActivity } from "@/lib/activity";
import { decideApprovalRequest } from "@/lib/approvals";
import { updateStock } from "@/lib/inventory";

export type PurchaseOrderStatus = "approved" | "ordered" | "partially_received" | "received" | "cancelled";
export type PurchaseOrderOrigin = "approval" | "manual";

export type PurchaseOrderItem = {
  id: string;
  po_id: string;
  product_id: string;
  quantity: number;
  unit_cost: number;
  received_quantity: number;
  created_at: string;
  inventory_products?: { name: string; sku: string } | null;
};

export type PurchaseOrder = {
  id: string;
  org_id: string;
  approval_request_id: string | null;
  product_id: string | null;
  po_number: string;
  supplier_id: string | null;
  supplier_name: string;
  quantity: number | null;
  unit_cost: number | null;
  total_cost: number;
  status: PurchaseOrderStatus;
  origin: PurchaseOrderOrigin;
  document_id: string | null;
  created_at: string;
  inventory_products?: { name: string; sku: string } | null;
  suppliers?: { name: string } | null;
  purchase_order_items?: PurchaseOrderItem[];
};

const PO_SELECT = "*, inventory_products(name, sku), suppliers(name), purchase_order_items(*, inventory_products(name, sku))";

export async function getPurchaseOrders(orgId: string): Promise<PurchaseOrder[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("purchase_orders")
    .select(PO_SELECT)
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }
  return data as PurchaseOrder[];
}

async function generatePoNumber(orgId: string): Promise<string> {
  const supabase = createClient();
  const { count } = await supabase
    .from("purchase_orders")
    .select("*", { count: "exact", head: true })
    .eq("org_id", orgId);

  const next = (count || 0) + 1;
  return `PO-${String(next).padStart(4, "0")}`;
}

// Called when a manager approves a low-stock (or manual) purchase request —
// captures the details a plain approve/reject never asked for, and closes
// out the originating approval request in the same action.
//
// UNCHANGED externally: same signature, same return shape, same side effects
// as before multi-line items existed. The only addition is that it now also
// writes a single mirrored row into purchase_order_items, so this PO shows
// up consistently alongside manually-created multi-line POs on the
// Procurement page (list view, receiving flow, etc).
export async function createPurchaseOrderFromApproval(input: {
  orgId: string;
  approvalRequestId: string;
  approvalTitle: string;
  productId: string | null;
  supplierName: string;
  quantity: number;
  unitCost: number;
  decidedByName: string;
}): Promise<PurchaseOrder | null> {
  const supabase = createClient();

  const po_number = await generatePoNumber(input.orgId);
  const total_cost = input.quantity * input.unitCost;

  const { data, error } = await supabase
    .from("purchase_orders")
    .insert({
      org_id: input.orgId,
      approval_request_id: input.approvalRequestId,
      product_id: input.productId,
      po_number,
      supplier_name: input.supplierName,
      quantity: input.quantity,
      unit_cost: input.unitCost,
      total_cost,
      status: "approved",
      origin: "approval",
    })
    .select(PO_SELECT)
    .single();

  if (error) {
    console.error(error);
    return null;
  }

  if (input.productId) {
    const { error: itemError } = await supabase.from("purchase_order_items").insert({
      po_id: data.id,
      product_id: input.productId,
      quantity: input.quantity,
      unit_cost: input.unitCost,
    });
    if (itemError) console.error(itemError);
  }

  await decideApprovalRequest(
    input.approvalRequestId,
    "approved",
    input.decidedByName,
    input.orgId,
    input.approvalTitle
  );

  await logActivity({
    icon: "📦",
    title: "Purchase order created",
    sub: `${po_number} — ${input.supplierName} · KES ${total_cost.toLocaleString()}`,
    org_id: input.orgId,
  });

  return getPurchaseOrderById(data.id);
}

// Standalone creation — the new entry point that doesn't require an
// approval request. Supports multiple products on one PO.
export async function createManualPurchaseOrder(input: {
  orgId: string;
  supplierId: string;
  supplierName: string;
  items: { productId: string; quantity: number; unitCost: number }[];
  createdByName: string;
}): Promise<PurchaseOrder | null> {
  if (input.items.length === 0) throw new Error("A purchase order needs at least one line item.");

  const supabase = createClient();
  const po_number = await generatePoNumber(input.orgId);
  const total_cost = input.items.reduce((sum, i) => sum + i.quantity * i.unitCost, 0);

  const { data, error } = await supabase
    .from("purchase_orders")
    .insert({
      org_id: input.orgId,
      approval_request_id: null,
      product_id: null,
      po_number,
      supplier_id: input.supplierId,
      supplier_name: input.supplierName,
      quantity: null,
      unit_cost: null,
      total_cost,
      status: "approved",
      origin: "manual",
    })
    .select()
    .single();

  if (error) {
    console.error(error);
    return null;
  }

  const { error: itemsError } = await supabase.from("purchase_order_items").insert(
    input.items.map((i) => ({
      po_id: data.id,
      product_id: i.productId,
      quantity: i.quantity,
      unit_cost: i.unitCost,
    }))
  );

  if (itemsError) {
    console.error(itemsError);
    // Roll back the header so we don't leave an item-less PO behind.
    await supabase.from("purchase_orders").delete().eq("id", data.id);
    return null;
  }

  await logActivity({
    icon: "📦",
    title: "Purchase order created",
    sub: `${po_number} — ${input.supplierName} · KES ${total_cost.toLocaleString()} · by ${input.createdByName}`,
    org_id: input.orgId,
  });

  return getPurchaseOrderById(data.id);
}

export async function getPurchaseOrderById(id: string): Promise<PurchaseOrder | null> {
  const supabase = createClient();
  const { data, error } = await supabase.from("purchase_orders").select(PO_SELECT).eq("id", id).single();
  if (error) {
    console.error(error);
    return null;
  }
  return data as PurchaseOrder;
}

export async function updatePurchaseOrderStatus(
  id: string,
  orgId: string,
  status: PurchaseOrderStatus,
  poNumber: string
) {
  const supabase = createClient();
  const { error } = await supabase
    .from("purchase_orders")
    .update({ status })
    .eq("id", id);

  if (error) {
    console.error(error);
    return;
  }

  await logActivity({
    icon: status === "received" ? "✅" : "📦",
    title: `Purchase order ${status.replace("_", " ")}`,
    sub: poNumber,
    org_id: orgId,
  });
}

// Partial (or full) receiving across one or more line items on a single PO.
// Each receipt bumps that product's stock via the existing Inventory
// updateStock() — receiving into Procurement is what actually moves stock,
// same as the old single-product approval flow did implicitly.
export async function receivePurchaseOrderItems(input: {
  poId: string;
  orgId: string;
  poNumber: string;
  warehouseId?: string;
  receivedByName: string;
  receipts: { itemId: string; productId: string; receiveQty: number }[];
}): Promise<PurchaseOrder | null> {
  const supabase = createClient();
  const validReceipts = input.receipts.filter((r) => r.receiveQty > 0);
  if (validReceipts.length === 0) return getPurchaseOrderById(input.poId);

  for (const r of validReceipts) {
    const { data: item, error: itemFetchError } = await supabase
      .from("purchase_order_items")
      .select("received_quantity, quantity")
      .eq("id", r.itemId)
      .single();

    if (itemFetchError || !item) {
      console.error(itemFetchError);
      continue;
    }

    const newReceived = Math.min(Number(item.received_quantity) + r.receiveQty, Number(item.quantity));

    const { error: updateError } = await supabase
      .from("purchase_order_items")
      .update({ received_quantity: newReceived })
      .eq("id", r.itemId);

    if (updateError) {
      console.error(updateError);
      continue;
    }

    await updateStock(r.productId, r.receiveQty, "stock_in", `Received ${input.poNumber}`, input.warehouseId);
  }

  // Recompute the PO's overall status from its line items.
  const { data: items, error: itemsError } = await supabase
    .from("purchase_order_items")
    .select("quantity, received_quantity")
    .eq("po_id", input.poId);

  if (!itemsError && items) {
    const allReceived = items.every((i) => Number(i.received_quantity) >= Number(i.quantity));
    const anyReceived = items.some((i) => Number(i.received_quantity) > 0);
    const newStatus: PurchaseOrderStatus = allReceived ? "received" : anyReceived ? "partially_received" : "ordered";

    await supabase.from("purchase_orders").update({ status: newStatus }).eq("id", input.poId);
  }

  await logActivity({
    icon: "✅",
    title: "Purchase order received",
    sub: `${input.poNumber} · by ${input.receivedByName}`,
    org_id: input.orgId,
  });

  return getPurchaseOrderById(input.poId);
}

export async function getPurchaseOrderDocumentUrl(documentId: string): Promise<string | null> {
  const supabase = createClient();
  const { data: doc } = await supabase
    .from("documents")
    .select("file_path")
    .eq("id", documentId)
    .maybeSingle();

  if (!doc) return null;

  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(doc.file_path, 300);

  if (error) {
    console.error(error);
    return null;
  }
  return data.signedUrl;
}

export async function linkPurchaseOrderDocument(id: string, documentId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("purchase_orders")
    .update({ document_id: documentId })
    .eq("id", id);

  if (error) console.error(error);
}