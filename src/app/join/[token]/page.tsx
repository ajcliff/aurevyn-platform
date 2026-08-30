"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { acceptInvite } from "@/lib/team";
import AuthShell from "@/components/marketing/AuthShell";

export default function JoinPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleJoin() {
    if (!fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const { orgId } = await acceptInvite(token, fullName, password);
      router.push(`/org/${orgId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to join";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell width={400}>
      <div className="mkt-eyebrow" style={{ marginBottom: 6 }}>Team invite</div>
      <h1 className="mkt-h3" style={{ fontSize: "1.25rem" }}>Join your team on Aurevyn</h1>
      <p className="mkt-body" style={{ fontSize: "0.8125rem", marginTop: 6 }}>
        Set your name and a password to get started.
      </p>

      <label className="mkt-field-label">Full name</label>
      <input
        placeholder="Full name"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        className="mkt-input"
      />

      <label className="mkt-field-label">Password</label>
      <input
        type="password"
        placeholder="Create a password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleJoin()}
        className="mkt-input"
      />

      {error && <div className="mkt-alert-box" style={{ marginTop: 10 }}>{error}</div>}

      <button onClick={handleJoin} disabled={loading} className="mkt-btn mkt-btn--primary mkt-btn--full" style={{ marginTop: 16 }}>
        {loading ? "Joining…" : "Join organization"}
      </button>
    </AuthShell>
  );
}
