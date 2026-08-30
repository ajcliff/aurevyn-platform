const ROWS = [
  { label: "Time to first sale", aurevyn: "Same day", legacy: "Weeks to quarters" },
  { label: "Setup", aurevyn: "Pick an industry blueprint", legacy: "Custom consultant build-out" },
  { label: "Local payments", aurevyn: "M-Pesa native", legacy: "Bolt-on integration" },
  { label: "Pricing", aurevyn: "Flat, per organization", legacy: "Per-seat, per-module" },
  { label: "Works offline", aurevyn: "Yes, at the till", legacy: "Rarely" },
  { label: "New engine", aurevyn: "Enable it, keep your data", legacy: "New implementation project" },
];

const LEGACY_PHASES = [
  { label: "Requirements", weeks: 2 },
  { label: "Consultant scoping", weeks: 3 },
  { label: "Configuration & migration", weeks: 6 },
  { label: "Staff training", weeks: 3 },
  { label: "Go-live", weeks: 2 },
];
const TOTAL_WEEKS = LEGACY_PHASES.reduce((s, p) => s + p.weeks, 0);

export default function ComparisonSection() {
  return (
    <section className="mkt-section">
      <div className="mkt-container">
        <div className="mkt-eyebrow">Sheet 05 / Time to live</div>
        <h2 className="mkt-h2" style={{ marginTop: 14, maxWidth: 640 }}>
          Legacy ERP was built for head offices in other continents.
        </h2>
        <p className="mkt-body-lg" style={{ marginTop: 14, maxWidth: 620 }}>
          Systems like SAP and Odoo weren't designed around African payment
          rails, connectivity, or the pace an SME needs to move at. Aurevyn
          was.
        </p>

        <div className="mkt-timeline">
          <div className="mkt-timeline__ruler">
            {Array.from({ length: 5 }, (_, i) => (
              <span key={i} className="mkt-mono">Week {i * 4}</span>
            ))}
          </div>

          <div className="mkt-timeline__row">
            <span className="mkt-timeline__row-label mkt-mono">AUREVYN</span>
            <div className="mkt-timeline__track">
              <div className="mkt-timeline__aurevyn-bar" style={{ width: "3%" }} />
              <span className="mkt-timeline__aurevyn-label mkt-mono">Live — Day 1</span>
            </div>
          </div>

          <div className="mkt-timeline__row">
            <span className="mkt-timeline__row-label mkt-mono">LEGACY ERP</span>
            <div className="mkt-timeline__track">
              {LEGACY_PHASES.map((p, i) => (
                <div
                  key={p.label}
                  className="mkt-timeline__phase"
                  style={{ width: `${(p.weeks / TOTAL_WEEKS) * 100}%`, opacity: 0.4 + i * 0.12 }}
                  title={`${p.label} — ~${p.weeks} weeks`}
                >
                  <span className="mkt-timeline__phase-label mkt-mono">{p.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mkt-compare">
          <div className="mkt-compare__row mkt-compare__row--head">
            <div />
            <div className="mkt-compare__col mkt-compare__col--aurevyn">Aurevyn</div>
            <div className="mkt-compare__col">Typical legacy ERP</div>
          </div>
          {ROWS.map((r) => (
            <div key={r.label} className="mkt-compare__row">
              <div className="mkt-compare__label">{r.label}</div>
              <div className="mkt-compare__col mkt-compare__col--aurevyn">
                <span className="mkt-compare__check" aria-hidden="true">✓</span>
                {r.aurevyn}
              </div>
              <div className="mkt-compare__col mkt-dim">{r.legacy}</div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .mkt-timeline {
          margin-top: 48px;
          border: 1px solid var(--mkt-line);
          padding: 24px 24px 20px;
        }
        .mkt-timeline__ruler {
          display: flex;
          justify-content: space-between;
          font-size: 0.6875rem;
          color: var(--mkt-paper-faint);
          padding-bottom: 10px;
          border-bottom: 1px solid var(--mkt-line);
          margin-bottom: 20px;
        }
        .mkt-timeline__row {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 16px;
        }
        .mkt-timeline__row:last-child { margin-bottom: 0; }
        .mkt-timeline__row-label {
          width: 90px;
          flex-shrink: 0;
          font-size: 0.6875rem;
          letter-spacing: 0.06em;
          color: var(--mkt-paper-dim);
        }
        .mkt-timeline__track {
          position: relative;
          flex: 1;
          height: 30px;
          background: repeating-linear-gradient(
            to right,
            var(--mkt-line) 0,
            var(--mkt-line) 1px,
            transparent 1px,
            transparent 25%
          );
          display: flex;
        }
        .mkt-timeline__aurevyn-bar {
          background: var(--mkt-brass);
          height: 100%;
        }
        .mkt-timeline__aurevyn-label {
          margin-left: 10px;
          align-self: center;
          font-size: 0.75rem;
          color: var(--mkt-brass-light);
        }
        .mkt-timeline__phase {
          background: var(--mkt-blueprint);
          height: 100%;
          border-right: 1px solid var(--mkt-ink);
          display: flex;
          align-items: center;
          overflow: hidden;
        }
        .mkt-timeline__phase-label {
          padding-left: 8px;
          font-size: 0.625rem;
          color: var(--mkt-ink);
          white-space: nowrap;
        }
        .mkt-compare {
          margin-top: 40px;
          border: 1px solid var(--mkt-line);
        }
        .mkt-compare__row {
          display: grid;
          grid-template-columns: 1.2fr 1fr 1fr;
          border-bottom: 1px solid var(--mkt-line);
        }
        .mkt-compare__row:last-child {
          border-bottom: none;
        }
        .mkt-compare__row--head {
          background: var(--mkt-surface);
        }
        .mkt-compare__row--head .mkt-compare__col {
          font-family: var(--mkt-font-mono);
          font-size: 0.75rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--mkt-paper-faint);
        }
        .mkt-compare__label {
          padding: 18px 22px;
          font-size: 0.9375rem;
          color: var(--mkt-paper);
          border-right: 1px solid var(--mkt-line);
        }
        .mkt-compare__col {
          padding: 18px 22px;
          font-size: 0.9375rem;
          border-right: 1px solid var(--mkt-line);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .mkt-compare__col:last-child {
          border-right: none;
        }
        .mkt-compare__col--aurevyn {
          color: var(--mkt-paper);
          background: var(--mkt-blueprint-glow);
        }
        .mkt-compare__check {
          color: var(--mkt-blueprint);
          font-family: var(--mkt-font-mono);
        }
        @media (max-width: 700px) {
          .mkt-timeline__phase-label { display: none; }
          .mkt-compare__row {
            grid-template-columns: 1fr;
          }
          .mkt-compare__label {
            border-right: none;
            border-bottom: 1px solid var(--mkt-line);
            font-family: var(--mkt-font-mono);
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: var(--mkt-paper-faint);
          }
          .mkt-compare__col {
            border-right: none;
          }
        }
      `}</style>
    </section>
  );
}
