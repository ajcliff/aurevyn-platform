"use client";

import { useEffect, useState } from "react";
import { useEngine } from "@/lib/runtime/EngineContext";
import {
  getFinanceAccounts,
  getFinanceTransactions,
  createAccount,
  createTransactionLogged,
  type FinanceAccount,
  type FinanceTransaction,
} from "@/lib/finance";
import { exportToCSV } from "@/lib/csvExport";
import PaymentMethodForm from "@/components/payments/PaymentMethodForm";
import { recordPayment, methodLabel, type PaymentDetailsInput } from "@/lib/payments";

import { getChartOfAccounts, getCostCenters, type ChartAccount, type CostCenter } from "@/lib/chartOfAccounts";
import EmptyState from "@/components/EmptyState";

const ACCOUNT_TYPES = [
  { value: "bank", label: "Bank Account" },
  { value: "cash", label: "Cash in Hand" },
  { value: "mobile_money", label: "Mobile Money" },
];

const TX_CATEGORIES = ["sales", "supplies", "rent", "salaries", "utilities", "transport", "other"];

export default function FinancePage() {
  const { organization } = useEngine();

  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [txFilter, setTxFilter] = useState<"all" | "income" | "expense">("all");

  const [showNewAccount, setShowNewAccount] = useState(false);
  const [accName, setAccName] = useState("");
  const [accType, setAccType] = useState("bank");
  const [accBalance, setAccBalance] = useState("");

  const [showNewTx, setShowNewTx] = useState(false);
  const [txType, setTxType] = useState<"income" | "expense">("income");
  const [txAmount, setTxAmount] = useState("");
  const [txDescription, setTxDescription] = useState("");
  const [txCategory, setTxCategory] = useState("sales");

const [txPaymentDetails, setTxPaymentDetails] = useState<PaymentDetailsInput | null>(null);

  const [txDate, setTxDate] = useState(new Date().toISOString().slice(0, 10));
  const [txAccountId, setTxAccountId] = useState("");
  const [saving, setSaving] = useState(false);
  const [chartAccounts, setChartAccounts] = useState<ChartAccount[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [txCoaId, setTxCoaId] = useState("");
  const [txCostCenterId, setTxCostCenterId] = useState("");

  useEffect(() => {
    load();
  }, []);

async function load() {
    setLoading(true);
    const [a, t, coa, cc] = await Promise.all([
      getFinanceAccounts(organization.id),
      getFinanceTransactions(organization.id),
      getChartOfAccounts(organization.id),
      getCostCenters(organization.id),
    ]);
    setAccounts(a);
    setTransactions(t);
    setChartAccounts(coa);
    setCostCenters(cc);
    setLoading(false);
  }

  const totalIncome = transactions.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const totalExpenses = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const netPosition = totalIncome - totalExpenses;
  const totalCashPosition = accounts.reduce((s, a) => s + Number(a.balance), 0);

  const bankers = accounts.filter((a) => a.type === "bank" || a.type === "mobile_money");
  const cashInHand = accounts.filter((a) => a.type === "cash");

  const filteredTx = transactions.filter((t) => txFilter === "all" || t.type === txFilter);

  async function handleCreateAccount() {
    if (!accName.trim()) return;
    await createAccount({
      org_id: organization.id,
      name: accName,
      type: accType,
      category: accType === "cash" ? "Cash in Hand" : "Banker",
      balance: Number(accBalance) || 0,
      currency: "KES",
    });
    setAccName("");
    setAccType("bank");
    setAccBalance("");
    setShowNewAccount(false);
    load();
  }

 async function handleCreateTx() {
    if (!txAmount || !txDescription.trim()) return;
    if (!txPaymentDetails) {
      alert("Complete the payment details before recording this transaction");
      return;
    }

    try {
      setSaving(true);

      const reference =
        txPaymentDetails.mpesaCode ||
        txPaymentDetails.bankReference ||
        txPaymentDetails.chequeNumber ||
        (txPaymentDetails.cardLast4 ? `Card ending ${txPaymentDetails.cardLast4}` : "");

      const created = await createTransactionLogged({
        org_id: organization.id,
        account_id: txAccountId || null,
        type: txType,
        amount: Number(txAmount),
        currency: "KES",
        description: txDescription,
        category: txCategory,
        reference,
        payment_method: methodLabel(txPaymentDetails.method),
        status: "completed",
        date: txDate,
        coa_id: txCoaId || null,
        cost_center_id: txCostCenterId || null,
      });

      if (created) {
        await recordPayment({
          orgId: organization.id,
          sourceType: "finance_transaction",
          sourceId: created.id,
          details: { ...txPaymentDetails, amount: Number(txAmount) },
        });
      }

      setTxAmount("");
      setTxDescription("");
      setTxPaymentDetails(null);
      setTxCoaId("");
      setTxCostCenterId("");
      setShowNewTx(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  function handleExportTransactions() {
    exportToCSV(
      `finance-transactions-${organization.id}-${new Date().toISOString().slice(0, 10)}.csv`,
      filteredTx.map((t) => ({
        Date: t.date,
        Type: t.type,
        Description: t.description,
        Category: t.category,
        "Amount (KES)": t.amount,
        "Payment Method": t.payment_method,
        Reference: t.reference,
        Status: t.status,
      }))
    );
  }

  if (loading) return <div>Loading finance...</div>;

  return (
    <div style={{ overflowY: "auto", height: "100%" }}>
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Finance</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
            Accounts, transactions, and cash position for {organization.name}.
          </p>
        </div>
      <div style={{ display: "flex", gap: 10 }}>
          <a href={`/org/${organization.id}/finance/invoices`} style={ghostButton}>
            View Invoices →
          </a>
          <a href={`/org/${organization.id}/finance/chart-of-accounts`} style={ghostButton}>
            Chart of Accounts →
          </a>
          <a href={`/org/${organization.id}/finance/reports/profit-loss`} style={ghostButton}>
            Profit & Loss →
          </a>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 20 }}>
        <div className="card" style={cardStyle}>
          <div style={labelSmall}>Total Income</div>
          <div style={{ ...valueStyle, color: "#3dd68c" }}>KES {totalIncome.toLocaleString()}</div>
        </div>
        <div className="card" style={cardStyle}>
          <div style={labelSmall}>Total Expenses</div>
          <div style={{ ...valueStyle, color: "#ef4444" }}>KES {totalExpenses.toLocaleString()}</div>
        </div>
        <div className="card" style={cardStyle}>
          <div style={labelSmall}>Net Position</div>
          <div style={{ ...valueStyle, color: netPosition >= 0 ? "#3dd68c" : "#ef4444" }}>
            KES {netPosition.toLocaleString()}
          </div>
        </div>
        <div className="card" style={cardStyle}>
          <div style={labelSmall}>Cash Position (All Accounts)</div>
          <div style={valueStyle}>KES {totalCashPosition.toLocaleString()}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <div className="card" style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3>Bankers</h3>
            <button style={ghostButton} onClick={() => setShowNewAccount(true)}>+ Account</button>
          </div>
          {bankers.map((a) => (
            <div key={a.id} style={rowStyle}>
              <span>{a.name}</span>
              <span style={{ fontWeight: 600 }}>KES {Number(a.balance).toLocaleString()}</span>
            </div>
          ))}
{bankers.length === 0 && <EmptyState icon="🏦" message="No bank/mobile money accounts yet." />}        </div>

        <div className="card" style={cardStyle}>
          <h3 style={{ marginBottom: 12 }}>Cash in Hand</h3>
          {cashInHand.map((a) => (
            <div key={a.id} style={rowStyle}>
              <span>{a.name}</span>
              <span style={{ fontWeight: 600 }}>KES {Number(a.balance).toLocaleString()}</span>
            </div>
          ))}
{cashInHand.length === 0 && <EmptyState icon="💵" message="No cash accounts recorded yet." />}        </div>
      </div>

      <div className="card" style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
          <h3>Transactions</h3>
          <div style={{ display: "flex", gap: 8 }}>
            <select value={txFilter} onChange={(e) => setTxFilter(e.target.value as any)} style={selectStyle}>
              <option value="all">All</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
            <button style={ghostButton} onClick={handleExportTransactions}>Export CSV</button>
            <button style={buttonGold} onClick={() => setShowNewTx(true)}>+ Transaction</button>
          </div>
        </div>

        {filteredTx.map((t) => (
          <div key={t.id} style={{ ...rowStyle, gridTemplateColumns: "1fr 1.5fr 1fr 1fr" }}>
            <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{t.date}</span>
            <span>{t.description}</span>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{t.reference || "—"}</span>
            <span style={{ fontWeight: 600, color: t.type === "income" ? "#3dd68c" : "#ef4444", textAlign: "right" }}>
              {t.type === "income" ? "+" : "-"}KES {Number(t.amount).toLocaleString()}
            </span>
          </div>
        ))}

{filteredTx.length === 0 && <EmptyState icon="💳" message="No transactions yet." />}      </div>

      {showNewAccount && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h2 style={{ marginBottom: 16 }}>New Account</h2>

            <label style={labelStyle}>Account Name</label>
            <input placeholder="e.g. Equity Bank - Business" value={accName} onChange={(e) => setAccName(e.target.value)} style={inputStyle} />

            <label style={labelStyle}>Account Type</label>
            <select value={accType} onChange={(e) => setAccType(e.target.value)} style={inputStyle}>
              {ACCOUNT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>

            <label style={labelStyle}>Opening Balance (KES)</label>
            <input type="number" placeholder="0" value={accBalance} onChange={(e) => setAccBalance(e.target.value)} style={inputStyle} />

            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              <button style={ghostButton} onClick={() => setShowNewAccount(false)}>Cancel</button>
              <button style={{ ...buttonGold, flex: 1 }} onClick={handleCreateAccount}>Create</button>
            </div>
          </div>
        </div>
      )}

      {showNewTx && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h2 style={{ marginBottom: 16 }}>New Transaction</h2>

            <label style={labelStyle}>Type</label>
            <select value={txType} onChange={(e) => setTxType(e.target.value as "income" | "expense")} style={inputStyle}>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>

            <label style={labelStyle}>Amount (KES)</label>
            <input type="number" placeholder="0" value={txAmount} onChange={(e) => setTxAmount(e.target.value)} style={inputStyle} />

            <label style={labelStyle}>Description</label>
            <input placeholder="What was this for?" value={txDescription} onChange={(e) => setTxDescription(e.target.value)} style={inputStyle} />

            <label style={labelStyle}>Category</label>
            <select value={txCategory} onChange={(e) => setTxCategory(e.target.value)} style={inputStyle}>
              {TX_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

          <label style={labelStyle}>Payment Details</label>
            <PaymentMethodForm
              amount={Number(txAmount) || 0}
              onAmountChange={() => {}}
              onChange={setTxPaymentDetails}
            />

<label style={labelStyle}>Account</label>
            <select value={txAccountId} onChange={(e) => setTxAccountId(e.target.value)} style={inputStyle}>
              <option value="">No specific account</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>

            <label style={labelStyle}>Chart of Accounts Category</label>
            <select value={txCoaId} onChange={(e) => setTxCoaId(e.target.value)} style={inputStyle}>
              <option value="">Not categorized</option>
              {chartAccounts.map((a) => (
                <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
              ))}
            </select>

            <label style={labelStyle}>Cost Center (optional)</label>
            <select value={txCostCenterId} onChange={(e) => setTxCostCenterId(e.target.value)} style={inputStyle}>
              <option value="">No cost center</option>
              {costCenters.map((cc) => (
                <option key={cc.id} value={cc.id}>{cc.code} — {cc.name}</option>
              ))}
            </select>

            <label style={labelStyle}>Date</label>            <input type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)} style={inputStyle} />

            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              <button style={ghostButton} onClick={() => setShowNewTx(false)}>Cancel</button>
              <button style={{ ...buttonGold, flex: 1 }} onClick={handleCreateTx} disabled={saving}>
                {saving ? "Saving..." : "Record Transaction"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 14,
  padding: 20,
};

const rowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  padding: "10px 0",
  borderBottom: "1px solid var(--border)",
  fontSize: 13,
  alignItems: "center",
};

const labelSmall: React.CSSProperties = { fontSize: 12, color: "var(--text-muted)" };
const valueStyle: React.CSSProperties = { fontSize: 22, fontWeight: 700, marginTop: 4 };

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--text-muted)",
  display: "block",
  marginBottom: 4,
  marginTop: 10,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--bg-base)",
  color: "var(--text-primary)",
  marginBottom: 6,
  fontSize: 13,
};

const selectStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--bg-base)",
  color: "var(--text-primary)",
  fontSize: 12,
};

const buttonGold: React.CSSProperties = {
  background: "var(--gold)",
  color: "#07070f",
  border: "none",
  borderRadius: 10,
  padding: "9px 18px",
  fontWeight: 700,
  fontSize: 12,
  cursor: "pointer",
};

const ghostButton: React.CSSProperties = {
  padding: "9px 18px",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--text-secondary)",
  fontSize: 12,
  cursor: "pointer",
};

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.7)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 9999,
};

const modalStyle: React.CSSProperties = {
  width: 440,
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 16,
  padding: 24,
  maxHeight: "85vh",
  overflowY: "auto",
};