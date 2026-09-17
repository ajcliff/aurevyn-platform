import { createClient } from "./supabase";
import { createSale, type PosSale, type PosSaleItem } from "./pos";
import { recordPayment, type PaymentDetailsInput } from "./payments";
import { updateStock } from "./inventory";
import { logActivity } from "./activity";

const STORAGE_KEY = "aurevyn_pos_offline_queue";

export type QueuedSale = {
  localId: string;
  queuedAt: string;
  sale: PosSale;
  paymentLines: PaymentDetailsInput[];
  cartItems: { productId: string; quantity: number }[];
  warehouseId: string | null;
};

function readQueue(): QueuedSale[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedSale[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

export function getQueuedSales(): QueuedSale[] {
  return readQueue();
}

export function queueOfflineSale(
  sale: PosSale,
  paymentLines: PaymentDetailsInput[],
  cartItems: { productId: string; quantity: number }[],
  warehouseId: string | null
): QueuedSale {
  const queue = readQueue();
  const entry: QueuedSale = {
    localId: `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    queuedAt: new Date().toISOString(),
    sale,
    paymentLines,
    cartItems,
    warehouseId,
  };
  queue.push(entry);
  writeQueue(queue);
  return entry;
}

let syncing = false;

/**
 * Replays every queued sale in order against the real backend. Uses a
 * mobile-write-enabled client since this runs from the POS engine, which
 * has its own deliberate mobile support (unlike every other engine, which
 * stays locked - see src/lib/supabase.ts).
 *
 * Oversell safety net: updateStock already floors stock at zero rather
 * than going negative, but that alone would silently hide a real-world
 * conflict (two offline devices selling the last unit before either
 * synced). Here we check availability before deducting and log an
 * activity flag if a queued sale oversold, so the org owner sees it and
 * can reconcile with the customer - the sale itself still completes,
 * since the item was already physically handed over.
 */
export async function syncQueuedSales(orgId: string): Promise<{ synced: number; failed: number }> {
  if (syncing) return { synced: 0, failed: 0 };
  if (typeof navigator !== "undefined" && !navigator.onLine) return { synced: 0, failed: 0 };

  syncing = true;
  const client = createClient({ allowMobileWrites: true });
  const queue = readQueue();
  let synced = 0;
  let failed = 0;
  const remaining: QueuedSale[] = [];

  for (const entry of queue) {
    try {
      const created = await createSale(entry.sale, client);
      if (!created?.id) throw new Error("Sale creation failed during sync");

      for (const line of entry.paymentLines) {
        await recordPayment(
          { orgId, sourceType: "pos_sale", sourceId: created.id, details: line },
          client
        );
      }

      for (const item of entry.cartItems) {
        const levelQuery = client
          .from("inventory_stock_levels")
          .select("quantity")
          .eq("product_id", item.productId);

        const { data: level } = entry.warehouseId
          ? await levelQuery.eq("warehouse_id", entry.warehouseId).maybeSingle()
          : await levelQuery.maybeSingle();

        const available = Number(level?.quantity ?? 0);
        if (available < item.quantity) {
          await logActivity(
            {
              icon: "⚠️",
              title: "Offline sale oversold stock",
              sub: `Queued sale needed ${item.quantity}, only ${available} were available when synced. Reconcile with the customer if needed.`,
              org_id: orgId,
            },
            client
          );
        }

        await updateStock(
          item.productId,
          item.quantity,
          "stock_out",
          `POS Sale ${created.id} (synced from offline queue)`,
          entry.warehouseId || undefined,
          client
        );
      }

      await logActivity(
        {
          icon: "🛒",
          title: "POS Sale Completed (synced from offline)",
          sub: `KES ${entry.sale.total.toLocaleString()}`,
          org_id: orgId,
        },
        client
      );

      synced++;
    } catch (err) {
      console.error("Failed to sync queued sale:", err);
      failed++;
      remaining.push(entry);
    }
  }

  writeQueue(remaining);
  syncing = false;
  return { synced, failed };
}
