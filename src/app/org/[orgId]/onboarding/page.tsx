"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { createInvite, type TeamRole } from "@/lib/team";
import MarketingShell from "@/components/marketing/MarketingShell";
import CountUp from "@/components/marketing/CountUp";
import {
  ENGINE_META,
  ENGINE_ORDER,
  type EngineId,
} from "@/components/marketing/engineData";

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const STEP_LABELS = ["Branding", "Team", "Engines", "Launch"] as const;
const LAST_STEP = 4;

const BRAND_SWATCHES = [
  { name: "Brass", value: "#c9a24b" },
  { name: "Blueprint", value: "#4aa8ff" },
  { name: "Violet", value: "#b98af0" },
  { name: "Amber", value: "#f0a860" },
  { name: "Signal", value: "#3ecf8e" },
] as const;

const ROLES: TeamRole[] = ["admin", "manager", "staff"];

const ROLE_HINT: Record<TeamRole, string> = {
  admin: "Full access, including billing and members.",
  manager: "Runs day-to-day work across enabled engines.",
  staff: "Access limited to assigned work.",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const WIZARD_CHIPS = [
  { n: 1, label: "Brand it" },
  { n: 2, label: "Invite the crew" },
  { n: 3, label: "Switch on engines" },
  { n: 4, label: "Watch it run" },
] as const;

const ENGINE_BLURB: Record<EngineId, string> = {
  pos: "Sales, checkout and till reconciliation on autopilot.",
  inventory: "Stock thresholds, reorders and warehouse movement.",
  finance: "Invoices, expenses and the books, kept current.",
  crm: "Leads, deals and follow-ups that don't fall through.",
  hr: "Onboarding, shifts, timesheets and payroll.",
  security: "WAF, bot detection and rate limiting, watching quietly.",
};

const FEED_TEMPLATES: Record<EngineId, string[]> = {
  pos: [
    "Sale rung up — $128.40",
    "Till reconciled for the day",
    "Receipt emailed to customer",
  ],
  inventory: [
    "Reorder triggered — 4 SKUs low",
    "Shipment received — 212 units",
    "Stock count reconciled",
  ],
  finance: [
    "Invoice #1092 marked paid",
    "Quote sent to {org}",
    "Expense auto-categorised",
    "Monthly close 80% done",
  ],
  crm: [
    "New lead assigned to sales",
    "Follow-up reminder sent",
    "Deal moved to negotiation",
  ],
  hr: [
    "Timesheet approved for 6 staff",
    "Shift swap auto-approved",
    "Onboarding checklist sent",
  ],
  security: [
    "Anomaly check clear — 0 flags",
    "Login pattern verified",
    "Rate limit threshold adjusted",
  ],
};

const MARQUEE_ITEMS = ENGINE_ORDER.map((id) => ({
  id,
  color: ENGINE_META[id].color,
  text: `${ENGINE_META[id].label.toUpperCase()} · ${FEED_TEMPLATES[id][0].toUpperCase()}`,
}));

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type OrgEngine = {
  id: string;
  engine_slug: string;
  engine_name: string;
  enabled: boolean;
};

type SentInvite = {
  id: string;
  email: string;
  role: TeamRole;
  link: string;
};

type EngineRow = {
  id: string;
  engine_slug: string;
  enabled: boolean;
  engines: { name: string | null } | { name: string | null }[] | null;
};

type FeedItem = {
  id: number;
  slug: EngineId;
  text: string;
  time: string;
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function matchEngineId(slug: string): EngineId | null {
  const normalized = slug.toLowerCase().replace(/[^a-z]/g, "");
  return (
    (Object.keys(ENGINE_META) as EngineId[]).find(
      (id) => normalized.includes(id) || id.includes(normalized)
    ) ?? null
  );
}

function engineColorFor(slug: string): string {
  const id = matchEngineId(slug);
  return id ? ENGINE_META[id].color : "var(--mkt-brass)";
}

function engineBlurbFor(slug: string): string {
  const id = matchEngineId(slug);
  return id ? ENGINE_BLURB[id] : "Runs quietly in the background once armed.";
}

function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "A"
  );
}

function engineName(row: EngineRow): string {
  const rel = Array.isArray(row.engines) ? row.engines[0] : row.engines;
  return rel?.name ?? row.engine_slug;
}

/** Readable foreground for an arbitrary hex accent. */
function onColor(hex: string): string {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  const lin = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return L > 0.5 ? "#0a0e13" : "#f5f3ee";
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/* ------------------------------------------------------------------ */
/* Small animated building blocks                                      */
/* ------------------------------------------------------------------ */

/** Splits a headline into words that fade/slide in with a stagger. */
function AnimatedHeadline({ text }: { text: string }) {
  const words = text.split(" ");
  return (
    <>
      {words.map((w, i) => (
        <span
          className="mkt-onboard__reveal-word"
          style={{ animationDelay: `${i * 0.06}s` } as CSSProperties}
          key={`${w}-${i}`}
        >
          {w}
          {i < words.length - 1 ? "\u00A0" : ""}
        </span>
      ))}
    </>
  );
}

/** Decorative rotating orbit rings + drifting dust, purely atmospheric. */
function OrbitField() {
  const dots = [
    { top: "12%", left: "8%", size: 3, delay: 0 },
    { top: "70%", left: "14%", size: 2, delay: 0.6 },
    { top: "22%", left: "88%", size: 2, delay: 1.1 },
    { top: "80%", left: "82%", size: 3, delay: 0.3 },
    { top: "48%", left: "4%", size: 2, delay: 1.6 },
    { top: "6%", left: "60%", size: 2, delay: 0.9 },
    { top: "90%", left: "46%", size: 2, delay: 1.3 },
  ] as const;

  return (
    <div className="mkt-onboard__orbitfield" aria-hidden="true">
      <span className="mkt-onboard__orbitfield-ring mkt-onboard__orbitfield-ring--a" />
      <span className="mkt-onboard__orbitfield-ring mkt-onboard__orbitfield-ring--b" />
      <span className="mkt-onboard__orbitfield-ring mkt-onboard__orbitfield-ring--c" />
      {dots.map((d, i) => (
        <span
          key={i}
          className="mkt-onboard__orbitfield-dot"
          style={
            {
              top: d.top,
              left: d.left,
              width: d.size,
              height: d.size,
              animationDelay: `${d.delay}s`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

/** Big orbiting mark used on the welcome + launch screens. */
function HeroMark({ pulse = true }: { pulse?: boolean }) {
  return (
    <svg
      width="240"
      height="240"
      viewBox="0 0 260 260"
      aria-hidden="true"
      className="mkt-onboard__hero-mark"
    >
      {pulse && (
        <circle
          className="mkt-onboard__hero-pulse"
          cx="130"
          cy="130"
          r="118"
          fill="var(--onboard-accent)"
        />
      )}
      <g className="mkt-onboard__hero-orbit mkt-onboard__hero-orbit--a">
        <circle
          cx="130"
          cy="130"
          r="100"
          fill="none"
          stroke="var(--mkt-line-strong)"
          strokeWidth="1"
          strokeDasharray="2 9"
        />
        <circle cx="130" cy="30" r="4" fill="var(--onboard-accent)" />
      </g>
      <g className="mkt-onboard__hero-orbit mkt-onboard__hero-orbit--b">
        <circle
          cx="130"
          cy="130"
          r="76"
          fill="none"
          stroke="var(--mkt-line-strong)"
          strokeWidth="1"
          strokeDasharray="1 7"
        />
        <circle cx="130" cy="54" r="3" fill="var(--mkt-blueprint, #4aa8ff)" />
      </g>
      <g className="mkt-onboard__hero-orbit mkt-onboard__hero-orbit--c">
        <circle
          cx="130"
          cy="130"
          r="52"
          fill="none"
          stroke="var(--mkt-line-strong)"
          strokeWidth="1"
        />
        <circle cx="130" cy="78" r="3" fill="var(--mkt-signal, #3ecf8e)" />
      </g>
      <circle
        cx="130"
        cy="130"
        r="30"
        fill="none"
        stroke="var(--onboard-accent)"
        strokeWidth="1.5"
        opacity="0.6"
      />
      <path
        className="mkt-onboard__check"
        d="M115 132 L126 143 L148 118"
        fill="none"
        stroke="var(--onboard-accent)"
        strokeWidth="3"
        strokeLinecap="square"
      />
    </svg>
  );
}

/**
 * A small, self-cycling "live automations" feed. It's illustrative rather
 * than wired to real events — it exists to make the wizard feel alive while
 * the person is looking at it, not to report real system activity, so it's
 * hidden from assistive tech.
 */
function LiveFeed({
  engineIds,
  orgLabel,
  intervalMs = 1900,
  compact = false,
}: {
  engineIds: EngineId[];
  orgLabel: string;
  intervalMs?: number;
  compact?: boolean;
}) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const counter = useRef(0);
  const poolRef = useRef<EngineId[]>(
    engineIds.length > 0 ? engineIds : [...ENGINE_ORDER]
  );
  const orgLabelRef = useRef(orgLabel);
  const size = compact ? 3 : 4;

  useEffect(() => {
    poolRef.current = engineIds.length > 0 ? engineIds : [...ENGINE_ORDER];
  }, [engineIds]);

  useEffect(() => {
    orgLabelRef.current = orgLabel;
  }, [orgLabel]);

  const makeItem = useCallback((): FeedItem => {
    const pool = poolRef.current;
    const slug = pool[counter.current % pool.length];
    const templates = FEED_TEMPLATES[slug];
    const raw = templates[counter.current % templates.length];
    counter.current += 1;
    return {
      id: counter.current,
      slug,
      text: raw.replace("{org}", orgLabelRef.current),
      time: formatTime(new Date()),
    };
  }, []);

  useEffect(() => {
    setItems(Array.from({ length: size }, () => makeItem()));
    const t = setInterval(() => {
      setItems((prev) => [makeItem(), ...prev].slice(0, size));
    }, intervalMs);
    return () => clearInterval(t);
  }, [intervalMs, size, makeItem]);

  return (
    <div
      className={`mkt-onboard__feed ${compact ? "mkt-onboard__feed--compact" : ""}`}
      aria-hidden="true"
    >
      <div className="mkt-onboard__feed-head">
        <span className="mkt-onboard__feed-live mkt-mono">
          <span className="mkt-onboard__feed-dot" />
          Live automations
        </span>
        <span className="mkt-mono mkt-onboard__feed-count">
          {items.length} streaming
        </span>
      </div>
      <ul className="mkt-onboard__feed-list">
        {items.map((item) => {
          const meta = ENGINE_META[item.slug];
          return (
            <li
              className="mkt-onboard__feed-row"
              key={item.id}
              style={{ "--feed-color": meta.color } as CSSProperties}
            >
              <span className="mkt-onboard__feed-rail" />
              <span
                className="mkt-mono mkt-onboard__feed-tag"
                style={{ color: meta.color }}
              >
                {meta.label}
              </span>
              <span className="mkt-onboard__feed-text">{item.text}</span>
              <span className="mkt-mono mkt-onboard__feed-time">
                {item.time}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Endless horizontal ticker of engine activity, echoes the launch feed. */
function Marquee() {
  const track = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];
  return (
    <div className="mkt-onboard__marquee" aria-hidden="true">
      <div className="mkt-onboard__marquee-track">
        {track.map((item, i) => (
          <span className="mkt-onboard__marquee-item mkt-mono" key={i}>
            <span
              className="mkt-onboard__marquee-dot"
              style={{ background: item.color } as CSSProperties}
            />
            {item.text}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function OnboardingWizard() {
  const { orgId } = useParams<{ orgId: string }>();
  const router = useRouter();
  // createClient() is stable per render only — memoize so effects don't churn.
  const supabase = useMemo(() => createClient(), []);

  const [step, setStep] = useState(0); // 0 = welcome … 4 = done
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Branding
  const [orgName, setOrgName] = useState("");
  const [brandColor, setBrandColor] = useState<string>(BRAND_SWATCHES[0].value);
  const [orgLoaded, setOrgLoaded] = useState(false);

  // Team
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<TeamRole>("staff");
  const [invites, setInvites] = useState<SentInvite[]>([]);
  const [inviting, setInviting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Engines
  const [orgEngines, setOrgEngines] = useState<OrgEngine[]>([]);
  const [enginesLoading, setEnginesLoading] = useState(true);
  const [enginesError, setEnginesError] = useState("");

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const nameError =
    orgName.trim().length === 0
      ? "Give your organization a name."
      : orgName.trim().length < 2
        ? "That name is a little short."
        : "";

  const emailError =
    inviteEmail.length === 0
      ? ""
      : !EMAIL_RE.test(inviteEmail.trim())
        ? "That doesn't look like an email address."
        : invites.some(
              (i) => i.email.toLowerCase() === inviteEmail.trim().toLowerCase()
            )
          ? "You already invited that address."
          : "";

  const enabledCount = orgEngines.filter((e) => e.enabled).length;

  // A deterministic, purely illustrative "automations armed" figure —
  // grows with what the person actually enables/invites, never random.
  const automationsArmed = enabledCount * 37 + invites.length * 4 + (orgLoaded ? 12 : 0);

  // Which engines the live feed should cycle through.
  const activeEngineIds = useMemo(() => {
    const enabled = orgEngines
      .filter((e) => e.enabled)
      .map((e) => matchEngineId(e.engine_slug))
      .filter((id): id is EngineId => !!id);
    if (enabled.length > 0) return enabled;
    const provisioned = orgEngines
      .map((e) => matchEngineId(e.engine_slug))
      .filter((id): id is EngineId => !!id);
    return provisioned;
  }, [orgEngines]);

  /* ---------------- Load organization ---------------- */

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;

    (async () => {
      const { data, error: err } = await supabase
        .from("organizations")
        .select("name, brand_color")
        .eq("id", orgId)
        .single();

      if (cancelled || !mounted.current) return;
      if (err) {
        setError("Couldn't load your organization. Refresh to try again.");
      } else if (data) {
        setOrgName(data.name ?? "");
        if (data.brand_color) setBrandColor(data.brand_color);
      }
      setOrgLoaded(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [orgId, supabase]);

  /* ---------------- Load engines (prefetch at step 2) ---------------- */

  const loadEngines = useCallback(async () => {
    if (!orgId) return;
    setEnginesLoading(true);
    setEnginesError("");

    const { data, error: err } = await supabase
      .from("organization_engines")
      .select("id, engine_slug, enabled, engines(name)")
      .eq("org_id", orgId)
      .order("engine_slug", { ascending: true });

    if (!mounted.current) return;

    if (err) {
      setEnginesError("Couldn't load engines. Retry below.");
      setOrgEngines([]);
    } else {
      setOrgEngines(
        ((data ?? []) as EngineRow[]).map((r) => ({
          id: r.id,
          engine_slug: r.engine_slug,
          engine_name: engineName(r),
          enabled: !!r.enabled,
        }))
      );
    }
    setEnginesLoading(false);
  }, [orgId, supabase]);

  useEffect(() => {
    if (step >= 2) void loadEngines();
    // Prefetch one step early so step 3 renders instantly.
  }, [step >= 2, loadEngines]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------------- Transient toasts ---------------- */

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 2400);
    return () => clearTimeout(t);
  }, [notice]);

  useEffect(() => {
    setError("");
  }, [step]);

  /* ---------------- Step transition direction (for the slide) -------- */

  const prevStepRef = useRef(0);
  const direction = step >= prevStepRef.current ? 1 : -1;
  useEffect(() => {
    prevStepRef.current = step;
  }, [step]);

  /* ---------------- Actions ---------------- */

  const goto = useCallback((next: number) => {
    setStep(Math.max(0, Math.min(LAST_STEP, next)));
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  async function saveBranding() {
    if (nameError) {
      setError(nameError);
      return;
    }
    setLoading(true);
    setError("");
    const { error: err } = await supabase
      .from("organizations")
      .update({ name: orgName.trim(), brand_color: brandColor })
      .eq("id", orgId);
    if (!mounted.current) return;
    setLoading(false);
    if (err) {
      setError("Couldn't save branding — please try again.");
      return;
    }
    goto(2);
  }

  async function sendInvite() {
    const email = inviteEmail.trim();
    if (!email || emailError) {
      setError(emailError || "Enter an email address first.");
      return;
    }
    setInviting(true);
    setError("");
    try {
      const invite = await createInvite(orgId, email, inviteRole, null);
      if (!mounted.current) return;
      setInvites((prev) => [
        ...prev,
        {
          id: invite.token,
          email,
          role: inviteRole,
          link: `${window.location.origin}/join/${invite.token}`,
        },
      ]);
      setInviteEmail("");
      setNotice(`Invite ready for ${email}`);
    } catch {
      if (mounted.current) {
        setError("Couldn't create that invite — check the email and try again.");
      }
    } finally {
      if (mounted.current) setInviting(false);
    }
  }

  async function copyLink(inv: SentInvite) {
    try {
      await navigator.clipboard.writeText(inv.link);
      setCopiedId(inv.id);
      setTimeout(() => {
        if (mounted.current) setCopiedId((c) => (c === inv.id ? null : c));
      }, 1600);
    } catch {
      setError("Clipboard blocked — select and copy the link manually.");
    }
  }

  async function toggleEngine(row: OrgEngine) {
    const next = !row.enabled;
    setOrgEngines((prev) =>
      prev.map((e) => (e.id === row.id ? { ...e, enabled: next } : e))
    );
    const { error: err } = await supabase
      .from("organization_engines")
      .update({ enabled: next })
      .eq("id", row.id);

    if (err && mounted.current) {
      // Roll back the optimistic flip.
      setOrgEngines((prev) =>
        prev.map((e) => (e.id === row.id ? { ...e, enabled: row.enabled } : e))
      );
      setError(`Couldn't update ${row.engine_name}. Try again.`);
    }
  }

  async function finish() {
    setLoading(true);
    setError("");
    const { error: err } = await supabase
      .from("organizations")
      .update({ onboarding_completed: true })
      .eq("id", orgId);
    if (!mounted.current) return;
    setLoading(false);
    if (err) {
      setError("Couldn't finish setup — please try again.");
      return;
    }
    router.push(`/org/${orgId}`);
    router.refresh();
  }

  /* ---------------- Keyboard: Enter advances, Esc clears ---------------- */

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") setError("");
    if (e.key !== "Enter" || e.shiftKey) return;
    const target = e.target as HTMLElement;
    if (target.tagName === "TEXTAREA" || target.tagName === "BUTTON") return;

    if (step === 0) {
      e.preventDefault();
      goto(1);
    } else if (step === 1 && !nameError && !loading) {
      e.preventDefault();
      void saveBranding();
    } else if (step === 2 && inviteEmail.trim() && !emailError && !inviting) {
      e.preventDefault();
      void sendInvite();
    }
  }

  const accentStyle = {
    "--onboard-accent": brandColor,
    "--onboard-on-accent": onColor(brandColor),
  } as CSSProperties;

  const orgLabel = orgName || "your workspace";

  /* ---------------- Render ---------------- */

  return (
    <MarketingShell>
      <div className="mkt-onboard" style={accentStyle} onKeyDown={onKeyDown}>
        <div className="mkt-onboard__frame">
          {step > 0 && (
            <header className="mkt-onboard__header">
              <p className="mkt-mono mkt-onboard__eyebrow">
                <span className="mkt-onboard__eyebrow-dot" />
                First-time setup
              </p>
              <h1 className="mkt-onboard__title">
                Let&apos;s get {orgName || "your organization"} running
              </h1>

              <nav className="mkt-onboard__steps" aria-label="Setup progress">
                {STEP_LABELS.map((label, i) => {
                  const n = i + 1;
                  const done = step > n;
                  const current = step === n;
                  const reachable = n < step;
                  return (
                    <div className="mkt-onboard__step-item" key={label}>
                      <button
                        type="button"
                        disabled={!reachable}
                        onClick={() => reachable && goto(n)}
                        className="mkt-onboard__step-hit"
                        aria-current={current ? "step" : undefined}
                        aria-label={`Step ${n}: ${label}${
                          done ? " (complete)" : ""
                        }`}
                      >
                        <span
                          className={`mkt-onboard__step-bar ${
                            step >= n ? "mkt-onboard__step-bar--active" : ""
                          } ${current ? "mkt-onboard__step-bar--current" : ""}`}
                        />
                        <span
                          className={`mkt-onboard__step-label ${
                            current || done
                              ? "mkt-onboard__step-label--active"
                              : ""
                          }`}
                        >
                          {done ? "✓ " : ""}
                          {label}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </nav>
            </header>
          )}

          <div
            className="mkt-onboard__stage"
            key={step}
            style={{ "--dir": direction } as CSSProperties}
          >
            {/* ---------------- 0 · Welcome ---------------- */}
            {step === 0 && (
              <section className="mkt-onboard__hero">
                <OrbitField />
                <div className="mkt-onboard__hero-grid">
                  <div className="mkt-onboard__hero-copy">
                    <p className="mkt-mono mkt-onboard__pill">
                      <span className="mkt-onboard__pill-dot" />
                      Aurevyn is warming up
                    </p>
                    <h1 className="mkt-onboard__title mkt-onboard__title--hero">
                      <AnimatedHeadline
                        text={`Welcome to Aurevyn${orgName ? `, ${orgName}` : ""}.`}
                      />
                    </h1>
                    <p className="mkt-onboard__lede">
                      Three quick steps — your branding, your team, and which
                      engines to switch on. About two minutes, and
                      you&apos;ll never see this again.
                    </p>

                    <div className="mkt-onboard__chips">
                      {WIZARD_CHIPS.map((c, i) => (
                        <span
                          className="mkt-onboard__chip mkt-mono"
                          key={c.n}
                          style={
                            {
                              animationDelay: `${0.15 + i * 0.08}s`,
                            } as CSSProperties
                          }
                        >
                          <span className="mkt-onboard__chip-num">{c.n}</span>
                          {c.label}
                        </span>
                      ))}
                    </div>

                    <div className="mkt-onboard__welcome-actions">
                      <button
                        type="button"
                        onClick={() => goto(1)}
                        disabled={!orgLoaded}
                        className="mkt-btn mkt-btn--primary"
                      >
                        {orgLoaded ? "Let's go →" : "Loading…"}
                      </button>
                      <button
                        type="button"
                        onClick={() => goto(3)}
                        disabled={!orgLoaded}
                        className="mkt-btn mkt-btn--ghost"
                      >
                        Skip to engines
                      </button>
                    </div>

                    <div className="mkt-onboard__hero-feed">
                      <LiveFeed engineIds={[...ENGINE_ORDER]} orgLabel={orgLabel} />
                    </div>
                  </div>

                  <div className="mkt-onboard__hero-art">
                    <HeroMark />
                  </div>
                </div>

                <Marquee />
              </section>
            )}

            {/* ---------------- 1 · Branding ---------------- */}
            {step === 1 && (
              <section className="mkt-onboard__split">
                <div>
                  <h2 className="mkt-onboard__h2">Branding</h2>
                  <p className="mkt-onboard__sub">
                    How your organization appears across Aurevyn.
                  </p>

                  <label className="mkt-onboard__label" htmlFor="org-name">
                    Organization name
                  </label>
                  <input
                    id="org-name"
                    value={orgName}
                    autoFocus
                    maxLength={60}
                    placeholder="Acme Industries"
                    onChange={(e) => setOrgName(e.target.value)}
                    className="mkt-input"
                    aria-invalid={!!nameError}
                  />

                  <p className="mkt-onboard__label" style={{ marginTop: 20 }}>
                    Accent color
                  </p>
                  <div
                    className="mkt-onboard__swatches"
                    role="radiogroup"
                    aria-label="Accent color"
                  >
                    {BRAND_SWATCHES.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        role="radio"
                        aria-checked={brandColor === s.value}
                        onClick={() => setBrandColor(s.value)}
                        className={`mkt-onboard__swatch ${
                          brandColor === s.value
                            ? "mkt-onboard__swatch--active"
                            : ""
                        }`}
                        style={{ background: s.value }}
                        aria-label={s.name}
                        title={s.name}
                      >
                        {brandColor === s.value && (
                          <span className="mkt-onboard__swatch-check">✓</span>
                        )}
                      </button>
                    ))}
                  </div>

                  {error && (
                    <p className="mkt-onboard__error" role="alert">
                      {error}
                    </p>
                  )}

                  <div className="mkt-onboard__actions">
                    <button
                      type="button"
                      onClick={() => goto(0)}
                      className="mkt-btn mkt-btn--ghost"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={saveBranding}
                      disabled={loading || !!nameError}
                      className="mkt-btn mkt-btn--primary"
                      style={{ flex: 1 }}
                    >
                      {loading ? "Saving…" : "Continue"}
                    </button>
                  </div>
                </div>

                <aside className="mkt-onboard__preview">
                  <p className="mkt-mono mkt-onboard__eyebrow">Live preview</p>
                  <div
                    key={brandColor}
                    className="mkt-onboard__preview-card"
                    style={{ borderTopColor: brandColor }}
                  >
                    <div
                      className="mkt-onboard__preview-avatar"
                      style={{
                        background: brandColor,
                        color: onColor(brandColor),
                      }}
                    >
                      {initials(orgName)}
                    </div>
                    <p className="mkt-onboard__preview-name">
                      {orgName || "Your Organization"}
                    </p>
                    <p className="mkt-mono mkt-onboard__preview-tag">
                      AUREVYN WORKSPACE
                    </p>
                  </div>
                  <p className="mkt-onboard__preview-note">
                    This is how your organization will look in the sidebar and
                    team invites.
                  </p>
                </aside>
              </section>
            )}

            {/* ---------------- 2 · Team ---------------- */}
            {step === 2 && (
              <section>
                <h2 className="mkt-onboard__h2">Invite your team</h2>
                <p className="mkt-onboard__sub">
                  Add as many as you like now, or skip and invite people later
                  from Settings.
                </p>

                <div className="mkt-onboard__invite-form">
                  <input
                    type="email"
                    autoFocus
                    placeholder="name@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="mkt-input"
                    style={{ flex: 1 }}
                    aria-invalid={!!emailError}
                    aria-label="Teammate email"
                  />
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as TeamRole)}
                    className="mkt-input"
                    style={{ width: 140 }}
                    aria-label="Role"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <p className="mkt-onboard__hint">{ROLE_HINT[inviteRole]}</p>

                <button
                  type="button"
                  onClick={sendInvite}
                  disabled={inviting || !inviteEmail.trim() || !!emailError}
                  className="mkt-btn mkt-btn--ghost"
                  style={{ marginTop: 10 }}
                >
                  {inviting ? "Creating invite…" : "+ Add invite"}
                </button>

                {emailError && (
                  <p className="mkt-onboard__error">{emailError}</p>
                )}
                {error && (
                  <p className="mkt-onboard__error" role="alert">
                    {error}
                  </p>
                )}
                {notice && (
                  <p className="mkt-onboard__notice" role="status">
                    ✓ {notice}
                  </p>
                )}

                {invites.length > 0 && (
                  <ul className="mkt-onboard__invites">
                    {invites.map((inv, i) => (
                      <li
                        className="mkt-onboard__invite-row"
                        key={inv.id}
                        style={
                          { animationDelay: `${i * 0.05}s` } as CSSProperties
                        }
                      >
                        <div>
                          <p className="mkt-onboard__invite-email">{inv.email}</p>
                          <p className="mkt-mono mkt-onboard__invite-role">
                            {inv.role}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyLink(inv)}
                          className="mkt-mono mkt-onboard__copy"
                        >
                          {copiedId === inv.id ? "Copied ✓" : "Copy link"}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mkt-onboard__actions">
                  <button
                    type="button"
                    onClick={() => goto(1)}
                    className="mkt-btn mkt-btn--ghost"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => goto(3)}
                    className="mkt-btn mkt-btn--primary"
                    style={{ flex: 1 }}
                  >
                    {invites.length > 0 ? "Continue" : "Skip for now"}
                  </button>
                </div>
              </section>
            )}

            {/* ---------------- 3 · Engines ---------------- */}
            {step === 3 && (
              <section>
                <h2 className="mkt-onboard__h2">Enable engines</h2>
                <p className="mkt-onboard__sub">
                  Tap to arm an engine. It starts working the moment it
                  lights up — you can change this anytime.
                </p>

                <div className="mkt-onboard__engine-grid">
                  {enginesLoading &&
                    Array.from({ length: 4 }).map((_, i) => (
                      <div className="mkt-onboard__engine-skel" key={i} />
                    ))}

                  {!enginesLoading &&
                    orgEngines.map((e, i) => {
                      const color = engineColorFor(e.engine_slug);
                      const blurb = engineBlurbFor(e.engine_slug);
                      return (
                        <button
                          key={e.id}
                          type="button"
                          role="switch"
                          aria-checked={e.enabled}
                          onClick={() => toggleEngine(e)}
                          className={`mkt-onboard__engine-card ${
                            e.enabled ? "mkt-onboard__engine-card--on" : ""
                          }`}
                          style={
                            {
                              "--engine-color": color,
                              animationDelay: `${i * 0.05}s`,
                            } as CSSProperties
                          }
                        >
                          <span className="mkt-onboard__engine-card-top">
                            <span className="mkt-onboard__engine-dot" />
                            <span className="mkt-onboard__engine-name">
                              {e.engine_name}
                            </span>
                            <span
                              className={`mkt-mono mkt-onboard__engine-pill ${
                                e.enabled ? "mkt-onboard__engine-pill--on" : ""
                              }`}
                            >
                              {e.enabled ? "Live" : "Off"}
                            </span>
                          </span>
                          <span className="mkt-onboard__engine-blurb">
                            {blurb}
                          </span>
                        </button>
                      );
                    })}

                  {!enginesLoading && !enginesError && orgEngines.length === 0 && (
                    <p className="mkt-onboard__sub">
                      No engines are provisioned for this organization yet.
                    </p>
                  )}
                </div>

                {enginesError && (
                  <p className="mkt-onboard__error" role="alert">
                    {enginesError}{" "}
                    <button
                      type="button"
                      className="mkt-onboard__copy"
                      onClick={() => void loadEngines()}
                    >
                      Retry
                    </button>
                  </p>
                )}
                {error && (
                  <p className="mkt-onboard__error" role="alert">
                    {error}
                  </p>
                )}

                {!enginesLoading && orgEngines.length > 0 && (
                  <div className="mkt-onboard__stats">
                    <div className="mkt-onboard__stat">
                      <span className="mkt-onboard__stat-num">
                        <CountUp to={enabledCount} />
                      </span>
                      <span className="mkt-mono mkt-onboard__stat-label">
                        Engines live
                      </span>
                    </div>
                    <div className="mkt-onboard__stat">
                      <span className="mkt-onboard__stat-num">
                        <CountUp to={automationsArmed} />
                      </span>
                      <span className="mkt-mono mkt-onboard__stat-label">
                        Automations armed
                      </span>
                    </div>
                    <div className="mkt-onboard__stat">
                      <span className="mkt-onboard__stat-num">
                        <CountUp to={invites.length} />
                      </span>
                      <span className="mkt-mono mkt-onboard__stat-label">
                        Teammates invited
                      </span>
                    </div>
                  </div>
                )}

                {enabledCount > 0 && (
                  <div className="mkt-onboard__engine-feed">
                    <LiveFeed
                      engineIds={activeEngineIds}
                      orgLabel={orgLabel}
                      compact
                    />
                  </div>
                )}

                <div className="mkt-onboard__actions">
                  <button
                    type="button"
                    onClick={() => goto(2)}
                    className="mkt-btn mkt-btn--ghost"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => goto(4)}
                    className="mkt-btn mkt-btn--primary"
                    style={{ flex: 1 }}
                  >
                    Continue
                  </button>
                </div>
              </section>
            )}

            {/* ---------------- 4 · Done ---------------- */}
            {step === 4 && (
              <section className="mkt-onboard__welcome">
                <div className="mkt-onboard__confetti" aria-hidden="true">
                  {Array.from({ length: 18 }).map((_, i) => (
                    <span
                      key={i}
                      className="mkt-onboard__confetti-piece"
                      style={
                        {
                          left: `${4 + i * 5.4}%`,
                          background:
                            BRAND_SWATCHES[i % BRAND_SWATCHES.length].value,
                          animationDelay: `${(i % 9) * 0.09}s`,
                          borderRadius: i % 3 === 0 ? "1px" : "50%",
                        } as CSSProperties
                      }
                    />
                  ))}
                </div>

                <div className="mkt-onboard__hero-art mkt-onboard__hero-art--small">
                  <HeroMark />
                </div>

                <p className="mkt-mono mkt-onboard__eyebrow">
                  <span className="mkt-onboard__eyebrow-dot" />
                  Ignition
                </p>
                <h1 className="mkt-onboard__title">
                  <AnimatedHeadline text="You're live." />
                </h1>
                <p className="mkt-onboard__lede">
                  {orgName || "Your organization"} is running with{" "}
                  {enabledCount} engine{enabledCount === 1 ? "" : "s"} armed.
                  Everything below is already happening.
                </p>

                <div className="mkt-onboard__stats mkt-onboard__stats--center">
                  <div className="mkt-onboard__stat">
                    <span className="mkt-onboard__stat-num">
                      <CountUp to={enabledCount} />
                    </span>
                    <span className="mkt-mono mkt-onboard__stat-label">
                      Engines live
                    </span>
                  </div>
                  <div className="mkt-onboard__stat">
                    <span className="mkt-onboard__stat-num">
                      <CountUp to={automationsArmed} />
                    </span>
                    <span className="mkt-mono mkt-onboard__stat-label">
                      Automations armed
                    </span>
                  </div>
                  <div className="mkt-onboard__stat">
                    <span className="mkt-onboard__stat-num">
                      <CountUp to={invites.length} />
                    </span>
                    <span className="mkt-mono mkt-onboard__stat-label">
                      Invited
                    </span>
                  </div>
                </div>

                <div className="mkt-onboard__hero-feed mkt-onboard__hero-feed--launch">
                  <LiveFeed engineIds={activeEngineIds} orgLabel={orgLabel} />
                </div>

                {error && (
                  <p className="mkt-onboard__error" role="alert">
                    {error}
                  </p>
                )}

                <div className="mkt-onboard__welcome-actions">
                  <button
                    type="button"
                    onClick={finish}
                    disabled={loading}
                    className="mkt-btn mkt-btn--primary"
                  >
                    {loading ? "Finishing…" : "Go to dashboard →"}
                  </button>
                  <button
                    type="button"
                    onClick={() => goto(1)}
                    className="mkt-btn mkt-btn--ghost"
                  >
                    Review setup
                  </button>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        .mkt-onboard {
          display: flex;
          justify-content: center;
          padding: 64px 20px 96px;
        }
        .mkt-onboard__frame {
          width: 100%;
          max-width: 760px;
        }
        .mkt-onboard__eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 0.6875rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--mkt-paper-faint);
          margin: 0;
        }
        .mkt-onboard__eyebrow-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--mkt-signal, #3ecf8e);
          box-shadow: 0 0 0 0 rgba(62, 207, 142, 0.5);
          animation: mkt-onboard-dot-pulse 2s ease-out infinite;
        }
        .mkt-onboard__title {
          font-size: clamp(1.5rem, 3.4vw, 2.1rem);
          line-height: 1.15;
          margin: 10px 0 0;
          color: var(--mkt-paper);
        }
        .mkt-onboard__title--hero {
          font-size: clamp(1.9rem, 5vw, 3rem);
        }
        .mkt-onboard__h2 {
          font-size: 1.25rem;
          margin: 0;
          color: var(--mkt-paper);
        }
        .mkt-onboard__sub,
        .mkt-onboard__lede {
          color: var(--mkt-paper-dim);
          font-size: 0.9rem;
          line-height: 1.6;
          margin: 8px 0 0;
        }
        .mkt-onboard__lede {
          max-width: 50ch;
        }
        .mkt-onboard__welcome .mkt-onboard__lede {
          margin-inline: auto;
        }
        .mkt-onboard__label {
          display: block;
          margin: 20px 0 6px;
          font-size: 0.75rem;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--mkt-paper-faint);
        }
        .mkt-onboard__hint {
          margin-top: 8px;
          font-size: 0.75rem;
          color: var(--mkt-paper-faint);
        }
        .mkt-onboard__error {
          margin-top: 12px;
          font-size: 0.8rem;
          color: #ff8080;
        }
        .mkt-onboard__notice {
          margin-top: 12px;
          font-size: 0.8rem;
          color: var(--mkt-signal, #3ecf8e);
          animation: mkt-onboard-notice-in 0.3s ease both;
        }
        @keyframes mkt-onboard-notice-in {
          from {
            opacity: 0;
            transform: translateY(-6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .mkt-onboard__actions {
          display: flex;
          gap: 10px;
          margin-top: 28px;
        }
        .mkt-onboard__stage {
          animation: mkt-onboard-in 0.45s cubic-bezier(0.2, 0.8, 0.2, 1) both;
        }
        @keyframes mkt-onboard-in {
          from {
            opacity: 0;
            transform: translateX(calc(var(--dir, 1) * 20px));
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .mkt-onboard__steps {
          display: flex;
          gap: 8px;
          margin-top: 20px;
          margin-bottom: 28px;
        }
        .mkt-onboard__step-item {
          flex: 1;
        }
        .mkt-onboard__step-hit {
          display: block;
          width: 100%;
          padding: 0;
          background: none;
          border: none;
          text-align: left;
          cursor: pointer;
        }
        .mkt-onboard__step-hit:disabled {
          cursor: default;
        }
        .mkt-onboard__step-bar {
          display: block;
          position: relative;
          height: 3px;
          background: var(--mkt-line-strong);
          overflow: hidden;
          transition: background 0.3s ease;
        }
        .mkt-onboard__step-bar--active {
          background: var(--onboard-accent, var(--mkt-brass));
        }
        .mkt-onboard__step-bar--current::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.65),
            transparent
          );
          background-size: 60% 100%;
          animation: mkt-onboard-sweep 1.6s ease-in-out infinite;
        }
        @keyframes mkt-onboard-sweep {
          0% {
            background-position: -60% 0;
          }
          100% {
            background-position: 160% 0;
          }
        }
        .mkt-onboard__step-label {
          display: block;
          margin-top: 6px;
          font-size: 0.625rem;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--mkt-paper-faint);
        }
        .mkt-onboard__step-label--active {
          color: var(--mkt-brass-light, var(--mkt-paper));
        }

        /* ---------------- Word reveal ---------------- */
        .mkt-onboard__reveal-word {
          display: inline-block;
          opacity: 0;
          transform: translateY(14px);
          animation: mkt-onboard-word-in 0.55s cubic-bezier(0.2, 0.8, 0.2, 1)
            both;
        }
        @keyframes mkt-onboard-word-in {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* ---------------- Welcome / launch shared ---------------- */
        .mkt-onboard__welcome {
          position: relative;
          text-align: center;
          padding: 20px 0;
        }
        .mkt-onboard__hero-art {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .mkt-onboard__hero-art--small {
          margin: 0 auto 6px;
          transform: scale(0.62);
          transform-origin: top center;
          height: 120px;
        }
        .mkt-onboard__hero-mark {
          filter: drop-shadow(0 0 30px rgba(201, 162, 75, 0.12));
        }
        .mkt-onboard__hero-pulse {
          animation: mkt-onboard-pulse 2.6s ease-in-out infinite;
          transform-origin: 130px 130px;
          opacity: 0.1;
        }
        .mkt-onboard__hero-orbit {
          transform-origin: 130px 130px;
        }
        .mkt-onboard__hero-orbit--a {
          animation: mkt-onboard-spin 22s linear infinite;
        }
        .mkt-onboard__hero-orbit--b {
          animation: mkt-onboard-spin 15s linear infinite reverse;
        }
        .mkt-onboard__hero-orbit--c {
          animation: mkt-onboard-spin 9s linear infinite;
        }
        .mkt-onboard__check {
          stroke-dasharray: 44;
          animation: mkt-onboard-draw 0.7s ease 0.3s both;
        }
        @keyframes mkt-onboard-spin {
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes mkt-onboard-pulse {
          0%,
          100% {
            opacity: 0.07;
            transform: scale(1);
          }
          50% {
            opacity: 0.18;
            transform: scale(1.06);
          }
        }
        @keyframes mkt-onboard-draw {
          from {
            stroke-dashoffset: 44;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
        @keyframes mkt-onboard-dot-pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(62, 207, 142, 0.45);
          }
          70% {
            box-shadow: 0 0 0 6px rgba(62, 207, 142, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(62, 207, 142, 0);
          }
        }

        /* ---------------- Confetti ---------------- */
        .mkt-onboard__confetti {
          position: relative;
          height: 0;
        }
        .mkt-onboard__confetti-piece {
          position: absolute;
          top: -30px;
          width: 6px;
          height: 6px;
          opacity: 0;
          animation: mkt-onboard-fall 1.6s ease-out forwards;
        }
        @keyframes mkt-onboard-fall {
          0% {
            opacity: 1;
            transform: translateY(0) rotate(0deg);
          }
          100% {
            opacity: 0;
            transform: translateY(110px) rotate(220deg);
          }
        }

        /* ---------------- Orbit field (background art) ---------------- */
        .mkt-onboard__orbitfield {
          position: absolute;
          inset: -40px -20px auto -20px;
          height: 420px;
          pointer-events: none;
          z-index: 0;
          overflow: hidden;
        }
        .mkt-onboard__orbitfield-ring {
          position: absolute;
          top: 50%;
          left: 82%;
          border: 1px solid var(--mkt-line);
          border-radius: 50%;
          opacity: 0.5;
        }
        .mkt-onboard__orbitfield-ring--a {
          width: 360px;
          height: 360px;
          margin: -180px 0 0 -180px;
          animation: mkt-onboard-spin 40s linear infinite;
        }
        .mkt-onboard__orbitfield-ring--b {
          width: 260px;
          height: 260px;
          margin: -130px 0 0 -130px;
          animation: mkt-onboard-spin 28s linear infinite reverse;
        }
        .mkt-onboard__orbitfield-ring--c {
          width: 170px;
          height: 170px;
          margin: -85px 0 0 -85px;
          animation: mkt-onboard-spin 18s linear infinite;
        }
        .mkt-onboard__orbitfield-dot {
          position: absolute;
          border-radius: 50%;
          background: var(--onboard-accent, var(--mkt-brass));
          opacity: 0;
          animation: mkt-onboard-drift 4.5s ease-in-out infinite;
        }
        @keyframes mkt-onboard-drift {
          0% {
            opacity: 0;
            transform: translateY(6px);
          }
          30% {
            opacity: 0.6;
          }
          70% {
            opacity: 0.6;
          }
          100% {
            opacity: 0;
            transform: translateY(-6px);
          }
        }

        /* ---------------- Hero grid ---------------- */
        .mkt-onboard__hero {
          position: relative;
        }
        .mkt-onboard__hero-grid {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: 1.25fr 1fr;
          gap: 32px;
          align-items: center;
        }
        .mkt-onboard__pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 0.6875rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--mkt-signal, #3ecf8e);
          margin: 0 0 14px;
        }
        .mkt-onboard__pill-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--mkt-signal, #3ecf8e);
          animation: mkt-onboard-dot-pulse 2s ease-out infinite;
        }

        .mkt-onboard__chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 22px;
        }
        .mkt-onboard__chip {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 7px 12px;
          font-size: 0.6875rem;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: var(--mkt-paper-dim);
          border: 1px solid var(--mkt-line-strong);
          background: var(--mkt-ink-2);
          opacity: 0;
          transform: translateY(8px);
          animation: mkt-onboard-chip-in 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)
            both;
        }
        @keyframes mkt-onboard-chip-in {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .mkt-onboard__chip-num {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 15px;
          height: 15px;
          border-radius: 50%;
          background: var(--onboard-accent, var(--mkt-brass));
          color: var(--onboard-on-accent, #0a0e13);
          font-size: 0.625rem;
          font-weight: 700;
        }

        .mkt-onboard__welcome-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 26px;
        }

        .mkt-onboard__hero-feed {
          margin-top: 30px;
        }
        .mkt-onboard__hero-feed--launch {
          max-width: 460px;
          margin-inline: auto;
          text-align: left;
        }

        /* ---------------- Live feed ---------------- */
        .mkt-onboard__feed {
          border: 1px solid var(--mkt-line-strong);
          background: var(--mkt-ink-2);
          padding: 14px 16px;
        }
        .mkt-onboard__feed-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
        }
        .mkt-onboard__feed-live {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 0.6875rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--mkt-paper-dim);
        }
        .mkt-onboard__feed-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--mkt-signal, #3ecf8e);
          animation: mkt-onboard-dot-pulse 1.8s ease-out infinite;
        }
        .mkt-onboard__feed-count {
          font-size: 0.6875rem;
          color: var(--mkt-paper-faint);
        }
        .mkt-onboard__feed-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
        }
        .mkt-onboard__feed-row {
          position: relative;
          display: flex;
          align-items: baseline;
          gap: 10px;
          padding: 7px 0;
          border-top: 1px solid var(--mkt-line);
          animation: mkt-onboard-feed-in 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)
            both;
        }
        .mkt-onboard__feed-row:first-child {
          border-top: none;
        }
        .mkt-onboard__feed-rail {
          position: absolute;
          left: -16px;
          top: 0;
          bottom: 0;
          width: 2px;
          background: var(--feed-color, var(--mkt-brass));
          opacity: 0.7;
        }
        @keyframes mkt-onboard-feed-in {
          from {
            opacity: 0;
            transform: translateY(-6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .mkt-onboard__feed-tag {
          flex-shrink: 0;
          font-size: 0.625rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .mkt-onboard__feed-text {
          flex: 1;
          font-size: 0.8125rem;
          color: var(--mkt-paper-dim);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .mkt-onboard__feed-time {
          flex-shrink: 0;
          font-size: 0.625rem;
          color: var(--mkt-paper-faint);
        }
        .mkt-onboard__feed--compact {
          padding: 10px 14px;
        }

        /* ---------------- Marquee ---------------- */
        .mkt-onboard__marquee {
          position: relative;
          z-index: 1;
          overflow: hidden;
          border-top: 1px solid var(--mkt-line);
          margin-top: 40px;
          padding-top: 14px;
        }
        .mkt-onboard__marquee-track {
          display: flex;
          gap: 36px;
          width: max-content;
          animation: mkt-onboard-marquee 26s linear infinite;
        }
        .mkt-onboard__marquee-item {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 0.6875rem;
          letter-spacing: 0.08em;
          color: var(--mkt-paper-faint);
          white-space: nowrap;
        }
        .mkt-onboard__marquee-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
        }
        @keyframes mkt-onboard-marquee {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }

        /* ---------------- Branding step ---------------- */
        .mkt-onboard__split {
          display: grid;
          grid-template-columns: 1.3fr 1fr;
          gap: 24px;
          align-items: start;
        }
        .mkt-onboard__preview {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding-top: 8px;
        }
        .mkt-onboard__preview-card {
          width: 100%;
          margin-top: 10px;
          text-align: center;
          padding: 24px 20px;
          background: var(--mkt-ink-2);
          border: 1px solid var(--mkt-line);
          border-top: 3px solid var(--onboard-accent, var(--mkt-brass));
          animation: mkt-onboard-card-glow 0.6s ease both;
        }
        @keyframes mkt-onboard-card-glow {
          from {
            box-shadow: 0 0 0 0 color-mix(in srgb, var(--onboard-accent) 45%, transparent);
          }
          to {
            box-shadow: 0 0 0 10px color-mix(in srgb, var(--onboard-accent) 0%, transparent);
          }
        }
        .mkt-onboard__preview-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          margin-inline: auto;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--mkt-font-mono);
          font-weight: 600;
          transition:
            background 0.2s ease,
            color 0.2s ease;
        }
        .mkt-onboard__preview-name {
          margin: 12px 0 2px;
          color: var(--mkt-paper);
          font-weight: 600;
        }
        .mkt-onboard__preview-tag {
          margin: 0;
          font-size: 0.625rem;
          letter-spacing: 0.14em;
          color: var(--mkt-paper-faint);
        }
        .mkt-onboard__preview-note {
          margin-top: 12px;
          font-size: 0.75rem;
          line-height: 1.5;
          color: var(--mkt-paper-faint);
        }

        .mkt-onboard__swatches {
          display: flex;
          gap: 10px;
        }
        .mkt-onboard__swatch {
          position: relative;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 2px solid transparent;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition:
            transform 0.15s ease,
            border-color 0.15s ease;
        }
        .mkt-onboard__swatch:hover {
          transform: scale(1.1);
        }
        .mkt-onboard__swatch--active {
          border-color: var(--mkt-paper);
        }
        .mkt-onboard__swatch-check {
          color: #0a0e13;
          font-size: 0.75rem;
          font-weight: 700;
          animation: mkt-onboard-word-in 0.25s ease both;
        }

        /* ---------------- Team step ---------------- */
        .mkt-onboard__invite-form {
          display: flex;
          gap: 10px;
          margin-top: 20px;
        }
        .mkt-onboard__invites {
          list-style: none;
          padding: 0;
          margin-top: 16px;
          border-top: 1px solid var(--mkt-line);
        }
        .mkt-onboard__invite-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 0;
          border-bottom: 1px solid var(--mkt-line);
          animation: mkt-onboard-feed-in 0.35s ease both;
        }
        .mkt-onboard__invite-email {
          margin: 0;
          font-size: 0.85rem;
          color: var(--mkt-paper);
        }
        .mkt-onboard__invite-role {
          margin: 2px 0 0;
          font-size: 0.6875rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--mkt-paper-faint);
        }
        .mkt-onboard__copy {
          background: none;
          border: none;
          color: var(--mkt-blueprint, #4aa8ff);
          font-size: 0.75rem;
          cursor: pointer;
        }

        /* ---------------- Engines step ---------------- */
        .mkt-onboard__engine-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 20px;
        }
        .mkt-onboard__engine-skel {
          height: 92px;
          background: linear-gradient(
            90deg,
            var(--mkt-ink-2) 0%,
            var(--mkt-line) 50%,
            var(--mkt-ink-2) 100%
          );
          background-size: 200% 100%;
          animation: mkt-onboard-shimmer 1.2s linear infinite;
        }
        @keyframes mkt-onboard-shimmer {
          to {
            background-position: -200% 0;
          }
        }
        .mkt-onboard__engine-card {
          text-align: left;
          background: var(--mkt-ink-2);
          border: 1px solid var(--mkt-line-strong);
          padding: 14px 16px;
          cursor: pointer;
          color: var(--mkt-paper-dim);
          opacity: 0;
          transform: translateY(6px);
          animation: mkt-onboard-chip-in 0.4s ease both;
          transition:
            border-color 0.15s ease,
            box-shadow 0.2s ease,
            transform 0.15s ease;
        }
        .mkt-onboard__engine-card:hover {
          transform: translateY(-2px);
        }
        .mkt-onboard__engine-card-top {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .mkt-onboard__engine-name {
          flex: 1;
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--mkt-paper);
        }
        .mkt-onboard__engine-blurb {
          display: block;
          margin-top: 8px;
          font-size: 0.75rem;
          line-height: 1.5;
          color: var(--mkt-paper-faint);
        }
        .mkt-onboard__engine-pill {
          font-size: 0.6rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--mkt-paper-faint);
          border: 1px solid var(--mkt-line-strong);
          padding: 2px 7px;
        }
        .mkt-onboard__engine-pill--on {
          color: var(--engine-color, var(--mkt-signal));
          border-color: var(--engine-color, var(--mkt-signal));
          animation: mkt-onboard-dot-pulse 2.2s ease-out infinite;
        }
        .mkt-onboard__engine-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--engine-color, var(--mkt-line-strong));
          flex-shrink: 0;
          transition: box-shadow 0.15s ease;
        }
        .mkt-onboard__engine-card--on {
          border-color: var(--engine-color, var(--mkt-signal));
          color: var(--mkt-paper);
          box-shadow: 0 0 0 1px var(--engine-color, var(--mkt-signal)) inset;
        }
        .mkt-onboard__engine-card--on .mkt-onboard__engine-dot {
          box-shadow: 0 0 0 4px
            color-mix(
              in srgb,
              var(--engine-color, var(--mkt-signal)) 20%,
              transparent
            );
        }
        .mkt-onboard__engine-feed {
          margin-top: 18px;
        }

        /* ---------------- Stats ---------------- */
        .mkt-onboard__stats {
          display: flex;
          gap: 10px;
          margin-top: 22px;
        }
        .mkt-onboard__stats--center {
          justify-content: center;
          max-width: 460px;
          margin-inline: auto;
          margin-top: 26px;
        }
        .mkt-onboard__stat {
          flex: 1;
          text-align: center;
          padding: 16px 10px;
          background: var(--mkt-ink-2);
          border: 1px solid var(--mkt-line);
        }
        .mkt-onboard__stat-num {
          display: block;
          font-size: 1.6rem;
          font-weight: 700;
          color: var(--onboard-accent, var(--mkt-brass));
          font-family: var(--mkt-font-mono);
        }
        .mkt-onboard__stat-label {
          display: block;
          margin-top: 4px;
          font-size: 0.625rem;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--mkt-paper-faint);
        }

        @media (max-width: 700px) {
          .mkt-onboard__split,
          .mkt-onboard__hero-grid {
            grid-template-columns: 1fr;
          }
          .mkt-onboard__hero-art {
            order: -1;
          }
          .mkt-onboard__invite-form {
            flex-direction: column;
          }
          .mkt-onboard__invite-form .mkt-input {
            width: 100% !important;
          }
          .mkt-onboard__engine-grid {
            grid-template-columns: 1fr;
          }
          .mkt-onboard__stats {
            flex-wrap: wrap;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .mkt-onboard__hero-orbit,
          .mkt-onboard__hero-pulse,
          .mkt-onboard__check,
          .mkt-onboard__confetti-piece,
          .mkt-onboard__engine-skel,
          .mkt-onboard__stage,
          .mkt-onboard__reveal-word,
          .mkt-onboard__chip,
          .mkt-onboard__engine-card,
          .mkt-onboard__feed-row,
          .mkt-onboard__invite-row,
          .mkt-onboard__orbitfield-ring,
          .mkt-onboard__orbitfield-dot,
          .mkt-onboard__marquee-track,
          .mkt-onboard__step-bar--current::after,
          .mkt-onboard__eyebrow-dot,
          .mkt-onboard__pill-dot,
          .mkt-onboard__feed-dot,
          .mkt-onboard__engine-pill--on,
          .mkt-onboard__preview-card {
            animation: none !important;
          }
        }
      `}</style>
    </MarketingShell>
  );
}