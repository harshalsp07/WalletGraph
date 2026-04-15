"use client";

import { useCallback, useState } from "react";

export type LobstrConnectionState = "idle" | "connecting" | "connected" | "error";

export interface LobstrState {
  address: string | null;
  connectionState: LobstrConnectionState;
  error: string | null;
}

export interface LobstrActions {
  connect: () => Promise<string | null>;
  disconnect: () => Promise<void>;
}

type UseLobstrResult = LobstrState & LobstrActions;

const LOBSTR_APP_URL = "https://lobstr.co/";
const ACTIVE_WALLET_KEY = "walletgraph.activeWallet";

/**
 * useLobstr — standalone hook that dynamically loads stellar-wallet-kit's
 * WalletConnectAdapter for LOBSTR wallet connections.
 * Does NOT require a global WalletProvider context.
 */
export function useLobstr(): UseLobstrResult {
  const [address, setAddress] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<LobstrConnectionState>("idle");
  const [error, setError] = useState<string | null>(null);

  const connectLobstr = useCallback(async (): Promise<string | null> => {
    setConnectionState("connecting");
    setError(null);

    try {
      const { WalletConnectAdapter } = await import("stellar-wallet-kit");
      const adapter = new WalletConnectAdapter("walletgraph");

      await adapter.connect();
      const publicKey = await adapter.getPublicKey();

      if (publicKey) {
        setAddress(publicKey);
        setConnectionState("connected");
        if (typeof window !== "undefined") {
          window.localStorage.setItem(ACTIVE_WALLET_KEY, "lobstr");
        }
        return publicKey;
      }

      setConnectionState("idle");
      return null;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Connection failed";
      setError(message);
      setConnectionState("error");
      return null;
    }
  }, []);

  const disconnect = useCallback(async () => {
    setAddress(null);
    setConnectionState("idle");
    setError(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(ACTIVE_WALLET_KEY);
    }
  }, []);

  return {
    address,
    connectionState,
    error,
    connect: connectLobstr,
    disconnect,
  };
}

export function getLobstrDeepLink(appUrl: string = LOBSTR_APP_URL, uri?: string): string {
  const baseUrl = appUrl;
  if (uri) {
    return `${baseUrl}walletconnect?uri=${encodeURIComponent(uri)}`;
  }
  return baseUrl;
}