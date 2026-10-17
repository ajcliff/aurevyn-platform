const POINTS = [
  { title: "Approvals that go to the right person", body: "Spending, refunds, payroll and supplier payments wait for sign-off. Once you have more than ten people, each request goes to the requester's department head first, then to the owners." },
  { title: "A trail for everything sensitive", body: "See what was started, where it stands, who started it, and who authorised it and when." },
  { title: "Approve from your email", body: "Approvers get an email with Approve and Reject buttons that open the request ready to confirm, so nothing waits for someone to remember to check." },
  { title: "Two-factor sign-in", body: "Protect accounts with an authenticator app. Roles decide who sees finance, payroll and settings." },
  { title: "Your own mail inside AUREVYN", body: "Staff message each other and attach documents. Search only ever lists people in your organization." },
  { title: "Documents in one place", body: "Purchase orders, receipts, invoices and uploaded files are all in Documents, and can be sent to a teammate in a click." },
];

export default function HomeControl() {
  return (
    <section className="mkt-section" style={{ borderTop: "1px solid var(--mkt-line)" }}>
      <div className="mkt-container">
        <div className="mkt-eyebrow mkt-eyebrow--brass">Control</div>
        <h2 className="mkt-h2" style={{ marginTop: 14, maxWidth: 620 }}>Know what happened, and who agreed to it.</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginTop: 36 }}>
          {POINTS.map((p) => (
            <div key={p.title} className="mkt-card" style={{ padding: 22 }}>
              <h3 className="mkt-h3" style={{ fontSize: "1.0625rem" }}>{p.title}</h3>
              <p className="mkt-body" style={{ marginTop: 8, fontSize: "0.9375rem" }}>{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
