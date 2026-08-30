"use client";

import {
  useEffect,
  useState
} from "react";

import {
  getMovements
} from "@/lib/inventory";

import {
  useEngine
} from "@/lib/runtime/EngineContext";
import Drawer from "@/components/Drawer";

type MovementRow = {
  id: string;
  type: string;
  quantity: number;
  created_at?: string;
  inventory_products?: {
    name?: string;
  };
};

const TYPE_STYLES: Record<string, { icon: string; color: string }> = {
  stock_in: { icon: "📥", color: "var(--green)" },
  stock_out: { icon: "📤", color: "#ef4444" },
  adjustment: { icon: "⚖️", color: "var(--gold)" },
};

export default function MovementHistory() {
  const { organization } = useEngine();

const [rows, setRows] = useState<MovementRow[]>([]);
  const [selected, setSelected] = useState<MovementRow | null>(null);

  useEffect(() => {
    async function fetchMovements() {
      const data = await getMovements(organization.id);
      setRows(data);
    }

    fetchMovements();
  }, [organization.id]);

  return (
    <div style={{ marginTop: "24px" }}>
      <h3 style={{ marginBottom: 14 }}>Inventory Movements</h3>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: "12px",
          maxHeight: "340px",
          overflowY: "auto",
          paddingRight: 4,
        }}
      >
        {rows.map((row) => {
          const style = TYPE_STYLES[row.type] ?? { icon: "📦", color: "var(--text-muted)" };

          return (
           <div
              key={row.id}
              onClick={() => setSelected(row)}
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "12px 14px",
                display: "flex",
                flexDirection: "column",
                gap: 6,
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 8,
                    background: "var(--bg-elevated)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    flexShrink: 0,
                  }}
                >
                  {style.icon}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {row.inventory_products?.name ?? "Unknown product"}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: style.color, fontWeight: 600, textTransform: "capitalize" }}>
                  {row.type.replace("_", " ")}
                </span>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{row.quantity}</span>
              </div>

              {row.created_at && (
                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                  {new Date(row.created_at).toLocaleDateString("en-KE")}
                </div>
              )}
            </div>
          );
        })}

      {rows.length === 0 && (
          <div style={{ color: "var(--text-muted)", fontSize: 13 }}>No movements recorded yet.</div>
        )}
      </div>

      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.inventory_products?.name ?? "Movement"}
      >
        {selected && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Type</div>
              <div style={{ fontSize: 14, textTransform: "capitalize" }}>{selected.type.replace("_", " ")}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Quantity</div>
              <div style={{ fontSize: 14 }}>{selected.quantity}</div>
            </div>
            {selected.created_at && (
              <div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Date</div>
                <div style={{ fontSize: 14 }}>{new Date(selected.created_at).toLocaleString("en-KE")}</div>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}