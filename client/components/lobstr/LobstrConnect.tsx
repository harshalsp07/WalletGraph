"use client";

import { useState } from "react";
import { WalletType, useWallet, NetworkType } from "stellar-wallet-kit";
import { Networks } from "@stellar/stellar-sdk";

export interface LobstrConnectProps {
  onConnected?: (address: string) => void;
  onError?: (error: string) => void;
}

export default function LobstrConnect({ onConnected, onError }: LobstrConnectProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { connect, isConnected, account } = useWallet();

  if (account?.address && isConnected) {
    onConnected?.(account.address);
  }

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      await connect(WalletType.LOBSTR);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Connection failed";
      setError(message);
      onError?.(message);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <button
        onClick={handleConnect}
        disabled={isConnecting}
        className="group relative inline-flex items-center justify-center gap-3 rounded-2xl border border-[var(--faded-sage)]/80 bg-[var(--forest)] px-8 py-4 text-base font-semibold text-white transition-all hover:bg-[var(--forest)]/90 hover:shadow-lg active:scale-[0.98]"
      >
        {isConnecting ? (
          <>
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Connecting...
          </>
        ) : (
          <>
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M7 7h.01M17 7h.01M7 17h.10M17 17h.10" />
            </svg>
            Connect with LOBSTR
          </>
        )}
      </button>

      {error && (
        <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="text-center text-xs text-[var(--stone)]">
        <p>Don&apos;t have LOBSTR?</p>
        <a
          href="https://lobstr.co/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--forest)] underline hover:no-underline"
        >
          Download the app
        </a>
      </div>
    </div>
  );
}