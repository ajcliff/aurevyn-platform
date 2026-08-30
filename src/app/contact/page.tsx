"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { isValidEmail } from "@/lib/validation";
import MarketingShell from "@/components/marketing/MarketingShell";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!name.trim() || !message.trim()) {
      setError("Please fill in your name and message.");
      return;
    }
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: insertError } = await supabase.from("contact_messages").insert({
      name,
      email,
      subject,
      message,
    });

    setLoading(false);

    if (insertError) {
      setError("Something went wrong. Please try again.");
      return;
    }

    setSent(true);
  }

  return (
    <MarketingShell>
      <MarketingNav />

      <section className="mkt-section" style={{ paddingTop: 72 }}>
        <div className="mkt-container mkt-contact">
          <div className="mkt-contact__intro">
            <div className="mkt-eyebrow">Contact</div>
            <h1 className="mkt-h1" style={{ fontSize: "clamp(2rem, 3.8vw, 2.75rem)", marginTop: 16 }}>
              Get in touch
            </h1>
            <p className="mkt-body-lg" style={{ marginTop: 14, maxWidth: 360 }}>
              Questions about Aurevyn, a specific engine, or which blueprint
              fits your business? Send a message and we'll get back to you.
            </p>
            <div className="mkt-divider" style={{ margin: "28px 0" }} />
            <div className="mkt-tag">Response time</div>
            <p className="mkt-body" style={{ marginTop: 8, fontSize: "0.9375rem" }}>Typically within one business day.</p>
          </div>

          <div className="mkt-card mkt-contact__form">
            {sent ? (
              <div className="mkt-contact__sent">
                <div className="mkt-badge-live" style={{ marginBottom: 14 }}>Message sent</div>
                <h3 className="mkt-h3">Thanks for reaching out</h3>
                <p className="mkt-body" style={{ marginTop: 8, fontSize: "0.9375rem" }}>
                  We'll respond as soon as we can.
                </p>
              </div>
            ) : (
              <>
                <label className="mkt-field-label">Name</label>
                <input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} className="mkt-input" />

                <label className="mkt-field-label">Email</label>
                <input placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} className="mkt-input" />

                <label className="mkt-field-label">Subject (optional)</label>
                <input placeholder="What's this about?" value={subject} onChange={(e) => setSubject(e.target.value)} className="mkt-input" />

                <label className="mkt-field-label">Message</label>
                <textarea
                  placeholder="How can we help?"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="mkt-input"
                  style={{ minHeight: "120px", resize: "vertical" }}
                />

                {error && <div className="mkt-contact__error">{error}</div>}

                <button onClick={handleSubmit} disabled={loading} className="mkt-btn mkt-btn--primary mkt-btn--full" style={{ marginTop: 6 }}>
                  {loading ? "Sending…" : "Send message"}
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      <MarketingFooter />

      <style>{`
        .mkt-contact {
          display: grid;
          grid-template-columns: 1fr 1.1fr;
          gap: 56px;
        }
        .mkt-contact__form {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .mkt-field-label {
          font-family: var(--mkt-font-mono);
          font-size: 0.6875rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--mkt-paper-faint);
          margin-top: 14px;
          margin-bottom: 6px;
        }
        .mkt-input {
          width: 100%;
          padding: 11px 14px;
          background: var(--mkt-ink-2);
          border: 1px solid var(--mkt-line-strong);
          color: var(--mkt-paper);
          font-family: var(--mkt-font-sans);
          font-size: 0.875rem;
          outline: none;
        }
        .mkt-input:focus {
          border-color: var(--mkt-blueprint);
        }
        .mkt-input::placeholder {
          color: var(--mkt-paper-faint);
        }
        .mkt-contact__error {
          color: var(--mkt-alert);
          font-size: 0.8125rem;
          margin-top: 10px;
        }
        .mkt-contact__sent {
          padding: 20px 0;
        }
        @media (max-width: 860px) {
          .mkt-contact { grid-template-columns: 1fr; }
        }
      `}</style>
    </MarketingShell>
  );
}
