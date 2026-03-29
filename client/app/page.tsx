"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { animate, utils } from "animejs";
import Navbar from "@/components/Navbar";
import {
  connectWallet,
  getWalletAddress,
  checkConnection,
  viewGlobalStats,
} from "@/hooks/contract";

function LeafParticles() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    const leaves: HTMLDivElement[] = [];
    const colors = ["var(--sage)", "var(--forest)", "var(--moss)", "var(--faded-sage)"];

    for (let i = 0; i < 15; i++) {
      const leaf = document.createElement("div");
      leaf.className = "leaf-particle";
      leaf.style.background = colors[Math.floor(Math.random() * colors.length)];
      leaf.style.left = `${Math.random() * 100}%`;
      leaf.style.top = `${Math.random() * 100}%`;
      leaf.style.transform = `rotate(${Math.random() * 360}deg)`;
      const size = 4 + Math.random() * 8;
      leaf.style.width = `${size}px`;
      leaf.style.height = `${size}px`;
      container.appendChild(leaf);
      leaves.push(leaf);
    }

    leaves.forEach((leaf, i) => {
      animate(leaf, {
        translateX: () => utils.random(-50, 50),
        translateY: () => utils.random(-70, 20),
        rotate: () => utils.random(-180, 180),
        opacity: [
          { to: 0.06, duration: 1000 },
          { to: 0.15, duration: 2000 },
          { to: 0.04, duration: 1500 },
        ],
        scale: [
          { to: 0.8, duration: 1500 },
          { to: 1.1, duration: 2000 },
          { to: 0.9, duration: 1500 },
        ],
        duration: 5000 + Math.random() * 3000,
        delay: i * 200,
        loop: true,
        easing: "easeInOutSine",
        alternate: true,
      });
    });

    return () => {
      leaves.forEach((l) => l.remove());
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 overflow-hidden"
    />
  );
}

function FeatureCard({ icon, title, description, delay }: { icon: React.ReactNode; title: string; description: string; delay: number }) {
  return (
    <div className="card-botanical p-6 paper-shadow group hover:border-[var(--sage)] transition-all duration-300">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--forest)]/10 border border-[var(--forest)]/20 mb-4 group-hover:bg-[var(--forest)]/15 group-hover:scale-110 transition-all duration-300">
        <div className="text-[var(--forest)]">{icon}</div>
      </div>
      <h3 className="text-lg font-heading font-bold text-[var(--dark-ink)] mb-2 group-hover:text-[var(--forest)] transition-colors">
        {title}
      </h3>
      <p className="text-sm text-[var(--stone)] leading-relaxed">
        {description}
      </p>
    </div>
  );
}

function StepCard({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="relative flex flex-col items-center text-center">
      <div className="relative mb-4">
        <div className="absolute inset-0 bg-[var(--forest)]/20 blur-[8px] rounded-full" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[var(--parchment)] border-4 border-[var(--faded-sage)] shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
          <span className="text-2xl font-heading font-bold text-[var(--forest)]">{number}</span>
        </div>
        <div className="absolute -right-8 top-1/2 -translate-y-1/2 hidden lg:block">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--faded-sage)" strokeWidth="1.5">
            <path d="M5 12h14m-7-7 7 7-7 7" />
          </svg>
        </div>
      </div>
      <h4 className="text-base font-heading font-bold text-[var(--dark-ink)] mb-1">{title}</h4>
      <p className="text-sm text-[var(--stone)] max-w-[200px]">{description}</p>
    </div>
  );
}

function StatCounter({ value, label }: { value: number; label: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (ref.current && value > 0) {
      const obj = { val: 0 };
      animate(obj, {
        val: value,
        round: 1,
        duration: 1500,
        easing: "easeOutExpo",
        delay: 400,
        onUpdate: () => {
          if (ref.current) ref.current.textContent = String(Math.round(obj.val));
        },
      });
    }
  }, [value]);

  return (
    <div className="text-center">
      <p className="text-4xl sm:text-5xl font-heading font-bold text-[var(--dark-ink)] embossed">
        <span ref={ref}>{value}</span>
      </p>
      <p className="text-xs uppercase tracking-wider text-[var(--stone)] font-semibold mt-2">{label}</p>
    </div>
  );
}

function TrustBadge({ text, icon }: { text: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--faded-sage)] bg-[var(--warm-cream)]/60 backdrop-blur-sm">
      <span className="text-[var(--forest)]">{icon}</span>
      <span className="text-xs font-medium text-[var(--stone)]">{text}</span>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [globalStats, setGlobalStats] = useState<{
    total_wallets: number;
    total_endorsements: number;
    total_reports: number;
  } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        if (await checkConnection()) {
          const addr = await getWalletAddress();
          if (addr) setWalletAddress(addr);
        }
      } catch {
        /* Freighter not installed */
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const stats = await viewGlobalStats();
        if (stats && typeof stats === "object") {
          setGlobalStats({
            total_wallets: Number(stats.total_wallets ?? 0),
            total_endorsements: Number(stats.total_endorsements ?? 0),
            total_reports: Number(stats.total_reports ?? 0),
          });
        }
      } catch {
        // Stats unavailable — will show zeroes
      }
    })();
  }, []);

  const handleConnect = useCallback(async () => {
    setIsConnecting(true);
    try {
      const address = await connectWallet();
      setWalletAddress(address);
      router.push("/login");
    } catch {
      // handled in Dashboard component
    } finally {
      setIsConnecting(false);
    }
  }, [router]);

  const handleDisconnect = useCallback(() => {
    setWalletAddress(null);
  }, []);

  return (
    <div className="relative flex min-h-screen flex-col bg-[var(--parchment)]">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute top-[-15%] left-[-8%] h-[500px] w-[500px] rounded-full bg-[var(--sage)]/10 blur-[100px] animate-gentle-sway" />
        <div className="absolute bottom-[-10%] right-[-5%] h-[400px] w-[400px] rounded-full bg-[var(--forest)]/8 blur-[120px] animate-gentle-sway" style={{ animationDelay: "4s" }} />
        <div className="absolute top-[30%] right-[10%] h-[300px] w-[300px] rounded-full bg-[var(--amber-sap)]/5 blur-[100px] animate-gentle-sway" style={{ animationDelay: "2s" }} />
      </div>

      <Navbar
        walletAddress={walletAddress}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        isConnecting={isConnecting}
      />

      <main className="relative z-10 flex flex-1 flex-col items-center">
        {/* Hero Section */}
        <section className="relative w-full max-w-5xl mx-auto px-6 pt-16 pb-24 text-center">
          <LeafParticles />

          <div className="animate-fade-in-up">
            <div className="mb-8 flex items-center justify-center gap-3">
              <div className="h-[1px] w-20 bg-gradient-to-r from-transparent to-[var(--faded-sage)]" />
              <div className="flex items-center gap-1 text-[var(--faded-sage)]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div className="h-[1px] w-20 bg-gradient-to-l from-transparent to-[var(--faded-sage)]" />
            </div>

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
                <span
                  className="animate-gradient-drift bg-clip-text text-transparent embossed"
                  style={{
                    backgroundImage: "linear-gradient(135deg, var(--forest), var(--sage), var(--moss), var(--forest))",
                    backgroundSize: "300% 300%",
                  }}
                >
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
            <p className="mx-auto max-w-xl text-base leading-relaxed text-[var(--stone)]/70 handwritten text-xl">
              Register, endorse, and report — immutably on the blockchain
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/login" className="btn-forest text-base px-8 py-4 cursor-pointer">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                  <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                  <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
                </svg>
                Get Started
              </Link>
              <a href="#features" className="btn-outline text-base px-8 py-4 cursor-pointer">
                Learn More
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-60">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </a>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        {globalStats && (
          <section className="w-full bg-[var(--parchment)]/50 backdrop-blur-sm border-y border-[var(--faded-sage)]/30">
            <div className="max-w-4xl mx-auto px-6 py-10">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-16">
                <StatCounter value={globalStats.total_wallets} label="Registered Wallets" />
                <div className="hidden sm:block h-12 w-px bg-[var(--faded-sage)]" />
                <StatCounter value={globalStats.total_endorsements} label="Endorsements" />
                <div className="hidden sm:block h-12 w-px bg-[var(--faded-sage)]" />
                <StatCounter value={globalStats.total_reports} label="Reports" />
              </div>
            </div>
          </section>
        )}

        {/* Features Section */}
        <section id="features" className="w-full max-w-5xl mx-auto px-6 py-20">
          <div className="text-center mb-12 animate-fade-in-up">
            <h2 className="text-3xl sm:text-4xl font-heading font-bold text-[var(--dark-ink)] embossed mb-4">
              Built for Trust
            </h2>
            <p className="text-base text-[var(--stone)] max-w-lg mx-auto">
              Everything you need to build and verify reputation on the Stellar network
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              delay={0}
              icon={
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              }
              title="Lookup"
              description="Search any wallet's reputation by ID or Stellar address. View scores, endorsements, and reports."
            />
            <FeatureCard
              delay={100}
              icon={
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <line x1="19" y1="8" x2="19" y2="14" />
                  <line x1="22" y1="11" x2="16" y2="11" />
                </svg>
              }
              title="Register"
              description="Create your on-chain identity. Your wallet address maps to a unique ID that others can reference."
            />
            <FeatureCard
              delay={200}
              icon={
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 10v12" />
                  <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
                </svg>
              }
              title="Endorse"
              description="Build trust by endorsing reliable wallets. Each endorsement adds +1 to the reputation score."
            />
            <FeatureCard
              delay={300}
              icon={
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                  <line x1="4" y1="22" x2="4" y2="15" />
                </svg>
              }
              title="Report"
              description="Flag suspicious wallets to protect the community. Each report deducts -3 from the score."
            />
          </div>
        </section>

        {/* How It Works Section */}
        <section className="w-full bg-[var(--parchment)]/30 border-y border-[var(--faded-sage)]/20">
          <div className="max-w-4xl mx-auto px-6 py-20">
            <div className="text-center mb-12 animate-fade-in-up">
              <h2 className="text-3xl sm:text-4xl font-heading font-bold text-[var(--dark-ink)] embossed mb-4">
                How It Works
              </h2>
              <p className="text-base text-[var(--stone)] max-w-lg mx-auto">
                Get started in three simple steps
              </p>
            </div>

            <div className="flex flex-col lg:flex-row items-start justify-center gap-8 lg:gap-4">
              <StepCard
                number={1}
                title="Connect Wallet"
                description="Link your Freighter wallet to access the reputation system"
              />
              <StepCard
                number={2}
                title="Register"
                description="Create your on-chain identity with a unique wallet ID"
              />
              <StepCard
                number={3}
                title="Build Reputation"
                description="Get endorsed or report others to establish trust"
              />
            </div>
          </div>
        </section>

        {/* Trust Indicators Section */}
        <section className="w-full max-w-5xl mx-auto px-6 py-16">
          <div className="card-botanical p-8 text-center paper-shadow">
            <h3 className="text-xl font-heading font-bold text-[var(--dark-ink)] embossed mb-6">
              Trusted by the Stellar Community
            </h3>
            <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
              <TrustBadge
                text="Soroban Smart Contracts"
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect width="14" height="8" x="5" y="2" rx="2" />
                    <rect width="20" height="8" x="2" y="14" rx="2" />
                    <path d="M6 18h2" />
                    <path d="M12 18h6" />
                  </svg>
                }
              />
              <TrustBadge
                text="Decentralized"
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    <path d="M2 12h20" />
                  </svg>
                }
              />
              <TrustBadge
                text="Immutable Records"
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                }
              />
              <TrustBadge
                text="Testnet Powered"
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                }
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <div className="card-botanical p-4 flex-1 max-w-sm">
                <p className="text-sm font-heading font-bold text-[var(--dark-ink)] mb-1">Score Mechanics</p>
                <div className="flex items-center justify-center gap-6 mt-3">
                  <div className="text-center">
                    <p className="text-xl font-heading font-bold text-[var(--forest)]">+1</p>
                    <p className="text-[10px] uppercase tracking-wider text-[var(--stone)]">Endorsement</p>
                  </div>
                  <div className="h-8 w-px bg-[var(--faded-sage)]" />
                  <div className="text-center">
                    <p className="text-xl font-heading font-bold text-[var(--terra)]">-3</p>
                    <p className="text-[10px] uppercase tracking-wider text-[var(--stone)]">Report</p>
                  </div>
                  <div className="h-8 w-px bg-[var(--faded-sage)]" />
                  <div className="text-center">
                    <p className="text-xl font-heading font-bold text-[var(--amber-sap)]">3:1</p>
                    <p className="text-[10px] uppercase tracking-wider text-[var(--stone)]">Neutralize</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full max-w-5xl mx-auto px-6 py-16 text-center">
          <div className="animate-fade-in-up">
            <h2 className="text-3xl sm:text-4xl font-heading font-bold text-[var(--dark-ink)] embossed mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-base text-[var(--stone)] max-w-md mx-auto mb-8">
              Connect your wallet and join the reputation network on Stellar
            </p>
            <Link href="/login" className="btn-forest text-base px-8 py-4 cursor-pointer">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
              </svg>
              Connect Your Wallet
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="w-full border-t border-[var(--faded-sage)]/30 py-12 mt-auto">
          <div className="max-w-5xl mx-auto px-6">
            <div className="flex flex-col items-center gap-5 animate-fade-in">
              <div className="flex items-center gap-5 text-[11px] text-[var(--stone)] font-mono-data">
                <span>Stellar Network</span>
                <span className="h-4 w-px bg-[var(--faded-sage)]" />
                <span>Freighter Wallet</span>
                <span className="h-4 w-px bg-[var(--faded-sage)]" />
                <span>Soroban Smart Contracts</span>
              </div>
              <p className="text-[10px] text-[var(--stone)]/50 handwritten text-base">
                Built on the Stellar blockchain — empowering trust in decentralised finance
              </p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}