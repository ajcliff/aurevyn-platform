"use client";

import { useEffect, useState } from "react";
import s from "@/styles/layout.module.css";
import { CommerceRule } from "@/lib/commerceRules";
import ConditionBuilder, {
  RuleCondition,
} from "@/components/commerce/ConditionBuilder";

import ActionBuilder, {
  RuleAction,
} from "@/components/commerce/ActionBuilder";


type Props = {
  rule: CommerceRule | null;
  onSave: (rule: Partial<CommerceRule>) => Promise<void>;
  onDelete: () => Promise<void>;
  onClose: () => void;
};

export default function RuleEditor({
  rule,
  onSave,
  onDelete,
  onClose,
}: Props){
  const [name, setName] = useState("");
  const [type, setType] = useState("discount");
  const [priority, setPriority] = useState(1);
  const [enabled, setEnabled] = useState(true);
const [condition, setCondition] =
  useState<RuleCondition>({
    field: "subtotal",
    operator: ">",
    value: "",
  });

const [action, setAction] =
  useState<RuleAction>({
    type: "discount",
    amount: 0,
  });


  useEffect(() => {
    if (!rule) return;

    setName(rule.name);
    setType(rule.type);
    setPriority(rule.priority);
    setEnabled(rule.enabled);
    setCondition(
  (rule.conditions as RuleCondition) ?? {
    field: "subtotal",
    operator: ">",
    value: "",
  }
);

setAction(
  (rule.actions as RuleAction) ?? {
    type: "discount",
    amount: 0,
  }
);
  }, [rule]);

  async function save() {
await onSave({
  name,
  type,
  priority,
  enabled,
  conditions: condition,
  actions: action,
});

    onClose();
  }

  return (
    <div className={s.card}>
      <h2>Edit Rule</h2>

      <input
        className={s.input}
        placeholder="Rule Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <select
        className={s.input}
        value={type}
        onChange={(e) => setType(e.target.value)}
      >
        <option value="discount">Discount</option>
        <option value="promotion">Promotion</option>
        <option value="pricing">Pricing</option>
        <option value="tax">Tax</option>
      </select>

      <input
        className={s.input}
        type="number"
        value={priority}
        onChange={(e) =>
          setPriority(Number(e.target.value))
        }
      />

      <label
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
        }}
      >
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) =>
            setEnabled(e.target.checked)
          }
        />

        Enabled
      </label>

      <div
        style={{
          display: "flex",
          gap: 10,
          marginTop: 20,
        }}
      >

<h3 style={{ marginTop: 24 }}>
  IF
</h3>

<ConditionBuilder
  value={condition}
  onChange={setCondition}
/>

<h3 style={{ marginTop: 24 }}>
  THEN
</h3>

<ActionBuilder
  value={action}
  onChange={setAction}
/>

        <button
          className={s.btnGold}
          onClick={save}
        >
          Save
        </button>

        <button
          className={s.btnGhost}
          onClick={onClose}
        >
          Cancel
        </button>
        <button
  className={s.btnGhost}
  onClick={onDelete}
>
  Delete
</button>
      </div>
    </div>
  );
}