"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { isValidEmail } from "@/lib/validation";
import AuthShell from "@/components/marketing/AuthShell";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);

    // Always show success, even if the email doesn't exist — don't reveal which
    // emails are registered (standard practice to prevent account enumeration)
    if (resetError) {
      console.error(resetError);
    }
    setSent(true);
  }

  return (
    <AuthShell width={400}>
      {sent ? (
        <>
          <div className="mkt-h3" style={{ fontSize: "1.25rem" }}>Check your email</div>
          <p className="mkt-body" style={{ fontSize: "0.8125rem", marginTop: 10 }}>
            If an account exists for <strong style={{ color: "var(--mkt-paper)" }}>{email}</strong>, we've sent a
            link to reset your password.
          </p>
          <Link href="/login" className="mkt-mono" style={{ color: "var(--mkt-blueprint)", fontSize: "0.8125rem", marginTop: 18, display: "inline-block" }}>
            ← Back to login
          </Link>
        </>
      ) : (
        <>
          <div className="mkt-eyebrow" style={{ marginBottom: 6 }}>Reset password</div>
          <h1 className="mkt-h3" style={{ fontSize: "1.25rem" }}>Reset your password</h1>
          <p className="mkt-body" style={{ fontSize: "0.8125rem", marginTop: 6 }}>
            Enter your email and we'll send you a reset link.
          </p>

          <label className="mkt-field-label">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="you@company.com"
            className="mkt-input"
          />

          {error && <div className="mkt-alert-box" style={{ marginTop: 10 }}>{error}</div>}

          <button onClick={handleSubmit} disabled={loading} className="mkt-btn mkt-btn--primary mkt-btn--full" style={{ marginTop: 16 }}>
            {loading ? "Sending…" : "Send reset link"}
          </button>

          <div style={{ textAlign: "center", marginTop: 16 }}>
            <Link href="/login" className="mkt-mono" style={{ color: "var(--mkt-blueprint)", fontSize: "0.75rem" }}>
              ← Back to login
            </Link>
          </div>
        </>
      )}
    </AuthShell>
  );
}
