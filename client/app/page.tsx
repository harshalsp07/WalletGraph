"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DockHeader from "@/components/DockHeader";
import FloatingHeader from "@/components/FloatingHeader";
import ConstellationBackground from "@/components/ConstellationBackground";
import {
  getWalletAddress,
  getActiveWalletProvider,
  checkConnection,
  viewGlobalStats,
  type WalletProvider,
} from "@/hooks/contract";
import { motion as motion_framer } from "motion/react";

function useScrollProgress() {
  const [progress, setProgress] = useState(0);
  const target = useRef(0);
  const current = useRef(0);
  const rafId = useRef<number>(0);

  useEffect(() => {
    const el = document.documentElement;
    const calculateMax = () => el.scrollHeight - el.clientHeight;

    const onScroll = () => {
      const max = calculateMax();
      target.current = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
    };

    const tick = () => {
      const diff = target.current - current.current;
      if (Math.abs(diff) > 0.0005) {
        current.current += diff * 0.08;
        setProgress(current.current);
      } else if (current.current !== target.current) {
        current.current = target.current;
        setProgress(current.current);
      }
      rafId.current = requestAnimationFrame(tick);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    onScroll();
    rafId.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(rafId.current);
    };
  }, []);

  return progress;
}

function ScrollReveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion_framer.div
      initial={{ opacity: 0, y: 35 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.8, delay: delay / 1000, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={`nc-reveal ${className}`}
    >
      {children}
    </motion_framer.div>
  );
}

function StatCounter({ value, label }: { value: number; label: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const triggered = useRef(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!wrapRef.current) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !triggered.current && value > 0) {
          triggered.current = true;
          const start = performance.now();
          const duration = 1800;
          const easeOutExpo = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));
          const tick = (now: number) => {
            const elapsed = now - start;
            const t = Math.min(elapsed / duration, 1);
            const current = Math.round(easeOutExpo(t) * value);
            if (ref.current) ref.current.textContent = String(current);
            if (t < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(wrapRef.current);
    return () => obs.disconnect();
  }, [value]);
  return (
    <div ref={wrapRef} className="text-center">
      <p className="text-4xl sm:text-5xl nc-heading font-bold text-[var(--nc-emerald-bright)]">
        <span ref={ref}>{value}</span>
      </p>
      <p className="text-xs uppercase tracking-wider text-[var(--nc-ink-dim)] font-semibold mt-2">{label}</p>
    </div>
  );
}

const walletIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
  </svg>
);

const arrowDown = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-60"><path d="m6 9 6 6 6-6" /></svg>
);

const graphIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" /></svg>
);

export default function Home() {
  const router = useRouter();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletProvider, setWalletProvider] = useState<WalletProvider | null>(null);
  const [globalStats, setGlobalStats] = useState<{ total_wallets: number; total_endorsements: number; total_reports: number } | null>(null);
  const scrollProgress = useScrollProgress();

  useEffect(() => {
    (async () => {
      try {
        if (await checkConnection()) {
          setWalletProvider(getActiveWalletProvider());
          const addr = await getWalletAddress();
          if (addr) setWalletAddress(addr);
        }
      } catch {
        /* ignore */
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const s = await viewGlobalStats();
        if (s && typeof s === "object") {
          setGlobalStats({
            total_wallets: Number((s as Record<string, unknown>).total_wallets ?? 0),
            total_endorsements: Number((s as Record<string, unknown>).total_endorsements ?? 0),
            total_reports: Number((s as Record<string, unknown>).total_reports ?? 0),
          });
        }
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const handleConnect = useCallback(async () => {
    router.push("/login");
  }, [router]);

  const handleDisconnect = useCallback(() => setWalletAddress(null), []);

  return (
    <div className="nc-page relative flex min-h-screen flex-col">
      <FloatingHeader variant="dark" />
      <DockHeader
        walletAddress={walletAddress}
        walletProvider={walletProvider}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        isConnecting={false}
        variant="dark"
      />

      <ConstellationBackground />

      <main className="nc-main relative z-10 flex flex-1 flex-col items-center">
        {/* ── HERO ── */}
        <section className="nc-section nc-section-hero">
          <ScrollReveal className="w-full max-w-3xl mx-auto text-center">
            <div className="mb-7 nc-eyebrow">
              <span className="nc-eyebrow-dot" />
              Powered by Soroban · Stellar
            </div>

            <h1 className="nc-hero-title mb-7">
              <span className="block">Wallet</span>
              <span className="block em">Reputation</span>
              <span className="block">Graph</span>
            </h1>

            <p className="nc-lede-primary mb-3">A decentralized, on-chain reputation layer for Stellar wallets.</p>
            <p className="nc-lede nc-lede-hand mb-10">Register, endorse, and report — immutably on the blockchain</p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-5 mb-10">
              <Link href="/login" className="nc-btn nc-btn-primary text-base px-8 py-4 cursor-pointer">
                {walletIcon}
                Get Started
              </Link>
              <a href="#features" className="nc-btn nc-btn-ghost text-base px-8 py-4 cursor-pointer">
                Explore Features
                {arrowDown}
              </a>
            </div>

            <div className="flex items-center justify-center gap-3 mb-4 mt-2">
              <span className="text-[10px] nc-mono text-[var(--nc-ink-dim)] uppercase tracking-wider">Connect with</span>
              {["Freighter", "Rabet", "xBull", "LOBSTR"].map((w) => (
                <span key={w} className="nc-wallet-chip">{w}</span>
              ))}
            </div>
            <p className="text-[10px] nc-mono text-[var(--nc-ink-dim)]/70 uppercase tracking-wider">Connect in 10 seconds</p>
          </ScrollReveal>

          {globalStats && (
            <ScrollReveal delay={300} className="w-full max-w-xl mx-auto mt-10">
              <div className="nc-stats-strip">
                <div>
                  <p className="nc-stat-num">{globalStats.total_wallets.toLocaleString()}</p>
                  <p className="nc-stat-label">Wallets</p>
                </div>
                <div className="nc-stat-div" />
                <div>
                  <p className="nc-stat-num">{globalStats.total_endorsements.toLocaleString()}</p>
                  <p className="nc-stat-label">Endorsements</p>
                </div>
                <div className="nc-stat-div" />
                <div>
                  <p className="nc-stat-num">{globalStats.total_reports.toLocaleString()}</p>
                  <p className="nc-stat-label">Reports</p>
                </div>
              </div>
            </ScrollReveal>
          )}

          <ScrollReveal delay={500} className="w-full flex justify-center mt-14">
            <div className="nc-scroll-cue">
              <span className="text-[10px] nc-mono uppercase tracking-widest font-semibold flex items-center gap-2">
                <span className="h-px w-4 bg-[var(--nc-emerald)] opacity-50" />
                Scroll to explore
                <span className="h-px w-4 bg-[var(--nc-emerald)] opacity-50" />
              </span>
              <div className="nc-scroll-cue-line" />
            </div>
          </ScrollReveal>
        </section>

        {/* ── FEATURES — Bento Grid ── */}
        <section id="features" className="nc-section">
          <ScrollReveal className="nc-title-block" delay={0}>
            <div className="nc-eyebrow mb-5">Core Features</div>
            <h2 className="nc-title">Built for Trust</h2>
            <p className="nc-subtitle">Everything you need to build and verify reputation on the Stellar network</p>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 w-full max-w-5xl">
            {[
              { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>, title: "Wallet Identity", desc: "Build your on-chain resume", useCase: "Create a decentralized profile with IPFS avatar and verifiable on-chain identity." },
              { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 10v12" /><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" /></svg>, title: "Peer Endorsements", desc: "Get vouched for by trusted wallets", useCase: "Build trust by endorsing reliable wallets across Trading, NFTs, or Development categories." },
              { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></svg>, title: "Community Reports", desc: "Protect yourself from bad actors", useCase: "Flag malicious wallets to protect the ecosystem. Reports decrement trust scores." },
              { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></svg>, title: "Verifiable Credentials", desc: "Institutions issue certificates to your wallet", useCase: "Mint immutable Certificates directly to wallets, beautifully rendered via on-chain data." },
              { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>, title: "Dispute Resolution", desc: "Community-powered arbitration", useCase: "A robust protocol where the community votes to reverse inaccurate interaction logs." },
              { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>, title: "Network Analytics", desc: "Track global trust trends in real time", useCase: "Access a global analytics dashboard tracking live trust metrics across the Soroban graph." },
            ].map((f, i) => (
              <ScrollReveal key={f.title} delay={i * 80}>
                <div className="nc-card p-5 h-full flex flex-col">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="nc-icon-chip">{f.icon}</div>
                    <div>
                      <h3 className="text-base nc-heading font-bold">{f.title}</h3>
                      <p className="text-xs text-[var(--nc-ink-dim)]">{f.desc}</p>
                    </div>
                  </div>
                  <p className="text-sm text-[var(--nc-ink-soft)] leading-relaxed mt-auto">{f.useCase}</p>
                </div>
              </ScrollReveal>
            ))}

            <ScrollReveal delay={500} className="lg:col-span-3 flex justify-center">
              <div className="nc-card p-5 w-full max-w-xs flex flex-col items-center justify-center text-center">
                <div className="relative w-20 h-20 mb-3">
                  <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                    <circle cx="18" cy="18" r="16" fill="none" className="nc-ring-track" strokeWidth="3" />
                    <circle cx="18" cy="18" r="16" fill="none" className="nc-ring-fill" strokeWidth="3" strokeDasharray="87 100" strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl nc-heading font-bold">87</span>
                  </div>
                </div>
                <h3 className="text-base nc-heading font-bold mb-1">Trust Score Preview</h3>
                <p className="text-xs text-[var(--nc-ink-dim)] mb-3">See your wallet reputation breakdown</p>
                <div className="w-full space-y-1.5">
                  <div className="flex items-center justify-between text-[10px]"><span className="text-[var(--nc-ink-dim)]">Endorsements</span><span className="nc-mono text-[var(--nc-emerald-bright)]">+24</span></div>
                  <div className="h-1.5 rounded-full bg-[var(--nc-line-soft)] overflow-hidden"><div className="h-full rounded-full bg-[var(--nc-emerald)]" style={{ width: "75%" }} /></div>
                  <div className="flex items-center justify-between text-[10px]"><span className="text-[var(--nc-ink-dim)]">Reports</span><span className="nc-mono text-[var(--nc-terra)]">-2</span></div>
                  <div className="h-1.5 rounded-full bg-[var(--nc-line-soft)] overflow-hidden"><div className="h-full rounded-full bg-[var(--nc-terra)]" style={{ width: "8%" }} /></div>
                </div>
                <Link href="/login" className="mt-4 text-xs font-semibold text-[var(--nc-emerald-bright)] hover:text-[var(--nc-amber-soft)] transition-colors">Connect to see yours →</Link>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ── HOW IT WORKS — 3-Step Timeline ── */}
        <section className="nc-section">
          <ScrollReveal className="nc-title-block" delay={0}>
            <div className="nc-eyebrow mb-5">Getting Started</div>
            <h2 className="nc-title">How It Works</h2>
            <p className="nc-subtitle">Get started in three simple steps</p>
          </ScrollReveal>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-center gap-0 w-full max-w-3xl">
            {[
              { num: 1, title: "Connect Wallet", desc: "Pick Freighter, Rabet, xBull, or LOBSTR", icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a2 2 0 0 0 0 4h4v-4Z" /></svg> },
              { num: 2, title: "Register Identity", desc: "Create your on-chain wallet identity", icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></svg> },
              { num: 3, title: "Build Reputation", desc: "Get endorsed or report to establish trust", icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 10v12" /><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" /></svg> },
            ].map((step, i) => (
              <ScrollReveal key={step.num} delay={i * 120} className="flex-1 w-full">
                <div className="nc-step flex flex-col items-center text-center relative px-4">
                  <div className="nc-step-num mb-3">{step.icon}</div>
                  {i < 2 && <div className="hidden sm:block absolute top-7 left-[60%] w-[calc(100%-20%)] h-px bg-gradient-to-r from-[var(--nc-line)] to-transparent z-0" />}
                  <h4 className="text-base nc-heading font-bold mb-1">Step {step.num}: {step.title}</h4>
                  <p className="text-sm text-[var(--nc-ink-dim)] max-w-[200px]">{step.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>

          <ScrollReveal delay={300} className="mt-14">
            <div className="nc-card p-6 sm:px-10 max-w-md mx-auto">
              <h3 className="text-base nc-heading font-bold mb-4 text-center">Score Mechanics</h3>
              <div className="flex items-center justify-center gap-8 flex-wrap">
                <div className="text-center"><p className="text-2xl nc-heading font-bold text-[var(--nc-emerald-bright)]">+1</p><p className="text-[10px] uppercase tracking-wider text-[var(--nc-ink-dim)] mt-1">Endorsement</p></div>
                <div className="h-10 w-px bg-[var(--nc-line)]" />
                <div className="text-center"><p className="text-2xl nc-heading font-bold text-[var(--nc-terra)]">-3</p><p className="text-[10px] uppercase tracking-wider text-[var(--nc-ink-dim)] mt-1">Report</p></div>
                <div className="h-10 w-px bg-[var(--nc-line)]" />
                <div className="text-center"><p className="text-2xl nc-heading font-bold text-[var(--nc-amber-soft)]">3:1</p><p className="text-[10px] uppercase tracking-wider text-[var(--nc-ink-dim)] mt-1">Neutralize</p></div>
              </div>
            </div>
          </ScrollReveal>
        </section>

        {/* ── BUILT FOR — Use-Case Strip ── */}
        <section className="nc-section">
          <ScrollReveal className="nc-title-block" delay={0}>
            <div className="nc-eyebrow mb-5">Who It&apos;s For</div>
            <h2 className="nc-title">Built For Everyone</h2>
          </ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
            {[
              { title: "Traders", icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>, bullets: ["Prove settlement history without KYC", "Build trust with counterparty wallets", "Access DeFi protocols with reputation"] },
              { title: "Developers", icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>, bullets: ["Integrate reputation into your dApp", "Issue verifiable credentials via Soroban", "Build trust layers for Stellar apps"] },
              { title: "Institutions", icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" /><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" /><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" /></svg>, bullets: ["Issue certificates to wallet identities", "Verify counterparty reputation on-chain", "Compliance-ready audit trail"] },
            ].map((item, i) => (
              <ScrollReveal key={item.title} delay={i * 100}>
                <div className="nc-card p-6 h-full">
                  <div className="nc-icon-chip mb-4" style={{ width: 48, height: 48 }}>{item.icon}</div>
                  <h3 className="text-lg nc-heading font-bold mb-3">{item.title}</h3>
                  <ul className="space-y-2">
                    {item.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2 text-sm text-[var(--nc-ink-soft)]">
                        <span className="text-[var(--nc-emerald-bright)] mt-0.5 shrink-0">✓</span>
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </section>

        {/* ── TRUST SCORE PREVIEW WIDGET ── */}
        <section className="nc-section">
          <ScrollReveal className="nc-title-block" delay={0}>
            <div className="nc-eyebrow mb-5">Live Preview</div>
            <h2 className="nc-title">Your Reputation, Visualized</h2>
            <p className="nc-subtitle">See what your on-chain reputation looks like</p>
          </ScrollReveal>
          <ScrollReveal delay={150} className="w-full max-w-md">
            <div className="nc-card p-6">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--nc-emerald-bright)] to-[var(--nc-emerald-deep)] p-[2px]">
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-[var(--nc-bg-1)]">
                    <span className="text-sm font-bold nc-mono text-[var(--nc-emerald-bright)]">G7</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm nc-heading font-bold">G7xN...k9Mw</p>
                  <p className="text-[10px] nc-mono text-[var(--nc-ink-dim)] uppercase tracking-wider">Registered · 142 days</p>
                </div>
                <div className="ml-auto">
                  <div className="relative w-14 h-14">
                    <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
                      <circle cx="18" cy="18" r="15" fill="none" className="nc-ring-track" strokeWidth="2.5" />
                      <circle cx="18" cy="18" r="15" fill="none" className="nc-ring-fill" strokeWidth="2.5" strokeDasharray="82 100" strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm nc-heading font-bold">82</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1"><span className="text-[var(--nc-emerald-bright)] font-semibold">Endorsements</span><span className="nc-mono text-[var(--nc-emerald-bright)]">+18</span></div>
                  <div className="h-2 rounded-full bg-[var(--nc-line-soft)] overflow-hidden"><div className="h-full rounded-full bg-[var(--nc-emerald)] transition-all duration-1000" style={{ width: "72%" }} /></div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs mb-1"><span className="text-[var(--nc-terra)] font-semibold">Reports</span><span className="nc-mono text-[var(--nc-terra)]">-3</span></div>
                  <div className="h-2 rounded-full bg-[var(--nc-line-soft)] overflow-hidden"><div className="h-full rounded-full bg-[var(--nc-terra)] transition-all duration-1000" style={{ width: "12%" }} /></div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs mb-1"><span className="text-[var(--nc-amber-soft)] font-semibold">Credentials</span><span className="nc-mono text-[var(--nc-amber-soft)]">5</span></div>
                  <div className="h-2 rounded-full bg-[var(--nc-line-soft)] overflow-hidden"><div className="h-full rounded-full bg-[var(--nc-amber)] transition-all duration-1000" style={{ width: "50%" }} /></div>
                </div>
              </div>
              <div className="mt-5 pt-4 border-t border-[var(--nc-line)] flex items-center justify-between">
                <span className="text-[10px] nc-mono text-[var(--nc-ink-dim)] uppercase tracking-wider">Last updated: 2 hours ago</span>
                <Link href="/login" className="text-xs font-semibold text-[var(--nc-emerald-bright)] hover:text-[var(--nc-amber-soft)] transition-colors">Connect yours →</Link>
              </div>
            </div>
          </ScrollReveal>
        </section>

        {/* ── WHY ON-CHAIN? ── */}
        <section className="nc-section">
          <ScrollReveal className="nc-title-block" delay={0}>
            <div className="nc-eyebrow mb-5">Why Stellar?</div>
            <h2 className="nc-title">Why On-Chain?</h2>
          </ScrollReveal>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-3xl">
            {[
              { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>, title: "Immutable", desc: "Once recorded, reputation data cannot be altered or deleted by anyone." },
              { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>, title: "Verifiable", desc: "Anyone can independently verify a wallet&apos;s reputation on the public ledger." },
              { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>, title: "Permissionless", desc: "No central authority controls the reputation layer. It&apos;s open to all Stellar wallets." },
            ].map((item, i) => (
              <ScrollReveal key={item.title} delay={i * 100}>
                <div className="text-center px-4">
                  <div className="nc-icon-chip mx-auto mb-3" style={{ width: 48, height: 48, borderRadius: 16 }}>{item.icon}</div>
                  <h3 className="text-lg nc-heading font-bold mb-2">{item.title}</h3>
                  <p className="text-sm text-[var(--nc-ink-soft)] leading-relaxed" dangerouslySetInnerHTML={{ __html: item.desc }} />
                </div>
              </ScrollReveal>
            ))}
          </div>
        </section>

        {/* ── CROWN / STATS ── */}
        <section className="nc-section">
          <ScrollReveal className="nc-title-block" delay={0}>
            <div className="nc-eyebrow mb-5">Network Stats</div>
            <h2 className="nc-title">Network at a Glance</h2>
          </ScrollReveal>

          {globalStats && (
            <ScrollReveal delay={150} className="w-full max-w-2xl">
              <div className="nc-card p-8 flex items-center justify-center gap-6 sm:gap-10 flex-wrap">
                <StatCounter value={globalStats.total_wallets} label="Registered Wallets" />
                <div className="h-16 w-px bg-[var(--nc-line)] hidden sm:block" />
                <StatCounter value={globalStats.total_endorsements} label="Endorsements" />
                <div className="h-16 w-px bg-[var(--nc-line)] hidden sm:block" />
                <StatCounter value={globalStats.total_reports} label="Reports" />
              </div>
            </ScrollReveal>
          )}

          <ScrollReveal delay={200} className="text-center mt-16">
            <h2 className="nc-title mb-4">Ready to Build Trust?</h2>
            <p className="nc-subtitle mb-8">Connect your wallet and join the reputation network on Stellar</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/login" className="nc-btn nc-btn-primary text-base px-8 py-4 cursor-pointer">
                {walletIcon}
                Connect Your Wallet
              </Link>
              <Link href="/graph" className="nc-btn nc-btn-ghost text-base px-8 py-4 cursor-pointer">
                {graphIcon}
                View Graph
              </Link>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={300} className="mt-12">
            <div className="flex flex-wrap items-center justify-center gap-3">
              {[
                { label: "Soroban Smart Contracts", icon: "⬡" },
                { label: "Decentralized", icon: "◎" },
                { label: "Immutable Records", icon: "⛨" },
                { label: "Testnet Powered", icon: "◷" },
              ].map(({ label, icon }) => (
                <div key={label} className="flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--nc-line)] bg-[var(--nc-glass)] backdrop-blur-sm transition-colors hover:border-[var(--nc-emerald)]/40">
                  <span className="text-[var(--nc-emerald-bright)] text-sm">{icon}</span>
                  <span className="text-xs font-medium text-[var(--nc-ink-soft)]">{label}</span>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </section>

        {/* ── FOOTER ── */}
        <footer className="nc-section" style={{ paddingTop: "3rem", paddingBottom: "5rem" }}>
          <div className="w-full max-w-md h-px bg-gradient-to-r from-transparent via-[var(--nc-line)] to-transparent mb-8 opacity-60" />
          <div className="flex flex-col items-center gap-5">
            <div className="flex items-center gap-5 text-[11px] text-[var(--nc-ink-dim)] nc-mono flex-wrap justify-center">
              <span>Stellar Network</span><span className="h-4 w-px bg-[var(--nc-line)]" /><span>Multi-wallet login</span><span className="h-4 w-px bg-[var(--nc-line)]" /><span>Soroban Smart Contracts</span>
            </div>
            <p className="text-[10px] text-[var(--nc-ink-dim)]/70 nc-lede-hand text-base text-center">Built on the Stellar blockchain — empowering trust in decentralised finance</p>
            <div className="flex items-center gap-4 text-[10px] text-[var(--nc-ink-dim)] nc-mono">
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--nc-emerald-bright)] transition-colors">GitHub</a>
              <span className="h-3 w-px bg-[var(--nc-line)]" />
              <a href="https://stellar.org" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--nc-emerald-bright)] transition-colors">Stellar Docs</a>
              <span className="h-3 w-px bg-[var(--nc-line)]" />
              <a href="https://soroban.stellar.org" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--nc-emerald-bright)] transition-colors">Soroban</a>
            </div>
            <p className="text-xs text-[var(--nc-ink-soft)] mt-2 nc-mono uppercase tracking-widest text-center">
              Developed by <a href="https://harshal.great-site.net/" target="_blank" rel="noopener noreferrer" className="text-[var(--nc-emerald-bright)] hover:text-[var(--nc-amber-soft)] font-bold transition-colors">Harshal</a>
            </p>
            <div className="nc-progress-track">
              <div className="nc-progress-fill" style={{ width: `${scrollProgress * 100}%` }} />
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
