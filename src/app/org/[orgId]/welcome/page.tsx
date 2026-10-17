'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, animate } from 'framer-motion';
import { createClient } from '@/lib/supabase';
import styles from './welcome.module.css';

interface OrgRow {
  id: string;
  name: string;
}


const HEADLINE_LINES = [
  { words: ['Your', 'business', 'is', 'set', 'up.'], accent: false },
  { words: ["Let's", 'get', 'it', 'selling.'], accent: true },
];

// The same four steps appear as a self-ticking checklist on the dashboard.
const FIRST_STEPS = [
  { icon: '📦', title: 'Add your products', body: 'Type them in or import a list, with prices and stock counts.' },
  { icon: '🏦', title: 'Add a cash or M-Pesa account', body: 'So every sale and expense has somewhere to land.' },
  { icon: '🛒', title: 'Make your first sale', body: 'Open the till, ring up an item and print or send the receipt.' },
  { icon: '🧑‍🤝‍🧑', title: 'Invite your team', body: 'Create accounts for staff and choose which engines each can use.' },
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

    const updatePromise = fetch('/api/org/complete-onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orgId }),
    });
    const [res] = await Promise.all([updatePromise.catch(() => null), new Promise((r) => setTimeout(r, 600))]);

    if (!res || !res.ok) {
      console.error('Failed to mark onboarding_completed');
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
          <span className={styles.orgName}>{org.name}</span> is live with every engine switched on for 30 days.
          Four quick steps and you are trading. Your checklist waits on the dashboard and ticks itself off as you go.
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
            <div className={styles.statLabel}>Engines switched on</div>
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
            <div className={styles.statLabel}>Card needed</div>
          </div>
        </motion.div>

        <div className={styles.grid}>
          {FIRST_STEPS.map((step, i) => (
            <motion.div
              key={step.title}
              className={styles.engineCard}
              style={{ ['--engine-color' as string]: '#C9A227' }}
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.0 + i * 0.1 }}
            >
              <div className={styles.engineIcon}>{step.icon}</div>
              <div className={styles.engineName}>{i + 1}. {step.title}</div>
              <div className={styles.engineBlurb}>{step.body}</div>
            </motion.div>
          ))}
        </div>

        <motion.div
          className={styles.actionsRow}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.7 }}
        >
          <a href="/download" className={styles.actionChip}>
            💻 Get the Windows app
          </a>
          <a href={`/org/${orgId}/users`} className={styles.actionChip}>
            🧑‍🤝‍🧑 Invite your team
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
            {dismissing ? 'Taking you in…' : 'Start setting up →'}
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