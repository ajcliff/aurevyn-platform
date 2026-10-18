"use client";

import { useEffect, useState, Suspense } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import AuthShell from "@/components/marketing/AuthShell";
import { loginIdentifierToEmail } from "@/lib/staffLogin";

function LoginInner() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [chooseOrgId, setChooseOrgId] = useState<string | null>(null);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const expired = searchParams.get("reason") === "expired";

  // Sends a signed-in user to the right place; asks for the 2FA code first when they have it on
  async function routeSignedIn(userId: string, userEmail: string | undefined, fresh: boolean) {
    // Temporary password from an admin: choose a real one first
    const { data: { user: current } } = await supabase.auth.getUser();
    if (current?.user_metadata?.must_change_password) {
      router.push("/change-password");
      router.refresh();
      return;
    }

    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
      const { data: f } = await supabase.auth.mfa.listFactors();
      const totp = f?.totp?.[0];
      if (totp) {
        setMfaFactorId(totp.id);
        setLoading(false);
        return;
      }
    }

    const { data: membership } = await supabase.from("org_users").select("org_id").eq("user_id", userId).limit(1).maybeSingle();

    if (userEmail?.trim().toLowerCase() === process.env.NEXT_PUBLIC_FOUNDER_EMAIL?.toLowerCase()) {
      // Founder who also owns a workspace: let them pick which side to enter
      if (membership?.org_id) {
        setChooseOrgId(membership.org_id);
        setLoading(false);
      } else {
        router.push("/dashboard");
        router.refresh();
      }
      return;
    }

    if (membership?.org_id) {
      router.push(`/org/${membership.org_id}`);
      router.refresh();
      return;
    }

    if (fresh) {
      setError("No organization found for this account.");
      setLoading(false);
    }
  }

  // Already signed in (e.g. reopening the desktop app): go straight to the workspace
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await routeSignedIn(user.id, user.email, false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email or username and your password.");
      return;
    }
    setLoading(true);
    setError("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginIdentifierToEmail(email),
      password,
    });

    if (error || !data.user) {
      setError(error?.message === "Invalid login credentials" ? "Wrong email, username or password." : (error?.message ?? "Sign in failed."));
      setLoading(false);
      return;
    }

    await routeSignedIn(data.user.id, data.user.email, true);
  };

  const handleMfa = async () => {
    if (!mfaFactorId || mfaCode.length !== 6) return;
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: mfaFactorId, code: mfaCode });
    if (error) {
      setError("That code didn't match. Wait for the next one and try again.");
      setMfaCode("");
      setLoading(false);
      return;
    }
    setMfaFactorId(null);
    setMfaCode("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    await routeSignedIn(user.id, user.email, true);
  };

  if (mfaFactorId) {
    return (
      <AuthShell>
        <div className="mkt-eyebrow" style={{ marginBottom: 6 }}>Two-factor</div>
        <h1 className="mkt-h3" style={{ fontSize: "1.375rem" }}>Enter your code</h1>
        <p className="mkt-body" style={{ fontSize: "0.875rem", marginTop: 6, marginBottom: 4 }}>
          Open your authenticator app and enter the 6-digit code for AUREVYN.
        </p>
        <input
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          maxLength={6}
          value={mfaCode}
          onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
          onKeyDown={(e) => e.key === "Enter" && handleMfa()}
          placeholder="123456"
          className="mkt-input"
          style={{ marginTop: 12 }}
        />
        {error && <div className="mkt-alert-box" style={{ marginTop: 14 }}>{error}</div>}
        <button onClick={handleMfa} disabled={loading || mfaCode.length !== 6} className="mkt-btn mkt-btn--primary mkt-btn--full" style={{ marginTop: 18 }}>
          {loading ? "Checking…" : "Verify"}
        </button>
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              setMfaFactorId(null);
              setError("");
            }}
            className="mkt-mono"
            style={{ background: "none", border: "none", color: "var(--mkt-paper-faint)", fontSize: "0.75rem", cursor: "pointer" }}
          >
            Use a different account
          </button>
        </div>
      </AuthShell>
    );
  }

  if (chooseOrgId) {
    const go = (path: string) => {
      router.push(path);
      router.refresh();
    };
    return (
      <AuthShell>
        <div className="mkt-eyebrow" style={{ marginBottom: 6 }}>Signed in</div>
        <h1 className="mkt-h3" style={{ fontSize: "1.375rem" }}>Where to?</h1>
        <p className="mkt-body" style={{ fontSize: "0.875rem", marginTop: 6, marginBottom: 16 }}>
          This account runs AUREVYN and also owns a business workspace.
        </p>
        <button onClick={() => go("/dashboard")} className="mkt-btn mkt-btn--primary mkt-btn--full">
          AUREVYN Founder console
        </button>
        <button onClick={() => go(`/org/${chooseOrgId}`)} className="mkt-btn mkt-btn--ghost mkt-btn--full" style={{ marginTop: 10 }}>
          My business workspace
        </button>
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              setChooseOrgId(null);
            }}
            className="mkt-mono"
            style={{ background: "none", border: "none", color: "var(--mkt-paper-faint)", fontSize: "0.75rem", cursor: "pointer" }}
          >
            Sign out
          </button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="mkt-eyebrow" style={{ marginBottom: 6 }}>Sign in</div>
      <h1 className="mkt-h3" style={{ fontSize: "1.375rem" }}>Welcome back</h1>
      <p className="mkt-body" style={{ fontSize: "0.875rem", marginTop: 6, marginBottom: 4 }}>
        Sign in to continue to your workspace.
      </p>

      {expired && (
        <div className="mkt-alert-box" style={{ marginTop: 10, marginBottom: 4 }}>
          Your session expired. Please sign in again.
        </div>
      )}

      <label className="mkt-field-label">Email or username</label>
      <input
        type="text"
        autoCapitalize="none"
        autoCorrect="off"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleLogin()}
        placeholder="you@company.com or your username"
        className="mkt-input"
      />

      <label className="mkt-field-label">Password</label>
      <div style={{ position: "relative" }}>
        <input
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          placeholder="••••••••"
          className="mkt-input"
          style={{ paddingRight: 44 }}
        />
        <button
          type="button"
          onClick={() => setShowPassword((v) => !v)}
          aria-label={showPassword ? "Hide password" : "Show password"}
          title={showPassword ? "Hide password" : "Show password"}
          style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--mkt-paper-faint)", display: "flex" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
            <circle cx="12" cy="12" r="3" />
            {showPassword && <line x1="3" y1="3" x2="21" y2="21" />}
          </svg>
        </button>
      </div>

      {error && <div className="mkt-alert-box" style={{ marginTop: 14 }}>{error}</div>}

      <button
        onClick={handleLogin}
        disabled={loading}
        className="mkt-btn mkt-btn--primary mkt-btn--full"
        style={{ marginTop: 18 }}
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>

      <div style={{ textAlign: "center", marginTop: 16 }}>
        <a href="/forgot-password" className="mkt-mono" style={{ color: "var(--mkt-paper-faint)", fontSize: "0.75rem" }}>
          Forgot your password?
        </a>
        <div style={{ marginTop: 6, fontSize: "0.6875rem", color: "var(--mkt-paper-faint)" }}>
          Signing in with a username? Ask your admin to reset it.
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: 10, fontSize: "0.8125rem", color: "var(--mkt-paper-faint)" }}>
        New organization?{" "}
        <a href="/register" style={{ color: "var(--mkt-blueprint)" }}>
          Create an account
        </a>
      </div>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
