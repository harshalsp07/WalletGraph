"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { animate } from "animejs";
import DockHeader from "@/components/DockHeader";
import FloatingHeader from "@/components/FloatingHeader";
import {
  connectWallet,
  checkConnection,
  getWalletAddress,
  getWalletIdByAddress,
  registerWallet,
  viewGlobalStats,
} from "@/hooks/contract";

type FlowState = "idle" | "connecting" | "registering" | "success" | "error";

function ConfettiPiece({ delay }: { delay: number }) {
  return (
    <div
      className="absolute w-2 h-2 rounded-full"
      style={{
        background: ["var(--forest)", "var(--sage)", "var(--amber-sap)", "var(--moss)"][Math.floor(Math.random() * 4)],
        left: `${Math.random() * 100}%`,
        animation: `confetti-fall ${2 + Math.random()}s ease-out ${delay}s forwards`,
      }}
    />
  );
}

function WalletIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  );
}

function StellarIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2v20M2 12h20" />
      <path d="M12 2a10 10 0 0 1 4 8 10 10 0 0 1-4 8 10 10 0 0 1-4-8 10 10 0 0 1 4-8" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [flowState, setFlowState] = useState<FlowState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [registeredId, setRegisteredId] = useState<number | null>(null);
  const [stats, setStats] = useState<{ total_wallets: number } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        if (await checkConnection()) {
          const addr = await getWalletAddress();
          if (addr) {
            setWalletAddress(addr);
            setFlowState("success");
            setShowConfetti(true);
          }
        }
      } catch { /* Freighter not installed */ }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const result = await viewGlobalStats();
        if (result && typeof result === "object") {
          setStats({
            total_wallets: Number((result as Record<string, unknown>).total_wallets ?? 0),
          });
        }
      } catch { /* Stats unavailable */ }
    })();
  }, []);

  const handleConnect = useCallback(async () => {
    setFlowState("connecting");
    setError(null);
    try {
      const address = await connectWallet();
      setWalletAddress(address);

      setFlowState("registering");

      let walletId: number | null = null;
      const existingResult = await getWalletIdByAddress(address, address);
      if (existingResult && typeof existingResult === "object" && "value" in existingResult) {
        walletId = Number((existingResult as Record<string, unknown>).value);
      } else if (typeof existingResult === "number") {
        walletId = existingResult;
      }

      if (!walletId || walletId === 0) {
        await registerWallet(address);
        const newResult = await getWalletIdByAddress(address, address);
        if (newResult && typeof newResult === "object" && "value" in newResult) {
          walletId = Number((newResult as Record<string, unknown>).value);
        } else if (typeof newResult === "number") {
          walletId = newResult;
        }
      }

      setRegisteredId(walletId);
      setFlowState("success");
      setShowConfetti(true);

      setTimeout(() => {
        router.push("/dashboard");
      }, 2500);
    } catch (err) {
      setFlowState("error");
      setError(err instanceof Error ? err.message : "Connection failed");
    }
  }, [router]);

  const handleDisconnect = useCallback(() => {
    setWalletAddress(null);
    setFlowState("idle");
    setShowConfetti(false);
    setRegisteredId(null);
  }, []);

  return (
    <div className="relative flex min-h-screen flex-col bg-[var(--parchment)]">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute top-[-15%] left-[-8%] h-[500px] w-[500px] rounded-full bg-[var(--sage)]/10 blur-[100px] animate-gentle-sway" />
        <div className="absolute bottom-[-10%] right-[-5%] h-[400px] w-[400px] rounded-full bg-[var(--forest)]/8 blur-[120px] animate-gentle-sway" style={{ animationDelay: "4s" }} />
        <div className="absolute top-[30%] right-[10%] h-[300px] w-[300px] rounded-full bg-[var(--amber-sap)]/5 blur-[100px] animate-gentle-sway" style={{ animationDelay: "2s" }} />
      </div>

      <FloatingHeader />
      <DockHeader
        walletAddress={walletAddress}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        isConnecting={flowState === "connecting"}
      />

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-20">
        <div className="w-full max-w-md animate-fade-in-up">
          <div className="card-botanical p-8 paper-shadow">
            {showConfetti && (
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                {Array.from({ length: 30 }).map((_, i) => (
                  <ConfettiPiece key={i} delay={i * 0.05} />
                ))}
              </div>
            )}

            <div className="text-center mb-8">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--forest)]/10 border-2 border-[var(--forest)]/20 mb-4">
                <WalletIcon />
              </div>
              <h1 className="text-3xl font-heading font-bold text-[var(--dark-ink)] embossed mb-2">
                {flowState === "success" ? "Welcome!" : "Connect Your Wallet"}
              </h1>
              <p className="text-sm text-[var(--stone)] leading-relaxed">
                {flowState === "success"
                  ? "Your wallet is connected and registered."
                  : flowState === "registering"
                  ? "Registering your wallet on-chain..."
                  : "Connect with Freighter to access the reputation system"}
              </p>
            </div>

            {error && (
              <div className="mb-6 rounded-xl border border-[var(--terra)]/20 bg-[var(--terra)]/5 p-4 text-center animate-slide-down">
                <p className="text-sm text-[var(--terra)] font-medium">{error}</p>
              </div>
            )}

            {flowState === "idle" && (
              <div className="space-y-4">
                <button
                  onClick={handleConnect}
                  className="btn-forest w-full text-base py-4 cursor-pointer"
                >
                  <WalletIcon />
                  Connect with Freighter
                </button>

                <div className="flex items-center gap-4 py-2">
                  <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-[var(--faded-sage)]" />
                  <span className="text-xs text-[var(--stone)] uppercase tracking-wider">or</span>
                  <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-[var(--faded-sage)]" />
                </div>

                <button
                  onClick={() => router.push("/")}
                  className="btn-outline w-full cursor-pointer"
                >
                  Learn More
                </button>
              </div>
            )}

            {flowState === "connecting" && (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-3 py-4">
                  <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--forest)" strokeWidth="2.5">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  <span className="text-[var(--forest)] font-medium">Connecting to Freighter…</span>
                </div>
                <div className="rounded-xl bg-[var(--parchment)] border border-[var(--faded-sage)] p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-[var(--forest)]/10 flex items-center justify-center">
                      <StellarIcon />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--dark-ink)]">Stellar Network</p>
                      <p className="text-xs text-[var(--stone)]">Testnet · Soroban</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {flowState === "registering" && (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-3 py-4">
                  <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--amber-sap)" strokeWidth="2.5">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  <span className="text-[var(--amber-sap)] font-medium">Registering on-chain…</span>
                </div>
                <div className="rounded-xl bg-[var(--forest)]/5 border border-[var(--forest)]/20 p-4 animate-fade-in-up">
                  <p className="text-sm text-[var(--dark-ink)]/80 leading-relaxed">
                    Creating your reputation identity on the Stellar blockchain. This is a one-time registration.
                  </p>
                </div>
              </div>
            )}

            {flowState === "success" && (
              <div className="space-y-4">
                <div className="flex items-center justify-center py-4 animate-fade-in">
                  <div className="relative">
                    <div className="absolute inset-0 bg-[var(--forest)]/20 blur-[12px] rounded-full" />
                    <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[var(--forest)] text-white">
                      <CheckCircleIcon />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-[var(--forest)]/5 border border-[var(--forest)]/20 p-4 animate-fade-in-up">
                  {walletAddress && (
                    <div className="mb-3 text-center">
                      <p className="text-[10px] uppercase tracking-wider text-[var(--stone)] mb-1">Connected Wallet</p>
                      <p className="font-mono-data text-sm text-[var(--dark-ink)] break-all">
                        {walletAddress}
                      </p>
                    </div>
                  )}
                  {registeredId && (
                    <div className="text-center pt-3 border-t border-[var(--forest)]/10">
                      <p className="text-[10px] uppercase tracking-wider text-[var(--stone)] mb-1">Your Wallet ID</p>
                      <p className="text-2xl font-heading font-bold text-[var(--forest)]">{registeredId}</p>
                    </div>
                  )}
                </div>

                <div className="text-center animate-fade-in-up-delayed">
                  <p className="text-sm text-[var(--stone)]">
                    Redirecting to dashboard…
                  </p>
                </div>
              </div>
            )}

            {flowState === "error" && (
              <div className="space-y-4">
                <button
                  onClick={() => setFlowState("idle")}
                  className="btn-forest w-full cursor-pointer"
                >
                  Try Again
                </button>
                <button
                  onClick={() => router.push("/")}
                  className="btn-outline w-full cursor-pointer"
                >
                  Back to Home
                </button>
              </div>
            )}
          </div>

          {stats && stats.total_wallets > 0 && flowState === "idle" && (
            <div className="mt-6 text-center animate-fade-in-up-delayed">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--faded-sage)] bg-[var(--warm-cream)] px-4 py-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--forest)] opacity-50" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--forest)]" />
                </span>
                <span className="text-xs font-mono-data text-[var(--stone)]">
                  <span className="font-semibold text-[var(--forest)]">{stats.total_wallets}</span> wallets registered
                </span>
              </div>
            </div>
          )}
        </div>
      </main>

      <style jsx>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(400px) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}