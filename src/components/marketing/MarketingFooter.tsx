import Link from "next/link";
import RevealOnScroll from "./RevealOnScroll";
import Wordmark from "../../../wordmark";

const COLUMNS = [
  {
    heading: "Product",
    accent: "var(--mkt-blueprint)",
    links: [
      { href: "/#engines", label: "Engines" },
      { href: "/#industries", label: "Industries" },
      { href: "/pricing", label: "Pricing" },
      { href: "/register", label: "Start free trial" },
    ],
  },
  {
    heading: "Company",
    accent: "var(--mkt-blueprint)",
    links: [
      { href: "/contact", label: "Contact" },
      { href: "/login", label: "Log in" },
    ],
  },
  {
    heading: "Legal",
    accent: "var(--mkt-brass-light)",
    links: [
      { href: "/terms", label: "Terms of service" },
      { href: "/privacy", label: "Privacy policy" },
    ],
  },
];

export default function MarketingFooter() {
  return (
    <footer className="mkt-footer">
      <div className="mkt-footer__spectrum" aria-hidden="true" />
      <div className="mkt-container mkt-footer__top">
        <div className="mkt-footer__brand">
          <Wordmark size="md" />
          <p className="mkt-body" style={{ maxWidth: 280, fontSize: "0.875rem", marginTop: 14 }}>
            The POS that runs your whole business — built in Africa, for
            African
            operations — from the till to the balance sheet.
          </p>
          <div className="mkt-badge-live" style={{ marginTop: 18 }}>
            All engines operational
          </div>
        </div>

        <RevealOnScroll stagger={80} variant="up" className="mkt-footer__cols">
          {COLUMNS.map((col) => (
            <div key={col.heading} className="mkt-footer__col">
              <div
                className="mkt-tag mkt-footer__col-tag"
                style={{ marginBottom: 14, ["--col-accent" as string]: col.accent }}
              >
                {col.heading}
              </div>
              <ul className="mkt-footer__list">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="mkt-footer__link"
                      style={{ ["--col-accent" as string]: col.accent }}
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </RevealOnScroll>
      </div>

      <div className="mkt-container mkt-footer__bottom">
        <span className="mkt-mono">© {new Date().getFullYear()} AUREVYN LABS · REG. NAIROBI, KE</span>
        <span className="mkt-mono mkt-dim">BUILT FOR RETAIL · HEALTHCARE · EDUCATION · DISTRIBUTION</span>
      </div>

      <style>{`
        .mkt-footer {
          padding-top: 80px;
          position: relative;
        }
        .mkt-footer__spectrum {
          height: 2px;
          background: linear-gradient(90deg, var(--mkt-blueprint), var(--mkt-brass));
          opacity: 0.8;
        }
        .mkt-footer__top {
          display: grid;
          grid-template-columns: 1.6fr 3fr;
          gap: 32px;
          padding-top: 44px;
          padding-bottom: 56px;
        }
        .mkt-footer__cols {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 32px;
        }
        .mkt-footer__list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .mkt-footer__col-tag {
          transition: border-color 0.2s ease, color 0.2s ease;
        }
        .mkt-footer__col-tag:hover {
          border-color: var(--col-accent);
          color: var(--col-accent);
        }
        .mkt-footer__link {
          font-size: 0.875rem;
          color: var(--mkt-paper-dim);
          transition: color 0.2s ease;
        }
        .mkt-footer__link:hover {
          color: var(--col-accent, var(--mkt-blueprint));
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
            grid-template-columns: 1fr;
          }
          .mkt-footer__cols {
            grid-template-columns: 1fr 1fr;
          }
          .mkt-footer__brand {
            margin-bottom: 12px;
          }
        }
      `}</style>
    </footer>
  );
}