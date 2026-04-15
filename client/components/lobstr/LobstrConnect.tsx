"use client";

import { useState, useEffect, useCallback } from "react";

export interface LobstrConnectProps {
  onConnected?: (address: string) => void;
  onError?: (error: string) => void;
}

/**
 * LobstrConnect — uses stellar-wallet-kit's WalletConnectAdapter
 * to connect to the LOBSTR mobile wallet via WalletConnect protocol.
 */
export default function LobstrConnect({ onConnected, onError }: LobstrConnectProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adapter, setAdapter] = useState<{
    connect: () => Promise<void>;
    getPublicKey: () => Promise<string>;
    disconnect: () => Promise<void>;
  } | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Dynamically load the WalletConnectAdapter to avoid SSR issues
  useEffect(() => {
    let cancelled = false;

    async function loadAdapter() {
      try {
        const { WalletConnectAdapter } = await import("stellar-wallet-kit");
        const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "c1b504627d31fe1de769dfdcd7bcbd13";
        const wca = new WalletConnectAdapter(projectId);

        if (!cancelled) {
          setAdapter(wca as unknown as {
            connect: () => Promise<void>;
            getPublicKey: () => Promise<string>;
            disconnect: () => Promise<void>;
          });
          setLoaded(true);
        }
      } catch {
        if (!cancelled) {
          setLoaded(true);
          setError("Failed to initialize wallet adapter. Please refresh and try again.");
        }
      }
    }

    loadAdapter();
    return () => { cancelled = true; };
  }, []);

  const handleConnect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      if (!adapter) {
        throw new Error("Wallet adapter is still loading. Please try again.");
      }

      await adapter.connect();

      // After WalletConnect handshake, retrieve the public key
      const publicKey = await adapter.getPublicKey();

      if (publicKey) {
        onConnected?.(publicKey);
      } else {
        throw new Error("Connected but could not retrieve wallet address. Please try again.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Connection failed";
      setError(message);
      onError?.(message);
    } finally {
      setIsConnecting(false);
    }
  }, [adapter, onConnected, onError]);

  return (
    <div className="flex flex-col items-center gap-5 w-full">
      <button
        onClick={handleConnect}
        disabled={isConnecting || !loaded}
        className="group relative inline-flex w-full max-w-xs items-center justify-center gap-3 rounded-2xl border border-[var(--faded-sage)]/80 bg-[var(--forest)] px-7 py-4 text-base font-semibold text-white transition-all duration-300 hover:bg-[var(--forest)]/90 hover:shadow-[0_8px_30px_rgba(75,110,72,0.35)] active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isConnecting ? (
          <>
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            <span>Connecting…</span>
          </>
        ) : !loaded ? (
          <>
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            <span>Loading…</span>
          </>
        ) : (
          <>
            <svg
              className="h-5 w-5 transition-transform duration-300 group-hover:scale-110"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M7 7h.01M17 7h.01M7 17h.01M17 17h.01M12 12h.01" />
            </svg>
            <span>Connect with LOBSTR</span>
          </>
        )}

        {/* Hover glow */}
        <div className="absolute inset-0 rounded-2xl bg-white/0 transition-all duration-300 group-hover:bg-white/5" />
      </button>

      {error && (
        <div className="w-full max-w-xs rounded-xl border border-[var(--terra)]/15 bg-[var(--terra)]/8 px-4 py-3 text-sm leading-relaxed text-[var(--terra)]">
          {error}
        </div>
      )}

      <div className="flex flex-col items-center gap-1 text-center text-xs text-[var(--stone)]">
        <p>Don&apos;t have LOBSTR?</p>
        <a
          href="https://lobstr.co/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[var(--forest)] underline decoration-[var(--forest)]/30 underline-offset-2 transition-all hover:decoration-[var(--forest)] hover:no-underline"
        >
          Download the app
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
          </svg>
        </a>
      </div>
    </div>
  );
}