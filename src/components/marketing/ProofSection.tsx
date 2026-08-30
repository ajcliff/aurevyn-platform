function AiIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect x="9" y="9" width="14" height="14" stroke="var(--mkt-brass)" strokeWidth="1.3" />
      <circle cx="13" cy="13" r="1.4" fill="var(--mkt-brass)" />
      <circle cx="19" cy="13" r="1.4" fill="var(--mkt-brass)" />
      <path d="M12 19h8" stroke="var(--mkt-brass)" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M16 2v7M16 23v7M2 16h7M23 16h7" stroke="var(--mkt-brass)" strokeWidth="1" opacity="0.4" />
    </svg>
  );
}

function MpesaIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect x="10" y="4" width="12" height="24" rx="1.5" stroke="var(--mkt-signal)" strokeWidth="1.3" />
      <line x1="10" y1="22" x2="22" y2="22" stroke="var(--mkt-signal)" strokeWidth="1" opacity="0.5" />
      <circle cx="16" cy="25" r="1.3" fill="var(--mkt-signal)" />
      <path d="M13 11l2 3 4-5" stroke="var(--mkt-signal)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <path d="M16 4l10 4v8c0 7-4.5 10.5-10 12-5.5-1.5-10-5-10-12V8l10-4z" stroke="var(--mkt-alert)" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M12 16l3 3 6-6" stroke="var(--mkt-alert)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function ProofSection() {
  return (
    <section className="mkt-section mkt-section--tight">
      <div className="mkt-container">
        <div className="mkt-eyebrow">Sheet 06 / Built in</div>
        <h2 className="mkt-h2" style={{ marginTop: 14, maxWidth: 600 }}>
          The parts other platforms sell as add-ons.
        </h2>

        <div className="mkt-grid mkt-cols-3" style={{ marginTop: 44 }}>
          <div className="mkt-card mkt-proof-card">
            <AiIcon />
            <div className="mkt-badge-live" style={{ marginTop: 14 }}>Live</div>
            <h3 className="mkt-h3" style={{ marginTop: 12 }}>Ask Aurevyn</h3>
            <p className="mkt-body" style={{ marginTop: 10, fontSize: "0.9375rem" }}>
              An AI copilot that already knows your business — ask it for a
              revenue summary, which branches need attention, or what's
              expiring this week, in plain language.
            </p>
          </div>

          <div className="mkt-card mkt-proof-card">
            <MpesaIcon />
            <div className="mkt-tag" style={{ marginTop: 14 }}>M-Pesa</div>
            <h3 className="mkt-h3" style={{ marginTop: 12 }}>Native mobile money</h3>
            <p className="mkt-body" style={{ marginTop: 10, fontSize: "0.9375rem" }}>
              STK push at checkout, reconciled straight into finance. Not a
              plugin someone bolted on — it's how the till was built to take
              payment from day one.
            </p>
          </div>

          <div className="mkt-card mkt-proof-card">
            <ShieldIcon />
            <div className="mkt-tag" style={{ marginTop: 14 }}>Security</div>
            <h3 className="mkt-h3" style={{ marginTop: 12 }}>Threat monitoring</h3>
            <p className="mkt-body" style={{ marginTop: 10, fontSize: "0.9375rem" }}>
              Every organization is watched for the access patterns that
              precede fraud and breach attempts — a security team, running
              quietly in the background.
            </p>
          </div>
        </div>
      </div>

      <style>{`
        .mkt-proof-card {
          transition: transform 0.2s ease, border-color 0.2s ease;
        }
        .mkt-proof-card:hover {
          transform: translateY(-3px);
        }
      `}</style>
    </section>
  );
}
