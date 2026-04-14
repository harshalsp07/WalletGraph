"use client";

import { WalletType, useWallet } from "stellar-wallet-kit";
import { useCallback, useState, useEffect } from "react";

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

export function useLobstr(): UseLobstrResult {
  const [address, setAddress] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<LobstrConnectionState>("idle");
  const [error, setError] = useState<string | null>(null);

  const { connect, disconnect: disconnectWallet, isConnected, account } = useWallet();

  useEffect(() => {
    if (isConnected && account?.address) {
      setAddress(account.address);
      setConnectionState("connected");
      setError(null);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(ACTIVE_WALLET_KEY, "lobstr");
      }
    }
  }, [isConnected, account]);

  const connectLobstr = useCallback(async (): Promise<string | null> => {
    setConnectionState("connecting");
    setError(null);

    try {
      await connect(WalletType.LOBSTR);
      return account?.address ?? null;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Connection failed";
      setError(message);
      setConnectionState("error");
      return null;
    }
  }, [connect, account]);

  const disconnect = useCallback(async () => {
    await disconnectWallet();
    setAddress(null);
    setConnectionState("idle");
    setError(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(ACTIVE_WALLET_KEY);
    }
  }, [disconnectWallet]);

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