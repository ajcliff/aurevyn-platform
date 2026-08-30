import { ENGINE_META, ENGINE_ORDER } from "./engineData";

export default function StatusTicker() {
  const items = ENGINE_ORDER.map((id) => `${ENGINE_META[id].label.toUpperCase()} · OPERATIONAL`);
  const track = [...items, ...items]; // duplicated for seamless loop

  return (
    <div className="mkt-ticker">
      <div className="mkt-ticker__track">
        {track.map((t, i) => (
          <span key={i} className="mkt-ticker__item mkt-mono">
            <span className="mkt-ticker__dot" />
            {t}
          </span>
        ))}
      </div>

      <style>{`
        .mkt-ticker {
          overflow: hidden;
          border-bottom: 1px solid var(--mkt-line);
          background: var(--mkt-ink-2);
          padding: 10px 0;
        }
        .mkt-ticker__track {
          display: flex;
          gap: 40px;
          width: max-content;
          animation: mkt-ticker-scroll 24s linear infinite;
        }
        .mkt-ticker__item {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 0.6875rem;
          letter-spacing: 0.08em;
          color: var(--mkt-paper-faint);
          white-space: nowrap;
        }
        .mkt-ticker__dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--mkt-signal);
        }
        @keyframes mkt-ticker-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .mkt-ticker__track { animation: none; }
        }
      `}</style>
    </div>
  );
}
