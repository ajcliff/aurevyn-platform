"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

const LINKS = [
  { href: "/#engines", label: "Engines" },
  { href: "/#industries", label: "Industries" },
  { href: "/pricing", label: "Pricing" },
  { href: "/contact", label: "Contact" },
];

export default function MarketingNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="mkt-nav">
      <div className="mkt-container mkt-nav__row">
        <Link href="/" className="mkt-nav__logo" onClick={() => setOpen(false)}>
          <Image src="/icon.png" alt="Aurevyn" width={28} height={28} style={{ height: 24, width: "auto" }} />
          AUREVYN
        </Link>

        <nav className="mkt-nav__links">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="mkt-nav__link">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="mkt-nav__actions">
          <Link href="/login" className="mkt-nav__link mkt-nav__link--auth">
            Log in
          </Link>
          <Link href="/register" className="mkt-btn mkt-btn--primary mkt-btn--sm">
            Start free trial
          </Link>
        </div>

        <button
          className="mkt-nav__burger"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span />
          <span />
        </button>
      </div>

      {open && (
        <div className="mkt-nav__mobile">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="mkt-nav__mobile-link" onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          ))}
          <div className="mkt-divider" style={{ margin: "8px 0" }} />
          <Link href="/login" className="mkt-nav__mobile-link" onClick={() => setOpen(false)}>
            Log in
          </Link>
          <Link href="/register" className="mkt-btn mkt-btn--primary mkt-btn--full" onClick={() => setOpen(false)}>
            Start free trial
          </Link>
        </div>
      )}

      <style jsx>{`
        .mkt-nav {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(10, 14, 19, 0.82);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid var(--mkt-line);
        }
        .mkt-nav__row {
          height: 68px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
        }
        .mkt-nav__logo {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-family: var(--mkt-font-mono);
          font-weight: 600;
          font-size: 0.9375rem;
          letter-spacing: 0.08em;
          color: var(--mkt-paper);
        }
        .mkt-nav__links {
          display: flex;
          gap: 32px;
          margin-right: auto;
          margin-left: 48px;
        }
        .mkt-nav__link {
          font-size: 0.875rem;
          color: var(--mkt-paper-dim);
          transition: color 0.15s ease;
        }
        .mkt-nav__link:hover {
          color: var(--mkt-blueprint);
        }
        .mkt-nav__actions {
          display: flex;
          align-items: center;
          gap: 20px;
        }
        .mkt-nav__link--auth {
          color: var(--mkt-paper);
        }
        .mkt-nav__burger {
          display: none;
          flex-direction: column;
          gap: 5px;
          background: none;
          border: none;
          padding: 8px;
          cursor: pointer;
        }
        .mkt-nav__burger span {
          width: 20px;
          height: 1px;
          background: var(--mkt-paper);
        }
        .mkt-nav__mobile {
          display: none;
        }
        @media (max-width: 860px) {
          .mkt-nav__links,
          .mkt-nav__actions {
            display: none;
          }
          .mkt-nav__burger {
            display: flex;
          }
          .mkt-nav__mobile {
            display: flex;
            flex-direction: column;
            gap: 4px;
            padding: 16px 24px 24px;
            border-top: 1px solid var(--mkt-line);
          }
          .mkt-nav__mobile-link {
            padding: 12px 0;
            font-size: 0.9375rem;
            color: var(--mkt-paper-dim);
            border-bottom: 1px solid var(--mkt-line);
          }
        }
      `}</style>
    </header>
  );
}
