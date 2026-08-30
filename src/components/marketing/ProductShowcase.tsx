"use client";

import type { CSSProperties } from "react";

import { useEffect, useState } from "react";
import { ENGINE_META, ENGINE_ORDER, ENGINE_SELECT_EVENT, type EngineId } from "./engineData";

const URLS: Record<EngineId, string> = {
  pos: "app.aurevyn.com/pos",
  inventory: "app.aurevyn.com/inventory",
  finance: "app.aurevyn.com/finance",
  crm: "app.aurevyn.com/customers",
  hr: "app.aurevyn.com/payroll",
  security: "app.aurevyn.com/security",
};

const DESCRIPTIONS: Record<EngineId, string> = {
  pos: "Ring up sales and take payment, online or offline.",
  inventory: "Stock levels across every branch, updated live.",
  finance: "Cashflow rolling up automatically from every sale.",
  crm: "Every customer and order in one shared record.",
  hr: "Payroll runs that match hours actually logged.",
  security: "Threat monitoring, watching quietly in the background.",
};

export default function ProductShowcase() {
  const [active, setActive] = useState<EngineId>("pos");

  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent<EngineId>).detail;
      if (id) setActive(id);
    };
    window.addEventListener(ENGINE_SELECT_EVENT, handler);
    return () => window.removeEventListener(ENGINE_SELECT_EVENT, handler);
  }, []);

  const meta = ENGINE_META[active];

  return (
    <section className="mkt-section" id="product">
      <div className="mkt-container">
        <div className="mkt-eyebrow">Sheet 03 / In use</div>
        <h2 className="mkt-h2" style={{ marginTop: 14, maxWidth: 600 }}>
          See what each engine actually does.
        </h2>
        <p className="mkt-body-lg" style={{ marginTop: 14, maxWidth: 560 }}>
          Not a screenshot gallery — a live look at the six screens your
          team will actually work in every day.
        </p>

        <div className="mkt-showcase">
          <div className="mkt-showcase__tabs">
            {ENGINE_ORDER.map((id) => {
              const m = ENGINE_META[id];
              const isActive = active === id;
              return (
                <button
                  key={id}
                  onClick={() => setActive(id)}
                  className={`mkt-showcase__tab ${isActive ? "mkt-showcase__tab--active" : ""}`}
                  style={{ "--engine-color": m.color } as CSSProperties}
                >
                  <span className="mkt-showcase__tab-label">{m.label}</span>
                  <span className="mkt-showcase__tab-desc">{DESCRIPTIONS[id]}</span>
                </button>
              );
            })}
          </div>

          <div className="mkt-showcase__frame">
            <div className="mkt-showcase__chrome">
              <span className="mkt-showcase__dot" />
              <span className="mkt-showcase__dot" />
              <span className="mkt-showcase__dot" />
              <span className="mkt-mono mkt-showcase__url">{URLS[active]}</span>
            </div>
            <div className="mkt-showcase__body" style={{ "--engine-color": meta.color } as CSSProperties}>
              {active === "pos" && <PosMock />}
              {active === "inventory" && <InventoryMock />}
              {active === "finance" && <FinanceMock />}
              {active === "crm" && <CrmMock />}
              {active === "hr" && <HrMock />}
              {active === "security" && <SecurityMock />}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .mkt-showcase {
          margin-top: 48px;
          display: grid;
          grid-template-columns: 260px 1fr;
          gap: 0;
          border: 1px solid var(--mkt-line);
        }
        .mkt-showcase__tabs {
          display: flex;
          flex-direction: column;
          border-right: 1px solid var(--mkt-line);
        }
        .mkt-showcase__tab {
          text-align: left;
          background: transparent;
          border: none;
          border-bottom: 1px solid var(--mkt-line);
          padding: 16px 18px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .mkt-showcase__tab:last-child { border-bottom: none; }
        .mkt-showcase__tab-label {
          font-family: var(--mkt-font-mono);
          font-size: 0.8125rem;
          letter-spacing: 0.04em;
          color: var(--mkt-paper-dim);
        }
        .mkt-showcase__tab-desc {
          font-size: 0.75rem;
          color: var(--mkt-paper-faint);
          line-height: 1.4;
        }
        .mkt-showcase__tab--active {
          background: var(--mkt-surface);
          border-left: 2px solid var(--engine-color);
        }
        .mkt-showcase__tab--active .mkt-showcase__tab-label {
          color: var(--engine-color);
        }
        .mkt-showcase__frame {
          background: var(--mkt-ink-2);
          min-height: 420px;
          display: flex;
          flex-direction: column;
        }
        .mkt-showcase__chrome {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 14px;
          border-bottom: 1px solid var(--mkt-line);
        }
        .mkt-showcase__dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--mkt-line-strong);
        }
        .mkt-showcase__url {
          margin-left: 10px;
          font-size: 0.6875rem;
          color: var(--mkt-paper-faint);
        }
        .mkt-showcase__body {
          padding: 28px;
          flex: 1;
        }
        @media (max-width: 820px) {
          .mkt-showcase { grid-template-columns: 1fr; }
          .mkt-showcase__tabs {
            flex-direction: row;
            overflow-x: auto;
            border-right: none;
            border-bottom: 1px solid var(--mkt-line);
          }
          .mkt-showcase__tab {
            border-bottom: none;
            border-right: 1px solid var(--mkt-line);
            min-width: 160px;
          }
          .mkt-showcase__tab--active {
            border-left: none;
            border-top: 2px solid var(--engine-color);
          }
        }
      `}</style>
    </section>
  );
}

// ---- Mockup panels ----

function PosMock() {
  const items = [
    { name: "Maize flour 2kg", qty: 2, price: 240 },
    { name: "Cooking oil 1L", qty: 1, price: 380 },
    { name: "Bread (family)", qty: 3, price: 165 },
    { name: "Airtime top-up", qty: 1, price: 100 },
  ];
  const total = items.reduce((s, i) => s + i.qty * i.price, 0);
  return (
    <div className="mkt-mock-pos">
      <div className="mkt-mock-pos__ticket">
        {items.map((i) => (
          <div key={i.name} className="mkt-mock-row">
            <span>{i.name} <span className="mkt-dim">×{i.qty}</span></span>
            <span className="mkt-num">KSh {(i.qty * i.price).toLocaleString()}</span>
          </div>
        ))}
        <div className="mkt-mock-pos__total">
          <span>Total</span>
          <span className="mkt-num">KSh {total.toLocaleString()}</span>
        </div>
      </div>
      <button className="mkt-btn mkt-btn--primary mkt-btn--full" style={{ marginTop: 16 }}>
        Charge via M-Pesa
      </button>
    </div>
  );
}

function InventoryMock() {
  const rows = [
    { sku: "MZ-2KG", name: "Maize flour 2kg", stock: 142, status: "ok" },
    { sku: "CO-1L", name: "Cooking oil 1L", stock: 18, status: "low" },
    { sku: "BR-FAM", name: "Bread (family)", stock: 6, status: "critical" },
    { sku: "RC-5KG", name: "Rice 5kg", stock: 87, status: "ok" },
  ];
  return (
    <table className="mkt-mock-table">
      <thead>
        <tr><th>SKU</th><th>Item</th><th>Stock</th><th>Status</th></tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.sku}>
            <td className="mkt-mono">{r.sku}</td>
            <td>{r.name}</td>
            <td className="mkt-num">{r.stock}</td>
            <td><span className={`mkt-mock-badge mkt-mock-badge--${r.status}`}>{r.status}</span></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function FinanceMock() {
  const bars = [40, 65, 52, 78, 60, 90, 74];
  return (
    <div>
      <div className="mkt-mock-row" style={{ marginBottom: 18 }}>
        <div>
          <div className="mkt-tag">Revenue (7d)</div>
          <div className="mkt-num" style={{ fontSize: "1.5rem", marginTop: 6, color: "var(--mkt-paper)" }}>KSh 812,400</div>
        </div>
        <div>
          <div className="mkt-tag">Expenses</div>
          <div className="mkt-num" style={{ fontSize: "1.5rem", marginTop: 6, color: "var(--mkt-paper)" }}>KSh 214,900</div>
        </div>
      </div>
      <div className="mkt-mock-chart">
        {bars.map((h, i) => (
          <div key={i} className="mkt-mock-bar" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}

function CrmMock() {
  const rows = [
    { initials: "JN", name: "Jane Njoroge", last: "Last order: 2 days ago", tag: "Repeat" },
    { initials: "OK", name: "Omondi Kiptoo", last: "Last order: today", tag: "New" },
    { initials: "AW", name: "Amara Wanjiru", last: "Last order: 1 week ago", tag: "VIP" },
  ];
  return (
    <div className="mkt-mock-list">
      {rows.map((r) => (
        <div key={r.name} className="mkt-mock-list__row">
          <div className="mkt-mock-avatar">{r.initials}</div>
          <div style={{ flex: 1 }}>
            <div>{r.name}</div>
            <div className="mkt-dim" style={{ fontSize: "0.8125rem" }}>{r.last}</div>
          </div>
          <span className="mkt-tag">{r.tag}</span>
        </div>
      ))}
    </div>
  );
}

function HrMock() {
  const rows = [
    { name: "Brian Otieno", role: "Till operator", hours: 168, net: 24500 },
    { name: "Faith Wambui", role: "Store supervisor", hours: 172, net: 38200 },
    { name: "Peter Mwangi", role: "Warehouse", hours: 160, net: 21000 },
  ];
  return (
    <table className="mkt-mock-table">
      <thead>
        <tr><th>Staff</th><th>Role</th><th>Hours</th><th>Net pay</th></tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.name}>
            <td>{r.name}</td>
            <td className="mkt-dim">{r.role}</td>
            <td className="mkt-num">{r.hours}</td>
            <td className="mkt-num">KSh {r.net.toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SecurityMock() {
  const events = [
    { sev: "info", label: "New device login", where: "Nairobi CBD branch", time: "2m ago" },
    { sev: "warn", label: "Unusual login time", where: "Mombasa branch", time: "41m ago" },
    { sev: "ok", label: "Threat scan complete", where: "All branches", time: "1h ago" },
  ];
  return (
    <div className="mkt-mock-list">
      <div className="mkt-badge-live" style={{ marginBottom: 14 }}>Monitoring active</div>
      {events.map((e, i) => (
        <div key={i} className="mkt-mock-list__row">
          <span className={`mkt-mock-badge mkt-mock-badge--${e.sev === "warn" ? "low" : e.sev === "ok" ? "ok" : "info"}`}>
            {e.sev}
          </span>
          <div style={{ flex: 1 }}>
            <div>{e.label}</div>
            <div className="mkt-dim" style={{ fontSize: "0.8125rem" }}>{e.where}</div>
          </div>
          <span className="mkt-mono mkt-dim" style={{ fontSize: "0.75rem" }}>{e.time}</span>
        </div>
      ))}
    </div>
  );
}
