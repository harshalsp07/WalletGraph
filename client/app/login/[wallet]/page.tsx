"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import DockHeader from "@/components/DockHeader";
import FloatingHeader from "@/components/FloatingHeader";
import {
  checkConnection,
  connectWallet,
  getActiveWalletProvider,
  getWalletAddress,
  getWalletIdByAddress,
  getWalletProviderStatus,
  registerWallet,
  type WalletProvider,
} from "@/hooks/contract";
import { getWalletOption } from "@/lib/wallets";

type FlowState = "idle" | "checking" | "connecting" | "registering" | "success" | "error";

function normalizeWallet(value: string | string[] | undefined): WalletProvider | null {
  const id = Array.isArray(value) ? value[0] : value;
  if (id === "freighter" || id === "rabet" || id === "xbull" || id === "lobstr") {
    return id;
  }
  return null;
}

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

export default function WalletProviderLoginPage() {
  const router = useRouter();
  const params = useParams();
  const selectedWallet = normalizeWallet(params.wallet);
  const walletOption = useMemo(() => getWalletOption(selectedWallet), [selectedWallet]);

  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [activeProvider, setActiveProvider] = useState<WalletProvider>(() => getActiveWalletProvider());
  const [flowState, setFlowState] = useState<FlowState>("checking");
  const [error, setError] = useState<string | null>(null);
  const [registeredId, setRegisteredId] = useState<number | null>(null);

  useEffect(() => {
    if (!selectedWallet) {
      router.replace("/login");
      return;
    }
    (async () => {
      try {
        const connected = await checkConnection(selectedWallet);
        if (connected) {
          const address = await getWalletAddress(selectedWallet);
          if (address) {
            setWalletAddress(address);
          }
        }
      } catch {}
      setFlowState("idle");
    })();
  }, [router, selectedWallet]);

  const providerStatus = useMemo(
    () => (selectedWallet ? getWalletProviderStatus(selectedWallet) : null),
    [selectedWallet]
  );

  const handleConnect = useCallback(async () => {
    if (!selectedWallet || !walletOption) return;

    setFlowState("connecting");
    setError(null);
    setRegisteredId(null);

    try {
      const address = await connectWallet(selectedWallet);
      setActiveProvider(selectedWallet);
      setWalletAddress(address);

      if (walletOption.capability === "coming_soon") {
        setFlowState("success");
        return;
      }

      setFlowState("registering");
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
      setError(err instanceof Error ? err.message : "Connection failed");
    }
  }, [router, selectedWallet, walletOption]);

  if (!walletOption || !providerStatus) return null;

  const primaryLabel =
    flowState === "connecting"
      ? `Connecting ${walletOption.name}...`
      : flowState === "registering"
      ? "Registering wallet on-chain..."
      : flowState === "success"
      ? registeredId
        ? "Wallet ready"
        : walletOption.capability === "coming_soon"
        ? "Route available"
        : "Connected"
      : `Continue with ${walletOption.name}`;

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
        walletProvider={activeProvider ?? selectedWallet}
        onConnect={handleConnect}
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
                    title="Detect wallet"
                    description={providerStatus.message}
                    state={providerStatus.available ? "done" : flowState === "checking" ? "active" : "pending"}
                  />
                  <StepRow
                    title="Connect account"
                    description={`Request address access from ${walletOption.name} and remember it as the active provider for later sessions.`}
                    state={
                      walletAddress
                        ? "done"
                        : flowState === "connecting"
                        ? "active"
                        : "pending"
                    }
                  />
                  <StepRow
                    title="Register and continue"
                    description={
                      walletOption.capability === "coming_soon"
                        ? "This route is ready for future provider support, but on-chain browser flow is not enabled yet."
                        : "If the wallet is new to WalletGraph, create its on-chain identity before moving into the dashboard."
                    }
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
                    <p>Local status: <span className="font-semibold text-[var(--dark-ink)]">{providerStatus.label}</span></p>
                    <p>Signing: <span className="font-semibold text-[var(--dark-ink)]">{walletOption.signSupportLabel}</span></p>
                    <p>Fallback: <span className="font-semibold text-[var(--dark-ink)]">Freighter remains the safest full-featured route.</span></p>
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
                      Connect with confidence
                    </h2>
                  </div>
                  {activeProvider === selectedWallet && (
                    <span className="rounded-full border border-[var(--amber-sap)]/20 bg-[var(--amber-sap)]/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[var(--terra)]">
                      Last selected provider
                    </span>
                  )}
                </div>

                <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--stone)]">
                  This route handles provider detection, address connection, wallet registration, and dashboard handoff in one place. If an extension is missing or lacks signing APIs, the screen explains that before you hit a dead end.
                </p>

                {error && (
                  <div className="mt-6 rounded-[24px] border border-[var(--terra)]/18 bg-[var(--terra)]/8 p-4 text-sm leading-6 text-[var(--terra)]">
                    {error}
                  </div>
                )}

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <div className="rounded-[24px] border border-white/70 bg-white/50 p-5">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--stone)]">Detected in browser</p>
                    <div className="mt-3 flex items-center gap-3">
                      <span className={`h-3 w-3 rounded-full ${providerStatus.available ? "bg-[var(--forest)]" : providerStatus.comingSoon ? "bg-[var(--stone)]" : "bg-[var(--terra)]"}`} />
                      <span className="text-base font-semibold text-[var(--dark-ink)]">
                        {providerStatus.available ? "Available now" : providerStatus.comingSoon ? "Planned route" : "Not detected"}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[var(--stone)]">{providerStatus.message}</p>
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
                        No address connected yet. Once you continue, we’ll request access and prepare the wallet for WalletGraph.
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={handleConnect}
                    disabled={flowState === "checking" || flowState === "connecting" || flowState === "registering"}
                    className="btn-forest min-h-14 flex-1 text-base"
                  >
                    {primaryLabel}
                  </button>

                  {walletOption.installUrl && !providerStatus.available && !providerStatus.comingSoon && (
                    <a
                      href={walletOption.installUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-outline min-h-14 flex-1"
                    >
                      Install {walletOption.name}
                    </a>
                  )}
                </div>

                <div className="mt-6 rounded-[24px] border border-[var(--faded-sage)]/80 bg-white/45 p-5">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--stone)]">Why this is more robust now</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--dark-ink)]">Per-wallet routing</p>
                      <p className="mt-1 text-xs leading-5 text-[var(--stone)]">Each provider gets its own route instead of being funneled through one hardcoded login assumption.</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--dark-ink)]">Capability awareness</p>
                      <p className="mt-1 text-xs leading-5 text-[var(--stone)]">The UI distinguishes install state, connection state, and signing support before the contract call fails.</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--dark-ink)]">Forward-compatible flow</p>
                      <p className="mt-1 text-xs leading-5 text-[var(--stone)]">Future wallets like LOBSTR already have a real route and presentation model ready to expand.</p>
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
