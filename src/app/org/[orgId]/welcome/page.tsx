'use client';

import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, useMotionValue, useSpring, useTransform, animate } from 'framer-motion';
import { createClient } from '@/lib/supabase';
import styles from './welcome.module.css';

// ASSUMPTIONS (see chat for the full list):
// - `organizations` has a `name` column
// - dashboard root is `/org/${orgId}`
// - engine roster is a static showcase (all engines, not just installed —
//   the 30-day trial unlocks everything)
// - renders as a fixed full-viewport overlay on top of OrgShell rather than
//   a true layout/route bypass

interface OrgRow {
  id: string;
  name: string;
}

interface EngineMeta {
  slug: string;
  name: string;
  icon: string;
  color: string;
  blurb: string;
}

const ENGINES: EngineMeta[] = [
  { slug: 'business-ops', name: 'Business Ops', icon: '🧭', color: '#14b8a6', blurb: 'Run the whole org from one place' },
  { slug: 'pos', name: 'Point of Sale', icon: '🛒', color: '#f97316', blurb: 'Sell in-store and online' },
  { slug: 'inventory', name: 'Inventory', icon: '📦', color: '#22d3ee', blurb: 'Track stock across warehouses' },
  { slug: 'finance', name: 'Finance', icon: '💰', color: '#10b981', blurb: 'Books, invoices, cash flow' },
  { slug: 'hr-payroll', name: 'HR & Payroll', icon: '🧑‍💼', color: '#ec4899', blurb: 'Pay people, manage leave' },
  { slug: 'crm', name: 'CRM', icon: '👥', color: '#8b5cf6', blurb: 'Never lose a customer thread' },
  { slug: 'procurement', name: 'Procurement', icon: '📋', color: '#eab308', blurb: 'Purchase orders, suppliers' },
  { slug: 'analytics', name: 'Analytics', icon: '📊', color: '#3b82f6', blurb: 'See what is actually happening' },
  { slug: 'documents', name: 'Documents', icon: '📄', color: '#64748b', blurb: 'Everything filed, everything findable' },
  { slug: 'ai-insights', name: 'AI Insights', icon: '✨', color: '#a855f7', blurb: 'Automations that watch your back' },
];

const HEADLINE_LINES = [
  { words: ['Every', 'engine.'], accent: false },
  { words: ['Unlocked', 'today.'], accent: false },
  { words: ['Free', 'for', '30', 'days.'], accent: true },
];

const CONFETTI_COLORS = ['#f97316', '#a855f7', '#22d3ee', '#eab308', '#10b981', '#ec4899'];

function CountUp({ target, suffix = '' }: { target: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const controls = animate(0, target, {
      duration: 1.1,
      ease: 'easeOut',
      delay: 0.9,
      onUpdate(value) {
        if (ref.current) ref.current.textContent = Math.round(value) + suffix;
      },
    });
    return () => controls.stop();
  }, [target, suffix]);
  return <span ref={ref}>0{suffix}</span>;
}

function EngineCard({ engine, index }: { engine: EngineMeta; index: number }) {
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(my, [0, 1], [10, -10]), { stiffness: 220, damping: 22 });
  const rotateY = useSpring(useTransform(mx, [0, 1], [-10, 10]), { stiffness: 220, damping: 22 });

  function handleMove(e: MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - rect.left) / rect.width);
    my.set((e.clientY - rect.top) / rect.height);
  }
  function handleLeave() {
    mx.set(0.5);
    my.set(0.5);
  }

  return (
    <motion.div
      className={styles.engineCard}
      style={{ ['--engine-color' as string]: engine.color, rotateX, rotateY, transformPerspective: 800 }}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      initial={{ opacity: 0, y: 34, scale: 0.85 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 1.0 + index * 0.06 }}
      whileHover={{ scale: 1.06 }}
    >
      <span className={styles.engineShine} style={{ animationDelay: `${index * 0.4}s` }} />
      <motion.div
        className={styles.engineIcon}
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut', delay: index * 0.15 }}
      >
        {engine.icon}
      </motion.div>
      <div className={styles.engineName}>{engine.name}</div>
      <div className={styles.engineBlurb}>{engine.blurb}</div>
    </motion.div>
  );
}

const PARTICLES = Array.from({ length: 26 }, (_, i) => ({
  id: i,
  left: (i * 37) % 100,
  top: (i * 53) % 100,
  delay: (i % 7) * 0.35,
  duration: 3 + (i % 5),
}));

export default function WelcomePage() {
  const router = useRouter();
  const params = useParams<{ orgId: string }>();
  const orgId = params.orgId;

  const [org, setOrg] = useState<OrgRow | null>(null);
  const [firstName, setFirstName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [dismissing, setDismissing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confetti, setConfetti] = useState<
    { id: number; x: number; y: number; rotate: number; color: string }[]
  >([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = createClient();

      const [{ data: orgRow, error: orgError }, { data: userData }] = await Promise.all([
        supabase.from('organizations').select('id, name').eq('id', orgId).single(),
        supabase.auth.getUser(),
      ]);

      if (cancelled) return;

      if (orgError || !orgRow) {
        console.error('Welcome page: failed to load organization', orgError);
        setLoadError(orgError?.message ?? 'Organization not found.');
        setLoading(false);
        return;
      }

      const email = userData?.user?.email ?? '';
      const metaName = userData?.user?.user_metadata?.full_name as string | undefined;
      setFirstName(metaName?.split(' ')[0] || email.split('@')[0] || 'there');
      setOrg(orgRow as OrgRow);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  function burstConfetti() {
    const pieces = Array.from({ length: 22 }).map((_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 340,
      y: (Math.random() - 0.5) * 260 - 60,
      rotate: Math.random() * 360,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    }));
    setConfetti(pieces);
  }

  async function handleDismiss() {
    burstConfetti();
    setDismissing(true);

    const supabase = createClient();
    const updatePromise = supabase.from('organizations').update({ onboarding_completed: true }).eq('id', orgId);
    const [{ error }] = await Promise.all([updatePromise, new Promise((r) => setTimeout(r, 600))]);

    if (error) {
      console.error('Failed to mark onboarding_completed:', error);
    }
    router.push(`/org/${orgId}`);
  }

  if (loading) {
    return (
      <div className={styles.overlay}>
        <div className={styles.loadingPulse}>Loading AUREVYN…</div>
      </div>
    );
  }

  if (loadError || !org) {
    return (
      <div className={styles.overlay}>
        <div className={styles.errorBox}>
          <p>{loadError ?? 'Something went wrong loading this page.'}</p>
          <button className={styles.ctaSmall} onClick={() => router.push(`/org/${orgId}`)}>
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.overlay}>
      <motion.div
        className={styles.glowA}
        animate={{ x: [0, 70, -30, 0], y: [0, -50, 30, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className={styles.glowB}
        animate={{ x: [0, -60, 40, 0], y: [0, 40, -30, 0] }}
        transition={{ duration: 24, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className={styles.glowC}
        animate={{ x: [0, 50, -60, 0], y: [0, -30, 50, 0] }}
        transition={{ duration: 17, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className={styles.particleField} aria-hidden="true">
        {PARTICLES.map((p) => (
          <span
            key={p.id}
            className={styles.sparkle}
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              ['--dur' as string]: `${p.duration}s`,
              ['--delay' as string]: `${p.delay}s`,
            }}
          />
        ))}
      </div>

      <div className={styles.content}>
        <motion.div
          className={styles.kicker}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.span
            className={styles.kickerDot}
            animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          />
          Welcome aboard, {firstName}
        </motion.div>

        <h1 className={styles.headline}>
          {HEADLINE_LINES.map((line, li) => (
            <span className={styles.headlineLine} key={li}>
              {line.words.map((word, wi) => (
                <motion.span
                  key={wi}
                  className={styles.headlineWord}
                  initial={{ opacity: 0, y: '100%' }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.6,
                    ease: [0.22, 1, 0.36, 1],
                    delay: 0.15 + (li * line.words.length + wi) * 0.06,
                  }}
                  style={line.accent ? { color: 'var(--gold)' } : undefined}
                >
                  {word}
                </motion.span>
              ))}
            </span>
          ))}
        </h1>

        <motion.p
          className={styles.subheading}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <span className={styles.orgName}>{org.name}</span> has full access — explore
          everything, break nothing, keep only what earns its spot.
        </motion.p>

        <motion.div
          className={styles.statsRow}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.75 }}
        >
          <div className={styles.statBlock}>
            <div className={styles.statValue}>
              <CountUp target={10} />
            </div>
            <div className={styles.statLabel}>Engines unlocked</div>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.statBlock}>
            <div className={styles.statValue}>
              <CountUp target={30} />
            </div>
            <div className={styles.statLabel}>Days free</div>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.statBlock}>
            <div className={styles.statValue}>0</div>
            <div className={styles.statLabel}>Setup cost</div>
          </div>
        </motion.div>

        <div className={styles.grid}>
          {ENGINES.map((engine, i) => (
            <EngineCard key={engine.slug} engine={engine} index={i} />
          ))}
        </div>

        <motion.div
          className={styles.actionsRow}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.7 }}
        >
          <a href={`/org/${orgId}/settings/team`} className={styles.actionChip}>
            🧑‍🤝‍🧑 Invite your team
          </a>
          <a href={`/org/${orgId}/business-ops`} className={styles.actionChip}>
            🧭 Explore Business Ops
          </a>
        </motion.div>

        <motion.div
          className={styles.ctaWrap}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.8 }}
        >
          <motion.div
            className={styles.ctaRing}
            animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.button
            type="button"
            className={styles.cta}
            onClick={handleDismiss}
            disabled={dismissing}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
          >
            {dismissing ? 'Taking you in…' : "Let's go →"}
          </motion.button>

          {confetti.map((p) => (
            <motion.span
              key={p.id}
              className={styles.confettiPiece}
              style={{ background: p.color }}
              initial={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 }}
              animate={{ opacity: 0, x: p.x, y: p.y, rotate: p.rotate, scale: 0.4 }}
              transition={{ duration: 0.75, ease: 'easeOut' }}
            />
          ))}
        </motion.div>
      </div>
    </div>
  );
}