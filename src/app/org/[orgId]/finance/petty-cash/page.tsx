"use client";

import { useCallback, useEffect, useState } from "react";
import { useEngine } from "@/lib/runtime/EngineContext";
import { getFinanceAccounts, type FinanceAccount } from "@/lib/finance";
import {
  getPettyFloats, createPettyFloat, getPettyEntries, getFloatBalance, topUpFloat, spendFromFloat,
  PETTY_CATEGORIES, PETTY_CASH_CATEGORY, type PettyEntry,
} from "@/lib/pettyCash";
import EmptyState from "@/components/EmptyState";

const kes = (n: number) => `KES ${Math.round(n).toLocaleString()}`;

const input: React.CSSProperties = {
  width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)",
  background: "var(--bg-base)", color: "var(--text-primary)", fontSize: 13,
};
const gold: React.CSSProperties = {
  background: "var(--gold)", color: "var(--gold-contrast)", border: "none", borderRadius: 8,
  padding: "8px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer",
};
const ghost: React.CSSProperties = {
  background: "transparent", color: "var(--text-primary)", border: "1px solid var(--border)", borderRadius: 8,
  padding: "8px 14px", fontWeight: 600, fontSize: 12, cursor: "pointer",
};

export default function PettyCashPage() {
  const { organization } = useEngine();
  const orgId = organization.id;

  const [floats, setFloats] = useState<FinanceAccount[]>([]);
  const [sources, setSources] = useState<FinanceAccount[]>([]);
  const [floatId, setFloatId] = useState("");
  const [balance, setBalance] = useState(0);
  const [entries, setEntries] = useState<PettyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"none" | "topup" | "spend" | "new">("none");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [newName, setNewName] = useState("Petty cash");
  const [amount, setAmount] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [category, setCategory] = useState<string>("transport");
  const [payee, setPayee] = useState("");
  const [description, setDescription] = useState("");
  const [receipt, setReceipt] = useState("");

  const loadFloat = useCallback(async (id: string) => {
    const [bal, list] = await Promise.all([getFloatBalance(orgId, id), getPettyEntries(id)]);
    setBalance(bal);
    setEntries(list);
  }, [orgId]);

  const load = useCallback(async () => {
    setLoading(true);
    const [f, accounts] = await Promise.all([getPettyFloats(orgId), getFinanceAccounts(orgId)]);
    setFloats(f);
    setSources(accounts.filter((a) => a.status === "active" && a.category !== PETTY_CASH_CATEGORY));
    const id = f.find((x) => x.id === floatId)?.id ?? f[0]?.id ?? "";
    setFloatId(id);
    if (id) await loadFloat(id);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, loadFloat]);

  useEffect(() => {
    load();
  }, [load]);

  function reset() {
    setMode("none"); setAmount(""); setPayee(""); setDescription(""); setReceipt(""); setError("");
  }

  async function submit() {
    setError("");
    const n = Number(amount);
    if (mode === "new") {
      if (!newName.trim()) return setError("Give the float a name.");
    } else if (!(n > 0)) {
      return setError("Enter an amount greater than zero.");
    }
    if (mode === "topup" && !sourceId) return setError("Pick the account the cash comes from.");
    if (mode === "spend" && !description.trim()) return setError("Say what it was spent on.");

    setSaving(true);
    try {
      if (mode === "new") {
        const created = await createPettyFloat(orgId, newName);
        if (!created) throw new Error("Could not create the float.");
        setFloatId(created.id);
      } else if (mode === "topup") {
        await topUpFloat({ orgId, floatId, sourceAccountId: sourceId, amount: n, recordedBy: "AUREVYN" });
      } else if (mode === "spend") {
        await spendFromFloat({ orgId, floatId, amount: n, category, payee, description, receiptRef: receipt, recordedBy: "AUREVYN" });
      }
      reset();
      await load();
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? "";
      setError(msg.includes("INSUFFICIENT_FLOAT") ? msg.replace("INSUFFICIENT_FLOAT: ", "Not enough in the float: ") : msg || "Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const spentToday = entries
    .filter((e) => e.entry_type === "spend" && e.created_at.slice(0, 10) === new Date().toISOString().slice(0, 10))
    .reduce((t, e) => t + e.amount, 0);
  const sourceName = (id: string | null) => sources.find((s) => s.id === id)?.name ?? "";

  return (
    <div style={{ padding: 24, overflowY: "auto", height: "100%" }}>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>Petty Cash</h1>
      <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20, maxWidth: 640 }}>
        A small cash float for everyday costs like transport, airtime and tea. Top it up from a bank or M-Pesa account, then record each spend with what it was for. Every entry posts to your books.
      </p>

      {loading ? (
        "Loading..."
      ) : floats.length === 0 && mode !== "new" ? (
        <div style={{ maxWidth: 480 }}>
          <EmptyState icon="👛" message="No petty cash float yet." />
          <button style={{ ...gold, marginTop: 12 }} onClick={() => setMode("new")}>Create a float</button>
        </div>
      ) : (
        <>
          {floats.length > 0 && (
            <div style={{ display: "flex", gap: 12, alignItems: "stretch", flexWrap: "wrap", marginBottom: 18 }}>
              <div style={{ border: "1px solid var(--border)", background: "var(--bg-card)", borderRadius: 12, padding: "14px 18px", minWidth: 220 }}>
                {floats.length > 1 ? (
                  <select value={floatId} onChange={(e) => { setFloatId(e.target.value); loadFloat(e.target.value); }} style={{ ...input, marginBottom: 8 }}>
                    {floats.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                ) : (
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{floats[0].name}</div>
                )}
                <div style={{ fontSize: 24, fontWeight: 700, color: balance > 0 ? "#3dd68c" : "var(--text-primary)" }}>{kes(balance)}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>in the float · spent today {kes(spentToday)}</div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button style={gold} onClick={() => setMode("spend")}>− Record spend</button>
                <button style={ghost} onClick={() => setMode("topup")}>+ Top up</button>
                <button style={ghost} onClick={() => setMode("new")}>New float</button>
              </div>
            </div>
          )}

          {mode !== "none" && (
            <div style={{ border: "1px solid var(--border)", background: "var(--bg-card)", borderRadius: 12, padding: 16, marginBottom: 18, maxWidth: 520 }}>
              <div style={{ fontWeight: 700, marginBottom: 10 }}>
                {mode === "new" ? "New petty cash float" : mode === "topup" ? "Top up the float" : "Record a spend"}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {mode === "new" && <input style={input} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Float name, e.g. Shop petty cash" />}
                {mode !== "new" && (
                  <input style={input} type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount (KES) *" autoFocus />
                )}
                {mode === "topup" && (
                  <select style={input} value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
                    <option value="">Take the cash from… *</option>
                    {sources.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                )}
                {mode === "spend" && (
                  <>
                    <div style={{ display: "flex", gap: 8 }}>
                      <select style={input} value={category} onChange={(e) => setCategory(e.target.value)}>
                        {PETTY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <input style={input} value={payee} onChange={(e) => setPayee(e.target.value)} placeholder="Paid to (optional)" />
                    </div>
                    <input style={input} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What was it for? *" />
                    <input style={input} value={receipt} onChange={(e) => setReceipt(e.target.value)} placeholder="Receipt number (optional)" />
                    {Number(amount) > balance && Number(amount) > 0 && (
                      <div style={{ fontSize: 12, color: "#ef4444" }}>More than the {kes(balance)} in the float. Top it up first.</div>
                    )}
                  </>
                )}
              </div>
              {error && <div style={{ color: "#ef4444", fontSize: 12, marginTop: 8 }}>{error}</div>}
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button style={ghost} onClick={reset}>Cancel</button>
                <button style={gold} onClick={submit} disabled={saving || (mode === "spend" && Number(amount) > balance)}>
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          )}

          {floats.length > 0 && (
            entries.length === 0 ? (
              <EmptyState icon="🧾" message="No petty cash activity yet. Top up the float to get started." />
            ) : (
              <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", background: "var(--bg-card)" }}>
                {entries.map((e) => (
                  <div key={e.id} style={{ display: "grid", gridTemplateColumns: "90px 90px 1fr auto", gap: 12, padding: "10px 14px", borderBottom: "1px solid var(--border)", fontSize: 13, alignItems: "center" }}>
                    <span style={{ color: "var(--text-muted)" }}>{e.created_at.slice(0, 10)}</span>
                    <span style={{ textTransform: "capitalize", color: "var(--text-muted)" }}>{e.entry_type === "topup" ? "Top-up" : e.category}</span>
                    <span>
                      {e.description}
                      {e.entry_type === "topup" && sourceName(e.source_account_id) ? ` · from ${sourceName(e.source_account_id)}` : ""}
                      {e.payee ? ` · ${e.payee}` : ""}
                      {e.receipt_ref ? ` · #${e.receipt_ref}` : ""}
                    </span>
                    <span style={{ fontWeight: 700, color: e.entry_type === "topup" ? "#3dd68c" : "#ef4444" }}>
                      {e.entry_type === "topup" ? "+" : "−"}{kes(e.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}
