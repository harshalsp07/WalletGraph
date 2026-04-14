"use client";

import { useState, useEffect } from "react";
import { animate } from "animejs";

interface OnboardingModalProps {
  walletAddress: string;
  onComplete: () => void;
}

const ONBOARDING_KEY = "walletgraph_onboarded";

function SearchIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function UserPlusIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  );
}

function ThumbsUpIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 10v12" />
      <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
    </svg>
  );
}

function FlagIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

const features = [
  {
    icon: <SearchIcon />,
    title: "Lookup",
    description: "Search any wallet's reputation by ID or Stellar address. View scores, endorsements, and reports.",
    color: "var(--sage)",
    bgColor: "rgba(178, 172, 136, 0.15)",
  },
  {
    icon: <UserPlusIcon />,
    title: "Register",
    description: "Create your on-chain identity. Your wallet address maps to a unique ID that others can reference.",
    color: "var(--forest)",
    bgColor: "rgba(75, 110, 72, 0.15)",
  },
  {
    icon: <ThumbsUpIcon />,
    title: "Endorse",
    description: "Build trust by endorsing reliable wallets. Each endorsement adds +1 to the reputation score.",
    color: "var(--moss)",
    bgColor: "rgba(107, 143, 78, 0.15)",
  },
  {
    icon: <FlagIcon />,
    title: "Report",
    description: "Flag suspicious or malicious wallets. Each report deducts -3 from the score to protect the community.",
    color: "var(--terra)",
    bgColor: "rgba(160, 82, 45, 0.15)",
  },
];

export function isOnboardingComplete(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(ONBOARDING_KEY) === "true";
}

export function skipOnboarding(): void {
  localStorage.setItem(ONBOARDING_KEY, "true");
}

export default function OnboardingModal({ walletAddress, onComplete }: OnboardingModalProps) {
  const [isVisible] = useState(true);
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleComplete = (skipFuture: boolean) => {
    if (skipFuture) {
      skipOnboarding();
    }
    animate(".onboarding-card", {
      scale: [1, 0.9],
      opacity: [1, 0],
      duration: 300,
      easing: "easeInQuad",
      complete: onComplete,
    });
  };

  const shortAddress = `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-[var(--dark-ink)]/40 backdrop-blur-sm"
        onClick={() => handleComplete(false)}
      />

      <div
        className={`onboarding-card card-botanical relative w-full max-w-lg p-8 paper-shadow animate-fade-in-scale ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
        style={{ transition: "opacity 0.4s ease" }}
      >
        <div className="absolute top-0 right-0 w-20 h-20 overflow-hidden pointer-events-none">
          <div className="absolute top-4 right-4 wax-seal">
            <span className="relative z-10 text-white">
              <ShieldIcon />
            </span>
          </div>
        </div>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-[var(--forest)]/10 border-2 border-[var(--forest)]/20 mb-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--forest)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h2 className="text-2xl font-heading font-bold text-[var(--dark-ink)] embossed mb-1">
            Welcome to WalletGraph
          </h2>
          <p className="text-sm text-[var(--stone)]">
            Connected as <span className="font-mono-data font-semibold text-[var(--forest)]">{shortAddress}</span>
          </p>
        </div>

        <div className="mb-6">
          <h3 className="text-xs uppercase tracking-wider text-[var(--stone)] font-semibold mb-4 text-center">
            What you can do
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className={`rounded-xl p-4 border transition-all duration-300 cursor-default ${
                  activeFeature === index
                    ? "border-[var(--faded-sage)] shadow-[0_4px_16px_rgba(0,0,0,0.08)] scale-[1.02]"
                    : "border-[var(--faded-sage)]/50 opacity-70"
                }`}
                style={{ background: feature.bgColor }}
                onMouseEnter={() => setActiveFeature(index)}
              >
                <div
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl mb-2"
                  style={{ background: `${feature.color}20`, color: feature.color }}
                >
                  {feature.icon}
                </div>
                <h4 className="text-sm font-heading font-bold text-[var(--dark-ink)] mb-1">{feature.title}</h4>
                <p className="text-[10px] text-[var(--stone)] leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-6 rounded-xl bg-[var(--parchment)] border border-[var(--faded-sage)] p-4">
          <h4 className="text-xs uppercase tracking-wider text-[var(--stone)] font-semibold mb-3 text-center">
            Score Mechanics
          </h4>
          <div className="flex items-center justify-center gap-6">
            <div className="text-center">
              <p className="text-2xl font-heading font-bold text-[var(--forest)]">+1</p>
              <p className="text-[10px] text-[var(--stone)] uppercase tracking-wider">Endorsement</p>
            </div>
            <div className="h-8 w-px bg-[var(--faded-sage)]" />
            <div className="text-center">
              <p className="text-2xl font-heading font-bold text-[var(--terra)]">-3</p>
              <p className="text-[10px] text-[var(--stone)] uppercase tracking-wider">Report</p>
            </div>
            <div className="h-8 w-px bg-[var(--faded-sage)]" />
            <div className="text-center">
              <p className="text-2xl font-heading font-bold text-[var(--amber-sap)]">3:1</p>
              <p className="text-[10px] text-[var(--stone)] uppercase tracking-wider">Neutralize</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleComplete(true)}
            className="flex-1 btn-outline text-sm py-3 cursor-pointer"
          >
            Don&apos;t show again
          </button>
          <button
            onClick={() => handleComplete(false)}
            className="flex-1 btn-forest text-sm py-3 cursor-pointer"
          >
            Let&apos;s Go
          </button>
        </div>
      </div>
    </div>
  );
}