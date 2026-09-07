"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { isStrongEnoughPassword } from "@/lib/validation";
import AuthShell from "@/components/marketing/AuthShell";

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [verifying, setVerifying] = useState(true);
  const [verifyError, setVerifyError] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    async function verifyLink() {
      const code = searchParams.get("code");

      if (!code) {
        setVerifyError("This reset link is invalid or missing. Please request a new one.");
        setVerifying(false);
        return;
      }

      const supabase = createClient();
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        setVerifyError(
          "This reset link has expired or already been used. Please request a new one."
        );
        setVerifying(false);
        return;
      }

      setVerifying(false);
    }

    verifyLink();
  }, [searchParams]);

  async function handleReset() {
    if (!isStrongEnoughPassword(password)) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setDone(true);
    setTimeout(() => router.push("/login"), 2000);
  }

  if (verifying) {
    return (
      <AuthShell width={400}>
        <p className="mkt-body" style={{ fontSize: "0.8125rem" }}>
          Verifying your reset link…
        </p>
      </AuthShell>
    );
  }

  if (verifyError) {
    return (
      <AuthShell width={400}>
        <div className="mkt-eyebrow" style={{ marginBottom: 6 }}>Reset password</div>
        <h1 className="mkt-h3" style={{ fontSize: "1.25rem" }}>Link invalid</h1>
        <div className="mkt-alert-box" style={{ marginTop: 10 }}>{verifyError}</div>
        <a
          href="/forgot-password"
          className="mkt-btn mkt-btn--primary mkt-btn--full"
          style={{ marginTop: 16, display: "inline-block", textAlign: "center" }}
        >
          Request a new link
        </a>
      </AuthShell>
    );
  }

  return (
    <AuthShell width={400}>
      {done ? (
        <div style={{ textAlign: "center" }}>
          <div className="mkt-badge-live" style={{ justifyContent: "center", marginBottom: 10 }}>
            Password updated
          </div>
          <p className="mkt-body" style={{ fontSize: "0.8125rem" }}>
            Redirecting you to login…
          </p>
        </div>
      ) : (
        <>
          <div className="mkt-eyebrow" style={{ marginBottom: 6 }}>Reset password</div>
          <h1 className="mkt-h3" style={{ fontSize: "1.25rem" }}>Set a new password</h1>
          <p className="mkt-body" style={{ fontSize: "0.8125rem", marginTop: 6 }}>
            Choose a new password for your account.
          </p>

          <label className="mkt-field-label">New password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="mkt-input"
          />

          <label className="mkt-field-label">Confirm password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleReset()}
            placeholder="••••••••"
            className="mkt-input"
          />

          {error && <div className="mkt-alert-box" style={{ marginTop: 10 }}>{error}</div>}

          <button onClick={handleReset} disabled={loading} className="mkt-btn mkt-btn--primary mkt-btn--full" style={{ marginTop: 16 }}>
            {loading ? "Updating…" : "Update password"}
          </button>
        </>
      )}
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordInner />
    </Suspense>
  );
}
