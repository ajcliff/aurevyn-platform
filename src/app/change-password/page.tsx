"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { isStrongEnoughPassword } from "@/lib/validation";
import AuthShell from "@/components/marketing/AuthShell";

// Where someone lands after signing in with a temporary password from their admin
export default function ChangePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function save() {
    if (!isStrongEnoughPassword(password)) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password, data: { must_change_password: false } });
    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    const { data: membership } = user
      ? await supabase.from("org_users").select("org_id").eq("user_id", user.id).limit(1).maybeSingle()
      : { data: null };
    router.push(membership?.org_id ? `/org/${membership.org_id}` : "/login");
    router.refresh();
  }

  return (
    <AuthShell width={400}>
      <div className="mkt-eyebrow" style={{ marginBottom: 6 }}>First sign-in</div>
      <h1 className="mkt-h3" style={{ fontSize: "1.25rem" }}>Choose your own password</h1>
      <p className="mkt-body" style={{ fontSize: "0.8125rem", marginTop: 6 }}>
        You signed in with a temporary password. Pick one only you know. Write it down somewhere safe, because your admin will need to reset it if you forget.
      </p>

      <label className="mkt-field-label">New password</label>
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="mkt-input" />

      <label className="mkt-field-label">Confirm password</label>
      <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} placeholder="••••••••" className="mkt-input" />

      {error && <div className="mkt-alert-box" style={{ marginTop: 10 }}>{error}</div>}

      <button onClick={save} disabled={loading} className="mkt-btn mkt-btn--primary mkt-btn--full" style={{ marginTop: 16 }}>
        {loading ? "Saving…" : "Save and continue"}
      </button>
    </AuthShell>
  );
}
