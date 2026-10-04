"use client";

import { useEffect, useState } from "react";
import { getOrganizations, createOrganization, type Organization } from "@/lib/organizations";
import { getBlueprintOptions, type BlueprintOption } from "@/lib/blueprintsList";
import { logActivity } from "@/lib/activity";
import { createNotification } from "@/lib/notifications";
import { getPlatformAlerts, type PlatformAlert } from "@/lib/platformAlerts";
import { formatError } from "@/lib/errorFormat";
import { logError } from "@/lib/errorLog";
import { getEngines, getBlueprintEngines, activateEngine, type Engine } from "@/lib/engines";
import f from "@/styles/founder.module.css";

type Section = "create" | "broadcast" | "alerts";
const TABS: { id: Section; label: string }[] = [
  { id: "create", label: "Quick create" },
  { id: "broadcast", label: "Broadcast" },
  { id: "alerts", label: "Alerts" },
];

const kes = (n: number) => `KES ${Math.round(n).toLocaleString("en-KE")}`;

export default function ActionsPage() {
  const [section, setSection] = useState<Section>("create");

  const [orgList, setOrgList] = useState<Organization[]>([]);
  const [blueprintOptions, setBlueprintOptions] = useState<BlueprintOption[]>([]);
  const [alertList, setAlertList] = useState<PlatformAlert[]>([]);
  const [enginesList, setEnginesList] = useState<Engine[]>([]);
  const [selectedEngineIds, setSelectedEngineIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [newOrg, setNewOrg] = useState({ name: "", location: "", blueprintId: "" });
  const [creatingOrg, setCreatingOrg] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [broadcastTarget, setBroadcastTarget] = useState("All organizations");
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastSent, setBroadcastSent] = useState(false);
  const [broadcastError, setBroadcastError] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      const [orgs, blueprints, alerts, engines] = await Promise.all([
        getOrganizations(), getBlueprintOptions(), getPlatformAlerts(), getEngines(),
      ]);
      setOrgList(orgs);
      setBlueprintOptions(blueprints);
      setAlertList(alerts);
      setEnginesList(engines);
    } catch (err) {
      const message = formatError(err);
      setLoadError(message);
      logError({ source: "ActionsPage", message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!newOrg.blueprintId) { setSelectedEngineIds(new Set()); return; }
    getBlueprintEngines(newOrg.blueprintId).then(ids => setSelectedEngineIds(new Set(ids)));
  }, [newOrg.blueprintId]);

  async function createOrg() {
    if (!newOrg.name.trim() || !newOrg.blueprintId) {
      setCreateError("Fill in the organization name and industry blueprint.");
      return;
    }
    setCreateError(null);
    setCreatingOrg(true);
    try {
      const created = await createOrganization({
        name: newOrg.name.trim(),
        location: newOrg.location.trim(),
        status: "operational",
        revenue: "KES 0",
        package: "Free trial",
      });

      for (const engineId of selectedEngineIds) {
        await activateEngine(created.id, engineId, "founder");
      }

      await logActivity({ icon: "🏢", title: "New organization registered", sub: created.name });
      await createNotification("new_org", "New organization registered", `${created.name} was added via quick create`);

      setOrgList(prev => [...prev, created]);
      setNewOrg({ name: "", location: "", blueprintId: "" });
      setSelectedEngineIds(new Set());
    } catch (err) {
      const message = formatError(err);
      setCreateError(message);
      logError({ source: "ActionsPage/createOrg", message });
    } finally {
      setCreatingOrg(false);
    }
  }

  async function sendBroadcast() {
    if (!broadcastMsg.trim()) {
      setBroadcastError("Write a message first.");
      return;
    }
    setBroadcastError(null);
    setBroadcasting(true);
    try {
      await logActivity({ icon: "📣", title: `Broadcast: ${broadcastTarget}`, sub: broadcastMsg.trim() });
      await createNotification("broadcast", `Broadcast sent to ${broadcastTarget}`, broadcastMsg.trim());
      setBroadcastSent(true);
      setBroadcastMsg("");
    } catch (err) {
      setBroadcastError(formatError(err));
    } finally {
      setBroadcasting(false);
    }
  }

  return (
    <div className={`page-shell ${f.root}`}>
      <main className="page-main">
        <div className={f.page}>
          <div className={f.top}>
            <div>
              <p className={f.greeting}>Quick actions</p>
              <h1 className={f.headline}>Create, notify, and keep an eye on the platform.</h1>
            </div>
          </div>

          {loadError && (
            <div className={f.empty}><strong>Couldn&apos;t load quick actions.</strong><div><button className={f.secondary} onClick={load}>Retry</button></div></div>
          )}

          <div className={f.tabs} role="tablist" aria-label="Quick action sections">
            {TABS.map(t => (
              <button key={t.id} role="tab" id={`act-tab-${t.id}`} aria-selected={section === t.id} aria-controls="act-panel" className={f.tab} onClick={() => setSection(t.id)}>
                {t.label}{t.id === "alerts" && alertList.length > 0 ? ` (${alertList.length})` : ""}
              </button>
            ))}
          </div>

          <div id="act-panel" role="tabpanel" aria-labelledby={`act-tab-${section}`} className={f.tabPanel} style={{ paddingTop: 8, maxWidth: 560 }}>
            {loading ? (
              <p className={f.status} role="status">Loading…</p>
            ) : (
              <>
                {section === "create" && (
                  <div className={f.stack}>
                    {(
                      <div className={f.stack}>
                        <div className={f.field}>
                          <label htmlFor="qc-name">Organization name</label>
                          <input id="qc-name" className={f.input} value={newOrg.name} onChange={e => setNewOrg({ ...newOrg, name: e.target.value })} placeholder="Kilimani Grocers" />
                        </div>
                        <div className={f.field}>
                          <label htmlFor="qc-loc">Location</label>
                          <input id="qc-loc" className={f.input} value={newOrg.location} onChange={e => setNewOrg({ ...newOrg, location: e.target.value })} placeholder="Nairobi, KE" />
                        </div>
                        <div className={f.field}>
                          <label htmlFor="qc-bp">Industry blueprint</label>
                          <select id="qc-bp" className={f.input} value={newOrg.blueprintId} onChange={e => setNewOrg({ ...newOrg, blueprintId: e.target.value })}>
                            <option value="">Select industry…</option>
                            {blueprintOptions.map(b => <option key={b.id} value={b.id}>{b.name} ({b.industry})</option>)}
                          </select>
                        </div>

                        {newOrg.blueprintId && (
                          <div className={f.field}>
                            <label>Engines this org needs — adjust freely</label>
                            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 220, overflowY: "auto", background: "var(--bg-elevated)", border: "1px solid var(--rule)", borderRadius: 8, padding: 10 }}>
                              {enginesList.map(engine => {
                                const checked = selectedEngineIds.has(engine.id);
                                return (
                                  <label key={engine.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, cursor: "pointer" }}>
                                    <input type="checkbox" checked={checked} onChange={() => setSelectedEngineIds(prev => {
                                      const next = new Set(prev);
                                      if (checked) next.delete(engine.id); else next.add(engine.id);
                                      return next;
                                    })} />
                                    <span>{engine.icon}</span>
                                    <span>{engine.name}</span>
                                    <span style={{ color: "var(--text-secondary)", fontSize: 10, marginLeft: "auto" }}>{engine.category}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <button className={f.primary} onClick={createOrg} disabled={creatingOrg}>{creatingOrg ? "Creating…" : "Create organization"}</button>
                        {createError && <div className={f.formError} role="alert">{createError}</div>}
                      </div>
                    )}

                  </div>
                )}

                {section === "broadcast" && (
                  <div className={f.stack}>
                    <p className={f.hint}>
                      This logs a broadcast to your own activity feed and notifications — organizations don&apos;t have a way to receive it yet, so use this as a record of what you meant to announce rather than a live delivery channel.
                    </p>
                    {broadcastSent ? (
                      <div style={{ textAlign: "center", padding: "32px 0" }}>
                        <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                        <div style={{ fontSize: 14, color: "var(--green)", fontWeight: 600 }}>Logged.</div>
                        <div className={f.hint} style={{ marginTop: 4 }}>Recorded for {broadcastTarget}.</div>
                        <button className={f.secondary} style={{ marginTop: 16 }} onClick={() => setBroadcastSent(false)}>Log another</button>
                      </div>
                    ) : (
                      <>
                        <div className={f.field}>
                          <label htmlFor="bc-target">Target</label>
                          <select id="bc-target" className={f.input} value={broadcastTarget} onChange={e => setBroadcastTarget(e.target.value)}>
                            <option>All organizations</option>
                            {orgList.map(o => <option key={o.id}>{o.name}</option>)}
                          </select>
                        </div>
                        <div className={f.field}>
                          <label htmlFor="bc-msg">Message</label>
                          <textarea id="bc-msg" className={f.input} rows={6} style={{ resize: "vertical" }} value={broadcastMsg} onChange={e => setBroadcastMsg(e.target.value)} placeholder="Type your message…" />
                        </div>
                        <button className={f.primary} onClick={sendBroadcast} disabled={broadcasting}>{broadcasting ? "Logging…" : "Log broadcast"}</button>
                        {broadcastError && <div className={f.formError} role="alert">{broadcastError}</div>}
                      </>
                    )}
                  </div>
                )}

                {section === "alerts" && (
                  alertList.length === 0 ? (
                    <div className={f.empty}><strong>Nothing needs attention right now.</strong>Flagged organizations and stale invites will show up here.</div>
                  ) : (
                    <div className={f.inbox}>
                      {alertList.map(a => (
                        <div key={a.id} className={f.inboxItem} style={{ cursor: "default" }}>
                          <span className={f.inboxIcon} aria-hidden="true">{a.icon}</span>
                          <span className={f.inboxMain}>
                            <span className={f.inboxFrom} style={{ color: a.color }}>{a.text}</span>
                          </span>
                          {a.time && <span className={f.inboxTime}>{a.time}</span>}
                        </div>
                      ))}
                    </div>
                  )
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
