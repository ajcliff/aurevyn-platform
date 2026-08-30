"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type CommandItem = {
  id: string;
  label: string;
  icon: string;
  path: string;
  keywords?: string;
};

export default function CommandPalette({
  items,
  onSearchData,
  open,
  onOpenChange,
}: {
  items: CommandItem[];
  onSearchData?: (query: string) => Promise<CommandItem[]>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [dataResults, setDataResults] = useState<CommandItem[]>([]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(!open);
        setQuery("");
        setActiveIndex(0);
      }
      if (e.key === "Escape") {
        onOpenChange(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  const staticMatches = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.keywords?.toLowerCase().includes(q)
    );
  }, [query, items]);

  useEffect(() => {
    if (!onSearchData || query.trim().length < 2) {
      setDataResults([]);
      return;
    }

    const timeout = setTimeout(() => {
      onSearchData(query).then(setDataResults);
    }, 250);

    return () => clearTimeout(timeout);
  }, [query, onSearchData]);

  const filtered = useMemo(() => {
    return [...staticMatches, ...dataResults];
  }, [staticMatches, dataResults]);

  function go(item: CommandItem) {
    router.push(item.path);
    onOpenChange(false);
  }

  function handleInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, filtered.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    }
    if (e.key === "Enter" && filtered[activeIndex]) {
      go(filtered[activeIndex]);
    }
  }

  if (!open) return null;

  return (
    <div
      onClick={() => onOpenChange(false)}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 10000,
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        paddingTop: "12vh",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "520px",
          maxWidth: "90vw",
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        <input
          autoFocus
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={handleInputKeyDown}
          placeholder="Jump to..."
          style={{
            width: "100%",
            padding: "16px 20px",
            background: "transparent",
            border: "none",
            borderBottom: "1px solid var(--border)",
            color: "var(--text-primary)",
            fontSize: "15px",
            outline: "none",
          }}
        />

        <div style={{ maxHeight: "320px", overflowY: "auto", padding: "8px" }}>
          {filtered.length === 0 && (
            <div style={{ padding: "16px", color: "var(--text-muted)", fontSize: "13px" }}>
              No matches.
            </div>
          )}

          {filtered.map((item, i) => (
            <div
              key={item.id}
              onClick={() => go(item)}
              onMouseEnter={() => setActiveIndex(i)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "10px 12px",
                borderRadius: "10px",
                cursor: "pointer",
                background: activeIndex === i ? "var(--bg-elevated)" : "transparent",
              }}
            >
              <span style={{ fontSize: "16px" }}>{item.icon}</span>
              <span style={{ fontSize: "13px", color: "var(--text-primary)" }}>{item.label}</span>
            </div>
          ))}
        </div>

        <div
          style={{
            padding: "10px 16px",
            borderTop: "1px solid var(--border)",
            fontSize: "11px",
            color: "var(--text-muted)",
            display: "flex",
            gap: "12px",
          }}
        >
          <span>up down navigate</span>
          <span>enter select</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}