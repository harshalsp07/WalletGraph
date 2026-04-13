"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import DockHeader from "@/components/DockHeader";
import FloatingHeader from "@/components/FloatingHeader";
import {
  connectWallet,
  getWalletAddress,
  getWalletIdByAddress,
  registerWallet,
  type WalletProvider,
} from "@/hooks/contract";
import { WALLET_OPTIONS } from "@/lib/wallets";

type FlowState = "idle" | "connecting" | "registering" | "success" | "error";

function normalizeWallet(value: string | string[] | undefined): WalletProvider | null {
  const id = Array.isArray(value) ? value[0] : value;
  if (id === "freighter" || id === "rabet" || id === "xbull" || id === "lobstr") {
    return id;
  }
  return null;
}

export default function WalletProviderLoginPage() {
  const router = useRouter();
  const params = useParams();
  const selectedWallet = normalizeWallet(params.wallet);
  const walletOption = useMemo(
    () => WALLET_OPTIONS.find((wallet) => wallet.id === selectedWallet),
    [selectedWallet]
  );

  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [flowState, setFlowState] = useState<FlowState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [registeredId, setRegisteredId] = useState<number | null>(null);

  useEffect(() => {
    if (!selectedWallet) {
      router.replace("/login");
    }
  }, [router, selectedWallet]);

  useEffect(() => {
    (async () => {
      const address = await getWalletAddress();
      setWalletAddress(address);
    })();
  }, []);

  const handleConnect = useCallback(async () => {
    if (!selectedWallet) return;
    setFlowState("connecting");
    setError(null);
    try {
      const address = await connectWallet(selectedWallet);
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
      setTimeout(() => {
        router.push("/dashboard");
      }, 2200);
    } catch (err) {
      setFlowState("error");
      setError(err instanceof Error ? err.message : "Connection failed");
    }
  }, [router, selectedWallet]);

  if (!walletOption) return null;

  return (
    <div className="relative flex min-h-screen flex-col bg-[var(--parchment)]">
      <FloatingHeader />
      <DockHeader
        walletAddress={walletAddress}
        onConnect={handleConnect}
        onDisconnect={() => setWalletAddress(null)}
        isConnecting={flowState === "connecting"}
      />

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-20">
        <section className="w-full max-w-xl animate-fade-in-up">
          <div className="card-botanical p-8 paper-shadow">
            <div className="mb-7 flex items-center justify-between">
              <Link href="/login" className="text-xs uppercase tracking-wider text-[var(--stone)] hover:text-[var(--forest)]">
                Back
              </Link>
              <span className="rounded-full border border-[var(--faded-sage)] px-3 py-1 text-[10px] uppercase tracking-widest text-[var(--stone)]">
                {walletOption.subtitle}
              </span>
            </div>

            <h1 className="text-3xl font-heading font-bold text-[var(--dark-ink)] embossed">
              Connect with {walletOption.name}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[var(--stone)]">
              {walletOption.description}
            </p>

            {error && (
              <div className="mt-5 rounded-xl border border-[var(--terra)]/20 bg-[var(--terra)]/5 p-3 text-sm text-[var(--terra)]">
                {error}
              </div>
            )}

            <div className="mt-8 space-y-3">
              <button
                onClick={handleConnect}
                disabled={flowState === "connecting" || flowState === "registering"}
                className="btn-forest w-full py-4 text-base"
              >
                {flowState === "connecting"
                  ? `Connecting ${walletOption.name}...`
                  : flowState === "registering"
                  ? "Registering on-chain..."
                  : `Continue with ${walletOption.name}`}
              </button>

              {walletOption.installUrl && (
                <a
                  href={walletOption.installUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-outline w-full"
                >
                  Install {walletOption.name}
                </a>
              )}
            </div>

            {walletAddress && (
              <div className="mt-6 rounded-xl border border-[var(--faded-sage)] bg-[var(--warm-cream)]/70 p-4">
                <p className="text-[10px] uppercase tracking-wider text-[var(--stone)]">Connected Wallet</p>
                <p className="mt-1 break-all font-mono-data text-xs text-[var(--dark-ink)]">
                  {walletAddress}
                </p>
                {registeredId && (
                  <p className="mt-3 text-sm font-semibold text-[var(--forest)]">
                    Wallet ID: {registeredId}
                  </p>
                )}
              </div>
            )}

            {selectedWallet !== "freighter" && (
              <p className="mt-6 text-xs leading-relaxed text-[var(--stone)]">
                Non-Freighter wallet support uses extension APIs when available. If your provider lacks contract-signing methods, switch to Freighter for full on-chain registration.
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
