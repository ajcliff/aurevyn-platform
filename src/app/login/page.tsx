"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/marketing/AuthShell";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

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

    if (email.toLowerCase() === founderEmail) {
      router.push("/dashboard");
      router.refresh();
      return;
    }

    const { data: membership } = await supabase
      .from("org_users")
      .select("org_id")
      .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
      .single();

    if (membership?.org_id) {
      router.push(`/org/${membership.org_id}`);
      router.refresh();
      return;
    }

    setError("No organization found for this account.");
    setLoading(false);
  };

  return (
    <AuthShell>
      <div className="mkt-eyebrow" style={{ marginBottom: 6 }}>Sign in</div>
      <h1 className="mkt-h3" style={{ fontSize: "1.375rem" }}>Welcome back</h1>
      <p className="mkt-body" style={{ fontSize: "0.875rem", marginTop: 6, marginBottom: 4 }}>
        Sign in to continue to your workspace.
      </p>

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
