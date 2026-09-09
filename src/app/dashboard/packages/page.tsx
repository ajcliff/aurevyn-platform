"use client";

import { useEffect, useState } from "react";
import { getPackages, createPackage, updatePackage, deletePackage, type Package } from "@/lib/packages";
import { getEngines, updateEnginePrice, type Engine } from "@/lib/engines";
import { logActivity } from "@/lib/activity";
import { createClient } from "@/lib/supabase";
import s from "@/styles/layout.module.css";
import PageHeader from "@/components/PageHeader";

const tierColors: Record<string, string> = {
  core: "#3dd68c", growth: "#c9a84c",
  professional: "#a78bfa", enterprise: "#38bdf8",
};

const tierFeatures: Record<string, string[]> = {
  core: ["POS", "1 User", "500 transactions/mo"],
  growth: ["POS", "Inventory", "HR & Payroll", "5 Users", "Unlimited transactions"],
  professional: ["POS", "Inventory", "HR", "CRM", "Records", "Analytics", "20 Users", "Multi-branch"],
  enterprise: ["Everything", "AI Systems", "API Access", "Unlimited Users", "White-label"],
};

export default function PackagesPage() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newPackage, setNewPackage] = useState({ name: "", price: "", features: "", orgs: 0 });
  const [limits, setLimits] = useState<any[]>([]);
  const [engines, setEngines] = useState<Engine[]>([]);
  const [editingPackagePrice, setEditingPackagePrice] = useState<string | null>(null);
  const [priceDraft, setPriceDraft] = useState("");
  const [editingEnginePrice, setEditingEnginePrice] = useState<string | null>(null);
  const [enginePriceDraft, setEnginePriceDraft] = useState("");

  useEffect(() => {
    getPackages().then(setPackages);
    getEngines().then((data) => setEngines(data.sort((a, b) => Number(b.monthly_price) - Number(a.monthly_price))));
    const supabase = createClient();
    supabase.from("package_module_limits").select("*").order("package_name")
      .then(({ data }) => setLimits(data ?? []));

    const channel = supabase.channel("packages-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "packages" }, () => {
        getPackages().then(setPackages);
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleCreate = async () => {
    if (!newPackage.name.trim()) return;
    const created = await createPackage(newPackage);
    if (created) {
      await logActivity({ icon: "📦", title: "New package created", sub: created.name });
      setShowCreate(false);
      setNewPackage({ name: "", price: "", features: "", orgs: 0 });
    }
  };

  const startEditPackagePrice = (pkg: Package) => {
    setEditingPackagePrice(pkg.id);
    setPriceDraft(pkg.price);
  };

  const savePackagePrice = async (pkg: Package) => {
    const updated = await updatePackage(pkg.id, { price: priceDraft });
    if (updated) {
      setPackages((prev) => prev.map((p) => (p.id === pkg.id ? updated : p)));
      await logActivity({ icon: "💲", title: "Package price updated", sub: `${pkg.name}: ${priceDraft}` });
    }
    setEditingPackagePrice(null);
  };

  const handleDeletePackage = async (pkg: Package) => {
    if (!confirm(`Delete the "${pkg.name}" package? This can't be undone.`)) return;
    const ok = await deletePackage(pkg.id);
    if (ok) {
      setPackages((prev) => prev.filter((p) => p.id !== pkg.id));
      if (selectedPackage?.id === pkg.id) setSelectedPackage(null);
    }
  };

  const startEditEnginePrice = (engine: Engine) => {
    setEditingEnginePrice(engine.id);
    setEnginePriceDraft(String(engine.monthly_price));
  };

  const saveEnginePrice = async (engine: Engine) => {
    const numeric = parseFloat(enginePriceDraft) || 0;
    const ok = await updateEnginePrice(engine.id, numeric);
    if (ok) {
      setEngines((prev) =>
        prev
          .map((e) => (e.id === engine.id ? { ...e, monthly_price: numeric } : e))
          .sort((a, b) => Number(b.monthly_price) - Number(a.monthly_price))
      );
      await logActivity({ icon: "💲", title: "Engine price updated", sub: `${engine.name}: KES ${numeric.toLocaleString()}/mo` });
    }
    setEditingEnginePrice(null);
  };

  const totalMRR = packages.reduce((sum, p) => {
    const price = parseInt(p.price.replace(/[^0-9]/g, "")) || 0;
    return sum + price * p.orgs;
  }, 0);

  const totalSubscriptions = packages.reduce((sum, p) => sum + p.orgs, 0);

  return (
    <div className="page-shell">
      
      <div className={s.body}>
           <main className="page-main">

          {/* Header */}
         <PageHeader
  title="Packages"
  subtitle={`${packages.length} tiers · ${totalSubscriptions} subscriptions · KES ${totalMRR.toLocaleString()} MRR`}
  actions={<button className={s.btnGold} onClick={() => setShowCreate(true)}>+ New Package</button>}
/>

          {/* MRR Summary */}
          <div className={s.summaryCards}>
            {[
              { label: "Total MRR", value: `KES ${totalMRR.toLocaleString()}`, color: "var(--gold)" },
              { label: "Total Subscriptions", value: totalSubscriptions, color: "#3dd68c" },
              { label: "Active Tiers", value: packages.length, color: "#a78bfa" },
              { label: "Avg per Org", value: totalSubscriptions > 0 ? `KES ${Math.round(totalMRR / totalSubscriptions).toLocaleString()}` : "—", color: "#38bdf8" },
            ].map((card, i) => (
              <div key={i} className={s.card} style={{ flex: 1 }}>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "6px" }}>{card.label}</div>
                <div style={{ fontSize: "20px", fontWeight: 700, color: card.color }}>{card.value}</div>
              </div>
            ))}
          </div>

          {/* Package cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" }}>
            {packages.map((pkg) => {
              const tierKey = pkg.name.toLowerCase();
              const color = tierColors[tierKey] ?? "var(--gold)";
              const revenue = (parseInt(pkg.price.replace(/[^0-9]/g, "")) || 0) * pkg.orgs;
              const features = tierFeatures[tierKey] ?? pkg.features.split(" · ");
              const pkgLimits = limits.filter(l => l.package_name === pkg.name);
              const enabledModules = pkgLimits.filter(l => l.enabled);

              return (
                <div
                  key={pkg.id}
                  style={{
                    background: "var(--bg-card)",
                    border: `2px solid ${selectedPackage?.id === pkg.id ? color : "var(--border)"}`,
                    borderRadius: "16px", padding: "20px", cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div
                    onClick={() => setSelectedPackage(selectedPackage?.id === pkg.id ? null : pkg)}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}
                  >
                    <div>
                      <div style={{ fontSize: "16px", fontWeight: 700, color, marginBottom: "2px" }}>{pkg.name}</div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{pkg.orgs} organizations subscribed</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      {editingPackagePrice === pkg.id ? (
                        <input
                          autoFocus
                          value={priceDraft}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => setPriceDraft(e.target.value)}
                          onBlur={() => savePackagePrice(pkg)}
                          onKeyDown={(e) => e.key === "Enter" && savePackagePrice(pkg)}
                          style={{
                            fontSize: "16px", fontWeight: 700, color, background: "var(--bg-elevated)",
                            border: `1px solid ${color}`, borderRadius: 6, padding: "2px 6px", width: 130, textAlign: "right",
                          }}
                        />
                      ) : (
                        <div
                          onClick={(e) => { e.stopPropagation(); startEditPackagePrice(pkg); }}
                          style={{ fontSize: "18px", fontWeight: 700, color, cursor: "text" }}
                          title="Click to edit price"
                        >
                          {pkg.price} ✎
                        </div>
                      )}
                      <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>MRR: KES {revenue.toLocaleString()}</div>
                    </div>
                  </div>

                  {/* Features */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "14px" }}>
                    {features.map((f, i) => (
                      <span key={i} style={{
                        padding: "3px 8px", borderRadius: "20px", fontSize: "10px",
                        background: `${color}15`, border: `1px solid ${color}30`, color,
                      }}>{f}</span>
                    ))}
                  </div>

                  {/* Module access */}
                  {enabledModules.length > 0 && (
                    <div style={{ borderTop: "1px solid var(--border)", paddingTop: "12px" }}>
                      <div style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: "8px", letterSpacing: "0.05em" }}>MODULES INCLUDED</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        {enabledModules.map((l, i) => (
                          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px" }}>
                            <span style={{ color: "var(--text-secondary)" }}>✓ {l.module_name}</span>
                            <span style={{ color: "var(--text-muted)" }}>
                              {l.max_users === -1 ? "∞ users" : `${l.max_users} user${l.max_users !== 1 ? "s" : ""}`}
                              {l.ai_enabled ? " · AI ✦" : ""}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeletePackage(pkg); }}
                    style={{
                      marginTop: 12, width: "100%", padding: "6px 0", borderRadius: 8,
                      border: "1px solid #ef444440", background: "transparent", color: "#ef4444",
                      fontSize: 11, cursor: "pointer",
                    }}
                  >
                    Delete package
                  </button>
                </div>
              );
            })}
          </div>

          {/* Package comparison table */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "14px", overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", background: "var(--bg-elevated)", fontSize: "13px", fontWeight: 600 }}>
              Package Comparison
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--bg-elevated)" }}>
                    <th style={{ padding: "10px 16px", textAlign: "left", fontSize: "10px", color: "var(--text-muted)", fontWeight: 600 }}>MODULE</th>
                    {packages.map(p => (
                      <th key={p.id} style={{ padding: "10px 16px", textAlign: "center", fontSize: "10px", color: tierColors[p.name] ?? "var(--gold)", fontWeight: 700 }}>{p.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {["Point of Sale", "Inventory Management", "HR & Payroll", "CRM", "Analytics", "AI Insights"].map((mod, i) => (
                    <tr key={mod} style={{ borderBottom: "1px solid var(--border)", background: i % 2 === 0 ? "var(--bg-card)" : "transparent" }}>
                      <td style={{ padding: "10px 16px", fontSize: "12px", fontWeight: 600 }}>{mod}</td>
                      {packages.map(pkg => {
                        const limit = limits.find(l => l.package_name === pkg.name && l.module_name === mod);
                        const color = tierColors[pkg.name] ?? "var(--gold)";
                        return (
                          <td key={pkg.id} style={{ padding: "10px 16px", textAlign: "center" }}>
                            {limit?.enabled
                              ? <span style={{ color, fontSize: "14px" }}>✓</span>
                              : <span style={{ color: "var(--text-muted)", fontSize: "14px" }}>—</span>
                            }
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Engine pricing - used for a-la-carte plan selection after the free trial */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "14px", overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", background: "var(--bg-elevated)", fontSize: "13px", fontWeight: 600 }}>
              Engine Pricing (a-la-carte)
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 1, background: "var(--border)" }}>
              {engines.map((engine) => (
                <div
                  key={engine.id}
                  style={{
                    background: "var(--bg-card)", padding: "12px 20px",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: 12 }}>{engine.icon} {engine.name}</span>
                  {editingEnginePrice === engine.id ? (
                    <input
                      autoFocus
                      type="number"
                      value={enginePriceDraft}
                      onChange={(e) => setEnginePriceDraft(e.target.value)}
                      onBlur={() => saveEnginePrice(engine)}
                      onKeyDown={(e) => e.key === "Enter" && saveEnginePrice(engine)}
                      style={{
                        fontSize: 12, fontWeight: 700, color: "var(--gold)", background: "var(--bg-elevated)",
                        border: "1px solid var(--gold)", borderRadius: 6, padding: "2px 6px", width: 90, textAlign: "right",
                      }}
                    />
                  ) : (
                    <span
                      onClick={() => startEditEnginePrice(engine)}
                      style={{ fontSize: 12, fontWeight: 700, color: "var(--gold)", cursor: "text" }}
                      title="Click to edit price"
                    >
                      KES {Number(engine.monthly_price).toLocaleString()}/mo ✎
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>

      {showCreate && (
        <div className={s.modal} onClick={() => setShowCreate(false)}>
          <div className={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: "15px", fontWeight: 700 }}>New Package</div>
            {[
              { label: "NAME", key: "name", placeholder: "e.g. Professional" },
              { label: "PRICE", key: "price", placeholder: "e.g. KES 15,000/mo" },
              { label: "FEATURES", key: "features", placeholder: "e.g. 10 Modules · 30 Users" },
            ].map(field => (
              <div key={field.key}>
                <label style={{ fontSize: "10px", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>{field.label}</label>
                <input value={newPackage[field.key as keyof typeof newPackage] as string} onChange={e => setNewPackage(p => ({ ...p, [field.key]: e.target.value }))} placeholder={field.placeholder} className={s.input} />
              </div>
            ))}
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={handleCreate} className={s.btnGold} style={{ flex: 1 }}>Create Package</button>
              <button onClick={() => setShowCreate(false)} className={s.btnGhost} style={{ flex: 1 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}