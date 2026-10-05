import type { Metadata } from "next";
import Link from "next/link";
import MarketingShell from "@/components/marketing/MarketingShell";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";

export const metadata: Metadata = {
  title: "Download AUREVYN for Windows",
  description: "Install the AUREVYN desktop app for Windows: a setup wizard, its own window, and automatic updates.",
};

// Latest installer from the public releases repo (always the newest published version)
const INSTALLER_URL = "https://github.com/ajcliff/aurevyn-releases/releases/latest/download/AUREVYN-Setup.exe";

const STEPS = [
  { n: "1", title: "Download", body: "Click the button above to download AUREVYN-Setup.exe." },
  { n: "2", title: "Run the setup", body: "Open the file and follow the wizard. Choose where to install and whether you want a desktop shortcut." },
  { n: "3", title: "Sign in", body: "AUREVYN opens in its own window. Sign in, or start a free trial if you're new." },
];

export default function DownloadPage() {
  return (
    <MarketingShell>
      <MarketingNav />

      <section className="mkt-section mkt-section--tight" style={{ textAlign: "center" }}>
        <div className="mkt-container">
          <div className="mkt-eyebrow" style={{ justifyContent: "center" }}>Desktop app</div>
          <h1 className="mkt-h1" style={{ marginTop: 16, fontSize: "clamp(2.25rem, 4.4vw, 3.25rem)" }}>
            AUREVYN for Windows.
          </h1>
          <p className="mkt-body-lg" style={{ marginTop: 16, maxWidth: 540, marginInline: "auto" }}>
            Your whole business in its own window, with a proper installer, a desktop shortcut and automatic updates.
          </p>
          <p style={{ marginTop: 28 }}>
            <a href={INSTALLER_URL} className="mkt-btn mkt-btn--primary">Download for Windows</a>
          </p>
          <p className="mkt-mono mkt-dim" style={{ marginTop: 12, fontSize: "0.75rem" }}>
            Windows 10 or 11, 64-bit. About 100 MB.
          </p>
        </div>
      </section>

      <section className="mkt-section">
        <div className="mkt-container" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
          {STEPS.map((s) => (
            <div key={s.n} className="mkt-card" style={{ padding: 24 }}>
              <div className="mkt-mono" style={{ color: "var(--mkt-brass)", fontSize: "0.8125rem" }}>STEP {s.n}</div>
              <h3 className="mkt-h3" style={{ marginTop: 8, fontSize: "1.125rem" }}>{s.title}</h3>
              <p className="mkt-body" style={{ marginTop: 8, fontSize: "0.9375rem" }}>{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mkt-section mkt-section--tight">
        <div className="mkt-container" style={{ maxWidth: 720 }}>
          <div className="mkt-eyebrow mkt-eyebrow--brass">Good to know</div>
          <h2 className="mkt-h2" style={{ marginTop: 14, fontSize: "1.5rem" }}>Windows may ask before it runs</h2>
          <p className="mkt-body" style={{ marginTop: 12, fontSize: "0.9375rem" }}>
            While AUREVYN is new, Windows SmartScreen may show &quot;Windows protected your PC&quot;. Click <strong>More info</strong>, then <strong>Run anyway</strong>. This warning fades as more people install the app.
          </p>
          <h2 className="mkt-h2" style={{ marginTop: 32, fontSize: "1.5rem" }}>On a phone or tablet?</h2>
          <p className="mkt-body" style={{ marginTop: 12, fontSize: "0.9375rem" }}>
            Open this site in Chrome (Android) or Safari (iPhone) and choose <strong>Install app</strong> or <strong>Add to Home Screen</strong>.
          </p>
          <p className="mkt-body" style={{ marginTop: 24, fontSize: "0.9375rem" }}>
            Not ready to install? <Link href="/login" style={{ color: "var(--mkt-brass)" }}>Use AUREVYN in your browser</Link>.
          </p>
        </div>
      </section>

      <MarketingFooter />
    </MarketingShell>
  );
}
