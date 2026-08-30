"use client";

import { ENGINE_META, ENGINE_ORDER, selectEngine, type EngineId } from "./engineData";

const POSITIONS: Record<EngineId, { x: number; y: number }> = {
  pos: { x: 40, y: 40 },
  inventory: { x: 420, y: 40 },
  finance: { x: 20, y: 278 },
  crm: { x: 440, y: 278 },
  hr: { x: 40, y: 516 },
  security: { x: 420, y: 516 },
};

const PATHS: Record<EngineId, string> = {
  pos: "M180,84 L180,180 L280,180 L280,250",
  inventory: "M420,84 L420,180 L320,180 L320,250",
  finance: "M160,300 L250,300",
  crm: "M440,300 L350,300",
  hr: "M180,516 L180,420 L280,420 L280,350",
  security: "M420,516 L420,420 L320,420 L320,350",
};

export default function BlueprintDiagram() {
  return (
    <div className="mkt-diagram">
      <svg viewBox="0 0 600 600" role="img" aria-label="Diagram of the Aurevyn core connected to its engines — click any engine to see it in action">
        {[[8, 8], [592, 8], [8, 592], [592, 592]].map(([cx, cy], i) => (
          <g key={i} stroke="var(--mkt-line-strong)" strokeWidth="1">
            <line x1={cx - 7} y1={cy} x2={cx + 7} y2={cy} />
            <line x1={cx} y1={cy - 7} x2={cx} y2={cy + 7} />
          </g>
        ))}

        {ENGINE_ORDER.map((id, i) => (
          <path
            key={id}
            d={PATHS[id]}
            className="mkt-trace"
            style={{ animationDelay: `${i * 0.12}s`, stroke: ENGINE_META[id].color }}
            fill="none"
            strokeWidth="1.25"
            strokeOpacity="0.55"
          />
        ))}

        <g>
          <circle cx="300" cy="300" r="72" fill="none" stroke="var(--mkt-blueprint-dim)" strokeWidth="1" strokeDasharray="2 4" opacity="0.6" />
          <rect x="250" y="250" width="100" height="100" fill="var(--mkt-ink-2)" stroke="var(--mkt-brass)" strokeWidth="1.5" />
          <rect x="250" y="250" width="100" height="100" fill="var(--mkt-brass)" opacity="0.06" className="mkt-core-pulse" />
          <text x="300" y="292" textAnchor="middle" fontFamily="var(--mkt-font-mono)" fontSize="10" letterSpacing="1" fill="var(--mkt-brass-light)">
            AUREVYN
          </text>
          <text x="300" y="312" textAnchor="middle" fontFamily="var(--mkt-font-mono)" fontSize="9" letterSpacing="2" fill="var(--mkt-paper-faint)">
            CORE
          </text>
          {[[280, 250], [320, 250], [250, 300], [350, 300], [280, 350], [320, 350]].map(([x, y], i) => (
            <rect key={i} x={x - 3} y={y - 3} width="6" height="6" fill="var(--mkt-brass)" />
          ))}
        </g>

        {ENGINE_ORDER.map((id) => {
          const n = POSITIONS[id];
          const meta = ENGINE_META[id];
          return (
            <g
              key={id}
              className="mkt-diagram__node"
              onClick={() => selectEngine(id)}
              tabIndex={0}
              role="button"
              aria-label={`View ${meta.label} in the product showcase`}
              onKeyDown={(e) => e.key === "Enter" && selectEngine(id)}
            >
              <rect x={n.x} y={n.y} width="140" height="44" fill="var(--mkt-surface)" stroke="var(--mkt-line-strong)" strokeWidth="1" />
              <rect x={n.x} y={n.y} width="4" height="44" fill={meta.color} />
              <text x={n.x + 16} y={n.y + 20} fontFamily="var(--mkt-font-mono)" fontSize="10.5" letterSpacing="0.5" fill="var(--mkt-paper)">
                {meta.label.toUpperCase()}
              </text>
              <text x={n.x + 16} y={n.y + 34} fontFamily="var(--mkt-font-mono)" fontSize="9" fill="var(--mkt-paper-faint)">
                {meta.sub}
              </text>
            </g>
          );
        })}
      </svg>

      <p className="mkt-diagram__hint mkt-mono">Click an engine to see it in action ↓</p>

      <style>{`
        .mkt-diagram {
          width: 100%;
          max-width: 560px;
          margin-inline: auto;
        }
        .mkt-diagram svg {
          width: 100%;
          height: auto;
          display: block;
        }
        .mkt-diagram__node {
          cursor: pointer;
        }
        .mkt-diagram__node:hover rect:first-child,
        .mkt-diagram__node:focus rect:first-child {
          stroke: var(--mkt-blueprint);
        }
        .mkt-diagram__hint {
          text-align: center;
          font-size: 0.6875rem;
          color: var(--mkt-paper-faint);
          margin-top: 8px;
          letter-spacing: 0.04em;
        }
        .mkt-trace {
          stroke-dasharray: 5 4;
          animation: mkt-flow 3.2s linear infinite;
        }
        .mkt-core-pulse {
          animation: mkt-core-pulse 3s ease-in-out infinite;
          transform-origin: 300px 300px;
        }
        @keyframes mkt-flow {
          to { stroke-dashoffset: -90; }
        }
        @keyframes mkt-core-pulse {
          0%, 100% { opacity: 0.06; }
          50% { opacity: 0.22; }
        }
        @media (prefers-reduced-motion: reduce) {
          .mkt-trace, .mkt-core-pulse { animation: none; }
        }
      `}</style>
    </div>
  );
}
