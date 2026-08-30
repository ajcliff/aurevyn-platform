"use client";

import { useEffect, useRef, useState } from "react";
import { useEngine } from "@/lib/runtime/EngineContext";
import {
  getOrgSettings,
  updateOrgSettings,
  uploadOrgLogo,
  getOrgLogoUrl,
  type OrgSettings,
} from "@/lib/orgSettings";

const THEMES: { id: OrgSettings["theme"]; name: string; description: string; base: string; accent: string }[] = [
  { id: "rift-valley", name: "Rift Valley", description: "Aubergine and gold", base: "#1A0F14", accent: "#C9A227" },
  { id: "savannah-dusk", name: "Savannah Dusk", description: "Indigo-navy and coral", base: "#0B0E1A", accent: "#E15B4D" },
  { id: "highland-tea", name: "Highland Tea", description: "Forest green and copper", base: "#0D1410", accent: "#C87F3B" },
  { id: "zanzibar-spice", name: "Zanzibar Spice", description: "Parchment and clove, light mode", base: "#F2E8D5", accent: "#5B3A29" },
];

export default function SettingsPage() {
  const { organization, installedEngines } = useEngine();

  const [settings, setSettings] = useState<OrgSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [savingTheme, setSavingTheme] = useState(false);

  const [businessName, setBusinessName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [defaultVatRate, setDefaultVatRate] = useState("16");
  const [defaultWhtRate, setDefaultWhtRate] = useState("0");
  const [invoicePrefix, setInvoicePrefix] = useState("INV-");

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const data = await getOrgSettings(organization.id);
    setSettings(data);
    setBusinessName(data.business_name || "");
    setBusinessAddress(data.business_address || "");
    setBusinessPhone(data.business_phone || "");
    setDefaultVatRate(String(data.default_vat_rate));
    setDefaultWhtRate(String(data.default_wht_rate));
    setInvoicePrefix(data.invoice_prefix);
    setLogoUrl(getOrgLogoUrl(data.logo_path));
    setLoading(false);
  }

  async function handleSave() {
    if (!invoicePrefix.trim()) {
      alert("Invoice prefix cannot be empty");
      return;
    }

    try {
      setSaving(true);
      await updateOrgSettings(organization.id, {
        business_name: businessName || null,
        business_address: businessAddress || null,
        business_phone: businessPhone || null,
        default_vat_rate: Number(defaultVatRate) || 0,
        default_wht_rate: Number(defaultWhtRate) || 0,
        invoice_prefix: invoicePrefix,
      });
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleThemeChange(theme: OrgSettings["theme"]) {
    setSavingTheme(true);
    document.documentElement.setAttribute("data-theme", theme); // instant preview
    await updateOrgSettings(organization.id, { theme });
    setSavingTheme(false);
    load();
  }

  async function handleLogoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert("Logo must be under 2MB");
      return;
    }

    try {
      setUploadingLogo(true);
      const url = await uploadOrgLogo(organization.id, file);
      if (url) setLogoUrl(url);
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  if (loading) return <div>Loading settings...</div>;

  return (
    <div style={{ overflowY: "auto", height: "100%" }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>System Settings</h1>
        <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
          Business profile and defaults used across Invoices, POS, and Finance for {organization.name}.
        </p>
      </div>

      <div
        className="card"
        style={{ ...cardStyle, marginBottom: 20, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}
      >
        <div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Package</div>
          <div style={{ fontWeight: 600 }}>{organization.package}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Status</div>
          <div style={{ fontWeight: 600, textTransform: "capitalize" }}>{organization.status}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Location</div>
          <div style={{ fontWeight: 600 }}>{organization.location}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Active Engines</div>
          <div style={{ fontWeight: 600 }}>{installedEngines.length}</div>
        </div>
      </div>

      <div className="card" style={{ ...cardStyle, marginBottom: 20 }}>
        <h3 style={{ marginBottom: 4 }}>Theme</h3>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
          Applies across your whole organization space. Changes for everyone, not just you.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
          {THEMES.map((t) => {
            const active = settings?.theme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => handleThemeChange(t.id)}
                disabled={savingTheme}
                style={{
                  textAlign: "left",
                  background: t.base,
                  border: active ? `2px solid ${t.accent}` : "1px solid var(--border)",
                  borderRadius: 12,
                  padding: 12,
                  cursor: savingTheme ? "default" : "pointer",
                  opacity: savingTheme && !active ? 0.6 : 1,
                }}
              >
                <div style={{ display: "flex", gap: 5, marginBottom: 8 }}>
                  <div style={{ width: 14, height: 14, borderRadius: 4, background: t.accent }} />
                  <div style={{ width: 14, height: 14, borderRadius: 4, background: t.base, border: "1px solid rgba(255,255,255,0.15)" }} />
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: t.id === "zanzibar-spice" ? "#2B1D14" : "#F0E6D8" }}>
                  {t.name}{active && " ✓"}
                </div>
                <div style={{ fontSize: 10.5, color: t.id === "zanzibar-spice" ? "#6B5745" : "#A08B94" }}>
                  {t.description}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="card" style={cardStyle}>
        <h3 style={{ marginBottom: 16 }}>Business Profile</h3>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
          Shown on Invoice and Receipt PDFs.
        </p>

        <div style={{ display: "flex", gap: 20, alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <div
              style={{
                width: 90,
                height: 90,
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "var(--bg-base)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              {logoUrl ? (
                <img src={logoUrl} alt="Business logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              ) : (
                <span style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", padding: 8 }}>No logo</span>
              )}
            </div>
            <button
              style={{ ...ghostButtonSmall, marginTop: 8, width: 90 }}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingLogo}
            >
              {uploadingLogo ? "Uploading..." : "Upload"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleLogoSelect}
            />
          </div>

          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Business Name</label>
            <input
              placeholder="e.g. Retail Hub Ltd"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              style={inputStyle}
            />

            <label style={labelStyle}>Address</label>
            <input
              placeholder="e.g. Babadogo, Nairobi"
              value={businessAddress}
              onChange={(e) => setBusinessAddress(e.target.value)}
              style={inputStyle}
            />

            <label style={labelStyle}>Phone</label>
            <input
              type="tel"
              placeholder="e.g. +254 7XX XXX XXX"
              value={businessPhone}
              onChange={(e) => setBusinessPhone(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      <div className="card" style={{ ...cardStyle, marginTop: 16 }}>
        <h3 style={{ marginBottom: 16 }}>Tax Defaults</h3>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
          Pre-filled when creating a new Invoice — can still be changed per invoice.
        </p>

        <label style={labelStyle}>Default VAT Rate (%)</label>
        <input
          type="number"
          value={defaultVatRate}
          onChange={(e) => setDefaultVatRate(e.target.value)}
          style={inputStyle}
        />

        <label style={labelStyle}>Default Withholding Tax Rate (%)</label>
        <input
          type="number"
          value={defaultWhtRate}
          onChange={(e) => setDefaultWhtRate(e.target.value)}
          style={inputStyle}
        />
      </div>

      <div className="card" style={{ ...cardStyle, marginTop: 16 }}>
        <h3 style={{ marginBottom: 16 }}>Invoice Numbering</h3>

        <label style={labelStyle}>Invoice Prefix</label>
        <input
          placeholder="e.g. INV-"
          value={invoicePrefix}
          onChange={(e) => setInvoicePrefix(e.target.value)}
          style={inputStyle}
        />
        <p style={{ fontSize: 11, color: "var(--text-muted)" }}>
          Next invoice would be numbered like: {invoicePrefix}0001
        </p>
      </div>

      <button style={{ ...buttonGold, marginTop: 20 }} onClick={handleSave} disabled={saving}>
        {saving ? "Saving..." : "Save Settings"}
      </button>
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
  color: "var(--gold-contrast)",
  border: "none",
  borderRadius: 10,
  padding: "9px 18px",
  fontWeight: 700,
  fontSize: 12,
  cursor: "pointer",
};

const ghostButtonSmall: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--text-secondary)",
  fontSize: 11,
  cursor: "pointer",
};