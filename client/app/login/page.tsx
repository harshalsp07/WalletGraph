"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DockHeader from "@/components/DockHeader";
import FloatingHeader from "@/components/FloatingHeader";
import { WALLET_OPTIONS } from "@/lib/wallets";
import { getWalletAddress, viewGlobalStats } from "@/hooks/contract";

export default function LoginPage() {
  const router = useRouter();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [stats, setStats] = useState<{ total_wallets: number } | null>(null);

  useEffect(() => {
    (async () => {
      const address = await getWalletAddress();
      setWalletAddress(address);
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
      } catch {}
    })();
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
        onConnect={() => router.push("/login/freighter")}
        onDisconnect={() => setWalletAddress(null)}
        isConnecting={false}
      />

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-20">
        <section className="w-full max-w-5xl">
          <div className="mb-10 text-center">
            <p className="mx-auto mb-4 inline-flex rounded-full border border-[var(--faded-sage)] bg-[var(--warm-cream)] px-4 py-1 text-xs uppercase tracking-[0.18em] text-[var(--forest)]">
              Multi-Wallet Login
            </p>
            <h1 className="text-4xl font-heading font-bold text-[var(--dark-ink)] embossed sm:text-5xl">
              Choose your wallet to sign in
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed text-[var(--stone)]">
              WalletGraph now supports a provider-based login route so you can onboard with different wallets while keeping one robust contract registration flow.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {WALLET_OPTIONS.map((wallet) => (
              <Link
                key={wallet.id}
                href={`/login/${wallet.id}`}
                className="group relative overflow-hidden rounded-2xl border border-[var(--faded-sage)] bg-[var(--warm-cream)] p-6 shadow-[0_12px_30px_rgba(44,44,43,0.08)] transition-all duration-300 hover:-translate-y-1 hover:border-[var(--sage)] hover:shadow-[0_18px_40px_rgba(44,44,43,0.12)]"
              >
                <div
                  className="absolute -right-10 -top-10 h-28 w-28 rounded-full blur-2xl"
                  style={{ backgroundColor: wallet.accent, opacity: 0.15 }}
                />
                <div className="relative z-10">
                  <div className="mb-4 inline-flex rounded-full border border-[var(--faded-sage)] bg-white/70 px-3 py-1 text-[10px] uppercase tracking-wider text-[var(--stone)]">
                    {wallet.subtitle}
                  </div>
                  <h2 className="text-2xl font-heading font-bold text-[var(--dark-ink)]">
                    {wallet.name}
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--stone)]">
                    {wallet.description}
                  </p>
                  <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--forest)]">
                    Continue
                    <svg className="transition-transform group-hover:translate-x-1" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {stats && stats.total_wallets > 0 && (
            <div className="mt-8 text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--faded-sage)] bg-[var(--warm-cream)] px-4 py-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--forest)] opacity-50" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--forest)]" />
                </span>
                <span className="text-xs font-mono-data text-[var(--stone)]">
                  <span className="font-semibold text-[var(--forest)]">{stats.total_wallets}</span> wallets already registered
                </span>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}