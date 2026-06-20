"use client";

import { useState, useEffect, useCallback, useRef, Suspense, lazy } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DockHeader from "@/components/DockHeader";
import FloatingHeader from "@/components/FloatingHeader";
import {
  getWalletAddress,
  getActiveWalletProvider,
  checkConnection,
  viewGlobalStats,
  type WalletProvider,
} from "@/hooks/contract";
import { motion as motion_framer } from "motion/react";

const TreeSVG = lazy(() => import("@/components/TreeSVG"));

/* ──────────────────────────────────────────
   useScrollProgress — normalised 0‒1 value
   ────────────────────────────────────────── */
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

/* ──────────────────────────────────────────
   ParticleField — CSS-only, 25 elements max
   ────────────────────────────────────────── */
function ParticleField() {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReduced = useRef(true);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: no-preference)");
    prefersReduced.current = !mq.matches;
    const handler = (e: MediaQueryListEvent) => { prefersReduced.current = !e.matches; };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (prefersReduced.current || !containerRef.current) return;
    const c = containerRef.current;
    const els: HTMLElement[] = [];
    const colors = ["#4B6E48", "#6B8F4E", "#B2AC88", "#5a7a45", "#3d5c3b"];

    // 5 deep background particles
    for (let i = 0; i < 5; i++) {
      const el = document.createElement("div");
      el.className = "tree-leaf";
      el.style.background = colors[i % colors.length];
      el.style.left = `${Math.random() * 100}%`;
      el.style.top = `${Math.random() * 100}%`;
      const s = 12 + Math.random() * 14;
      el.style.width = `${s}px`;
      el.style.height = `${s}px`;
      el.style.opacity = "0.04";
      el.style.filter = "blur(3px)";
      el.style.animation = `float-leaf ${10 + Math.random() * 6}s ease-in-out ${i * 1.5}s infinite alternate`;
      c.appendChild(el);
      els.push(el);
    }

    // 10 mid-speed leaves
    for (let i = 0; i < 10; i++) {
      const el = document.createElement("div");
      el.className = "tree-leaf";
      el.style.background = colors[i % colors.length];
      el.style.left = `${10 + Math.random() * 80}%`;
      el.style.top = `${Math.random() * 100}%`;
      const s = 5 + Math.random() * 6;
      el.style.width = `${s}px`;
      el.style.height = `${s}px`;
      el.style.opacity = "0.08";
      el.style.animation = `float-leaf ${7 + Math.random() * 4}s ease-in-out ${i * 0.8}s infinite alternate`;
      c.appendChild(el);
      els.push(el);
    }

    // 5 pollen particles
    for (let i = 0; i < 5; i++) {
      const el = document.createElement("div");
      el.style.cssText = `position:absolute;width:2px;height:2px;border-radius:50%;background:#e8d878;pointer-events:none;opacity:0;left:${20 + Math.random() * 60}%;top:${Math.random() * 70}%;animation:float-leaf ${6 + Math.random() * 4}s ease-in-out ${i * 1.2 + 2}s infinite alternate`;
      c.appendChild(el);
      els.push(el);
    }

    // 5 fireflies
    for (let i = 0; i < 5; i++) {
      const el = document.createElement("div");
      el.style.cssText = `position:absolute;width:3px;height:3px;border-radius:50%;background:#C9A84C;box-shadow:0 0 10px 4px rgba(201,168,76,0.35);pointer-events:none;opacity:0;left:${Math.random() * 100}%;top:${Math.random() * 85}%;animation:float-leaf ${5 + Math.random() * 4}s ease-in-out ${i * 1.5 + 3}s infinite alternate`;
      c.appendChild(el);
      els.push(el);
    }

    return () => els.forEach(e => e.remove());
  }, []);

  if (prefersReduced.current) return null;
  return <div ref={containerRef} className="pointer-events-none absolute inset-0 overflow-hidden" />;
}

/* ──────────────────────────────────────────
   FallingLeaves — cascade on scroll
   ────────────────────────────────────────── */
function FallingLeaves({ progress }: { progress: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const done = useRef(false);
  useEffect(() => {
    if (progress < 0.50 || done.current || !ref.current) return;
    done.current = true;
    const c = ref.current;
    const cols = ["#4B6E48", "#6B8F4E", "#B2AC88", "#C9A84C", "#5a7a45"];
    for (let i = 0; i < 48; i++) {
      const l = document.createElement("div");
      l.className = "falling-leaf";
      l.style.background = cols[i % cols.length];
      l.style.left = `${15 + Math.random() * 70}%`;
      l.style.top = `${2 + Math.random() * 12}%`;
      const s = 5 + Math.random() * 9;
      l.style.width = `${s}px`; l.style.height = `${s}px`;
      l.style.animationDuration = `${5 + Math.random() * 10}s`;
      l.style.animationDelay = `${i * 0.35}s`;
      c.appendChild(l);
    }
  }, [progress]);
  return <div ref={ref} className="pointer-events-none absolute inset-0 overflow-hidden z-[2]" />;
}

/* ──────────────────────────────────────────
   ScrollReveal — refactored with motion.dev
   ────────────────────────────────────────── */
function ScrollReveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion_framer.div
      initial={{ opacity: 0, y: 35 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.8, delay: delay / 1000, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={`scroll-reveal ${className}`}
    >
      {children}
    </motion_framer.div>
  );
}

/* ──────────────────────────────────────────
   StatCounter — CSS/rAF-only (no animejs)
   ────────────────────────────────────────── */
function StatCounter({ value, label }: { value: number; label: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const triggered = useRef(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!wrapRef.current) return;
    const obs = new IntersectionObserver(([e]) => {
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
    }, { threshold: 0.3 });
    obs.observe(wrapRef.current);
    return () => obs.disconnect();
  }, [value]);
  return (
    <div ref={wrapRef} className="text-center">
      <p className="text-4xl sm:text-5xl font-heading font-bold text-[var(--dark-ink)] embossed"><span ref={ref}>{value}</span></p>
      <p className="text-xs uppercase tracking-wider text-[var(--stone)] font-semibold mt-2">{label}</p>
    </div>
  );
}

/* ──────────────────────────────────────────
   HOME PAGE
   ────────────────────────────────────────── */
export default function Home() {
  const router = useRouter();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletProvider, setWalletProvider] = useState<WalletProvider | null>(null);
  const [globalStats, setGlobalStats] = useState<{ total_wallets: number; total_endorsements: number; total_reports: number } | null>(null);
  const scrollProgress = useScrollProgress();

  useEffect(() => {
    (async () => { try { if (await checkConnection()) { setWalletProvider(getActiveWalletProvider()); const addr = await getWalletAddress(); if (addr) setWalletAddress(addr); } } catch {} })();
  }, []);

  useEffect(() => {
    (async () => { try { const s = await viewGlobalStats(); if (s && typeof s === "object") { setGlobalStats({ total_wallets: Number((s as Record<string, unknown>).total_wallets ?? 0), total_endorsements: Number((s as Record<string, unknown>).total_endorsements ?? 0), total_reports: Number((s as Record<string, unknown>).total_reports ?? 0) }); } } catch {} })();
  }, []);

  const handleConnect = useCallback(async () => {
    router.push("/login");
  }, [router]);

  const handleDisconnect = useCallback(() => setWalletAddress(null), []);

  return (
    <div className="relative flex min-h-screen flex-col bg-[var(--parchment)]">
      <FloatingHeader />
      <DockHeader walletAddress={walletAddress} walletProvider={walletProvider} onConnect={handleConnect} onDisconnect={handleDisconnect} isConnecting={false} />

      {/* ambient magical background — single compound layer */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: `
            radial-gradient(ellipse at center, transparent 25%, rgba(44,44,43,0.08) 100%),
            radial-gradient(circle at 90% 10%, rgba(255,248,220,0.12) 0%, transparent 60%),
            radial-gradient(circle at -10% -20%, var(--sage) 0%, transparent 70%),
            radial-gradient(circle at 110% 120%, var(--forest) 0%, transparent 70%),
            radial-gradient(circle at 115% 30%, var(--amber-sap) 0%, transparent 70%),
            radial-gradient(circle at -10% 50%, var(--terra) 0%, transparent 70%),
            radial-gradient(circle at 90% 70%, var(--moss) 0%, transparent 70%),
            radial-gradient(circle at 40% 15%, rgba(201,168,76,0.15) 0%, transparent 70%)
          `,
          backgroundSize: "100% 100%, 500px 500px, 800px 800px, 700px 700px, 600px 600px, 600px 600px, 400px 400px, 300px 300px",
          opacity: 1,
        }}
      />

      <main className="relative z-10 flex flex-1 flex-col items-center">
        <div className="tree-container">

          {/* SVG tree */}
          <div className="tree-svg-wrapper w-full max-w-[400px] sm:max-w-[500px] md:max-w-[600px] lg:max-w-[700px]">
            <Suspense fallback={<div className="w-full aspect-[800/3400] bg-gradient-to-b from-transparent to-[var(--sage)]/10 rounded-full blur-3xl" />}>
              <TreeSVG progress={scrollProgress} />
            </Suspense>
          </div>

          {/* Light sweep shimmer effect */}
          <div className="light-sweep-overlay" />

          {/* Ambient light rays — sun through canopy */}
          <div className="ambient-light-ray" style={{ left: '30%', animationDelay: '0s' }} />
          <div className="ambient-light-ray" style={{ left: '55%', animationDelay: '-4s', animationDuration: '14s', opacity: 0.04 }} />
          <div className="ambient-light-ray" style={{ left: '75%', animationDelay: '-8s', animationDuration: '16s', width: '80px', opacity: 0.03 }} />

          {/* Falling leaves triggered by scroll */}
          <FallingLeaves progress={scrollProgress} />

          {/* ── HERO ── */}
          <section className="tree-section hero-section">
            <ParticleField />
            <ScrollReveal className="w-full max-w-3xl mx-auto text-center px-6">
              <div className="mb-6 inline-flex items-center gap-2 rounded-xl border-2 border-[var(--forest)] bg-[var(--warm-cream)] px-5 py-2 shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)]">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--forest)] opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--forest)]" />
                </span>
                <span className="text-sm font-mono-data font-semibold text-[var(--forest)] uppercase tracking-wider">
                  Powered by Soroban · Stellar
                </span>
              </div>

              <h1 className="mb-6">
                <span className="block text-5xl sm:text-6xl md:text-7xl font-heading font-bold tracking-tight leading-[1.05]">
                  <span className="embossed text-[var(--dark-ink)]">Wallet </span>
                  <span className="animate-gradient-drift bg-clip-text text-transparent embossed" style={{ backgroundImage: "linear-gradient(135deg, var(--forest), var(--sage), var(--moss), var(--forest))", backgroundSize: "300% 300%" }}>
                    Reputation
                  </span>
                </span>
                <span className="block text-5xl sm:text-6xl md:text-7xl font-heading font-bold tracking-tight leading-[1.05] embossed text-[var(--dark-ink)]">
                  Graph
                </span>
              </h1>

              <p className="mx-auto max-w-xl text-lg sm:text-xl leading-relaxed text-[var(--stone)] mb-3">
                A decentralized, on-chain reputation layer for Stellar wallets.
              </p>
              <p className="mx-auto max-w-xl text-base leading-relaxed text-[var(--stone)]/70 handwritten text-xl mb-8">
                Register, endorse, and report — immutably on the blockchain
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
                <Link href="/login" className="btn-forest text-base px-8 py-4 cursor-pointer">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
                  </svg>
                  Get Started
                </Link>
                <a href="#features" className="btn-outline text-base px-8 py-4 cursor-pointer">
                  Explore Features
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-60"><path d="m6 9 6 6 6-6" /></svg>
                </a>
              </div>

              {/* Supported wallets row */}
              <div className="flex items-center justify-center gap-3 mb-4">
                <span className="text-[10px] font-mono-data text-[var(--stone)] uppercase tracking-wider">Connect with</span>
                {["Freighter", "Rabet", "xBull", "LOBSTR"].map((w) => (
                  <span key={w} className="text-xs font-medium text-[var(--forest)] bg-[var(--forest)]/5 border border-[var(--forest)]/15 rounded-full px-3 py-1">{w}</span>
                ))}
              </div>
              <p className="text-[10px] font-mono-data text-[var(--stone)]/60 uppercase tracking-wider">Connect in 10 seconds</p>
            </ScrollReveal>

            {/* Social proof strip */}
            {globalStats && (
              <ScrollReveal delay={300} className="w-full max-w-xl mx-auto mt-10">
                <div className="flex items-center justify-center gap-6 text-center">
                  <div>
                    <p className="text-lg font-heading font-bold text-[var(--forest)]">{globalStats.total_wallets.toLocaleString()}</p>
                    <p className="text-[9px] font-mono-data uppercase tracking-wider text-[var(--stone)]">Wallets</p>
                  </div>
                  <div className="h-8 w-px bg-[var(--faded-sage)]" />
                  <div>
                    <p className="text-lg font-heading font-bold text-[var(--forest)]">{globalStats.total_endorsements.toLocaleString()}</p>
                    <p className="text-[9px] font-mono-data uppercase tracking-wider text-[var(--stone)]">Endorsements</p>
                  </div>
                  <div className="h-8 w-px bg-[var(--faded-sage)]" />
                  <div>
                    <p className="text-lg font-heading font-bold text-[var(--forest)]">{globalStats.total_reports.toLocaleString()}</p>
                    <p className="text-[9px] font-mono-data uppercase tracking-wider text-[var(--stone)]">Reports</p>
                  </div>
                </div>
              </ScrollReveal>
            )}

            <ScrollReveal delay={500} className="w-full flex justify-center mt-12">
              <div className="flex flex-col items-center gap-2 opacity-60 hover:opacity-100 transition-opacity animate-bounce">
                <span className="text-[10px] font-mono-data text-[var(--forest)] uppercase tracking-widest font-semibold flex items-center gap-2">
                  <span className="h-px w-4 bg-[var(--forest)] opacity-50" />
                  Scroll to explore
                  <span className="h-px w-4 bg-[var(--forest)] opacity-50" />
                </span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--forest)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="2" width="14" height="20" rx="7" />
                  <line x1="12" y1="6" x2="12" y2="10" />
                </svg>
                <svg className="mt-[-8px] text-[var(--forest)] opacity-50" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </div>
            </ScrollReveal>
          </section>

          {/* ── FEATURES — Bento Grid ── */}
          <section id="features" className="tree-section features-section">
            <ScrollReveal className="text-center mb-10" delay={0}>
              <div className="tree-section-label">Core Features</div>
              <h2 className="text-3xl sm:text-4xl font-heading font-bold text-[var(--dark-ink)] embossed mb-4">Built for Trust</h2>
              <p className="text-base text-[var(--stone)] max-w-lg mx-auto">Everything you need to build and verify reputation on the Stellar network</p>
            </ScrollReveal>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 w-full max-w-5xl mx-auto px-4">
              {[
                { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>, title: "Wallet Identity", desc: "Build your on-chain resume", useCase: "Create a decentralized profile with IPFS avatar and verifiable on-chain identity." },
                { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 10v12" /><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" /></svg>, title: "Peer Endorsements", desc: "Get vouched for by trusted wallets", useCase: "Build trust by endorsing reliable wallets across Trading, NFTs, or Development categories." },
                { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></svg>, title: "Community Reports", desc: "Protect yourself from bad actors", useCase: "Flag malicious wallets to protect the ecosystem. Reports decrement trust scores." },
                { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></svg>, title: "Verifiable Credentials", desc: "Institutions issue certificates to your wallet", useCase: "Mint immutable Certificates directly to wallets, beautifully rendered via on-chain data." },
                { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>, title: "Dispute Resolution", desc: "Community-powered arbitration", useCase: "A robust protocol where the community votes to reverse inaccurate interaction logs." },
                { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>, title: "Network Analytics", desc: "Track global trust trends in real time", useCase: "Access a global analytics dashboard tracking live trust metrics across the Soroban graph." },
              ].map((f, i) => (
                <ScrollReveal key={f.title} delay={i * 80}>
                  <div className="card-botanical p-5 h-full flex flex-col">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-[var(--forest)]/8 border border-[var(--forest)]/18 flex items-center justify-center text-[var(--forest)]">{f.icon}</div>
                      <div>
                        <h3 className="text-base font-heading font-bold text-[var(--dark-ink)]">{f.title}</h3>
                        <p className="text-xs text-[var(--stone)]">{f.desc}</p>
                      </div>
                    </div>
                    <p className="text-sm text-[var(--stone)]/80 leading-relaxed mt-auto">{f.useCase}</p>
                  </div>
                </ScrollReveal>
              ))}

              {/* Trust Score Preview card */}
              <ScrollReveal delay={500}>
                <div className="card-botanical p-5 h-full flex flex-col items-center justify-center text-center border-[var(--forest)]/20">
                  <div className="relative w-20 h-20 mb-3">
                    <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                      <circle cx="18" cy="18" r="16" fill="none" stroke="var(--faded-sage)" strokeWidth="3" opacity="0.3" />
                      <circle cx="18" cy="18" r="16" fill="none" stroke="var(--forest)" strokeWidth="3" strokeDasharray="87 100" strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xl font-heading font-bold text-[var(--dark-ink)]">87</span>
                    </div>
                  </div>
                  <h3 className="text-base font-heading font-bold text-[var(--dark-ink)] mb-1">Trust Score Preview</h3>
                  <p className="text-xs text-[var(--stone)] mb-3">See your wallet reputation breakdown</p>
                  <div className="w-full space-y-1.5">
                    <div className="flex items-center justify-between text-[10px]"><span className="text-[var(--stone)]">Endorsements</span><span className="font-mono-data text-[var(--forest)]">+24</span></div>
                    <div className="h-1.5 rounded-full bg-[var(--faded-sage)]/30 overflow-hidden"><div className="h-full rounded-full bg-[var(--forest)]" style={{ width: "75%" }} /></div>
                    <div className="flex items-center justify-between text-[10px]"><span className="text-[var(--stone)]">Reports</span><span className="font-mono-data text-[var(--terra)]">-2</span></div>
                    <div className="h-1.5 rounded-full bg-[var(--faded-sage)]/30 overflow-hidden"><div className="h-full rounded-full bg-[var(--terra)]" style={{ width: "8%" }} /></div>
                  </div>
                  <Link href="/login" className="mt-4 text-xs font-semibold text-[var(--forest)] hover:text-[#3d5c3b] transition-colors">Connect to see yours →</Link>
                </div>
              </ScrollReveal>
            </div>
          </section>

          {/* ── HOW IT WORKS — 3-Step Timeline ── */}
          <section className="tree-section canopy-section">
            <ScrollReveal className="text-center mb-12" delay={0}>
              <div className="tree-section-label">Getting Started</div>
              <h2 className="text-3xl sm:text-4xl font-heading font-bold text-[var(--dark-ink)] embossed mb-4">How It Works</h2>
              <p className="text-base text-[var(--stone)] max-w-lg mx-auto">Get started in three simple steps</p>
            </ScrollReveal>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-center gap-0 sm:gap-0 w-full max-w-3xl mx-auto px-4">
              {[
                { num: 1, title: "Connect Wallet", desc: "Pick Freighter, Rabet, xBull, or LOBSTR", icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a2 2 0 0 0 0 4h4v-4Z" /></svg> },
                { num: 2, title: "Register Identity", desc: "Create your on-chain wallet identity", icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></svg> },
                { num: 3, title: "Build Reputation", desc: "Get endorsed or report to establish trust", icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 10v12" /><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" /></svg> },
              ].map((step, i) => (
                <ScrollReveal key={step.num} delay={i * 120} className="flex-1 w-full">
                  <div className="flex flex-col items-center text-center relative px-4">
                    <div className="w-14 h-14 rounded-2xl bg-[var(--warm-cream)] border-2 border-[var(--faded-sage)] flex items-center justify-center text-[var(--forest)] mb-3 shadow-sm relative z-10">
                      {step.icon}
                    </div>
                    {i < 2 && <div className="hidden sm:block absolute top-7 left-[60%] w-[calc(100%-20%)] h-px bg-gradient-to-r from-[var(--faded-sage)] to-transparent z-0" />}
                    <h4 className="text-base font-heading font-bold text-[var(--dark-ink)] mb-1">Step {step.num}: {step.title}</h4>
                    <p className="text-sm text-[var(--stone)] max-w-[200px]">{step.desc}</p>
                  </div>
                </ScrollReveal>
              ))}
            </div>

            <ScrollReveal delay={300} className="mt-14">
              <div className="score-card">
                <h3 className="text-base font-heading font-bold text-[var(--dark-ink)] mb-4 text-center">Score Mechanics</h3>
                <div className="flex items-center justify-center gap-8 flex-wrap">
                  <div className="text-center"><p className="text-2xl font-heading font-bold text-[var(--forest)]">+1</p><p className="text-[10px] uppercase tracking-wider text-[var(--stone)] mt-1">Endorsement</p></div>
                  <div className="h-10 w-px bg-[var(--faded-sage)]" />
                  <div className="text-center"><p className="text-2xl font-heading font-bold text-[var(--terra)]">-3</p><p className="text-[10px] uppercase tracking-wider text-[var(--stone)] mt-1">Report</p></div>
                  <div className="h-10 w-px bg-[var(--faded-sage)]" />
                  <div className="text-center"><p className="text-2xl font-heading font-bold text-[var(--amber-sap)]">3:1</p><p className="text-[10px] uppercase tracking-wider text-[var(--stone)] mt-1">Neutralize</p></div>
                </div>
              </div>
            </ScrollReveal>
          </section>

          {/* ── BUILT FOR — Use-Case Strip ── */}
          <section className="tree-section py-16">
            <ScrollReveal className="text-center mb-10" delay={0}>
              <div className="tree-section-label">Who It&apos;s For</div>
              <h2 className="text-3xl sm:text-4xl font-heading font-bold text-[var(--dark-ink)] embossed mb-4">Built For Everyone</h2>
            </ScrollReveal>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl mx-auto px-4">
              {[
                { title: "Traders", icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>, bullets: ["Prove settlement history without KYC", "Build trust with counterparty wallets", "Access DeFi protocols with reputation"] },
                { title: "Developers", icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>, bullets: ["Integrate reputation into your dApp", "Issue verifiable credentials via Soroban", "Build trust layers for Stellar apps"] },
                { title: "Institutions", icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" /><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" /><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" /></svg>, bullets: ["Issue certificates to wallet identities", "Verify counterparty reputation on-chain", "Compliance-ready audit trail"] },
              ].map((item, i) => (
                <ScrollReveal key={item.title} delay={i * 100}>
                  <div className="card-botanical p-6 h-full">
                    <div className="w-12 h-12 rounded-xl bg-[var(--forest)]/8 border border-[var(--forest)]/18 flex items-center justify-center text-[var(--forest)] mb-4">{item.icon}</div>
                    <h3 className="text-lg font-heading font-bold text-[var(--dark-ink)] mb-3">{item.title}</h3>
                    <ul className="space-y-2">
                      {item.bullets.map((b) => (
                        <li key={b} className="flex items-start gap-2 text-sm text-[var(--stone)]">
                          <span className="text-[var(--forest)] mt-0.5 shrink-0">✓</span>
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
          <section className="tree-section py-16">
            <ScrollReveal className="text-center mb-10" delay={0}>
              <div className="tree-section-label">Live Preview</div>
              <h2 className="text-3xl sm:text-4xl font-heading font-bold text-[var(--dark-ink)] embossed mb-4">Your Reputation, Visualized</h2>
              <p className="text-base text-[var(--stone)] max-w-lg mx-auto">See what your on-chain reputation looks like</p>
            </ScrollReveal>
            <ScrollReveal delay={150} className="w-full max-w-md mx-auto px-4">
              <div className="card-botanical p-6 shadow-paper-lg">
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--forest)] to-[var(--moss)] p-[2px]">
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-[var(--warm-cream)]">
                      <span className="text-sm font-bold text-[var(--dark-ink)] font-mono-data">G7</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-heading font-bold text-[var(--dark-ink)]">G7xN...k9Mw</p>
                    <p className="text-[10px] font-mono-data text-[var(--stone)] uppercase tracking-wider">Registered · 142 days</p>
                  </div>
                  <div className="ml-auto">
                    <div className="relative w-14 h-14">
                      <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
                        <circle cx="18" cy="18" r="15" fill="none" stroke="var(--faded-sage)" strokeWidth="2.5" opacity="0.3" />
                        <circle cx="18" cy="18" r="15" fill="none" stroke="var(--forest)" strokeWidth="2.5" strokeDasharray="82 100" strokeLinecap="round" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-sm font-heading font-bold text-[var(--dark-ink)]">82</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1"><span className="text-[var(--forest)] font-semibold">Endorsements</span><span className="font-mono-data text-[var(--forest)]">+18</span></div>
                    <div className="h-2 rounded-full bg-[var(--faded-sage)]/30 overflow-hidden"><div className="h-full rounded-full bg-[var(--forest)] transition-all duration-1000" style={{ width: "72%" }} /></div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1"><span className="text-[var(--terra)] font-semibold">Reports</span><span className="font-mono-data text-[var(--terra)]">-3</span></div>
                    <div className="h-2 rounded-full bg-[var(--faded-sage)]/30 overflow-hidden"><div className="h-full rounded-full bg-[var(--terra)] transition-all duration-1000" style={{ width: "12%" }} /></div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1"><span className="text-[var(--amber-sap)] font-semibold">Credentials</span><span className="font-mono-data text-[var(--amber-sap)]">5</span></div>
                    <div className="h-2 rounded-full bg-[var(--faded-sage)]/30 overflow-hidden"><div className="h-full rounded-full bg-[var(--amber-sap)] transition-all duration-1000" style={{ width: "50%" }} /></div>
                  </div>
                </div>
                <div className="mt-5 pt-4 border-t border-[var(--faded-sage)]/30 flex items-center justify-between">
                  <span className="text-[10px] font-mono-data text-[var(--stone)] uppercase tracking-wider">Last updated: 2 hours ago</span>
                  <Link href="/login" className="text-xs font-semibold text-[var(--forest)] hover:text-[#3d5c3b] transition-colors">Connect yours →</Link>
                </div>
              </div>
            </ScrollReveal>
          </section>

          {/* ── WHY ON-CHAIN? ── */}
          <section className="tree-section py-16">
            <ScrollReveal className="text-center mb-10" delay={0}>
              <div className="tree-section-label">Why Stellar?</div>
              <h2 className="text-3xl sm:text-4xl font-heading font-bold text-[var(--dark-ink)] embossed mb-4">Why On-Chain?</h2>
            </ScrollReveal>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-3xl mx-auto px-4">
              {[
                { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>, title: "Immutable", desc: "Once recorded, reputation data cannot be altered or deleted by anyone." },
                { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>, title: "Verifiable", desc: "Anyone can independently verify a wallet&apos;s reputation on the public ledger." },
                { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>, title: "Permissionless", desc: "No central authority controls the reputation layer. It&apos;s open to all Stellar wallets." },
              ].map((item, i) => (
                <ScrollReveal key={item.title} delay={i * 100}>
                  <div className="text-center px-4">
                    <div className="w-12 h-12 rounded-2xl bg-[var(--forest)]/8 border border-[var(--forest)]/18 flex items-center justify-center text-[var(--forest)] mx-auto mb-3">{item.icon}</div>
                    <h3 className="text-lg font-heading font-bold text-[var(--dark-ink)] mb-2">{item.title}</h3>
                    <p className="text-sm text-[var(--stone)] leading-relaxed" dangerouslySetInnerHTML={{ __html: item.desc }} />
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </section>

          {/* ── CROWN / STATS ── */}
          <section className="tree-section crown-section">
            <div className="crown-shimmer" />
            <ScrollReveal className="text-center mb-12" delay={0}>
              <div className="tree-section-label crown-label">Network Stats</div>
              <h2 className="text-3xl sm:text-4xl font-heading font-bold text-[var(--dark-ink)] embossed mb-4">Network at a Glance</h2>
            </ScrollReveal>

            {globalStats && (
              <div className="crown-stats">
                <StatCounter value={globalStats.total_wallets} label="Registered Wallets" />
                <div className="h-16 w-px bg-[var(--faded-sage)] hidden sm:block" />
                <StatCounter value={globalStats.total_endorsements} label="Endorsements" />
                <div className="h-16 w-px bg-[var(--faded-sage)] hidden sm:block" />
                <StatCounter value={globalStats.total_reports} label="Reports" />
              </div>
            )}

            <ScrollReveal delay={200} className="text-center mt-16">
              <h2 className="text-3xl sm:text-4xl font-heading font-bold text-[var(--dark-ink)] embossed mb-4">Ready to Build Trust?</h2>
              <p className="text-base text-[var(--stone)] max-w-md mx-auto mb-8">Connect your wallet and join the reputation network on Stellar</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/login" className="btn-forest text-base px-8 py-4 cursor-pointer">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a2 2 0 0 0 0 4h4v-4Z" /></svg>
                  Connect Your Wallet
                </Link>
                <Link href="/graph" className="btn-outline text-base px-8 py-4 cursor-pointer">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" /></svg>
                  View Graph
                </Link>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={300} className="mt-12">
              <div className="trust-badges">
                {[
                  { label: "Soroban Smart Contracts", icon: "⬡" },
                  { label: "Decentralized", icon: "◎" },
                  { label: "Immutable Records", icon: "⛨" },
                  { label: "Testnet Powered", icon: "◷" },
                ].map(({ label, icon }) => (
                  <div key={label} className="trust-badge">
                    <span className="text-[var(--forest)] text-sm">{icon}</span>
                    <span className="text-xs font-medium text-[var(--stone)]">{label}</span>
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </section>

          {/* ── FOOTER ── */}
          <footer className="tree-section footer-section">
            <div className="footer-ground-line" />
            <div className="flex flex-col items-center gap-5">
              <div className="flex items-center gap-5 text-[11px] text-[var(--stone)] font-mono-data flex-wrap justify-center">
                <span>Stellar Network</span><span className="h-4 w-px bg-[var(--faded-sage)]" /><span>Multi-wallet login</span><span className="h-4 w-px bg-[var(--faded-sage)]" /><span>Soroban Smart Contracts</span>
              </div>
              <p className="text-[10px] text-[var(--stone)]/50 handwritten text-base text-center">Built on the Stellar blockchain — empowering trust in decentralised finance</p>
              <div className="flex items-center gap-4 text-[10px] text-[var(--stone)]/60 font-mono-data">
                <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--forest)] transition-colors">GitHub</a>
                <span className="h-3 w-px bg-[var(--faded-sage)]" />
                <a href="https://stellar.org" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--forest)] transition-colors">Stellar Docs</a>
                <span className="h-3 w-px bg-[var(--faded-sage)]" />
                <a href="https://soroban.stellar.org" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--forest)] transition-colors">Soroban</a>
              </div>
              <p className="text-xs text-[var(--stone)]/80 mt-2 font-mono-data uppercase tracking-widest text-center">
                Developed by <a href="https://harshal.great-site.net/" target="_blank" rel="noopener noreferrer" className="text-[var(--forest)] hover:text-[#3d5c3b] font-bold transition-colors">Harshal</a>
              </p>
              <div className="scroll-progress-bar">
                <div className="scroll-progress-fill" style={{ width: `${scrollProgress * 100}%` }} />
              </div>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}
