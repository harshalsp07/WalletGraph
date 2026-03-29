#![allow(non_snake_case)]
#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, log, symbol_short, Env, String, Symbol, Vec,
};

// ─────────────────────────────────────────────────────────────────────────────
//  DATA STRUCTURES
// ─────────────────────────────────────────────────────────────────────────────

/// Global ledger-wide statistics across all wallets tracked on this dApp.
#[contracttype]
#[derive(Clone)]
pub struct GlobalStats {
    pub total_wallets: u64,      // Total unique wallets registered
    pub total_endorsements: u64, // Total endorsements ever submitted
    pub total_reports: u64,      // Total negative reports ever submitted
}

/// On-chain reputation record for a single wallet address (keyed by wallet_id).
#[contracttype]
#[derive(Clone)]
pub struct ReputationRecord {
    pub wallet_id: u64,         // Internal numeric ID of the wallet
    pub score: i64,             // Net reputation score  (endorsements – reports × REPORT_WEIGHT)
    pub endorsement_count: u64, // Cumulative endorsements received
    pub report_count: u64,      // Cumulative negative reports received
    pub last_updated: u64,      // Ledger timestamp of last interaction
    pub is_active: bool,        // Whether this wallet entry is active
}

/// An individual endorsement or report event, stored per submission.
#[contracttype]
#[derive(Clone)]
pub struct InteractionLog {
    pub log_id: u64,           // Unique log entry ID
    pub target_wallet_id: u64, // Wallet being endorsed / reported
    pub is_endorsement: bool,  // true = endorsement, false = report
    pub reason: String,        // Short human-readable reason
    pub timestamp: u64,        // Ledger timestamp
}

// ─────────────────────────────────────────────────────────────────────────────
//  STORAGE KEYS
// ─────────────────────────────────────────────────────────────────────────────

/// Key for the GlobalStats singleton stored in instance storage.
const GLOBAL_STATS: Symbol = symbol_short!("GLB_STATS");
/// Counter that generates unique wallet IDs.
const COUNT_WALLET: Symbol = symbol_short!("C_WALLET");
/// Counter that generates unique interaction-log IDs.
const COUNT_LOG: Symbol = symbol_short!("C_LOG");

/// Enum used to construct composite storage keys for ReputationRecord entries.
#[contracttype]
pub enum WalletBook {
    Wallet(u64), // keyed by wallet_id
}

/// Enum used to construct composite storage keys for InteractionLog entries.
#[contracttype]
pub enum LogBook {
    Log(u64), // keyed by log_id
}

/// Enum used to construct composite storage keys for address-to-ID mapping.
#[contracttype]
pub enum AddressBook {
    Address(String), // keyed by wallet address string
}

/// Enum for tracking all log IDs for a specific wallet (for history viewing).
#[contracttype]
pub enum WalletLogs {
    WalletLogIds(u64), // stores Vec<u64> of log_ids for a wallet_id
}

// ─────────────────────────────────────────────────────────────────────────────
//  CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/// Each negative report deducts this much from the reputation score.
const REPORT_WEIGHT: i64 = 3;
/// Each endorsement adds exactly 1 point to the score.
const ENDORSE_WEIGHT: i64 = 1;
/// TTL extension applied after every mutating call (in ledgers).
const TTL_EXTEND: u32 = 5_000;

// ─────────────────────────────────────────────────────────────────────────────
//  CONTRACT
// ─────────────────────────────────────────────────────────────────────────────

#[contract]
pub struct WalletReputationGraph;

#[contractimpl]
impl WalletReputationGraph {
    // ─────────────────────────────────────────────────────────────────────────
    //  FUNCTION 1 – register_wallet
    //  Registers a new wallet on the reputation graph and returns its
    //  auto-generated wallet_id. If the wallet address is already registered,
    //  returns the existing wallet_id. Panics if the wallet count would overflow.
    // ─────────────────────────────────────────────────────────────────────────
    pub fn register_wallet(env: Env, address: String) -> u64 {
        // Check if address is already registered
        let existing_id = Self::get_wallet_id_by_address(env.clone(), address.clone());
        if existing_id > 0 {
            log!(&env, "Wallet already registered with ID: {}", existing_id);
            return existing_id;
        }

        // Fetch (or initialise) the running wallet counter.
        let mut count_wallet: u64 = env.storage().instance().get(&COUNT_WALLET).unwrap_or(0_u64);

        count_wallet += 1;

        let time = env.ledger().timestamp();

        // Build a fresh ReputationRecord with neutral defaults.
        let record = ReputationRecord {
            wallet_id: count_wallet,
            score: 0,
            endorsement_count: 0,
            report_count: 0,
            last_updated: time,
            is_active: true,
        };

        // Update the global stats singleton.
        let mut stats = Self::view_global_stats(env.clone());
        stats.total_wallets += 1;

        // Persist everything.
        env.storage()
            .instance()
            .set(&WalletBook::Wallet(count_wallet), &record);
        env.storage()
            .instance()
            .set(&AddressBook::Address(address), &count_wallet);
        env.storage().instance().set(&COUNT_WALLET, &count_wallet);
        env.storage().instance().set(&GLOBAL_STATS, &stats);
        env.storage().instance().extend_ttl(TTL_EXTEND, TTL_EXTEND);

        log!(&env, "New wallet registered. wallet_id = {}", count_wallet);

        count_wallet // return the newly assigned wallet_id
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  HELPER – get_wallet_id_by_address
    //  Returns the wallet_id for a given wallet address.
    //  Returns 0 if the address is not registered.
    // ─────────────────────────────────────────────────────────────────────────
    pub fn get_wallet_id_by_address(env: Env, address: String) -> u64 {
        env.storage()
            .instance()
            .get(&AddressBook::Address(address))
            .unwrap_or(0_u64)
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  FUNCTION 2 – endorse_wallet
    //  Submits a positive endorsement for an existing, active wallet.
    //  Increments the wallet's score by ENDORSE_WEIGHT (+1) and logs the event.
    //  Panics if the target wallet does not exist or is inactive.
    // ─────────────────────────────────────────────────────────────────────────
    pub fn endorse_wallet(env: Env, target_wallet_id: u64, reason: String) -> u64 {
        let mut record = Self::view_wallet_reputation(env.clone(), target_wallet_id);

        if !record.is_active || record.wallet_id == 0 {
            log!(
                &env,
                "Endorsement failed: wallet {} not found or inactive",
                target_wallet_id
            );
            panic!("Target wallet does not exist or is inactive.");
        }

        let time = env.ledger().timestamp();

        // Update reputation record.
        record.score += ENDORSE_WEIGHT;
        record.endorsement_count += 1;
        record.last_updated = time;

        // Fetch and increment the log counter.
        let mut count_log: u64 = env.storage().instance().get(&COUNT_LOG).unwrap_or(0_u64);
        count_log += 1;

        // Build the interaction log entry.
        let log_entry = InteractionLog {
            log_id: count_log,
            target_wallet_id,
            is_endorsement: true,
            reason,
            timestamp: time,
        };

        // Update global stats.
        let mut stats = Self::view_global_stats(env.clone());
        stats.total_endorsements += 1;

        // Persist changes.
        env.storage()
            .instance()
            .set(&WalletBook::Wallet(target_wallet_id), &record);
        env.storage()
            .instance()
            .set(&LogBook::Log(count_log), &log_entry);
        env.storage().instance().set(&COUNT_LOG, &count_log);
        env.storage().instance().set(&GLOBAL_STATS, &stats);
        env.storage().instance().extend_ttl(TTL_EXTEND, TTL_EXTEND);

        // Also track this log_id in the wallet's history
        let mut wallet_log_ids: Vec<u64> = env
            .storage()
            .instance()
            .get(&WalletLogs::WalletLogIds(target_wallet_id))
            .unwrap_or(Vec::new(&env));
        wallet_log_ids.push_back(count_log);
        env.storage()
            .instance()
            .set(&WalletLogs::WalletLogIds(target_wallet_id), &wallet_log_ids);

        log!(
            &env,
            "Wallet {} endorsed. New score = {}. log_id = {}",
            target_wallet_id,
            record.score,
            count_log
        );

        count_log // return the log_id of this interaction
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  FUNCTION 3 – report_wallet
    //  Submits a negative report against an existing, active wallet.
    //  Deducts REPORT_WEIGHT (3 points) from the wallet's score and logs the
    //  event.  Score can go negative — there is no floor.
    //  Panics if the target wallet does not exist or is inactive.
    // ─────────────────────────────────────────────────────────────────────────
    pub fn report_wallet(env: Env, target_wallet_id: u64, reason: String) -> u64 {
        let mut record = Self::view_wallet_reputation(env.clone(), target_wallet_id);

        if !record.is_active || record.wallet_id == 0 {
            log!(
                &env,
                "Report failed: wallet {} not found or inactive",
                target_wallet_id
            );
            panic!("Target wallet does not exist or is inactive.");
        }

        let time = env.ledger().timestamp();

        // Penalise reputation.
        record.score -= REPORT_WEIGHT;
        record.report_count += 1;
        record.last_updated = time;

        // Fetch and increment the log counter.
        let mut count_log: u64 = env.storage().instance().get(&COUNT_LOG).unwrap_or(0_u64);
        count_log += 1;

        // Build the interaction log entry.
        let log_entry = InteractionLog {
            log_id: count_log,
            target_wallet_id,
            is_endorsement: false,
            reason,
            timestamp: time,
        };

        // Update global stats.
        let mut stats = Self::view_global_stats(env.clone());
        stats.total_reports += 1;

        // Persist changes.
        env.storage()
            .instance()
            .set(&WalletBook::Wallet(target_wallet_id), &record);
        env.storage()
            .instance()
            .set(&LogBook::Log(count_log), &log_entry);
        env.storage().instance().set(&COUNT_LOG, &count_log);
        env.storage().instance().set(&GLOBAL_STATS, &stats);
        env.storage().instance().extend_ttl(TTL_EXTEND, TTL_EXTEND);

        // Also track this log_id in the wallet's history
        let mut wallet_log_ids: Vec<u64> = env
            .storage()
            .instance()
            .get(&WalletLogs::WalletLogIds(target_wallet_id))
            .unwrap_or(Vec::new(&env));
        wallet_log_ids.push_back(count_log);
        env.storage()
            .instance()
            .set(&WalletLogs::WalletLogIds(target_wallet_id), &wallet_log_ids);

        log!(
            &env,
            "Wallet {} reported. New score = {}. log_id = {}",
            target_wallet_id,
            record.score,
            count_log
        );

        count_log // return the log_id of this interaction
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  FUNCTION 4 – view_wallet_reputation   (read-only)
    //  Returns the full ReputationRecord for a given wallet_id.
    //  If the wallet_id has never been registered, returns a zeroed-out default
    //  record (wallet_id == 0, is_active == false) so callers can detect it.
    // ─────────────────────────────────────────────────────────────────────────
    pub fn view_wallet_reputation(env: Env, wallet_id: u64) -> ReputationRecord {
        let key = WalletBook::Wallet(wallet_id);
        env.storage()
            .instance()
            .get(&key)
            .unwrap_or(ReputationRecord {
                wallet_id: 0,
                score: 0,
                endorsement_count: 0,
                report_count: 0,
                last_updated: 0,
                is_active: false,
            })
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  HELPER – view_global_stats   (read-only)
    //  Returns the platform-wide GlobalStats singleton.
    //  Returns all-zero defaults if the contract has never been used.
    // ─────────────────────────────────────────────────────────────────────────
    pub fn view_global_stats(env: Env) -> GlobalStats {
        env.storage()
            .instance()
            .get(&GLOBAL_STATS)
            .unwrap_or(GlobalStats {
                total_wallets: 0,
                total_endorsements: 0,
                total_reports: 0,
            })
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  HELPER – view_interaction_log   (read-only)
    //  Returns a single InteractionLog entry by its log_id.
    //  Returns a zeroed-out default if the log_id does not exist.
    // ─────────────────────────────────────────────────────────────────────────
    pub fn view_interaction_log(env: Env, log_id: u64) -> InteractionLog {
        let key = LogBook::Log(log_id);
        env.storage()
            .instance()
            .get(&key)
            .unwrap_or(InteractionLog {
                log_id: 0,
                target_wallet_id: 0,
                is_endorsement: false,
                reason: String::from_str(&env, "Not_Found"),
                timestamp: 0,
            })
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  HELPER – view_wallet_history   (read-only)
    //  Returns all interaction logs for a given wallet_id.
    //  Returns an empty vector if no interactions exist.
    // ─────────────────────────────────────────────────────────────────────────
    pub fn view_wallet_history(env: Env, wallet_id: u64) -> Vec<InteractionLog> {
        let wallet_log_ids: Vec<u64> = env
            .storage()
            .instance()
            .get(&WalletLogs::WalletLogIds(wallet_id))
            .unwrap_or(Vec::new(&env));

        let mut logs: Vec<InteractionLog> = Vec::new(&env);
        for i in 0..wallet_log_ids.len() {
            if let Some(log_id) = wallet_log_ids.get(i) {
                let log = Self::view_interaction_log(env.clone(), log_id);
                if log.log_id > 0 {
                    logs.push_back(log);
                }
            }
        }
        logs
    }
}
