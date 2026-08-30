"use client";

import { useEffect, useMemo, useState } from "react";
import { useEngine } from "@/lib/runtime/EngineContext";
import { createClient } from "@/lib/supabase";
import {
  getChartOfAccounts,
  getCostCenters,
  createAccount,
  updateAccount,
  deleteAccount,
  createCostCenter,
  deleteCostCenter,
  seedDefaultChartOfAccounts,
  type ChartAccount,
  type CostCenter,
  type AccountType,
} from "@/lib/chartOfAccounts";
import { getFinanceTransactions, type FinanceTransaction } from "@/lib/finance";

const TYPE_LABELS: Record<AccountType, string> = {
  asset: "Assets",
  liability: "Liabilities",
  equity: "Equity",
  income: "Income",
  expense: "Expenses",
};

const TYPE_COLORS: Record<AccountType, string> = {
  asset: "#3dd68c",
  liability: "#ef4444",
  equity: "var(--gold)",
  income: "#3dd68c",
  expense: "#ef4444",
};

export default function ChartOfAccountsPage() {
  const { organization } = useEngine();
  const supabase = createClient();

  const [accounts, setAccounts] = useState<ChartAccount[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedAccount, setSelectedAccount] = useState<ChartAccount | null>(null);
  const [editingName, setEditingName] = useState<string | null>(null); // account id being renamed
  const [nameDraft, setNameDraft] = useState("");

  const [showNewAccount, setShowNewAccount] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<AccountType>("expense");
  const [newParentId, setNewParentId] = useState("");

  const [showNewCostCenter, setShowNewCostCenter] = useState(false);
  const [ccName, setCcName] = useState("");
  const [ccCode, setCcCode] = useState("");

  useEffect(() => {
    load();
  }, []);

  // Real-time: any change to accounts/cost centers from another tab/user reflects live
  useEffect(() => {
    if (!organization?.id) return;

    const channel = supabase
      .channel("chart-of-accounts-page")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chart_of_accounts", filter: `org_id=eq.${organization.id}` },
        () => getChartOfAccounts(organization.id).then(setAccounts)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cost_centers", filter: `org_id=eq.${organization.id}` },
        () => getCostCenters(organization.id).then(setCostCenters)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_transactions", filter: `org_id=eq.${organization.id}` },
        () => getFinanceTransactions(organization.id).then(setTransactions)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organization?.id]);

  async function load() {
    setLoading(true);
    const [a, c, t] = await Promise.all([
      getChartOfAccounts(organization.id),
      getCostCenters(organization.id),
      getFinanceTransactions(organization.id),
    ]);
    setAccounts(a);
    setCostCenters(c);
    setTransactions(t);
    setLoading(false);
  }

  async function handleSeed() {
    await seedDefaultChartOfAccounts(organization.id);
    load();
  }

  async function handleCreateAccount() {
    if (!newCode.trim() || !newName.trim()) return;
    await createAccount({
      orgId: organization.id,
      code: newCode,
      name: newName,
      accountType: newType,
      parentId: newParentId || null,
    });
    setNewCode("");
    setNewName("");
    setNewParentId("");
    setShowNewAccount(false);
    load();
  }

  async function handleToggleActive(account: ChartAccount) {
    await updateAccount(account.id, { is_active: !account.is_active });
    load();
  }

  async function handleRenameSave(account: ChartAccount) {
    if (nameDraft.trim() && nameDraft !== account.name) {
      await updateAccount(account.id, { name: nameDraft });
      load();
    }
    setEditingName(null);
  }

  async function handleDeleteAccount(account: ChartAccount) {
    if (!confirm(`Delete account "${account.code} — ${account.name}"?`)) return;
    await deleteAccount(account.id, organization.id, `${account.code} — ${account.name}`);
    if (selectedAccount?.id === account.id) setSelectedAccount(null);
    load();
  }

  async function handleCreateCostCenter() {
    if (!ccName.trim() || !ccCode.trim()) return;
    await createCostCenter({ orgId: organization.id, name: ccName, code: ccCode });
    setCcName("");
    setCcCode("");
    setShowNewCostCenter(false);
    load();
  }

  async function handleDeleteCostCenter(cc: CostCenter) {
    if (!confirm(`Delete cost center "${cc.name}"?`)) return;
    await deleteCostCenter(cc.id, organization.id, cc.name);
    load();
  }

  const grouped = useMemo(() => {
    const groups: Record<AccountType, ChartAccount[]> = {
      asset: [], liability: [], equity: [], income: [], expense: [],
    };
    accounts.forEach((a) => groups[a.account_type].push(a));
    return groups;
  }, [accounts]);

  // Cross-engine link: transactions posted against the selected account
const linkedTransactions = useMemo(() => {
    if (!selectedAccount) return [];
    return transactions.filter((t) => t.coa_id === selectedAccount.id);
  }, [selectedAccount, transactions]);
  const linkedTotal = linkedTransactions.reduce((sum, t) => sum + (t.type === "income" ? Number(t.amount) : -Number(t.amount)), 0);

  if (loading) return <div>Loading chart of accounts...</div>;

  return (
    <div style={{ overflowY: "auto", height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Chart of Accounts</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
            Account structure and cost centers for {organization.name}.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {accounts.length === 0 && (
            <button style={buttonGold} onClick={handleSeed}>Seed Default Accounts</button>
          )}
          <button style={ghostButton} onClick={() => setShowNewAccount(true)}>+ Account</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: selectedAccount ? "1.2fr 1fr" : "1fr", gap: 20 }}>
        <div>
          {(Object.keys(TYPE_LABELS) as AccountType[]).map((type) => (
            <div key={type} className="card" style={{ ...cardStyle, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: TYPE_COLORS[type], marginBottom: 8, textTransform: "uppercase" }}>
                {TYPE_LABELS[type]}
              </div>
              {grouped[type].map((account) => (
                <div
                  key={account.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "60px 1fr auto auto auto",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 4px",
                    borderBottom: "1px solid var(--border)",
                    fontSize: 13,
                    opacity: account.is_active ? 1 : 0.5,
                    background: selectedAccount?.id === account.id ? "var(--bg-elevated)" : "transparent",
                    cursor: "pointer",
                  }}
                  onClick={() => setSelectedAccount(account)}
                >
                  <span style={{ color: "var(--text-muted)" }}>{account.code}</span>

                  {editingName === account.id ? (
                    <input
                      autoFocus
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onBlur={() => handleRenameSave(account)}
                      onKeyDown={(e) => e.key === "Enter" && handleRenameSave(account)}
                      style={{ ...inputStyle, marginBottom: 0, padding: "4px 8px" }}
                    />
                  ) : (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingName(account.id);
                        setNameDraft(account.name);
                      }}
                    >
                      {account.name}
                    </span>
                  )}

                  <button
                    style={ghostButtonSmall}
                    onClick={(e) => { e.stopPropagation(); handleToggleActive(account); }}
                  >
                    {account.is_active ? "Active" : "Inactive"}
                  </button>

 <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
                    {transactions.filter((t) => t.coa_id === account.id).length} tx
                  </span>

                  <button
                    style={dangerBtnSmall}
                    onClick={(e) => { e.stopPropagation(); handleDeleteAccount(account); }}
                  >
                    ✕
                  </button>
                </div>
              ))}
              {grouped[type].length === 0 && (
                <div style={{ color: "var(--text-muted)", fontSize: 12, padding: "6px 4px" }}>No accounts yet.</div>
              )}
            </div>
          ))}

          <div className="card" style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3>Cost Centers</h3>
              <button style={ghostButtonSmall} onClick={() => setShowNewCostCenter(true)}>+ Cost Center</button>
            </div>
            {costCenters.map((cc) => (
              <div key={cc.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 4px", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                <span>{cc.code} — {cc.name}</span>
                <button style={dangerBtnSmall} onClick={() => handleDeleteCostCenter(cc)}>✕</button>
              </div>
            ))}
            {costCenters.length === 0 && (
              <div style={{ color: "var(--text-muted)", fontSize: 12 }}>No cost centers yet.</div>
            )}
          </div>
        </div>

        {selectedAccount && (
          <div className="card" style={{ ...cardStyle, alignSelf: "start" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div>
                <h3>{selectedAccount.code} — {selectedAccount.name}</h3>
                <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{TYPE_LABELS[selectedAccount.account_type]}</p>
              </div>
              <button style={ghostButtonSmall} onClick={() => setSelectedAccount(null)}>Close</button>
            </div>

            <div style={{ marginBottom: 12, fontSize: 13 }}>
              <strong>Net posted: </strong>
              <span style={{ color: linkedTotal >= 0 ? "#3dd68c" : "#ef4444" }}>
                KES {linkedTotal.toLocaleString()}
              </span>
            </div>

            <div style={{ maxHeight: 400, overflowY: "auto" }}>
              {linkedTransactions.map((t) => (
                <div key={t.id} style={{ padding: "8px 4px", borderBottom: "1px solid var(--border)", fontSize: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>{t.description}</span>
                    <span style={{ color: t.type === "income" ? "#3dd68c" : "#ef4444", fontWeight: 600 }}>
                      {t.type === "income" ? "+" : "-"}KES {Number(t.amount).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ color: "var(--text-muted)" }}>{t.date}</div>
                </div>
              ))}
              {linkedTransactions.length === 0 && (
                <div style={{ color: "var(--text-muted)", fontSize: 12 }}>
                  No transactions posted to this account yet. Link transactions from the Finance page.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showNewAccount && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h2 style={{ marginBottom: 16 }}>New Account</h2>

            <label style={labelStyle}>Code</label>
            <input placeholder="e.g. 5700" value={newCode} onChange={(e) => setNewCode(e.target.value)} style={inputStyle} />

            <label style={labelStyle}>Name</label>
            <input placeholder="e.g. Marketing" value={newName} onChange={(e) => setNewName(e.target.value)} style={inputStyle} />

            <label style={labelStyle}>Type</label>
            <select value={newType} onChange={(e) => setNewType(e.target.value as AccountType)} style={inputStyle}>
              {(Object.keys(TYPE_LABELS) as AccountType[]).map((t) => (
                <option key={t} value={t}>{TYPE_LABELS[t]}</option>
              ))}
            </select>

            <label style={labelStyle}>Parent Account (optional)</label>
            <select value={newParentId} onChange={(e) => setNewParentId(e.target.value)} style={inputStyle}>
              <option value="">No parent</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
              ))}
            </select>

            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              <button style={ghostButton} onClick={() => setShowNewAccount(false)}>Cancel</button>
              <button style={{ ...buttonGold, flex: 1 }} onClick={handleCreateAccount}>Create</button>
            </div>
          </div>
        </div>
      )}

      {showNewCostCenter && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h2 style={{ marginBottom: 16 }}>New Cost Center</h2>

            <label style={labelStyle}>Code</label>
            <input placeholder="e.g. BR-BABADOGO" value={ccCode} onChange={(e) => setCcCode(e.target.value)} style={inputStyle} />

            <label style={labelStyle}>Name</label>
            <input placeholder="e.g. Babadogo Branch" value={ccName} onChange={(e) => setCcName(e.target.value)} style={inputStyle} />

            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              <button style={ghostButton} onClick={() => setShowNewCostCenter(false)}>Cancel</button>
              <button style={{ ...buttonGold, flex: 1 }} onClick={handleCreateCostCenter}>Create</button>
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

const ghostButtonSmall: React.CSSProperties = {
  padding: "4px 10px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--text-secondary)",
  fontSize: 11,
  cursor: "pointer",
};

const dangerBtnSmall: React.CSSProperties = {
  padding: "4px 8px",
  borderRadius: 8,
  border: "1px solid #ef4444",
  background: "transparent",
  color: "#ef4444",
  fontSize: 11,
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