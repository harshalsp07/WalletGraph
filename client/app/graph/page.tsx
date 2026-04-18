"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  getWalletIdByAddress,
  viewWalletReputation,
  viewWalletHistory,
  checkConnection,
  getActiveWalletProvider,
  getWalletAddress,
  type WalletProvider,
} from "@/hooks/contract";
import GraphVisualization from "@/components/GraphVisualization";
import DockHeader from "@/components/DockHeader";
import FloatingHeader from "@/components/FloatingHeader";
import { useToast } from "@/context/ToastContext";

// Simple UI icons specifically for the graph HUD
function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

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
  const { showToast } = useToast();
  
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletProvider, setWalletProvider] = useState<WalletProvider | null>(null);
  const [searchInput, setSearchInput] = useState("");
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
        setWalletProvider(getActiveWalletProvider());
        const addr = await getWalletAddress();
        setWalletAddress(addr);
      }
    };
    initWallet();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
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
          if (typeof result === "bigint" || typeof result === "number") {
            targetWalletId = Number(result);
          } else if (result && typeof result === "object" && "value" in result) {
            const resultObj = result as Record<string, { value: bigint | number }>;
            targetWalletId = Number(resultObj.value);
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
    router.push("/login");
  }, [router]);

  const handleDisconnect = useCallback(() => {
    setWalletAddress(null);
    setWalletProvider(null);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    
    showToast("Loading graph data...", "info");
    if (searchInput.startsWith("G")) {
      router.push(`/graph?address=${encodeURIComponent(searchInput.trim())}`);
    } else {
      router.push(`/graph?id=${encodeURIComponent(searchInput.trim())}`);
    }
    setSearchInput("");
  };

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
        <FloatingHeader />
        <DockHeader walletAddress={walletAddress} walletProvider={walletProvider} onConnect={handleConnect} onDisconnect={handleDisconnect} isConnecting={isConnecting} />
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
        <FloatingHeader />
        <DockHeader walletAddress={walletAddress} walletProvider={walletProvider} onConnect={handleConnect} onDisconnect={handleDisconnect} isConnecting={isConnecting} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--parchment)] relative overflow-hidden">
      {/* Background Vignette */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(44,44,43,0.05)_100%)] z-0" />
      
      <div className="relative z-10 w-full h-full min-h-screen">
        <GraphVisualization
          reputation={reputation}
          walletHistory={walletHistory}
          walletAddress={walletAddress}
        />
      </div>

      {/* Graph HUD - Floating Overlays */}
      <div className="absolute top-20 left-3 sm:left-6 z-30 pointer-events-none flex flex-col gap-4">
        
        {/* Graph Search Bar */}
        <form 
          onSubmit={handleSearchSubmit}
          className="pointer-events-auto flex items-center bg-[var(--warm-cream)]/95 backdrop-blur-xl border border-[var(--faded-sage)]/80 rounded-2xl shadow-[0_4px_24px_rgba(44,44,43,0.07),0_1px_0_rgba(255,255,255,0.85)_inset] overflow-hidden w-[min(100%,16rem) sm:w-[min(100%,20rem)]] transition-all focus-within:ring-2 focus-within:ring-[var(--forest)]/25 focus-within:border-[var(--forest)]/35 focus-within:shadow-[0_12px_40px_rgba(75,110,72,0.14)] hover:border-[var(--sage)]"
        >
          <div className="pl-4 pr-2 text-[var(--stone)]">
            <SearchIcon />
          </div>
          <input
            type="text"
            placeholder="Search wallet ID or address..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="flex-1 bg-transparent py-3 pr-4 text-sm outline-none placeholder:text-[var(--stone)]/60 text-[var(--dark-ink)] font-medium"
          />
        </form>

        {/* Selected Wallet Detail HUD */}
        {reputation && (
          <div className="pointer-events-auto w-[min(100%,20rem)] bg-[var(--warm-cream)]/95 backdrop-blur-xl border border-[var(--faded-sage)]/80 rounded-2xl shadow-[0_8px_40px_rgba(44,44,43,0.1),0_1px_0_rgba(255,255,255,0.9)_inset] p-6 animate-fade-in-up relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[var(--forest)]/35 to-transparent pointer-events-none" />
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-heading font-bold text-xl tracking-tight text-[var(--dark-ink)]">Node Focus</h3>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--forest)]/10 border border-[var(--forest)]/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
                <span className="relative flex h-1.5 w-1.5">
                  <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${reputation.is_active ? "bg-[var(--forest)] animate-ping" : "bg-[var(--terra)]"}`} />
                  <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${reputation.is_active ? "bg-[var(--forest)]" : "bg-[var(--terra)]"}`} />
                </span>
                <span className="text-[9px] font-mono-data font-bold tracking-widest uppercase text-[var(--forest)]">
                  {reputation.is_active ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
            
            <div className="space-y-5 relative">
              <div>
                <p className="text-[10px] font-mono-data text-[var(--stone)] uppercase tracking-[0.12em] mb-1.5">Wallet ID</p>
                <p className="text-2xl font-mono-data font-bold text-[var(--forest)] tracking-tight">#{reputation.wallet_id}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gradient-to-br from-[var(--parchment)] to-[var(--warm-cream)] rounded-xl p-4 border border-[var(--faded-sage)]/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
                  <p className="text-[10px] font-mono-data text-[var(--stone)] uppercase tracking-[0.12em] mb-2">Reputation</p>
                  <p className="text-3xl font-heading font-black text-[var(--dark-ink)] leading-none">{reputation.score}</p>
                </div>
                <div className="flex flex-col gap-2.5">
                  <div className="bg-[var(--parchment)]/90 rounded-xl p-2.5 px-3 border border-[var(--moss)]/25 flex justify-between items-center shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
                    <span className="text-[10px] font-mono-data text-[var(--moss)] uppercase tracking-wider">Endorses</span>
                    <span className="font-bold text-[var(--moss)] text-base tabular-nums">{reputation.endorsement_count}</span>
                  </div>
                  <div className="bg-[var(--parchment)]/90 rounded-xl p-2.5 px-3 border border-[var(--terra)]/25 flex justify-between items-center shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
                    <span className="text-[10px] font-mono-data text-[var(--terra)] uppercase tracking-wider">Reports</span>
                    <span className="font-bold text-[var(--terra)] text-base tabular-nums">{reputation.report_count}</span>
                  </div>
                </div>
              </div>
              
              <a
                href={`/wallet/${reputation.wallet_id}`}
                className="flex items-center justify-center gap-2 w-full py-2.5 mt-2 rounded-xl border border-[var(--faded-sage)] text-xs font-semibold text-[var(--forest)] hover:bg-[var(--forest)]/5 hover:border-[var(--forest)]/30 transition-all"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
                View Full Profile
              </a>
            </div>
          </div>
        )}
      </div>

      <FloatingHeader />
      <DockHeader walletAddress={walletAddress} walletProvider={walletProvider} onConnect={handleConnect} onDisconnect={handleDisconnect} isConnecting={isConnecting} />
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
