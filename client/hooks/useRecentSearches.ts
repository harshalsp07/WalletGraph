"use client";

import { useState, useCallback, useMemo } from "react";

const STORAGE_KEY_LOOKUPS = "walletgraph.recentLookups";
const STORAGE_KEY_INTERACTIONS = "walletgraph.recentInteractions";
const MAX_RECENT = 5;

export interface RecentLookup {
  id: string;
  address?: string;
  displayId: string;
  timestamp: number;
}

function getInitialLookups(): RecentLookup[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY_LOOKUPS);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is RecentLookup => 
          item && typeof item === "object" && "id" in item
        ).slice(0, MAX_RECENT);
      }
    }
  } catch {
    // Ignore
  }
  return [];
}

export function useRecentSearches() {
  const [recentLookups, setRecentLookups] = useState<RecentLookup[]>(getInitialLookups);
  const [isLoaded] = useState(true);

  const addLookup = useCallback((input: string, _resolvedValue?: string) => {
    if (!input.trim() || typeof window === "undefined") return;

    const isAddress = input.startsWith("G") && input.length > 20;
    const displayId = isAddress 
      ? `${input.slice(0, 6)}…${input.slice(-4)}`
      : input;
    
    const newLookup: RecentLookup = {
      id: isAddress ? "address" : "id",
      address: isAddress ? input : undefined,
      displayId: displayId,
      timestamp: Date.now(),
    };

    setRecentLookups(prev => {
      const filtered = prev.filter(item => 
        item.address !== input && item.displayId !== displayId
      );
      const updated = [newLookup, ...filtered].slice(0, MAX_RECENT);
      
      try {
        localStorage.setItem(STORAGE_KEY_LOOKUPS, JSON.stringify(updated));
      } catch {
        // Ignore
      }
      
      return updated;
    });
  }, []);

  const clearLookups = useCallback(() => {
    setRecentLookups([]);
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(STORAGE_KEY_LOOKUPS);
      } catch {
        // Ignore
      }
    }
  }, []);

  return useMemo(() => ({
    recentLookups,
    addLookup,
    clearLookups,
    isLoaded,
  }), [recentLookups, addLookup, clearLookups, isLoaded]);
}

export interface RecentInteraction {
  walletId: number;
  walletAddress?: string;
  displayId: string;
  type: "endorse" | "report";
  timestamp: number;
}

export function useRecentInteractions() {
  const [interactions, setInteractions] = useState<RecentInteraction[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY_INTERACTIONS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Ignore
    }
    return [];
  });

  const addInteraction = useCallback((
    walletId: number,
    walletAddress: string | undefined,
    displayId: string,
    type: "endorse" | "report"
  ) => {
    if (typeof window === "undefined") return;

    const newInteraction: RecentInteraction = {
      walletId,
      walletAddress,
      displayId,
      type,
      timestamp: Date.now(),
    };

    setInteractions(prev => {
      const updated = [newInteraction, ...prev].slice(0, 10);
      try {
        localStorage.setItem(STORAGE_KEY_INTERACTIONS, JSON.stringify(updated));
      } catch {
        // Ignore
      }
      return updated;
    });
  }, []);

  const clearInteractions = useCallback(() => {
    setInteractions([]);
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(STORAGE_KEY_INTERACTIONS);
      } catch {
        // Ignore
      }
    }
  }, []);

  return useMemo(() => ({
    interactions,
    addInteraction,
    clearInteractions,
  }), [interactions, addInteraction, clearInteractions]);
}