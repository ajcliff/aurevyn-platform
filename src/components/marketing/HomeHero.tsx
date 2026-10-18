import Link from "next/link";
import Wordmark from "@/components/Wordmark";

const FACTS = [
  { value: "10", label: "Engines, all on for 30 days" },
  { value: "Sync", label: "Sales keep saving if the internet drops" },
  { value: "KE-ready", label: "VAT, PAYE, NSSF and NHIF" },
];

const WAYS = [
  { title: "Windows app", body: "Its own window, a desktop shortcut and automatic updates.", href: "/download", cta: "Download" },
  { title: "In your browser", body: "Nothing to install. Sign in from any computer, phone or tablet.", href: "/login", cta: "Sign in" },
  { title: "Install from the web", body: "Add AUREVYN to your phone or laptop straight from the browser, like an app.", href: "/register", cta: "Start free" },
];

export default function HomeHero() {
  return (
    <section className="mkt-hero" style={{ paddingTop: 76, paddingBottom: 90, borderBottom: "1px solid var(--mkt-line)" }}>
      <div className="mkt-container" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 48, alignItems: "center" }}>
        <div>
          <Wordmark size="lg" />
          <div className="mkt-eyebrow" style={{ marginTop: 28 }}>For Kenyan businesses that sell and keep stock</div>
          <h1 className="mkt-h1" style={{ marginTop: 18 }}>
            Your till, your stock and your books. In one place.
          </h1>
          <p className="mkt-body-lg" style={{ marginTop: 22, maxWidth: 500 }}>
            Sell at the till, track every item across your shops and warehouses, and see your cash, credit customers and payroll without a spreadsheet. Everything is switched on for 30 days, free.
          </p>
          <div style={{ display: "flex", gap: 14, marginTop: 32, flexWrap: "wrap" }}>
            <Link href="/register" className="mkt-btn mkt-btn--primary">Start free trial</Link>
            <Link href="/download" className="mkt-btn mkt-btn--ghost">Download for Windows</Link>
          </div>
          <div style={{ display: "flex", gap: 28, marginTop: 44, paddingTop: 26, borderTop: "1px solid var(--mkt-line)", flexWrap: "wrap" }}>
            {FACTS.map((f) => (
              <div key={f.label}>
                <div className="mkt-num" style={{ fontSize: "1.375rem", fontWeight: 600 }}>{f.value}</div>
                <div className="mkt-tag" style={{ marginTop: 6 }}>{f.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gap: 14 }}>
          <div className="mkt-eyebrow mkt-eyebrow--brass">Use it your way</div>
          {WAYS.map((w) => (
            <Link key={w.title} href={w.href} className="mkt-card" style={{ padding: 20, display: "block", textDecoration: "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
                <h3 className="mkt-h3" style={{ fontSize: "1.0625rem" }}>{w.title}</h3>
                <span className="mkt-mono" style={{ color: "var(--mkt-brass)", fontSize: "0.75rem" }}>{w.cta} →</span>
              </div>
              <p className="mkt-body" style={{ marginTop: 6, fontSize: "0.9375rem" }}>{w.body}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
