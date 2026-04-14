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
  type WalletProvider,
} from "@/hooks/contract";
import { WALLET_OPTIONS } from "@/lib/wallets";

export default function LoginPage() {
  const router = useRouter();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [activeProvider] = useState<WalletProvider>(() => getActiveWalletProvider());

  useEffect(() => {
    (async () => {
      const address = await getWalletAddress();
      setWalletAddress(address);
    })();
  }, []);

  const walletCards = useMemo(
    () =>
      WALLET_OPTIONS.map((wallet) => {
        const providerStatus = getWalletProviderStatus(wallet.id);
        return { wallet, providerStatus };
      }),
    []
  );

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[var(--parchment)]">
      {/* Background ambience */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(75,110,72,0.12),transparent_40%),radial-gradient(circle_at_70%_80%,rgba(201,168,76,0.08),transparent_35%)]" />
        <div className="absolute left-[10%] top-[15%] h-72 w-72 rounded-full bg-white/20 blur-3xl" />
        <div className="absolute bottom-[10%] right-[8%] h-64 w-64 rounded-full bg-[var(--forest)]/8 blur-[100px] animate-gentle-sway" />
      </div>

      <FloatingHeader />
      <DockHeader
        walletAddress={walletAddress}
        walletProvider={activeProvider}
        onConnect={() => router.push("/login")}
        onDisconnect={() => setWalletAddress(null)}
        isConnecting={false}
      />

      <main className="relative z-10 flex flex-1 items-center justify-center px-3 sm:px-6 py-16 sm:py-20">
        <section className="w-full max-w-lg">
          {/* Hero */}
          <div className="mb-10 text-center animate-fade-in-up">
            <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--faded-sage)]/80 bg-white/60 px-4 py-2 text-[10px] uppercase tracking-[0.22em] text-[var(--forest)] backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--forest)] animate-pulse" />
              Stellar Network
            </div>
            <h1 className="text-3xl font-heading font-bold leading-tight text-[var(--dark-ink)] sm:text-4xl">
              Connect your wallet
            </h1>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-[var(--stone)]">
              Choose a wallet provider to sign in and access your reputation dashboard.
            </p>
          </div>

          {/* Wallet Cards */}
          <div className="space-y-3 animate-fade-in-up-delayed">
            {walletCards.map(({ wallet, providerStatus }, index) => {
              const isActive = activeProvider === wallet.id;
              const isSoon = wallet.capability === "coming_soon";

              return (
                <Link
                  key={wallet.id}
                  href={`/login/${wallet.id}`}
                  className={`group relative flex items-center gap-4 rounded-2xl border px-5 py-4 transition-all duration-300 hover:-translate-y-0.5 ${
                    isSoon
                      ? "border-[var(--faded-sage)]/60 bg-white/40 opacity-60 pointer-events-none"
                      : "border-[var(--faded-sage)]/80 bg-white/70 hover:border-[var(--sage)] hover:bg-white/90 hover:shadow-[0_12px_32px_rgba(44,44,43,0.08)]"
                  } ${isActive ? "ring-2 ring-[var(--forest)]/20" : ""}`}
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  {/* Icon */}
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/50 font-mono-data text-sm font-bold text-[var(--dark-ink)] shadow-sm"
                    style={{ background: wallet.accentSoft }}
                  >
                    {wallet.icon}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-heading font-bold text-[var(--dark-ink)]">
                        {wallet.name}
                      </h2>
                      {wallet.supportLabel === "Recommended" && (
                        <span className="rounded-full bg-[var(--forest)]/10 px-2 py-0.5 text-[9px] uppercase tracking-[0.16em] font-semibold text-[var(--forest)]">
                          Recommended
                        </span>
                      )}
                      {isActive && (
                        <span className="rounded-full bg-[var(--amber-sap)]/12 px-2 py-0.5 text-[9px] uppercase tracking-[0.16em] font-semibold text-[var(--terra)]">
                          Last used
                        </span>
                      )}
                      {isSoon && (
                        <span className="rounded-full bg-[var(--stone)]/10 px-2 py-0.5 text-[9px] uppercase tracking-[0.16em] font-semibold text-[var(--stone)]">
                          Coming soon
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-[var(--stone)] truncate">
                      {wallet.description}
                    </p>
                  </div>

                  {/* Status + Arrow */}
                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        providerStatus.available
                          ? "bg-[var(--forest)]"
                          : isSoon
                            ? "bg-[var(--stone)]/40"
                            : "bg-[var(--terra)]"
                      }`}
                    />
                    {!isSoon && (
                      <svg
                        className="text-[var(--stone)] transition-transform group-hover:translate-x-1 group-hover:text-[var(--dark-ink)]"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M5 12h14" />
                        <path d="m12 5 7 7-7 7" />
                      </svg>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Footer hint */}
          <p className="mt-6 text-center text-[11px] text-[var(--stone)]/70 animate-fade-in">
            Your wallet extension handles authentication — WalletGraph never sees your private keys.
          </p>
        </section>
      </main>
    </div>
  );
}
