"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { animate } from "animejs";
import Link from "next/link";
import Image from "next/image";
import QRCode from "qrcode";
import { useToast } from "@/context/ToastContext";

interface ShareProfileCardProps {
  walletId: number;
  walletAddress?: string;
  score: number;
  endorsements: number;
  variant?: "full" | "compact";
}

function CopyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
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

function ExternalLinkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

export default function ShareProfileCard({
  walletId,
  walletAddress,
  score,
  endorsements,
  variant = "full",
}: ShareProfileCardProps) {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [isGeneratingQr, setIsGeneratingQr] = useState(variant === "full");
  const panelRef = useRef<HTMLDivElement>(null);
  
  const profileUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/wallet/${walletId}`
    : `/wallet/${walletId}`;

  useEffect(() => {
    if (variant === "full") {
      QRCode.toDataURL(profileUrl, {
        width: 160,
        margin: 2,
        color: {
          dark: "#2C2C2B",
          light: "#FAF9F6"
        },
        errorCorrectionLevel: "M"
      }).then((url) => {
        setQrDataUrl(url);
        setIsGeneratingQr(false);
      }).catch(() => {
        setIsGeneratingQr(false);
      });
    }
  }, [profileUrl, variant]);

  useEffect(() => {
    if (panelRef.current) {
      animate(panelRef.current, {
        opacity: [0, 1],
        translateY: [20, 0],
        duration: 800,
        easing: "easeOutCubic",
      });
    }
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      showToast("Profile link copied!", "success");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      showToast("Failed to copy link", "error");
    }
  }, [profileUrl, showToast]);

  const handleShareTwitter = useCallback(() => {
    const text = encodeURIComponent(`Check out this wallet's reputation on WalletGraph:\n\n🔍 Score: ${score === 0 ? "Neutral" : score > 0 ? `+${score} Trusted` : `${score} Flagged`}\n⭐ Endorsements: ${endorsements}\n\n`);
    const url = encodeURIComponent(profileUrl);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, "_blank");
  }, [profileUrl, score, endorsements]);

  const scoreLabel = score > 0 ? "Trusted" : score < 0 ? "Flagged" : "Neutral";
  const scoreColor = score > 0 ? "var(--forest)" : score < 0 ? "var(--terra)" : "var(--amber-sap)";

  if (variant === "compact") {
    return (
      <div ref={panelRef} className="flex items-center gap-3 p-3 rounded-xl border border-[var(--faded-sage)] bg-[var(--warm-cream)]/50">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--forest)]/10 text-[var(--forest)]">
          <ShareIcon />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-[var(--dark-ink)]">Share Profile</p>
          <p className="text-[10px] text-[var(--stone)] truncate">walletgraph.com/wallet/{walletId}</p>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--faded-sage)] bg-white text-xs font-semibold text-[var(--dark-ink)] hover:bg-[var(--parchment)] transition-all cursor-pointer"
        >
          {copied ? (
            <>
              <svg className="w-3.5 h-3.5 text-[var(--forest)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="text-[var(--forest)]">Copied</span>
            </>
          ) : (
            <>
              <CopyIcon />
              <span>Copy</span>
            </>
          )}
        </button>
        <Link
          href={`/wallet/${walletId}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--forest)] text-white text-xs font-semibold hover:bg-[var(--moss)] transition-all cursor-pointer"
        >
          <ExternalLinkIcon />
        </Link>
      </div>
    );
  }

  return (
    <div ref={panelRef} className="relative">
      <div className="absolute inset-0 bg-gradient-to-r from-[var(--forest)] via-[var(--sage)] to-[var(--amber-sap)] rounded-2xl blur-xl opacity-15" />
      
      <div className="relative card-botanical rounded-2xl overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--forest)] via-[var(--sage)] to-[var(--amber-sap)]" />
        
        <div className="p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--forest)]/10 text-[var(--forest)]">
              <ShareIcon />
            </div>
            <div>
              <p className="text-base font-heading font-bold text-[var(--dark-ink)]">Share Your Profile</p>
              <p className="text-[11px] text-[var(--stone)]">Let others view your reputation</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-5 sm:gap-6">
            <div className="flex-shrink-0 mx-auto sm:mx-0">
              <div className="relative p-3 rounded-xl bg-white border border-[var(--faded-sage)] shadow-[inset_0_2px_8px_rgba(0,0,0,0.04)]">
                {isGeneratingQr ? (
                  <div className="w-[120px] h-[120px] flex items-center justify-center">
                    <div className="h-6 w-6 rounded-full border-2 border-[var(--forest)] border-t-transparent animate-spin" />
                  </div>
                ) : qrDataUrl ? (
                  <Image src={qrDataUrl} alt="QR Code" width={120} height={120} className="rounded-lg" unoptimized />
                ) : (
                  <div className="w-[120px] h-[120px] flex items-center justify-center text-[var(--stone)] text-xs text-center p-4">
                    QR unavailable
                  </div>
                )}
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[var(--parchment)] px-2 py-0.5 rounded-full">
                  <span className="text-[9px] font-mono-data text-[var(--stone)]">Scan to view</span>
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-4">
              <div className="bg-[var(--parchment)] rounded-xl p-3 border border-[var(--faded-sage)]">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-mono-data uppercase tracking-wider text-[var(--stone)]">Your Profile Link</span>
                </div>
                <p className="font-mono-data text-xs text-[var(--dark-ink)]/70 break-all leading-relaxed">
                  {profileUrl}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleCopy}
                  className="group flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-[var(--faded-sage)] bg-white text-sm font-semibold text-[var(--dark-ink)] hover:bg-[var(--forest)]/5 hover:border-[var(--forest)]/30 transition-all cursor-pointer"
                >
                  {copied ? (
                    <>
                      <svg className="w-4 h-4 text-[var(--forest)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span className="text-[var(--forest)]">Copied!</span>
                    </>
                  ) : (
                    <>
                      <CopyIcon />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleShareTwitter}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[#1DA1F2] text-white text-sm font-semibold hover:bg-[#1a91da] transition-all cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  <span>Share</span>
                </button>
              </div>

              <Link
                href={`/wallet/${walletId}`}
                className="flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-xl border border-[var(--faded-sage)] bg-[var(--warm-cream)]/50 text-sm font-medium text-[var(--forest)] hover:bg-[var(--forest)]/5 transition-all cursor-pointer"
              >
                <ExternalLinkIcon />
                <span>View Full Profile</span>
              </Link>

              <div className="flex items-center justify-center gap-3 pt-1">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--parchment)] border border-[var(--faded-sage)]">
                  <span className="h-2 w-2 rounded-full" style={{ background: scoreColor }} />
                  <span className="text-[10px] font-semibold" style={{ color: scoreColor }}>{scoreLabel}</span>
                </div>
                <span className="text-[10px] text-[var(--stone)]">•</span>
                <span className="text-[10px] text-[var(--stone)]">{endorsements} endorsements</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-[var(--faded-sage)]/50 px-5 py-2.5 bg-[var(--warm-cream)]/30">
          <p className="text-[10px] text-[var(--stone)] text-center">
            Anyone with this link can view your reputation score and history
          </p>
        </div>
      </div>
    </div>
  );
}