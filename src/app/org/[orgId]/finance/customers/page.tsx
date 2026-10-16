"use client";

import { withAuthorization, ApprovalRequiredError } from "@/lib/auditTrail";
import { useEffect, useState } from "react";
import { useEngine } from "@/lib/runtime/EngineContext";
import { createCustomer, updateCustomer, type Customer } from "@/lib/customers";
import {
  getCreditSummaries,
  getLedger,
  receiveCreditPayment,
  creditErrorMessage,
  type CreditSummary,
  type CreditEntry,
} from "@/lib/customerCredit";
import { getFinanceAccounts, type FinanceAccount } from "@/lib/finance";
import EmptyState from "@/components/EmptyState";

const METHODS = [
  { value: "M-Pesa", type: "mobile_money" },
  { value: "Cash", type: "cash" },
  { value: "Bank transfer", type: "bank" },
];

const kes = (n: number) => `KES ${Math.round(n).toLocaleString()}`;

export default function CreditCustomersPage() {
  const { organization } = useEngine();
  const orgId = organization.id;

  const [rows, setRows] = useState<CreditSummary[]>([]);
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState<"new" | Customer | null>(null);
  const [selected, setSelected] = useState<CreditSummary | null>(null);
  const [ledger, setLedger] = useState<CreditEntry[]>([]);

  async function load() {
    const [r, a] = await Promise.all([getCreditSummaries(orgId), getFinanceAccounts(orgId)]);
    setRows(r);
    setAccounts(a.filter((x) => x.status === "active"));
    setLoading(false);
    return r;
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  async function open(row: CreditSummary) {
    setSelected(row);
    setLedger(await getLedger(row.customer.id!));
  }

  async function refreshOpen(customerId: string) {
    const r = await load();
    const fresh = r.find((x) => x.customer.id === customerId) ?? null;
    setSelected(fresh);
    if (fresh) setLedger(await getLedger(customerId));
  }

  const totalOwed = rows.reduce((t, r) => t + r.balance, 0);
  const totalOverdue = rows.reduce((t, r) => t + r.overdue, 0);
  const q = search.trim().toLowerCase();
  const shown = rows.filter((r) => !q || r.customer.name.toLowerCase().includes(q) || (r.customer.phone ?? "").includes(q));

  if (loading) return <div>Loading credit customers...</div>;

  return (
    <div style={{ overflowY: "auto", height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Credit Customers</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
            Customers you let buy now and pay later. Credit sales from the POS land here.
          </p>
        </div>
        <button style={goldBtn} onClick={() => setShowForm("new")}>+ Add credit customer</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 20 }}>
        <Stat label="Owed to you" value={kes(totalOwed)} />
        <Stat label="Overdue" value={kes(totalOverdue)} color={totalOverdue > 0 ? "#ef4444" : undefined} />
        <Stat label="Credit customers" value={String(rows.length)} />
      </div>

      <div className="card" style={cardStyle}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or phone" style={{ ...inputStyle, width: 260, marginBottom: 12 }} />

        <div style={{ ...rowStyle, gridTemplateColumns: "2fr 1.2fr 1fr 1fr 1fr 1fr", fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>
          <span>Customer</span><span>Phone</span><span style={{ textAlign: "right" }}>Limit</span><span style={{ textAlign: "right" }}>Owes</span><span style={{ textAlign: "right" }}>Available</span><span style={{ textAlign: "right" }}>Status</span>
        </div>

        {shown.map((r) => (
          <div key={r.customer.id} onClick={() => open(r)} style={{ ...rowStyle, gridTemplateColumns: "2fr 1.2fr 1fr 1fr 1fr 1fr", cursor: "pointer" }}>
            <span style={{ fontWeight: 600 }}>{r.customer.name}</span>
            <span style={{ color: "var(--text-muted)" }}>{r.customer.phone || "—"}</span>
            <span style={{ textAlign: "right" }}>{kes(Number(r.customer.credit_limit ?? 0))}</span>
            <span style={{ textAlign: "right", fontWeight: 600, color: r.balance > 0 ? "#ef4444" : undefined }}>{kes(r.balance)}</span>
            <span style={{ textAlign: "right" }}>{kes(r.available)}</span>
            <span style={{ textAlign: "right", fontSize: 12, fontWeight: 600, color: r.overdue > 0 ? "#ef4444" : r.balance > 0 ? "#f59e0b" : "#3dd68c" }}>
              {r.overdue > 0 ? "Overdue" : r.balance > 0 ? "Owing" : "Clear"}
            </span>
          </div>
        ))}

        {shown.length === 0 && <EmptyState icon="🤝" message={rows.length === 0 ? "No credit customers yet. Add one to start selling on credit." : "No match."} />}
      </div>

      {showForm && (
        <CustomerForm
          orgId={orgId}
          existing={showForm === "new" ? null : showForm}
          onClose={() => setShowForm(null)}
          onSaved={async (id) => {
            setShowForm(null);
            if (selected && id === selected.customer.id) await refreshOpen(id);
            else await load();
          }}
        />
      )}

      {selected && (
        <Drawer
          row={selected}
          ledger={ledger}
          accounts={accounts}
          orgId={orgId}
          onClose={() => setSelected(null)}
          onEdit={() => setShowForm(selected.customer)}
          onChanged={() => refreshOpen(selected.customer.id!)}
        />
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="card" style={cardStyle}>
      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4, color }}>{value}</div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block", marginBottom: 10 }}>
      <span style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{label}</span>
      {children}
      {hint && <span style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>{hint}</span>}
    </label>
  );
}

function CustomerForm({ orgId, existing, onClose, onSaved }: { orgId: string; existing: Customer | null; onClose: () => void; onSaved: (id: string) => void }) {
  const [name, setName] = useState(existing?.name ?? "");
  const [phone, setPhone] = useState(existing?.phone ?? "");
  const [email, setEmail] = useState(existing?.email ?? "");
  const [company, setCompany] = useState(existing?.company ?? "");
  const [limit, setLimit] = useState(existing?.credit_limit ? String(existing.credit_limit) : "");
  const [terms, setTerms] = useState(String(existing?.credit_terms_days ?? 30));
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setError("");
    if (!name.trim()) return setError("Enter the customer's name.");
    if (!phone.trim()) return setError("Enter a phone number so you can reach them about payment.");
    if (!(Number(limit) > 0)) return setError("Set a credit limit above 0. It's the most they can owe you at one time.");
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        company: company.trim() || null,
        credit_limit: Number(limit),
        credit_terms_days: Number(terms) || 30,
        notes: notes.trim() || null,
      };
      const limitChanged = !!existing?.id && Number(existing.credit_limit ?? 0) !== payload.credit_limit;
      const saved = existing?.id
        ? await withAuthorization(
            {
              orgId, action: "credit_limit_change", entityType: "customer", entityId: `${existing.id}:${payload.credit_limit}`,
              summary: `${payload.name}: credit limit KES ${Number(existing.credit_limit ?? 0).toLocaleString()} to KES ${payload.credit_limit.toLocaleString()}`,
              amount: payload.credit_limit, requiresApproval: limitChanged,
            },
            () => updateCustomer(existing.id!, payload)
          )
        : await createCustomer({ org_id: orgId, ...payload });
      onSaved(saved.id);
    } catch (e) {
      console.error(e);
      setError(e instanceof ApprovalRequiredError ? e.message : "Could not save the customer.");
      setSaving(false);
    }
  }

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h2 style={{ marginBottom: 14 }}>{existing ? "Edit credit customer" : "Add credit customer"}</h2>
        <Field label="Name *"><input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} autoFocus /></Field>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}><Field label="Phone *"><input style={inputStyle} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07XX XXX XXX" /></Field></div>
          <div style={{ flex: 1 }}><Field label="Email"><input style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} /></Field></div>
        </div>
        <Field label="Business or home area" hint="Helps you recognise two people with the same name"><input style={inputStyle} value={company} onChange={(e) => setCompany(e.target.value)} /></Field>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}><Field label="Credit limit (KES) *" hint="The most they can owe at one time"><input style={inputStyle} type="number" min="0" value={limit} onChange={(e) => setLimit(e.target.value)} /></Field></div>
          <div style={{ flex: 1 }}><Field label="Pays within (days)" hint="Overdue after this"><input style={inputStyle} type="number" min="1" value={terms} onChange={(e) => setTerms(e.target.value)} /></Field></div>
        </div>
        <Field label="Notes"><textarea style={{ ...inputStyle, minHeight: 56 }} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Pays on the 5th, guarantor: Mama Wanjiru" /></Field>
        {error && <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 10 }}>{error}</div>}
        <div style={{ display: "flex", gap: 10 }}>
          <button style={ghostBtn} onClick={onClose}>Cancel</button>
          <button style={{ ...goldBtn, flex: 1 }} onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</button>
        </div>
      </div>
    </div>
  );
}

function Drawer({ row, ledger, accounts, orgId, onClose, onEdit, onChanged }: {
  row: CreditSummary; ledger: CreditEntry[]; accounts: FinanceAccount[]; orgId: string;
  onClose: () => void; onEdit: () => void; onChanged: () => void;
}) {
  const c = row.customer;
  const [paying, setPaying] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState(METHODS[0].value);
  const [accountId, setAccountId] = useState("");
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const wantType = METHODS.find((m) => m.value === method)?.type;
  const matching = accounts.filter((a) => a.type === wantType);

  async function receive() {
    setError("");
    const n = Number(amount);
    if (!(n > 0)) return setError("Enter the amount received.");
    if (n > row.balance) return setError(`They only owe ${kes(row.balance)}.`);
    if (method === "M-Pesa" && !reference.trim()) return setError("Enter the M-Pesa code.");
    setSaving(true);
    try {
      await receiveCreditPayment({
        orgId, customer: c, amount: n, method,
        financeAccountId: accountId || matching[0]?.id,
        reference,
      });
      setPaying(false);
      setAmount("");
      setReference("");
      onChanged();
    } catch (e) {
      setError(creditErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ ...overlayStyle, justifyContent: "flex-end", alignItems: "stretch" }} onClick={onClose}>
      <div style={{ ...modalStyle, width: 460, maxHeight: "100vh", borderRadius: 0, height: "100%" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h2>{c.name}</h2>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {[c.phone, c.email, c.company].filter(Boolean).join(" · ") || "No contact details"}
            </div>
          </div>
          <button style={ghostBtn} onClick={onClose}>Close</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, margin: "16px 0" }}>
          <Mini label="Owes" value={kes(row.balance)} color={row.balance > 0 ? "#ef4444" : undefined} />
          <Mini label="Limit" value={kes(Number(c.credit_limit ?? 0))} />
          <Mini label="Available" value={kes(row.available)} />
        </div>
        {row.overdue > 0 && (
          <div style={{ fontSize: 12, color: "#ef4444", fontWeight: 600, marginBottom: 10 }}>
            {kes(row.overdue)} overdue since {row.oldestDue}
          </div>
        )}
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
          Pays within {c.credit_terms_days ?? 30} days{c.notes ? ` · ${c.notes}` : ""}
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button style={{ ...goldBtn, flex: 1 }} onClick={() => setPaying((v) => !v)} disabled={row.balance <= 0}>Receive payment</button>
          <button style={ghostBtn} onClick={onEdit}>Edit / change limit</button>
        </div>

        {paying && (
          <div style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 14, marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}><Field label="Amount (KES)"><input style={inputStyle} type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={String(Math.round(row.balance))} /></Field></div>
              <div style={{ flex: 1 }}>
                <Field label="Paid by">
                  <select style={inputStyle} value={method} onChange={(e) => { setMethod(e.target.value); setAccountId(""); }}>
                    {METHODS.map((m) => <option key={m.value}>{m.value}</option>)}
                  </select>
                </Field>
              </div>
            </div>
            <Field label="Money went into" hint={matching.length === 0 ? "No matching account set up, so it goes to Unspecified Cash. You can reassign it later." : undefined}>
              <select style={inputStyle} value={accountId || matching[0]?.id || ""} onChange={(e) => setAccountId(e.target.value)} disabled={matching.length === 0}>
                {matching.length === 0 ? <option>Unspecified Cash</option> : matching.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </Field>
            {method !== "Cash" && (
              <Field label={method === "M-Pesa" ? "M-Pesa code *" : "Bank reference"}>
                <input style={inputStyle} value={reference} onChange={(e) => setReference(e.target.value)} />
              </Field>
            )}
            {error && <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 8 }}>{error}</div>}
            <button style={{ ...goldBtn, width: "100%" }} onClick={receive} disabled={saving}>{saving ? "Saving..." : "Record payment"}</button>
          </div>
        )}

        <h3 style={{ fontSize: 13, marginBottom: 8 }}>History</h3>
        {ledger.length === 0 && <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Nothing yet.</div>}
        {ledger.map((e) => (
          <div key={e.id} style={{ ...rowStyle, gridTemplateColumns: "1fr auto", gap: 4 }}>
            <div>
              <div style={{ fontWeight: 600 }}>{e.entry_type === "sale" ? "Sale on credit" : `Payment · ${e.method ?? ""}`}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                {new Date(e.created_at).toLocaleDateString()}
                {e.entry_type === "sale" && e.due_date ? ` · due ${e.due_date}` : ""}
                {e.reference ? ` · ${e.reference}` : ""}
              </div>
            </div>
            <div style={{ fontWeight: 700, color: e.entry_type === "sale" ? "#ef4444" : "#3dd68c" }}>
              {e.entry_type === "sale" ? "+" : "−"}{kes(e.amount)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Mini({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "8px 10px" }}>
      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

const cardStyle: React.CSSProperties = { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: 20 };
const rowStyle: React.CSSProperties = { display: "grid", padding: "10px 0", borderBottom: "1px solid var(--border)", fontSize: 13, alignItems: "center", gap: 8 };
const inputStyle: React.CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-base)", color: "var(--text-primary)", fontSize: 13 };
const goldBtn: React.CSSProperties = { background: "var(--gold)", color: "var(--gold-contrast)", border: "none", borderRadius: 10, padding: "8px 16px", fontWeight: 700, fontSize: 12, cursor: "pointer" };
const ghostBtn: React.CSSProperties = { padding: "8px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 12, cursor: "pointer" };
const overlayStyle: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999 };
const modalStyle: React.CSSProperties = { width: 480, maxWidth: "94vw", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 24, maxHeight: "90vh", overflowY: "auto" };
