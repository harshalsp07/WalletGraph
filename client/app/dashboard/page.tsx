"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { animate, utils } from "animejs";
import { useRouter } from "next/navigation";
import DockHeader from "@/components/DockHeader";
import FloatingHeader from "@/components/FloatingHeader";
import ReputationDashboard from "@/components/ReputationDashboard";
import { BalanceOverview, PaymentPanel } from "@/components/WalletCockpit";
import OnboardingModal, { isOnboardingComplete } from "@/components/OnboardingModal";
import {
  checkConnection,
  getActiveWalletProvider,
  getWalletAddress,
  viewGlobalStats,
  getWalletIdByAddress,
  viewWalletReputation,
  type WalletProvider,
} from "@/hooks/contract";

import ShareProfileCard from "@/components/ShareProfileCard";

// ── Welcome Header ──────────────────────────────────────────

function WelcomeHeader({ address }: { address: string }) {
  const shortAddress = `${address.slice(0, 6)}…${address.slice(-4)}`;
  
  return (
    <div className="mb-6 animate-fade-in-up">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[var(--forest)] via-[var(--moss)] to-[var(--sage)] p-[2px] shadow-[0_6px_20px_rgba(75,110,72,0.28)] ring-1 ring-white/40">
          <div className="flex h-full w-full items-center justify-center rounded-xl bg-[var(--warm-cream)]">
            <span className="text-lg font-bold text-[var(--dark-ink)] font-mono-data">
              {address.slice(0, 2)}
            </span>
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-heading font-bold text-[var(--dark-ink)] tracking-tight">
            Welcome back
          </h1>
          <p className="font-mono-data text-sm text-[var(--stone)]">
            {shortAddress}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Animated Counter ────────────────────────────────────────

function useAnimatedValue(target: number, duration = 1500) {
  const [value, setValue] = useState(target <= 0 ? target : 0);
  
  useEffect(() => {
    let rafId: number;
    if (target <= 0) {
      rafId = requestAnimationFrame(() => setValue(target));
      return () => cancelAnimationFrame(rafId);
    }
    let start: number | null = null;
    const tick = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [target, duration]);
  
  return value;
}

// ── Quick Stats ─────────────────────────────────────────────

interface GlobalStats {
  total_wallets: number;
  total_endorsements: number;
  total_reports: number;
}

function QuickStats({ stats }: { stats: GlobalStats }) {
  const wallets = useAnimatedValue(stats.total_wallets);
  const endorsements = useAnimatedValue(stats.total_endorsements);
  const reports = useAnimatedValue(stats.total_reports);
  
  return (
    <div className="grid grid-cols-3 gap-3 mb-6 animate-fade-in-up-delayed">
      <div className="card-botanical shadow-paper-lg p-4 text-center transition-all duration-300 hover:-translate-y-0.5 cursor-default relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--faded-sage)] to-transparent opacity-80 pointer-events-none" />
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--warm-cream)] border border-[var(--faded-sage)] text-[var(--forest)] mb-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <p className="text-xl font-heading font-bold text-[var(--dark-ink)]">{wallets}</p>
        <p className="text-[9px] uppercase tracking-wider text-[var(--stone)] font-semibold mt-1">Wallets</p>
      </div>
      
      <div className="card-botanical shadow-paper-lg p-4 text-center transition-all duration-300 hover:-translate-y-0.5 cursor-default relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--moss)]/40 to-transparent opacity-90 pointer-events-none" />
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--warm-cream)] border border-[var(--faded-sage)] text-[var(--forest)] mb-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 10v12" />
            <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
          </svg>
        </div>
        <p className="text-xl font-heading font-bold text-[var(--forest)]">{endorsements}</p>
        <p className="text-[9px] uppercase tracking-wider text-[var(--stone)] font-semibold mt-1">Endorsements</p>
      </div>
      
      <div className="card-botanical shadow-paper-lg p-4 text-center transition-all duration-300 hover:-translate-y-0.5 cursor-default relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--terra)]/35 to-transparent opacity-90 pointer-events-none" />
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--warm-cream)] border border-[var(--faded-sage)] text-[var(--terra)] mb-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
            <line x1="4" y1="22" x2="4" y2="15" />
          </svg>
        </div>
        <p className="text-xl font-heading font-bold text-[var(--terra)]">{reports}</p>
        <p className="text-[9px] uppercase tracking-wider text-[var(--stone)] font-semibold mt-1">Reports</p>
      </div>
    </div>
  );
}

// ── Particle Field ──────────────────────────────────────────

function ParticleField() {
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!containerRef.current) return;
    const c = containerRef.current;
    const els: HTMLElement[] = [];
    const leafColors = ["#4B6E48", "#6B8F4E", "#B2AC88", "#D4D0BC", "#5a7a45"];

    for (let i = 0; i < 15; i++) {
      const el = document.createElement("div");
      el.className = "tree-leaf";
      el.style.background = leafColors[i % leafColors.length];
      el.style.position = "absolute";
      el.style.borderRadius = "50%";
      el.style.left = `${Math.random() * 100}%`;
      el.style.top = `${Math.random() * 100}%`;
      const s = 4 + Math.random() * 6;
      el.style.width = `${s}px`; el.style.height = `${s}px`;
      el.style.opacity = "0.05";
      el.style.pointerEvents = "none";
      c.appendChild(el); els.push(el);
      animate(el, {
        translateX: () => utils.random(-50, 50),
        translateY: () => utils.random(-70, 30),
        rotate: () => utils.random(-180, 180),
        opacity: [{ to: 0.03 }, { to: 0.1 }, { to: 0.03 }],
        scale: [{ to: 0.8 }, { to: 1.2 }, { to: 0.8 }],
        duration: 8000 + Math.random() * 4000,
        delay: i * 300,
        loop: true, easing: "easeInOutSine", alternate: true,
      });
    }

    return () => els.forEach(e => e.remove());
  }, []);

  return <div ref={containerRef} className="pointer-events-none absolute inset-0 overflow-hidden" />;
}

// ── Dashboard Tabs ──────────────────────────────────────────

type DashboardTab = "overview" | "reputation" | "payments";

const dashboardTabs: { key: DashboardTab; label: string; icon: React.ReactNode }[] = [
  {
    key: "overview",
    label: "Overview",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="7" height="9" x="3" y="3" rx="1" />
        <rect width="7" height="5" x="14" y="3" rx="1" />
        <rect width="7" height="9" x="14" y="12" rx="1" />
        <rect width="7" height="5" x="3" y="16" rx="1" />
      </svg>
    ),
  },
  {
    key: "reputation",
    label: "Reputation",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
  },
  {
    key: "payments",
    label: "Payments",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 2 11 13" />
        <path d="m22 2-7 20-4-9-9-4Z" />
      </svg>
    ),
  },
];

// ── Main Dashboard ──────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletProvider, setWalletProvider] = useState<WalletProvider | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [globalStats, setGlobalStats] = useState<GlobalStats>({
    total_wallets: 0,
    total_endorsements: 0,
    total_reports: 0,
  });
  const [walletId, setWalletId] = useState<number | null>(null);
  const [userReputation, setUserReputation] = useState<{
    score: number;
    endorsement_count: number;
  } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        if (await checkConnection()) {
          setWalletProvider(getActiveWalletProvider());
          const addr = await getWalletAddress();
          if (addr) {
            setWalletAddress(addr);
            if (!isOnboardingComplete()) {
              setShowOnboarding(true);
            }
          } else {
            router.push("/login");
          }
        } else {
          router.push("/login");
        }
      } catch {
        router.push("/login");
      }
    })();
  }, [router]);

  useEffect(() => {
    (async () => {
      try {
        const stats = await viewGlobalStats();
        if (stats && typeof stats === "object") {
          const s = stats as Record<string, unknown>;
          setGlobalStats({
            total_wallets: Number(s.total_wallets ?? 0),
            total_endorsements: Number(s.total_endorsements ?? 0),
            total_reports: Number(s.total_reports ?? 0),
          });
        }
      } catch { /* Stats unavailable */ }
    })();
  }, []);

  const handleConnect = useCallback(async () => {
    setIsConnecting(true);
    router.push("/login");
  }, [router]);

  const handleDisconnect = useCallback(() => {
    setWalletAddress(null);
    setWalletProvider(null);
    router.push("/");
  }, [router]);

  const handleOnboardingComplete = useCallback(() => {
    setShowOnboarding(false);
  }, []);

  useEffect(() => {
    (async () => {
      if (walletAddress) {
        try {
          const id = await getWalletIdByAddress(walletAddress);
          if (id && typeof id === "object" && "value" in id) {
            const numericId = Number((id as { value: bigint }).value);
            setWalletId(numericId);
            const rep = await viewWalletReputation(numericId);
            if (rep && typeof rep === "object") {
              const r = rep as Record<string, unknown>;
              setUserReputation({
                score: Number(r.score ?? 0),
                endorsement_count: Number(r.endorsement_count ?? 0),
              });
            }
          }
        } catch { /* Ignore */ }
      }
    })();
  }, [walletAddress]);

  if (!walletAddress) {
    return (
      <div className="relative flex min-h-screen flex-col bg-[var(--parchment)]">
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          <div className="absolute top-[-15%] left-[-8%] h-[500px] w-[500px] rounded-full bg-[var(--sage)]/10 blur-[100px] animate-gentle-sway" />
          <div className="absolute bottom-[-10%] right-[-5%] h-[400px] w-[400px] rounded-full bg-[var(--forest)]/8 blur-[120px] animate-gentle-sway" style={{ animationDelay: "4s" }} />
        </div>
        <FloatingHeader />
        <DockHeader
          walletAddress={null}
          walletProvider={walletProvider}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
          isConnecting={isConnecting}
        />
        <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-20">
          <div className="flex items-center gap-3 animate-fade-in">
            <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--forest)" strokeWidth="2.5">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            <span className="text-[var(--forest)] font-medium">Loading dashboard…</span>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-[var(--parchment)]">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute top-[-15%] left-[-8%] h-[500px] w-[500px] rounded-full bg-[var(--sage)]/10 blur-[100px] animate-gentle-sway" />
        <div className="absolute bottom-[-10%] right-[-5%] h-[400px] w-[400px] rounded-full bg-[var(--forest)]/8 blur-[120px] animate-gentle-sway" style={{ animationDelay: "4s" }} />
        <div className="absolute top-[30%] right-[10%] h-[300px] w-[300px] rounded-full bg-[var(--amber-sap)]/5 blur-[100px] animate-gentle-sway" style={{ animationDelay: "2s" }} />
        <ParticleField />
      </div>

      <FloatingHeader />
      <DockHeader
        walletAddress={walletAddress}
        walletProvider={walletProvider}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        isConnecting={isConnecting}
      />

      {showOnboarding && (
        <OnboardingModal
          walletAddress={walletAddress}
          onComplete={handleOnboardingComplete}
        />
      )}

      <main className="relative z-10 flex flex-1 flex-col items-center px-4 sm:px-6 py-10">
        <div className="w-full max-w-4xl">
          <WelcomeHeader address={walletAddress} />
          
          {walletId && userReputation && (
            <div className="mb-6 animate-fade-in-up-delayed">
              <ShareProfileCard
                walletId={walletId}
                walletAddress={walletAddress ?? undefined}
                score={userReputation.score}
                endorsements={userReputation.endorsement_count}
              />
            </div>
          )}
          
          <QuickStats stats={globalStats} />

          {/* Dashboard Tab Bar */}
          <div className="mb-6 animate-fade-in-up-delayed-2">
            <div className="flex gap-2 rounded-2xl border border-[var(--faded-sage)]/80 bg-white/60 p-1.5 backdrop-blur-sm shadow-sm">
              {dashboardTabs.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-2 flex-1 justify-center rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-300 cursor-pointer ${
                      isActive
                        ? "bg-[var(--forest)] text-white shadow-[0_4px_16px_rgba(75,110,72,0.3)]"
                        : "text-[var(--stone)] hover:text-[var(--dark-ink)] hover:bg-white/60"
                    }`}
                  >
                    <span className={isActive ? "text-white/90" : "text-[var(--stone)]"}>{tab.icon}</span>
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content */}
          <div className="animate-fade-in-up-delayed-2">
            {activeTab === "overview" && (
              <BalanceOverview walletAddress={walletAddress} />
            )}

            {activeTab === "reputation" && (
              <ReputationDashboard
                walletAddress={walletAddress}
                onConnect={handleConnect}
                isConnecting={isConnecting}
              />
            )}

            {activeTab === "payments" && (
              <PaymentPanel walletAddress={walletAddress} />
            )}
          </div>

          {/* Footer */}
          <footer className="mt-16 flex flex-col items-center gap-4 animate-fade-in">
            <div className="flex items-center gap-4 text-[11px] text-[var(--stone)] font-mono-data">
              <span>Stellar Network</span>
              <span className="h-4 w-px bg-[var(--faded-sage)]" />
              <span>{walletProvider ? `${walletProvider} wallet` : "Multi-wallet login"}</span>
              <span className="h-4 w-px bg-[var(--faded-sage)]" />
              <span>Soroban Smart Contracts</span>
            </div>
            <p className="text-[10px] text-[var(--stone)]/50 handwritten text-base">
              Built on the Stellar blockchain — empowering trust in decentralised finance
            </p>
            <div className="flex items-center gap-4 mt-2">
              <a 
                href="https://docs.google.com/spreadsheets/d/1LeWtIn1Gc0lEMhISqLlrBRDt4y3MR1yQUj78Vfv5K_0/edit?usp=sharing" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[10px] text-[var(--forest)] hover:text-[var(--moss)] transition-colors flex items-center gap-1"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
                Response Data
              </a>
              <a 
                href="https://forms.gle/PwVY4yJUobUFv7ig9" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[10px] text-[var(--amber-sap)] hover:text-[#D4A84C] transition-colors flex items-center gap-1"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                Rate Website
              </a>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}
