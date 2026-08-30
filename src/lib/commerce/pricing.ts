import { CheckoutItem } from "./checkout";

export interface PricingResult {
  subtotal: number;
}

export function calculatePricing(
  items: CheckoutItem[]
): PricingResult {
  const subtotal = items.reduce(
    (sum, item) =>
      sum + item.quantity * item.unitPrice,
    0
  );

  return {
    subtotal,
  };
}