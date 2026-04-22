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
    /// The issuer does not exist.
    IssuerNotFound = 8,
    /// The caller is not a registered issuer.
    NotAnIssuer = 9,
    /// The certificate does not exist.
    CertificateNotFound = 10,
    /// The certificate has expired.
    CertificateExpired = 11,
    /// The certificate has been revoked.
    CertificateRevoked = 12,
    /// The recipient wallet is not registered.
    RecipientNotRegistered = 13,
    /// The dispute does not exist.
    DisputeNotFound = 14,
    /// Duplicate vote on a dispute.
    DuplicateVote = 15,
    /// Dispute is already resolved.
    DisputeAlreadyResolved = 16,
    /// Input string exceeds maximum length.
    InputTooLong = 17,
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
    pub total_certificates: u64,
    pub total_issuers: u64,
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
    /// Endorsement category: 0=General, 1=Trading, 2=Lending, 3=NFT,
    /// 4=Governance, 5=Development
    pub category: u32,
}

/// On-chain wallet profile (display name + bio).
#[contracttype]
#[derive(Clone)]
pub struct WalletProfile {
    pub display_name: String,
    pub bio: String,
    pub updated_at: u64,
}

/// An organization that can issue certificates.
#[contracttype]
#[derive(Clone)]
pub struct Issuer {
    pub issuer_id: u64,
    pub address: Address,
    pub name: String,
    pub description: String,
    pub logo_cid: String,
    pub is_verified: bool,
    pub total_issued: u64,
    pub registered_at: u64,
}

/// A certificate issued to a wallet by an issuer.
#[contracttype]
#[derive(Clone)]
pub struct Certificate {
    pub cert_id: u64,
    pub issuer_id: u64,
    pub recipient_wallet_id: u64,
    pub title: String,
    pub description: String,
    pub category: String,
    pub image_cid: String,
    pub issued_at: u64,
    pub expires_at: u64,
    pub is_revoked: bool,
}

/// A dispute filed against a report.
#[contracttype]
#[derive(Clone)]
pub struct Dispute {
    pub dispute_id: u64,
    pub wallet_id: u64,
    pub log_id: u64,
    pub reason: String,
    pub votes_for: u64,
    pub votes_against: u64,
    pub is_resolved: bool,
    pub created_at: u64,
}

// ─────────────────────────────────────────────────────────────────────────────
//  STORAGE KEYS
// ─────────────────────────────────────────────────────────────────────────────

const GLOBAL_STATS: Symbol = symbol_short!("GLB_STATS");
const COUNT_WALLET: Symbol = symbol_short!("C_WALLET");
const COUNT_LOG: Symbol = symbol_short!("C_LOG");
const ADMIN: Symbol = symbol_short!("ADMIN");
const COUNT_ISSUER: Symbol = symbol_short!("C_ISSUER");
const COUNT_CERT: Symbol = symbol_short!("C_CERT");
const COUNT_DISPUTE: Symbol = symbol_short!("C_DISPUT");

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

/// Wallet profile storage (display name + bio).
#[contracttype]
pub enum ProfileBook {
    Profile(u64),
}

/// Wallet avatar IPFS CID storage.
#[contracttype]
pub enum AvatarBook {
    Avatar(u64),
}

/// Issuer storage by issuer_id.
#[contracttype]
pub enum IssuerBook {
    Issuer(u64),
}

/// Issuer address → issuer_id lookup.
#[contracttype]
pub enum IssuerAddress {
    IssuerAddr(Address),
}

/// Certificate storage by cert_id.
#[contracttype]
pub enum CertBook {
    Cert(u64),
}

/// All certificate IDs for a specific wallet (recipient).
#[contracttype]
pub enum WalletCerts {
    WalletCertIds(u64),
}

/// All certificate IDs issued by a specific issuer.
#[contracttype]
pub enum IssuerCerts {
    IssuerCertIds(u64),
}

/// Dispute storage by dispute_id.
#[contracttype]
pub enum DisputeBook {
    Dispute(u64),
}

/// Tracks votes on disputes to prevent duplicate voting.
#[contracttype]
pub enum DisputeVote {
    Vote(u64, u64), // (dispute_id, voter_wallet_id)
}

/// All dispute IDs for a specific wallet.
#[contracttype]
pub enum WalletDisputes {
    WalletDisputeIds(u64),
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
    //  Submits a positive endorsement with a category tag.
    //  category: 0=General, 1=Trading, 2=Lending, 3=NFT,
    //            4=Governance, 5=Development
    // ─────────────────────────────────────────────────────────────────────────
    pub fn endorse_wallet(
        env: Env,
        caller: Address,
        target_wallet_id: u64,
        reason: String,
        category: u32,
    ) -> Result<u64, ContractError> {
        caller.require_auth();

        // Validate reason is not empty
        if reason.len() == 0 {
            return Err(ContractError::EmptyReason);
        }

        // Clamp category to valid range (0–5)
        let cat = if category > 5 { 0 } else { category };

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
            category: cat,
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
            "Wallet {} endorsed (cat={}). New score = {}. log_id = {}",
            target_wallet_id,
            cat,
            record.score,
            count_log
        );

        Ok(count_log)
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  REPORT WALLET
    //  Submits a negative report with a category tag.
    //  Guards: target must exist & be active, no self-report,
    //          no duplicate report of same target. Score has a floor of MIN_SCORE.
    // ─────────────────────────────────────────────────────────────────────────
    pub fn report_wallet(
        env: Env,
        caller: Address,
        target_wallet_id: u64,
        reason: String,
        category: u32,
    ) -> Result<u64, ContractError> {
        caller.require_auth();

        // Validate reason is not empty
        if reason.len() == 0 {
            return Err(ContractError::EmptyReason);
        }

        // Clamp category to valid range
        let cat = if category > 5 { 0 } else { category };

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
            category: cat,
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
            "Wallet {} reported (cat={}). New score = {}. log_id = {}",
            target_wallet_id,
            cat,
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

    // ═════════════════════════════════════════════════════════════════════════
    //  TRUST TIERS
    //  Returns a tier based on the wallet's score:
    //    0=Newcomer(0), 1=Budding(1-4), 2=Trusted(5-14),
    //    3=Established(15-29), 4=Elder(30+), 5=Flagged(<0)
    // ═════════════════════════════════════════════════════════════════════════
    pub fn view_wallet_tier(env: Env, wallet_id: u64) -> u32 {
        let record = Self::view_wallet_reputation(env, wallet_id);
        if record.wallet_id == 0 {
            return 0;
        }
        if record.score < 0 {
            5 // Flagged
        } else if record.score == 0 {
            0 // Newcomer
        } else if record.score <= 4 {
            1 // Budding
        } else if record.score <= 14 {
            2 // Trusted
        } else if record.score <= 29 {
            3 // Established
        } else {
            4 // Elder
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  WALLET PROFILE (Bio + Display Name)
    // ═════════════════════════════════════════════════════════════════════════

    /// Set the caller's display name and bio on-chain.
    /// display_name max 32 chars, bio max 140 chars.
    pub fn set_wallet_profile(
        env: Env,
        caller: Address,
        display_name: String,
        bio: String,
    ) -> Result<(), ContractError> {
        caller.require_auth();

        let wallet_id: u64 = env
            .storage()
            .instance()
            .get(&AddressBook::Address(caller))
            .unwrap_or(0_u64);
        if wallet_id == 0 {
            return Err(ContractError::WalletNotFound);
        }
        if display_name.len() > 32 {
            return Err(ContractError::InputTooLong);
        }
        if bio.len() > 140 {
            return Err(ContractError::InputTooLong);
        }

        let profile = WalletProfile {
            display_name,
            bio,
            updated_at: env.ledger().timestamp(),
        };

        env.storage()
            .instance()
            .set(&ProfileBook::Profile(wallet_id), &profile);
        env.storage().instance().extend_ttl(TTL_EXTEND, TTL_EXTEND);

        log!(&env, "Profile updated for wallet {}", wallet_id);
        Ok(())
    }

    /// View a wallet's profile (read-only).
    pub fn view_wallet_profile(env: Env, wallet_id: u64) -> WalletProfile {
        env.storage()
            .instance()
            .get(&ProfileBook::Profile(wallet_id))
            .unwrap_or(WalletProfile {
                display_name: String::from_str(&env, ""),
                bio: String::from_str(&env, ""),
                updated_at: 0,
            })
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  PROFILE AVATAR (IPFS CID)
    // ═════════════════════════════════════════════════════════════════════════

    /// Set the caller's avatar IPFS CID.
    pub fn set_profile_image(
        env: Env,
        caller: Address,
        image_cid: String,
    ) -> Result<(), ContractError> {
        caller.require_auth();

        let wallet_id: u64 = env
            .storage()
            .instance()
            .get(&AddressBook::Address(caller))
            .unwrap_or(0_u64);
        if wallet_id == 0 {
            return Err(ContractError::WalletNotFound);
        }
        if image_cid.len() > 64 {
            return Err(ContractError::InputTooLong);
        }

        env.storage()
            .instance()
            .set(&AvatarBook::Avatar(wallet_id), &image_cid);
        env.storage().instance().extend_ttl(TTL_EXTEND, TTL_EXTEND);

        log!(&env, "Avatar updated for wallet {}", wallet_id);
        Ok(())
    }

    /// Get a wallet's avatar IPFS CID (read-only).
    pub fn get_profile_image(env: Env, wallet_id: u64) -> String {
        env.storage()
            .instance()
            .get(&AvatarBook::Avatar(wallet_id))
            .unwrap_or(String::from_str(&env, ""))
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  CERTIFICATE SYSTEM — ISSUER MANAGEMENT
    // ═════════════════════════════════════════════════════════════════════════

    /// Register as a certificate issuer. Any registered wallet can become
    /// an issuer. Returns the issuer_id.
    pub fn register_issuer(
        env: Env,
        caller: Address,
        name: String,
        description: String,
        logo_cid: String,
    ) -> Result<u64, ContractError> {
        caller.require_auth();

        // Must be a registered wallet
        let wallet_id: u64 = env
            .storage()
            .instance()
            .get(&AddressBook::Address(caller.clone()))
            .unwrap_or(0_u64);
        if wallet_id == 0 {
            return Err(ContractError::WalletNotFound);
        }

        // Check if already an issuer
        let existing: u64 = env
            .storage()
            .instance()
            .get(&IssuerAddress::IssuerAddr(caller.clone()))
            .unwrap_or(0_u64);
        if existing > 0 {
            return Ok(existing); // Return existing issuer_id
        }

        // Validate input lengths
        if name.len() > 64 || name.len() == 0 {
            return Err(ContractError::InputTooLong);
        }
        if description.len() > 200 {
            return Err(ContractError::InputTooLong);
        }
        if logo_cid.len() > 64 {
            return Err(ContractError::InputTooLong);
        }

        let mut count_issuer: u64 = env
            .storage()
            .instance()
            .get(&COUNT_ISSUER)
            .unwrap_or(0_u64);
        count_issuer += 1;

        let issuer = Issuer {
            issuer_id: count_issuer,
            address: caller.clone(),
            name,
            description,
            logo_cid,
            is_verified: false,
            total_issued: 0,
            registered_at: env.ledger().timestamp(),
        };

        // Update global stats
        let mut stats = Self::view_global_stats(env.clone());
        stats.total_issuers += 1;

        // Persist
        env.storage()
            .instance()
            .set(&IssuerBook::Issuer(count_issuer), &issuer);
        env.storage()
            .instance()
            .set(&IssuerAddress::IssuerAddr(caller), &count_issuer);
        env.storage()
            .instance()
            .set(&COUNT_ISSUER, &count_issuer);
        env.storage().instance().set(&GLOBAL_STATS, &stats);
        env.storage().instance().extend_ttl(TTL_EXTEND, TTL_EXTEND);

        log!(&env, "New issuer registered. issuer_id = {}", count_issuer);
        Ok(count_issuer)
    }

    /// Admin-only: verify an issuer (marks them with a ✅ trusted badge).
    pub fn verify_issuer(
        env: Env,
        admin: Address,
        issuer_id: u64,
    ) -> Result<(), ContractError> {
        admin.require_auth();

        let stored_admin: Address = env
            .storage()
            .instance()
            .get(&ADMIN)
            .expect("Not initialized");
        if admin != stored_admin {
            return Err(ContractError::Unauthorized);
        }

        let mut issuer: Issuer = env
            .storage()
            .instance()
            .get(&IssuerBook::Issuer(issuer_id))
            .ok_or(ContractError::IssuerNotFound)?;

        issuer.is_verified = true;

        env.storage()
            .instance()
            .set(&IssuerBook::Issuer(issuer_id), &issuer);
        env.storage().instance().extend_ttl(TTL_EXTEND, TTL_EXTEND);

        log!(&env, "Issuer {} verified by admin", issuer_id);
        Ok(())
    }

    /// View issuer details (read-only).
    pub fn view_issuer(env: Env, issuer_id: u64) -> Issuer {
        env.storage()
            .instance()
            .get(&IssuerBook::Issuer(issuer_id))
            .unwrap_or(Issuer {
                issuer_id: 0,
                address: env.current_contract_address(),
                name: String::from_str(&env, ""),
                description: String::from_str(&env, ""),
                logo_cid: String::from_str(&env, ""),
                is_verified: false,
                total_issued: 0,
                registered_at: 0,
            })
    }

    /// Get issuer_id by address (read-only). Returns 0 if not an issuer.
    pub fn get_issuer_by_address(env: Env, address: Address) -> u64 {
        env.storage()
            .instance()
            .get(&IssuerAddress::IssuerAddr(address))
            .unwrap_or(0_u64)
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  CERTIFICATE SYSTEM — ISSUANCE & VERIFICATION
    // ═════════════════════════════════════════════════════════════════════════

    /// Issue a certificate to a registered wallet. Only the issuer's address
    /// can call this. Returns cert_id.
    pub fn issue_certificate(
        env: Env,
        caller: Address,
        recipient_wallet_id: u64,
        title: String,
        description: String,
        category: String,
        image_cid: String,
        expires_at: u64,
    ) -> Result<u64, ContractError> {
        caller.require_auth();

        // Caller must be a registered issuer
        let issuer_id: u64 = env
            .storage()
            .instance()
            .get(&IssuerAddress::IssuerAddr(caller))
            .unwrap_or(0_u64);
        if issuer_id == 0 {
            return Err(ContractError::NotAnIssuer);
        }

        // Recipient must be registered
        let recipient = Self::view_wallet_reputation(env.clone(), recipient_wallet_id);
        if recipient.wallet_id == 0 {
            return Err(ContractError::RecipientNotRegistered);
        }

        // Validate inputs
        if title.len() == 0 || title.len() > 80 {
            return Err(ContractError::InputTooLong);
        }
        if description.len() > 300 {
            return Err(ContractError::InputTooLong);
        }
        if category.len() > 32 {
            return Err(ContractError::InputTooLong);
        }
        if image_cid.len() > 64 {
            return Err(ContractError::InputTooLong);
        }

        let mut count_cert: u64 = env
            .storage()
            .instance()
            .get(&COUNT_CERT)
            .unwrap_or(0_u64);
        count_cert += 1;

        let cert = Certificate {
            cert_id: count_cert,
            issuer_id,
            recipient_wallet_id,
            title,
            description,
            category,
            image_cid,
            issued_at: env.ledger().timestamp(),
            expires_at,
            is_revoked: false,
        };

        // Update issuer's total
        let mut issuer: Issuer = env
            .storage()
            .instance()
            .get(&IssuerBook::Issuer(issuer_id))
            .ok_or(ContractError::IssuerNotFound)?;
        issuer.total_issued += 1;

        // Update global stats
        let mut stats = Self::view_global_stats(env.clone());
        stats.total_certificates += 1;

        // Track cert in recipient's list
        let mut wallet_cert_ids: Vec<u64> = env
            .storage()
            .instance()
            .get(&WalletCerts::WalletCertIds(recipient_wallet_id))
            .unwrap_or(Vec::new(&env));
        wallet_cert_ids.push_back(count_cert);

        // Track cert in issuer's list
        let mut issuer_cert_ids: Vec<u64> = env
            .storage()
            .instance()
            .get(&IssuerCerts::IssuerCertIds(issuer_id))
            .unwrap_or(Vec::new(&env));
        issuer_cert_ids.push_back(count_cert);

        // Persist everything
        env.storage()
            .instance()
            .set(&CertBook::Cert(count_cert), &cert);
        env.storage()
            .instance()
            .set(&IssuerBook::Issuer(issuer_id), &issuer);
        env.storage().instance().set(&COUNT_CERT, &count_cert);
        env.storage().instance().set(&GLOBAL_STATS, &stats);
        env.storage()
            .instance()
            .set(&WalletCerts::WalletCertIds(recipient_wallet_id), &wallet_cert_ids);
        env.storage()
            .instance()
            .set(&IssuerCerts::IssuerCertIds(issuer_id), &issuer_cert_ids);
        env.storage().instance().extend_ttl(TTL_EXTEND, TTL_EXTEND);

        log!(
            &env,
            "Certificate #{} issued by issuer {} to wallet {}",
            count_cert,
            issuer_id,
            recipient_wallet_id
        );

        Ok(count_cert)
    }

    /// Revoke a certificate. Only the original issuer can revoke.
    pub fn revoke_certificate(
        env: Env,
        caller: Address,
        cert_id: u64,
    ) -> Result<(), ContractError> {
        caller.require_auth();

        let mut cert: Certificate = env
            .storage()
            .instance()
            .get(&CertBook::Cert(cert_id))
            .ok_or(ContractError::CertificateNotFound)?;

        // Only the issuer can revoke
        let caller_issuer_id: u64 = env
            .storage()
            .instance()
            .get(&IssuerAddress::IssuerAddr(caller))
            .unwrap_or(0_u64);
        if caller_issuer_id != cert.issuer_id {
            return Err(ContractError::Unauthorized);
        }

        if cert.is_revoked {
            return Err(ContractError::CertificateRevoked);
        }

        cert.is_revoked = true;

        env.storage()
            .instance()
            .set(&CertBook::Cert(cert_id), &cert);
        env.storage().instance().extend_ttl(TTL_EXTEND, TTL_EXTEND);

        log!(&env, "Certificate #{} revoked", cert_id);
        Ok(())
    }

    /// Verify a certificate: returns the full Certificate data.
    /// Returns an error if not found, revoked, or expired.
    pub fn verify_certificate(env: Env, cert_id: u64) -> Result<Certificate, ContractError> {
        let cert: Certificate = env
            .storage()
            .instance()
            .get(&CertBook::Cert(cert_id))
            .ok_or(ContractError::CertificateNotFound)?;

        if cert.is_revoked {
            return Err(ContractError::CertificateRevoked);
        }

        // Check expiry (0 means never expires)
        if cert.expires_at > 0 && env.ledger().timestamp() > cert.expires_at {
            return Err(ContractError::CertificateExpired);
        }

        Ok(cert)
    }

    /// View a certificate without verification checks (read-only).
    /// Returns a default cert with cert_id=0 if not found.
    pub fn view_certificate(env: Env, cert_id: u64) -> Certificate {
        env.storage()
            .instance()
            .get(&CertBook::Cert(cert_id))
            .unwrap_or(Certificate {
                cert_id: 0,
                issuer_id: 0,
                recipient_wallet_id: 0,
                title: String::from_str(&env, ""),
                description: String::from_str(&env, ""),
                category: String::from_str(&env, ""),
                image_cid: String::from_str(&env, ""),
                issued_at: 0,
                expires_at: 0,
                is_revoked: false,
            })
    }

    /// View all certificates for a wallet (read-only).
    pub fn view_wallet_certificates(env: Env, wallet_id: u64) -> Vec<Certificate> {
        let cert_ids: Vec<u64> = env
            .storage()
            .instance()
            .get(&WalletCerts::WalletCertIds(wallet_id))
            .unwrap_or(Vec::new(&env));

        let mut certs: Vec<Certificate> = Vec::new(&env);
        for i in 0..cert_ids.len() {
            if let Some(cid) = cert_ids.get(i) {
                let cert = Self::view_certificate(env.clone(), cid);
                if cert.cert_id > 0 {
                    certs.push_back(cert);
                }
            }
        }
        certs
    }

    /// View all certificates issued by an issuer (read-only).
    pub fn view_issuer_certificates(env: Env, issuer_id: u64) -> Vec<Certificate> {
        let cert_ids: Vec<u64> = env
            .storage()
            .instance()
            .get(&IssuerCerts::IssuerCertIds(issuer_id))
            .unwrap_or(Vec::new(&env));

        let mut certs: Vec<Certificate> = Vec::new(&env);
        for i in 0..cert_ids.len() {
            if let Some(cid) = cert_ids.get(i) {
                let cert = Self::view_certificate(env.clone(), cid);
                if cert.cert_id > 0 {
                    certs.push_back(cert);
                }
            }
        }
        certs
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  DISPUTE RESOLUTION
    // ═════════════════════════════════════════════════════════════════════════

    /// Open a dispute against a report. Only the reported wallet can dispute.
    pub fn open_dispute(
        env: Env,
        caller: Address,
        log_id: u64,
        reason: String,
    ) -> Result<u64, ContractError> {
        caller.require_auth();

        if reason.len() == 0 {
            return Err(ContractError::EmptyReason);
        }
        if reason.len() > 200 {
            return Err(ContractError::InputTooLong);
        }

        // Get the interaction log
        let log_entry = Self::view_interaction_log(env.clone(), log_id);
        if log_entry.log_id == 0 {
            return Err(ContractError::WalletNotFound);
        }

        // Must be a report (not an endorsement)
        if log_entry.is_endorsement {
            return Err(ContractError::Unauthorized);
        }

        // Caller must be the wallet that was reported
        let caller_wallet_id: u64 = env
            .storage()
            .instance()
            .get(&AddressBook::Address(caller))
            .unwrap_or(0_u64);
        if caller_wallet_id == 0 || caller_wallet_id != log_entry.target_wallet_id {
            return Err(ContractError::Unauthorized);
        }

        let mut count_dispute: u64 = env
            .storage()
            .instance()
            .get(&COUNT_DISPUTE)
            .unwrap_or(0_u64);
        count_dispute += 1;

        let dispute = Dispute {
            dispute_id: count_dispute,
            wallet_id: caller_wallet_id,
            log_id,
            reason,
            votes_for: 0,
            votes_against: 0,
            is_resolved: false,
            created_at: env.ledger().timestamp(),
        };

        // Track dispute in wallet's list
        let mut wallet_dispute_ids: Vec<u64> = env
            .storage()
            .instance()
            .get(&WalletDisputes::WalletDisputeIds(caller_wallet_id))
            .unwrap_or(Vec::new(&env));
        wallet_dispute_ids.push_back(count_dispute);

        // Persist
        env.storage()
            .instance()
            .set(&DisputeBook::Dispute(count_dispute), &dispute);
        env.storage()
            .instance()
            .set(&COUNT_DISPUTE, &count_dispute);
        env.storage()
            .instance()
            .set(&WalletDisputes::WalletDisputeIds(caller_wallet_id), &wallet_dispute_ids);
        env.storage().instance().extend_ttl(TTL_EXTEND, TTL_EXTEND);

        log!(&env, "Dispute #{} opened for log #{}", count_dispute, log_id);
        Ok(count_dispute)
    }

    /// Vote on a dispute. One vote per wallet per dispute.
    /// vote_for = true means you side with the accused (disputed wallet).
    pub fn vote_dispute(
        env: Env,
        caller: Address,
        dispute_id: u64,
        vote_for: bool,
    ) -> Result<(), ContractError> {
        caller.require_auth();

        let voter_wallet_id: u64 = env
            .storage()
            .instance()
            .get(&AddressBook::Address(caller))
            .unwrap_or(0_u64);
        if voter_wallet_id == 0 {
            return Err(ContractError::WalletNotFound);
        }

        let mut dispute: Dispute = env
            .storage()
            .instance()
            .get(&DisputeBook::Dispute(dispute_id))
            .ok_or(ContractError::DisputeNotFound)?;

        if dispute.is_resolved {
            return Err(ContractError::DisputeAlreadyResolved);
        }

        // Can't vote on your own dispute
        if voter_wallet_id == dispute.wallet_id {
            return Err(ContractError::SelfInteraction);
        }

        // Check for duplicate vote
        let vote_key = DisputeVote::Vote(dispute_id, voter_wallet_id);
        if env.storage().instance().has(&vote_key) {
            return Err(ContractError::DuplicateVote);
        }

        // Record vote
        if vote_for {
            dispute.votes_for += 1;
        } else {
            dispute.votes_against += 1;
        }

        env.storage().instance().set(&vote_key, &true);
        env.storage()
            .instance()
            .set(&DisputeBook::Dispute(dispute_id), &dispute);
        env.storage().instance().extend_ttl(TTL_EXTEND, TTL_EXTEND);

        log!(
            &env,
            "Vote cast on dispute #{}: for={}, current={}/{}",
            dispute_id,
            vote_for,
            dispute.votes_for,
            dispute.votes_against
        );
        Ok(())
    }

    /// Admin-only: resolve a dispute. If votes_for >= votes_against,
    /// the accused wallet gets +1 score back (partial restoration).
    pub fn resolve_dispute(
        env: Env,
        admin: Address,
        dispute_id: u64,
    ) -> Result<(), ContractError> {
        admin.require_auth();

        let stored_admin: Address = env
            .storage()
            .instance()
            .get(&ADMIN)
            .expect("Not initialized");
        if admin != stored_admin {
            return Err(ContractError::Unauthorized);
        }

        let mut dispute: Dispute = env
            .storage()
            .instance()
            .get(&DisputeBook::Dispute(dispute_id))
            .ok_or(ContractError::DisputeNotFound)?;

        if dispute.is_resolved {
            return Err(ContractError::DisputeAlreadyResolved);
        }

        dispute.is_resolved = true;

        // If community sides with the accused, restore 1 point
        if dispute.votes_for >= dispute.votes_against {
            let mut record =
                Self::view_wallet_reputation(env.clone(), dispute.wallet_id);
            if record.wallet_id > 0 {
                record.score += 1; // Partial restoration
                record.last_updated = env.ledger().timestamp();
                env.storage()
                    .instance()
                    .set(&WalletBook::Wallet(dispute.wallet_id), &record);
            }
        }

        env.storage()
            .instance()
            .set(&DisputeBook::Dispute(dispute_id), &dispute);
        env.storage().instance().extend_ttl(TTL_EXTEND, TTL_EXTEND);

        log!(
            &env,
            "Dispute #{} resolved. For: {}, Against: {}",
            dispute_id,
            dispute.votes_for,
            dispute.votes_against
        );
        Ok(())
    }

    /// View a dispute (read-only).
    pub fn view_dispute(env: Env, dispute_id: u64) -> Dispute {
        env.storage()
            .instance()
            .get(&DisputeBook::Dispute(dispute_id))
            .unwrap_or(Dispute {
                dispute_id: 0,
                wallet_id: 0,
                log_id: 0,
                reason: String::from_str(&env, ""),
                votes_for: 0,
                votes_against: 0,
                is_resolved: false,
                created_at: 0,
            })
    }

    /// View all disputes for a wallet (read-only).
    pub fn view_wallet_disputes(env: Env, wallet_id: u64) -> Vec<Dispute> {
        let dispute_ids: Vec<u64> = env
            .storage()
            .instance()
            .get(&WalletDisputes::WalletDisputeIds(wallet_id))
            .unwrap_or(Vec::new(&env));

        let mut disputes: Vec<Dispute> = Vec::new(&env);
        for i in 0..dispute_ids.len() {
            if let Some(did) = dispute_ids.get(i) {
                let d = Self::view_dispute(env.clone(), did);
                if d.dispute_id > 0 {
                    disputes.push_back(d);
                }
            }
        }
        disputes
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
                total_certificates: 0,
                total_issuers: 0,
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
                category: 0,
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
