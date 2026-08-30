"use client";

import { useEffect, useState } from "react";
import {
  getThemePresets, createThemePreset, updateThemePreset, deleteThemePreset, type ThemePreset,
} from "@/lib/themePresets";
import { THEME_COLOR_FIELDS, DEFAULT_THEME_COLORS, type ThemeColors } from "@/lib/themeColors";
import { formatError } from "@/lib/errorFormat";
import { logError } from "@/lib/errorLog";
import PageHeader from "@/components/PageHeader";
import s from "@/styles/layout.module.css";

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

  useEffect(() => {
    load();
  }, []);

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

  async function handleDelete(id: string) {
    try {
      await deleteThemePreset(id);
      setPresets(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      const message = formatError(err);
      setError(message);
      logError({ source: "ThemesPage/delete", message });
    }
  }

  const groupedFields = THEME_COLOR_FIELDS.reduce((groups, field) => {
    (groups[field.group] ??= []).push(field);
    return groups;
  }, {} as Record<string, typeof THEME_COLOR_FIELDS>);

  return (
    <div className={s.body}>
      <main className={s.main}>
        <PageHeader
          title="Theme Presets"
          subtitle={`${presets.length} preset${presets.length !== 1 ? "s" : ""} available to organizations`}
          actions={<button onClick={openNewPreset} className={s.btnGold}>+ New Preset</button>}
        />

        {error && (
          <div style={{ fontSize: 12, color: "#ef4444", background: "#ef44441a", border: "1px solid #ef444440", borderRadius: 8, padding: "10px 12px", marginBottom: 16 }}>
            {error}
          </div>
        )}

        {showEditor && (
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--gold)", borderRadius: 16, padding: 20, marginBottom: 20, display: "flex", flexDirection: "column", gap: 16, maxWidth: 760 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{editingId ? "Edit Preset" : "New Preset"}</div>

            <div style={{ display: "flex", gap: 10 }}>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Preset name (e.g. Coastal Breeze)"
                style={{ flex: 1, padding: "9px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-base)", color: "var(--text-primary)", fontSize: 13, outline: "none", fontFamily: "inherit" }}
              />
              <input
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Short description"
                style={{ flex: 1, padding: "9px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-base)", color: "var(--text-primary)", fontSize: 13, outline: "none", fontFamily: "inherit" }}
              />
            </div>

            {/* Isolated mock preview — does not touch the real dashboard theme */}
            <div style={{
              background: colors.bg_base, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 16,
              display: "flex", flexDirection: "column", gap: 8,
            }}>
              <div style={{ fontSize: 10, color: colors.text_muted, letterSpacing: "0.05em" }}>PREVIEW</div>
              <div style={{ background: colors.bg_card, border: `1px solid ${colors.border_light}`, borderRadius: 8, padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: colors.text_primary }}>{name || "Sample Org"}</div>
                  <div style={{ fontSize: 11, color: colors.text_secondary }}>{description || "A sample subtitle"}</div>
                </div>
                <div style={{ padding: "6px 12px", borderRadius: 8, background: colors.gold, color: "#0a0a0f", fontSize: 11, fontWeight: 700 }}>
                  Action
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, background: colors.green, color: "#0a0a0f" }}>Success</span>
                <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, background: colors.amber, color: "#0a0a0f" }}>Warning</span>
                <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, background: colors.red, color: "#fff" }}>Error</span>
              </div>
            </div>

            {Object.entries(groupedFields).map(([group, fields]) => (
              <div key={group}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 8, letterSpacing: "0.05em" }}>
                  {group.toUpperCase()}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
                  {fields.map(f => (
                    <div key={f.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input
                        type="color"
                        value={colors[f.key]}
                        onChange={e => setColors(prev => ({ ...prev, [f.key]: e.target.value }))}
                        style={{ width: 32, height: 32, borderRadius: 6, border: "1px solid var(--border)", cursor: "pointer", flexShrink: 0, padding: 0 }}
                      />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{f.label}</div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "monospace" }}>{colors[f.key]}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleSave} disabled={saving || !name.trim()} className={s.btnGold} style={{ width: "auto", padding: "9px 20px" }}>
                {saving ? "Saving..." : editingId ? "Save Changes" : "Create Preset"}
              </button>
              <button onClick={() => setShowEditor(false)} className={s.btnGhost} style={{ width: "auto", padding: "9px 20px" }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ padding: 20, fontSize: 13, color: "var(--text-muted)" }}>Loading presets...</div>
        ) : presets.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
            No presets yet — organizations only see the 4 built-in themes until you create one.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            {presets.map(p => (
              <div key={p.id} style={{ background: p.bg_base, border: `1px solid ${p.border}`, borderRadius: 14, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", gap: 5 }}>
                  <div style={{ width: 16, height: 16, borderRadius: 4, background: p.gold }} />
                  <div style={{ width: 16, height: 16, borderRadius: 4, background: p.bg_card, border: `1px solid ${p.border_light}` }} />
                  <div style={{ width: 16, height: 16, borderRadius: 4, background: p.green }} />
                  <div style={{ width: 16, height: 16, borderRadius: 4, background: p.red }} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: p.text_primary }}>{p.name}</div>
                  {p.description && <div style={{ fontSize: 11, color: p.text_secondary, marginTop: 2 }}>{p.description}</div>}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
                  <button onClick={() => openEditPreset(p)} style={{ flex: 1, padding: "6px", borderRadius: 6, border: `1px solid ${p.border_light}`, background: "transparent", color: p.text_secondary, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                    Edit
                  </button>
                  <button onClick={() => handleDelete(p.id)} style={{ flex: 1, padding: "6px", borderRadius: 6, border: "1px solid #ef444460", background: "transparent", color: "#ef4444", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}