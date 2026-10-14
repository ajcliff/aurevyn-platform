"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import AuthShell from "@/components/marketing/AuthShell";

function SecurityInner() {
  const supabase = createClient();
  const router = useRouter();
  const params = useSearchParams();
  const required = params.get("required") === "1";
  const rawNext = params.get("next") ?? "";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "";

  const [loading, setLoading] = useState(true);
  const [isFounder, setIsFounder] = useState(false);
  const [activeFactorId, setActiveFactorId] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/login");
      return;
    }
    setIsFounder(user.email?.toLowerCase() === process.env.NEXT_PUBLIC_FOUNDER_EMAIL?.toLowerCase());
    const { data } = await supabase.auth.mfa.listFactors();
    setActiveFactorId(data?.totp?.[0]?.id ?? null);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function done() {
    router.push(next || (isFounder ? "/dashboard" : "/login"));
    router.refresh();
  }

  async function startSetup() {
    setBusy(true);
    setError("");
    // Clear any half-finished setup first, otherwise enrolling again is refused
    const { data: all } = await supabase.auth.mfa.listFactors();
    for (const f of all?.all ?? []) {
      if (f.factor_type === "totp" && f.status === "unverified") {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
    }
    const { data, error: err } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `AUREVYN ${Date.now()}`, issuer: "AUREVYN" });
    setBusy(false);
    if (err || !data) {
      setError(err?.message ?? "Could not start setup.");
      return;
    }
    setEnrolling({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  }

  async function confirm() {
    if (!enrolling) return;
    setBusy(true);
    setError("");
    const { error: err } = await supabase.auth.mfa.challengeAndVerify({ factorId: enrolling.id, code: code.trim() });
    setBusy(false);
    if (err) {
      setError("That code didn't match. Wait for the next one and try again.");
      setCode("");
      return;
    }
    setEnrolling(null);
    setCode("");
    if (required || next) done();
    else await load();
  }

  async function turnOff() {
    if (!activeFactorId) return;
    if (!confirm_("Turn off two-factor sign-in?")) return;
    setBusy(true);
    setError("");
    const { error: err } = await supabase.auth.mfa.unenroll({ factorId: activeFactorId });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    setActiveFactorId(null);
    await supabase.auth.refreshSession();
  }

  if (loading) return <AuthShell><p className="mkt-body">Loading…</p></AuthShell>;

  return (
    <AuthShell>
      <div className="mkt-eyebrow" style={{ marginBottom: 6 }}>Security</div>
      <h1 className="mkt-h3" style={{ fontSize: "1.375rem" }}>Two-factor sign-in</h1>

      {required && !activeFactorId && !enrolling && (
        <div className="mkt-alert-box" style={{ marginTop: 10 }}>
          Two-factor sign-in is required for the AUREVYN founder account. Set it up to continue.
        </div>
      )}

      {activeFactorId && !enrolling && (
        <>
          <p className="mkt-body" style={{ fontSize: "0.875rem", marginTop: 8 }}>
            Two-factor is <b>on</b>. You&apos;ll be asked for a code from your authenticator app each time you sign in.
          </p>
          {isFounder ? (
            <p className="mkt-body" style={{ fontSize: "0.8125rem", marginTop: 8 }}>It can&apos;t be turned off on the founder account.</p>
          ) : (
            <button onClick={turnOff} disabled={busy} className="mkt-btn mkt-btn--ghost mkt-btn--full" style={{ marginTop: 16 }}>
              Turn off
            </button>
          )}
          <button onClick={done} className="mkt-btn mkt-btn--primary mkt-btn--full" style={{ marginTop: 10 }}>
            Back
          </button>
        </>
      )}

      {!activeFactorId && !enrolling && (
        <>
          <p className="mkt-body" style={{ fontSize: "0.875rem", marginTop: 8 }}>
            Use an authenticator app such as Google Authenticator or Microsoft Authenticator. After your password, you&apos;ll enter the 6-digit code it shows.
          </p>
          <button onClick={startSetup} disabled={busy} className="mkt-btn mkt-btn--primary mkt-btn--full" style={{ marginTop: 16 }}>
            {busy ? "Starting…" : "Set up two-factor"}
          </button>
          {!required && (
            <button onClick={done} className="mkt-btn mkt-btn--ghost mkt-btn--full" style={{ marginTop: 10 }}>
              Not now
            </button>
          )}
        </>
      )}

      {enrolling && (
        <>
          <p className="mkt-body" style={{ fontSize: "0.875rem", marginTop: 8 }}>
            1. Scan this code with your authenticator app.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={enrolling.qr} alt="Two-factor QR code" width={180} height={180} style={{ background: "#fff", padding: 8, borderRadius: 8, margin: "10px auto", display: "block" }} />
          <p className="mkt-body" style={{ fontSize: "0.75rem", textAlign: "center", wordBreak: "break-all" }}>
            Can&apos;t scan? Enter this key: <span className="mkt-mono">{enrolling.secret}</span>
          </p>
          <p className="mkt-body" style={{ fontSize: "0.875rem", marginTop: 12 }}>2. Enter the 6-digit code it shows.</p>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => e.key === "Enter" && code.length === 6 && confirm()}
            placeholder="123456"
            className="mkt-input"
          />
          <button onClick={confirm} disabled={busy || code.length !== 6} className="mkt-btn mkt-btn--primary mkt-btn--full" style={{ marginTop: 14 }}>
            {busy ? "Checking…" : "Turn on"}
          </button>
        </>
      )}

      {error && <div className="mkt-alert-box" style={{ marginTop: 14 }}>{error}</div>}
    </AuthShell>
  );
}

function confirm_(msg: string) {
  return typeof window !== "undefined" ? window.confirm(msg) : false;
}

export default function SecurityPage() {
  return (
    <Suspense fallback={null}>
      <SecurityInner />
    </Suspense>
  );
}
