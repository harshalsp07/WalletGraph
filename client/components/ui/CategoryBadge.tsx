"use client";

import { useState, useEffect, useRef } from "react";
import { CATEGORIES, type CategoryId } from "@/lib/constants";

interface CategoryBadgeProps {
  category: CategoryId;
  selected?: boolean;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function CategoryBadge({ 
  category, 
  selected = false, 
  onClick,
  size = "md",
  showLabel = true 
}: CategoryBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const cat = CATEGORIES[category] || CATEGORIES[0];
  
  const sizeClasses = {
    sm: "px-2 py-0.5 text-[10px]",
    md: "px-3 py-1 text-xs",
    lg: "px-4 py-1.5 text-sm",
  };
  
  const iconSizes = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  };

  const bgColor = selected ? `${cat.color}20` : `${cat.color}10`;
  const borderColor = selected ? cat.color : "transparent";
  const textColor = cat.color;
  const ringColor = selected ? `${cat.color}40` : "transparent";

  const Component = onClick ? "button" : "div";
  
  return (
    <Component
      onClick={onClick}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      className={`
        relative inline-flex items-center gap-1.5 rounded-full font-semibold transition-all
        ${sizeClasses[size]}
        ${selected 
          ? "ring-2 ring-offset-1" 
          : "opacity-80 hover:opacity-100"
        }
        ${onClick ? "cursor-pointer hover:scale-105" : "cursor-default"}
      `}
      style={{ 
        backgroundColor: bgColor,
        color: textColor,
        borderColor: borderColor,
        ["--tw-ring-color" as string]: ringColor,
      } as React.CSSProperties}
    >
      <span className={iconSizes[size]}>{cat.icon}</span>
      {showLabel && <span>{cat.label}</span>}
      
      {showTooltip && !showLabel && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-[var(--dark-ink)] text-white text-[10px] rounded whitespace-nowrap z-50">
          {cat.label}
        </div>
      )}
    </Component>
  );
}

interface CategorySelectProps {
  value: CategoryId;
  onChange: (value: CategoryId) => void;
  label?: string;
  compact?: boolean;
}

export function CategorySelect({ value, onChange, label = "Category", compact = false }: CategorySelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = CATEGORIES[value] || CATEGORIES[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--stone)] mb-2">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`
          w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl
          bg-white border border-[var(--faded-sage)] text-left
          hover:border-[var(--forest)] transition-colors
          ${open ? "border-[var(--forest)] ring-1 ring-[var(--forest)]/20" : ""}
        `}
      >
        <span className={`flex items-center gap-2 ${compact ? "text-sm" : ""}`}>
          <span style={{ color: selected.color }}>{selected.icon}</span>
          <span className="text-[var(--dark-ink)]">{selected.label}</span>
        </span>
        <svg 
          width="16" height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      
      {open && (
        <div className="absolute z-50 mt-1 w-full">
          <div className="bg-white rounded-xl border border-[var(--faded-sage)] shadow-lg overflow-hidden py-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  onChange(cat.id as CategoryId);
                  setOpen(false);
                }}
                className={`
                  w-full flex items-center gap-2 px-4 py-2.5 text-left
                  hover:bg-[var(--parchment)] transition-colors
                  ${value === cat.id ? "bg-[var(--parchment)]" : ""}
                `}
              >
                <span style={{ color: cat.color }}>{cat.icon}</span>
                <div className="flex-1">
                  <span className="text-sm text-[var(--dark-ink)] font-medium block">{cat.label}</span>
                  <span className="text-[10px] text-[var(--stone)]">{cat.description}</span>
                </div>
                {value === cat.id && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={cat.color} strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface ReasonTemplatesProps {
  type: "endorse" | "report";
  onSelect: (reason: string) => void;
}

export function ReasonTemplates({ type, onSelect }: ReasonTemplatesProps) {
  const presetReasons = type === "endorse"
    ? ["Honest and reliable", "Fast delivery", "Great communication", "Would trade again", "Professional"]
    : ["Scam - took payment", "Did not deliver", "Rude behavior", "Fake goods", "Misrepresented"];

  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-[10px] text-[var(--stone)] hover:text-[var(--forest)] transition-colors"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M9 9h6M9 12h6M9 15h4" />
        </svg>
        <span>{expanded ? "Hide templates" : "Quick templates"}</span>
        <svg 
          width="10" height="10" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
          className={`transition-transform ${expanded ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      
      {expanded && (
        <div className="flex flex-wrap gap-1.5 animate-fade-in-up">
          {presetReasons.map((reason, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(reason)}
              className="text-[10px] px-2 py-1 rounded-full bg-[var(--parchment)] border border-[var(--faded-sage)] text-[var(--stone)] hover:bg-[var(--forest)]/5 hover:border-[var(--forest)]/30 hover:text-[var(--forest)] transition-all"
            >
              {reason}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface CharacterCounterProps {
  value: string;
  max: number;
}

export function CharacterCounter({ value, max }: CharacterCounterProps) {
  const remaining = max - value.length;
  const isLow = remaining < 20;
  const isOver = remaining < 0;
  
  return (
    <div className={`text-[10px] text-right ${isOver ? "text-[var(--terra)]" : isLow ? "text-[var(--amber-sap)]" : "text-[var(--stone)]"}`}>
      {remaining < 0 ? `${Math.abs(remaining)} over limit` : `${remaining} remaining`}
    </div>
  );
}