"use client";

import { useState } from "react";

type BlockId = "hero" | "products" | "about" | "testimonials" | "contact";

const AVAILABLE_BLOCKS: { id: BlockId; label: string; hint: string }[] = [
  { id: "hero", label: "Hero banner", hint: "Business name, tagline, call to action" },
  { id: "products", label: "Product grid", hint: "Pulled straight from your Inventory engine" },
  { id: "about", label: "About section", hint: "Your story, location, hours" },
  { id: "testimonials", label: "Testimonials", hint: "Customer quotes" },
  { id: "contact", label: "Contact block", hint: "Phone, WhatsApp, map" },
];

export default function StorefrontBuilderDemo() {
  const [blocks, setBlocks] = useState<BlockId[]>([]);
  const [published, setPublished] = useState(false);

  const addBlock = (id: BlockId) => {
    setBlocks((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setPublished(false);
  };

  const removeBlock = (id: BlockId) => {
    setBlocks((prev) => prev.filter((b) => b !== id));
    setPublished(false);
  };

  const reset = () => {
    setBlocks([]);
    setPublished(false);
  };

  return (
    <section className="mkt-section">
      <div className="mkt-container">
        <div className="mkt-eyebrow mkt-eyebrow--brass">Sheet 07 / Coming soon</div>
        <h2 className="mkt-h2" style={{ marginTop: 14, maxWidth: 600 }}>
          A public storefront, built from the data you already have.
        </h2>
        <p className="mkt-body-lg" style={{ marginTop: 14, maxWidth: 560 }}>
          Every product already lives in your Inventory engine — soon,
          publishing a real website to sell them will be a matter of adding
          sections, not hiring a developer. Try assembling one below.
        </p>

        <div className="mkt-builder">
          <div className="mkt-builder__panel">
            <div className="mkt-tag" style={{ marginBottom: 14 }}>Add a section</div>
            {AVAILABLE_BLOCKS.map((b) => {
              const added = blocks.includes(b.id);
              return (
                <button
                  key={b.id}
                  onClick={() => (added ? removeBlock(b.id) : addBlock(b.id))}
                  className={`mkt-builder__block-btn ${added ? "mkt-builder__block-btn--added" : ""}`}
                >
                  <span>
                    <span className="mkt-builder__block-label">{b.label}</span>
                    <span className="mkt-builder__block-hint">{b.hint}</span>
                  </span>
                  <span className="mkt-builder__block-icon">{added ? "✓" : "+"}</span>
                </button>
              );
            })}
            {blocks.length > 0 && (
              <button onClick={reset} className="mkt-mono mkt-builder__reset">
                Reset
              </button>
            )}
          </div>

          <div className="mkt-builder__preview">
            <div className="mkt-showcase__chrome">
              <span className="mkt-showcase__dot" />
              <span className="mkt-showcase__dot" />
              <span className="mkt-showcase__dot" />
              <span className="mkt-mono mkt-showcase__url">
                {published ? "yourbusiness.aurevyn.site" : "draft — not published"}
              </span>
            </div>

            <div className="mkt-builder__canvas">
              {blocks.length === 0 && (
                <p className="mkt-dim mkt-mono" style={{ fontSize: "0.8125rem", padding: 24 }}>
                  Add a section on the left to start building the page.
                </p>
              )}
              {blocks.map((id) => (
                <BlockPreview key={id} id={id} />
              ))}
            </div>

            {blocks.length > 0 && (
              <div className="mkt-builder__footer">
                <button
                  onClick={() => setPublished(true)}
                  className="mkt-btn mkt-btn--primary mkt-btn--sm"
                  disabled={published}
                >
                  {published ? "Published (preview)" : "Publish"}
                </button>
                <span className="mkt-dim mkt-mono" style={{ fontSize: "0.75rem" }}>
                  {blocks.length} section{blocks.length === 1 ? "" : "s"}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .mkt-builder {
          margin-top: 48px;
          display: grid;
          grid-template-columns: 280px 1fr;
          border: 1px solid var(--mkt-line);
        }
        .mkt-builder__panel {
          padding: 20px;
          border-right: 1px solid var(--mkt-line);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .mkt-builder__block-btn {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          text-align: left;
          background: var(--mkt-surface);
          border: 1px solid var(--mkt-line-strong);
          padding: 12px 14px;
          cursor: pointer;
          transition: border-color 0.15s ease, background 0.15s ease;
        }
        .mkt-builder__block-btn:hover {
          border-color: var(--mkt-blueprint);
        }
        .mkt-builder__block-btn--added {
          border-color: var(--mkt-brass);
          background: var(--mkt-brass-glow);
        }
        .mkt-builder__block-label {
          display: block;
          font-size: 0.875rem;
          color: var(--mkt-paper);
        }
        .mkt-builder__block-hint {
          display: block;
          font-size: 0.75rem;
          color: var(--mkt-paper-faint);
          margin-top: 2px;
        }
        .mkt-builder__block-icon {
          font-family: var(--mkt-font-mono);
          color: var(--mkt-brass-light);
          flex-shrink: 0;
        }
        .mkt-builder__reset {
          margin-top: 8px;
          background: none;
          border: none;
          color: var(--mkt-paper-faint);
          font-size: 0.75rem;
          text-align: left;
          cursor: pointer;
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .mkt-builder__preview {
          background: var(--mkt-ink-2);
          display: flex;
          flex-direction: column;
          min-height: 460px;
        }
        .mkt-builder__canvas {
          flex: 1;
          overflow-y: auto;
        }
        .mkt-builder__footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 20px;
          border-top: 1px solid var(--mkt-line);
        }
        .mkt-builder__section {
          padding: 20px;
          border-bottom: 1px solid var(--mkt-line);
        }
        .mkt-builder__section:last-child {
          border-bottom: none;
        }
        @media (max-width: 800px) {
          .mkt-builder { grid-template-columns: 1fr; }
          .mkt-builder__panel { border-right: none; border-bottom: 1px solid var(--mkt-line); }
        }
      `}</style>
    </section>
  );
}

function BlockPreview({ id }: { id: BlockId }) {
  switch (id) {
    case "hero":
      return (
        <div className="mkt-builder__section" style={{ textAlign: "center", padding: "36px 24px" }}>
          <div className="mkt-tag" style={{ marginInline: "auto", width: "fit-content" }}>Your Business Name</div>
          <div className="mkt-h3" style={{ marginTop: 12, fontSize: "1.375rem" }}>
            Fresh produce, delivered daily
          </div>
          <button className="mkt-btn mkt-btn--primary mkt-btn--sm" style={{ marginTop: 14 }}>Shop now</button>
        </div>
      );
    case "products":
      return (
        <div className="mkt-builder__section">
          <div className="mkt-tag" style={{ marginBottom: 12 }}>Products</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {["Maize flour 2kg", "Cooking oil 1L", "Rice 5kg"].map((p) => (
              <div key={p} className="mkt-card" style={{ padding: 12 }}>
                <div style={{ height: 48, background: "var(--mkt-surface-raised)", marginBottom: 8 }} />
                <div style={{ fontSize: "0.75rem" }}>{p}</div>
              </div>
            ))}
          </div>
        </div>
      );
    case "about":
      return (
        <div className="mkt-builder__section">
          <div className="mkt-tag" style={{ marginBottom: 10 }}>About</div>
          <p className="mkt-body" style={{ fontSize: "0.8125rem" }}>
            Serving Nairobi's CBD since 2019 — open daily, 7am–9pm.
          </p>
        </div>
      );
    case "testimonials":
      return (
        <div className="mkt-builder__section">
          <div className="mkt-tag" style={{ marginBottom: 10 }}>Testimonials</div>
          <p className="mkt-body" style={{ fontSize: "0.8125rem", fontStyle: "italic" }}>
            "Always fresh, always fast." — a regular customer
          </p>
        </div>
      );
    case "contact":
      return (
        <div className="mkt-builder__section">
          <div className="mkt-tag" style={{ marginBottom: 10 }}>Contact</div>
          <p className="mkt-body mkt-mono" style={{ fontSize: "0.8125rem" }}>
            +254 7XX XXX XXX · WhatsApp available
          </p>
        </div>
      );
  }
}