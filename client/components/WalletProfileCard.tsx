"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { animate } from "animejs";
import { useRouter } from "next/navigation";
import { useToast } from "@/context/ToastContext";
import {
  viewWalletReputation,
  viewWalletHistory,
  endorseWallet,
  reportWallet,
  getWalletIdByAddress,
  checkConnection,
  getWalletAddress,
  getActiveWalletProvider,
  type WalletProvider,
} from "@/hooks/contract";

interface ReputationRecord {
  wallet_id: number;
  score: number;
  endorsement_count: number;
  report_count: number;
  last_updated: number;
  is_active: boolean;
  wallet_address?: string;
}

interface InteractionLog {
  log_id: number;
  target_wallet_id: number;
  is_endorsement: boolean;
  reason: string;
  timestamp: number;
}

interface Props {
  walletIdOrAddress: string;
}

function SpinnerIcon() {
  return (
    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

function ThumbsUpIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 10v12" />
      <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
    </svg>
  );
}

function FlagIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  );
}

function createInkRipple(e: React.MouseEvent<HTMLButtonElement>) {
  const btn = e.currentTarget;
  const rect = btn.getBoundingClientRect();
  const ripple = document.createElement("span");
  ripple.style.position = "absolute";
  ripple.style.borderRadius = "50%";
  ripple.style.backgroundColor = "currentColor";
  ripple.style.opacity = "0.2";
  ripple.style.pointerEvents = "none";
  ripple.style.transformOrigin = "center center";
  const size = Math.max(rect.width, rect.height) * 2;
  ripple.style.width = `${size}px`;
  ripple.style.height = `${size}px`;
  ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
  ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
  const computedStyle = window.getComputedStyle(btn);
  if (computedStyle.position === "static") {
    btn.style.position = "relative";
  }
  btn.style.overflow = "hidden";
  btn.appendChild(ripple);
  animate(ripple, {
    scale: [0, 1],
    opacity: [0.2, 0],
    duration: 650,
    easing: "easeOutCirc",
    complete: () => ripple.remove()
  });
}

function ScoreBar({ score, endorsements, reports }: { score: number; endorsements: number; reports: number }) {
  const scoreRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scoreRef.current) {
      const obj = { val: 0 };
      animate(obj, {
        val: score,
        round: 1,
        duration: 1500,
        easing: "easeOutExpo",
        onUpdate: () => {
          if (scoreRef.current) scoreRef.current.textContent = String(Math.round(obj.val));
        },
      });
    }
    if (barRef.current) {
      animate(barRef.current, {
        width: [`0%`, `${Math.min(Math.abs(score) * 5, 100)}%`],
        duration: 1200,
        easing: "easeOutExpo",
        delay: 300,
      });
    }
  }, [score]);

  const scoreColor = score > 0 ? "var(--forest)" : score < 0 ? "var(--terra)" : "var(--amber-sap)";
  const scoreLabel = score > 0 ? "Trusted" : score < 0 ? "Flagged" : "Neutral";
  const glowColor = score > 0 ? "rgba(75, 110, 72, 0.3)" : score < 0 ? "rgba(160, 82, 45, 0.3)" : "rgba(201, 168, 76, 0.3)";

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs text-[var(--stone)] mb-1">Reputation Score</p>
          <div className="flex items-baseline gap-2">
            <span
              ref={scoreRef}
              className="text-5xl font-heading font-bold"
              style={{ 
                color: scoreColor,
                textShadow: `0 0 30px ${glowColor}`,
              }}
            >
              {score}
            </span>
            <span
              className="text-sm font-semibold px-3 py-1 rounded-full animate-pulse"
              style={{
                color: scoreColor,
                background: `${scoreColor}15`,
                boxShadow: `0 0 20px ${glowColor}`,
              }}
            >
              {scoreLabel}
            </span>
          </div>
        </div>
      </div>
      <div className="h-3 rounded-full bg-[var(--parchment)] overflow-hidden shadow-inner">
        <div
          ref={barRef}
          className="h-full rounded-full transition-colors"
          style={{
            background: `linear-gradient(90deg, ${scoreColor}, ${scoreColor}88)`,
            width: "0%",
            boxShadow: `0 0 12px ${scoreColor}40`,
          }}
        />
      </div>
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--stone)]">Endorsements</span>
          <span className="font-mono-data text-sm font-bold text-[var(--forest)]">+{endorsements}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--stone)]">Reports</span>
          <span className="font-mono-data text-sm font-bold text-[var(--terra)]">−{reports}</span>
        </div>
      </div>
    </div>
  );
}

function CommentItem({ log, index }: { log: InteractionLog; index: number }) {
  const isEndorsement = log.is_endorsement;
  const color = isEndorsement ? "var(--forest)" : "var(--terra)";
  const bgColor = isEndorsement ? "rgba(75, 110, 72, 0.06)" : "rgba(160, 82, 45, 0.06)";
  
  const formatDate = (timestamp: number) => {
    if (timestamp === 0) return "Unknown";
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div 
      className="rounded-xl p-4 border animate-fade-in-up"
      style={{ 
        background: bgColor, 
        borderColor: `${color}20`,
        animationDelay: `${index * 60}ms`,
        animationFillMode: 'both'
      }}
    >
      <div className="flex items-start gap-3">
        <div 
          className="flex items-center justify-center w-10 h-10 rounded-full shrink-0"
          style={{ background: `${color}15`, color }}
        >
          {isEndorsement ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M7 10v12" />
              <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
              <line x1="4" y1="22" x2="4" y2="15" />
            </svg>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span 
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color }}
            >
              {isEndorsement ? "Endorsed" : "Reported"}
            </span>
            <span className="text-[10px] text-[var(--stone)] font-mono-data">
              #{log.log_id}
            </span>
          </div>
          <p className="text-sm text-[var(--dark-ink)] leading-relaxed">
            &ldquo;{log.reason}&rdquo;
          </p>
          <p className="text-[10px] text-[var(--stone)] mt-3 font-mono-data flex items-center gap-2">
            <span>{formatDate(log.timestamp)}</span>
            <span className="h-1 w-1 rounded-full bg-[var(--faded-sage)]" />
            <span>Ledger #{log.timestamp}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function SharePanel({ walletId }: { walletId: number }) {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const profileUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/wallet/${walletId}`
    : `/wallet/${walletId}`;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      showToast("Profile link copied!", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast("Failed to copy link", "error");
    }
  }, [profileUrl, showToast]);

  return (
    <div className="rounded-xl border border-[var(--faded-sage)] bg-[var(--warm-cream)] p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--forest)]/10 text-[var(--forest)]">
            <ShareIcon />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--dark-ink)]">Share Profile</p>
            <p className="text-[10px] text-[var(--stone)]">Anyone can view this page</p>
          </div>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--faded-sage)] bg-white text-sm font-semibold text-[var(--dark-ink)] hover:bg-[var(--parchment)] transition-all cursor-pointer"
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
          {copied ? "Copied!" : "Copy Link"}
        </button>
      </div>
    </div>
  );
}

export default function WalletProfileCard({ walletIdOrAddress }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [reputation, setReputation] = useState<ReputationRecord | null>(null);
  const [walletHistory, setWalletHistory] = useState<InteractionLog[]>([]);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [, setWalletProvider] = useState<WalletProvider | null>(null);
  
  const [actionTab, setActionTab] = useState<"endorse" | "report" | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const connected = await checkConnection();
        setIsConnected(connected);
        if (connected) {
          setWalletProvider(getActiveWalletProvider());
          const addr = await getWalletAddress();
          setWalletAddress(addr);
        }
      } catch { /* ignore */ }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setNotFound(false);
      
      try {
        let resolvedId: number | null = null;
        const resolvedAddress = walletIdOrAddress;

        if (walletIdOrAddress.startsWith("G") && walletIdOrAddress.length > 20) {
          const result = await getWalletIdByAddress(walletIdOrAddress);
          let id = 0;
          if (typeof result === "bigint" || typeof result === "number") {
            id = Number(result);
          } else if (result && typeof result === "object" && "value" in result) {
            id = Number((result as { value: bigint | number }).value);
          }
          if (id === 0) {
            setNotFound(true);
            setLoading(false);
            return;
          }
          resolvedId = id;
        } else {
          resolvedId = parseInt(walletIdOrAddress);
          if (isNaN(resolvedId) || resolvedId < 1) {
            setNotFound(true);
            setLoading(false);
            return;
          }
        }

        const repResult = await viewWalletReputation(resolvedId);
        if (!repResult || typeof repResult !== "object") {
          setNotFound(true);
          setLoading(false);
          return;
        }

        const repObj = repResult as Record<string, unknown>;
        const rec: ReputationRecord = {
          wallet_id: resolvedId,
          score: Number(repObj.score ?? 0),
          endorsement_count: Number(repObj.endorsement_count ?? 0),
          report_count: Number(repObj.report_count ?? 0),
          last_updated: Number(repObj.last_updated ?? 0),
          is_active: Boolean(repObj.is_active),
          wallet_address: resolvedAddress,
        };
        setReputation(rec);

        try {
          const historyResult = await viewWalletHistory(resolvedId);
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
            setWalletHistory(logs.reverse());
          }
        } catch { /* ignore */ }
        
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [walletIdOrAddress]);

  useEffect(() => {
    if (cardRef.current && !loading && !notFound) {
      animate(cardRef.current, {
        opacity: [0, 1],
        translateY: [20, 0],
        duration: 800,
        easing: "easeOutCubic",
      });
    }
  }, [loading, notFound]);

  const handleAction = useCallback(async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!isConnected || !walletAddress || !reputation) {
      router.push("/login");
      return;
    }

    if (!actionReason.trim()) {
      showToast("Please enter a reason", "error");
      return;
    }

    createInkRipple(e);
    setIsSubmitting(true);

    try {
      showToast("Awaiting signature…", "info");
      
      if (actionTab === "endorse") {
        await endorseWallet(walletAddress, reputation.wallet_id, actionReason.trim());
        showToast("Endorsement recorded on-chain! (+1 score)", "success");
      } else if (actionTab === "report") {
        await reportWallet(walletAddress, reputation.wallet_id, actionReason.trim());
        showToast("Report submitted on-chain! (−3 score)", "success");
      }

      const newRep = await viewWalletReputation(reputation.wallet_id);
      if (newRep && typeof newRep === "object") {
        const newObj = newRep as Record<string, unknown>;
        setReputation(prev => prev ? {
          ...prev,
          score: Number(newObj.score ?? prev.score),
          endorsement_count: Number(newObj.endorsement_count ?? prev.endorsement_count),
          report_count: Number(newObj.report_count ?? prev.report_count),
        } : null);
      }

      const newHistory = await viewWalletHistory(reputation.wallet_id);
      if (newHistory && Array.isArray(newHistory)) {
        const logs: InteractionLog[] = newHistory.map((h: unknown) => {
          const obj = h as Record<string, unknown>;
          return {
            log_id: Number(obj.log_id ?? 0),
            target_wallet_id: Number(obj.target_wallet_id ?? 0),
            is_endorsement: Boolean(obj.is_endorsement ?? false),
            reason: String(obj.reason ?? ""),
            timestamp: Number(obj.timestamp ?? 0),
          };
        });
        setWalletHistory(logs.reverse());
      }

      setActionTab(null);
      setActionReason("");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Action failed", "error");
    } finally {
      setIsSubmitting(false);
    }
  }, [isConnected, walletAddress, reputation, actionTab, actionReason, router, showToast]);

  const truncate = (addr: string) => addr.length > 20 ? `${addr.slice(0, 8)}…${addr.slice(-6)}` : addr;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="h-12 w-12 rounded-full border-3 border-[var(--forest)] border-t-transparent animate-spin" />
        <p className="mt-4 text-sm text-[var(--stone)]">Loading reputation data…</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div ref={cardRef} className="card-botanical p-8 text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--terra)]/10 text-[var(--terra)] mb-4">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h3 className="text-xl font-heading font-bold text-[var(--dark-ink)] mb-2">Wallet Not Found</h3>
        <p className="text-sm text-[var(--stone)] mb-6">
          This wallet is not registered on the reputation graph yet.
        </p>
        <Link href="/dashboard" className="btn-forest cursor-pointer">
          Go to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div ref={cardRef} className="space-y-6">
      <div className="card-botanical shadow-paper-lg overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--forest)] via-[var(--sage)] to-[var(--amber-sap)]" />
        
        <div className="p-6">
          <div className="flex items-start gap-4 mb-6">
            <div 
              className="h-16 w-16 rounded-2xl flex items-center justify-center text-2xl font-heading font-bold text-white shadow-lg"
              style={{ 
                background: `linear-gradient(135deg, ${reputation!.score > 0 ? 'var(--forest)' : reputation!.score < 0 ? 'var(--terra)' : 'var(--amber-sap)'}, ${reputation!.score > 0 ? 'var(--moss)' : reputation!.score < 0 ? '#8B4513' : '#D4A84C'})`,
                boxShadow: `0 8px 24px ${reputation!.score > 0 ? 'rgba(75,110,72,0.35)' : reputation!.score < 0 ? 'rgba(160,82,45,0.35)' : 'rgba(201,168,76,0.35)'}`,
              }}
            >
              {reputation!.wallet_address?.slice(0, 2) || "W"}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-heading font-bold text-[var(--dark-ink)]">
                  Wallet #{reputation!.wallet_id}
                </h2>
                <span className={`badge ${reputation!.is_active ? "badge-forest" : "badge-terra"}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${reputation!.is_active ? "bg-[var(--forest)]" : "bg-[var(--terra)]"}`} />
                  {reputation!.is_active ? "Active" : "Inactive"}
                </span>
              </div>
              {reputation!.wallet_address && (
                <p className="font-mono-data text-xs text-[var(--stone)] bg-[var(--parchment)] px-2 py-1 rounded inline-block">
                  {truncate(reputation!.wallet_address)}
                </p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-[var(--faded-sage)] bg-[var(--parchment)] p-5">
            <ScoreBar
              score={reputation!.score}
              endorsements={reputation!.endorsement_count}
              reports={reputation!.report_count}
            />
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-[var(--stone)]">
            <span>Last Updated</span>
            <span className="font-mono-data">Ledger #{reputation!.last_updated}</span>
          </div>
        </div>

        <div className="border-t border-[var(--faded-sage)] px-6 py-3 bg-[var(--warm-cream)]/50">
          <div className="flex items-center gap-4 text-xs text-[var(--stone)]">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--forest)]" />
              +1 Endorsement
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--terra)]" />
              −3 Report
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--amber-sap)]" />
              3 Reports to neutralize
            </span>
          </div>
        </div>
      </div>

      <SharePanel walletId={reputation!.wallet_id} />

      {walletHistory.length > 0 && (
        <div className="card-botanical shadow-paper-lg overflow-hidden">
          <div className="border-b border-[var(--faded-sage)] px-6 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-heading font-bold text-[var(--dark-ink)]">Trust History</h3>
              <span className="text-xs text-[var(--stone)]">{walletHistory.length} records</span>
            </div>
          </div>
          <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
            {walletHistory.map((log, index) => (
              <CommentItem key={log.log_id} log={log} index={index} />
            ))}
          </div>
        </div>
      )}

      <div className="card-botanical shadow-paper-lg overflow-hidden">
        <div className="border-b border-[var(--faded-sage)] px-6 py-4">
          <h3 className="text-base font-heading font-bold text-[var(--dark-ink)]">Actions</h3>
          <p className="text-xs text-[var(--stone)] mt-1">
            {isConnected ? "You are connected. Submit an endorsement or report." : "Connect your wallet to endorse or report this wallet."}
          </p>
        </div>
        
        {!isConnected ? (
          <div className="p-6 text-center">
            <p className="text-sm text-[var(--stone)] mb-4">Connect your wallet to take action</p>
            <Link href="/login" className="btn-forest cursor-pointer">
              Connect Wallet
            </Link>
          </div>
        ) : walletAddress === reputation?.wallet_address ? (
          <div className="p-6 text-center">
            <p className="text-sm text-[var(--stone)]">You cannot endorse or report your own wallet.</p>
          </div>
        ) : actionTab === null ? (
          <div className="p-4 flex gap-3">
            <button
              onClick={() => setActionTab("endorse")}
              className="flex-1 btn-forest cursor-pointer"
            >
              <ThumbsUpIcon />
              Endorse
            </button>
            <button
              onClick={() => setActionTab("report")}
              className="flex-1 btn-terra cursor-pointer"
            >
              <FlagIcon />
              Report
            </button>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--stone)]">
                Reason / Comment ({actionTab === "endorse" ? "+1 score" : "−3 score"})
              </label>
              <textarea
                className="textarea-botanical"
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder={actionTab === "endorse" 
                  ? "e.g. Delivered on a P2P trade promptly..." 
                  : "e.g. Failed to send funds after trade agreed..."
                }
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setActionTab(null); setActionReason(""); }}
                className="flex-1 btn-outline cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAction}
                disabled={isSubmitting}
                className={`flex-1 ${actionTab === "endorse" ? "btn-forest" : "btn-terra"} cursor-pointer`}
              >
                {isSubmitting ? <><SpinnerIcon /> Submitting…</> : actionTab === "endorse" ? <><ThumbsUpIcon /> Submit Endorsement</> : <><FlagIcon /> Submit Report</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
