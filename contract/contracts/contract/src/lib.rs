#![allow(non_snake_case)]
#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, log, symbol_short, Address, Env, String,
    Symbol, Vec,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum ContractError {

    WalletNotFound = 1,

    SelfInteraction = 2,

    DuplicateInteraction = 3,

    AlreadyRegistered = 4,

    Unauthorized = 5,

    AlreadyDeactivated = 6,

    EmptyReason = 7,

    IssuerNotFound = 8,

    NotAnIssuer = 9,

    CertificateNotFound = 10,

    CertificateExpired = 11,

    CertificateRevoked = 12,

    RecipientNotRegistered = 13,

    DisputeNotFound = 14,

    DuplicateVote = 15,

    DisputeAlreadyResolved = 16,

    InputTooLong = 17,
}

#[contracttype]
#[derive(Clone)]
pub struct GlobalStats {
    pub total_wallets: u64,
    pub total_endorsements: u64,
    pub total_reports: u64,
    pub total_certificates: u64,
    pub total_issuers: u64,
}

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

#[contracttype]
#[derive(Clone)]
pub struct InteractionLog {
    pub log_id: u64,
    pub caller_wallet_id: u64,
    pub target_wallet_id: u64,
    pub is_endorsement: bool,
    pub reason: String,
    pub timestamp: u64,

    pub category: u32,
}

#[contracttype]
#[derive(Clone)]
pub struct WalletProfile {
    pub display_name: String,
    pub bio: String,
    pub updated_at: u64,
}

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

const GLOBAL_STATS: Symbol = symbol_short!("GLB_STATS");
const COUNT_WALLET: Symbol = symbol_short!("C_WALLET");
const COUNT_LOG: Symbol = symbol_short!("C_LOG");
const ADMIN: Symbol = symbol_short!("ADMIN");
const COUNT_ISSUER: Symbol = symbol_short!("C_ISSUER");
const COUNT_CERT: Symbol = symbol_short!("C_CERT");
const COUNT_DISPUTE: Symbol = symbol_short!("C_DISPUT");

#[contracttype]
pub enum WalletBook {
    Wallet(u64),
}

#[contracttype]
pub enum LogBook {
    Log(u64),
}

#[contracttype]
pub enum AddressBook {
    Address(Address),
}

#[contracttype]
pub enum WalletLogs {
    WalletLogIds(u64),
}

#[contracttype]
pub enum InteractionPair {

    Pair(u64, u64, bool),
}

#[contracttype]
pub enum ProfileBook {
    Profile(u64),
}

#[contracttype]
pub enum AvatarBook {
    Avatar(u64),
}

#[contracttype]
pub enum IssuerBook {
    Issuer(u64),
}

#[contracttype]
pub enum IssuerAddress {
    IssuerAddr(Address),
}

#[contracttype]
pub enum CertBook {
    Cert(u64),
}

#[contracttype]
pub enum WalletCerts {
    WalletCertIds(u64),
}

#[contracttype]
pub enum IssuerCerts {
    IssuerCertIds(u64),
}

#[contracttype]
pub enum DisputeBook {
    Dispute(u64),
}

#[contracttype]
pub enum DisputeVote {
    Vote(u64, u64), 
}

#[contracttype]
pub enum WalletDisputes {
    WalletDisputeIds(u64),
}

const REPORT_WEIGHT: i64 = 3;

const ENDORSE_WEIGHT: i64 = 1;

const TTL_EXTEND: u32 = 5_000;

const MIN_SCORE: i64 = -100;

#[contract]
pub struct WalletReputationGraph;

#[contractimpl]
impl WalletReputationGraph {

    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&ADMIN) {
            panic!("Already initialized");
        }
        env.storage().instance().set(&ADMIN, &admin);
        env.storage().instance().extend_ttl(TTL_EXTEND, TTL_EXTEND);
        log!(&env, "Contract initialized with admin");
    }

    pub fn register_wallet(env: Env, caller: Address) -> u64 {
        caller.require_auth();

        let existing_id: u64 = env
            .storage()
            .instance()
            .get(&AddressBook::Address(caller.clone()))
            .unwrap_or(0_u64);

        if existing_id > 0 {
            log!(&env, "Wallet already registered with ID: {}", existing_id);
            return existing_id;
        }

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

        let mut stats = Self::view_global_stats(env.clone());
        stats.total_wallets += 1;

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

    pub fn get_wallet_id_by_address(env: Env, address: Address) -> u64 {
        env.storage()
            .instance()
            .get(&AddressBook::Address(address))
            .unwrap_or(0_u64)
    }

    pub fn endorse_wallet(
        env: Env,
        caller: Address,
        target_wallet_id: u64,
        reason: String,
        category: u32,
    ) -> Result<u64, ContractError> {
        caller.require_auth();

        if reason.len() == 0 {
            return Err(ContractError::EmptyReason);
        }

        let cat = if category > 5 { 0 } else { category };

        let caller_wallet_id: u64 = env
            .storage()
            .instance()
            .get(&AddressBook::Address(caller.clone()))
            .unwrap_or(0_u64);

        if caller_wallet_id > 0 && caller_wallet_id == target_wallet_id {
            return Err(ContractError::SelfInteraction);
        }

        let mut record = Self::view_wallet_reputation(env.clone(), target_wallet_id);
        if !record.is_active || record.wallet_id == 0 {
            return Err(ContractError::WalletNotFound);
        }

        if caller_wallet_id > 0 {
            let pair_key = InteractionPair::Pair(caller_wallet_id, target_wallet_id, true);
            if env.storage().instance().has(&pair_key) {
                return Err(ContractError::DuplicateInteraction);
            }

            env.storage().instance().set(&pair_key, &true);
        }

        let time = env.ledger().timestamp();

        record.score += ENDORSE_WEIGHT;
        record.endorsement_count += 1;
        record.last_updated = time;

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

        let mut stats = Self::view_global_stats(env.clone());
        stats.total_endorsements += 1;

        env.storage()
            .instance()
            .set(&WalletBook::Wallet(target_wallet_id), &record);
        env.storage()
            .instance()
            .set(&LogBook::Log(count_log), &log_entry);
        env.storage().instance().set(&COUNT_LOG, &count_log);
        env.storage().instance().set(&GLOBAL_STATS, &stats);

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

    pub fn report_wallet(
        env: Env,
        caller: Address,
        target_wallet_id: u64,
        reason: String,
        category: u32,
    ) -> Result<u64, ContractError> {
        caller.require_auth();

        if reason.len() == 0 {
            return Err(ContractError::EmptyReason);
        }

        let cat = if category > 5 { 0 } else { category };

        let caller_wallet_id: u64 = env
            .storage()
            .instance()
            .get(&AddressBook::Address(caller.clone()))
            .unwrap_or(0_u64);

        if caller_wallet_id > 0 && caller_wallet_id == target_wallet_id {
            return Err(ContractError::SelfInteraction);
        }

        let mut record = Self::view_wallet_reputation(env.clone(), target_wallet_id);
        if !record.is_active || record.wallet_id == 0 {
            return Err(ContractError::WalletNotFound);
        }

        if caller_wallet_id > 0 {
            let pair_key = InteractionPair::Pair(caller_wallet_id, target_wallet_id, false);
            if env.storage().instance().has(&pair_key) {
                return Err(ContractError::DuplicateInteraction);
            }
            env.storage().instance().set(&pair_key, &true);
        }

        let time = env.ledger().timestamp();

        record.score = (record.score - REPORT_WEIGHT).max(MIN_SCORE);
        record.report_count += 1;
        record.last_updated = time;

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

        let mut stats = Self::view_global_stats(env.clone());
        stats.total_reports += 1;

        env.storage()
            .instance()
            .set(&WalletBook::Wallet(target_wallet_id), &record);
        env.storage()
            .instance()
            .set(&LogBook::Log(count_log), &log_entry);
        env.storage().instance().set(&COUNT_LOG, &count_log);
        env.storage().instance().set(&GLOBAL_STATS, &stats);

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

    pub fn deactivate_wallet(
        env: Env,
        admin: Address,
        wallet_id: u64,
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

    pub fn view_wallet_tier(env: Env, wallet_id: u64) -> u32 {
        let record = Self::view_wallet_reputation(env, wallet_id);
        if record.wallet_id == 0 {
            return 0;
        }
        if record.score < 0 {
            5 
        } else if record.score == 0 {
            0 
        } else if record.score <= 4 {
            1 
        } else if record.score <= 14 {
            2 
        } else if record.score <= 29 {
            3 
        } else {
            4 
        }
    }

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

    pub fn get_profile_image(env: Env, wallet_id: u64) -> String {
        env.storage()
            .instance()
            .get(&AvatarBook::Avatar(wallet_id))
            .unwrap_or(String::from_str(&env, ""))
    }

    pub fn register_issuer(
        env: Env,
        caller: Address,
        name: String,
        description: String,
        logo_cid: String,
    ) -> Result<u64, ContractError> {
        caller.require_auth();

        let wallet_id: u64 = env
            .storage()
            .instance()
            .get(&AddressBook::Address(caller.clone()))
            .unwrap_or(0_u64);
        if wallet_id == 0 {
            return Err(ContractError::WalletNotFound);
        }

        let existing: u64 = env
            .storage()
            .instance()
            .get(&IssuerAddress::IssuerAddr(caller.clone()))
            .unwrap_or(0_u64);
        if existing > 0 {
            return Ok(existing); 
        }

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

        let mut stats = Self::view_global_stats(env.clone());
        stats.total_issuers += 1;

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

    pub fn get_issuer_by_address(env: Env, address: Address) -> u64 {
        env.storage()
            .instance()
            .get(&IssuerAddress::IssuerAddr(address))
            .unwrap_or(0_u64)
    }

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

        let issuer_id: u64 = env
            .storage()
            .instance()
            .get(&IssuerAddress::IssuerAddr(caller))
            .unwrap_or(0_u64);
        if issuer_id == 0 {
            return Err(ContractError::NotAnIssuer);
        }

        let recipient = Self::view_wallet_reputation(env.clone(), recipient_wallet_id);
        if recipient.wallet_id == 0 {
            return Err(ContractError::RecipientNotRegistered);
        }

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

        let mut issuer: Issuer = env
            .storage()
            .instance()
            .get(&IssuerBook::Issuer(issuer_id))
            .ok_or(ContractError::IssuerNotFound)?;
        issuer.total_issued += 1;

        let mut stats = Self::view_global_stats(env.clone());
        stats.total_certificates += 1;

        let mut wallet_cert_ids: Vec<u64> = env
            .storage()
            .instance()
            .get(&WalletCerts::WalletCertIds(recipient_wallet_id))
            .unwrap_or(Vec::new(&env));
        wallet_cert_ids.push_back(count_cert);

        let mut issuer_cert_ids: Vec<u64> = env
            .storage()
            .instance()
            .get(&IssuerCerts::IssuerCertIds(issuer_id))
            .unwrap_or(Vec::new(&env));
        issuer_cert_ids.push_back(count_cert);

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

    pub fn verify_certificate(env: Env, cert_id: u64) -> Result<Certificate, ContractError> {
        let cert: Certificate = env
            .storage()
            .instance()
            .get(&CertBook::Cert(cert_id))
            .ok_or(ContractError::CertificateNotFound)?;

        if cert.is_revoked {
            return Err(ContractError::CertificateRevoked);
        }

        if cert.expires_at > 0 && env.ledger().timestamp() > cert.expires_at {
            return Err(ContractError::CertificateExpired);
        }

        Ok(cert)
    }

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

        let log_entry = Self::view_interaction_log(env.clone(), log_id);
        if log_entry.log_id == 0 {
            return Err(ContractError::WalletNotFound);
        }

        if log_entry.is_endorsement {
            return Err(ContractError::Unauthorized);
        }

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

        let mut wallet_dispute_ids: Vec<u64> = env
            .storage()
            .instance()
            .get(&WalletDisputes::WalletDisputeIds(caller_wallet_id))
            .unwrap_or(Vec::new(&env));
        wallet_dispute_ids.push_back(count_dispute);

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

        if voter_wallet_id == dispute.wallet_id {
            return Err(ContractError::SelfInteraction);
        }

        let vote_key = DisputeVote::Vote(dispute_id, voter_wallet_id);
        if env.storage().instance().has(&vote_key) {
            return Err(ContractError::DuplicateVote);
        }

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

        if dispute.votes_for >= dispute.votes_against {
            let mut record =
                Self::view_wallet_reputation(env.clone(), dispute.wallet_id);
            if record.wallet_id > 0 {
                record.score += 1; 
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

    pub fn get_admin(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&ADMIN)
            .expect("Not initialized")
    }
}

#[cfg(test)]
mod test;