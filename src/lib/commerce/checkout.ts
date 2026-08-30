import {
  calculateCheckout,
  CheckoutItem,
  CheckoutResult,
} from "./engine";

export async function processCheckout(
  items: CheckoutItem[]
): Promise<CheckoutResult> {
  return calculateCheckout(items);
}