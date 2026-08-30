import { CheckoutItem } from "./checkout";

export interface DiscountResult {
  amount: number;
}

export async function calculateDiscounts(
  items: CheckoutItem[]
): Promise<DiscountResult> {

  return {
    amount: 0,
  };

}