"use client";

import s from "@/styles/layout.module.css";

export interface RuleCondition {
  field: string;
  operator: string;
  value: string;
}

type Props = {
  value: RuleCondition;
  onChange: (condition: RuleCondition) => void;
};

export default function ConditionBuilder({
  value,
  onChange,
}: Props) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 140px 1fr",
        gap: 12,
      }}
    >
      <select
        className={s.input}
        value={value.field}
        onChange={(e) =>
          onChange({
            ...value,
            field: e.target.value,
          })
        }
      >
        <option value="subtotal">Order Total</option>

        <option value="customerTier">
          Customer Tier
        </option>

        <option value="paymentMethod">
          Payment Method
        </option>

        <option value="branch">
          Branch
        </option>

        <option value="day">
          Day of Week
        </option>
      </select>

      <select
        className={s.input}
        value={value.operator}
        onChange={(e) =>
          onChange({
            ...value,
            operator: e.target.value,
          })
        }
      >
        <option value=">">{">"}</option>

        <option value="<">{"<"}</option>

        <option value="=">{"="}</option>

        <option value="contains">
          Contains
        </option>
      </select>

      <input
        className={s.input}
        value={value.value}
        onChange={(e) =>
          onChange({
            ...value,
            value: e.target.value,
          })
        }
      />
    </div>
  );
}