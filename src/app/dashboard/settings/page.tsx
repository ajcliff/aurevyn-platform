"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { getFounderSettings, updateFounderSettings, type FounderSettings } from "@/lib/founderSettings";
import { getOrganizations } from "@/lib/organizations";
import { getPackages } from "@/lib/packages";
import { getInvoices } from "@/lib/invoices";
import type { ThemeName } from "@/lib/orgSettings";
import { getThemePresets, type ThemePreset } from "@/lib/themePresets";
import { applyThemeColors, applyBuiltinTheme } from "@/lib/themeColors";
import ThemePicker from "@/components/ThemePicker";
import { BUILTIN_THEMES } from "@/lib/builtinThemes";
import { formatError } from "@/lib/errorFormat";
import ConfirmDialog from "@/components/founder/ConfirmDialog";
import TypedConfirmDialog from "@/components/founder/TypedConfirmDialog";
import f from "@/styles/founder.module.css";

type Section = "profile" | "platform" | "security" | "notifications" | "danger";
const TABS: { id: Section; label: string }[] = [
  { id: "profile", label: "Profile" },
  { id: "platform", label: "Platform" },
  { id: "security", label: "Security" },
  { id: "notifications", label: "Notifications" },
  { id: "danger", label: "Danger zone" },
];

const NOTIF_LABELS: { key: keyof FounderSettings; label: string; desc: string }[] = [
  { key: "notify_new_org", label: "New organization registered", desc: "When a new org signs up on the platform" },
  { key: "notify_payment_received", label: "Payment received", desc: "When an invoice is marked paid" },
  { key: "notify_payment_overdue", label: "Payment overdue", desc: "When an invoice passes its due date unpaid" },
  { key: "notify_module_activated", label: "Module activated", desc: "When an org enables a new engine" },
  { key: "notify_system_alerts", label: "System alerts", desc: "Platform-level errors or degraded status" },
  { key: "notify_weekly_report", label: "Weekly summary report", desc: "Revenue and growth digest, once a week" },
];

export default function FounderSettingsPage() {
  const router = useRouter();
  const [section, setSection] = useState<Section>("profile");

  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [settings, setSettings] = useState<FounderSettings | null>(null);

  const [fullName, setFullName] = useState("");
  const [location, setLocation] = useState("");
  const [platformName, setPlatformName] = useState("");
  const [defaultCurrency, setDefaultCurrency] = useState("");
  const [defaultPackage, setDefaultPackage] = useState("");
  const [timezone, setTimezone] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingTheme, setSavingTheme] = useState(false);
  const [savedFlash, setSavedFlash] = useState<Section | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [exporting, setExporting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [presets, setPresets] = useState<ThemePreset[]>([]);

  const flashTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    load();
    return () => { if (flashTimeout.current) clearTimeout(flashTimeout.current); };
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      if (!user) throw new Error("Not signed in.");

      setUserId(user.id);
      setEmail(user.email ?? "");

      const [data, orgPresets] = await Promise.all([getFounderSettings(user.id), getThemePresets()]);
      setSettings(data);
      setPresets(orgPresets);
      setFullName(data.full_name ?? "");
      setLocation(data.location ?? "");
      setPlatformName(data.platform_name);
      setDefaultCurrency(data.default_currency);
      setDefaultPackage(data.default_package);
      setTimezone(data.timezone);
    } catch (err) {
      setError(formatError(err));
    } finally {
      setLoading(false);
    }
  }

  function flashSaved(sec: Section) {
    setSavedFlash(sec);
    if (flashTimeout.current) clearTimeout(flashTimeout.current);
    flashTimeout.current = setTimeout(() => setSavedFlash(null), 2500);
  }

  async function handleSaveProfile() {
    if (!userId) return;
    setActionError(null);
    setSaving(true);
    try {
      const updated = await updateFounderSettings(userId, { full_name: fullName || null, location: location || null });
      setSettings(updated);
      flashSaved("profile");
    } catch (err) {
      setActionError(formatError(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleSavePlatform() {
    if (!userId) return;
    setActionError(null);
    setSaving(true);
    try {
      const updated = await updateFounderSettings(userId, {
        platform_name: platformName || "AUREVYN",
        default_currency: defaultCurrency || "KES",
        default_package: defaultPackage || "Starter",
        timezone: timezone || "Africa/Nairobi",
      });
      setSettings(updated);
      flashSaved("platform");
    } catch (err) {
      setActionError(formatError(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleBuiltInThemeChange(theme: ThemeName) {
    if (!userId) return;
    setSavingTheme(true);
    applyBuiltinTheme(theme);
    try {
      const updated = await updateFounderSettings(userId, { platform_theme: theme, theme_preset_id: null });
      setSettings(updated);
    } catch (err) {
      setActionError(formatError(err));
      if (settings) applyBuiltinTheme(settings.platform_theme);
    } finally {
      setSavingTheme(false);
    }
  }

  async function handlePresetThemeChange(preset: ThemePreset) {
    if (!userId) return;
    setSavingTheme(true);
    applyThemeColors(preset);
    try {
      const updated = await updateFounderSettings(userId, { theme_preset_id: preset.id });
      setSettings(updated);
    } catch (err) {
      setActionError(formatError(err));
    } finally {
      setSavingTheme(false);
    }
  }

  async function handleToggleNotification(key: keyof FounderSettings) {
    if (!userId || !settings) return;
    setActionError(null);
    const nextValue = !settings[key];
    setSettings({ ...settings, [key]: nextValue });
    try {
      const updated = await updateFounderSettings(userId, { [key]: nextValue } as Partial<FounderSettings>);
      setSettings(updated);
    } catch (err) {
      setSettings(settings);
      setActionError(formatError(err));
    }
  }

  async function handleChangePassword() {
    setPasswordMsg(null);
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMsg({ type: "err", text: "Fill in all three password fields." });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMsg({ type: "err", text: "New password must be at least 8 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "err", text: "New password and confirmation don't match." });
      return;
    }
    setChangingPassword(true);
    try {
      const supabase = createClient();
      const { error: reauthError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
      if (reauthError) throw new Error("Current password is incorrect.");
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      setPasswordMsg({ type: "ok", text: "Password updated successfully." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordMsg({ type: "err", text: formatError(err) });
    } finally {
      setChangingPassword(false);
    }
  }

  async function handleExportData() {
    setActionError(null);
    setExporting(true);
    try {
      const [orgs, packages, invoices] = await Promise.all([getOrganizations(), getPackages(), getInvoices()]);
      const payload = { exported_at: new Date().toISOString(), organizations: orgs, packages, invoices };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `aurevyn-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setActionError(formatError(err));
    } finally {
      setExporting(false);
    }
  }

  async function handleResetPlatform() {
    setActionError(null);
    setResetting(true);
    try {
      const supabase = createClient();
      const tables = ["organizations", "invoices", "activity"];
      for (const table of tables) {
        const { error } = await supabase.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
        if (error) throw error;
      }
      setConfirmReset(false);
    } catch (err) {
      setActionError(formatError(err));
    } finally {
      setResetting(false);
    }
  }

  async function handleSignOut() {
    setActionError(null);
    setSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
    } catch (err) {
      setActionError(formatError(err));
      setSigningOut(false);
    }
  }

  return (
    <div className={`page-shell ${f.root}`}>
      <main className="page-main">
        <div className={f.page}>
          <div className={f.top}>
            <div>
              <p className={f.greeting}>Settings</p>
              <h1 className={f.headline}>{loading ? "Loading settings" : "Your founder account and platform defaults."}</h1>
            </div>
          </div>

          {error && (
            <div className={f.empty}><strong>Couldn&apos;t load settings.</strong><div><button className={f.secondary} onClick={load}>Retry</button></div></div>
          )}

          <div className={f.tabs} role="tablist" aria-label="Settings sections">
            {TABS.map(t => (
              <button key={t.id} role="tab" id={`set-tab-${t.id}`} aria-selected={section === t.id} aria-controls="set-panel" className={f.tab} onClick={() => setSection(t.id)} style={t.id === "danger" ? { color: section === t.id ? "var(--red)" : undefined } : undefined}>
                {t.label}
              </button>
            ))}
          </div>

          <div id="set-panel" role="tabpanel" aria-labelledby={`set-tab-${section}`} className={f.tabPanel} style={{ paddingTop: 8 }}>
            {loading ? (
              <p className={f.status} role="status">Loading settings…</p>
            ) : (
              <>
                {section === "profile" && (
                  <div className={f.stack} style={{ maxWidth: 440 }}>
                    <div className={f.field}>
                      <label htmlFor="pr-name">Full name</label>
                      <input id="pr-name" className={f.input} value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your name" />
                    </div>
                    <div className={f.field}>
                      <label htmlFor="pr-email">Email</label>
                      <input id="pr-email" className={f.input} value={email} disabled style={{ opacity: 0.6, cursor: "not-allowed" }} />
                    </div>
                    <div className={f.field}>
                      <label htmlFor="pr-loc">Location</label>
                      <input id="pr-loc" className={f.input} value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Nairobi, Kenya" />
                    </div>
                    <div className={f.actions}>
                      <button className={f.primary} onClick={handleSaveProfile} disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
                      {savedFlash === "profile" && <span style={{ fontSize: 12, color: "var(--green)" }}>✓ Saved</span>}
                    </div>
                    {actionError && <div className={f.formError} role="alert">{actionError}</div>}
                  </div>
                )}

                {section === "platform" && (
                  <div className={f.stack}>
                    <div className={f.stack} style={{ maxWidth: 440 }}>
                      <div className={f.field}>
                        <label htmlFor="pl-name">Platform name</label>
                        <input id="pl-name" className={f.input} value={platformName} onChange={e => setPlatformName(e.target.value)} />
                      </div>
                      <div className={f.field}>
                        <label htmlFor="pl-cur">Default currency</label>
                        <input id="pl-cur" className={f.input} value={defaultCurrency} onChange={e => setDefaultCurrency(e.target.value)} placeholder="KES" />
                      </div>
                      <div className={f.field}>
                        <label htmlFor="pl-pkg">Default package for new orgs</label>
                        <input id="pl-pkg" className={f.input} value={defaultPackage} onChange={e => setDefaultPackage(e.target.value)} placeholder="Starter" />
                      </div>
                      <div className={f.field}>
                        <label htmlFor="pl-tz">Timezone</label>
                        <input id="pl-tz" className={f.input} value={timezone} onChange={e => setTimezone(e.target.value)} placeholder="Africa/Nairobi" />
                      </div>
                      <div className={f.actions}>
                        <button className={f.primary} onClick={handleSavePlatform} disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
                        {savedFlash === "platform" && <span style={{ fontSize: 12, color: "var(--green)" }}>✓ Saved</span>}
                      </div>
                      {actionError && <div className={f.formError} role="alert">{actionError}</div>}
                    </div>

                    <section aria-labelledby="theme-title">
                      <div className={f.sectionHead}>
                        <h2 id="theme-title" className={f.sectionTitle}>Dashboard theme</h2>
                        <span className={f.sectionSub}>Only affects your founder dashboard</span>
                      </div>
                      <div style={{ marginTop: 16 }}>
                        <ThemePicker
                          builtins={[...BUILTIN_THEMES]}
                          presets={presets}
                          activeBuiltinId={settings?.platform_theme ?? null}
                          activePresetId={settings?.theme_preset_id ?? null}
                          busy={savingTheme}
                          onPickBuiltin={id => handleBuiltInThemeChange(id as ThemeName)}
                          onPickPreset={handlePresetThemeChange}
                        />
                      </div>
                    </section>
                  </div>
                )}

                {section === "security" && (
                  <div className={f.stack} style={{ maxWidth: 440 }}>
                    <div className={f.field}>
                      <label htmlFor="sec-cur">Current password</label>
                      <input id="sec-cur" className={f.input} type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
                    </div>
                    <div className={f.field}>
                      <label htmlFor="sec-new">New password</label>
                      <input id="sec-new" className={f.input} type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                    </div>
                    <div className={f.field}>
                      <label htmlFor="sec-conf">Confirm new password</label>
                      <input id="sec-conf" className={f.input} type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                    </div>
                    <button className={f.primary} style={{ alignSelf: "flex-start" }} onClick={handleChangePassword} disabled={changingPassword}>
                      {changingPassword ? "Updating…" : "Update password"}
                    </button>
                    {passwordMsg && (
                      <div style={{ fontSize: 12, color: passwordMsg.type === "ok" ? "var(--green)" : "var(--red)" }}>
                        {passwordMsg.type === "ok" ? "✓ " : ""}{passwordMsg.text}
                      </div>
                    )}
                  </div>
                )}

                {section === "notifications" && (
                  <div className={f.stack}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
                      {settings && NOTIF_LABELS.map(n => (
                        <div key={n.key} className={f.switchRow}>
                          <div>
                            <div className={f.rowName}>{n.label}</div>
                            <div className={f.rowSub}>{n.desc}</div>
                          </div>
                          <button className={f.switch} role="switch" aria-checked={!!settings[n.key]} aria-label={n.label} onClick={() => handleToggleNotification(n.key)} />
                        </div>
                      ))}
                    </div>
                    {actionError && <div className={f.formError} role="alert">{actionError}</div>}
                  </div>
                )}

                {section === "danger" && (
                  <div className={f.stack}>
                    <div className={f.notice}>
                      <div className={f.noticeMain}>
                        <div className={f.noticeTitle}>Export data</div>
                        <div className={f.noticeDesc}>Download all organizations, packages, and invoices as JSON</div>
                      </div>
                      <button className={f.secondary} onClick={handleExportData} disabled={exporting}>{exporting ? "Exporting…" : "Export"}</button>
                    </div>

                    <div className={f.notice}>
                      <div className={f.noticeMain}>
                        <div className={f.noticeTitle} style={{ color: "var(--amber)" }}>Reset platform data</div>
                        <div className={f.noticeDesc}>Wipes all organizations, invoices, and activity logs. Packages are kept.</div>
                      </div>
                      <button className={f.dangerBtn} style={{ width: "auto" }} onClick={() => setConfirmReset(true)}>Reset</button>
                    </div>

                    <div className={f.notice} style={{ borderBottom: 0 }}>
                      <div className={f.noticeMain}>
                        <div className={f.noticeTitle} style={{ color: "var(--red)" }}>Delete account</div>
                        <div className={f.noticeDesc}>Signs you out immediately. Full permanent deletion needs a server-side step that isn&apos;t built yet — your account record still exists until that&apos;s added.</div>
                      </div>
                      <button className={f.dangerBtn} style={{ width: "auto" }} onClick={() => setConfirmSignOut(true)}>Sign out</button>
                    </div>

                    {actionError && <div className={f.formError} role="alert">{actionError}</div>}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {confirmReset && (
        <TypedConfirmDialog
          title="Reset platform data?"
          message="This wipes all organizations, invoices, and activity logs. Packages and module limits are kept. This can't be undone."
          phrase="RESET"
          confirmLabel={resetting ? "Resetting…" : "Reset platform"}
          onConfirm={handleResetPlatform}
          onCancel={() => setConfirmReset(false)}
        />
      )}

      {confirmSignOut && (
        <ConfirmDialog
          title="Sign out?"
          message="This signs you out. It does not delete your account — that step isn't built yet."
          confirmLabel={signingOut ? "Signing out…" : "Sign out"}
          onConfirm={handleSignOut}
          onCancel={() => setConfirmSignOut(false)}
        />
      )}
    </div>
  );
}
