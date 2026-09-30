"use client";

import { useEffect, useState } from "react";
import {
  getThemePresets, createThemePreset, updateThemePreset, deleteThemePreset, type ThemePreset,
} from "@/lib/themePresets";
import { THEME_COLOR_FIELDS, DEFAULT_THEME_COLORS, type ThemeColors } from "@/lib/themeColors";
import { formatError } from "@/lib/errorFormat";
import { logError } from "@/lib/errorLog";
import ConfirmDialog from "@/components/founder/ConfirmDialog";
import f from "@/styles/founder.module.css";

export default function ThemesPage() {
  const [presets, setPresets] = useState<ThemePreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [colors, setColors] = useState<ThemeColors>(DEFAULT_THEME_COLORS);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ThemePreset | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setPresets(await getThemePresets());
    } catch (err) {
      const message = formatError(err);
      setError(message);
      logError({ source: "ThemesPage", message });
    } finally {
      setLoading(false);
    }
  }

  function openNewPreset() {
    setEditingId(null);
    setName("");
    setDescription("");
    setColors(DEFAULT_THEME_COLORS);
    setShowEditor(true);
  }

  function openEditPreset(preset: ThemePreset) {
    setEditingId(preset.id);
    setName(preset.name);
    setDescription(preset.description ?? "");
    const { id, name: _n, description: _d, created_at, ...colorFields } = preset;
    setColors(colorFields as ThemeColors);
    setShowEditor(true);
  }

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        const updated = await updateThemePreset(editingId, { name, description, ...colors });
        setPresets(prev => prev.map(p => p.id === editingId ? updated : p));
      } else {
        const created = await createThemePreset({ name, description, ...colors });
        setPresets(prev => [created, ...prev]);
      }
      setShowEditor(false);
    } catch (err) {
      const message = formatError(err);
      setError(message);
      logError({ source: "ThemesPage/save", message });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(preset: ThemePreset) {
    try {
      await deleteThemePreset(preset.id);
      setPresets(prev => prev.filter(p => p.id !== preset.id));
    } catch (err) {
      const message = formatError(err);
      setError(message);
      logError({ source: "ThemesPage/delete", message });
    } finally {
      setConfirmDelete(null);
    }
  }

  const groupedFields = THEME_COLOR_FIELDS.reduce((groups, field) => {
    (groups[field.group] ??= []).push(field);
    return groups;
  }, {} as Record<string, typeof THEME_COLOR_FIELDS>);

  return (
    <div className={`page-shell ${f.root}`}>
      <main className="page-main">
        <div className={f.page}>
          <div className={f.top}>
            <div>
              <p className={f.greeting}>Theme presets</p>
              <h1 className={f.headline}>
                {loading ? "Loading presets" : presets.length === 0 ? "No presets yet." : `${presets.length} custom ${presets.length === 1 ? "preset" : "presets"}.`}
              </h1>
            </div>
            <div className={f.actions}>
              <button className={f.primary} onClick={openNewPreset}>New preset</button>
            </div>
          </div>

          {error && (
            <div className={f.formError} role="alert">{error}</div>
          )}

          {showEditor && (
            <div className={f.dialog} style={{ maxWidth: 760, width: "100%", border: "1px solid var(--gold)" }}>
              <h2 className={f.dialogTitle}>{editingId ? "Edit preset" : "New preset"}</h2>

              <div className={f.fieldRow}>
                <input className={f.input} value={name} onChange={e => setName(e.target.value)} placeholder="Preset name (e.g. Coastal Breeze)" />
                <input className={f.input} value={description} onChange={e => setDescription(e.target.value)} placeholder="Short description" />
              </div>

              {/* Isolated mock preview — does not touch the real dashboard theme */}
              <div style={{ background: colors.bg_base, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontSize: 10, color: colors.text_muted, letterSpacing: "0.05em" }}>PREVIEW</div>
                <div style={{ background: colors.bg_card, border: `1px solid ${colors.border_light}`, borderRadius: 8, padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: colors.text_primary }}>{name || "Sample Org"}</div>
                    <div style={{ fontSize: 11, color: colors.text_secondary }}>{description || "A sample subtitle"}</div>
                  </div>
                  <div style={{ padding: "6px 12px", borderRadius: 8, background: colors.gold, color: "#0a0a0f", fontSize: 11, fontWeight: 700 }}>Action</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, background: colors.green, color: "#0a0a0f" }}>Success</span>
                  <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, background: colors.amber, color: "#0a0a0f" }}>Warning</span>
                  <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, background: colors.red, color: "#fff" }}>Error</span>
                </div>
              </div>

              {Object.entries(groupedFields).map(([group, fields]) => (
                <div key={group}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 8, letterSpacing: "0.05em" }}>{group.toUpperCase()}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
                    {fields.map(fld => (
                      <div key={fld.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input
                          type="color"
                          value={colors[fld.key]}
                          onChange={e => setColors(prev => ({ ...prev, [fld.key]: e.target.value }))}
                          style={{ width: 32, height: 32, borderRadius: 6, border: "1px solid var(--rule-strong)", cursor: "pointer", flexShrink: 0, padding: 0 }}
                        />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{fld.label}</div>
                          <div style={{ fontSize: 10, color: "var(--text-secondary)", fontFamily: "monospace" }}>{colors[fld.key]}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className={f.dialogActions}>
                <button className={f.secondary} onClick={() => setShowEditor(false)}>Cancel</button>
                <button className={f.primary} onClick={handleSave} disabled={saving || !name.trim()}>{saving ? "Saving…" : editingId ? "Save changes" : "Create preset"}</button>
              </div>
            </div>
          )}

          {loading ? (
            <p className={f.status} role="status">Loading presets…</p>
          ) : presets.length === 0 ? (
            <div className={f.empty}>
              <strong>No presets yet.</strong>
              Organizations only see the 4 built-in themes until you create one here.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
              {presets.map(p => (
                <div key={p.id} className={f.themeCard} style={{ background: p.bg_base, borderColor: p.border }}>
                  <div className={f.themePreview} style={{ borderBottom: `1px solid ${p.border}` }}>
                    <div style={{ borderRadius: 9, border: `1px solid ${p.border_light}`, background: p.bg_card, padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <div style={{ width: 55, height: 6, borderRadius: 4, background: p.text_primary, opacity: 0.8 }} />
                        <div style={{ width: 22, height: 6, borderRadius: 4, background: p.gold }} />
                      </div>
                      <div style={{ display: "flex", gap: 7 }}>
                        <div style={{ width: 45, borderRadius: 5, background: p.bg_base, border: `1px solid ${p.border_light}` }} />
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
                          <div style={{ width: "70%", height: 6, borderRadius: 4, background: p.text_primary, opacity: 0.65 }} />
                          <div style={{ width: "50%", height: 5, borderRadius: 4, background: p.text_secondary, opacity: 0.5 }} />
                          <div style={{ display: "flex", gap: 5, marginTop: "auto" }}>
                            <span style={{ width: 20, height: 10, borderRadius: 3, background: p.gold }} />
                            <span style={{ width: 20, height: 10, borderRadius: 3, background: p.green }} />
                            <span style={{ width: 20, height: 10, borderRadius: 3, background: p.red }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ padding: "12px 14px 8px", flex: 1 }}>
                    <div className={f.themeName} style={{ color: p.text_primary }}>{p.name}</div>
                    {p.description && <div className={f.themeDesc} style={{ color: p.text_secondary }}>{p.description}</div>}
                    <div className={f.themeSwatchRow} style={{ marginTop: 10 }}>
                      {[p.gold, p.bg_card, p.green, p.red].map((color, i) => (
                        <div key={i} className={f.themeSwatch} style={{ background: color, border: i === 1 ? `1px solid ${p.border_light}` : "none" }} />
                      ))}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, padding: "0 14px 14px" }}>
                    <button onClick={() => openEditPreset(p)} style={{ flex: 1, padding: "7px 10px", borderRadius: 7, border: `1px solid ${p.border_light}`, background: "transparent", color: p.text_secondary, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Edit</button>
                    <button onClick={() => setConfirmDelete(p)} style={{ padding: "7px 12px", borderRadius: 7, border: "1px solid var(--red)", background: "transparent", color: "var(--red)", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {confirmDelete && (
        <ConfirmDialog
          title="Delete this preset?"
          message={`"${confirmDelete.name}" will be removed. Any organization currently using it falls back to the default theme.`}
          confirmLabel="Delete"
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
