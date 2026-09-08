"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useScrolled } from "./interactions";

const LINKS = [
  { href: "/#engines", label: "Engines" },
  { href: "/#industries", label: "Industries" },
  { href: "/pricing", label: "Pricing" },
];

export default function MarketingNav() {
  const scrolled = useScrolled(12);
  const [open, setOpen] = useState(false);

  return (
    <header className={`mkt-nav ${scrolled ? "mkt-nav--scrolled" : ""}`}>
      <div className="mkt-container mkt-nav__row">
        <Link href="/" className="mkt-nav__brand" onClick={() => setOpen(false)}>
          <Image src="/logo.png" alt="Aurevyn" width={132} height={32} style={{ height: 26, width: "auto" }} priority />
        </Link>

        <nav className="mkt-nav__links" aria-label="Primary">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="mkt-nav__link">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="mkt-nav__ctas">
          <Link href="/login" className="mkt-nav__link mkt-nav__link--login">
            Log in
          </Link>
          <Link href="/register" className="mkt-btn mkt-btn--primary mkt-btn--sm">
            Start free trial
          </Link>
        </div>

        <button
          className={`mkt-nav__burger ${open ? "mkt-nav__burger--open" : ""}`}
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      <div className={`mkt-nav__mobile ${open ? "mkt-nav__mobile--open" : ""}`}>
        <div className="mkt-container mkt-nav__mobile-inner">
          {LINKS.map((l, i) => (
            <Link
              key={l.href}
              href={l.href}
              className="mkt-nav__mobile-link"
              style={{ transitionDelay: `${i * 40}ms` }}
              onClick={() => setOpen(false)}
            >
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
      </div>

      <style>{`
        .mkt-nav {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(10, 14, 19, 0.6);
          backdrop-filter: blur(14px) saturate(140%);
          -webkit-backdrop-filter: blur(14px) saturate(140%);
          border-bottom: 1px solid transparent;
          transition: background 0.3s ease, border-color 0.3s ease, padding 0.3s ease;
        }
        .mkt-nav--scrolled {
          background: rgba(10, 14, 19, 0.86);
          border-bottom-color: var(--mkt-line);
        }
        .mkt-nav__row {
          display: flex;
          align-items: center;
          gap: 28px;
          padding-block: 18px;
          transition: padding 0.3s ease;
        }
        .mkt-nav--scrolled .mkt-nav__row {
          padding-block: 13px;
        }
        .mkt-nav__brand {
          display: flex;
          align-items: center;
          transition: transform 0.2s ease;
        }
        .mkt-nav__brand:hover {
          transform: scale(1.03);
        }
        .mkt-nav__links {
          display: flex;
          align-items: center;
          gap: 28px;
          margin-right: auto;
          margin-left: 12px;
        }
        .mkt-nav__link {
          position: relative;
          font-size: 0.875rem;
          color: var(--mkt-paper-dim);
          padding-bottom: 3px;
        }
        .mkt-nav__link::after {
          content: "";
          position: absolute;
          left: 0;
          right: 100%;
          bottom: 0;
          height: 1px;
          background: var(--mkt-blueprint);
          transition: right 0.22s ease;
        }
        .mkt-nav__link:hover {
          color: var(--mkt-paper);
        }
        .mkt-nav__link:hover::after {
          right: 0;
        }
        .mkt-nav__ctas {
          display: flex;
          align-items: center;
          gap: 20px;
          flex-shrink: 0;
        }
        .mkt-nav__link--login {
          padding-bottom: 0;
        }
        .mkt-nav__burger {
          display: none;
          flex-direction: column;
          justify-content: center;
          gap: 5px;
          width: 32px;
          height: 32px;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          margin-left: auto;
        }
        .mkt-nav__burger span {
          display: block;
          width: 100%;
          height: 1.5px;
          background: var(--mkt-paper);
          transition: transform 0.25s ease, opacity 0.25s ease;
        }
        .mkt-nav__burger--open span:nth-child(1) {
          transform: translateY(6.5px) rotate(45deg);
        }
        .mkt-nav__burger--open span:nth-child(2) {
          opacity: 0;
        }
        .mkt-nav__burger--open span:nth-child(3) {
          transform: translateY(-6.5px) rotate(-45deg);
        }
        .mkt-nav__mobile {
          display: none;
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.35s ease;
          background: var(--mkt-ink-2);
          border-bottom: 1px solid transparent;
        }
        .mkt-nav__mobile--open {
          max-height: 420px;
          border-bottom-color: var(--mkt-line);
        }
        .mkt-nav__mobile-inner {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding-block: 18px;
        }
        .mkt-nav__mobile-link {
          font-size: 0.9375rem;
          color: var(--mkt-paper-dim);
          padding: 10px 0;
          opacity: 0;
          transform: translateX(-8px);
          transition: opacity 0.3s ease, transform 0.3s ease, color 0.15s ease;
        }
        .mkt-nav__mobile--open .mkt-nav__mobile-link {
          opacity: 1;
          transform: translateX(0);
        }
        .mkt-nav__mobile-link:hover {
          color: var(--mkt-paper);
        }
        @media (max-width: 860px) {
          .mkt-nav__links,
          .mkt-nav__ctas {
            display: none;
          }
          .mkt-nav__burger {
            display: flex;
          }
          .mkt-nav__mobile {
            display: block;
          }
        }
      `}</style>
    </header>
  );
}