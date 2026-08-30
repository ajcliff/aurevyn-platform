"use client";

import { useEffect, useState } from "react";
import { getOrganizations, createOrganization, type Organization } from "@/lib/organizations";
import { PACKAGE_ENGINES } from "@/lib/packageEngines";
import { getBlueprintOptions, type BlueprintOption } from "@/lib/blueprintsList";
import { getPackages, createPackage, type Package } from "@/lib/packages";
import { logActivity } from "@/lib/activity";
import { createNotification } from "@/lib/notifications";
import { createClient } from "@/lib/supabase";
import { getPlatformAlerts, type PlatformAlert } from "@/lib/platformAlerts";
import { formatError } from "@/lib/errorFormat";
import { logError } from "@/lib/errorLog";
import s from "@/styles/layout.module.css";

type Section = "create" | "broadcast" | "alerts";

export default function ActionsPage() {
  const [section, setSection] = useState<Section>("create");

  const [orgList, setOrgList] = useState<Organization[]>([]);
  const [packageList, setPackageList] = useState<Package[]>([]);
  const [blueprintOptions, setBlueprintOptions] = useState<BlueprintOption[]>([]);
  const [alertList, setAlertList] = useState<PlatformAlert[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [createTab, setCreateTab] = useState<"org" | "package" | "offer">("org");
  const [newOrg, setNewOrg] = useState({ name: "", location: "", packageSlug: "", blueprintId: "" });
  const [newPackage, setNewPackage] = useState({ name: "", price: "", features: "" });
  const [createError, setCreateError] = useState<string | null>(null);

  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [broadcastTarget, setBroadcastTarget] = useState("All Organizations");
  const [broadcastSent, setBroadcastSent] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoadError(null);
    try {
      const [orgs, packages, blueprints, alerts] = await Promise.all([
        getOrganizations(),
        getPackages(),
        getBlueprintOptions(),
        getPlatformAlerts(),
      ]);
      setOrgList(orgs);
      setPackageList(packages);
      setBlueprintOptions(blueprints);
      setAlertList(alerts);
    } catch (err) {
      const message = formatError(err);
      setLoadError(message);
      logError({ source: "ActionsPage", message });
    }
  }

  const createOrg = async () => {
    if (!newOrg.name.trim() || !newOrg.packageSlug || !newOrg.blueprintId) {
      setCreateError("Please fill in the organization name, package, and industry blueprint.");
      return;
    }
    setCreateError(null);
    try {
      const selectedPackage = packageList.find((p) => p.slug === newOrg.packageSlug);
      const created = await createOrganization({
        name: newOrg.name,
        location: newOrg.location,
        status: "operational",
        revenue: "KES 0",
        package: selectedPackage?.name || newOrg.packageSlug,
        blueprint_id: newOrg.blueprintId,
      } as any);

      const slugs = PACKAGE_ENGINES[newOrg.packageSlug] ?? [];
      if (slugs.length > 0) {
        const supabase = createClient();
        const { data: engines, error: enginesError } = await supabase
          .from("engines")
          .select("id, slug")
          .in("slug", slugs);
        if (enginesError) throw enginesError;

        if (engines?.length) {
          const engineRows = engines.map((engine) => ({
            org_id: created.id,
            engine_id: engine.id,
            engine_slug: engine.slug,
            enabled: true,
            subscription_tier: newOrg.packageSlug,
          }));
          const { error: insertError } = await supabase.from("organization_engines").insert(engineRows);
          if (insertError) throw insertError;
        }
      }

      await logActivity({ icon: "🏢", title: "New organization registered", sub: created.name });
      await createNotification("new_org", "New organization registered", `${created.name} was added via quick-create`);

      setOrgList(prev => [...prev, created]);
      setNewOrg({ name: "", location: "", packageSlug: "", blueprintId: "" });
    } catch (err) {
      const message = formatError(err);
      setCreateError(message);
      logError({ source: "ActionsPage/createOrg", message });
    }
  };

  const handleCreatePackage = async () => {
    if (!newPackage.name.trim()) return;
    setCreateError(null);
    try {
      const created = await createPackage({
        name: newPackage.name,
        price: newPackage.price,
        features: newPackage.features,
        orgs: 0,
      });
      await logActivity({ icon: "📦", title: "New package created", sub: created.name });
      setPackageList(prev => [...prev, created]);
      setNewPackage({ name: "", price: "", features: "" });
    } catch (err) {
      const message = formatError(err);
      setCreateError(message);
      logError({ source: "ActionsPage/createPackage", message });
    }
  };

  const sendBroadcast = () => {
    if (!broadcastMsg.trim()) return;
    setBroadcastSent(true);
    setBroadcastMsg("");
  };

  const navItems: { id: Section; label: string; icon: string }[] = [
    { id: "create", label: "Quick Create", icon: "✦" },
    { id: "broadcast", label: "Broadcast", icon: "📣" },
    { id: "alerts", label: "Alerts", icon: "⚠" },
  ];

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: "8px",
    border: "1px solid var(--border)", background: "var(--bg-base)",
    color: "var(--text-primary)", fontSize: "13px", outline: "none", fontFamily: "inherit",
  };

  return (
    <div className="page-shell">
      <div className={s.body}>
        <main className={s.settingsMain}>

          <div style={{ width: "200px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "4px" }}>
            <div style={{ fontSize: "11px", color: "var(--gold)", marginBottom: "8px", letterSpacing: "0.08em", fontWeight: 700 }}>
              ✦ ACTIONS
            </div>
            {navItems.map(item => (
              <button key={item.id} onClick={() => setSection(item.id)} style={{
                padding: "9px 14px", borderRadius: "8px", border: "none",
                background: section === item.id ? "var(--bg-elevated)" : "transparent",
                color: section === item.id ? "var(--gold)" : "var(--text-secondary)",
                fontSize: "12px", cursor: "pointer", textAlign: "left",
                fontWeight: section === item.id ? 600 : 400,
                borderLeft: section === item.id ? "2px solid var(--gold)" : "2px solid transparent",
                transition: "all 0.15s ease", fontFamily: "inherit",
                display: "flex", alignItems: "center", gap: "8px",
              }}>
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "16px", overflowY: "auto", maxHeight: "calc(100vh - 80px)", maxWidth: "560px" }}>

            {loadError && (
              <div style={{ fontSize: 12, color: "#ef4444", background: "#ef44441a", border: "1px solid #ef444440", borderRadius: 8, padding: "10px 12px" }}>
                {loadError}
              </div>
            )}

            {section === "create" && (
              <>
                <div>
                  <h2 style={{ fontSize: "18px", fontWeight: 700 }}>Quick Create</h2>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>Spin up a new org, package, or promotional offer</p>
                </div>

                <div style={{ display: "flex", gap: "4px" }}>
                  {(["org", "package", "offer"] as const).map(t => (
                    <button key={t} onClick={() => setCreateTab(t)} style={{
                      flex: 1, padding: "8px", borderRadius: "8px",
                      border: "1px solid var(--border)",
                      background: createTab === t ? "var(--gold)" : "var(--bg-card)",
                      color: createTab === t ? "#0a0a0f" : "var(--text-secondary)",
                      fontSize: "12px", fontWeight: createTab === t ? 700 : 400,
                      cursor: "pointer", textTransform: "capitalize", fontFamily: "inherit",
                    }}>{t}</button>
                  ))}
                </div>

                {createTab === "org" && (
                  <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                    <input value={newOrg.name} onChange={e => setNewOrg({ ...newOrg, name: e.target.value })} placeholder="Organization name" style={inputStyle} />
                    <input value={newOrg.location} onChange={e => setNewOrg({ ...newOrg, location: e.target.value })} placeholder="Location (e.g. Nairobi, KE)" style={inputStyle} />
                    <select value={newOrg.packageSlug} onChange={e => setNewOrg({ ...newOrg, packageSlug: e.target.value })} style={inputStyle}>
                      <option value="">Select package...</option>
                      {packageList.map((p) => <option key={p.id} value={p.slug}>{p.name}</option>)}
                    </select>
                    <select value={newOrg.blueprintId} onChange={e => setNewOrg({ ...newOrg, blueprintId: e.target.value })} style={inputStyle}>
                      <option value="">Select industry...</option>
                      {blueprintOptions.map((b) => <option key={b.id} value={b.id}>{b.name} ({b.industry})</option>)}
                    </select>
                    <button onClick={createOrg} className={s.btnGold} style={{ marginTop: "4px" }}>Create Organization</button>
                    {createError && <div style={{ fontSize: 11, color: "#ef4444" }}>{createError}</div>}
                  </div>
                )}

                {createTab === "package" && (
                  <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                    <input value={newPackage.name} onChange={e => setNewPackage({ ...newPackage, name: e.target.value })} placeholder="Package name" style={inputStyle} />
                    <input value={newPackage.price} onChange={e => setNewPackage({ ...newPackage, price: e.target.value })} placeholder="Price (e.g. KES 5,000/mo)" style={inputStyle} />
                    <input value={newPackage.features} onChange={e => setNewPackage({ ...newPackage, features: e.target.value })} placeholder="Features (e.g. 10 Modules · 25 Users)" style={inputStyle} />
                    <button onClick={handleCreatePackage} className={s.btnGold} style={{ marginTop: "4px" }}>Create Package</button>
                    {createError && <div style={{ fontSize: 11, color: "#ef4444" }}>{createError}</div>}
                  </div>
                )}

                {createTab === "offer" && (
                  <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                    <input placeholder="Offer title" style={inputStyle} />
                    <input placeholder="Discount (e.g. 20%)" style={inputStyle} />
                    <select style={inputStyle}>
                      <option>All Organizations</option>
                      {orgList.map((o, i) => <option key={i}>{o.name}</option>)}
                    </select>
                    <input placeholder="Expiry date" style={inputStyle} />
                    <button className={s.btnGold} style={{ marginTop: "4px" }}>Create Offer</button>
                  </div>
                )}
              </>
            )}

            {section === "broadcast" && (
              <>
                <div>
                  <h2 style={{ fontSize: "18px", fontWeight: 700 }}>Broadcast Message</h2>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>Send a message to one or all organizations</p>
                </div>

                <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px" }}>
                  {broadcastSent ? (
                    <div style={{ textAlign: "center", padding: "32px 0" }}>
                      <div style={{ fontSize: "32px", marginBottom: "8px" }}>✅</div>
                      <div style={{ fontSize: "14px", color: "var(--green)", fontWeight: 600 }}>Broadcast sent!</div>
                      <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>Delivered to {broadcastTarget}</div>
                      <button onClick={() => setBroadcastSent(false)} className={s.btnGold} style={{ marginTop: "16px", width: "auto", padding: "8px 24px" }}>Send Another</button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      <select value={broadcastTarget} onChange={e => setBroadcastTarget(e.target.value)} style={inputStyle}>
                        <option>All Organizations</option>
                        {orgList.map((o, i) => <option key={i}>{o.name}</option>)}
                      </select>
                      <textarea
                        value={broadcastMsg}
                        onChange={e => setBroadcastMsg(e.target.value)}
                        placeholder="Type your message..."
                        rows={6}
                        style={{ ...inputStyle, resize: "none" }}
                      />
                      <button onClick={sendBroadcast} className={s.btnGold}>Send Broadcast</button>
                    </div>
                  )}
                </div>
              </>
            )}

            {section === "alerts" && (
              <>
                <div>
                  <h2 style={{ fontSize: "18px", fontWeight: 700 }}>Alerts</h2>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>Platform-level items that need your attention</p>
                </div>

                <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px" }}>
                  {alertList.length === 0 && (
                    <div style={{ fontSize: "13px", color: "var(--text-muted)", textAlign: "center", padding: "24px 0" }}>
                      Nothing needs attention right now.
                    </div>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {alertList.map((a) => (
                      <div key={a.id} style={{ display: "flex", gap: "10px", padding: "12px", borderRadius: "10px", background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                        <span style={{ fontSize: "16px" }}>{a.icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: "13px", color: a.color, fontWeight: 600 }}>{a.text}</div>
                          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>{a.time}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}