"use client";

import { useEffect, useState } from "react";
import FloatingHeader from "@/components/FloatingHeader";
import { 
  checkConnection, 
  getWalletAddress, 
  getWalletIdByAddress,
  openDispute,
  voteDispute,
  viewWalletDisputes,
  viewWalletHistory,
  viewWalletReputation
} from "@/hooks/contract";
import { ShieldAlert, Gavel, Scale, Flag, Award } from "lucide-react";
import { useToast } from "@/context/ToastContext";
import Link from "next/link";

interface InteractionLog {
  log_id: number;
  caller_wallet_id: number;
  target_wallet_id: number;
  is_endorsement: boolean;
  reason: string;
  category: number;
  timestamp: number;
}

interface DisputeRecord {
  dispute_id: number;
  target_log_id: number;
  initiator_wallet_id: number;
  reason: string;
  votes_for: number;
  votes_against: number;
  is_resolved: boolean;
}

export default function DisputesPage() {
  const { showToast } = useToast();
  const [address, setAddress] = useState<string | null>(null);
  const [walletId, setWalletId] = useState<number>(0);
  const [myWalletId, setMyWalletId] = useState<number>(0);
  
  const [searchTarget, setSearchTarget] = useState("");
  const [viewTab, setViewTab] = useState<"disputes" | "reports">("disputes");
  const [disputes, setDisputes] = useState<DisputeRecord[]>([]);
  const [interactionLogs, setInteractionLogs] = useState<InteractionLog[]>([]);
  const [reputation, setReputation] = useState<{score: number; endorsement_count: number; report_count: number} | null>(null);
  const [loading, setLoading] = useState(true);
  
  // New Dispute Form
  const [openDisputeForm, setOpenDisputeForm] = useState({ logId: "", reason: "" });
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const isConn = await checkConnection();
        if (isConn) {
          const addr = await getWalletAddress();
          setAddress(addr);
          
          if (addr) {
             const wIdRaw = await getWalletIdByAddress(addr);
             const wId = typeof wIdRaw === 'bigint' ? Number(wIdRaw) : Number(wIdRaw?.value || 0);
             setWalletId(wId);
             setMyWalletId(wId);
             
             if (wId > 0) {
               if (viewTab === "disputes") {
                 await loadDisputes(wId);
               } else {
                 await loadInteractionLogs(wId);
               }
             } else {
               setLoading(false);
             }
          } else {
             setLoading(false);
          }
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    })();
  }, [viewTab]);

  const loadDisputes = async (id: number) => {
    setLoading(true);
    try {
      const data = await viewWalletDisputes(id);
      if (data && Array.isArray(data)) {
        const parsed = data.map((d: any) => ({
          dispute_id: Number(d.dispute_id),
          target_log_id: Number(d.target_log_id),
          initiator_wallet_id: Number(d.initiator_wallet_id),
          reason: String(d.reason || ""),
          votes_for: Number(d.votes_for),
          votes_against: Number(d.votes_against),
          is_resolved: Boolean(d.is_resolved)
        }));
        setDisputes(parsed.reverse());
      } else {
        setDisputes([]);
      }
    } catch {
      setDisputes([]);
    } finally {
      setLoading(false);
    }
  };

  const loadInteractionLogs = async (id: number) => {
    setLoading(true);
    try {
      const [logsResult, repResult] = await Promise.all([
        viewWalletHistory(id),
        viewWalletReputation(id)
      ]);
      
      if (logsResult && Array.isArray(logsResult)) {
        const parsed = logsResult.map((h: any) => ({
          log_id: Number(h.log_id),
          caller_wallet_id: Number(h.caller_wallet_id),
          target_wallet_id: Number(h.target_wallet_id),
          is_endorsement: Boolean(h.is_endorsement),
          reason: String(h.reason || ""),
          category: Number(h.category || 0),
          timestamp: Number(h.timestamp || 0)
        }));
        setInteractionLogs(parsed.reverse());
      } else {
        setInteractionLogs([]);
      }
      
      if (repResult && typeof repResult === 'object') {
        setReputation({
          score: Number(repResult.score ?? 0),
          endorsement_count: Number(repResult.endorsement_count ?? 0),
          report_count: Number(repResult.report_count ?? 0)
        });
      } else {
        setReputation(null);
      }
    } catch {
      setInteractionLogs([]);
      setReputation(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTarget) return;
    
    try {
       setLoading(true);
       let targetId = Number(searchTarget);
       if (isNaN(targetId) && searchTarget.startsWith("G")) {
         const rawId = await getWalletIdByAddress(searchTarget);
         targetId = typeof rawId === 'bigint' ? Number(rawId) : Number(rawId?.value || 0);
       }
       
       if (targetId > 0) {
         if (viewTab === "disputes") {
           await loadDisputes(targetId);
         } else {
           await loadInteractionLogs(targetId);
         }
       } else {
         showToast("Wallet not found.", "error");
         setDisputes([]);
         setInteractionLogs([]);
         setLoading(false);
       }
    } catch (e: any) {
       showToast(e.message, "error");
       setLoading(false);
    }
  };

  const handleViewTabChange = async (tab: "disputes" | "reports") => {
    setViewTab(tab);
    if (walletId > 0) {
      if (tab === "disputes") {
        await loadDisputes(walletId);
      } else {
        await loadInteractionLogs(walletId);
      }
    }
  };

  const handleQuickChallenge = (logId: number, reason: string) => {
    setOpenDisputeForm({ logId: String(logId), reason: reason });
    document.getElementById("dispute-form")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleOpenDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;
    setOpening(true);
    try {
      showToast("Awaiting signature to open dispute...", "info");
      await openDispute(address, Number(openDisputeForm.logId), openDisputeForm.reason);
      showToast("Dispute opened on-chain!", "success");
      setOpenDisputeForm({ logId: "", reason: "" });
      if (walletId > 0) loadDisputes(walletId);
    } catch (e: any) {
      showToast(e.message || "Failed to open dispute", "error");
    } finally {
      setOpening(false);
    }
  };

  const handleVote = async (disputeId: number, inFavor: boolean) => {
    if (!address) return;
    try {
      showToast("Awaiting signature for vote...", "info");
      await voteDispute(address, disputeId, inFavor);
      showToast("Vote cast successfully!", "success");
      // refresh if possible
      if (walletId > 0) loadDisputes(walletId);
    } catch (e: any) {
      showToast(e.message || "Failed to cast vote", "error");
    }
  };

  return (
    <div className="min-h-screen bg-[var(--parchment)] relative overflow-hidden">
      <FloatingHeader />

      <main className="relative max-w-5xl mx-auto px-6 pt-32 pb-24 z-10 w-full animate-fade-in-up">
        <div className="mb-10 animate-fade-in-up uppercase tracking-widest text-[#2c3e2e] text-sm font-semibold flex items-center gap-2">
          <span>WalletGraph</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--terra)]" />
          <span>Governance & Arbitration</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-black text-[var(--dark-ink)] leading-tight tracking-tight mb-4 group animate-fade-in-up animation-delay-100">
          Dispute <span className="text-[var(--forest)] italic pr-2">Resolution</span>
        </h1>
        <p className="text-base sm:text-lg text-[var(--stone)] max-w-2xl leading-relaxed mb-12 animate-fade-in-up animation-delay-200">
          Challenge inaccurate endorsements or reports. Participate in governance by reviewing active disputes and voting for resolution.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-6">
            <div className="card-botanical p-6 mb-6 flex flex-col sm:flex-row gap-4 items-end">
               <div className="flex-1 w-full space-y-2">
                  <label className="text-sm font-semibold uppercase tracking-wider text-[var(--stone)]">Lookup Wallet</label>
                  <input 
                    type="text" 
                    placeholder="Enter Wallet Address or ID..."
                    className="w-full bg-white border border-[var(--faded-sage)] rounded-xl px-4 py-2.5 outline-none focus:border-[var(--forest)] font-sans text-[var(--dark-ink)]"
                    value={searchTarget}
                    onChange={(e) => setSearchTarget(e.target.value)}
                  />
               </div>
               <button onClick={handleSearch} className="btn-outline px-6 py-2.5 whitespace-nowrap">
                 Search Records
               </button>
            </div>

            <div className="flex gap-2 border-b border-[var(--faded-sage)]">
              <button
                onClick={() => handleViewTabChange("disputes")}
                className={`px-6 py-3 font-semibold text-sm uppercase tracking-wider transition-colors border-b-2 ${viewTab === "disputes" ? "border-[var(--forest)] text-[var(--forest)]" : "border-transparent text-[var(--stone)] hover:text-[var(--dark-ink)]"}`}
              >
                <Scale className="w-4 h-4 inline mr-2" />
                Disputes ({disputes.length})
              </button>
              <button
                onClick={() => handleViewTabChange("reports")}
                className={`px-6 py-3 font-semibold text-sm uppercase tracking-wider transition-colors border-b-2 ${viewTab === "reports" ? "border-[var(--forest)] text-[var(--forest)]" : "border-transparent text-[var(--stone)] hover:text-[var(--dark-ink)]"}`}
              >
                <ShieldAlert className="w-4 h-4 inline mr-2" />
                Reports & Endorsements ({interactionLogs.length})
              </button>
            </div>

            {reputation && (
              <div className="card-botanical p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-xs text-[var(--stone)] uppercase tracking-wider">Score</span>
                    <div className={`text-2xl font-heading font-bold ${reputation.score > 0 ? 'text-[var(--forest)]' : reputation.score < 0 ? 'text-[var(--terra)]' : 'text-[var(--amber-sap)]'}`}>
                      {reputation.score}
                    </div>
                  </div>
                  <div className="w-px h-10 bg-[var(--faded-sage)]" />
                  <div>
                    <span className="text-xs text-[var(--stone)] uppercase tracking-wider">Endorsements</span>
                    <div className="text-xl font-mono-data font-bold text-[var(--forest)]">+{reputation.endorsement_count}</div>
                  </div>
                  <div>
                    <span className="text-xs text-[var(--stone)] uppercase tracking-wider">Reports</span>
                    <div className="text-xl font-mono-data font-bold text-[var(--terra)]">-{reputation.report_count}</div>
                  </div>
                </div>
                {viewTab === "reports" && address && myWalletId === walletId && (
                  <div className="text-right">
                    <p className="text-xs text-[var(--stone)] mb-1">These are reports against YOU</p>
                    <p className="text-xs text-[var(--amber-sap)]">Click "Challenge" to dispute</p>
                  </div>
                )}
              </div>
            )}

            {loading ? (
              <div className="text-center py-20 text-[var(--stone)]">Loading records...</div>
            ) : viewTab === "disputes" ? (
              disputes.length === 0 ? (
                <div className="card-botanical p-10 text-center flex flex-col items-center">
                   <Scale className="w-16 h-16 text-[var(--stone)] mb-4 opacity-50" />
                   <h3 className="text-xl font-heading font-bold text-[var(--dark-ink)] mb-2">No Active Disputes</h3>
                   <p className="text-[var(--stone)] text-sm">This wallet has a clean arbitration record.</p>
                </div>
              ) : (
                <div className="space-y-4">
                   {disputes.map(d => (
                     <div key={d.dispute_id} className={`p-6 relative overflow-hidden rounded-2xl border transition-all duration-300 ${d.is_resolved ? 'bg-[var(--parchment)] border-[var(--faded-sage)] opacity-75' : 'bg-white border-[var(--sage)] shadow-paper hover:shadow-paper-lg'}`}>
                       {d.is_resolved ? (
                         <div className="absolute top-0 right-0 bg-[var(--stone)] text-white text-[10px] font-bold px-3 py-1.5 rounded-bl-xl z-10 uppercase tracking-widest shadow-sm flex items-center gap-1">
                           <ShieldAlert className="w-3 h-3" /> Resolved
                         </div>
                       ) : (
                         <div className="absolute top-0 right-0 bg-[var(--amber-sap)] text-white text-[10px] font-bold px-3 py-1.5 rounded-bl-xl z-10 uppercase tracking-widest shadow-sm flex items-center gap-1 animate-pulse">
                           <Gavel className="w-3 h-3" /> Active Hearing
                         </div>
                       )}
                       
                       <div className="flex items-start justify-between mb-5">
                         <div>
                           <div className="flex items-center gap-2 mb-1">
                             <h3 className={`text-xl font-heading font-black tracking-tight ${d.is_resolved ? 'text-[var(--stone)]' : 'text-[var(--dark-ink)]'}`}>
                               Dispute #{d.dispute_id}
                             </h3>
                           </div>
                           <p className="text-xs text-[var(--stone)] font-mono-data tracking-tight">
                             TARGET: LOG #{d.target_log_id} <span className="mx-1 opacity-50">|</span> INITIATOR: WALLET #{d.initiator_wallet_id}
                           </p>
                         </div>
                       </div>
                       
                       <div className={`p-4 rounded-xl border mb-6 relative ${d.is_resolved ? 'bg-white/40 border-[var(--faded-sage)]' : 'bg-[var(--parchment)] border-[var(--faded-sage)]/60'}`}>
                         <div className="absolute -top-3 -left-2 text-4xl text-[var(--faded-sage)] opacity-50 font-serif font-bold">"</div>
                         <p className="text-sm text-[var(--dark-ink)] leading-relaxed relative z-10 font-medium pl-2 pr-2">
                           {d.reason}
                         </p>
                       </div>

                       <div className="flex flex-col sm:flex-row items-center gap-6 border-t border-[var(--faded-sage)] pt-5">
                         <div className="flex-1 flex gap-6 text-sm w-full">
                           <div className="flex flex-col items-center sm:items-start group">
                             <span className="text-[10px] uppercase text-[var(--stone)] font-bold tracking-widest mb-1 group-hover:text-[var(--forest)] transition-colors">Votes For</span>
                             <div className="flex items-baseline gap-1">
                               <span className={`font-mono-data font-black text-2xl ${d.votes_for > d.votes_against ? 'text-[var(--forest)]' : 'text-[var(--stone)]'}`}>{d.votes_for}</span>
                             </div>
                           </div>
                           <div className="w-px bg-[var(--faded-sage)] h-10 self-center opacity-50" />
                           <div className="flex flex-col items-center sm:items-start group">
                             <span className="text-[10px] uppercase text-[var(--stone)] font-bold tracking-widest mb-1 group-hover:text-[var(--terra)] transition-colors">Votes Against</span>
                             <div className="flex items-baseline gap-1">
                               <span className={`font-mono-data font-black text-2xl ${d.votes_against > d.votes_for ? 'text-[var(--terra)]' : 'text-[var(--stone)]'}`}>{d.votes_against}</span>
                             </div>
                           </div>
                         </div>
                         
                         {!d.is_resolved && address && (
                           <div className="flex gap-2 w-full sm:w-auto mt-4 sm:mt-0">
                             <button onClick={() => handleVote(d.dispute_id, true)} className="flex-1 sm:flex-none btn-forest py-2.5 px-6 shadow-sm flex items-center justify-center gap-2">Vote For</button>
                             <button onClick={() => handleVote(d.dispute_id, false)} className="flex-1 sm:flex-none btn-terra py-2.5 px-6 shadow-sm flex items-center justify-center gap-2">Vote Against</button>
                           </div>
                         )}
                       </div>
                     </div>
                   ))}
                </div>
              )
            ) : (
              interactionLogs.length === 0 ? (
                <div className="card-botanical p-10 text-center flex flex-col items-center">
                   <Award className="w-16 h-16 text-[var(--stone)] mb-4 opacity-50" />
                   <h3 className="text-xl font-heading font-bold text-[var(--dark-ink)] mb-2">No Reports or Endorsements</h3>
                   <p className="text-[var(--stone)] text-sm">This wallet has a clean trust record.</p>
                </div>
              ) : (
                <div className="space-y-4">
                   {interactionLogs.map(log => (
                     <div key={log.log_id} className="p-5 rounded-2xl border bg-white border-[var(--sage)] shadow-paper hover:shadow-paper-lg transition-all">
                       <div className="flex items-start justify-between mb-3">
                         <div className="flex items-center gap-3">
                           <div className={`w-10 h-10 rounded-full flex items-center justify-center ${log.is_endorsement ? 'bg-[var(--forest)]/10 text-[var(--forest)]' : 'bg-[var(--terra)]/10 text-[var(--terra)]'}`}>
                             {log.is_endorsement ? <Award className="w-5 h-5" /> : <Flag className="w-5 h-5" />}
                           </div>
                           <div>
                             <div className={`font-bold text-sm uppercase tracking-wider ${log.is_endorsement ? 'text-[var(--forest)]' : 'text-[var(--terra)]'}`}>
                               {log.is_endorsement ? "Endorsement" : "Report"}
                             </div>
                             <div className="text-xs text-[var(--stone)] font-mono-data">Log #{log.log_id}</div>
                           </div>
                         </div>
                         <div className="text-xs text-[var(--stone)]">
                           {new Date(log.timestamp * 1000).toLocaleDateString()}
                         </div>
                       </div>
                       
                       <p className="text-sm text-[var(--dark-ink)] mb-3">"{log.reason}"</p>
                       
                       <div className="flex items-center justify-between pt-3 border-t border-[var(--faded-sage)]">
                         <div className="text-xs text-[var(--stone)]">
                           <span className="uppercase tracking-wider">By Wallet #{log.caller_wallet_id}</span>
                           <span className="mx-2">•</span>
                           <span className="capitalize">{["General", "Trading", "Lending", "NFTs", "Developer", "Social"][log.category] || "General"}</span>
                         </div>
                         
                         {!log.is_endorsement && address && myWalletId === walletId && (
                           <button
                             onClick={() => handleQuickChallenge(log.log_id, log.reason)}
                             className="btn-outline text-xs py-1.5 px-3 flex items-center gap-1"
                           >
                             <Flag className="w-3 h-3" />
                             Challenge
                           </button>
                         )}
                       </div>
                     </div>
                   ))}
                </div>
              )
            )}
          </div>

          <div className="lg:col-span-4">
<div className="card-botanical p-6 sticky top-32" id="dispute-form">
               <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[var(--faded-sage)]">
                 <div className="w-10 h-10 bg-[var(--forest)]/10 text-[var(--forest)] rounded-xl flex items-center justify-center">
                   <Gavel className="w-5 h-5" />
                 </div>
                 <h3 className="font-heading font-bold text-[var(--dark-ink)] text-lg">Open Dispute</h3>
              </div>

               {address ? (
                 <form onSubmit={handleOpenDispute} className="space-y-4">
                    <div className="space-y-2">
                       <label className="text-xs font-semibold uppercase tracking-wider text-[var(--stone)]">Target Log ID</label>
                       <input 
                         required
                         type="number"
                         value={openDisputeForm.logId}
                         onChange={e => setOpenDisputeForm({...openDisputeForm, logId: e.target.value})}
                         className="w-full bg-white border border-[var(--faded-sage)] rounded-xl px-4 py-2.5 outline-none focus:border-[var(--forest)] font-sans text-[var(--dark-ink)]"
                         placeholder="e.g. 152"
                       />
                       <p className="text-[10px] text-[var(--stone)] leading-tight">Identify the interaction log you believe is fraudulent or inaccurate.</p>
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-semibold uppercase tracking-wider text-[var(--stone)]">Reason for Dispute</label>
                       <textarea 
                         required
                         value={openDisputeForm.reason}
                         onChange={e => setOpenDisputeForm({...openDisputeForm, reason: e.target.value})}
                         className="w-full bg-white border border-[var(--faded-sage)] rounded-xl px-4 py-2.5 outline-none focus:border-[var(--forest)] font-sans text-[var(--dark-ink)] resize-none"
                         placeholder="Explain why this log should be reversed..."
                         rows={4}
                       />
                    </div>
                    <button type="submit" disabled={opening} className="w-full btn-forest flex items-center justify-center gap-2 mt-2">
                      {opening ? "Submitting..." : "Submit to Council"}
                    </button>
                 </form>
               ) : (
                 <div className="text-center py-6">
                   <p className="text-sm text-[var(--stone)] mb-4">Connect wallet to open disputes.</p>
                   <Link href="/login" className="btn-outline w-full cursor-pointer inline-flex justify-center items-center gap-2">
                     Connect Identity
                   </Link>
                 </div>
               )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
