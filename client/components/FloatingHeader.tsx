"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { NETWORK, checkConnection, getWalletAddress } from "@/hooks/contract";
import { BrandMarkIcon } from "@/components/BrandMark";
import { User, Settings } from "lucide-react";

export default function FloatingHeader() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const connected = await checkConnection();
        setIsConnected(connected);
        if (connected) {
          const addr = await getWalletAddress();
          setWalletAddress(addr);
        }
      } catch { /* ignore */ }
    })();
  }, []);

  const handleEditProfile = () => {
    if (walletAddress) {
      router.push("/edit-profile");
    } else {
      router.push("/login");
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 transition-all duration-500 pointer-events-none`}
    >
      <div 
        className={`flex items-center gap-3 transition-all duration-500 pointer-events-auto ${
          scrolled 
            ? "bg-[var(--warm-cream)]/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-[0_4px_20px_rgba(44,44,43,0.08)] border border-[var(--faded-sage)]/50" 
            : ""
        }`}
      >
        <Link href="/" className="flex items-center gap-3.5 group">
          <div className="relative shrink-0">
            <div className="absolute -inset-1 bg-[var(--forest)]/15 blur-[10px] rounded-2xl group-hover:bg-[var(--forest)]/28 transition-colors duration-500" />
            <div className="relative rounded-xl shadow-[0_6px_20px_rgba(75,110,72,0.22),0_2px_6px_rgba(44,44,43,0.06)] ring-1 ring-white/50 overflow-hidden">
              <BrandMarkIcon size={40} />
            </div>
          </div>
          
          <div className="flex flex-col">
            <div className="relative">
              <span 
                className="text-lg sm:text-xl font-heading font-bold tracking-tight text-[var(--dark-ink)] relative z-10"
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

      <div className="hidden md:flex items-center gap-6 pointer-events-auto bg-[var(--parchment)]/80 backdrop-blur-md px-6 py-2 rounded-full border border-[var(--faded-sage)] shadow-sm font-sans text-sm font-medium">
        <Link href="/dashboard" className="text-[var(--stone)] hover:text-[var(--forest)] transition-colors">
          Dashboard
        </Link>
        <Link href="/certificates" className="text-[var(--stone)] hover:text-[var(--forest)] transition-colors">
          Certificates Hub
        </Link>
        <Link href="/disputes" className="text-[var(--stone)] hover:text-[var(--forest)] transition-colors">
          Disputes
        </Link>
        <Link href="/analytics" className="text-[var(--stone)] hover:text-[var(--forest)] transition-colors">
          Analytics
        </Link>
        {isConnected && (
          <button 
            onClick={handleEditProfile}
            className="flex items-center gap-1.5 text-[var(--stone)] hover:text-[var(--forest)] transition-colors"
          >
            <Settings className="w-4 h-4" />
            Edit Profile
          </button>
        )}
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
