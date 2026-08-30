export interface CommerceRule {
  id: string;

  name: string;

  priority: number;

  enabled: boolean;

  type:
    | "discount"
    | "promotion"
    | "pricing"
    | "tax";

  conditions: Record<string, unknown>;

  actions: Record<string, unknown>;
}

export interface RuleResult {
  discount: number;
  promotion: number;
  taxAdjustment: number;
}

export async function evaluateRules(
  rules: CommerceRule[],
  context: Record<string, unknown>
): Promise<RuleResult> {

  const result: RuleResult = {
    discount: 0,
    promotion: 0,
    taxAdjustment: 0,
  };

  for (const rule of rules) {

    if (!rule.enabled) continue;

    switch (rule.type) {

      case "discount":
        result.discount += Number(
          rule.actions.amount ?? 0
        );
        break;

      case "promotion":
        result.promotion += Number(
          rule.actions.amount ?? 0
        );
        break;

      case "tax":
        result.taxAdjustment += Number(
          rule.actions.amount ?? 0
        );
        break;
    }
  }

  return result;
}