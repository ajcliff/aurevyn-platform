import { CommerceRule } from "./rules";

export interface RuleContext {
  subtotal: number;
}

export function evaluateRules(
  rules: CommerceRule[],
  context: RuleContext
) {
  let discount = 0;

  for (const rule of rules) {

    const condition = rule.condition;

    if (
      condition.minimumPurchase &&
      context.subtotal < condition.minimumPurchase
    ) {
      continue;
    }

    const action = rule.action;

    switch (action.type) {

      case "percentage":

        discount +=
          context.subtotal *
          (action.value / 100);

        break;

      case "fixed":

        discount += action.value;

        break;

    }

  }

  return discount;
}