#![allow(non_snake_case)]
#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, log, symbol_short, Address, Env, String,
    Symbol, Vec,
};

// ─────────────────────────────────────────────────────────────────────────────
//  ERROR CODES
// ─────────────────────────────────────────────────────────────────────────────

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum ContractError {
    /// The target wallet does not exist or is inactive.
    WalletNotFound = 1,
    /// A wallet cannot endorse or report itself.
    SelfInteraction = 2,
    /// This caller has already endorsed/reported this target wallet.
    DuplicateInteraction = 3,
    /// The wallet address is already registered.
    AlreadyRegistered = 4,
    /// The caller is not the contract administrator.
    Unauthorized = 5,
    /// The target wallet is already deactivated.
    AlreadyDeactivated = 6,
    /// The reason string is empty.
    EmptyReason = 7,
}

// ─────────────────────────────────────────────────────────────────────────────
//  DATA STRUCTURES
// ─────────────────────────────────────────────────────────────────────────────

/// Global ledger-wide statistics across all wallets tracked on this dApp.
#[contracttype]
#[derive(Clone)]
pub struct GlobalStats {
    pub total_wallets: u64,
    pub total_endorsements: u64,
    pub total_reports: u64,
}

/// On-chain reputation record for a single wallet address (keyed by wallet_id).
#[contracttype]
#[derive(Clone)]
pub struct ReputationRecord {
    pub wallet_id: u64,
    pub score: i64,
    pub endorsement_count: u64,
    pub report_count: u64,
    pub last_updated: u64,
    pub is_active: bool,
}

/// An individual endorsement or report event, stored per submission.
#[contracttype]
#[derive(Clone)]
pub struct InteractionLog {
    pub log_id: u64,
    pub caller_wallet_id: u64,
    pub target_wallet_id: u64,
    pub is_endorsement: bool,
    pub reason: String,
    pub timestamp: u64,
}

// ─────────────────────────────────────────────────────────────────────────────
//  STORAGE KEYS
// ─────────────────────────────────────────────────────────────────────────────

const GLOBAL_STATS: Symbol = symbol_short!("GLB_STATS");
const COUNT_WALLET: Symbol = symbol_short!("C_WALLET");
const COUNT_LOG: Symbol = symbol_short!("C_LOG");
const ADMIN: Symbol = symbol_short!("ADMIN");

/// Composite storage keys for ReputationRecord entries.
#[contracttype]
pub enum WalletBook {
    Wallet(u64),
}

/// Composite storage keys for InteractionLog entries.
#[contracttype]
pub enum LogBook {
    Log(u64),
}

/// Composite storage keys for address-to-ID mapping.
#[contracttype]
pub enum AddressBook {
    Address(Address),
}

/// Tracks all log IDs for a specific wallet (for history viewing).
#[contracttype]
pub enum WalletLogs {
    WalletLogIds(u64),
}

/// Tracks unique caller→target endorsement/report pairs to prevent duplicates.
#[contracttype]
pub enum InteractionPair {
    /// (caller_wallet_id, target_wallet_id, is_endorsement)
    Pair(u64, u64, bool),
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
/// Minimum reputation score floor to prevent infinite griefing.
const MIN_SCORE: i64 = -100;

// ─────────────────────────────────────────────────────────────────────────────
//  CONTRACT
// ─────────────────────────────────────────────────────────────────────────────

#[contract]
pub struct WalletReputationGraph;

#[contractimpl]
impl WalletReputationGraph {
    // ─────────────────────────────────────────────────────────────────────────
    //  INITIALIZE
    //  Sets the admin address. Can only be called once.
    // ─────────────────────────────────────────────────────────────────────────
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&ADMIN) {
            panic!("Already initialized");
        }
        env.storage().instance().set(&ADMIN, &admin);
        env.storage().instance().extend_ttl(TTL_EXTEND, TTL_EXTEND);
        log!(&env, "Contract initialized with admin");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  REGISTER WALLET
    //  Registers the caller's wallet on the reputation graph.
    //  The caller's Address is used (with require_auth) to ensure authenticity.
    //  Returns the assigned wallet_id, or the existing one if already registered.
    // ─────────────────────────────────────────────────────────────────────────
    pub fn register_wallet(env: Env, caller: Address) -> u64 {
        caller.require_auth();

        // Check if already registered
        let existing_id: u64 = env
            .storage()
            .instance()
            .get(&AddressBook::Address(caller.clone()))
            .unwrap_or(0_u64);

        if existing_id > 0 {
            log!(&env, "Wallet already registered with ID: {}", existing_id);
            return existing_id;
        }

        // Fetch (or initialise) the running wallet counter.
        let mut count_wallet: u64 =
            env.storage().instance().get(&COUNT_WALLET).unwrap_or(0_u64);
        count_wallet += 1;

        let time = env.ledger().timestamp();

        let record = ReputationRecord {
            wallet_id: count_wallet,
            score: 0,
            endorsement_count: 0,
            report_count: 0,
            last_updated: time,
            is_active: true,
        };

        // Update global stats.
        let mut stats = Self::view_global_stats(env.clone());
        stats.total_wallets += 1;

        // Persist everything.
        env.storage()
            .instance()
            .set(&WalletBook::Wallet(count_wallet), &record);
        env.storage()
            .instance()
            .set(&AddressBook::Address(caller), &count_wallet);
        env.storage().instance().set(&COUNT_WALLET, &count_wallet);
        env.storage().instance().set(&GLOBAL_STATS, &stats);
        env.storage().instance().extend_ttl(TTL_EXTEND, TTL_EXTEND);

        log!(&env, "New wallet registered. wallet_id = {}", count_wallet);
        count_wallet
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  GET WALLET ID BY ADDRESS (read-only)
    //  Returns 0 if the address is not registered.
    // ─────────────────────────────────────────────────────────────────────────
    pub fn get_wallet_id_by_address(env: Env, address: Address) -> u64 {
        env.storage()
            .instance()
            .get(&AddressBook::Address(address))
            .unwrap_or(0_u64)
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  ENDORSE WALLET
    //  Submits a positive endorsement. Requires caller auth.
    //  Guards: target must exist & be active, no self-endorsement,
    //          no duplicate endorsement of same target.
    // ─────────────────────────────────────────────────────────────────────────
    pub fn endorse_wallet(
        env: Env,
        caller: Address,
        target_wallet_id: u64,
        reason: String,
    ) -> Result<u64, ContractError> {
        caller.require_auth();

        // Validate reason is not empty
        if reason.len() == 0 {
            return Err(ContractError::EmptyReason);
        }

        // Get caller's wallet ID
        let caller_wallet_id: u64 = env
            .storage()
            .instance()
            .get(&AddressBook::Address(caller.clone()))
            .unwrap_or(0_u64);

        // Prevent self-endorsement
        if caller_wallet_id > 0 && caller_wallet_id == target_wallet_id {
            return Err(ContractError::SelfInteraction);
        }

        // Check target exists and is active
        let mut record = Self::view_wallet_reputation(env.clone(), target_wallet_id);
        if !record.is_active || record.wallet_id == 0 {
            return Err(ContractError::WalletNotFound);
        }

        // Check for duplicate endorsement
        if caller_wallet_id > 0 {
            let pair_key = InteractionPair::Pair(caller_wallet_id, target_wallet_id, true);
            if env.storage().instance().has(&pair_key) {
                return Err(ContractError::DuplicateInteraction);
            }
            // Mark this pair
            env.storage().instance().set(&pair_key, &true);
        }

        let time = env.ledger().timestamp();

        // Update reputation record.
        record.score += ENDORSE_WEIGHT;
        record.endorsement_count += 1;
        record.last_updated = time;

        // Fetch and increment the log counter.
        let mut count_log: u64 = env.storage().instance().get(&COUNT_LOG).unwrap_or(0_u64);
        count_log += 1;

        let log_entry = InteractionLog {
            log_id: count_log,
            caller_wallet_id,
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

        // Track log in wallet's history.
        let mut wallet_log_ids: Vec<u64> = env
            .storage()
            .instance()
            .get(&WalletLogs::WalletLogIds(target_wallet_id))
            .unwrap_or(Vec::new(&env));
        wallet_log_ids.push_back(count_log);
        env.storage()
            .instance()
            .set(&WalletLogs::WalletLogIds(target_wallet_id), &wallet_log_ids);

        env.storage().instance().extend_ttl(TTL_EXTEND, TTL_EXTEND);

        log!(
            &env,
            "Wallet {} endorsed. New score = {}. log_id = {}",
            target_wallet_id,
            record.score,
            count_log
        );

        Ok(count_log)
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  REPORT WALLET
    //  Submits a negative report. Requires caller auth.
    //  Guards: target must exist & be active, no self-report,
    //          no duplicate report of same target. Score has a floor of MIN_SCORE.
    // ─────────────────────────────────────────────────────────────────────────
    pub fn report_wallet(
        env: Env,
        caller: Address,
        target_wallet_id: u64,
        reason: String,
    ) -> Result<u64, ContractError> {
        caller.require_auth();

        // Validate reason is not empty
        if reason.len() == 0 {
            return Err(ContractError::EmptyReason);
        }

        // Get caller's wallet ID
        let caller_wallet_id: u64 = env
            .storage()
            .instance()
            .get(&AddressBook::Address(caller.clone()))
            .unwrap_or(0_u64);

        // Prevent self-reporting
        if caller_wallet_id > 0 && caller_wallet_id == target_wallet_id {
            return Err(ContractError::SelfInteraction);
        }

        // Check target exists and is active
        let mut record = Self::view_wallet_reputation(env.clone(), target_wallet_id);
        if !record.is_active || record.wallet_id == 0 {
            return Err(ContractError::WalletNotFound);
        }

        // Check for duplicate report
        if caller_wallet_id > 0 {
            let pair_key = InteractionPair::Pair(caller_wallet_id, target_wallet_id, false);
            if env.storage().instance().has(&pair_key) {
                return Err(ContractError::DuplicateInteraction);
            }
            env.storage().instance().set(&pair_key, &true);
        }

        let time = env.ledger().timestamp();

        // Penalise reputation with floor guard.
        record.score = (record.score - REPORT_WEIGHT).max(MIN_SCORE);
        record.report_count += 1;
        record.last_updated = time;

        // Fetch and increment the log counter.
        let mut count_log: u64 = env.storage().instance().get(&COUNT_LOG).unwrap_or(0_u64);
        count_log += 1;

        let log_entry = InteractionLog {
            log_id: count_log,
            caller_wallet_id,
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

        // Track log in wallet's history.
        let mut wallet_log_ids: Vec<u64> = env
            .storage()
            .instance()
            .get(&WalletLogs::WalletLogIds(target_wallet_id))
            .unwrap_or(Vec::new(&env));
        wallet_log_ids.push_back(count_log);
        env.storage()
            .instance()
            .set(&WalletLogs::WalletLogIds(target_wallet_id), &wallet_log_ids);

        env.storage().instance().extend_ttl(TTL_EXTEND, TTL_EXTEND);

        log!(
            &env,
            "Wallet {} reported. New score = {}. log_id = {}",
            target_wallet_id,
            record.score,
            count_log
        );

        Ok(count_log)
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  DEACTIVATE WALLET  (admin-only)
    //  Disables a wallet, preventing further endorsements/reports to it.
    // ─────────────────────────────────────────────────────────────────────────
    pub fn deactivate_wallet(
        env: Env,
        admin: Address,
        wallet_id: u64,
    ) -> Result<(), ContractError> {
        admin.require_auth();

        // Verify admin
        let stored_admin: Address = env
            .storage()
            .instance()
            .get(&ADMIN)
            .expect("Not initialized");
        if admin != stored_admin {
            return Err(ContractError::Unauthorized);
        }

        let mut record = Self::view_wallet_reputation(env.clone(), wallet_id);
        if record.wallet_id == 0 {
            return Err(ContractError::WalletNotFound);
        }
        if !record.is_active {
            return Err(ContractError::AlreadyDeactivated);
        }

        record.is_active = false;
        record.last_updated = env.ledger().timestamp();

        env.storage()
            .instance()
            .set(&WalletBook::Wallet(wallet_id), &record);
        env.storage().instance().extend_ttl(TTL_EXTEND, TTL_EXTEND);

        log!(&env, "Wallet {} deactivated by admin", wallet_id);
        Ok(())
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  VIEW WALLET REPUTATION  (read-only)
    // ─────────────────────────────────────────────────────────────────────────
    pub fn view_wallet_reputation(env: Env, wallet_id: u64) -> ReputationRecord {
        env.storage()
            .instance()
            .get(&WalletBook::Wallet(wallet_id))
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
    //  VIEW GLOBAL STATS  (read-only)
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
    //  VIEW INTERACTION LOG  (read-only)
    // ─────────────────────────────────────────────────────────────────────────
    pub fn view_interaction_log(env: Env, log_id: u64) -> InteractionLog {
        env.storage()
            .instance()
            .get(&LogBook::Log(log_id))
            .unwrap_or(InteractionLog {
                log_id: 0,
                caller_wallet_id: 0,
                target_wallet_id: 0,
                is_endorsement: false,
                reason: String::from_str(&env, "Not_Found"),
                timestamp: 0,
            })
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  VIEW WALLET HISTORY  (read-only)
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

    // ─────────────────────────────────────────────────────────────────────────
    //  GET ADMIN  (read-only)
    // ─────────────────────────────────────────────────────────────────────────
    pub fn get_admin(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&ADMIN)
            .expect("Not initialized")
    }
}
