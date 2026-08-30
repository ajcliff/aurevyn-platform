import { calculatePricing } from "./pricing";
import { calculateDiscounts } from "./discounts";
import { calculatePromotions } from "./promotions";
import { evaluateRules } from "./rulesEngine";
import { calculateTax } from "./tax";
import { getCommerceRules } from "./getRules";

export interface CheckoutItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface CheckoutResult {
  subtotal: number;
  discount: number;
 promotion: number;
  tax: number;
  total: number;
}

export async function calculateCheckout(
  orgId: string,
  items: CheckoutItem[]
): Promise<CheckoutResult> {
  // Step 1 - Base pricing
  const pricing = calculatePricing(items);
const rules =
  await getCommerceRules(orgId);

const ruleResult =
    await evaluateRules(
        rules,
        {
            items,
        }
    );
  // Step 2 - Discounts
  const discount = await calculateDiscounts(items);

  // Step 3 - Promotions
  const promotion = await calculatePromotions(items);

  // Step 4 - Calculate subtotal after adjustments
  const subtotal = pricing.subtotal;

const discountedTotal =
    subtotal -
    discount.amount -
    promotion.amount -
    ruleResult.discount -
    ruleResult.promotion;

  // Step 5 - Tax
const tax =
    await calculateTax(
        discountedTotal +
        ruleResult.taxAdjustment
    );

  // Step 6 - Final total
  const total =
    discountedTotal +
    tax.amount;

  return {
    subtotal,
    discount:
    discount.amount +
    ruleResult.discount,
    promotion:
    promotion.amount +
    ruleResult.promotion,
    tax: tax.amount,
    total,
  };
}