"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { animate } from "animejs";
import Navbar from "@/components/Navbar";
import ReputationDashboard from "@/components/ReputationDashboard";
import OnboardingModal, { isOnboardingComplete } from "@/components/OnboardingModal";
import {
  connectWallet,
  checkConnection,
  getWalletAddress,
  viewGlobalStats,
} from "@/hooks/contract";

function StatCard({ value, label, icon }: { value: number; label: string; icon: React.ReactNode }) {
  return (
    <div className="text-center space-y-1">
      <div className="inline-flex items-center justify-center h-10 w-10 rounded-2xl bg-[var(--warm-cream)] border-2 border-[var(--faded-sage)] text-[var(--forest)] mb-2 shadow-inner">
        {icon}
      </div>
      <p className="text-2xl font-heading font-bold text-[var(--dark-ink)] embossed">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-[var(--stone)] font-semibold">{label}</p>
    </div>
  );
}

function WelcomeHeader({ address }: { address: string }) {
  const shortAddress = `${address.slice(0, 6)}…${address.slice(-4)}`;
  
  return (
    <div className="w-full max-w-2xl mb-8 animate-fade-in-up">
      <div className="card-botanical p-6 paper-shadow">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[var(--forest)] via-[var(--moss)] to-[var(--sage)] p-[2px] shadow-[0_4px_12px_rgba(75,110,72,0.25)]">
            <div className="flex h-full w-full items-center justify-center rounded-xl bg-[var(--warm-cream)]">
              <span className="text-lg font-bold text-[var(--dark-ink)] font-mono-data">
                {address.slice(0, 2)}
              </span>
            </div>
          </div>
          <div>
            <h1 className="text-xl font-heading font-bold text-[var(--dark-ink)] embossed">
              Welcome back
            </h1>
            <p className="font-mono-data text-sm text-[var(--stone)]">
              {shortAddress}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function useAnimatedValue(target: number, duration = 1500) {
  const [value, setValue] = useState(0);
  
  useEffect(() => {
    if (target <= 0) {
      setValue(target);
      return;
    }
    
    let start: number | null = null;
    let rafId: number;
    
    const animate = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) {
        rafId = requestAnimationFrame(animate);
      }
    };
    
    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [target, duration]);
  
  return value;
}

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
    <div className="grid grid-cols-3 gap-4">
      <div className="card-botanical p-4 text-center">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--warm-cream)] border-2 border-[var(--faded-sage)] text-[var(--forest)] mb-2 shadow-inner">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <p className="text-2xl font-heading font-bold text-[var(--dark-ink)] embossed">{wallets}</p>
        <p className="text-[10px] uppercase tracking-wider text-[var(--stone)] font-semibold mt-1">Wallets</p>
      </div>
      
      <div className="card-botanical p-4 text-center">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--warm-cream)] border-2 border-[var(--faded-sage)] text-[var(--forest)] mb-2 shadow-inner">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 10v12" />
            <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
          </svg>
        </div>
        <p className="text-2xl font-heading font-bold text-[var(--forest)] embossed">{endorsements}</p>
        <p className="text-[10px] uppercase tracking-wider text-[var(--stone)] font-semibold mt-1">Endorsements</p>
      </div>
      
      <div className="card-botanical p-4 text-center">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--warm-cream)] border-2 border-[var(--faded-sage)] text-[var(--terra)] mb-2 shadow-inner">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
            <line x1="4" y1="22" x2="4" y2="15" />
          </svg>
        </div>
        <p className="text-2xl font-heading font-bold text-[var(--terra)] embossed">{reports}</p>
        <p className="text-[10px] uppercase tracking-wider text-[var(--stone)] font-semibold mt-1">Reports</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [globalStats, setGlobalStats] = useState<GlobalStats>({
    total_wallets: 0,
    total_endorsements: 0,
    total_reports: 0,
  });

  useEffect(() => {
    (async () => {
      try {
        if (await checkConnection()) {
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
    try {
      setWalletAddress(await connectWallet());
    } catch { /* handled in component */ } finally {
      setIsConnecting(false);
    }
  }, []);

  const handleDisconnect = useCallback(() => {
    setWalletAddress(null);
    router.push("/");
  }, [router]);

  const handleOnboardingComplete = useCallback(() => {
    setShowOnboarding(false);
  }, []);

  if (!walletAddress) {
    return (
      <div className="relative flex min-h-screen flex-col bg-[var(--parchment)]">
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          <div className="absolute top-[-15%] left-[-8%] h-[500px] w-[500px] rounded-full bg-[var(--sage)]/10 blur-[100px] animate-gentle-sway" />
          <div className="absolute bottom-[-10%] right-[-5%] h-[400px] w-[400px] rounded-full bg-[var(--forest)]/8 blur-[120px] animate-gentle-sway" style={{ animationDelay: "4s" }} />
        </div>
        <Navbar
          walletAddress={null}
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

      {showOnboarding && (
        <OnboardingModal
          walletAddress={walletAddress}
          onComplete={handleOnboardingComplete}
        />
      )}

      <main className="relative z-10 flex flex-1 flex-col items-center px-6 py-10">
        <WelcomeHeader address={walletAddress} />
        
        <div className="w-full max-w-2xl mb-6 animate-fade-in-up">
          <QuickStats stats={globalStats} />
        </div>

        <div className="w-full max-w-2xl animate-fade-in-up-delayed">
          <ReputationDashboard
            walletAddress={walletAddress}
            onConnect={handleConnect}
            isConnecting={isConnecting}
          />
        </div>

        <footer className="mt-16 flex flex-col items-center gap-5 animate-fade-in">
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
        </footer>
      </main>
    </div>
  );
}