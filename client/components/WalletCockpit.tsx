"use client";

import { useCallback, useEffect, useState } from "react";
import { animate } from "animejs";
import { HORIZON_URL, NETWORK, fetchXlmBalance, sendXlmTransaction } from "@/hooks/contract";
import { useToast } from "@/context/ToastContext";

type TransferState =
  | { type: "idle"; message: string }
  | { type: "signing"; message: string }
  | { type: "submitting"; message: string }
  | {
      type: "success";
      message: string;
      hash: string;
      amount: string;
      destination: string;
      explorerUrl: string;
    }
  | { type: "error"; message: string };

const INITIAL_TRANSFER_STATE: TransferState = {
  type: "idle",
  message: "Ready to move XLM across Stellar testnet.",
};

function formatAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-6)}`;
}

function formatBalance(balance: string) {
  const value = Number.parseFloat(balance);
  if (!Number.isFinite(value)) return balance;
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: value < 10 ? 2 : 0,
    maximumFractionDigits: 4,
  }).format(value);
}

// ── Balance Overview (for Overview tab) ────────────────────

export function BalanceOverview({ walletAddress }: { walletAddress: string }) {
  const { showToast } = useToast();
  const [balance, setBalance] = useState("0");
  const [lastLedger, setLastLedger] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(true);

  const refreshBalance = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const result = await fetchXlmBalance(walletAddress);
      setBalance(result.balance);
      setLastLedger(result.lastModifiedLedger ?? null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load XLM balance.";
      showToast(message, "error");
    } finally {
      setIsRefreshing(false);
    }
  }, [showToast, walletAddress]);

  useEffect(() => {
    void refreshBalance();
  }, [refreshBalance]);

return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
      {/* XLM Balance */}
      <div className="wallet-panel rounded-[1.6rem] p-4 sm:p-6 sm:col-span-2">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex h-8 sm:h-10 w-8 sm:w-10 items-center justify-center rounded-xl border border-white/50 bg-white/70 shadow-sm">
              <svg width="16 sm:20" height="16 sm:20" viewBox="0 0 24 24" fill="none" stroke="var(--forest)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--stone)]">XLM Balance</p>
              <p className="text-[10px] sm:text-xs text-[var(--stone)] font-mono-data">{NETWORK} ledger</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void refreshBalance()}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--faded-sage)] bg-white/60 px-3 py-2 text-xs font-semibold text-[var(--forest)] transition hover:bg-white/90 disabled:opacity-50"
          >
            {isRefreshing ? (
              <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 2v6h-6" />
                <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                <path d="M3 22v-6h6" />
                <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
              </svg>
            )}
            {isRefreshing ? "Syncing" : "Refresh"}
          </button>
        </div>

        <p className="text-3xl sm:text-4xl font-heading font-bold text-[var(--dark-ink)]">
          {isRefreshing ? (
            <span className="text-xl text-[var(--stone)]">Loading…</span>
          ) : (
            <>{formatBalance(balance)} <span className="text-lg text-[var(--stone)] font-normal">XLM</span></>
          )}
        </p>
        <p className="mt-2 text-xs text-[var(--stone)]">
          Native balance fetched from Horizon
        </p>
      </div>

      {/* Ledger */}
      <div className="wallet-panel rounded-[1.6rem] p-6 flex flex-col justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--stone)]">Ledger Sync</p>
          <p className="mt-3 text-2xl font-heading font-bold text-[var(--dark-ink)]">
            {lastLedger ? `#${lastLedger}` : "Pending"}
          </p>
        </div>
        <p className="mt-2 text-xs text-[var(--stone)]">Most recent observed account update</p>
      </div>

      {/* Connected Wallet Info */}
      <div className="wallet-panel rounded-[1.6rem] p-6 sm:col-span-3">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/50 bg-[var(--forest)]/10">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--forest)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--stone)]">Connected Wallet</p>
            <p className="mt-1 font-mono-data text-sm text-[var(--dark-ink)] truncate">{walletAddress}</p>
          </div>
          <div className="rounded-full bg-[var(--forest)]/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[var(--forest)]">
            {NETWORK}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Payment Panel (for Payments tab) ────────────────────

function FeedbackPanel({ state }: { state: TransferState }) {
  const isSuccess = state.type === "success";
  const isError = state.type === "error";

  return (
    <div
      className={`wallet-panel relative overflow-hidden rounded-[1.6rem] p-5 transition-all duration-500 ${
        isSuccess ? "border-[var(--forest)]/25" : isError ? "border-[var(--terra)]/25" : ""
      }`}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent opacity-70" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--stone)]">Transfer Status</p>
          <p className="mt-2 text-base font-heading font-bold text-[var(--dark-ink)]">
            {isSuccess ? "Transaction cleared" : isError ? "Action needs attention" : "Payment status"}
          </p>
          <p className={`mt-1 text-sm ${isError ? "text-[var(--terra)]" : "text-[var(--dark-ink)]/70"}`}>
            {state.message}
          </p>
        </div>
        <div
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.22em] ${
            isSuccess
              ? "bg-[var(--forest)]/10 text-[var(--forest)]"
              : isError
                ? "bg-[var(--terra)]/10 text-[var(--terra)]"
                : "bg-white/65 text-[var(--stone)]"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              isSuccess
                ? "bg-[var(--forest)]"
                : isError
                  ? "bg-[var(--terra)]"
                  : "bg-[var(--amber-sap)] animate-pulse"
            }`}
          />
          {state.type}
        </div>
      </div>

      {state.type === "success" && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-white/70 p-3">
            <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--stone)]">Amount</p>
            <p className="mt-1 text-sm font-semibold text-[var(--dark-ink)]">{formatBalance(state.amount)} XLM</p>
          </div>
          <div className="rounded-xl bg-white/70 p-3">
            <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--stone)]">Destination</p>
            <p className="mt-1 font-mono-data text-sm text-[var(--dark-ink)]">{formatAddress(state.destination)}</p>
          </div>
          <div className="rounded-xl bg-white/70 p-3 sm:col-span-2">
            <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--stone)]">Hash</p>
            <p className="mt-1 break-all font-mono-data text-xs text-[var(--dark-ink)]/80">{state.hash}</p>
            <a
              href={state.explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-[var(--forest)] underline decoration-[var(--forest)]/30 underline-offset-4"
            >
              View on Horizon
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 17 17 7" />
                <path d="M7 7h10v10" />
              </svg>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export function PaymentPanel({ walletAddress }: { walletAddress: string }) {
  const { showToast } = useToast();
  const [balance, setBalance] = useState("0");
  const [isRefreshing, setIsRefreshing] = useState(true);
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [transferState, setTransferState] = useState<TransferState>(INITIAL_TRANSFER_STATE);

  const horizonTxBase = HORIZON_URL.replace(/\/$/, "");
  const canSubmit = Boolean(destination.trim() && amount.trim() && !isSending);

  const refreshBalance = useCallback(async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const result = await fetchXlmBalance(walletAddress);
      setBalance(result.balance);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load XLM balance.";
      if (!silent) showToast(message, "error");
    } finally {
      setIsRefreshing(false);
    }
  }, [showToast, walletAddress]);

  useEffect(() => {
    void refreshBalance();
  }, [refreshBalance]);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;

    setIsSending(true);
    setTransferState({
      type: "signing",
      message: "Opening your wallet to approve the payment.",
    });
    showToast("Approve the payment in your wallet.", "info");

    try {
      const result = await sendXlmTransaction({
        source: walletAddress,
        destination: destination.trim(),
        amount: amount.trim(),
        memo: memo.trim(),
      });

      setTransferState({
        type: "submitting",
        message: "Signed. Waiting for Stellar Horizon to finalize.",
      });

      const explorerUrl = `${horizonTxBase}/transactions/${result.hash}`;
      setTransferState({
        type: "success",
        message: `${formatBalance(result.amount)} XLM arrived at ${formatAddress(result.destination)}.`,
        hash: result.hash,
        amount: result.amount,
        destination: result.destination,
        explorerUrl,
      });
      showToast("XLM transaction submitted successfully.", "success");

      setDestination("");
      setAmount("");
      setMemo("");
      await refreshBalance(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Transaction failed.";
      setTransferState({ type: "error", message });
      showToast(message, "error");
    } finally {
      setIsSending(false);
    }
  }, [amount, canSubmit, destination, horizonTxBase, memo, refreshBalance, showToast, walletAddress]);

  return (
    <div className="space-y-5">
      {/* Available balance */}
      <div className="wallet-panel rounded-[1.6rem] p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--stone)]">Available Balance</p>
            <p className="mt-2 text-2xl font-heading font-bold text-[var(--dark-ink)]">
              {isRefreshing ? "Loading…" : `${formatBalance(balance)} XLM`}
            </p>
          </div>
          <div className="rounded-full bg-white/70 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-[var(--stone)]">
            Testnet only
          </div>
        </div>
      </div>

      {/* Send form */}
      <div className="wallet-panel rounded-[1.6rem] p-6">
        <h3 className="text-lg font-heading font-bold text-[var(--dark-ink)] mb-5">Send XLM</h3>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--stone)]">
              Destination
            </span>
            <input
              value={destination}
              onChange={(event) => setDestination(event.target.value)}
              placeholder="G..."
              className="wallet-input"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-[0.8fr_1.2fr]">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--stone)]">
                Amount
              </span>
              <input
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                inputMode="decimal"
                placeholder="25.50"
                className="wallet-input"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--stone)]">
                Memo
              </span>
              <input
                value={memo}
                onChange={(event) => setMemo(event.target.value.slice(0, 28))}
                placeholder="Optional note"
                className="wallet-input"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
            className="wallet-send-button"
          >
            {isSending ? (
              <>
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                Sending…
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 2 11 13" />
                  <path d="m22 2-7 20-4-9-9-4Z" />
                </svg>
                Send XLM
              </>
            )}
          </button>

          <p className="text-xs leading-6 text-[var(--stone)]">
            Your wallet will sign the transaction. Destination must be funded on Stellar testnet.
          </p>
        </div>
      </div>

      {/* Transfer feedback */}
      <FeedbackPanel state={transferState} />
    </div>
  );
}

// Keep default export for backward compat (not used anymore in new dashboard)
export default function WalletCockpit({ walletAddress }: { walletAddress: string }) {
  return (
    <div className="space-y-6">
      <BalanceOverview walletAddress={walletAddress} />
      <PaymentPanel walletAddress={walletAddress} />
    </div>
  );
}
