const STEPS = [
  { n: "1", title: "Create your organization", body: "Sign up with your work email. Every engine is on for 30 days, no card needed." },
  { n: "2", title: "Set up in a few minutes", body: "A checklist walks you through adding your products, a cash or M-Pesa account, and making your first sale." },
  { n: "3", title: "Bring your team", body: "Create accounts for staff, put them in departments and give each person only the engines they need." },
];

export default function HomeSteps() {
  return (
    <section className="mkt-section mkt-section--tight" style={{ borderTop: "1px solid var(--mkt-line)" }}>
      <div className="mkt-container">
        <div className="mkt-eyebrow mkt-eyebrow--brass">Getting started</div>
        <h2 className="mkt-h2" style={{ marginTop: 14 }}>Selling in an afternoon.</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginTop: 30 }}>
          {STEPS.map((s) => (
            <div key={s.n} className="mkt-card" style={{ padding: 24 }}>
              <div className="mkt-mono" style={{ color: "var(--mkt-brass)", fontSize: "0.8125rem" }}>STEP {s.n}</div>
              <h3 className="mkt-h3" style={{ marginTop: 8, fontSize: "1.125rem" }}>{s.title}</h3>
              <p className="mkt-body" style={{ marginTop: 8, fontSize: "0.9375rem" }}>{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
