"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";
import { getFounderSettings, updateFounderSettings, type FounderSettings } from "@/lib/founderSettings";
import { getOrganizations } from "@/lib/organizations";
import { getPackages } from "@/lib/packages";
import { getInvoices } from "@/lib/invoices";
import type { ThemeName } from "@/lib/orgSettings";
import { formatError } from "@/lib/errorFormat";
import ErrorBanner from "@/components/ErrorBanner";
import { useRouter } from "next/navigation";
import s from "@/styles/layout.module.css";

type Section = "profile" | "platform" | "security" | "notifications" | "danger";

const THEMES: { id: ThemeName; name: string; description: string; base: string; accent: string }[] = [
  { id: "rift-valley", name: "Rift Valley", description: "Aubergine and gold", base: "#1A0F14", accent: "#C9A227" },
  { id: "savannah-dusk", name: "Savannah Dusk", description: "Indigo-navy and coral", base: "#0B0E1A", accent: "#E15B4D" },
  { id: "highland-tea", name: "Highland Tea", description: "Forest green and copper", base: "#0D1410", accent: "#C87F3B" },
  { id: "zanzibar-spice", name: "Zanzibar Spice", description: "Parchment and clove, light mode", base: "#F2E8D5", accent: "#5B3A29" },
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
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const flashTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    load();
    return () => {
      if (flashTimeout.current) clearTimeout(flashTimeout.current);
    };
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

      const data = await getFounderSettings(user.id);
      setSettings(data);
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
      const updated = await updateFounderSettings(userId, {
        full_name: fullName || null,
        location: location || null,
      });
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

  async function handleThemeChange(theme: ThemeName) {
    if (!userId) return;
    setSavingTheme(true);
    document.documentElement.setAttribute("data-theme", theme); // instant preview
    try {
      const updated = await updateFounderSettings(userId, { platform_theme: theme });
      setSettings(updated);
    } catch (err) {
      setActionError(formatError(err));
      // revert preview on failure
      if (settings) document.documentElement.setAttribute("data-theme", settings.platform_theme);
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
      setSettings(settings); // revert
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

      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
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
      const [orgs, packages, invoices] = await Promise.all([
        getOrganizations(),
        getPackages(),
        getInvoices(),
      ]);

      const payload = {
        exported_at: new Date().toISOString(),
        organizations: orgs,
        packages,
        invoices,
      };

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

  async function handleDeleteAccount() {
    setActionError(null);
    setDeleting(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
    } catch (err) {
      setActionError(formatError(err));
      setDeleting(false);
    }
  }

  const navItems: { id: Section; label: string; icon: string }[] = [
    { id: "profile", label: "Profile", icon: "👤" },
    { id: "platform", label: "Platform", icon: "⚙" },
    { id: "security", label: "Security", icon: "🔒" },
    { id: "notifications", label: "Notifications", icon: "🔔" },
    { id: "danger", label: "Danger Zone", icon: "⚠" },
  ];

  return (
    <div className="page-shell">
      <div className={s.body}>
        <main className={s.settingsMain}>
          <div style={{ width: "200px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "4px" }}>
            <div style={{ fontSize: "11px", color: "var(--gold)", marginBottom: "8px", letterSpacing: "0.08em", fontWeight: 700 }}>
              ⚙ SETTINGS
            </div>
            {navItems.map(item => (
              <button key={item.id} onClick={() => setSection(item.id)} style={{
                padding: "9px 14px", borderRadius: "8px", border: "none",
                background: section === item.id ? "var(--bg-elevated)" : "transparent",
                color: section === item.id
                  ? item.id === "danger" ? "#ef4444" : "var(--gold)"
                  : item.id === "danger" ? "#ef444480" : "var(--text-secondary)",
                fontSize: "12px", cursor: "pointer", textAlign: "left",
                fontWeight: section === item.id ? 600 : 400,
                borderLeft: section === item.id
                  ? `2px solid ${item.id === "danger" ? "#ef4444" : "var(--gold)"}`
                  : "2px solid transparent",
                transition: "all 0.15s ease", fontFamily: "inherit",
                display: "flex", alignItems: "center", gap: "8px",
              }}>
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "16px", overflowY: "auto", maxHeight: "calc(100vh - 80px)" }}>

            {error && (
              <ErrorBanner message={error} source="dashboard/settings" onRetry={load} />
            )}

            {loading ? (
              <div style={{ padding: 40, textAlign: "center", fontSize: 13, color: "var(--text-muted)" }}>
                Loading settings...
              </div>
            ) : (
            <>

            {/* PROFILE */}
            {section === "profile" && (
              <>
                <div>
                  <h2 style={{ fontSize: "18px", fontWeight: 700 }}>Profile</h2>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>Your founder identity across the platform</p>
                </div>
                <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px", display: "flex", flexDirection: "column", gap: "12px", maxWidth: 440 }}>
                  <Field label="Full name">
                    <input value={fullName} onChange={e => setFullName(e.target.value)} className={s.input} placeholder="Your name" />
                  </Field>
                  <Field label="Email">
                    <input value={email} disabled className={s.input} style={{ opacity: 0.6, cursor: "not-allowed" }} />
                  </Field>
                  <Field label="Location">
                    <input value={location} onChange={e => setLocation(e.target.value)} className={s.input} placeholder="e.g. Nairobi, Kenya" />
                  </Field>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
                    <button onClick={handleSaveProfile} disabled={saving} className={s.btnGold}>
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                    {savedFlash === "profile" && <span style={{ fontSize: 12, color: "var(--green)" }}>✓ Saved</span>}
                  </div>
                  {actionError && <div style={{ fontSize: 11, color: "#ef4444" }}>{actionError}</div>}
                </div>
              </>
            )}

            {/* PLATFORM */}
            {section === "platform" && (
              <>
                <div>
                  <h2 style={{ fontSize: "18px", fontWeight: 700 }}>Platform</h2>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>Defaults applied across the founder dashboard</p>
                </div>
                <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px", display: "flex", flexDirection: "column", gap: "12px", maxWidth: 440 }}>
                  <Field label="Platform name">
                    <input value={platformName} onChange={e => setPlatformName(e.target.value)} className={s.input} />
                  </Field>
                  <Field label="Default currency">
                    <input value={defaultCurrency} onChange={e => setDefaultCurrency(e.target.value)} className={s.input} placeholder="KES" />
                  </Field>
                  <Field label="Default package for new orgs">
                    <input value={defaultPackage} onChange={e => setDefaultPackage(e.target.value)} className={s.input} placeholder="Starter" />
                  </Field>
                  <Field label="Timezone">
                    <input value={timezone} onChange={e => setTimezone(e.target.value)} className={s.input} placeholder="Africa/Nairobi" />
                  </Field>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
                    <button onClick={handleSavePlatform} disabled={saving} className={s.btnGold}>
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                    {savedFlash === "platform" && <span style={{ fontSize: 12, color: "var(--green)" }}>✓ Saved</span>}
                  </div>
                  {actionError && <div style={{ fontSize: 11, color: "#ef4444" }}>{actionError}</div>}
                </div>

                <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px", maxWidth: 620 }}>
                  <h3 style={{ marginBottom: 4, fontSize: 14 }}>Dashboard Theme</h3>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
                    Only affects your Founder Dashboard — independent from any organization's theme.
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
                    {THEMES.map((t) => {
                      const active = settings?.platform_theme === t.id;
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
              </>
            )}

            {/* SECURITY */}
            {section === "security" && (
              <>
                <div>
                  <h2 style={{ fontSize: "18px", fontWeight: 700 }}>Security</h2>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>Change your account password</p>
                </div>
                <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px", display: "flex", flexDirection: "column", gap: "12px", maxWidth: 440 }}>
                  <Field label="Current password">
                    <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className={s.input} />
                  </Field>
                  <Field label="New password">
                    <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className={s.input} />
                  </Field>
                  <Field label="Confirm new password">
                    <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={s.input} />
                  </Field>
                  <button onClick={handleChangePassword} disabled={changingPassword} className={s.btnGold} style={{ marginTop: 4, alignSelf: "flex-start" }}>
                    {changingPassword ? "Updating..." : "Update Password"}
                  </button>
                  {passwordMsg && (
                    <div style={{ fontSize: 12, color: passwordMsg.type === "ok" ? "var(--green)" : "#ef4444" }}>
                      {passwordMsg.type === "ok" ? "✓ " : ""}{passwordMsg.text}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* NOTIFICATIONS */}
            {section === "notifications" && (
              <>
                <div>
                  <h2 style={{ fontSize: "18px", fontWeight: 700 }}>Notifications</h2>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>Choose what you get notified about</p>
                </div>
                <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden", maxWidth: 620 }}>
                  {settings && NOTIF_LABELS.map((n, i) => (
                    <div key={n.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: i < NOTIF_LABELS.length - 1 ? "1px solid var(--border)" : "none" }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{n.label}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{n.desc}</div>
                      </div>
                      <div
                        onClick={() => handleToggleNotification(n.key)}
                        style={{
                          width: 34, height: 19, borderRadius: 10,
                          background: settings[n.key] ? "var(--gold)" : "var(--bg-elevated)",
                          border: "1px solid var(--border)", cursor: "pointer",
                          position: "relative", transition: "background 0.2s ease", flexShrink: 0,
                        }}
                      >
                        <div style={{ position: "absolute", top: 2, left: settings[n.key] ? 16 : 2, width: 13, height: 13, borderRadius: "50%", background: "#fff", transition: "left 0.2s ease" }} />
                      </div>
                    </div>
                  ))}
                </div>
                {actionError && <div style={{ fontSize: 11, color: "#ef4444" }}>{actionError}</div>}
              </>
            )}

            {/* DANGER ZONE */}
            {section === "danger" && (
              <>
                <div>
                  <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#ef4444" }}>Danger Zone</h2>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>Careful — some of these are irreversible</p>
                </div>

                <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, maxWidth: 620 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>Export Data</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Download all organizations, packages, and invoices as JSON</div>
                  </div>
                  <button onClick={handleExportData} disabled={exporting} className={s.btnGhost} style={{ whiteSpace: "nowrap" }}>
                    {exporting ? "Exporting..." : "Export"}
                  </button>
                </div>

                <div style={{ background: "var(--bg-card)", border: "1px solid #f59e0b40", borderRadius: "12px", padding: "16px", maxWidth: 620 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#f59e0b" }}>Reset Platform Data</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Wipes all organizations, invoices, and activity logs. Packages are kept.</div>
                    </div>
                    {!confirmReset ? (
                      <button onClick={() => setConfirmReset(true)} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #f59e0b60", background: "transparent", color: "#f59e0b", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit" }}>
                        Reset
                      </button>
                    ) : (
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={handleResetPlatform} disabled={resetting} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#f59e0b", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit" }}>
                          {resetting ? "Resetting..." : "Confirm Reset"}
                        </button>
                        <button onClick={() => setConfirmReset(false)} className={s.btnGhost}>Cancel</button>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ background: "var(--bg-card)", border: "1px solid #ef444460", borderRadius: "12px", padding: "16px", maxWidth: 620 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#ef4444" }}>Delete Account</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                        Signs you out immediately. Full permanent deletion needs a server-side step that isn't built yet — your account record will still exist until that's added.
                      </div>
                    </div>
                    {!confirmDelete ? (
                      <button onClick={() => setConfirmDelete(true)} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #ef444460", background: "transparent", color: "#ef4444", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit" }}>
                        Delete
                      </button>
                    ) : (
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={handleDeleteAccount} disabled={deleting} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#ef4444", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit" }}>
                          {deleting ? "Signing out..." : "Confirm"}
                        </button>
                        <button onClick={() => setConfirmDelete(false)} className={s.btnGhost}>Cancel</button>
                      </div>
                    )}
                  </div>
                </div>

                {actionError && <div style={{ fontSize: 11, color: "#ef4444" }}>{actionError}</div>}
              </>
            )}

            </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  );
}