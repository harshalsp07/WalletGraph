"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import FloatingHeader from "@/components/FloatingHeader";
import DockHeader from "@/components/DockHeader";
import {
  getActiveWalletProvider,
  getWalletIdByAddress,
  registerWallet,
} from "@/hooks/contract";
import { getWalletOption } from "@/lib/wallets";

const LobstrConnect = dynamic(
  () => import("@/components/lobstr/LobstrConnect"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--forest)]/30 border-t-[var(--forest)]" />
      </div>
    ),
  }
);

type FlowState = "idle" | "connecting" | "registering" | "success" | "error";

function extractWalletId(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (value && typeof value === "object" && "value" in value) {
    const nested = (value as Record<string, unknown>).value;
    if (typeof nested === "number") return nested;
    if (typeof nested === "bigint") return Number(nested);
    if (typeof nested === "string" && nested.trim()) return Number(nested);
  }
  return null;
}

/* ── Step indicator ─────────────────────────────────────────── */

function StepIndicator({
  stepNumber,
  title,
  description,
  state,
}: {
  stepNumber: number;
  title: string;
  description: string;
  state: "pending" | "active" | "done";
}) {
  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border p-4 transition-all duration-500 ${
        state === "done"
          ? "border-[var(--forest)]/25 bg-[var(--forest)]/6"
          : state === "active"
          ? "border-[var(--amber-sap)]/30 bg-[var(--amber-sap)]/8 shadow-[0_4px_20px_rgba(201,168,76,0.08)]"
          : "border-white/50 bg-white/30"
      }`}
    >
      <div
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all duration-500 ${
          state === "done"
            ? "bg-[var(--forest)] text-white shadow-[0_2px_8px_rgba(75,110,72,0.3)]"
            : state === "active"
            ? "border-2 border-[var(--amber-sap)]/40 bg-[var(--amber-sap)]/15 text-[var(--terra)]"
            : "border border-[var(--faded-sage)] bg-[var(--warm-cream)] text-[var(--stone)]"
        }`}
      >
        {state === "done" ? (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : state === "active" ? (
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--amber-sap)] opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--amber-sap)]" />
          </span>
        ) : (
          <span>{stepNumber}</span>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[var(--dark-ink)]">{title}</p>
        <p className="mt-0.5 text-xs leading-5 text-[var(--stone)]">{description}</p>
      </div>
    </div>
  );
}

/* ── Main page ──────────────────────────────────────────────── */

export default function LobstrLoginPage() {
  const router = useRouter();
  const walletOption = getWalletOption("lobstr");

  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [activeProvider] = useState(() => getActiveWalletProvider());
  const [flowState, setFlowState] = useState<FlowState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [registeredId, setRegisteredId] = useState<number | null>(null);

  const handleConnected = useCallback(
    async (address: string) => {
      setWalletAddress(address);

      if (!walletOption || walletOption.capability === "coming_soon") {
        setFlowState("success");
        return;
      }

      setFlowState("registering");
      try {
        let walletId = extractWalletId(
          await getWalletIdByAddress(address, address)
        );

        if (!walletId || walletId === 0) {
          await registerWallet(address);
          walletId = extractWalletId(
            await getWalletIdByAddress(address, address)
          );
        }

        setRegisteredId(walletId ?? null);
        setFlowState("success");

        window.setTimeout(() => {
          router.push("/dashboard");
        }, 1800);
      } catch (err) {
        setFlowState("error");
        setError(err instanceof Error ? err.message : "Registration failed");
      }
    },
    [router, walletOption]
  );

  const handleError = useCallback((errorMsg: string) => {
    setFlowState("error");
    setError(errorMsg);
  }, []);

  if (!walletOption) return null;

  const statusLabel =
    flowState === "connecting"
      ? "Connecting…"
      : flowState === "registering"
      ? "Registering on-chain…"
      : flowState === "success"
      ? registeredId
        ? "Wallet ready ✓"
        : "Connected ✓"
      : "Ready to connect";

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-[var(--parchment)]">
      {/* ── Ambient background ───── */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(75,110,72,0.06),transparent_50%),radial-gradient(circle_at_80%_80%,rgba(201,168,76,0.06),transparent_50%)]" />
        <div
          className="absolute left-[8%] top-[10%] h-64 w-64 rounded-full blur-[100px] sm:h-72 sm:w-72 sm:blur-[110px]"
          style={{ background: walletOption.accentSoft }}
        />
        <div className="absolute bottom-[8%] right-[8%] h-56 w-56 rounded-full bg-white/20 blur-[90px] sm:h-80 sm:w-80 sm:blur-[120px]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--forest)]/25 to-transparent" />
      </div>

      <FloatingHeader />
      <DockHeader
        walletAddress={walletAddress}
        walletProvider={activeProvider}
        onConnect={() => {}}
        onDisconnect={() => setWalletAddress(null)}
        isConnecting={
          flowState === "connecting" || flowState === "registering"
        }
      />

      {/* ── Content ──────────────── */}
      <main className="relative z-10 flex flex-1 items-start justify-center px-4 pb-28 pt-20 sm:items-center sm:px-6 sm:pb-20 sm:pt-24">
        <section className="w-full max-w-5xl">
          {/* Mobile: single column, Desktop: two-column */}
          <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[1fr_1.15fr] lg:gap-8">

            {/* ── Left card: Info panel ──────── */}
            <aside className="relative overflow-hidden rounded-3xl border border-white/50 bg-[linear-gradient(150deg,rgba(250,249,246,0.92),rgba(242,240,239,0.78))] p-5 shadow-[0_16px_50px_rgba(44,44,43,0.1),inset_0_1px_0_rgba(255,255,255,0.78)] sm:p-7 lg:p-9">
              <div
                className="absolute inset-0 opacity-80"
                style={{ background: walletOption.gradient }}
              />
              <div className="relative z-10">
                {/* Back link + badge */}
                <div className="mb-5 flex items-center justify-between gap-3">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.2em] text-[var(--stone)] transition-colors hover:text-[var(--forest)]"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                    Wallets
                  </Link>
                  <span className="rounded-full border border-white/55 bg-white/50 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[var(--dark-ink)]">
                    {walletOption.supportLabel}
                  </span>
                </div>

                {/* Wallet identity */}
                <div className="flex items-center gap-3.5">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/60 bg-white/65 font-mono text-sm font-bold text-[var(--dark-ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] sm:h-16 sm:w-16 sm:rounded-[20px] sm:text-base">
                    {walletOption.icon}
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--stone)]">
                      {walletOption.subtitle}
                    </p>
                    <h1 className="mt-0.5 text-3xl font-bold text-[var(--dark-ink)] sm:mt-1 sm:text-4xl" style={{ fontFamily: "var(--font-playfair)" }}>
                      {walletOption.name}
                    </h1>
                  </div>
                </div>

                <p className="mt-4 text-sm leading-6 text-[var(--stone)] sm:mt-5 sm:text-base sm:leading-7">
                  {walletOption.helperText}
                </p>

                {/* Steps */}
                <div className="mt-5 space-y-2.5 sm:mt-7 sm:space-y-3">
                  <StepIndicator
                    stepNumber={1}
                    title="Tap Connect"
                    description="Generate a QR code or deep link for your LOBSTR app."
                    state={
                      walletAddress
                        ? "done"
                        : flowState === "connecting"
                        ? "active"
                        : "pending"
                    }
                  />
                  <StepIndicator
                    stepNumber={2}
                    title="Scan with LOBSTR"
                    description="Open the LOBSTR app on your phone and scan the code."
                    state={
                      walletAddress
                        ? "done"
                        : flowState === "connecting"
                        ? "active"
                        : "pending"
                    }
                  />
                  <StepIndicator
                    stepNumber={3}
                    title="Register & go"
                    description="Your on-chain identity is created and you're taken to the dashboard."
                    state={
                      registeredId
                        ? "done"
                        : flowState === "registering" ||
                          flowState === "success"
                        ? "active"
                        : "pending"
                    }
                  />
                </div>

                {/* Route info — hidden on small screens to save space */}
                <div className="mt-5 hidden rounded-2xl border border-white/50 bg-white/40 p-4 sm:mt-7 sm:block sm:p-5">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--stone)]">
                    Connection details
                  </p>
                  <div className="mt-2.5 space-y-1.5 text-sm leading-6 text-[var(--stone)]">
                    <p>
                      Method:{" "}
                      <span className="font-semibold text-[var(--dark-ink)]">
                        QR Code via WalletConnect
                      </span>
                    </p>
                    <p>
                      Signing:{" "}
                      <span className="font-semibold text-[var(--dark-ink)]">
                        {walletOption.signSupportLabel}
                      </span>
                    </p>
                    <p>
                      App:{" "}
                      <a
                        href="https://lobstr.co/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--forest)] underline decoration-[var(--forest)]/30 underline-offset-2 hover:decoration-[var(--forest)]"
                      >
                        lobstr.co
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            </aside>

            {/* ── Right card: Connect panel ────── */}
            <div className="relative overflow-hidden rounded-3xl border border-[var(--faded-sage)]/60 bg-[var(--warm-cream)]/85 p-5 shadow-[0_16px_50px_rgba(44,44,43,0.1),inset_0_1px_0_rgba(255,255,255,0.8)] sm:p-7 lg:p-9">
              {/* Ambient blurs */}
              <div
                className="absolute -right-8 top-6 h-28 w-28 rounded-full blur-3xl sm:h-36 sm:w-36"
                style={{ background: walletOption.accentSoft }}
              />
              <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-white/35 blur-3xl sm:h-40 sm:w-40" />

              <div className="relative z-10">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--stone)]">
                      Mobile wallet
                    </p>
                    <h2
                      className="mt-1.5 text-2xl font-bold text-[var(--dark-ink)] sm:mt-2 sm:text-3xl"
                      style={{ fontFamily: "var(--font-playfair)" }}
                    >
                      {statusLabel}
                    </h2>
                  </div>
                  {/* Mobile connection details pill */}
                  <div className="flex items-center gap-2 rounded-full border border-[var(--faded-sage)]/40 bg-white/50 px-3 py-1.5 sm:hidden">
                    <span className="relative flex h-2 w-2">
                      <span className={`absolute inline-flex h-full w-full rounded-full ${walletAddress ? "bg-[var(--forest)]" : "bg-[var(--stone)]"} ${flowState === "connecting" ? "animate-ping opacity-50" : ""}`} />
                      <span className={`relative inline-flex h-2 w-2 rounded-full ${walletAddress ? "bg-[var(--forest)]" : "bg-[var(--stone)]"}`} />
                    </span>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--dark-ink)]">
                      {walletAddress ? "Connected" : "Waiting"}
                    </span>
                  </div>
                </div>

                <p className="mt-3 text-sm leading-6 text-[var(--stone)] sm:mt-4 sm:max-w-2xl">
                  Connect your LOBSTR mobile wallet by scanning the QR code.
                  Make sure you have the LOBSTR app installed on your phone.
                </p>

                {/* Error */}
                {error && (
                  <div className="mt-4 rounded-2xl border border-[var(--terra)]/15 bg-[var(--terra)]/8 p-4 text-sm leading-6 text-[var(--terra)] sm:mt-6">
                    <div className="flex items-start gap-2">
                      <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                      </svg>
                      <span>{error}</span>
                    </div>
                  </div>
                )}

                {/* Status cards */}
                <div className="mt-4 grid gap-3 sm:mt-6 sm:grid-cols-2 sm:gap-4">
                  <div className="rounded-2xl border border-white/60 bg-white/45 p-4 sm:p-5">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--stone)]">
                      Connection method
                    </p>
                    <div className="mt-2.5 flex items-center gap-2.5 sm:mt-3">
                      <span className="relative flex h-3 w-3">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--forest)] opacity-40" />
                        <span className="relative inline-flex h-3 w-3 rounded-full bg-[var(--forest)]" />
                      </span>
                      <span className="text-sm font-semibold text-[var(--dark-ink)] sm:text-base">
                        WalletConnect
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-[var(--stone)] sm:mt-3 sm:text-sm sm:leading-6">
                      Secure QR code handshake between your mobile wallet and
                      this browser.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/60 bg-white/45 p-4 sm:p-5">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--stone)]">
                      Connected account
                    </p>
                    {walletAddress ? (
                      <>
                        <p className="mt-2.5 break-all font-mono text-xs text-[var(--dark-ink)] sm:mt-3 sm:text-sm">
                          {walletAddress}
                        </p>
                        <p className="mt-2 text-xs font-semibold text-[var(--forest)] sm:mt-3 sm:text-sm">
                          {registeredId
                            ? `Wallet ID #${registeredId}`
                            : "Ready for registration"}
                        </p>
                      </>
                    ) : (
                      <p className="mt-2.5 text-xs leading-5 text-[var(--stone)] sm:mt-3 sm:text-sm sm:leading-6">
                        No address connected yet. Tap the button below to start.
                      </p>
                    )}
                  </div>
                </div>

                {/* Connect button */}
                <div className="mt-5 flex flex-col items-center sm:mt-7">
                  <LobstrConnect
                    onConnected={handleConnected}
                    onError={handleError}
                  />
                </div>

                {/* How it works — compact for mobile */}
                <div className="mt-5 rounded-2xl border border-[var(--faded-sage)]/60 bg-white/40 p-4 sm:mt-6 sm:p-5">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--stone)]">
                    How it works
                  </p>
                  <div className="mt-2.5 grid gap-3 sm:mt-3 sm:grid-cols-3">
                    <div className="flex items-start gap-2 sm:flex-col sm:gap-0">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--forest)]/10 text-[10px] font-bold text-[var(--forest)] sm:mb-2">
                        1
                      </span>
                      <div>
                        <p className="text-xs font-semibold text-[var(--dark-ink)] sm:text-sm">
                          Tap Connect
                        </p>
                        <p className="mt-0.5 text-[11px] leading-4 text-[var(--stone)] sm:mt-1 sm:text-xs sm:leading-5">
                          Generates a QR code for pairing.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 sm:flex-col sm:gap-0">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--forest)]/10 text-[10px] font-bold text-[var(--forest)] sm:mb-2">
                        2
                      </span>
                      <div>
                        <p className="text-xs font-semibold text-[var(--dark-ink)] sm:text-sm">
                          Scan with LOBSTR
                        </p>
                        <p className="mt-0.5 text-[11px] leading-4 text-[var(--stone)] sm:mt-1 sm:text-xs sm:leading-5">
                          Open your app and scan the code.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 sm:flex-col sm:gap-0">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--forest)]/10 text-[10px] font-bold text-[var(--forest)] sm:mb-2">
                        3
                      </span>
                      <div>
                        <p className="text-xs font-semibold text-[var(--dark-ink)] sm:text-sm">
                          Approve
                        </p>
                        <p className="mt-0.5 text-[11px] leading-4 text-[var(--stone)] sm:mt-1 sm:text-xs sm:leading-5">
                          Confirm in your app to finalize.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}