"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import DockHeader from "@/components/DockHeader";
import FloatingHeader from "@/components/FloatingHeader";
import {
  getActiveWalletProvider,
  getWalletIdByAddress,
  registerWallet,
} from "@/hooks/contract";
import { getWalletOption } from "@/lib/wallets";

const LobstrConnect = dynamic(() => import("@/components/lobstr/LobstrConnect"), {
  ssr: false,
});

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

function StepRow({
  title,
  description,
  state,
}: {
  title: string;
  description: string;
  state: "pending" | "active" | "done";
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-white/60 bg-white/45 p-4">
      <div
        className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold ${
          state === "done"
            ? "border-[var(--forest)]/20 bg-[var(--forest)] text-white"
            : state === "active"
            ? "border-[var(--amber-sap)]/30 bg-[var(--amber-sap)]/14 text-[var(--terra)]"
            : "border-[var(--faded-sage)] bg-[var(--warm-cream)] text-[var(--stone)]"
        }`}
      >
        {state === "done" ? "✓" : state === "active" ? "•" : ""}
      </div>
      <div>
        <p className="text-sm font-semibold text-[var(--dark-ink)]">{title}</p>
        <p className="mt-1 text-xs leading-5 text-[var(--stone)]">{description}</p>
      </div>
    </div>
  );
}

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
        let walletId = extractWalletId(await getWalletIdByAddress(address, address));

        if (!walletId || walletId === 0) {
          await registerWallet(address);
          walletId = extractWalletId(await getWalletIdByAddress(address, address));
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

  const primaryLabel =
    flowState === "connecting"
      ? "Connecting LOBSTR..."
      : flowState === "registering"
      ? "Registering wallet on-chain..."
      : flowState === "success"
      ? registeredId
        ? "Wallet ready"
        : "Connected"
      : "Connect with LOBSTR";

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[var(--parchment)]">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(250,249,246,0.55),transparent_40%),linear-gradient(135deg,rgba(75,110,72,0.08),transparent_45%),linear-gradient(315deg,rgba(201,168,76,0.08),transparent_45%)]" />
        <div className="absolute left-[12%] top-[14%] h-72 w-72 rounded-full blur-[110px]" style={{ background: walletOption.accentSoft }} />
        <div className="absolute bottom-[10%] right-[10%] h-80 w-80 rounded-full bg-white/25 blur-[120px]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--forest)]/35 to-transparent" />
      </div>

      <FloatingHeader />
      <DockHeader
        walletAddress={walletAddress}
        walletProvider={activeProvider}
        onConnect={() => {}}
        onDisconnect={() => setWalletAddress(null)}
        isConnecting={flowState === "connecting" || flowState === "registering"}
      />

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-20 sm:px-6">
        <section className="w-full max-w-6xl">
          <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
            <aside className="relative overflow-hidden rounded-[32px] border border-white/55 bg-[linear-gradient(150deg,rgba(250,249,246,0.92),rgba(242,240,239,0.78))] p-7 shadow-[0_22px_70px_rgba(44,44,43,0.12),inset_0_1px_0_rgba(255,255,255,0.78)] sm:p-9">
              <div className="absolute inset-0 opacity-90" style={{ background: walletOption.gradient }} />
              <div className="relative z-10">
                <div className="mb-6 flex items-center justify-between gap-4">
                  <Link href="/login" className="text-[11px] uppercase tracking-[0.22em] text-[var(--stone)] transition-colors hover:text-[var(--forest)]">
                    Back to wallets
                  </Link>
                  <span className="rounded-full border border-white/60 bg-white/55 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[var(--dark-ink)]">
                    {walletOption.supportLabel}
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-[20px] border border-white/70 bg-white/70 font-mono-data text-base font-bold text-[var(--dark-ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                    {walletOption.icon}
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--stone)]">{walletOption.subtitle}</p>
                    <h1 className="mt-1 text-4xl font-heading font-bold text-[var(--dark-ink)]">
                      {walletOption.name}
                    </h1>
                  </div>
                </div>

                <p className="mt-5 text-base leading-7 text-[var(--stone)]">
                  {walletOption.helperText}
                </p>

                <div className="mt-7 space-y-3">
                  <StepRow
                    title="Scan QR Code"
                    description="Use the LOBSTR mobile app to scan the QR code and connect your wallet."
                    state={walletAddress ? "done" : flowState === "connecting" ? "active" : "pending"}
                  />
                  <StepRow
                    title="Approve connection"
                    description="In your LOBSTR app, approve the connection request to continue."
                    state={walletAddress ? "done" : flowState === "connecting" ? "active" : "pending"}
                  />
                  <StepRow
                    title="Register and continue"
                    description="If new to WalletGraph, create your on-chain identity before moving to the dashboard."
                    state={
                      registeredId
                        ? "done"
                        : flowState === "registering" || flowState === "success"
                        ? "active"
                        : "pending"
                    }
                  />
                </div>

                <div className="mt-7 rounded-[24px] border border-white/60 bg-white/50 p-5">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--stone)]">Route notes</p>
                  <div className="mt-3 space-y-2 text-sm leading-6 text-[var(--stone)]">
                    <p>Connection: <span className="font-semibold text-[var(--dark-ink)]">QR Code via WalletConnect</span></p>
                    <p>Signing: <span className="font-semibold text-[var(--dark-ink)]">{walletOption.signSupportLabel}</span></p>
                    <p>Download: <a href="https://lobstr.co/" target="_blank" rel="noopener noreferrer" className="text-[var(--forest)] underline hover:no-underline">Get LOBSTR App</a></p>
                  </div>
                </div>
              </div>
            </aside>

            <div className="relative overflow-hidden rounded-[32px] border border-[var(--faded-sage)]/80 bg-[var(--warm-cream)]/82 p-7 shadow-[0_22px_70px_rgba(44,44,43,0.12),inset_0_1px_0_rgba(255,255,255,0.8)] sm:p-9">
              <div className="absolute -right-10 top-8 h-36 w-36 rounded-full blur-3xl" style={{ background: walletOption.accentSoft }} />
              <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-white/40 blur-3xl" />

              <div className="relative z-10">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--stone)]">Provider route</p>
                    <h2 className="mt-2 text-3xl font-heading font-bold text-[var(--dark-ink)]">
                      {primaryLabel}
                    </h2>
                  </div>
                </div>

                <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--stone)]">
                  Connect your LOBSTR mobile wallet by scanning the QR code. Make sure you have the LOBSTR app installed on your phone and have it ready to scan.
                </p>

                {error && (
                  <div className="mt-6 rounded-[24px] border border-[var(--terra)]/18 bg-[var(--terra)]/8 p-4 text-sm leading-6 text-[var(--terra)]">
                    {error}
                  </div>
                )}

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <div className="rounded-[24px] border border-white/70 bg-white/50 p-5">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--stone)]">Connection method</p>
                    <div className="mt-3 flex items-center gap-3">
                      <span className="h-3 w-3 rounded-full bg-[var(--forest)]" />
                      <span className="text-base font-semibold text-[var(--dark-ink)]">WalletConnect</span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[var(--stone)]">
                      Secure QR code handshake between your mobile wallet and this browser.
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-white/70 bg-white/50 p-5">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--stone)]">Connected account</p>
                    {walletAddress ? (
                      <>
                        <p className="mt-3 break-all font-mono-data text-sm text-[var(--dark-ink)]">{walletAddress}</p>
                        <p className="mt-3 text-sm font-semibold text-[var(--forest)]">
                          {registeredId ? `Wallet ID #${registeredId}` : "Address ready for registration"}
                        </p>
                      </>
                    ) : (
                      <p className="mt-3 text-sm leading-6 text-[var(--stone)]">
                        No address connected yet. Click connect to scan QR code.
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-7 flex flex-col items-center">
                  <LobstrConnect
                    onConnected={handleConnected}
                    onError={handleError}
                  />
                </div>

                <div className="mt-6 rounded-[24px] border border-[var(--faded-sage)]/80 bg-white/45 p-5">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--stone)]">How it works</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--dark-ink)]">1. Tap Connect</p>
                      <p className="mt-1 text-xs leading-5 text-[var(--stone)]">Click the button above to generate a QR code.</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--dark-ink)]">2. Scan with LOBSTR</p>
                      <p className="mt-1 text-xs leading-5 text-[var(--stone)]">Open your LOBSTR app and scan the code displayed.</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--dark-ink)]">3. Approve</p>
                      <p className="mt-1 text-xs leading-5 text-[var(--stone)]">Confirm in your app to finalize connection.</p>
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