"use client";

import s from "@/styles/layout.module.css";

export interface RuleAction {
  type: string;

  amount: number;
}

type Props = {
  value: RuleAction;

  onChange: (
    action: RuleAction
  ) => void;
};

export default function ActionBuilder({
  value,
  onChange,
}: Props) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "1fr 120px",
        gap: 12,
      }}
    >
      <select
        className={s.input}
        value={value.type}
        onChange={(e) =>
          onChange({
            ...value,
            type: e.target.value,
          })
        }
      >
        <option value="discount">
          Discount %
        </option>

        <option value="fixed">
          Fixed Amount
        </option>

        <option value="free_shipping">
          Free Shipping
        </option>

        <option value="tax">
          Tax Override
        </option>
      </select>

      <input
        type="number"
        className={s.input}
        value={value.amount}
        onChange={(e) =>
          onChange({
            ...value,
            amount: Number(
              e.target.value
            ),
          })
        }
      />
    </div>
  );
}