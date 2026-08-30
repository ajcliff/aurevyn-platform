"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { isStrongEnoughPassword } from "@/lib/validation";
import AuthShell from "@/components/marketing/AuthShell";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

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
