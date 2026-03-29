"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  getWalletIdByAddress,
  viewWalletReputation,
  viewWalletHistory,
  checkConnection,
  connectWallet,
  getWalletAddress,
} from "@/hooks/contract";
import GraphVisualization from "@/components/GraphVisualization";
import DockHeader from "@/components/DockHeader";

interface ReputationRecord {
  wallet_id: number;
  score: number;
  endorsement_count: number;
  report_count: number;
  last_updated: number;
  is_active: boolean;
}

interface InteractionLog {
  log_id: number;
  target_wallet_id: number;
  is_endorsement: boolean;
  reason: string;
  timestamp: number;
}

function GraphPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reputation, setReputation] = useState<ReputationRecord | null>(null);
  const [walletHistory, setWalletHistory] = useState<InteractionLog[]>([]);

  const walletId = searchParams.get("id");
  const addressParam = searchParams.get("address");

  useEffect(() => {
    const initWallet = async () => {
      const connected = await checkConnection();
      if (connected) {
        const addr = await getWalletAddress();
        setWalletAddress(addr);
      }
    };
    initWallet();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      let targetWalletId: number | null = null;
      let walletIdParam = walletId;
      let addressParamVal = addressParam;

      if (!walletIdParam && !addressParamVal) {
        const storedWalletId = localStorage.getItem("wallet_id");
        if (storedWalletId) {
          walletIdParam = storedWalletId;
        } else if (walletAddress) {
          addressParamVal = walletAddress;
        }
      }

      if (!walletIdParam && !addressParamVal) {
        setError("No wallet ID or address provided");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        let targetWalletId: number;

        if (addressParamVal) {
          const result = await getWalletIdByAddress(addressParamVal, walletAddress || undefined);
          if (result && typeof result === "object" && "value" in result) {
            targetWalletId = Number(result.value);
          } else if (typeof result === "number") {
            targetWalletId = result;
          } else if (result && typeof result === "object") {
            const resultObj = result as Record<string, unknown>;
            targetWalletId = Number(resultObj.value ?? resultObj);
          } else {
            targetWalletId = 0;
          }

          if (targetWalletId === 0) {
            setError("This wallet address is not registered yet.");
            setIsLoading(false);
            return;
          }
        } else {
          targetWalletId = parseInt(walletIdParam!);
          if (isNaN(targetWalletId) || targetWalletId < 1) {
            setError("Invalid wallet ID");
            setIsLoading(false);
            return;
          }
        }

        const repResult = await viewWalletReputation(targetWalletId, walletAddress || undefined);
        if (repResult && typeof repResult === "object") {
          const resultObj = repResult as Record<string, unknown>;
          const rec: ReputationRecord = {
            wallet_id: Number(resultObj.wallet_id ?? targetWalletId),
            score: Number(resultObj.score ?? 0),
            endorsement_count: Number(resultObj.endorsement_count ?? 0),
            report_count: Number(resultObj.report_count ?? 0),
            last_updated: Number(resultObj.last_updated ?? 0),
            is_active: Boolean(resultObj.is_active),
          };
          setReputation(rec);

          try {
            const historyResult = await viewWalletHistory(targetWalletId, walletAddress || undefined);
            if (historyResult && Array.isArray(historyResult)) {
              const logs: InteractionLog[] = historyResult.map((h: unknown) => {
                const obj = h as Record<string, unknown>;
                return {
                  log_id: Number(obj.log_id ?? 0),
                  target_wallet_id: Number(obj.target_wallet_id ?? 0),
                  is_endorsement: Boolean(obj.is_endorsement ?? false),
                  reason: String(obj.reason ?? ""),
                  timestamp: Number(obj.timestamp ?? 0),
                };
              });
              setWalletHistory(logs);
            }
          } catch {
            // History not available
          }
        } else {
          setError("Wallet not found or not registered");
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Query failed");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [walletId, addressParam, walletAddress]);

  const handleConnect = useCallback(async () => {
    setIsConnecting(true);
    try {
      const addr = await connectWallet();
      setWalletAddress(addr);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to connect");
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const handleDisconnect = useCallback(() => {
    setWalletAddress(null);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--parchment)] flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 bg-[var(--forest)]/20 blur-xl rounded-full animate-pulse" />
            <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-[var(--forest)]/10 border border-[var(--faded-sage)]">
              <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--forest)" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            </div>
          </div>
          <p className="text-sm text-[var(--stone)] font-medium">Loading graph...</p>
        </div>
        <DockHeader walletAddress={walletAddress} onConnect={handleConnect} onDisconnect={handleDisconnect} isConnecting={isConnecting} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--parchment)] flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="card-botanical p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--terra)]/10 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--terra)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h2 className="text-xl font-heading font-bold text-[var(--dark-ink)] mb-2">Unable to Load Graph</h2>
            <p className="text-sm text-[var(--stone)] mb-6">{error}</p>
            <button
              onClick={() => router.push("/")}
              className="btn-forest cursor-pointer"
            >
              Return Home
            </button>
          </div>
        </div>
        <DockHeader walletAddress={walletAddress} onConnect={handleConnect} onDisconnect={handleDisconnect} isConnecting={isConnecting} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--parchment)] relative overflow-hidden">
      <GraphVisualization
        reputation={reputation}
        walletHistory={walletHistory}
        walletAddress={walletAddress}
      />
      <DockHeader walletAddress={walletAddress} onConnect={handleConnect} onDisconnect={handleDisconnect} isConnecting={isConnecting} />
    </div>
  );
}

function GraphLoadingFallback() {
  return (
    <div className="min-h-screen bg-[var(--parchment)] flex items-center justify-center">
      <div className="text-center">
        <div className="relative w-16 h-16 mx-auto mb-4">
          <div className="absolute inset-0 bg-[var(--forest)]/20 blur-xl rounded-full animate-pulse" />
          <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-[var(--forest)]/10 border border-[var(--faded-sage)]">
            <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--forest)" strokeWidth="2">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          </div>
        </div>
        <p className="text-sm text-[var(--stone)] font-medium">Loading...</p>
      </div>
    </div>
  );
}

export default function GraphPage() {
  return (
    <Suspense fallback={<GraphLoadingFallback />}>
      <GraphPageContent />
    </Suspense>
  );
}