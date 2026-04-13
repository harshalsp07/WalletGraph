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
  "CDHR3VDMHNWYXAF6ZNJEVUQWOU6P7TP45OMWOYM3TLACOZOEOIPJOOSX";

export const NETWORK_PASSPHRASE = Networks.TESTNET;
export const RPC_URL = "https://soroban-testnet.stellar.org";
export const HORIZON_URL = "https://horizon-testnet.stellar.org";
export const NETWORK = "TESTNET";

// ============================================================
// Error Codes (must match contracterror in lib.rs)
// ============================================================

const CONTRACT_ERRORS: Record<number, string> = {
  1: "The target wallet does not exist or is inactive.",
  2: "A wallet cannot endorse or report itself.",
  3: "You have already endorsed/reported this wallet.",
  4: "This wallet address is already registered.",
  5: "Unauthorized — only the admin can perform this action.",
  6: "This wallet is already deactivated.",
  7: "The reason cannot be empty.",
};

// ============================================================
// RPC Server
// ============================================================

const server = new rpc.Server(RPC_URL);

type WalletProvider = "freighter" | "rabet" | "xbull" | "lobstr";

type InjectedRabet = {
  connect?: () => Promise<unknown>;
  getAddress?: () => Promise<string>;
  sign?: (xdr: string, networkPassphrase: string) => Promise<{ xdr: string } | string>;
};

type InjectedXBull = {
  getAddress?: () => Promise<string>;
  connect?: () => Promise<unknown>;
  signTransaction?: (xdr: string, opts?: { network: string }) => Promise<{ signedTxXdr?: string; xdr?: string } | string>;
};

export type WalletProviderStatus = {
  provider: WalletProvider;
  available: boolean;
  canConnect: boolean;
  canSign: boolean;
  comingSoon: boolean;
  label: string;
  message: string;
};

const ACTIVE_WALLET_KEY = "walletgraph.activeWallet";

function getRabetProvider(): InjectedRabet | null {
  if (typeof window === "undefined") return null;
  return ((window as typeof window & { rabet?: InjectedRabet }).rabet ?? null);
}

function getXBullProvider(): InjectedXBull | null {
  if (typeof window === "undefined") return null;
  return ((window as typeof window & { xBullSDK?: InjectedXBull }).xBullSDK ?? null);
}

export function getActiveWalletProvider(): WalletProvider {
  if (typeof window === "undefined") return "freighter";
  const stored = window.localStorage.getItem(ACTIVE_WALLET_KEY);
  if (stored === "freighter" || stored === "rabet" || stored === "xbull" || stored === "lobstr") {
    return stored;
  }
  return "freighter";
}

function setActiveWalletProvider(provider: WalletProvider) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACTIVE_WALLET_KEY, provider);
}

export function getWalletProviderStatus(provider: WalletProvider): WalletProviderStatus {
  if (provider === "freighter") {
    return {
      provider,
      available: true,
      canConnect: true,
      canSign: true,
      comingSoon: false,
      label: "Recommended",
      message: "Best end-to-end support for WalletGraph on-chain actions.",
    };
  }

  if (provider === "rabet") {
    const rabet = getRabetProvider();
    const installed = !!rabet;
    const canSign = !!rabet?.sign;
    return {
      provider,
      available: installed,
      canConnect: installed,
      canSign,
      comingSoon: false,
      label: installed ? (canSign ? "Installed" : "Installed with limited signing") : "Install required",
      message: installed
        ? canSign
          ? "Rabet is available and can attempt transaction signing."
          : "Rabet is available for login, but transaction signing may be unavailable in this browser."
        : "Install the Rabet extension to continue with this wallet.",
    };
  }

  if (provider === "xbull") {
    const xbull = getXBullProvider();
    const installed = !!xbull;
    const canSign = !!xbull?.signTransaction;
    return {
      provider,
      available: installed,
      canConnect: installed,
      canSign,
      comingSoon: false,
      label: installed ? (canSign ? "Installed" : "Installed with limited signing") : "Install required",
      message: installed
        ? canSign
          ? "xBull is available and exposes transaction signing."
          : "xBull is available for connection, but signing support was not detected."
        : "Install the xBull extension to continue with this wallet.",
    };
  }

  return {
    provider,
    available: false,
    canConnect: false,
    canSign: false,
    comingSoon: true,
    label: "Coming soon",
    message: "LOBSTR login is planned, but browser-based auth is not available yet.",
  };
}

// ============================================================
// Wallet Helpers
// ============================================================

export async function checkConnection(provider: WalletProvider = getActiveWalletProvider()): Promise<boolean> {
  if (provider === "freighter") {
    const result = await isConnected();
    return result.isConnected;
  }

  if (provider === "rabet") {
    const rabet = getRabetProvider();
    if (!rabet?.getAddress) return false;
    try {
      const address = await rabet.getAddress();
      return !!address;
    } catch {
      return false;
    }
  }

  if (provider === "xbull") {
    const xbull = getXBullProvider();
    if (!xbull?.getAddress) return false;
    try {
      const address = await xbull.getAddress();
      return !!address;
    } catch {
      return false;
    }
  }

  return false;
}

export async function connectWallet(provider: WalletProvider = "freighter"): Promise<string> {
  setActiveWalletProvider(provider);
  const status = getWalletProviderStatus(provider);

  if (status.comingSoon) {
    throw new Error("LOBSTR support is coming soon. Please choose Freighter, Rabet, or xBull for now.");
  }

  if (provider === "rabet") {
    const rabet = getRabetProvider();
    if (!rabet) {
      throw new Error("Rabet wallet extension not detected.");
    }
    if (rabet.connect) {
      await rabet.connect();
    }
    if (!rabet.getAddress) {
      throw new Error("Rabet wallet API is missing getAddress().");
    }
    const address = await rabet.getAddress();
    if (!address) {
      throw new Error("Could not retrieve wallet address from Rabet.");
    }
    return address;
  }

  if (provider === "xbull") {
    const xbull = getXBullProvider();
    if (!xbull) {
      throw new Error("xBull wallet extension not detected.");
    }
    if (xbull.connect) {
      await xbull.connect();
    }
    if (!xbull.getAddress) {
      throw new Error("xBull wallet API is missing getAddress().");
    }
    const address = await xbull.getAddress();
    if (!address) {
      throw new Error("Could not retrieve wallet address from xBull.");
    }
    return address;
  }

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

export async function getWalletAddress(provider: WalletProvider = getActiveWalletProvider()): Promise<string | null> {
  try {
    if (provider === "rabet") {
      const rabet = getRabetProvider();
      if (!rabet?.getAddress) return null;
      const address = await rabet.getAddress();
      return address || null;
    }

    if (provider === "xbull") {
      const xbull = getXBullProvider();
      if (!xbull?.getAddress) return null;
      const address = await xbull.getAddress();
      return address || null;
    }

    if (provider === "lobstr") {
      return null;
    }

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

function parseContractError(errorMsg: string): string {
  // Try to extract error code from Soroban error messages
  const codeMatch = errorMsg.match(/Error\(Contract, #(\d+)\)/);
  if (codeMatch) {
    const code = parseInt(codeMatch[1]);
    return CONTRACT_ERRORS[code] || `Contract error #${code}`;
  }
  return errorMsg;
}

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
      const friendlyMsg = parseContractError(errorMsg);
      throw new Error(friendlyMsg);
    }
    throw new Error("Transaction simulation failed.");
  }

  if (!sign) {
    return simulated;
  }

  const prepared = rpc.assembleTransaction(tx, simulated).build();

  const walletProvider = getActiveWalletProvider();
  let signedTxXdr: string;
  if (walletProvider === "freighter") {
    const signedResult = await signTransaction(prepared.toXDR(), {
      networkPassphrase: NETWORK_PASSPHRASE,
    });
    signedTxXdr = signedResult.signedTxXdr;
  } else if (walletProvider === "rabet") {
    const rabet = getRabetProvider();
    if (!rabet?.sign) {
      throw new Error("Rabet signing is unavailable. Use Freighter for contract interactions.");
    }
    const signed = await rabet.sign(prepared.toXDR(), NETWORK_PASSPHRASE);
    signedTxXdr = typeof signed === "string" ? signed : signed.xdr;
  } else if (walletProvider === "xbull") {
    const xbull = getXBullProvider();
    if (!xbull?.signTransaction) {
      throw new Error("xBull signing is unavailable. Use Freighter for contract interactions.");
    }
    const signed = await xbull.signTransaction(prepared.toXDR(), { network: NETWORK });
    signedTxXdr =
      typeof signed === "string"
        ? signed
        : (signed.signedTxXdr ?? signed.xdr ?? "");
  } else {
    throw new Error("Selected wallet provider cannot sign transactions yet.");
  }

  if (!signedTxXdr) {
    throw new Error("Wallet did not return a signed transaction.");
  }

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
 * Caller's address is used for auth.
 * Returns: wallet_id (u64)
 */
export async function registerWallet(caller: string) {
  return callContract(
    "register_wallet",
    [toScValAddress(caller)],
    caller,
    true
  );
}

/**
 * Get wallet ID by wallet address (read-only).
 * Uses Address type now.
 * Returns: wallet_id (u64) or 0 if not registered
 */
export async function getWalletIdByAddress(address: string, caller?: string) {
  return readContract(
    "get_wallet_id_by_address",
    [toScValAddress(address)],
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
 * Caller address is passed for auth + self-endorsement guard.
 * Returns: log_id (u64)
 */
export async function endorseWallet(
  caller: string,
  targetWalletId: number,
  reason: string
) {
  return callContract(
    "endorse_wallet",
    [toScValAddress(caller), toScValU64(targetWalletId), toScValString(reason)],
    caller,
    true
  );
}

/**
 * Report a wallet with a reason (-3 score, floor at -100).
 * Caller address is passed for auth + self-report guard.
 * Returns: log_id (u64)
 */
export async function reportWallet(
  caller: string,
  targetWalletId: number,
  reason: string
) {
  return callContract(
    "report_wallet",
    [toScValAddress(caller), toScValU64(targetWalletId), toScValString(reason)],
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

export type { WalletProvider };
export { nativeToScVal, scValToNative, Address, xdr };
