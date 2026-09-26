"use client";

import { useEffect, useState } from "react";
import { getPackages, createPackage, updatePackage, deletePackage, type Package } from "@/lib/packages";
import { getEngines, updateEnginePrice, type Engine } from "@/lib/engines";
import { logActivity } from "@/lib/activity";
import { createClient } from "@/lib/supabase";
import Modal from "@/components/founder/Modal";
import f from "@/styles/founder.module.css";

const tierFeatures: Record<string, string[]> = {
  core: ["POS", "1 User", "500 transactions/mo"],
  growth: ["POS", "Inventory", "HR & Payroll", "5 Users", "Unlimited transactions"],
  professional: ["POS", "Inventory", "HR", "CRM", "Records", "Analytics", "20 Users", "Multi-branch"],
  enterprise: ["Everything", "AI Systems", "API Access", "Unlimited Users", "White-label"],
};

const COMPARISON_MODULES = ["Point of Sale", "Inventory Management", "HR & Payroll", "CRM", "Analytics", "AI Insights"];
const toNumber = (v: string | number) => (typeof v === "number" ? v : parseInt(v.replace(/[^0-9]/g, "")) || 0);const kes = (n: number) => `KES ${n.toLocaleString("en-KE")}`;

export default function PackagesPage() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [showCreate, setShowCreate] = useState(false);
const [newPackage, setNewPackage] = useState({ name: "", price: 0, orgs: 0 });  const [formError, setFormError] = useState<string | null>(null);
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
    if (!newPackage.name.trim()) {
      setFormError("Give the package a name.");
      return;
    }
    setFormError(null);
    const created = await createPackage(newPackage);
    if (created) {
      await logActivity({ icon: "📦", title: "New package created", sub: created.name });
      setShowCreate(false);
      setNewPackage({ name: "", price: "", features: "", orgs: 0 });
    } else {
      setFormError("The package couldn't be created. Check the details and try again.");
    }
  };

    const savePackagePrice = async (pkg: Package) => {
    const updated = await updatePackage(pkg.id, { price: Number(priceDraft) || 0 });
    if (updated) {
      setPackages((prev) => prev.map((p) => (p.id === pkg.id ? updated : p)));
      await logActivity({ icon: "💲", title: "Package price updated", sub: `${pkg.name}: ${kes(Number(priceDraft) || 0)}` });
    }
    setEditingPackagePrice(null);
  };

  const handleDeletePackage = async (pkg: Package) => {
    if (!confirm(`Delete the "${pkg.name}" package? This can't be undone.`)) return;
    const ok = await deletePackage(pkg.id);
    if (ok) setPackages((prev) => prev.filter((p) => p.id !== pkg.id));
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

  const totalMRR = packages.reduce((sum, p) => sum + toNumber(p.price) * p.orgs, 0);
  const totalSubscriptions = packages.reduce((sum, p) => sum + p.orgs, 0);

  return (
    <div className={`page-shell ${f.root}`}>
      <main className="page-main">
        <div className={f.page}>
          <div className={f.top}>
            <div>
              <p className={f.greeting}>Packages</p>
              <h1 className={`${f.headline} ${f.headlineWide}`}>
                {packages.length === 0 ? "No packages yet." : `${kes(totalMRR)} a month from ${totalSubscriptions} ${totalSubscriptions === 1 ? "subscription" : "subscriptions"}.`}
              </h1>
            </div>
            <div className={f.actions}>
              <button className={f.primary} onClick={() => { setFormError(null); setShowCreate(true); }}>New package</button>
            </div>
          </div>

          <div className={`${f.vitals} ${f.vitalsThree}`}>
            <div className={`${f.vital} ${f.vitalStatic}`}>
              <span className={f.vitalLabel}>Subscriptions</span>
              <span className={f.vitalValue}>{totalSubscriptions}</span>
              <span className={f.vitalSub}>Across all packages</span>
            </div>
            <div className={`${f.vital} ${f.vitalStatic}`}>
              <span className={f.vitalLabel}>Packages</span>
              <span className={f.vitalValue}>{packages.length}</span>
              <span className={f.vitalSub}>Tiers on offer</span>
            </div>
            <div className={`${f.vital} ${f.vitalStatic}`}>
              <span className={f.vitalLabel}>Average per organization</span>
              <span className={f.vitalValue}>{totalSubscriptions > 0 ? kes(Math.round(totalMRR / totalSubscriptions)) : "—"}</span>
              <span className={f.vitalSub}>Per month</span>
            </div>
          </div>

          {packages.length === 0 ? (
            <div className={f.empty}>
              <strong>Create your first package.</strong>
              Packages set the price and modules an organization gets.
              <div><button className={f.secondary} onClick={() => setShowCreate(true)}>New package</button></div>
            </div>
          ) : (
            <div className={f.plans}>
              {packages.map((pkg) => {
                const tierKey = pkg.name.toLowerCase();
                const revenue = toNumber(pkg.price) * pkg.orgs;
                const features = tierFeatures[tierKey] ?? (pkg.engine_slugs ?? []).map((s) => s.replace(/-/g, " "));                const enabledModules = limits.filter(l => l.package_name === pkg.name && l.enabled);

                return (
                  <article key={pkg.id} className={f.plan}>
                    <div className={f.planHead}>
                      <div>
                        <h2 className={f.planName}>{pkg.name}</h2>
                        <div className={f.rowSub}>{pkg.orgs} {pkg.orgs === 1 ? "organization" : "organizations"} subscribed</div>
                      </div>
                      <div className={f.planPrice}>
                        {editingPackagePrice === pkg.id ? (
                          <input
                            autoFocus
                            aria-label={`Price for ${pkg.name}`}
                            className={`${f.input} ${f.priceInput}`}
                            value={priceDraft}
                            onChange={(e) => setPriceDraft(e.target.value)}
                            onBlur={() => savePackagePrice(pkg)}
                            onKeyDown={(e) => e.key === "Enter" && savePackagePrice(pkg)}
                          />
                                              ) : (
                          <button className={f.priceBtn} title="Edit price" onClick={() => { setEditingPackagePrice(pkg.id); setPriceDraft(String(pkg.price)); }}>
                            {kes(pkg.price)}
                          </button>
                        )}
                        <div className={f.rowSub}>{kes(revenue)} a month</div>
                      </div>
                    </div>

                    <p className={f.featureText}>{features.join(", ")}</p>

                    {enabledModules.length > 0 && (
                      <div>
                        {enabledModules.map((l, i) => (
                          <div key={i} className={f.moduleRow}>
                            <span>{l.module_name}</span>
                            <span>
                              {l.max_users === -1 ? "Unlimited users" : `${l.max_users} ${l.max_users === 1 ? "user" : "users"}`}
                              {l.ai_enabled ? ", AI included" : ""}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div><button className={f.linkBtn} style={{ color: "var(--red)" }} onClick={() => handleDeletePackage(pkg)}>Delete package</button></div>
                  </article>
                );
              })}
            </div>
          )}

          {packages.length > 0 && (
            <section aria-labelledby="compare-title">
              <div className={f.sectionHead}><h2 id="compare-title" className={f.sectionTitle}>What each package includes</h2></div>
              <div className={f.tableWrap}>
                <table className={f.ledger}>
                  <thead>
                    <tr>
                      <th>Module</th>
                      {packages.map(p => <th key={p.id} style={{ textTransform: "capitalize", textAlign: "center" }}>{p.name}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {COMPARISON_MODULES.map(mod => (
                      <tr key={mod}>
                        <td className={f.cellMain}>{mod}</td>
                        {packages.map(pkg => {
                          const included = limits.find(l => l.package_name === pkg.name && l.module_name === mod)?.enabled;
                          return (
                            <td key={pkg.id} style={{ textAlign: "center" }}>
                              {included ? <span className={f.check} role="img" aria-label="Included">✓</span> : <span className={f.dash} role="img" aria-label="Not included">—</span>}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <section aria-labelledby="engines-title">
            <div className={f.sectionHead}>
              <h2 id="engines-title" className={f.sectionTitle}>Engine pricing</h2>
              <span className={f.sectionSub}>For organizations that pick engines one by one after the free trial</span>
            </div>
            {engines.length === 0 ? (
              <div className={f.empty}><strong>No engines found.</strong>Engines appear here once they are set up.</div>
            ) : (
              <div className={f.enginePrices}>
                {engines.map((engine) => (
                  <div key={engine.id} className={f.engineRow}>
                    <span>{engine.name}</span>
                    {editingEnginePrice === engine.id ? (
                      <input
                        autoFocus
                        type="number"
                        aria-label={`Monthly price for ${engine.name}`}
                        className={`${f.input} ${f.priceInput}`}
                        style={{ width: 110, fontSize: 13 }}
                        value={enginePriceDraft}
                        onChange={(e) => setEnginePriceDraft(e.target.value)}
                        onBlur={() => saveEnginePrice(engine)}
                        onKeyDown={(e) => e.key === "Enter" && saveEnginePrice(engine)}
                      />
                    ) : (
                      <button className={f.priceBtn} title="Edit price" onClick={() => { setEditingEnginePrice(engine.id); setEnginePriceDraft(String(engine.monthly_price)); }}>
                        {kes(Number(engine.monthly_price))} a month
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

            {showCreate && (
        <Modal title="New package" onClose={() => setShowCreate(false)}>
          <div className={f.field}>
            <label htmlFor="pkg-name">Name</label>
            <input id="pkg-name" className={f.input} autoFocus value={newPackage.name} onChange={e => setNewPackage(p => ({ ...p, name: e.target.value }))} placeholder="Professional" />
          </div>
          <div className={f.field}>
            <label htmlFor="pkg-price">Price (KES/mo)</label>
            <input id="pkg-price" type="number" className={f.input} value={newPackage.price} onChange={e => setNewPackage(p => ({ ...p, price: Number(e.target.value) || 0 }))} placeholder="15000" />
          </div>
          {formError && <div className={f.formError} role="alert">{formError}</div>}
          <div className={f.dialogActions}>
            <button className={f.secondary} onClick={() => setShowCreate(false)}>Cancel</button>
            <button className={f.primary} onClick={handleCreate}>Create package</button>
          </div>
        </Modal>
      )}
    </div>
  );
}