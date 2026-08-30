import Link from "next/link";

export default function CtaBand() {
  return (
    <section className="mkt-cta">
      <div className="mkt-container mkt-cta__inner">
        <div>
          <div className="mkt-eyebrow mkt-eyebrow--brass">Sheet 08 / Get started</div>
          <h2 className="mkt-h2" style={{ marginTop: 14 }}>
            Bring your business onto one core.
          </h2>
          <p className="mkt-body-lg" style={{ marginTop: 12, maxWidth: 460 }}>
            Set up your first engine in minutes. No card required to start.
          </p>
        </div>
        <div className="mkt-cta__ctas">
          <Link href="/register" className="mkt-btn mkt-btn--primary">
            Start free trial
          </Link>
          <Link href="/contact" className="mkt-btn mkt-btn--ghost">
            Talk to us
          </Link>
        </div>
      </div>

      <style>{`
        .mkt-cta {
          padding-block: 100px;
          border-bottom: 1px solid var(--mkt-line);
        }
        .mkt-cta__inner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 32px;
          flex-wrap: wrap;
        }
        .mkt-cta__ctas {
          display: flex;
          gap: 14px;
          flex-wrap: wrap;
        }
      `}</style>
    </section>
  );
}