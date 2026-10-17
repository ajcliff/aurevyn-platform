import Link from "next/link";
import MarketingShell from "@/components/marketing/MarketingShell";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";

export default function TermsPage() {
  return (
    <MarketingShell>
      <MarketingNav />

      <div className="mkt-container mkt-legal">
        <div className="mkt-eyebrow">Legal</div>
        <h1 className="mkt-h1" style={{ fontSize: "clamp(2rem, 3.6vw, 2.75rem)", marginTop: 14 }}>Terms of Service</h1>
        <p className="mkt-mono mkt-dim" style={{ marginTop: 10, marginBottom: 8, fontSize: "0.8125rem" }}>
          Last updated: 17 October 2026
        </p>

        <Section title="1. Agreement to Terms">
          By creating an account or using AUREVYN ("the Platform," "we," "us," "our"), you agree to be bound by
          these Terms of Service. If you're registering on behalf of a business, you confirm you have the
          authority to bind that business to these terms.
        </Section>

        <Section title="2. The Service">
          AUREVYN is a business operating platform for Kenyan businesses. It provides tools for point of sale,
          inventory, finance, procurement, human resources and payroll, customer relationship management,
          business operations, analytics, automation and AI insights ("Engines"). You use the Engines you
          subscribe to, with a number of seats for each. Features may be added, changed or retired over time.
        </Section>

        <Section title="3. Accounts and Access">
          You're responsible for maintaining the confidentiality of your account credentials and for all
          activity that occurs under your account. You must provide accurate information when registering.
          If you invite team members, you're responsible for the access levels you grant them.
        </Section>

        <Section title="4. Subscription and Billing">
          New organizations get a free trial of 30 days with every Engine switched on and no card required. After
          the trial you choose which Engines to keep and how many seats each needs. Prices are those shown on our
          Pricing page when you subscribe and may change with reasonable notice. We issue a numbered invoice each
          month and a numbered receipt when you pay. You can pay online, by M-Pesa, bank transfer, cash or cheque.
          Unpaid invoices may lead to your access being limited until they are settled.
        </Section>

        <Section title="5. Your Data">
          You retain ownership of all business data you input into AUREVYN, including but not limited to
          inventory records, customer information, sales data, and employee records. We do not sell your
          data. See our <Link href="/privacy" style={{ color: "var(--mkt-blueprint)" }}>Privacy Policy</Link> for
          details on how data is collected, stored, and used.
        </Section>

        <Section title="6. Acceptable Use">
          You agree not to use the Platform to: violate any law; infringe on others' rights; upload malicious
          code; attempt to gain unauthorized access to other organizations' data; or interfere with the
          Platform's normal operation.
        </Section>

        <Section title="7. Third-Party Services">
          The Platform uses third-party services, such as a payment processor to collect subscription payments
          and an email provider to send notifications and messages. Use of those services may be subject to their
          own terms, and we share with them only what is needed to provide the service.
        </Section>

        <Section title="8. Availability and Support">
          We aim to keep the Platform available and reliable but do not guarantee uninterrupted access.
          Planned maintenance or unforeseen issues may cause temporary downtime.
        </Section>

        <Section title="9. Termination">
          You may stop using AUREVYN at any time by contacting us, and you can ask for a copy of your business data before your account is closed. We reserve the right to suspend or terminate accounts that
          violate these terms or engage in fraudulent or harmful activity.
        </Section>

        <Section title="10. Limitation of Liability">
          The Platform is provided "as is." To the fullest extent permitted by law, AUREVYN is not liable for
          indirect, incidental, or consequential damages arising from use of the Platform.
        </Section>

        <Section title="11. Changes to These Terms">
          We may update these Terms from time to time. Continued use of the Platform after changes take
          effect constitutes acceptance of the revised Terms.
        </Section>

        <Section title="12. Contact">
          Questions about these Terms can be sent via our <Link href="/contact" style={{ color: "var(--mkt-blueprint)" }}>Contact page</Link>.
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