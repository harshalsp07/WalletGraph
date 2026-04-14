"use client";

import { useState, useCallback } from "react";
import { connectWallet } from "@/hooks/contract";

type WalletButtonState = "disconnected" | "connecting" | "connected" | "error";

interface WalletButtonProps {
  onConnected?: (address: string) => void;
  size?: "sm" | "md" | "lg";
}

function WalletIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  );
}

function CheckIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function AlertIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

export default function WalletButton({ onConnected, size = "md" }: WalletButtonProps) {
  const [state, setState] = useState<WalletButtonState>("disconnected");
  const [error, setError] = useState<string | null>(null);

  const sizeClasses = {
    sm: "px-3 py-2 text-sm gap-2",
    md: "px-5 py-2.5 text-sm gap-2.5",
    lg: "px-8 py-4 text-base gap-3",
  };

  const iconSizes = {
    sm: 14,
    md: 16,
    lg: 20,
  };

  const handleConnect = useCallback(async () => {
    setState("connecting");
    setError(null);
    try {
      const address = await connectWallet();
      setState("connected");
      if (onConnected) {
        onConnected(address);
      }
      setTimeout(() => setState("disconnected"), 3000);
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Connection failed");
      setTimeout(() => {
        setState("disconnected");
        setError(null);
      }, 4000);
    }
  }, [onConnected]);

  if (state === "connected") {
    return (
      <button
        className={`${sizeClasses[size]} rounded-xl bg-[var(--forest)] text-white font-semibold shadow-[inset_0_1px_2px_rgba(255,255,255,0.15),0_4px_12px_rgba(75,110,72,0.3)] transition-all duration-300`}
      >
        <span className="text-[var(--forest)] animate-fade-in">
          <CheckIcon size={iconSizes[size]} />
        </span>
        <span>Connected</span>
      </button>
    );
  }

  if (state === "error") {
    return (
      <div className="space-y-2">
        <button
          onClick={handleConnect}
          className={`${sizeClasses[size]} rounded-xl bg-[var(--terra)] text-white font-semibold shadow-[inset_0_1px_2px_rgba(255,255,255,0.15),0_4px_12px_rgba(160,82,45,0.3)] hover:bg-[#8a4526] transition-all duration-300 cursor-pointer`}
        >
          <span className="animate-pulse">
            <AlertIcon size={iconSizes[size]} />
          </span>
          <span>Try Again</span>
        </button>
        {error && (
          <p className="text-xs text-[var(--terra)] text-center px-2 animate-fade-in">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      disabled={state === "connecting"}
      className={`${sizeClasses[size]} rounded-xl bg-[var(--forest)] text-white font-semibold shadow-[inset_0_1px_2px_rgba(255,255,255,0.15),0_4px_12px_rgba(75,110,72,0.3)] hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.2),0_6px_20px_rgba(75,110,72,0.4)] transition-all duration-300 cursor-pointer group relative overflow-hidden`}
    >
      {state === "connecting" ? (
        <>
          <svg className="animate-spin" width={iconSizes[size]} height={iconSizes[size]} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          <span>Connecting…</span>
        </>
      ) : (
        <>
          <WalletIcon size={iconSizes[size]} />
          <span>Connect Wallet</span>
          <svg width={iconSizes[size] - 2} height={iconSizes[size] - 2} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-60 group-hover:translate-x-1 transition-transform">
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </>
      )}
    </button>
  );
}