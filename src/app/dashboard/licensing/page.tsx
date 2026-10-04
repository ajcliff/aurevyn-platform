"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { formatError } from "@/lib/errorFormat";
import f from "@/styles/founder.module.css";

type OrgOption = { id: string; name: string };
type EngineRow = {
  id: string; slug: string; name: string; enabled: boolean; licensedSeats: number;
  users: { userId: string; name: string | null; email: string | null }[];
};
type Offer = {
  id: string; kind: "discount_percent" | "discount_fixed" | "free_seats" | "trial_extension";
  engine_id: string | null; value: number; note: string | null; status: "active" | "revoked"; created_at: string;
};
type Overview = {
  org: { id: string; name: string; trial_ends_at: string | null; package_confirmed_at: string | null } | null;
  engines: EngineRow[];
  offers: Offer[];
};

const KIND_LABEL: Record<Offer["kind"], string> = {
  discount_percent: "Percent discount",
  discount_fixed: "Fixed discount (KES)",
  free_seats: "Free seats",
  trial_extension: "Trial extension (days)",
};

function describe(o: Offer, engines: EngineRow[]) {
  const engine = engines.find(e => e.id === o.engine_id)?.name;
  const scope = engine ?? "all engines";
  switch (o.kind) {
    case "discount_percent": return `${o.value}% off · ${scope}`;
    case "discount_fixed": return `KES ${Number(o.value).toLocaleString()} off · ${scope}`;
    case "free_seats": return `${o.value} free seat${o.value === 1 ? "" : "s"} · ${scope}`;
    case "trial_extension": return `+${o.value} trial day${o.value === 1 ? "" : "s"}`;
  }
}

async function call(method: "GET" | "POST", orgId: string, body?: Record<string, unknown>) {
  const res = method === "GET"
    ? await fetch(`/api/founder/licensing?orgId=${orgId}`)
    : await fetch("/api/founder/licensing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orgId, ...body }) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Request failed.");
  return json;
}

export default function LicensingPage() {
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [orgId, setOrgId] = useState("");
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seatInputs, setSeatInputs] = useState<Record<string, string>>({});
  const [open, setOpen] = useState<string | null>(null);

  const [kind, setKind] = useState<Offer["kind"]>("discount_percent");
  const [offerEngine, setOfferEngine] = useState("");
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    createClient().from("organizations").select("id, name").order("name").then(({ data: rows, error: e }) => {
      if (e) { setError(formatError(e)); return; }
      setOrgs(rows ?? []);
      if (rows?.length) setOrgId(rows[0].id);
    });
  }, []);

  async function load(id = orgId) {
    if (!id) return;
    setLoading(true); setError(null);
    try {
      const d: Overview = await call("GET", id);
      setData(d);
      setSeatInputs(Object.fromEntries(d.engines.map(e => [e.slug, String(e.licensedSeats)])));
    } catch (e) { setError(formatError(e)); }
    finally { setLoading(false); }
  }
  useEffect(() => { if (orgId) load(orgId); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [orgId]);

  async function act(body: Record<string, unknown>) {
    setBusy(true); setError(null);
    try { await call("POST", orgId, body); await load(); return true; }
    catch (e) { setError(formatError(e)); return false; }
    finally { setBusy(false); }
  }

  async function createOffer() {
    const ok = await act({ action: "create_offer", kind, engineSlug: kind === "trial_extension" ? null : offerEngine || null, value: Number(value), note });
    if (ok) { setValue(""); setNote(""); }
  }

  const engines = data?.engines ?? [];
  const activeOffers = (data?.offers ?? []).filter(o => o.status === "active");
  const pastOffers = (data?.offers ?? []).filter(o => o.status !== "active");
  const needsEngine = kind === "free_seats";
  const hidesEngine = kind === "trial_extension";

  return (
    <div className={`page-shell ${f.root}`}>
      <main className="page-main">
        <div className={f.page}>
          <div className={f.top}>
            <div>
              <p className={f.greeting}>Licensing</p>
              <h1 className={f.headline}>{data?.org?.name ?? "Pick an organization"}</h1>
              {data?.org?.trial_ends_at && !data.org.package_confirmed_at && (
                <p className={f.sectionSub} style={{ marginTop: 8 }}>
                  Trial ends {new Date(data.org.trial_ends_at).toLocaleString()}
                </p>
              )}
            </div>
            <div className={f.actions}>
              <select className={`${f.input} ${f.select}`} value={orgId} onChange={e => setOrgId(e.target.value)} aria-label="Organization">
                {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
          </div>

          {error && <div className={f.formError} role="alert">{error}</div>}
          {orgs.length === 0 && !loading && <div className={f.empty}><strong>No organizations yet.</strong>Register one to manage its licenses.</div>}

          {data && (
            <>
              <section>
                <div className={f.sectionHead}>
                  <h2 className={f.sectionTitle}>Engine licenses</h2>
                  <span className={f.sectionSub}>Set seats to 0 to revoke an engine entirely</span>
                </div>
                {engines.map(e => (
                  <div key={e.id}>
                    <div className={f.row}>
                      <button className={f.rowMain} onClick={() => setOpen(open === e.slug ? null : e.slug)} aria-expanded={open === e.slug}>
                        <span className={f.rowName}>{e.name}</span>
                        <span className={f.rowSub}>{e.enabled ? `${e.users.length} of ${e.licensedSeats} seats used` : "Not licensed"}</span>
                      </button>
                      <input
                        className={f.input} style={{ width: 80 }} type="number" min={0} inputMode="numeric"
                        aria-label={`${e.name} seats`}
                        value={seatInputs[e.slug] ?? ""} onChange={ev => setSeatInputs(p => ({ ...p, [e.slug]: ev.target.value }))}
                      />
                      <button className={f.primary} disabled={busy || seatInputs[e.slug] === String(e.licensedSeats)}
                        onClick={() => act({ action: "set_seats", engineSlug: e.slug, seats: Number(seatInputs[e.slug]) })}>
                        Set
                      </button>
                      {e.enabled && (
                        <button className={f.secondary} disabled={busy}
                          onClick={() => act({ action: "set_seats", engineSlug: e.slug, seats: 0 })}>
                          Revoke
                        </button>
                      )}
                    </div>
                    {open === e.slug && (
                      <div style={{ padding: "4px 0 12px 12px" }}>
                        {e.users.length === 0 ? (
                          <p className={f.sectionSub}>No users assigned yet.</p>
                        ) : e.users.map(u => (
                          <div key={u.userId} className={f.row} style={{ padding: "8px 0" }}>
                            <div className={f.rowMain} style={{ cursor: "default" }}>
                              <span className={f.rowName}>{u.name ?? u.email ?? u.userId}</span>
                              {u.name && <span className={f.rowSub}>{u.email}</span>}
                            </div>
                            <button className={f.secondary} disabled={busy}
                              onClick={() => act({ action: "revoke_user", userId: u.userId, engineId: e.id })}>
                              Remove seat
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </section>

              <section>
                <div className={f.sectionHead}>
                  <h2 className={f.sectionTitle}>Offers</h2>
                  <span className={f.sectionSub}>Discounts apply to the next invoice an org generates</span>
                </div>

                <div className={f.row} style={{ flexWrap: "wrap", alignItems: "flex-end" }}>
                  <div className={f.field}>
                    <label htmlFor="o-kind">Type</label>
                    <select id="o-kind" className={`${f.input} ${f.select}`} value={kind} onChange={e => setKind(e.target.value as Offer["kind"])}>
                      {Object.entries(KIND_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                    </select>
                  </div>
                  {!hidesEngine && (
                    <div className={f.field}>
                      <label htmlFor="o-engine">Engine</label>
                      <select id="o-engine" className={`${f.input} ${f.select}`} value={offerEngine} onChange={e => setOfferEngine(e.target.value)}>
                        {!needsEngine && <option value="">All engines</option>}
                        {needsEngine && <option value="">Choose…</option>}
                        {engines.map(e => <option key={e.id} value={e.slug}>{e.name}</option>)}
                      </select>
                    </div>
                  )}
                  <div className={f.field}>
                    <label htmlFor="o-val">Value</label>
                    <input id="o-val" className={f.input} style={{ width: 100 }} type="number" min={0} value={value} onChange={e => setValue(e.target.value)} />
                  </div>
                  <div className={f.field} style={{ flex: 1, minWidth: 160 }}>
                    <label htmlFor="o-note">Note (optional)</label>
                    <input id="o-note" className={f.input} value={note} onChange={e => setNote(e.target.value)} placeholder="Why this offer" />
                  </div>
                  <button className={f.primary} disabled={busy || !(Number(value) > 0) || (needsEngine && !offerEngine)} onClick={createOffer}>
                    Add offer
                  </button>
                </div>

                {activeOffers.length === 0 ? (
                  <p className={f.empty}>No active offers for this organization.</p>
                ) : activeOffers.map(o => (
                  <div key={o.id} className={f.row}>
                    <div className={f.rowMain} style={{ cursor: "default" }}>
                      <span className={f.rowName}>{describe(o, engines)}</span>
                      <span className={f.rowSub}>{[o.note, new Date(o.created_at).toLocaleDateString()].filter(Boolean).join(" · ")}</span>
                    </div>
                    <button className={f.secondary} disabled={busy} onClick={() => act({ action: "revoke_offer", offerId: o.id })}>Revoke</button>
                  </div>
                ))}

                {pastOffers.length > 0 && (
                  <p className={f.sectionSub} style={{ marginTop: 14 }}>
                    Revoked: {pastOffers.map(o => describe(o, engines)).join(" · ")}
                  </p>
                )}
              </section>
            </>
          )}
          {loading && <p className={f.status} role="status">Loading…</p>}
        </div>
      </main>
    </div>
  );
}
