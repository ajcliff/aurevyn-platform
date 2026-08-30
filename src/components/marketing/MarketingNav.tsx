import Link from "next/link";

const COLUMNS = [
  {
    heading: "Product",
    links: [
      { href: "/#engines", label: "Engines" },
      { href: "/#industries", label: "Industries" },
      { href: "/pricing", label: "Pricing" },
      { href: "/register", label: "Start free trial" },
    ],
  },
  {
    heading: "Company",
    links: [
      { href: "/contact", label: "Contact" },
      { href: "/login", label: "Log in" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { href: "/terms", label: "Terms of service" },
      { href: "/privacy", label: "Privacy policy" },
    ],
  },
];

export default function MarketingFooter() {
  return (
    <footer className="mkt-footer">
      <div className="mkt-container mkt-footer__top">
        <div className="mkt-footer__brand">
          <img src="/logo.png" alt="Aurevyn" style={{ height: 32, width: "auto" }} />
          <p className="mkt-body" style={{ maxWidth: 280, fontSize: "0.875rem", marginTop: 14 }}>
            The business operating system built in Africa, for African
            operations — from the till to the balance sheet.
          </p>
          <div className="mkt-badge-live" style={{ marginTop: 18 }}>
            All engines operational
          </div>
        </div>

        {COLUMNS.map((col) => (
          <div key={col.heading} className="mkt-footer__col">
            <div className="mkt-tag" style={{ marginBottom: 14 }}>{col.heading}</div>
            <ul className="mkt-footer__list">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="mkt-footer__link">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mkt-container mkt-footer__bottom">
        <span className="mkt-mono">© {new Date().getFullYear()} AUREVYN LABS · REG. NAIROBI, KE</span>
        <span className="mkt-mono mkt-dim">BUILT FOR RETAIL · HEALTHCARE · EDUCATION · DISTRIBUTION</span>
      </div>

      <style>{`
        .mkt-footer {
          padding-top: 80px;
        }
        .mkt-footer__top {
          display: grid;
          grid-template-columns: 1.6fr repeat(3, 1fr);
          gap: 32px;
          padding-bottom: 56px;
        }
        .mkt-footer__list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .mkt-footer__link {
          font-size: 0.875rem;
          color: var(--mkt-paper-dim);
        }
        .mkt-footer__link:hover {
          color: var(--mkt-blueprint);
        }
        .mkt-footer__bottom {
          border-top: 1px solid var(--mkt-line);
          padding-block: 22px;
          display: flex;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px;
          font-size: 0.75rem;
          color: var(--mkt-paper-faint);
          letter-spacing: 0.04em;
        }
        @media (max-width: 760px) {
          .mkt-footer__top {
            grid-template-columns: 1fr 1fr;
          }
          .mkt-footer__brand {
            grid-column: 1 / -1;
            margin-bottom: 12px;
          }
        }
      `}</style>
    </footer>
  );
}