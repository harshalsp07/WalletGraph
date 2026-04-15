"use client";

import { useEffect, useState, useRef } from "react";

interface StatsBannerProps {
  stats: {
    total_wallets: number;
    total_endorsements: number;
    total_reports: number;
  };
}

function AnimatedCounter({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let start: number | null = null;
    const duration = 1500;
    let rafId: number;
    let cancelled = false;

    const animateCounter = (timestamp: number) => {
      if (cancelled) return;

      if (value <= 0) {
        setDisplayValue(0);
        return;
      }

      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(eased * value));
      if (progress < 1) {
        rafId = requestAnimationFrame(animateCounter);
      }
    };

    rafId = requestAnimationFrame(animateCounter);
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [value]);

  return <span ref={ref}>{displayValue}</span>;
}

export default function StatsBanner({ stats }: StatsBannerProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="card-botanical p-4 text-center paper-shadow">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--warm-cream)] border-2 border-[var(--faded-sage)] text-[var(--forest)] mb-3 shadow-inner">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <p className="text-3xl font-heading font-bold text-[var(--dark-ink)] embossed">
          <AnimatedCounter value={stats.total_wallets} />
        </p>
        <p className="text-[10px] uppercase tracking-wider text-[var(--stone)] font-semibold mt-1">Wallets</p>
      </div>

      <div className="card-botanical p-4 text-center paper-shadow">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--warm-cream)] border-2 border-[var(--faded-sage)] text-[var(--forest)] mb-3 shadow-inner">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 10v12" />
            <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
          </svg>
        </div>
        <p className="text-3xl font-heading font-bold text-[var(--forest)] embossed">
          <AnimatedCounter value={stats.total_endorsements} />
        </p>
        <p className="text-[10px] uppercase tracking-wider text-[var(--stone)] font-semibold mt-1">Endorsements</p>
      </div>

      <div className="card-botanical p-4 text-center paper-shadow">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--warm-cream)] border-2 border-[var(--faded-sage)] text-[var(--terra)] mb-3 shadow-inner">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
            <line x1="4" y1="22" x2="4" y2="15" />
          </svg>
        </div>
        <p className="text-3xl font-heading font-bold text-[var(--terra)] embossed">
          <AnimatedCounter value={stats.total_reports} />
        </p>
        <p className="text-[10px] uppercase tracking-wider text-[var(--stone)] font-semibold mt-1">Reports</p>
      </div>
    </div>
  );
}