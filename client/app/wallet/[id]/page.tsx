"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import WalletProfileCard from "@/components/WalletProfileCard";
import { BrandMarkIcon } from "@/components/BrandMark";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function WalletProfilePage({ params }: PageProps) {
  const { id } = use(params);
  
  if (!id || (isNaN(parseInt(id)) && !id.startsWith("G"))) {
    notFound();
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-[var(--parchment)]">
      {/* Ambient blobs */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute top-[-15%] left-[-8%] h-[500px] w-[500px] rounded-full bg-[var(--sage)]/10 blur-[100px] animate-gentle-sway" />
        <div className="absolute bottom-[-10%] right-[-5%] h-[400px] w-[400px] rounded-full bg-[var(--forest)]/8 blur-[120px] animate-gentle-sway" style={{ animationDelay: "4s" }} />
        <div className="absolute top-[30%] right-[10%] h-[300px] w-[300px] rounded-full bg-[var(--amber-sap)]/5 blur-[100px] animate-gentle-sway" style={{ animationDelay: "2s" }} />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[var(--faded-sage)]/60 bg-[var(--warm-cream)]/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <BrandMarkIcon size={28} />
            <span className="text-lg font-heading font-bold text-[var(--dark-ink)]">WalletGraph</span>
          </Link>
          <Link 
            href="/dashboard" 
            className="flex items-center gap-2 text-sm font-semibold text-[var(--forest)] hover:text-[var(--moss)] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Dashboard
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-3xl">
          {/* Breadcrumb */}
          <nav className="mb-6 flex items-center gap-2 text-xs text-[var(--stone)]">
            <Link href="/" className="hover:text-[var(--dark-ink)]">Home</Link>
            <span>/</span>
            <Link href="/dashboard" className="hover:text-[var(--dark-ink)]">Dashboard</Link>
            <span>/</span>
            <span className="text-[var(--dark-ink)]">Wallet #{id}</span>
          </nav>

          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-heading font-bold text-[var(--dark-ink)]">
              Wallet Profile
            </h1>
            <p className="text-sm text-[var(--stone)] mt-1">
              View reputation and history for any registered wallet
            </p>
          </div>

          <WalletProfileCard walletIdOrAddress={id} />
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[var(--faded-sage)]/60 bg-[var(--warm-cream)]/50 px-4 py-6">
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-[11px] text-[var(--stone)] font-mono-data">
            <span>Stellar Network</span>
            <span className="h-4 w-px bg-[var(--faded-sage)]" />
            <span>Soroban Smart Contracts</span>
          </div>
          <p className="text-[10px] text-[var(--stone)]/50 handwritten text-base">
            Built on the Stellar blockchain — empowering trust in decentralised finance
          </p>
        </div>
      </footer>
    </div>
  );
}