"use client";

import { useState } from "react";
import { saveCompanyProfile, type CompanyProfile } from "@/lib/companyProfile";
import f from "@/styles/founder.module.css";
import c from "@/styles/company.module.css";

type FormState = {
  legal_name: string; trading_name: string; registration_number: string; tax_pin: string; company_type: string; industry: string;
  website: string; official_email: string; phone: string; registered_address: string; country: string; currency: string; timezone: string; description: string;
};

const fromProfile = (p: CompanyProfile | null): FormState => ({
  legal_name: p?.legal_name ?? "", trading_name: p?.trading_name ?? "", registration_number: p?.registration_number ?? "", tax_pin: p?.tax_pin ?? "",
  company_type: p?.company_type ?? "", industry: p?.industry ?? "", website: p?.website ?? "", official_email: p?.official_email ?? "",
  phone: p?.phone ?? "", registered_address: p?.registered_address ?? "", country: p?.country ?? "Kenya", currency: p?.currency ?? "KES",
  timezone: p?.timezone ?? "Africa/Nairobi", description: p?.description ?? "",
});

const COMPLETENESS: { key: keyof FormState; label: string }[] = [
  { key: "legal_name", label: "legal name" }, { key: "registration_number", label: "registration number" }, { key: "tax_pin", label: "KRA PIN" },
  { key: "company_type", label: "company type" }, { key: "industry", label: "industry" }, { key: "description", label: "description" },
  { key: "official_email", label: "official email" }, { key: "phone", label: "phone" }, { key: "registered_address", label: "registered address" }, { key: "website", label: "website" },
];

type Props = {
  profile: CompanyProfile | null;
  setProfile: (p: CompanyProfile) => void;
  onError: (err: unknown, source: string) => void;
};

export default function Profile({ profile, setProfile, onError }: Props) {
  const [editing, setEditing] = useState(!profile);
  const [form, setForm] = useState<FormState>(() => fromProfile(profile));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  async function save() {
    if (!form.legal_name.trim()) { setError("The legal name is required."); return; }
    setError(null);
    setSaving(true);
    try {
      const saved = await saveCompanyProfile(form, profile?.id);
      setProfile(saved);
      setEditing(false);
    } catch (err) {
      onError(err, "CompanyPage/saveProfile");
      setError("The profile couldn't be saved. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const current = fromProfile(profile);
  const filled = COMPLETENESS.filter(x => current[x.key]);
  const missing = COMPLETENESS.filter(x => !current[x.key]);
  const pct = Math.round((filled.length / COMPLETENESS.length) * 100);

  const fld = (id: string, label: string, k: keyof FormState, o: { type?: string; placeholder?: string; wide?: boolean } = {}) => (
    <div key={id} className={`${f.field} ${o.wide ? c.wide : ""}`}>
      <label htmlFor={id}>{label}</label>
      <input id={id} className={f.input} type={o.type ?? "text"} value={form[k]} onChange={set(k)} placeholder={o.placeholder} />
    </div>
  );

  const def = (label: string, value: string | null | undefined, missingText: string) => (
    <div><dt>{label}</dt><dd>{value ? value : <span className={c.missing}>{missingText}</span>}</dd></div>
  );

  if (editing) {
    return (
      <div className={f.tabPanel}>
        <div className={f.sectionHead}>
          <div>
            <h2 className={f.sectionTitle}>{profile ? "Edit company profile" : "Set up the company profile"}</h2>
            <p className={f.sectionSub} style={{ marginTop: 4 }}>AUREVYN&apos;s own details, separate from any customer organization.</p>
          </div>
        </div>

        <div className={c.profileGrid}>
          <div><h3>Identity</h3><p className={c.sub}>How the company is named and described.</p></div>
          <div className={c.formGrid}>
            {fld("pf-legal", "Legal name", "legal_name", {wide: true})}
            {fld("pf-trading", "Trading name", "trading_name")}
            {fld("pf-type", "Company type", "company_type", {placeholder: "Private limited company"})}
            {fld("pf-industry", "Industry", "industry", {placeholder: "Software"})}
            <div className={`${f.field} ${c.wide}`}>
              <label htmlFor="pf-desc">What the company does</label>
              <textarea id="pf-desc" className={f.input} rows={3} value={form.description} onChange={set("description")} />
            </div>
          </div>
        </div>

        <div className={c.profileGrid}>
          <div><h3>Registration and tax</h3><p className={c.sub}>Used on invoices and statutory filings.</p></div>
          <div className={c.formGrid}>
            {fld("pf-reg", "Registration number", "registration_number")}
            {fld("pf-pin", "KRA PIN", "tax_pin")}
          </div>
        </div>

        <div className={c.profileGrid}>
          <div><h3>Contact</h3><p className={c.sub}>Where people reach the company.</p></div>
          <div className={c.formGrid}>
            {fld("pf-email", "Official email", "official_email", {type: "email"})}
            {fld("pf-phone", "Phone", "phone", {type: "tel"})}
            {fld("pf-web", "Website", "website", {type: "url", placeholder: "https://", wide: true})}
            <div className={`${f.field} ${c.wide}`}>
              <label htmlFor="pf-addr">Registered address</label>
              <textarea id="pf-addr" className={f.input} rows={2} value={form.registered_address} onChange={set("registered_address")} />
            </div>
          </div>
        </div>

        <div className={c.profileGrid} style={{ borderBottom: 0 }}>
          <div><h3>Regional</h3><p className={c.sub}>Defaults for money and dates.</p></div>
          <div className={c.formGrid}>
            {fld("pf-country", "Country", "country")}
            {fld("pf-currency", "Currency", "currency")}
            {fld("pf-tz", "Time zone", "timezone", {wide: true})}
          </div>
        </div>

        {error && <div className={f.formError} role="alert">{error}</div>}
        <div className={f.actions}>
          <button className={f.primary} onClick={save} disabled={saving}>{saving ? "Saving…" : "Save profile"}</button>
          {profile && <button className={f.secondary} onClick={() => { setForm(fromProfile(profile)); setError(null); setEditing(false); }}>Cancel</button>}
        </div>
      </div>
    );
  }

  return (
    <div className={f.tabPanel}>
      <div className={f.sectionHead}>
        <div>
          <h2 className={f.sectionTitle}>Company profile</h2>
          <div className={c.completeness} style={{ marginTop: 8 }}>
            <div className={c.completeBar} aria-hidden="true"><span style={{ width: `${pct}%` }} /></div>
            <span>{missing.length === 0 ? "Profile complete" : `${filled.length} of ${COMPLETENESS.length} details filled. Missing: ${missing.map(m => m.label).join(", ")}.`}</span>
          </div>
        </div>
        <button className={f.secondary} onClick={() => { setForm(fromProfile(profile)); setEditing(true); }}>Edit profile</button>
      </div>

      <div className={c.profileGrid}>
        <div><h3>Identity</h3></div>
        <dl className={c.defs}>
          {def("Legal name", profile?.legal_name, "Not set")}
          {def("Trading name", profile?.trading_name, "Not set")}
          {def("Company type", profile?.company_type, "Not set")}
          {def("Industry", profile?.industry, "Not set")}
          {def("About", profile?.description, "Add a short description")}
        </dl>
      </div>
      <div className={c.profileGrid}>
        <div><h3>Registration and tax</h3></div>
        <dl className={c.defs}>
          {def("Registration number", profile?.registration_number, "Add it to keep it on file")}
          {def("KRA PIN", profile?.tax_pin, "Add it to keep it on file")}
        </dl>
      </div>
      <div className={c.profileGrid}>
        <div><h3>Contact</h3></div>
        <dl className={c.defs}>
          {def("Official email", profile?.official_email, "Not set")}
          {def("Phone", profile?.phone, "Not set")}
          {def("Website", profile?.website, "Not set")}
          {def("Registered address", profile?.registered_address, "Not set")}
        </dl>
      </div>
      <div className={c.profileGrid} style={{ borderBottom: 0 }}>
        <div><h3>Regional</h3></div>
        <dl className={c.defs}>
          {def("Country", profile?.country, "Not set")}
          {def("Currency", profile?.currency, "Not set")}
          {def("Time zone", profile?.timezone, "Not set")}
        </dl>
      </div>
    </div>
  );
}