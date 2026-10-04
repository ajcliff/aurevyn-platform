"use client";

import type { ThemeColors } from "@/lib/themeColors";
import { themeToCssVars } from "@/lib/themeColors";

export type PickerBuiltin = { id: string; name: string; description: string; colors: ThemeColors };
export type PickerPreset = ThemeColors & { id: string; name: string; description: string | null };

type Props<P extends PickerPreset> = {
  builtins: PickerBuiltin[];
  presets: P[];
  activeBuiltinId: string | null;
  activePresetId: string | null;
  busy?: boolean;
  onPickBuiltin: (id: string) => void;
  onPickPreset: (preset: P) => void;
};

function Card({ name, description, colors, active, busy, onClick }: {
  name: string; description: string | null; colors: ThemeColors; active: boolean; busy?: boolean; onClick: () => void;
}) {
  // Preview uses the same sanitised values the real app will apply, so what you see is what you get
  const v = themeToCssVars(colors);
  const bg = v["--bg-base"], card = v["--bg-card"], border = v["--border-light"];
  const accent = v["--gold"], onAccent = v["--gold-contrast"];
  const text = v["--text-primary"], sub = v["--text-secondary"];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-pressed={active}
      style={{
        textAlign: "left", background: bg, borderRadius: 12, padding: 10, cursor: busy ? "default" : "pointer",
        border: active ? `2px solid ${accent}` : `1px solid ${border}`,
        opacity: busy && !active ? 0.6 : 1, display: "flex", flexDirection: "column", gap: 8, fontFamily: "inherit",
      }}
    >
      <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 8, padding: 8, display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ height: 5, width: "60%", borderRadius: 3, background: text, opacity: 0.85 }} />
        <div style={{ height: 4, width: "40%", borderRadius: 3, background: sub, opacity: 0.7 }} />
        <div style={{ display: "flex", gap: 5, marginTop: 2 }}>
          <span style={{ background: accent, color: onAccent, fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 5 }}>Button</span>
          <span style={{ border: `1px solid ${border}`, color: text, fontSize: 9, padding: "2px 7px", borderRadius: 5 }}>Ghost</span>
        </div>
      </div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: text }}>{name}{active ? " ✓" : ""}</div>
        {description && <div style={{ fontSize: 10.5, color: sub }}>{description}</div>}
      </div>
    </button>
  );
}

const grid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(168px, 1fr))", gap: 12 };
const label: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", color: "var(--text-secondary)", margin: "0 0 10px" };

export default function ThemePicker<P extends PickerPreset>({ builtins, presets, activeBuiltinId, activePresetId, busy, onPickBuiltin, onPickPreset }: Props<P>) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <p style={label}>CLASSIC</p>
        <div style={grid}>
          {builtins.map(t => (
            <Card key={t.id} name={t.name} description={t.description} colors={t.colors} busy={busy}
              active={activeBuiltinId === t.id && !activePresetId} onClick={() => onPickBuiltin(t.id)} />
          ))}
        </div>
      </div>
      {presets.length > 0 && (
        <div>
          <p style={label}>COLLECTION</p>
          <div style={grid}>
            {presets.map(p => (
              <Card key={p.id} name={p.name} description={p.description} colors={p} busy={busy}
                active={activePresetId === p.id} onClick={() => onPickPreset(p)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
