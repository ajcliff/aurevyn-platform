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
          position: relative;
          overflow: hidden;
          border-bottom: 1px solid var(--mkt-line);
          background: var(--mkt-ink-2);
          padding: 10px 0;
        }
        .mkt-ticker::before,
        .mkt-ticker::after {
          content: "";
          position: absolute;
          top: 0;
          bottom: 0;
          width: 64px;
          z-index: 1;
          pointer-events: none;
        }
        .mkt-ticker::before {
          left: 0;
          background: linear-gradient(to right, var(--mkt-ink-2), transparent);
        }
        .mkt-ticker::after {
          right: 0;
          background: linear-gradient(to left, var(--mkt-ink-2), transparent);
        }
        .mkt-ticker__track {
          display: flex;
          gap: 40px;
          width: max-content;
          animation: mkt-ticker-scroll 24s linear infinite;
        }
        .mkt-ticker:hover .mkt-ticker__track {
          animation-play-state: paused;
        }
        .mkt-ticker__item {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 0.6875rem;
          letter-spacing: 0.08em;
          color: var(--mkt-paper-faint);
          white-space: nowrap;
          transition: color 0.2s ease;
        }
        .mkt-ticker__item:hover {
          color: var(--mkt-paper);
        }
        .mkt-ticker__dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--mkt-signal);
          box-shadow: 0 0 0 0 rgba(62, 207, 142, 0.5);
          animation: mkt-ticker-dot-pulse 2.4s ease-in-out infinite;
        }
        @keyframes mkt-ticker-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @keyframes mkt-ticker-dot-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(62, 207, 142, 0.45); }
          50% { box-shadow: 0 0 0 4px rgba(62, 207, 142, 0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .mkt-ticker__track { animation: none; }
          .mkt-ticker__dot { animation: none; }
        }
      `}</style>
    </div>
  );
}