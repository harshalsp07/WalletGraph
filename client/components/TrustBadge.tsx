"use client";

import React from "react";
import { Leaf, Award, Shield, AlertTriangle, ShieldAlert, Star } from "lucide-react";

export type TierStatus = 0 | 1 | 2 | 3 | 4 | 5;

interface TrustBadgeProps {
  tier: TierStatus;
  size?: "sm" | "md" | "lg";
  className?: string;
  showLabel?: boolean;
}

export const TIER_MAP: Record<
  TierStatus,
  { label: string; description: string; color: string; border: string; bg: string; icon: React.ReactNode }
> = {
  0: {
    label: "Newcomer",
    description: "0 Score — Just sprouting.",
    color: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-900/50",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    icon: <Leaf className="w-full h-full" />,
  },
  1: {
    label: "Budding",
    description: "1-4 Score — Taking root.",
    color: "text-green-600 dark:text-green-400",
    border: "border-green-200 dark:border-green-900/50",
    bg: "bg-green-50 dark:bg-green-950/30",
    icon: <Star className="w-full h-full" />,
  },
  2: {
    label: "Established",
    description: "5-14 Score — Branching out.",
    color: "text-teal-600 dark:text-teal-400",
    border: "border-teal-200 dark:border-teal-900/50",
    bg: "bg-teal-50 dark:bg-teal-950/30",
    icon: <Shield className="w-full h-full" />,
  },
  3: {
    label: "Respected",
    description: "15-29 Score — Strong and flowering.",
    color: "text-blue-600 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-900/50",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    icon: <Award className="w-full h-full" />,
  },
  4: {
    label: "Elder",
    description: "30+ Score — Majestic canopy.",
    color: "text-amber-600 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-900/50",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    icon: <Award className="w-full h-full" />,
  },
  5: {
    label: "Flagged",
    description: "< 0 Score — Under review.",
    color: "text-rose-600 dark:text-rose-400",
    border: "border-rose-200 dark:border-rose-900/50",
    bg: "bg-rose-50 dark:bg-rose-950/30",
    icon: <AlertTriangle className="w-full h-full" />,
  },
};

export default function TrustBadge({ tier, size = "md", className = "", showLabel = true }: TrustBadgeProps) {
  const config = TIER_MAP[tier] || TIER_MAP[0];
  
  const sizeClasses = {
    sm: "h-6 px-2 text-xs",
    md: "h-8 px-3 text-sm",
    lg: "h-10 px-4 text-base",
  };
  
  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  return (
    <div
      className={`
        inline-flex items-center justify-center gap-1.5 rounded-full font-medium transition-all duration-300
        border backdrop-blur-md shadow-sm group
        ${config.color} ${config.bg} ${config.border} ${sizeClasses[size]} ${className}
      `}
      title={config.description}
    >
      <span className={`${iconSizes[size]} drop-shadow-sm transition-transform duration-300 group-hover:scale-110`}>
        {config.icon}
      </span>
      {showLabel && <span>{config.label}</span>}
    </div>
  );
}
