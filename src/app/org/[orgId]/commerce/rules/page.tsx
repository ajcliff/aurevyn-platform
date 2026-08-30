"use client";

import { useEffect, useState } from "react";
import { getCurrentOrg } from "@/lib/runtime/currentOrg";

import {
  CommerceRule,
  getRules,
  updateRule,
} from "@/lib/commerceRules";

import RulesTable from "@/components/commerce/RulesTable";
import RuleEditor from "@/components/commerce/RuleEditor";

import s from "@/styles/layout.module.css";

export default function CommerceRulesPage() {
  const [orgId, setOrgId] = useState("");

  const [rules, setRules] = useState<CommerceRule[]>([]);

  const [selectedRule, setSelectedRule] =
    useState<CommerceRule | null>(null);

  async function load() {
    const org = await getCurrentOrg();

    if (!org) return;

    setOrgId(org.id);

    const data = await getRules(org.id);

    setRules(data);
  }

  useEffect(() => {
    void load();
  }, []);

  async function saveRule(
    updates: Partial<CommerceRule>
  ) {
    if (!selectedRule) return;

    await updateRule(
      selectedRule.id,
      updates
    );

    await load();
  }
async function removeRule() {
  if (!selectedRule) return;

  if (!confirm("Delete this rule?")) {
    return;
  }

  await deleteRule(selectedRule.id);

  setSelectedRule(null);

  await load();
}
async function newRule() {
  if (!orgId) return;

  await createRule({
    org_id: orgId,
    name: "New Rule",
    type: "discount",
    priority: rules.length + 1,
    enabled: true,
    conditions: {},
    actions: {},
  });

  await load();
}


  return (
    <div className="page-shell">

      <main className="page-main">

       <div
  className={s.pageHeader}
  style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  }}
>
          <h1 className={s.pageTitle}>
            Commerce Rules
          </h1>
<button
  className={s.btnGold}
  onClick={newRule}
>
  + New Rule
</button>
          <p className={s.pageSub}>
            Configure pricing, discounts,
            promotions and tax rules.
          </p>
        </div>

        <RulesTable
          rules={rules}
          onSelect={setSelectedRule}
        />

        {selectedRule && (
          <div
            style={{
              marginTop: 24,
            }}
          >
            <RuleEditor
              rule={selectedRule}
              onSave={saveRule}
              onClose={() =>
                setSelectedRule(null)
              }
            />
          </div>
        )}

      </main>

    </div>
  );
}