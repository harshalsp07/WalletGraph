"use client";

import {
  Contract,
  Networks,
  TransactionBuilder,
  Keypair,
  xdr,
  Address,
  nativeToScVal,
  scValToNative,
  rpc,
  Account,
} from "@stellar/stellar-sdk";
import {
  isConnected,
  getAddress,
  signTransaction,
  setAllowed,
  isAllowed,
  requestAccess,
} from "@stellar/freighter-api";

// ============================================================
// CONSTANTS
// ============================================================

export const CONTRACT_ADDRESS =
  "CA6QNK6HR7NOYC2MF6NUWBWMV4MXE4LKADVWVALSHZ3GRZ3BM52WFXDF";

export const NETWORK_PASSPHRASE = Networks.TESTNET;
export const RPC_URL = "https://soroban-testnet.stellar.org";
export const HORIZON_URL = "https://horizon-testnet.stellar.org";
export const NETWORK = "TESTNET";

// ============================================================
// RPC Server
// ============================================================

const server = new rpc.Server(RPC_URL);

// ============================================================
// Wallet Helpers
// ============================================================

export async function checkConnection(): Promise<boolean> {
  const result = await isConnected();
  return result.isConnected;
}

export async function connectWallet(): Promise<string> {
  const connResult = await isConnected();
  if (!connResult.isConnected) {
    throw new Error("Freighter extension is not installed or not available.");
  }

  const allowedResult = await isAllowed();
  if (!allowedResult.isAllowed) {
    await setAllowed();
    await requestAccess();
  }

  const { address } = await getAddress();
  if (!address) {
    throw new Error("Could not retrieve wallet address from Freighter.");
  }
  return address;
}

export async function getWalletAddress(): Promise<string | null> {
  try {
    const connResult = await isConnected();
    if (!connResult.isConnected) return null;

    const allowedResult = await isAllowed();
    if (!allowedResult.isAllowed) return null;

    const { address } = await getAddress();
    return address || null;
  } catch {
    return null;
  }
}

// ============================================================
// Contract Interaction Helpers
// ============================================================

export async function callContract(
  method: string,
  params: xdr.ScVal[] = [],
  caller: string,
  sign: boolean = true
) {
  const contract = new Contract(CONTRACT_ADDRESS);
  const account = sign 
    ? await server.getAccount(caller)
    : new Account(caller, "0");

  const tx = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...params))
    .setTimeout(30)
    .build();

  const simulated = await server.simulateTransaction(tx);

  if (rpc.Api.isSimulationError(simulated)) {
    const errorMsg = (simulated as rpc.Api.SimulateTransactionErrorResponse).error;
    if (typeof errorMsg === "string") {
      if (errorMsg.includes("UnreachableCodeReached") || errorMsg.includes("InvalidAction")) {
        if (method === "endorse_wallet" || method === "report_wallet") {
          throw new Error("This wallet is not registered on-chain. Use the Register tab to register it first, then you can endorse or report.");
        }
        if (errorMsg.includes("AlreadyRegistered")) {
          throw new Error("This wallet is already registered.");
        }
      }
      throw new Error(`Simulation failed: ${errorMsg}`);
    }
    throw new Error("Transaction simulation failed.");
  }

  if (!sign) {
    return simulated;
  }

  const prepared = rpc.assembleTransaction(tx, simulated).build();

  const { signedTxXdr } = await signTransaction(prepared.toXDR(), {
    networkPassphrase: NETWORK_PASSPHRASE,
  });

  const txToSubmit = TransactionBuilder.fromXDR(
    signedTxXdr,
    NETWORK_PASSPHRASE
  );

  const result = await server.sendTransaction(txToSubmit);

  if (result.status === "ERROR") {
    throw new Error(`Transaction submission failed: ${result.status}`);
  }

  let getResult = await server.getTransaction(result.hash);
  while (getResult.status === "NOT_FOUND") {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    getResult = await server.getTransaction(result.hash);
  }

  if (getResult.status === "FAILED") {
    throw new Error("Transaction failed on chain.");
  }

  return getResult;
}

export async function readContract(
  method: string,
  params: xdr.ScVal[] = [],
  caller?: string
) {
  const account = caller || Keypair.random().publicKey();
  const sim = await callContract(method, params, account, false);
  if (
    rpc.Api.isSimulationSuccess(sim as rpc.Api.SimulateTransactionResponse) &&
    (sim as rpc.Api.SimulateTransactionSuccessResponse).result
  ) {
    return scValToNative(
      (sim as rpc.Api.SimulateTransactionSuccessResponse).result!.retval
    );
  }
  return null;
}

// ============================================================
// ScVal Helpers
// ============================================================

export function toScValString(value: string): xdr.ScVal {
  return nativeToScVal(value, { type: "string" });
}

export function toScValU64(value: number | bigint): xdr.ScVal {
  return nativeToScVal(BigInt(value), { type: "u64" });
}

export function toScValAddress(address: string): xdr.ScVal {
  return new Address(address).toScVal();
}

// ============================================================
// Wallet Reputation Graph — Contract Methods
// ============================================================

/**
 * Register a new wallet identity (or return existing ID).
 * Returns: wallet_id (u64)
 */
export async function registerWallet(caller: string) {
  return callContract("register_wallet", [toScValAddress(caller)], caller, true);
}

/**
 * Get wallet ID by wallet address (read-only).
 * Returns: wallet_id (u64) or 0 if not registered
 */
export async function getWalletIdByAddress(address: string, caller?: string) {
  return readContract(
    "get_wallet_id_by_address",
    [toScValString(address)],
    caller
  );
}

/**
 * View all interaction history for a wallet (read-only).
 * Returns: Vec<InteractionLog>
 */
export async function viewWalletHistory(walletId: number, caller?: string) {
  return readContract(
    "view_wallet_history",
    [toScValU64(walletId)],
    caller
  );
}

/**
 * Endorse a wallet with a reason.
 * Returns: log_id (u64)
 */
export async function endorseWallet(
  caller: string,
  targetWalletId: number,
  reason: string
) {
  return callContract(
    "endorse_wallet",
    [toScValU64(targetWalletId), toScValString(reason)],
    caller,
    true
  );
}

/**
 * Report a wallet with a reason (-3 score).
 * Returns: log_id (u64)
 */
export async function reportWallet(
  caller: string,
  targetWalletId: number,
  reason: string
) {
  return callContract(
    "report_wallet",
    [toScValU64(targetWalletId), toScValString(reason)],
    caller,
    true
  );
}

/**
 * View a wallet's reputation record (read-only).
 */
export async function viewWalletReputation(
  walletId: number,
  caller?: string
) {
  return readContract(
    "view_wallet_reputation",
    [toScValU64(walletId)],
    caller
  );
}

/**
 * View platform-wide global stats (read-only).
 */
export async function viewGlobalStats(caller?: string) {
  return readContract("view_global_stats", [], caller);
}

/**
 * View a single interaction log entry (read-only).
 */
export async function viewInteractionLog(
  logId: number,
  caller?: string
) {
  return readContract(
    "view_interaction_log",
    [toScValU64(logId)],
    caller
  );
}

export { nativeToScVal, scValToNative, Address, xdr };
