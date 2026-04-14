"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NETWORK } from "@/hooks/contract";

interface NavbarProps {
  walletAddress: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
  isConnecting: boolean;
}

export default function Navbar({
  walletAddress,
  onConnect,
  onDisconnect,
  isConnecting,
}: NavbarProps) {
  const [copied, setCopied] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!showDropdown) return;
    const close = () => setShowDropdown(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [showDropdown]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleCopy = useCallback(async () => {
    if (!walletAddress) return;
    await navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [walletAddress]);

  const truncate = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`;

  const isActive = (path: string) => pathname === path;

  return (
    <nav
      className={`sticky top-0 z-50 w-full transition-all duration-500 animate-fade-in-down ${
        scrolled
          ? "bg-[var(--parchment)]/95 backdrop-blur-2xl shadow-[0_8px_40px_rgba(44,44,43,0.12)] border-b border-[var(--faded-sage)]/30"
          : "bg-[var(--parchment)]/80 backdrop-blur-lg"
      }`}
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-[var(--forest)]/20 blur-[8px] rounded-xl" />
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--forest)] to-[var(--moss)] shadow-[inset_0_2px_4px_rgba(255,255,255,0.15),inset_0_-2px_4px_rgba(0,0,0,0.15),0_4px_12px_rgba(75,110,72,0.3)]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
              </div>
              {walletAddress && (
                <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--forest)] opacity-60" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-[var(--forest)]" />
                </span>
              )}
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
                <span 
                  className="absolute left-[1px] top-[1px] text-xl font-heading font-bold tracking-tight text-[var(--faded-sage)]/30 -z-0"
                >
                  WalletGraph
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[9px] font-mono-data uppercase tracking-[0.15em] text-[var(--stone)]/60">
                  Stellar · Soroban
                </span>
              </div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <Link
              href="/"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive("/") 
                  ? "text-[var(--forest)] bg-[var(--forest)]/10" 
                  : "text-[var(--stone)] hover:text-[var(--dark-ink)] hover:bg-[var(--faded-sage)]/30"
              }`}
            >
              Home
            </Link>
            {walletAddress && (
              <Link
                href="/dashboard"
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive("/dashboard") 
                    ? "text-[var(--forest)] bg-[var(--forest)]/10" 
                    : "text-[var(--stone)] hover:text-[var(--dark-ink)] hover:bg-[var(--faded-sage)]/30"
                }`}
              >
                Dashboard
              </Link>
            )}
            {walletAddress && (
              <Link
                href={`/graph?address=${walletAddress}`}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive("/graph") 
                    ? "text-[var(--forest)] bg-[var(--forest)]/10" 
                    : "text-[var(--stone)] hover:text-[var(--dark-ink)] hover:bg-[var(--faded-sage)]/30"
                }`}
              >
                Graph
              </Link>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative group hidden sm:block">
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

            {walletAddress ? (
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowDropdown(!showDropdown); }}
                  className="flex items-center gap-2 rounded-xl border border-[var(--faded-sage)] bg-[var(--warm-cream)]/80 backdrop-blur-sm px-3 py-2 text-sm transition-all hover:border-[var(--sage)] hover:shadow-[0_4px_16px_rgba(44,44,43,0.1)] cursor-pointer group"
                  style={{
                    boxShadow: "inset 0 1px 3px rgba(0,0,0,0.03), 0 2px 8px rgba(0,0,0,0.04)",
                  }}
                >
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[var(--forest)] via-[var(--moss)] to-[var(--sage)] p-[2px] shadow-[0_2px_6px_rgba(75,110,72,0.25)]">
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-[var(--warm-cream)]">
                      <span className="text-[9px] font-bold text-[var(--dark-ink)] font-mono-data">
                        {walletAddress.slice(0, 2)}
                      </span>
                    </div>
                  </div>
                  <span className="font-mono-data text-sm text-[var(--dark-ink)]/80 font-medium hidden sm:inline">
                    {truncate(walletAddress)}
                  </span>
                  <svg
                    width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                    className={`text-[var(--stone)] transition-transform duration-300 ${showDropdown ? "rotate-180" : ""} group-hover:text-[var(--forest)]`}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {showDropdown && (
                  <div
                    className="absolute right-0 top-full mt-3 w-72 overflow-hidden rounded-2xl border border-[var(--faded-sage)] bg-[var(--warm-cream)]/95 backdrop-blur-xl shadow-[0_12px_40px_rgba(44,44,43,0.15)] animate-fade-in-up"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="px-5 py-4 border-b border-[var(--faded-sage)]/50 bg-[var(--parchment)]/80 backdrop-blur-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-2 w-2 rounded-full bg-[var(--forest)]" />
                        <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--stone)] font-semibold">
                          Connected Wallet
                        </p>
                      </div>
                      <div className="bg-[var(--parchment)] rounded-lg p-3 border border-[var(--faded-sage)]">
                        <p className="font-mono-data text-xs text-[var(--dark-ink)]/70 break-all leading-relaxed">
                          {walletAddress}
                        </p>
                      </div>
                    </div>
                    
                    <div className="p-2">
                      <button
                        onClick={() => { handleCopy(); setShowDropdown(false); }}
                        className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-[var(--dark-ink)] hover:bg-[var(--forest)]/5 hover:text-[var(--forest)] transition-all cursor-pointer group"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--parchment)] border border-[var(--faded-sage)] group-hover:bg-[var(--forest)]/10">
                          {copied ? (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--forest)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                            </svg>
                          )}
                        </div>
                        <span className="font-medium">{copied ? "Copied!" : "Copy Address"}</span>
                      </button>
                      
                      {pathname !== "/dashboard" && (
                        <Link
                          href="/dashboard"
                          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-[var(--forest)] hover:bg-[var(--forest)]/5 transition-all cursor-pointer group"
                          onClick={() => setShowDropdown(false)}
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--parchment)] border border-[var(--faded-sage)] group-hover:bg-[var(--forest)]/10">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect width="7" height="9" x="3" y="3" rx="1" />
                              <rect width="7" height="5" x="14" y="3" rx="1" />
                              <rect width="7" height="9" x="14" y="12" rx="1" />
                              <rect width="7" height="5" x="3" y="16" rx="1" />
                            </svg>
                          </div>
                          <span className="font-medium">Dashboard</span>
                        </Link>
                      )}
                      
                      <button
                        onClick={() => { onDisconnect(); setShowDropdown(false); }}
                        className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-[var(--terra)] hover:bg-[var(--terra)]/5 transition-all cursor-pointer group"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--parchment)] border border-[var(--faded-sage)]">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
                            <line x1="12" y1="2" x2="12" y2="12" />
                          </svg>
                        </div>
                        <span className="font-medium">Disconnect</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onConnect}
                disabled={isConnecting}
                className="group relative cursor-pointer hidden sm:flex"
              >
                <div className="absolute inset-0 bg-[var(--forest)]/20 blur-[8px] rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <div className="relative flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--forest)] text-white font-semibold text-sm shadow-[inset_0_1px_2px_rgba(255,255,255,0.15),0_4px_12px_rgba(75,110,72,0.3)] hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.2),0_6px_20px_rgba(75,110,72,0.4)] transition-all duration-300 border border-[var(--forest)]/50 backdrop-blur-sm">
                  {isConnecting ? (
                    <>
                      <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                      <span>Connecting…</span>
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                        <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                        <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
                      </svg>
                      <span>Connect</span>
                    </>
                  )}
                </div>
              </button>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex md:hidden p-2 rounded-lg text-[var(--stone)] hover:bg-[var(--faded-sage)]/30 transition-all cursor-pointer"
            >
              {mobileMenuOpen ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="4" x2="20" y1="12" y2="12" />
                  <line x1="4" x2="20" y1="6" y2="6" />
                  <line x1="4" x2="20" y1="18" y2="18" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-[var(--faded-sage)]/30 animate-slide-down">
            <div className="flex flex-col gap-2">
              <Link
                href="/"
                className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive("/") 
                    ? "text-[var(--forest)] bg-[var(--forest)]/10" 
                    : "text-[var(--stone)] hover:bg-[var(--faded-sage)]/30"
                }`}
              >
                Home
              </Link>
              {walletAddress && (
                <Link
                  href="/dashboard"
                  className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive("/dashboard") 
                      ? "text-[var(--forest)] bg-[var(--forest)]/10" 
                      : "text-[var(--stone)] hover:bg-[var(--faded-sage)]/30"
                  }`}
                >
                  Dashboard
                </Link>
              )}
              {!walletAddress && (
                <button
                  onClick={onConnect}
                  disabled={isConnecting}
                  className="btn-forest w-full mt-2 sm:hidden cursor-pointer"
                >
                  {isConnecting ? (
                    <>
                      <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                      <span>Connecting…</span>
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                        <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                        <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
                      </svg>
                      <span>Connect Wallet</span>
                    </>
                  )}
                </button>
              )}
              {walletAddress && (
                <div className="mt-2 pt-4 border-t border-[var(--faded-sage)]/30">
                  <div className="flex items-center gap-3 px-4 py-2">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[var(--forest)] to-[var(--moss)] p-[2px]">
                      <div className="flex h-full w-full items-center justify-center rounded-full bg-[var(--warm-cream)]">
                        <span className="text-[10px] font-bold text-[var(--dark-ink)] font-mono-data">
                          {walletAddress.slice(0, 2)}
                        </span>
                      </div>
                    </div>
                    <span className="font-mono-data text-sm text-[var(--dark-ink)]/80">
                      {truncate(walletAddress)}
                    </span>
                  </div>
                  <button
                    onClick={() => { onDisconnect(); setMobileMenuOpen(false); }}
                    className="w-full px-4 py-3 text-left text-sm text-[var(--terra)] hover:bg-[var(--terra)]/5 rounded-xl transition-all mt-2 cursor-pointer"
                  >
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-[var(--faded-sage)] to-transparent opacity-50" />
    </nav>
  );
}