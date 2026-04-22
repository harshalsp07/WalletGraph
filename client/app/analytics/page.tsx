"use client";

import { useEffect, useState } from "react";
import FloatingHeader from "@/components/FloatingHeader";
import { viewGlobalStats } from "@/hooks/contract";
import { LineChart, Users, ThumbsUp, Flag, Activity } from "lucide-react";

export default function AnalyticsPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const globalStats = await viewGlobalStats();
        setStats(globalStats);
      } catch (err) {
        console.error("Failed to load global stats", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-[var(--warm-cream)] relative overflow-hidden">
      <FloatingHeader />

      <main className="relative max-w-5xl mx-auto px-6 pt-32 pb-24 z-10 w-full animate-fade-in-up">
        <div className="mb-10 animate-fade-in-up uppercase tracking-widest text-[#2c3e2e] text-sm font-semibold flex items-center gap-2">
          <span>WalletGraph</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--terra)]" />
          <span>Network Telemetry</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-black text-[var(--dark-ink)] leading-tight tracking-tight mb-4 group animate-fade-in-up animation-delay-100">
          Global <span className="text-[var(--forest)] italic pr-2">Analytics</span>
        </h1>
        <p className="text-base sm:text-lg text-[var(--stone)] max-w-2xl leading-relaxed mb-12 animate-fade-in-up animation-delay-200">
          Real-time insights into the health, activity, and trust distribution across the entire WalletGraph ecosystem.
        </p>

        {loading ? (
          <div className="text-center py-20 text-[var(--stone)]">Loading telemetry data...</div>
        ) : !stats ? (
          <div className="card-botanical p-10 text-center flex flex-col items-center">
             <Activity className="w-16 h-16 text-[var(--stone)] mb-4 opacity-50" />
             <h3 className="text-xl font-heading font-bold text-[var(--dark-ink)] mb-2">No Data Available</h3>
             <p className="text-[var(--stone)] text-sm">Unable to retrieve telemetry from the Stellar network at this time.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card-botanical p-6 flex flex-col justify-between h-40">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-[var(--forest)]/10 text-[var(--forest)] rounded-xl flex items-center justify-center">
                   <Users className="w-5 h-5" />
                 </div>
                 <h3 className="font-heading font-bold text-[var(--dark-ink)]">Total Wallets</h3>
              </div>
              <div>
                <p className="text-4xl font-mono-data font-bold text-[var(--forest)]">{Number(stats.total_wallets || 0)}</p>
                <p className="text-[10px] uppercase text-[var(--stone)] mt-1 font-semibold tracking-wider">Registered Identities</p>
              </div>
            </div>

            <div className="card-botanical p-6 flex flex-col justify-between h-40">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-[var(--forest)]/10 text-[var(--forest)] rounded-xl flex items-center justify-center">
                   <ThumbsUp className="w-5 h-5" />
                 </div>
                 <h3 className="font-heading font-bold text-[var(--dark-ink)]">Endorsements</h3>
              </div>
              <div>
                <p className="text-4xl font-mono-data font-bold text-[var(--forest)]">{Number(stats.total_endorsements || 0)}</p>
                <p className="text-[10px] uppercase text-[var(--stone)] mt-1 font-semibold tracking-wider">Positive Interactions</p>
              </div>
            </div>

            <div className="card-botanical p-6 flex flex-col justify-between h-40">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-[var(--terra)]/10 text-[var(--terra)] rounded-xl flex items-center justify-center">
                   <Flag className="w-5 h-5" />
                 </div>
                 <h3 className="font-heading font-bold text-[var(--dark-ink)]">Reports</h3>
              </div>
              <div>
                <p className="text-4xl font-mono-data font-bold text-[var(--terra)]">{Number(stats.total_reports || 0)}</p>
                <p className="text-[10px] uppercase text-[var(--stone)] mt-1 font-semibold tracking-wider">Negative Flags</p>
              </div>
            </div>

            <div className="card-botanical p-6 flex flex-col justify-between h-40">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center">
                   <LineChart className="w-5 h-5" />
                 </div>
                 <h3 className="font-heading font-bold text-[var(--dark-ink)]">Avg Score</h3>
              </div>
              <div>
                <p className="text-4xl font-mono-data font-bold text-blue-500">
                  {Number(stats.total_wallets || 0) > 0 
                     ? (Number(stats.total_score || 0) / Number(stats.total_wallets || 1)).toFixed(1)
                     : "0.0"
                  }
                </p>
                <p className="text-[10px] uppercase text-[var(--stone)] mt-1 font-semibold tracking-wider">Platform Health</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
