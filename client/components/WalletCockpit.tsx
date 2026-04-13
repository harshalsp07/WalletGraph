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

type WalletCockpitProps = {
  walletAddress: string;
};

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

function WalletPulse() {
  return (
    <div className="relative flex h-14 w-14 items-center justify-center rounded-[1.4rem] border border-white/50 bg-white/70 shadow-[0_12px_30px_rgba(22,42,31,0.12)]">
      <span className="absolute inset-0 rounded-[1.4rem] bg-[radial-gradient(circle_at_center,rgba(75,110,72,0.25),transparent_70%)]" />
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="relative text-[var(--forest)]" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
        <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
        <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
      </svg>
    </div>
  );
}

function MetricTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="wallet-panel rounded-[1.6rem] p-5">
      <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--stone)]">{label}</p>
      <p className="mt-3 text-2xl font-heading font-bold text-[var(--dark-ink)]">{value}</p>
      <p className="mt-1 text-xs text-[var(--stone)]">{hint}</p>
    </div>
  );
}

function FeedbackPanel({ state }: { state: TransferState }) {
  const isSuccess = state.type === "success";
  const isError = state.type === "error";

  return (
    <div
      className={`wallet-panel relative overflow-hidden rounded-[1.8rem] p-5 transition-all duration-500 ${
        isSuccess ? "border-[var(--forest)]/25" : isError ? "border-[var(--terra)]/25" : ""
      }`}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent opacity-70" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--stone)]">Transfer Feed</p>
          <p className="mt-3 text-lg font-heading font-bold text-[var(--dark-ink)]">
            {isSuccess ? "Transaction cleared" : isError ? "Action needs attention" : "Payment status"}
          </p>
          <p className={`mt-2 text-sm ${isError ? "text-[var(--terra)]" : "text-[var(--dark-ink)]/70"}`}>
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
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-white/70 p-4">
            <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--stone)]">Amount</p>
            <p className="mt-2 text-base font-semibold text-[var(--dark-ink)]">{formatBalance(state.amount)} XLM</p>
          </div>
          <div className="rounded-2xl bg-white/70 p-4">
            <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--stone)]">Destination</p>
            <p className="mt-2 font-mono-data text-sm text-[var(--dark-ink)]">{formatAddress(state.destination)}</p>
          </div>
          <div className="rounded-2xl bg-white/70 p-4 sm:col-span-2">
            <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--stone)]">Hash</p>
            <p className="mt-2 break-all font-mono-data text-xs text-[var(--dark-ink)]/80">{state.hash}</p>
            <a
              href={state.explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-[var(--forest)] underline decoration-[var(--forest)]/30 underline-offset-4"
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

export default function WalletCockpit({ walletAddress }: WalletCockpitProps) {
  const { showToast } = useToast();
  const [balance, setBalance] = useState("0");
  const [lastLedger, setLastLedger] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(true);
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [transferState, setTransferState] = useState<TransferState>(INITIAL_TRANSFER_STATE);

  const horizonTxBase = HORIZON_URL.replace(/\/$/, "");
  const canSubmit = Boolean(destination.trim() && amount.trim() && !isSending);

  const refreshBalance = useCallback(async (silent = false) => {
    if (!silent) {
      setIsRefreshing(true);
    }

    try {
      const result = await fetchXlmBalance(walletAddress);
      setBalance(result.balance);
      setLastLedger(result.lastModifiedLedger ?? null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load XLM balance.";
      showToast(message, "error");
      setTransferState({
        type: "error",
        message,
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [showToast, walletAddress]);

  useEffect(() => {
    void refreshBalance();
  }, [refreshBalance]);

  useEffect(() => {
    const targets = document.querySelectorAll("[data-wallet-reveal]");
    if (targets.length === 0) return;

    animate(targets, {
      opacity: [0, 1],
      translateY: [24, 0],
      delay: (_, index) => index * 120,
      duration: 700,
      easing: "easeOutCubic",
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;

    setIsSending(true);
    setTransferState({
      type: "signing",
      message: "Opening your wallet so you can approve the XLM payment.",
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
        message: "Signed. Waiting for Stellar Horizon to finalize the transfer.",
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
      setTransferState({
        type: "error",
        message,
      });
      showToast(message, "error");
    } finally {
      setIsSending(false);
    }
  }, [amount, canSubmit, destination, horizonTxBase, memo, refreshBalance, showToast, walletAddress]);

  return (
    <section className="grid gap-6 xl:grid-cols-[1.2fr_0.9fr]">
      <div data-wallet-reveal className="wallet-hero-panel overflow-hidden rounded-[2rem] p-6 sm:p-8">
        <div className="wallet-hero-grid absolute inset-0 opacity-50" />
        <div className="relative z-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/65 px-3 py-1 text-[10px] uppercase tracking-[0.28em] text-[var(--forest)]">
                <span className="h-2 w-2 rounded-full bg-[var(--forest)] animate-pulse" />
                Wallet cockpit
              </div>
              <h2 className="mt-5 max-w-lg text-4xl font-heading font-bold leading-none text-[var(--dark-ink)] sm:text-5xl">
                Send value with a skyline view of your Stellar balance.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-[var(--dark-ink)]/72 sm:text-base">
                Live XLM balance, signed testnet payments, and transaction feedback designed to feel like a mission control desk instead of a plain form.
              </p>
            </div>
            <div className="flex items-center gap-4 self-start rounded-[1.8rem] border border-white/60 bg-white/55 p-4 shadow-[0_16px_50px_rgba(21,46,31,0.12)] backdrop-blur-xl">
              <WalletPulse />
              <div>
                <p className="text-[10px] uppercase tracking-[0.24em] text-[var(--stone)]">Connected wallet</p>
                <p className="mt-2 font-mono-data text-sm text-[var(--dark-ink)]">{formatAddress(walletAddress)}</p>
                <p className="mt-1 text-xs text-[var(--stone)]">{NETWORK} ledger</p>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <MetricTile
              label="XLM Available"
              value={isRefreshing ? "Loading..." : `${formatBalance(balance)} XLM`}
              hint="Native balance fetched from Horizon"
            />
            <MetricTile
              label="Ledger Sync"
              value={lastLedger ? `#${lastLedger}` : "Pending"}
              hint="Most recent observed account update"
            />
            <div className="wallet-panel rounded-[1.6rem] p-5">
              <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--stone)]">Actions</p>
              <button
                type="button"
                onClick={() => void refreshBalance()}
                disabled={isRefreshing}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--forest)]/15 bg-[var(--forest)] px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(75,110,72,0.28)] transition hover:-translate-y-0.5 hover:bg-[#3f5d3d] disabled:translate-y-0 disabled:opacity-60"
              >
                {isRefreshing ? (
                  <>
                    <svg className="animate-spin" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    Syncing…
                  </>
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 2v6h-6" />
                      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                      <path d="M3 22v-6h6" />
                      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                    </svg>
                    Refresh balance
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div data-wallet-reveal className="wallet-panel rounded-[2rem] p-6 sm:p-7">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--stone)]">Send XLM</p>
            <h3 className="mt-3 text-2xl font-heading font-bold text-[var(--dark-ink)]">Launch a payment</h3>
          </div>
          <div className="rounded-full bg-white/70 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-[var(--stone)]">
            Testnet only
          </div>
        </div>

        <div className="mt-6 space-y-4">
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
                Sending through Stellar…
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 2 11 13" />
                  <path d="m22 2-7 20-4-9-9-4Z" />
                </svg>
                Send XLM transaction
              </>
            )}
          </button>

          <p className="text-xs leading-6 text-[var(--stone)]">
            WalletGraph will ask your connected wallet to sign a native XLM payment. Destination wallets must already exist on Stellar testnet.
          </p>
        </div>
      </div>

      <div data-wallet-reveal className="xl:col-span-2">
        <FeedbackPanel state={transferState} />
      </div>
    </section>
  );
}
