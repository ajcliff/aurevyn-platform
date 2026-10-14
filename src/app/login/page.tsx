"use client";

import { useEffect, useState, Suspense } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import AuthShell from "@/components/marketing/AuthShell";

function LoginInner() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [chooseOrgId, setChooseOrgId] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const expired = searchParams.get("reason") === "expired";

  // Already signed in (e.g. reopening the desktop app): go straight to the workspace
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: membership } = await supabase.from("org_users").select("org_id").eq("user_id", user.id).limit(1).maybeSingle();
      if (user.email?.toLowerCase() === process.env.NEXT_PUBLIC_FOUNDER_EMAIL?.toLowerCase()) {
        // Founder who also owns a workspace: let them pick which side to enter
        if (membership?.org_id) setChooseOrgId(membership.org_id);
        else router.replace("/dashboard");
        return;
      }
      if (membership?.org_id) router.replace(`/org/${membership.org_id}`);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    const founderEmail = process.env.NEXT_PUBLIC_FOUNDER_EMAIL?.toLowerCase();

    const { data: membership } = await supabase
      .from("org_users")
      .select("org_id")
      .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
      .limit(1)
      .maybeSingle();

    if (email.trim().toLowerCase() === founderEmail) {
      if (membership?.org_id) {
        setChooseOrgId(membership.org_id);
        setLoading(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
      return;
    }

    if (membership?.org_id) {
      router.push(`/org/${membership.org_id}`);
      router.refresh();
      return;
    }

    setError("No organization found for this account.");
    setLoading(false);
  };

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

      <label className="mkt-field-label">Email</label>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleLogin()}
        placeholder="you@company.com"
        className="mkt-input"
      />

      <label className="mkt-field-label">Password</label>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleLogin()}
        placeholder="••••••••"
        className="mkt-input"
      />

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
