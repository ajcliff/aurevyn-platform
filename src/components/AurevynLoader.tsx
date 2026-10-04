"use client";

import { useEffect, useState } from "react";

const MESSAGES = {
  root: ["Warming up the tills…", "Stocking the shelves…", "Balancing the books…", "Counting the day's takings…", "Almost open for business…"],
  founder: ["Gathering the numbers…", "Checking on every organization…", "Tallying invoices…", "Polishing the dashboard…", "Nearly there…"],
  org: ["Opening the shop…", "Lining up your engines…", "Fetching today's sales…", "Checking the stockroom…", "Nearly there…"],
} as const;

export default function AurevynLoader({ variant = "root" }: { variant?: keyof typeof MESSAGES }) {
  const messages = MESSAGES[variant];
  const [i, setI] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setI(n => (n + 1) % messages.length), 1700);
    return () => clearInterval(id);
  }, [messages.length]);

  return (
    <div className="av-load" role="status" aria-live="polite" aria-label="Loading">
      <div className="av-stage" aria-hidden="true">
        <span className="av-glow" />
        <span className="av-ring av-ring-1" />
        <span className="av-ring av-ring-2" />
        <span className="av-orbit"><span className="av-dot" /></span>
        <span className="av-orbit av-orbit-rev"><span className="av-dot av-dot-sm" /></span>
        <span className="av-core">A</span>
      </div>

      <div className="av-brand">AUREVYN</div>
      <div className="av-msg" key={i}>{messages[i]}</div>
      <div className="av-bar" aria-hidden="true"><span /></div>

      <style>{`
        .av-load{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;
          background:radial-gradient(ellipse at 50% 38%, var(--bg-surface,#241420) 0%, var(--bg-base,#1A0F14) 62%);
          color:var(--text-primary,#F3E9ED);font-family:var(--font-inter,system-ui,sans-serif);overflow:hidden}
        .av-stage{position:relative;width:132px;height:132px;display:grid;place-items:center;margin-bottom:6px}
        .av-glow{position:absolute;inset:14px;border-radius:50%;background:var(--gold,#C9A227);filter:blur(34px);opacity:.35;animation:av-breathe 2.4s ease-in-out infinite}
        .av-ring{position:absolute;inset:0;border-radius:50%;border:1.5px solid var(--gold,#C9A227);opacity:0;animation:av-ping 2.4s cubic-bezier(.2,.6,.3,1) infinite}
        .av-ring-2{animation-delay:1.2s}
        .av-orbit{position:absolute;inset:6px;animation:av-spin 2.2s linear infinite}
        .av-orbit-rev{inset:20px;animation:av-spin 3.4s linear infinite reverse}
        .av-dot{position:absolute;top:-4px;left:calc(50% - 5px);width:10px;height:10px;border-radius:50%;background:var(--gold-light,var(--gold,#C9A227));box-shadow:0 0 12px var(--gold,#C9A227)}
        .av-dot-sm{width:7px;height:7px;top:-3px;left:calc(50% - 3.5px);background:var(--text-secondary,#C9B8C0);box-shadow:none}
        .av-core{position:relative;width:62px;height:62px;border-radius:18px;display:grid;place-items:center;font-weight:800;font-size:30px;
          background:var(--gold,#C9A227);color:var(--gold-contrast,#1A0F14);animation:av-bob 2.4s ease-in-out infinite;box-shadow:0 8px 28px var(--gold-glow-strong,rgba(201,162,39,.3))}
        .av-brand{font-weight:800;letter-spacing:.32em;font-size:13px;text-indent:.32em;animation:av-fade 1s ease both}
        .av-msg{height:20px;font-size:13px;color:var(--text-secondary,#C9B8C0);animation:av-rise .5s ease both}
        .av-bar{width:168px;height:3px;border-radius:3px;background:var(--border,#3D2530);overflow:hidden}
        .av-bar span{display:block;height:100%;width:40%;border-radius:3px;background:linear-gradient(90deg,transparent,var(--gold,#C9A227),transparent);animation:av-slide 1.3s ease-in-out infinite}
        @keyframes av-spin{to{transform:rotate(360deg)}}
        @keyframes av-breathe{0%,100%{transform:scale(.85);opacity:.22}50%{transform:scale(1.15);opacity:.45}}
        @keyframes av-ping{0%{transform:scale(.55);opacity:.6}100%{transform:scale(1.25);opacity:0}}
        @keyframes av-bob{0%,100%{transform:translateY(0) rotate(-3deg)}50%{transform:translateY(-5px) rotate(3deg)}}
        @keyframes av-slide{0%{transform:translateX(-120%)}100%{transform:translateX(320%)}}
        @keyframes av-rise{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        @keyframes av-fade{from{opacity:0}to{opacity:1}}
        @media (prefers-reduced-motion: reduce){
          .av-glow,.av-ring,.av-orbit,.av-core,.av-bar span{animation:none}
          .av-ring{opacity:.25;inset:8px}
          .av-bar span{width:100%;opacity:.5}
        }
      `}</style>
    </div>
  );
}
