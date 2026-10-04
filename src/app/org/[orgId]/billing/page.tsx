"use client";

import { Fragment, useEffect, useState } from "react";
import { useEngine } from "@/lib/runtime/EngineContext";
import { canManageTeam } from "@/lib/permissions";
import { getInvoices, type Invoice } from "@/lib/invoices";
import { getReceipts, PAYMENT_METHODS, type Receipt } from "@/lib/receipts";
import { downloadInvoicePdf, downloadReceiptPdf } from "@/lib/billingPdf";
import { getTrialInfo, type TrialInfo } from "@/lib/trial";
import EmptyState from "@/components/EmptyState";

const kes = (n: number) => `KES ${Number(n).toLocaleString("en-KE")}`;
const day = (d: string | null) => (d ? new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }) : "—");
const statusColor: Record<string, string> = { paid: "var(--green)", pending: "var(--amber)", overdue: "var(--red)" };

const cell: React.CSSProperties = { padding: "10px 12px", borderBottom: "1px solid var(--border)", fontSize: 13 };
const head: React.CSSProperties = { ...cell, fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", textAlign: "left" };
const btn: React.CSSProperties = { background: "transparent", color: "var(--text-primary)", border: "1px solid var(--border-light)", borderRadius: 6, padding: "4px 10px", fontSize: 12, cursor: "pointer" };

export default function OrgBillingPage() {
  const { organization, membership } = useEngine();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [trial, setTrial] = useState<TrialInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [claimMethod, setClaimMethod] = useState<string>("M-Pesa");
  const [claimRef, setClaimRef] = useState("");
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimBusy, setClaimBusy] = useState(false);

  const allowed = canManageTeam(membership);

  useEffect(() => {
    if (!allowed) return;
    // RLS limits both lists to this org's rows for owners/admins
    Promise.all([getInvoices(), getReceipts(), getTrialInfo(organization.id)]).then(([inv, rec, t]) => {
      setTrial(t);
      setInvoices(inv.filter(i => i.org_id === organization.id));
      setReceipts(rec.filter(r => r.org_id === organization.id));
      setLoading(false);
    });
  }, [allowed, organization.id]);

  async function submitClaim(invoiceId: string) {
    setClaimBusy(true); setClaimError(null);
    try {
      const res = await fetch("/api/org/claim-payment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orgId: organization.id, invoiceId, method: claimMethod, reference: claimRef }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Could not send your payment details.");
      setInvoices(prev => prev.map(i => i.id === invoiceId ? { ...i, claim_method: claimMethod, claim_reference: claimRef.trim(), claimed_at: new Date().toISOString() } : i));
      setClaiming(null); setClaimRef("");
    } catch (e) { setClaimError(e instanceof Error ? e.message : "Something went wrong."); }
    finally { setClaimBusy(false); }
  }

  if (!allowed) return <EmptyState icon="🔒" message="Only owners and admins can view billing." />;
  if (loading) return <div style={{ padding: 24 }}>Loading...</div>;

  const owing = invoices.filter(i => i.status !== "paid").reduce((n, i) => n + Number(i.amount_kes), 0);

  // The clock the org cares about: trial days left, or the next unpaid invoice's due date
  const dayMs = 24 * 60 * 60 * 1000;
  const nextDue = invoices
    .filter(i => i.status !== "paid" && i.due_date)
    .sort((a, b) => a.due_date.localeCompare(b.due_date))[0];
  const dueIn = nextDue ? Math.ceil((new Date(nextDue.due_date).getTime() - Date.now()) / dayMs) : null;
  const trialOn = !!trial && !trial.packageConfirmedAt && !!trial.trialEndsAt && trial.daysLeft !== null;

  let clock: { text: string; color: string } | null = null;
  if (nextDue && dueIn !== null) {
    clock = dueIn < 0
      ? { text: `${nextDue.invoice_no} (${kes(nextDue.amount_kes)}) is ${Math.abs(dueIn)} day${Math.abs(dueIn) === 1 ? "" : "s"} overdue`, color: "var(--red)" }
      : { text: `Next payment: ${nextDue.invoice_no}, ${kes(nextDue.amount_kes)}, due in ${dueIn} day${dueIn === 1 ? "" : "s"} (${day(nextDue.due_date)})`, color: dueIn <= 3 ? "var(--amber)" : "var(--text-primary)" };
  } else if (trialOn && trial) {
    clock = {
      text: trial.inGracePeriod
        ? `Trial ended. ${trial.daysLeft} day${trial.daysLeft === 1 ? "" : "s"} left to choose your plan.`
        : `Free trial: ${trial.daysLeft} day${trial.daysLeft === 1 ? "" : "s"} left. Ends ${day(trial.trialEndsAt)}.`,
      color: (trial.daysLeft ?? 0) <= 3 ? "var(--amber)" : "var(--text-primary)",
    };
  }

  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>Billing</h1>
      <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 20 }}>
        {owing > 0 ? `${kes(owing)} is outstanding.` : "Nothing outstanding."}
      </p>

      {clock && (
        <div style={{ border: "1px solid var(--border-light)", background: "var(--bg-card)", borderRadius: 8, padding: "12px 14px", marginBottom: 20, fontSize: 13, fontWeight: 600, color: clock.color }}>
          {clock.text}
        </div>
      )}

      {invoices.length === 0 ? (
        <EmptyState icon="🧾" message="No invoices yet." />
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr><th style={head}>Invoice</th><th style={head}>Description</th><th style={head}>Due</th><th style={head}>Status</th><th style={{ ...head, textAlign: "right" }}>Amount</th><th style={head} /></tr>
            </thead>
            <tbody>
              {invoices.map(inv => {
                const receipt = receipts.find(r => r.invoice_id === inv.id);
                return (
                  <Fragment key={inv.id}>
                  <tr>
                    <td style={cell}>{inv.invoice_no}<div style={{ fontSize: 11, color: "var(--text-muted)" }}>{day(inv.created_at)}</div></td>
                    <td style={{ ...cell, color: "var(--text-secondary)" }}>{inv.description}</td>
                    <td style={cell}>{day(inv.due_date)}</td>
                    <td style={{ ...cell, color: statusColor[inv.status], fontWeight: 600, textTransform: "capitalize" }}>{inv.status}</td>
                    <td style={{ ...cell, textAlign: "right" }}>{kes(inv.amount_kes)}</td>
                    <td style={{ ...cell, whiteSpace: "nowrap", textAlign: "right" }}>
                      <button style={btn} onClick={() => downloadInvoicePdf(inv)}>Invoice</button>{" "}
                      {receipt && <button style={btn} onClick={() => downloadReceiptPdf(receipt, inv, organization.name)}>Receipt</button>}
                      {inv.status !== "paid" && (inv.claimed_at
                        ? <span style={{ fontSize: 11, color: "var(--amber)", marginLeft: 6 }}>Payment sent, awaiting confirmation</span>
                        : <button style={{ ...btn, marginLeft: 6, borderColor: "var(--gold)", color: "var(--gold)" }} onClick={() => { setClaiming(claiming === inv.id ? null : inv.id); setClaimError(null); }}>I&apos;ve paid</button>)}
                    </td>
                  </tr>
                  {claiming === inv.id && (
                    <tr>
                      <td colSpan={6} style={{ ...cell, background: "var(--bg-card)" }}>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                          <select value={claimMethod} onChange={e => setClaimMethod(e.target.value)} aria-label="Payment method" style={{ padding: 6, borderRadius: 6, background: "var(--bg-base)", color: "var(--text-primary)", border: "1px solid var(--border-light)" }}>
                            {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
                          </select>
                          <input value={claimRef} onChange={e => setClaimRef(e.target.value)} placeholder="M-Pesa code or bank reference" aria-label="Payment reference" style={{ flex: 1, minWidth: 200, padding: 6, borderRadius: 6, background: "var(--bg-base)", color: "var(--text-primary)", border: "1px solid var(--border-light)" }} />
                          <button style={{ ...btn, background: "var(--gold)", color: "var(--gold-contrast)", borderColor: "var(--gold)" }} disabled={claimBusy || !claimRef.trim()} onClick={() => submitClaim(inv.id)}>{claimBusy ? "Sending…" : "Send"}</button>
                        </div>
                        {claimError && <div style={{ color: "var(--red)", fontSize: 12, marginTop: 6 }} role="alert">{claimError}</div>}
                      </td>
                    </tr>
                  )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 16 }}>
        Pay AUREVYN by M-Pesa or bank transfer, then press "I've paid" with your payment reference. Your receipt appears here once we confirm it.
      </p>
    </div>
  );
}
