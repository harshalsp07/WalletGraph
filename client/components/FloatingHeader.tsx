"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { NETWORK } from "@/hooks/contract";

export default function FloatingHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-6 py-4 transition-all duration-500 pointer-events-none`}
    >
      <div 
        className={`flex items-center gap-3 transition-all duration-500 pointer-events-auto ${
          scrolled 
            ? "bg-[var(--warm-cream)]/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-[0_4px_20px_rgba(44,44,43,0.08)] border border-[var(--faded-sage)]/50 -ml-2" 
            : ""
        }`}
      >
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative">
            <div className="absolute inset-0 bg-[var(--forest)]/20 blur-[8px] rounded-xl group-hover:bg-[var(--forest)]/40 transition-colors duration-500" />
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--forest)] to-[var(--moss)] shadow-[inset_0_2px_4px_rgba(255,255,255,0.15),inset_0_-2px_4px_rgba(0,0,0,0.15),0_4px_12px_rgba(75,110,72,0.3)]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
            </div>
          </div>
          
          <div className="flex flex-col">
            <div className="relative">
              <span 
                className="text-xl font-heading font-bold tracking-tight text-[var(--dark-ink)] relative z-10"
                style={{
                  textShadow: "0 1px 0 rgba(255,255,255,0.8), 0 -1px 0 rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.05)",
                }}
              >
                WalletGraph
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[9px] font-mono-data uppercase tracking-[0.15em] text-[var(--stone)]/60">
                Botanical Ledger
              </span>
            </div>
          </div>
        </Link>
      </div>

      <div className="pointer-events-auto">
        <div className={`relative group hidden sm:block transition-all duration-500 ${scrolled ? "opacity-0 translate-y-[-10px]" : "opacity-100"}`}>
          <div className="absolute inset-0 bg-[var(--forest)]/10 blur-[4px] rounded-full" />
          <div className="relative flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--faded-sage)] bg-[var(--warm-cream)]/80 backdrop-blur-sm shadow-[inset_0_1px_2px_rgba(0,0,0,0.03),0_2px_4px_rgba(75,110,72,0.08)]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--forest)] opacity-50" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--forest)]" />
            </span>
            <span className="text-[10px] font-mono-data font-semibold text-[var(--forest)] uppercase tracking-wider">
              {NETWORK}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
