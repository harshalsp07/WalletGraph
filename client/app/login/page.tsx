"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DockHeader from "@/components/DockHeader";
import FloatingHeader from "@/components/FloatingHeader";
import {
  getActiveWalletProvider,
  getWalletAddress,
  getWalletProviderStatus,
  viewGlobalStats,
  type WalletProvider,
} from "@/hooks/contract";
import { WALLET_OPTIONS } from "@/lib/wallets";

function MetricPill({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl border border-[var(--faded-sage)]/80 bg-white/60 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
      <div className="text-lg font-heading font-bold text-[var(--dark-ink)]">{value}</div>
      <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--stone)]">{label}</div>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [activeProvider] = useState<WalletProvider>(() => getActiveWalletProvider());
  const [stats, setStats] = useState<{
    total_wallets: number;
    total_endorsements: number;
    total_reports: number;
  } | null>(null);

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
            total_endorsements: Number((result as Record<string, unknown>).total_endorsements ?? 0),
            total_reports: Number((result as Record<string, unknown>).total_reports ?? 0),
          });
        }
      } catch {}
    })();
  }, []);

  const walletCards = useMemo(
    () =>
      WALLET_OPTIONS.map((wallet) => {
        const providerStatus = getWalletProviderStatus(wallet.id);
        return {
          wallet,
          providerStatus,
        };
      }),
    []
  );

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[var(--parchment)]">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(75,110,72,0.14),transparent_30%),radial-gradient(circle_at_80%_15%,rgba(201,168,76,0.12),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(107,143,78,0.12),transparent_30%)]" />
        <div className="absolute left-[8%] top-[12%] h-64 w-64 rounded-full border border-white/30 bg-white/25 blur-3xl" />
        <div className="absolute bottom-[8%] right-[6%] h-80 w-80 rounded-full bg-[var(--forest)]/10 blur-[120px] animate-gentle-sway" />
        <div className="absolute left-[-8%] top-[42%] h-72 w-72 rounded-full bg-[var(--amber-sap)]/10 blur-[110px] animate-gentle-sway" style={{ animationDelay: "2s" }} />
      </div>

      <FloatingHeader />
      <DockHeader
        walletAddress={walletAddress}
        walletProvider={activeProvider}
        onConnect={() => router.push("/login")}
        onDisconnect={() => setWalletAddress(null)}
        isConnecting={false}
      />

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-20 sm:px-6">
        <section className="w-full max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="relative overflow-hidden rounded-[32px] border border-white/50 bg-[linear-gradient(155deg,rgba(250,249,246,0.9),rgba(242,240,239,0.78))] p-7 shadow-[0_24px_80px_rgba(44,44,43,0.12),inset_0_1px_0_rgba(255,255,255,0.7)] sm:p-10">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--forest)]/45 to-transparent" />
              <div className="absolute -right-16 top-8 h-40 w-40 rounded-full blur-3xl" style={{ background: "rgba(75,110,72,0.14)" }} />
              <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full blur-3xl" style={{ background: "rgba(201,168,76,0.14)" }} />

              <div className="relative">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--faded-sage)]/90 bg-white/70 px-4 py-2 text-[11px] uppercase tracking-[0.24em] text-[var(--forest)]">
                  Wallet Access Hub
                </div>
                <h1 className="max-w-2xl text-4xl font-heading font-bold leading-tight text-[var(--dark-ink)] sm:text-5xl">
                  Connect with the wallet you already use, not just one default route.
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--stone)] sm:text-lg">
                  WalletGraph now routes login by provider, so Freighter, Rabet, xBull, and future wallets can each have a tailored flow with clearer install guidance, capability checks, and better recovery states.
                </p>

                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                  <MetricPill value={walletCards.filter(({ providerStatus }) => providerStatus.available).length} label="Detected locally" />
                  <MetricPill value={walletCards.filter(({ wallet }) => wallet.capability !== "coming_soon").length} label="Ready routes" />
                  <MetricPill value={walletCards.filter(({ providerStatus }) => providerStatus.canSign).length} label="Sign-capable" />
                </div>

                {stats && (
                  <div className="mt-8 rounded-[28px] border border-[var(--faded-sage)]/80 bg-white/55 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                    <div className="flex items-center justify-between gap-4 border-b border-[var(--faded-sage)]/70 pb-4">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--stone)]">Network pulse</p>
                        <p className="mt-1 text-xl font-heading font-bold text-[var(--dark-ink)]">Live WalletGraph activity</p>
                      </div>
                      <div className="rounded-full border border-[var(--forest)]/20 bg-[var(--forest)]/8 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[var(--forest)]">
                        Testnet
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <MetricPill value={stats.total_wallets} label="Registered wallets" />
                      <MetricPill value={stats.total_endorsements} label="Endorsements" />
                      <MetricPill value={stats.total_reports} label="Reports" />
                    </div>
                  </div>
                )}

                <div className="mt-8 flex flex-wrap gap-3 text-sm text-[var(--stone)]">
                  <span className="rounded-full border border-[var(--faded-sage)] bg-white/60 px-4 py-2">Provider-specific routes</span>
                  <span className="rounded-full border border-[var(--faded-sage)] bg-white/60 px-4 py-2">Install hints</span>
                  <span className="rounded-full border border-[var(--faded-sage)] bg-white/60 px-4 py-2">Safer wallet fallbacks</span>
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              {walletCards.map(({ wallet, providerStatus }, index) => {
                const isActive = activeProvider === wallet.id;
                const isSoon = wallet.capability === "coming_soon";

                return (
                  <Link
                    key={wallet.id}
                    href={`/login/${wallet.id}`}
                    className="group relative overflow-hidden rounded-[28px] border border-[var(--faded-sage)]/80 bg-[var(--warm-cream)]/80 p-6 shadow-[0_18px_50px_rgba(44,44,43,0.08),inset_0_1px_0_rgba(255,255,255,0.75)] transition-all duration-300 hover:-translate-y-1 hover:border-[var(--sage)] hover:shadow-[0_28px_60px_rgba(44,44,43,0.12)]"
                    style={{ animationDelay: `${index * 90}ms` }}
                  >
                    <div className="absolute inset-0 opacity-80" style={{ background: wallet.gradient }} />
                    <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full blur-3xl" style={{ background: wallet.accentSoft }} />

                    <div className="relative z-10">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div
                            className="flex h-14 w-14 items-center justify-center rounded-[18px] border border-white/55 bg-white/65 font-mono-data text-sm font-bold text-[var(--dark-ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]"
                          >
                            {wallet.icon}
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--stone)]">{wallet.subtitle}</p>
                            <h2 className="mt-1 text-2xl font-heading font-bold text-[var(--dark-ink)]">{wallet.name}</h2>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <span
                            className="rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.2em]"
                            style={{
                              borderColor: isSoon ? "rgba(137,137,137,0.25)" : "rgba(75,110,72,0.2)",
                              background: isSoon ? "rgba(137,137,137,0.08)" : "rgba(75,110,72,0.08)",
                              color: isSoon ? "var(--stone)" : "var(--forest)",
                            }}
                          >
                            {wallet.supportLabel}
                          </span>
                          {isActive && (
                            <span className="rounded-full border border-[var(--amber-sap)]/25 bg-[var(--amber-sap)]/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[var(--terra)]">
                              Active last time
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="mt-4 text-sm leading-6 text-[var(--stone)]">{wallet.description}</p>

                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-white/60 bg-white/50 p-4">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--stone)]">Capability</p>
                          <p className="mt-2 text-sm font-semibold text-[var(--dark-ink)]">{wallet.signSupportLabel}</p>
                          <p className="mt-2 text-xs leading-5 text-[var(--stone)]">{wallet.helperText}</p>
                        </div>

                        <div className="rounded-2xl border border-white/60 bg-white/50 p-4">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--stone)]">Local status</p>
                          <p className="mt-2 text-sm font-semibold text-[var(--dark-ink)]">{providerStatus.label}</p>
                          <p className="mt-2 text-xs leading-5 text-[var(--stone)]">{providerStatus.message}</p>
                        </div>
                      </div>

                      <div className="mt-5 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[var(--stone)]">
                          <span className={`h-2.5 w-2.5 rounded-full ${providerStatus.available ? "bg-[var(--forest)]" : isSoon ? "bg-[var(--stone)]" : "bg-[var(--terra)]"}`} />
                          {providerStatus.available ? "Detected" : isSoon ? "Planned" : "Not detected"}
                        </div>
                        <span className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--dark-ink)]">
                          Open route
                          <svg className="transition-transform group-hover:translate-x-1" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M5 12h14" />
                            <path d="m12 5 7 7-7 7" />
                          </svg>
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
