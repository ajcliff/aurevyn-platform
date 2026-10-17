"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

type Step = { key: string; title: string; hint: string; href: string; done: boolean; needs?: string };

// A first-week checklist for new organizations. Each step ticks itself off from real data, and the whole card
// disappears once everything is done (or when the owner dismisses it).
export default function SetupChecklist({ orgId, hasEngine, isOwnerOrAdmin }: {
  orgId: string; hasEngine: (slug: string) => boolean; isOwnerOrAdmin: boolean;
}) {
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [hidden, setHidden] = useState(true);
  const storeKey = `aurevyn-setup-dismissed:${orgId}`;

  useEffect(() => {
    try { setHidden(localStorage.getItem(storeKey) === "1"); } catch { setHidden(false); }
    const supabase = createClient();
    const count = async (table: string, extra?: (q: ReturnType<typeof base>) => ReturnType<typeof base>) => {
      const q = extra ? extra(base(table)) : base(table);
      const { count: c } = await q;
      return c ?? 0;
    };
    function base(table: string) {
      return supabase.from(table).select("id", { count: "exact", head: true }).eq("org_id", orgId);
    }
    (async () => {
      const [products, accounts, sales, members] = await Promise.all([
        count("inventory_products"), count("finance_accounts"), count("pos_sales"), count("org_users"),
      ]);
      setSteps([
        { key: "products", title: "Add your products", hint: "Names, prices and how many you have.", href: `/org/${orgId}/inventory`, done: products > 0, needs: "inventory" },
        { key: "account", title: "Add a cash or M-Pesa account", hint: "So every sale and expense has somewhere to land.", href: `/org/${orgId}/finance`, done: accounts > 0, needs: "finance" },
        { key: "sale", title: "Make your first sale", hint: "Open the till and ring up an item.", href: `/org/${orgId}/pos`, done: sales > 0, needs: "pos" },
        { key: "team", title: "Invite your team", hint: "Create accounts and choose what each person can use.", href: `/org/${orgId}/users`, done: members > 1 },
      ]);
    })();
  }, [orgId, storeKey]);

  if (!steps || hidden) return null;
  const relevant = steps.filter((s) => (!s.needs || hasEngine(s.needs)) && (s.key !== "team" || isOwnerOrAdmin));
  if (relevant.length === 0 || relevant.every((s) => s.done)) return null;
  const doneCount = relevant.filter((s) => s.done).length;

  return (
    <section aria-label="Setup checklist" style={{ border: "1px solid var(--gold)", background: "var(--bg-card)", borderRadius: 14, padding: 18, marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Get set up: {doneCount} of {relevant.length} done</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>These tick off by themselves as you work.</div>
        </div>
        <button
          onClick={() => { try { localStorage.setItem(storeKey, "1"); } catch { /* ignore */ } setHidden(true); }}
          style={{ background: "transparent", border: "none", color: "var(--text-muted)", fontSize: 12, cursor: "pointer" }}
        >
          Hide
        </button>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: "var(--bg-base)", margin: "12px 0" }}>
        <div style={{ height: 6, borderRadius: 3, background: "var(--gold)", width: `${(doneCount / relevant.length) * 100}%`, transition: "width .3s" }} />
      </div>
      {relevant.map((s) => (
        <Link key={s.key} href={s.href} style={{ display: "flex", gap: 10, alignItems: "center", padding: "9px 0", borderTop: "1px solid var(--border)", textDecoration: "none", color: "inherit" }}>
          <span aria-hidden="true" style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${s.done ? "#3dd68c" : "var(--border-light)"}`, background: s.done ? "#3dd68c" : "transparent", color: "#000", fontSize: 12, display: "grid", placeItems: "center", flexShrink: 0 }}>{s.done ? "✓" : ""}</span>
          <span style={{ flex: 1 }}>
            <span style={{ fontWeight: 600, fontSize: 13, textDecoration: s.done ? "line-through" : "none", opacity: s.done ? 0.6 : 1 }}>{s.title}</span>
            {!s.done && <span style={{ display: "block", fontSize: 12, color: "var(--text-muted)" }}>{s.hint}</span>}
          </span>
          {!s.done && <span style={{ fontSize: 12, color: "var(--gold)", fontWeight: 600 }}>Start →</span>}
        </Link>
      ))}
    </section>
  );
}
