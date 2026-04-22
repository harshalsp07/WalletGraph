"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { animate } from "animejs";
import { useToast } from "@/context/ToastContext";
import {
  registerWallet,
  endorseWallet,
  reportWallet,
  viewWalletReputation,
  getWalletIdByAddress,
  viewWalletHistory,
  CONTRACT_ADDRESS,
} from "@/hooks/contract";
import { useRecentSearches, useRecentInteractions } from "@/hooks/useRecentSearches";
import { MAX_REASON_LENGTH } from "@/lib/constants";
import { CategorySelect, ReasonTemplates, CharacterCounter } from "./ui/CategoryBadge";

// ── Types ────────────────────────────────────────────────────

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

// ── Icons ────────────────────────────────────────────────────

function SpinnerIcon() {
  return (
    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function UserPlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
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

function GraphIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="3" />
      <circle cx="5" cy="19" r="3" />
      <circle cx="19" cy="19" r="3" />
      <line x1="12" y1="8" x2="5" y2="16" />
      <line x1="12" y1="8" x2="19" y2="16" />
    </svg>
  );
}

// ── Score Bar Component ──────────────────────────────────────

function ScoreBar({ score, endorsements, reports }: { score: number; endorsements: number; reports: number }) {
  const scoreRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scoreRef.current) {
      const obj = { val: 0 };
      animate(obj, {
        val: score,
        round: 1,
        duration: 1200,
        easing: "easeOutExpo",
        onUpdate: () => {
          if (scoreRef.current) scoreRef.current.textContent = String(Math.round(obj.val));
        },
      });
    }
    if (barRef.current) {
      animate(barRef.current, {
        width: [`0%`, `${Math.min(Math.abs(score) * 5, 100)}%`],
        duration: 1000,
        easing: "easeOutExpo",
        delay: 300,
      });
    }
  }, [score]);

  const scoreColor = score > 0 ? "var(--forest)" : score < 0 ? "var(--terra)" : "var(--amber-sap)";
  const scoreLabel = score > 0 ? "Trusted" : score < 0 ? "Flagged" : "Neutral";

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs text-[var(--stone)] mb-1">Reputation Score</p>
          <div className="flex items-baseline gap-2">
            <span
              ref={scoreRef}
              className="text-4xl font-heading font-bold animate-score-glow"
              style={{ color: scoreColor }}
            >
              {score}
            </span>
            <span
              className="text-sm font-semibold px-2 py-0.5 rounded-full"
              style={{
                color: scoreColor,
                background: `${scoreColor}15`,
              }}
            >
              {scoreLabel}
            </span>
          </div>
        </div>
        <div className="text-right space-y-1">
          <div className="flex items-center gap-2 justify-end">
            <span className="text-xs text-[var(--stone)]">Endorsements</span>
            <span className="font-mono-data text-sm font-semibold text-[var(--forest)]">+{endorsements}</span>
          </div>
          <div className="flex items-center gap-2 justify-end">
            <span className="text-xs text-[var(--stone)]">Reports</span>
            <span className="font-mono-data text-sm font-semibold text-[var(--terra)]">−{reports}</span>
          </div>
        </div>
      </div>
      <div className="h-2 rounded-full bg-[var(--parchment)] overflow-hidden">
        <div
          ref={barRef}
          className="h-full rounded-full transition-colors"
          style={{
            background: `linear-gradient(90deg, ${scoreColor}, ${scoreColor}88)`,
            width: "0%",
          }}
        />
      </div>
    </div>
  );
}

// ── Comment Item Component ──────────────────────────────────────

function CommentItem({ log, index }: { log: InteractionLog; index: number }) {
  const isEndorsement = log.is_endorsement;
  const color = isEndorsement ? "var(--forest)" : "var(--terra)";
  const bgColor = isEndorsement ? "rgba(75, 110, 72, 0.08)" : "rgba(160, 82, 45, 0.08)";
  
  const formatDate = (timestamp: number) => {
    if (timestamp === 0) return "Unknown";
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div 
      className="rounded-lg p-4 border animate-fade-in-up"
      style={{ 
        background: bgColor, 
        borderColor: `${color}20`,
        animationDelay: `${index * 80}ms`,
        animationFillMode: 'both'
      }}
    >
      <div className="flex items-start gap-3">
        <div 
          className="flex items-center justify-center w-8 h-8 rounded-full shrink-0"
          style={{ background: `${color}15`, color }}
        >
          {isEndorsement ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M7 10v12" />
              <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
              <line x1="4" y1="22" x2="4" y2="15" />
            </svg>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span 
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color }}
            >
              {isEndorsement ? "Endorsement" : "Report"}
            </span>
            <span className="text-[10px] text-[var(--stone)] font-mono-data">
              #{log.log_id}
            </span>
          </div>
          <p className="text-sm text-[var(--dark-ink)] leading-relaxed">
            &ldquo;{log.reason}&rdquo;
          </p>
          <p className="text-[10px] text-[var(--stone)] mt-2 font-mono-data">
            {formatDate(log.timestamp)} · Ledger #{log.timestamp}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Ink Ripple Handler ───────────────────────────────────────

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

// ── Helper: resolve wallet input to numeric ID ───────────────

const isStellarAddress = (input: string) => input.startsWith("G") && input.length > 20;

async function resolveWalletInput(
  input: string,
  walletAddress: string | null,
  showToast: (msg: string, type?: "success" | "error" | "info") => void
): Promise<number | null> {
  const trimmed = input.trim();
  if (!trimmed) {
    showToast("Enter a wallet ID or Stellar address", "error");
    return null;
  }

  if (isStellarAddress(trimmed)) {
    const result = await getWalletIdByAddress(trimmed, walletAddress || undefined);
    let walletId = 0;
    if (typeof result === "bigint" || typeof result === "number") {
      walletId = Number(result);
    } else if (result && typeof result === "object" && "value" in result) {
      const resultWithValue = result as { value: bigint | number };
      walletId = Number(resultWithValue.value);
    } else if (result && typeof result === "object") {
      const resultObj = result as Record<string, unknown>;
      walletId = Number(resultObj.value ?? resultObj);
    }
    if (walletId === 0) {
      showToast("This wallet address is not registered yet.", "error");
      return null;
    }
    return walletId;
  }

  const id = parseInt(trimmed);
  if (isNaN(id) || id < 1) {
    showToast("Enter a valid wallet ID (number) or Stellar address (starts with G)", "error");
    return null;
  }
  return id;
}

// ── Main Component ───────────────────────────────────────────

type Tab = "lookup" | "register" | "endorse" | "report";

interface Props {
  walletAddress: string | null;
  onConnect: () => void;
  isConnecting: boolean;
}

export default function ReputationDashboard({ walletAddress, onConnect, isConnecting }: Props) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>("lookup");
  const cardRef = useRef<HTMLDivElement>(null);

  // Lookup state
  const [lookupInput, setLookupInput] = useState("");
  const [isLooking, setIsLooking] = useState(false);
  const [reputation, setReputation] = useState<ReputationRecord | null>(null);
  const [walletHistory, setWalletHistory] = useState<InteractionLog[]>([]);

  // Register state
  const [isRegistering, setIsRegistering] = useState(false);
  const [registeredId, setRegisteredId] = useState<number | null>(null);

// Endorse state
const [endorseInput, setEndorseInput] = useState("");
const [endorseReason, setEndorseReason] = useState("");
const [endorseCategory, setEndorseCategory] = useState<0|1|2|3|4|5>(0);
const [isEndorsing, setIsEndorsing] = useState(false);

// Report state  
const [reportInput, setReportInput] = useState("");
const [reportReason, setReportReason] = useState("");
const [reportCategory, setReportCategory] = useState<0|1|2|3|4|5>(0);
const [isReporting, setIsReporting] = useState(false);

// Recent searches hook
const { recentLookups, addLookup } = useRecentSearches();
const { addInteraction } = useRecentInteractions();

  // Stagger-in animation on mount
  useEffect(() => {
    if (cardRef.current) {
      animate(cardRef.current, {
        translateY: [30, 0],
        opacity: [0, 1],
        duration: 800,
        easing: "easeOutCubic",
        delay: 200,
      });
    }
  }, []);

  // Tab change animation
  useEffect(() => {
    if (cardRef.current) {
      const inner = cardRef.current.querySelector(".tab-content");
      if (inner) {
        animate(inner, {
          opacity: [0, 1],
          translateY: [8, 0],
          scale: [0.99, 1],
          duration: 500,
          easing: "easeOutSine",
        });
      }
    }
  }, [activeTab]);

  const truncate = (addr: string) => `${addr.slice(0, 8)}…${addr.slice(-6)}`;

  // ── Handlers ───────────────────────────────────────────────

  const handleLookup = useCallback(async () => {
    const walletId = await resolveWalletInput(lookupInput, walletAddress, showToast);
    if (walletId === null) return;
    
    setIsLooking(true);
    setReputation(null);
    setWalletHistory([]);

    try {
      const result = await viewWalletReputation(walletId, walletAddress || undefined);
      if (result && typeof result === "object") {
        const resultObj = result as Record<string, unknown>;
        const rec: ReputationRecord = {
          wallet_id: Number(resultObj.wallet_id ?? walletId),
          score: Number(resultObj.score ?? 0),
          endorsement_count: Number(resultObj.endorsement_count ?? 0),
          report_count: Number(resultObj.report_count ?? 0),
          last_updated: Number(resultObj.last_updated ?? 0),
          is_active: Boolean(resultObj.is_active),
        };
        setReputation(rec);
        
        addLookup(lookupInput, walletAddress || undefined);

        try {
          const historyResult = await viewWalletHistory(walletId, walletAddress || undefined);
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
        } catch {
          // History not available
        }
      } else {
        showToast("Wallet not found or not registered", "error");
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Query failed", "error");
    } finally {
      setIsLooking(false);
    }
  }, [lookupInput, walletAddress, showToast, addLookup]);

  const handleRegister = useCallback(async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!walletAddress) return showToast("Connect wallet first", "error");
    createInkRipple(e);
    setIsRegistering(true);
    showToast("Awaiting signature…", "info");
    setRegisteredId(null);
    try {
      await registerWallet(walletAddress);
      const walletIdResult = await getWalletIdByAddress(walletAddress, walletAddress);
      let walletId: number | null = null;
      if (typeof walletIdResult === "bigint" || typeof walletIdResult === "number") {
        walletId = Number(walletIdResult);
      } else if (walletIdResult && typeof walletIdResult === "object" && "value" in walletIdResult) {
        const resultWithValue = walletIdResult as { value: bigint | number };
        walletId = Number(resultWithValue.value);
      } else if (walletIdResult && typeof walletIdResult === "object") {
        const resultObj = walletIdResult as Record<string, unknown>;
        walletId = Number(resultObj.value ?? resultObj);
      }
      
      if (walletId && walletId > 0) {
        setRegisteredId(walletId);
        showToast("Wallet registered on-chain!", "success");
      } else {
        showToast("Registration completed!", "success");
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Registration failed", "error");
    } finally {
      setIsRegistering(false);
    }
  }, [walletAddress, showToast]);

  const handleEndorse = useCallback(async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!walletAddress) return showToast("Connect wallet first", "error");
    if (!endorseInput.trim() || !endorseReason.trim()) return showToast("Fill in all fields", "error");
    
    createInkRipple(e);
    setIsEndorsing(true);

    try {
      showToast("Resolving wallet…", "info");
      const id = await resolveWalletInput(endorseInput, walletAddress, showToast);
      if (id === null) { setIsEndorsing(false); return; }

      const rep = await viewWalletReputation(id, walletAddress) as unknown as Record<string, unknown>;
      if (!rep || !rep.is_active || Number(rep.wallet_id) === 0) {
        throw new Error(`Target wallet ID ${id} does not exist or is inactive.`);
      }

      showToast("Awaiting signature…", "info");
      await endorseWallet(walletAddress, id, endorseReason.trim(), endorseCategory);
      showToast("Endorsement recorded on-chain! (+1 score)", "success");
      
      addLookup(endorseInput, walletAddress);
      addInteraction(id, walletAddress, endorseInput.startsWith("G") ? `${endorseInput.slice(0,6)}…` : String(id), "endorse");
      
      setEndorseInput("");
      setEndorseReason("");
      setEndorseCategory(0);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Endorsement failed", "error");
    } finally {
      setIsEndorsing(false);
    }
  }, [walletAddress, endorseInput, endorseReason, endorseCategory, showToast, addLookup, addInteraction]);

  const handleReport = useCallback(async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!walletAddress) return showToast("Connect wallet first", "error");
    if (!reportInput.trim() || !reportReason.trim()) return showToast("Fill in all fields", "error");
    
    createInkRipple(e);
    setIsReporting(true);

    try {
      showToast("Resolving wallet…", "info");
      const id = await resolveWalletInput(reportInput, walletAddress, showToast);
      if (id === null) { setIsReporting(false); return; }

      const rep = await viewWalletReputation(id, walletAddress) as unknown as Record<string, unknown>;
      if (!rep || !rep.is_active || Number(rep.wallet_id) === 0) {
        throw new Error(`Target wallet ID ${id} does not exist or is inactive.`);
      }

      showToast("Awaiting signature…", "info");
      await reportWallet(walletAddress, id, reportReason.trim(), reportCategory);
      showToast("Report submitted on-chain! (−3 score)", "success");
      
      addLookup(reportInput, walletAddress);
      addInteraction(id, walletAddress, reportInput.startsWith("G") ? `${reportInput.slice(0,6)}…` : String(id), "report");
      
      setReportInput("");
      setReportReason("");
      setReportCategory(0);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Report failed", "error");
    } finally {
      setIsReporting(false);
    }
  }, [walletAddress, reportInput, reportReason, reportCategory, showToast, addLookup, addInteraction]);

  // ── Tab config ─────────────────────────────────────────────

  const tabs: { key: Tab; label: string; icon: React.ReactNode; color: string }[] = [
    { key: "lookup", label: "Lookup", icon: <SearchIcon />, color: "var(--sage)" },
    { key: "register", label: "Register", icon: <UserPlusIcon />, color: "var(--forest)" },
    { key: "endorse", label: "Endorse", icon: <ThumbsUpIcon />, color: "var(--moss)" },
    { key: "report", label: "Report", icon: <FlagIcon />, color: "var(--terra)" },
  ];

  return (
    <div ref={cardRef} className="w-full" style={{ opacity: 0 }}>
      {/* Main Card */}
      <div className="card-botanical shadow-paper-lg overflow-hidden relative">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[var(--forest)]/25 via-[var(--sage)]/30 to-[var(--terra)]/20 pointer-events-none z-10" />
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--faded-sage)] px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--forest)]/15 to-[var(--sage)]/15 border border-[var(--faded-sage)]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--forest)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-heading font-bold text-[var(--dark-ink)]">Reputation Explorer</h3>
              <p className="text-[10px] text-[var(--stone)] font-mono-data mt-0.5 hidden sm:block">{truncate(CONTRACT_ADDRESS)}</p>
            </div>
          </div>
          <span className="badge badge-sage">Soroban</span>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--faded-sage)] px-1 sm:px-2 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => { setActiveTab(t.key); setReputation(null); setRegisteredId(null); setWalletHistory([]); }}
              className={`relative flex items-center gap-1 sm:gap-2 px-3 sm:px-5 py-3 sm:py-3.5 text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === t.key
                  ? "text-[var(--dark-ink)]"
                  : "text-[var(--stone)] hover:text-[var(--dark-ink)]/70"
              }`}
            >
              <span style={activeTab === t.key ? { color: t.color } : undefined}>{t.icon}</span>
              <span className="hidden sm:inline">{t.label}</span>
              {activeTab === t.key && (
                <span
                  className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full"
                  style={{ background: t.color }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-6 tab-content">
          {/* ── LOOKUP ── */}
          {activeTab === "lookup" && (
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--stone)]">
                  Wallet ID or Stellar Address
                </label>
                <input
                  className="input-botanical"
                  value={lookupInput}
                  onChange={(e) => setLookupInput(e.target.value)}
                  placeholder="e.g. GABC123... or 1"
                  type="text"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && lookupInput.trim()) {
                      handleLookup();
                    }
                  }}
                />
                {recentLookups.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <span className="text-[10px] text-[var(--stone)]">Recent:</span>
                    {recentLookups.slice(0, 5).map((lookup, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setLookupInput(lookup.address || lookup.displayId)}
                        className="text-[10px] px-2 py-1 rounded-full bg-[var(--parchment)] border border-[var(--faded-sage)] text-[var(--stone)] hover:bg-[var(--forest)]/5 hover:border-[var(--forest)]/30 hover:text-[var(--forest)] transition-all"
                      >
                        {lookup.displayId}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button onClick={handleLookup} disabled={isLooking} className="btn-forest w-full cursor-pointer">
                {isLooking ? <><SpinnerIcon /> Querying…</> : <><SearchIcon /> Lookup Reputation</>}
              </button>

              {reputation && (
                <div className="rounded-xl border border-[var(--faded-sage)] bg-[var(--parchment)] overflow-hidden animate-fade-in-up">
                  <div className="border-b border-[var(--faded-sage)] px-4 py-3 flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--stone)]">Wallet #{reputation.wallet_id}</span>
                    <span className={`badge ${reputation.is_active ? "badge-forest" : "badge-terra"}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${reputation.is_active ? "bg-[var(--forest)]" : "bg-[var(--terra)]"}`} />
                      {reputation.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="p-5">
                    <ScoreBar
                      score={reputation.score}
                      endorsements={reputation.endorsement_count}
                      reports={reputation.report_count}
                    />
                    <div className="mt-4 pt-4 border-t border-[var(--faded-sage)] flex items-center justify-between">
                      <span className="text-xs text-[var(--stone)]">Last Updated</span>
                      <span className="font-mono-data text-xs text-[var(--dark-ink)]/60">Ledger #{reputation.last_updated}</span>
                    </div>

                    <div className="mt-4 pt-4 border-t border-[var(--faded-sage)]">
                      <a
                        href={`/wallet/${reputation.wallet_id}`}
                        className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border-2 border-dashed border-[var(--faded-sage)] text-sm font-semibold text-[var(--forest)] hover:bg-[var(--forest)]/5 hover:border-[var(--forest)]/40 transition-all"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="18" cy="5" r="3" />
                          <circle cx="6" cy="12" r="3" />
                          <circle cx="18" cy="19" r="3" />
                          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                        </svg>
                        View Public Profile
                      </a>
                    </div>

                    {walletHistory.length > 0 && (
                      <div className="mt-5 pt-4 border-t border-[var(--faded-sage)] space-y-4 animate-fade-in-up">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-[var(--dark-ink)]">Trust History</h4>
                          <span className="text-xs text-[var(--stone)]">{walletHistory.length} records</span>
                        </div>
                        <div className="space-y-3">
                          {walletHistory.map((log, index) => (
                            <CommentItem key={log.log_id} log={log} index={index} />
                          ))}
                        </div>
                        <a
                          href={`/graph?id=${reputation.wallet_id}`}
                          className="flex items-center justify-center gap-2 w-full py-3 mt-4 rounded-xl border-2 border-dashed border-[var(--faded-sage)] text-sm font-semibold text-[var(--forest)] hover:bg-[var(--forest)]/5 hover:border-[var(--forest)]/40 transition-all"
                        >
                          <GraphIcon />
                          View Network Graph
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── REGISTER ── */}
          {activeTab === "register" && (
            <div className="space-y-5">
              <div className="rounded-xl bg-[var(--parchment)] border border-[var(--faded-sage)] p-5 text-center space-y-3">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--forest)]/10 border border-[var(--forest)]/20">
                  <UserPlusIcon />
                </div>
                <p className="text-sm text-[var(--dark-ink)]/80 max-w-sm mx-auto leading-relaxed">
                  Register your wallet on-chain. Your address maps to a unique <span className="font-mono-data font-semibold">wallet_id</span> that others can use to endorse or report.
                </p>
                <div className="flex items-center justify-center gap-2 text-xs text-[var(--stone)]">
                  <span className="h-2 w-2 rounded-full bg-[var(--forest)] animate-pulse" />
                  Same address always = same ID
                </div>
              </div>

              {registeredId !== null && (
                <div className="rounded-xl bg-[var(--forest)]/5 border border-[var(--forest)]/20 p-4 text-center animate-fade-in-up">
                  <p className="text-xs text-[var(--stone)] mb-1">Your Wallet ID</p>
                  <p className="text-3xl font-heading font-bold text-[var(--forest)]">{registeredId}</p>
                  <p className="text-xs text-[var(--stone)] mt-2">This ID is permanently linked to your wallet address.</p>
                </div>
              )}

              {walletAddress ? (
                <button onClick={handleRegister} disabled={isRegistering} className="btn-forest w-full cursor-pointer">
                  {isRegistering ? <><SpinnerIcon /> Registering…</> : <><UserPlusIcon /> Register My Wallet</>}
                </button>
              ) : (
                <button onClick={onConnect} disabled={isConnecting} className="btn-outline w-full cursor-pointer">
                  Connect wallet to register
                </button>
              )}
            </div>
          )}

          {/* ── ENDORSE ── */}
          {activeTab === "endorse" && (
            <div className="space-y-5">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--stone)]">
                    Wallet ID or Address to Endorse
                  </label>
                  <input
                    className="input-botanical"
                    value={endorseInput}
                    onChange={(e) => setEndorseInput(e.target.value)}
                    placeholder="e.g. GABC123... or 1"
                    type="text"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {recentLookups.filter(l => l.id !== "id" || l.address).slice(0, 4).map((lookup, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setEndorseInput(lookup.address || lookup.displayId)}
                        className="text-[10px] px-2 py-1 rounded-full bg-[var(--parchment)] border border-[var(--faded-sage)] text-[var(--stone)] hover:bg-[var(--forest)]/5 hover:border-[var(--forest)]/30 hover:text-[var(--forest)] transition-all"
                      >
                        {lookup.displayId}
                      </button>
                    ))}
                  </div>
                </div>

                <CategorySelect 
                  value={endorseCategory} 
                  onChange={(v) => setEndorseCategory(v as 0|1|2|3|4|5)} 
                  label="Category"
                  compact
                />

                <div className="space-y-2">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--stone)]">
                    Reason / Comment
                  </label>
                  <textarea
                    className="textarea-botanical"
                    value={endorseReason}
                    onChange={(e) => setEndorseReason(e.target.value.slice(0, MAX_REASON_LENGTH))}
                    placeholder="e.g. Delivered on a P2P trade promptly and honestly."
                  />
                  <CharacterCounter value={endorseReason} max={MAX_REASON_LENGTH} />
                  <ReasonTemplates type="endorse" onSelect={(r) => setEndorseReason(r)} />
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-lg bg-[var(--forest)]/5 border border-[var(--forest)]/15 px-3 py-2">
                <ThumbsUpIcon />
                <span className="text-xs text-[var(--forest)]">Each endorsement adds <span className="font-mono-data font-bold">+1</span> to the wallet&apos;s score</span>
              </div>

              {walletAddress ? (
                <button onClick={handleEndorse} disabled={isEndorsing} className="btn-forest w-full cursor-pointer">
                  {isEndorsing ? <><SpinnerIcon /> Endorsing…</> : <><ThumbsUpIcon /> Submit Endorsement</>}
                </button>
              ) : (
                <button onClick={onConnect} disabled={isConnecting} className="btn-outline w-full cursor-pointer">
                  Connect wallet to endorse
                </button>
              )}
            </div>
          )}

          {/* ── REPORT ── */}
          {activeTab === "report" && (
            <div className="space-y-5">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--stone)]">
                    Wallet ID or Address to Report
                  </label>
                  <input
                    className="input-botanical"
                    value={reportInput}
                    onChange={(e) => setReportInput(e.target.value)}
                    placeholder="e.g. GABC123... or 2"
                    type="text"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {recentLookups.filter(l => l.id !== "id" || l.address).slice(0, 4).map((lookup, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setReportInput(lookup.address || lookup.displayId)}
                        className="text-[10px] px-2 py-1 rounded-full bg-[var(--parchment)] border border-[var(--faded-sage)] text-[var(--stone)] hover:bg-[var(--terra)]/5 hover:border-[var(--terra)]/30 hover:text-[var(--terra)] transition-all"
                      >
                        {lookup.displayId}
                      </button>
                    ))}
                  </div>
                </div>

                <CategorySelect 
                  value={reportCategory} 
                  onChange={(v) => setReportCategory(v as 0|1|2|3|4|5)} 
                  label="Category"
                  compact
                />

                <div className="space-y-2">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--stone)]">
                    Reason / Comment
                  </label>
                  <textarea
                    className="textarea-botanical"
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value.slice(0, MAX_REASON_LENGTH))}
                    placeholder="e.g. Failed to send funds after trade was agreed upon."
                  />
                  <CharacterCounter value={reportReason} max={MAX_REASON_LENGTH} />
                  <ReasonTemplates type="report" onSelect={(r) => setReportReason(r)} />
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-lg bg-[var(--terra)]/5 border border-[var(--terra)]/15 px-3 py-2">
                <FlagIcon />
                <span className="text-xs text-[var(--terra)]">Each report deducts <span className="font-mono-data font-bold">−3</span> from the wallet&apos;s score</span>
              </div>

              {walletAddress ? (
                <button onClick={handleReport} disabled={isReporting} className="btn-terra w-full cursor-pointer">
                  {isReporting ? <><SpinnerIcon /> Reporting…</> : <><FlagIcon /> Submit Report</>}
                </button>
              ) : (
                <button onClick={onConnect} disabled={isConnecting} className="btn-outline w-full cursor-pointer">
                  Connect wallet to report
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--faded-sage)] px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-0">
          <p className="text-[10px] text-[var(--stone)]">Wallet Reputation Graph · Soroban</p>
          <div className="flex items-center gap-3 text-[10px] text-[var(--stone)]">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--forest)]" />
              +1 Endorse
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--terra)]" />
              −3 Report
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}