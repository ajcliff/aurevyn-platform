import Link from "next/link";
import Image from "next/image";
import MarketingShell from "./MarketingShell";

export default function AuthShell({
  children,
  width = 420,
}: {
  children: React.ReactNode;
  width?: number;
}) {
  return (
    <MarketingShell>
      <div className="mkt-auth">
        <div className="mkt-auth__panel" style={{ maxWidth: width }}>
          <Link href="/" className="mkt-auth__logo">
            <Image src="/icon.png" alt="Aurevyn" width={32} height={32} style={{ height: 28, width: "auto" }} />
            <span className="mkt-mono">AUREVYN</span>
          </Link>

          <div className="mkt-card mkt-auth__card">{children}</div>

          <p className="mkt-auth__footer mkt-mono">Business Operating System</p>
        </div>
      </div>

      <style>{`
        .mkt-auth {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px 20px;
        }
        .mkt-auth__panel {
          width: 100%;
          margin-inline: auto;
        }
        .mkt-auth__logo {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-bottom: 24px;
          font-size: 0.9375rem;
          letter-spacing: 0.1em;
          color: var(--mkt-paper);
        }
        .mkt-auth__card {
          padding: 32px;
        }
        .mkt-auth__footer {
          text-align: center;
          margin-top: 20px;
          font-size: 0.6875rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--mkt-paper-faint);
        }
      `}</style>
    </MarketingShell>
  );
}
