import Link from "next/link";
import MarketingShell from "@/components/marketing/MarketingShell";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";

export default function PrivacyPage() {
  return (
    <MarketingShell>
      <MarketingNav />

      <div className="mkt-container mkt-legal">
        <div className="mkt-eyebrow">Legal</div>
        <h1 className="mkt-h1" style={{ fontSize: "clamp(2rem, 3.6vw, 2.75rem)", marginTop: 14 }}>Privacy Policy</h1>
        <p className="mkt-mono mkt-dim" style={{ marginTop: 10, marginBottom: 8, fontSize: "0.8125rem" }}>
          Last updated: {new Date().toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" })}
        </p>

        <Section title="1. Introduction">
          This Privacy Policy explains how AUREVYN collects, uses, and protects information when you use our
          platform. We're committed to handling your data responsibly and in line with the Kenya Data
          Protection Act, 2019, and applicable data protection principles.
        </Section>

        <Section title="2. Information We Collect">
          <b>Account information:</b> name, email, phone number, and business details provided at registration.<br />
          <b>Business data:</b> information you enter into the Platform, including inventory, sales, customer,
          and employee records.<br />
          <b>Usage data:</b> how you interact with the Platform, for the purpose of improving reliability and
          performance.
        </Section>

        <Section title="3. How We Use Information">
          We use collected information to: provide and maintain the Platform; process transactions; send
          important account and service notifications; respond to support requests; and improve the
          Platform's features and reliability.
        </Section>

        <Section title="4. Data Storage and Security">
          Data is stored using industry-standard infrastructure providers. We take reasonable technical and
          organizational measures to protect your data, including access controls and encrypted connections.
          No system is perfectly secure, and we encourage strong, unique passwords for your account.
        </Section>

        <Section title="5. Data Sharing">
          We do not sell your personal or business data. We may share data with trusted service providers
          who help operate the Platform (such as hosting and payment processing providers), solely for the
          purpose of providing the service, and only to the extent necessary.
        </Section>

        <Section title="6. Payment Information">
          Where payment processing is enabled, transactions are handled through licensed payment providers.
          AUREVYN does not store full payment card or mobile money PIN details.
        </Section>

        <Section title="7. Your Rights">
          You have the right to access, correct, or request deletion of your personal information, subject
          to legal and legitimate business record-keeping requirements. Requests can be made via our{" "}
          <Link href="/contact" style={{ color: "var(--mkt-blueprint)" }}>Contact page</Link>.
        </Section>

        <Section title="8. Data Retention">
          We retain data for as long as your account is active or as needed to provide the service, comply
          with legal obligations, resolve disputes, and enforce agreements.
        </Section>

        <Section title="9. Cookies">
          We use essential cookies/local storage to keep you signed in and remember your preferences. We do
          not use tracking cookies for advertising purposes.
        </Section>

        <Section title="10. Children's Privacy">
          The Platform is intended for business use by adults and is not directed at children under 18.
        </Section>

        <Section title="11. Changes to This Policy">
          We may update this Privacy Policy periodically. Material changes will be communicated through the
          Platform or via email.
        </Section>

        <Section title="12. Contact Us">
          For privacy-related questions or requests, please reach out via our{" "}
          <Link href="/contact" style={{ color: "var(--mkt-blueprint)" }}>Contact page</Link>.
        </Section>
      </div>

      <MarketingFooter />

      <style>{`
        .mkt-legal { max-width: 740px; padding-block: 72px; }
      `}</style>
    </MarketingShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "28px", paddingTop: "20px", borderTop: "1px solid var(--mkt-line)" }}>
      <h2 className="mkt-mono" style={{ fontSize: "13px", letterSpacing: "0.04em", color: "var(--mkt-brass-light)", marginBottom: "8px", textTransform: "uppercase" }}>{title}</h2>
      <p style={{ color: "var(--mkt-paper-dim)", fontSize: "14px", lineHeight: 1.7 }}>{children}</p>
    </div>
  );
}