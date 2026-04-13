"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { WalletProvider } from "@/hooks/contract";
import { getWalletOption } from "@/lib/wallets";

interface DockHeaderProps {
  walletAddress: string | null;
  walletProvider?: WalletProvider | null;
  onConnect: () => void;
  onDisconnect: () => void;
  isConnecting: boolean;
}

export default function DockHeader({
  walletAddress,
  walletProvider,
  onConnect,
  onDisconnect: _onDisconnect,
  isConnecting,
}: DockHeaderProps) {
  void _onDisconnect;
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    let mountedFlag = true;
    const tick = () => {
      if (mountedFlag) {
        setMounted(true);
      }
    };
    tick();
    return () => {
      mountedFlag = false;
    };
  }, []);

  const isActive = (path: string) => pathname === path;

  const truncate = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`;
  const providerOption = getWalletOption(walletProvider ?? null);

  const navItems = [
    {
      path: "/",
      label: "Home",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
    },
    {
      path: "/dashboard",
      label: "Dashboard",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="7" height="9" x="3" y="3" rx="1" />
          <rect width="7" height="5" x="14" y="3" rx="1" />
          <rect width="7" height="9" x="14" y="12" rx="1" />
          <rect width="7" height="5" x="3" y="16" rx="1" />
        </svg>
      ),
    },
    {
      path: "/graph",
      label: "Graph",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="5" r="3" />
          <circle cx="5" cy="19" r="3" />
          <circle cx="19" cy="19" r="3" />
          <line x1="12" y1="8" x2="5" y2="16" />
          <line x1="12" y1="8" x2="19" y2="16" />
        </svg>
      ),
    },
  ];

  if (!mounted) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up">
      <div
        className="dock-container flex items-center px-3 py-2 rounded-2xl border border-[var(--faded-sage)]/50 backdrop-blur-2xl shadow-[0_8px_32px_rgba(44,44,43,0.12),inset_0_1px_0_rgba(255,255,255,0.5)]"
        style={{ background: "rgba(250, 249, 246, 0.9)" }}
      >
        {navItems.map((item) => {
          const active = isActive(item.path);
          const needsWallet = item.path !== "/";

          if (needsWallet && !walletAddress) return null;

          return (
            <Link
              key={item.path}
              href={item.path}
              className={`
                dock-item relative flex flex-col items-center gap-1 px-4 py-2 rounded-xl
                ${active ? "text-[var(--forest)]" : "text-[var(--stone)] hover:text-[var(--dark-ink)]"}
              `}
              style={{
                background: active ? "rgba(75, 110, 72, 0.1)" : "transparent",
              }}
            >
              {active && (
                <div
                  className="absolute inset-0 rounded-xl border"
                  style={{ borderColor: "var(--forest)", opacity: 0.3 }}
                />
              )}
              <span className={active ? "text-[var(--forest)]" : ""}>{item.icon}</span>
              <span
                className="text-[10px] font-medium whitespace-nowrap"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}

        {!walletAddress && (
          <button
            onClick={onConnect}
            disabled={isConnecting}
            className="dock-item flex flex-col items-center gap-1 px-4 py-2 rounded-xl text-[var(--forest)] hover:bg-[var(--forest)]/5 cursor-pointer"
          >
            {isConnecting ? (
              <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
              </svg>
            )}
            <span className="text-[10px] font-medium" style={{ fontFamily: "var(--font-sans)" }}>
              {isConnecting ? "..." : "Connect"}
            </span>
          </button>
        )}

        {walletAddress && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl border-l border-[var(--faded-sage)]/50 ml-2">
            <div className="h-6 w-6 rounded-full bg-gradient-to-br from-[var(--forest)] to-[var(--moss)] p-[2px]">
              <div className="flex h-full w-full items-center justify-center rounded-full bg-[var(--warm-cream)]">
                <span className="text-[8px] font-bold text-[var(--dark-ink)] font-mono-data">
                  {walletAddress.slice(0, 2)}
                </span>
              </div>
            </div>
            <div className="hidden sm:flex sm:flex-col sm:gap-0.5">
              <span className="text-xs font-mono-data text-[var(--dark-ink)]/60">
                {truncate(walletAddress)}
              </span>
              {providerOption && (
                <span className="text-[9px] uppercase tracking-[0.16em] text-[var(--stone)]">
                  {providerOption.name}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
