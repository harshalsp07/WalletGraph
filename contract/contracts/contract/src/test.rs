#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String};

fn setup_env() -> (Env, Address) {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    (env, admin)
}

fn register_contract(env: &Env, admin: &Address) -> WalletReputationGraphClient {
    let contract_id = env.register(WalletReputationGraph, ());
    let client = WalletReputationGraphClient::new(env, &contract_id);
    client.initialize(admin);
    client
}

// ── Initialization Tests ────────────────────────────────────────

#[test]
fn test_initialize() {
    let (env, admin) = setup_env();
    let client = register_contract(&env, &admin);
    assert_eq!(client.get_admin(), admin);
}

#[test]
#[should_panic(expected = "Already initialized")]
fn test_initialize_twice_panics() {
    let (env, admin) = setup_env();
    let client = register_contract(&env, &admin);
    client.initialize(&admin);
}

// ── Registration Tests ──────────────────────────────────────────

#[test]
fn test_register_wallet() {
    let (env, admin) = setup_env();
    let client = register_contract(&env, &admin);

    let user = Address::generate(&env);
    let wallet_id = client.register_wallet(&user);

    assert_eq!(wallet_id, 1);

    let rep = client.view_wallet_reputation(&wallet_id);
    assert_eq!(rep.wallet_id, 1);
    assert_eq!(rep.score, 0);
    assert_eq!(rep.endorsement_count, 0);
    assert_eq!(rep.report_count, 0);
    assert!(rep.is_active);
}

#[test]
fn test_register_wallet_returns_existing_id() {
    let (env, admin) = setup_env();
    let client = register_contract(&env, &admin);

    let user = Address::generate(&env);
    let id1 = client.register_wallet(&user);
    let id2 = client.register_wallet(&user);

    assert_eq!(id1, id2);
    assert_eq!(id1, 1);
}

#[test]
fn test_register_multiple_wallets() {
    let (env, admin) = setup_env();
    let client = register_contract(&env, &admin);

    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);
    let user3 = Address::generate(&env);

    let id1 = client.register_wallet(&user1);
    let id2 = client.register_wallet(&user2);
    let id3 = client.register_wallet(&user3);

    assert_eq!(id1, 1);
    assert_eq!(id2, 2);
    assert_eq!(id3, 3);
}

#[test]
fn test_get_wallet_id_by_address() {
    let (env, admin) = setup_env();
    let client = register_contract(&env, &admin);

    let user = Address::generate(&env);
    client.register_wallet(&user);

    let id = client.get_wallet_id_by_address(&user);
    assert_eq!(id, 1);
}

#[test]
fn test_get_wallet_id_unregistered_returns_zero() {
    let (env, admin) = setup_env();
    let client = register_contract(&env, &admin);

    let unknown = Address::generate(&env);
    let id = client.get_wallet_id_by_address(&unknown);
    assert_eq!(id, 0);
}

// ── Global Stats Tests ──────────────────────────────────────────

#[test]
fn test_global_stats_after_registration() {
    let (env, admin) = setup_env();
    let client = register_contract(&env, &admin);

    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);
    client.register_wallet(&user1);
    client.register_wallet(&user2);

    let stats = client.view_global_stats();
    assert_eq!(stats.total_wallets, 2);
    assert_eq!(stats.total_endorsements, 0);
    assert_eq!(stats.total_reports, 0);
    assert_eq!(stats.total_certificates, 0);
    assert_eq!(stats.total_issuers, 0);
}

// ── Endorsement Tests (with category) ───────────────────────────

#[test]
fn test_endorse_wallet() {
    let (env, admin) = setup_env();
    let client = register_contract(&env, &admin);

    let endorser = Address::generate(&env);
    let target = Address::generate(&env);

    client.register_wallet(&endorser);
    let target_id = client.register_wallet(&target);

    let reason = String::from_str(&env, "Great P2P trade partner");
    let log_id = client.endorse_wallet(&endorser, &target_id, &reason, &1); // Trading category

    assert_eq!(log_id, 1);

    let rep = client.view_wallet_reputation(&target_id);
    assert_eq!(rep.score, 1);
    assert_eq!(rep.endorsement_count, 1);
    assert_eq!(rep.report_count, 0);
}

#[test]
fn test_endorse_with_category_stored() {
    let (env, admin) = setup_env();
    let client = register_contract(&env, &admin);

    let endorser = Address::generate(&env);
    let target = Address::generate(&env);

    client.register_wallet(&endorser);
    let target_id = client.register_wallet(&target);

    let reason = String::from_str(&env, "Great NFT creator");
    let log_id = client.endorse_wallet(&endorser, &target_id, &reason, &3); // NFT category

    let log = client.view_interaction_log(&log_id);
    assert_eq!(log.category, 3);
    assert!(log.is_endorsement);
}

#[test]
fn test_endorse_invalid_category_defaults_to_zero() {
    let (env, admin) = setup_env();
    let client = register_contract(&env, &admin);

    let endorser = Address::generate(&env);
    let target = Address::generate(&env);

    client.register_wallet(&endorser);
    let target_id = client.register_wallet(&target);

    let reason = String::from_str(&env, "Test");
    let log_id = client.endorse_wallet(&endorser, &target_id, &reason, &99); // Invalid category

    let log = client.view_interaction_log(&log_id);
    assert_eq!(log.category, 0); // Defaulted to General
}

#[test]
fn test_endorse_updates_global_stats() {
    let (env, admin) = setup_env();
    let client = register_contract(&env, &admin);

    let endorser = Address::generate(&env);
    let target = Address::generate(&env);

    client.register_wallet(&endorser);
    let target_id = client.register_wallet(&target);

    let reason = String::from_str(&env, "Fast and reliable");
    client.endorse_wallet(&endorser, &target_id, &reason, &0);

    let stats = client.view_global_stats();
    assert_eq!(stats.total_endorsements, 1);
}

#[test]
fn test_self_endorsement_fails() {
    let (env, admin) = setup_env();
    let client = register_contract(&env, &admin);

    let user = Address::generate(&env);
    let user_id = client.register_wallet(&user);

    let reason = String::from_str(&env, "I am great");
    let result = client.try_endorse_wallet(&user, &user_id, &reason, &0);
    assert!(result.is_err());
}

#[test]
fn test_duplicate_endorsement_fails() {
    let (env, admin) = setup_env();
    let client = register_contract(&env, &admin);

    let endorser = Address::generate(&env);
    let target = Address::generate(&env);

    client.register_wallet(&endorser);
    let target_id = client.register_wallet(&target);

    let reason = String::from_str(&env, "Good trader");
    client.endorse_wallet(&endorser, &target_id, &reason, &0);

    // Second endorsement should fail
    let reason2 = String::from_str(&env, "Still good");
    let result = client.try_endorse_wallet(&endorser, &target_id, &reason2, &0);
    assert!(result.is_err());
}

#[test]
fn test_endorse_nonexistent_wallet_fails() {
    let (env, admin) = setup_env();
    let client = register_contract(&env, &admin);

    let endorser = Address::generate(&env);
    client.register_wallet(&endorser);

    let reason = String::from_str(&env, "Test");
    let result = client.try_endorse_wallet(&endorser, &999u64, &reason, &0);
    assert!(result.is_err());
}

#[test]
fn test_endorse_empty_reason_fails() {
    let (env, admin) = setup_env();
    let client = register_contract(&env, &admin);

    let endorser = Address::generate(&env);
    let target = Address::generate(&env);

    client.register_wallet(&endorser);
    let target_id = client.register_wallet(&target);

    let reason = String::from_str(&env, "");
    let result = client.try_endorse_wallet(&endorser, &target_id, &reason, &0);
    assert!(result.is_err());
}

// ── Report Tests (with category) ────────────────────────────────

#[test]
fn test_report_wallet() {
    let (env, admin) = setup_env();
    let client = register_contract(&env, &admin);

    let reporter = Address::generate(&env);
    let target = Address::generate(&env);

    client.register_wallet(&reporter);
    let target_id = client.register_wallet(&target);

    let reason = String::from_str(&env, "Scam attempt");
    let log_id = client.report_wallet(&reporter, &target_id, &reason, &1);

    assert_eq!(log_id, 1);

    let rep = client.view_wallet_reputation(&target_id);
    assert_eq!(rep.score, -3);
    assert_eq!(rep.endorsement_count, 0);
    assert_eq!(rep.report_count, 1);
}

#[test]
fn test_report_score_floor() {
    let (env, admin) = setup_env();
    let client = register_contract(&env, &admin);

    let target = Address::generate(&env);
    let target_id = client.register_wallet(&target);

    // Have many different reporters all report the target
    for _ in 0..40 {
        let reporter = Address::generate(&env);
        client.register_wallet(&reporter);
        let reason = String::from_str(&env, "Bad actor");
        client.report_wallet(&reporter, &target_id, &reason, &0);
    }

    let rep = client.view_wallet_reputation(&target_id);
    // 40 reports × -3 = -120, but floor is -100
    assert_eq!(rep.score, -100);
}

#[test]
fn test_self_report_fails() {
    let (env, admin) = setup_env();
    let client = register_contract(&env, &admin);

    let user = Address::generate(&env);
    let user_id = client.register_wallet(&user);

    let reason = String::from_str(&env, "Testing");
    let result = client.try_report_wallet(&user, &user_id, &reason, &0);
    assert!(result.is_err());
}

#[test]
fn test_duplicate_report_fails() {
    let (env, admin) = setup_env();
    let client = register_contract(&env, &admin);

    let reporter = Address::generate(&env);
    let target = Address::generate(&env);

    client.register_wallet(&reporter);
    let target_id = client.register_wallet(&target);

    let reason = String::from_str(&env, "Scam");
    client.report_wallet(&reporter, &target_id, &reason, &0);

    let reason2 = String::from_str(&env, "More scam");
    let result = client.try_report_wallet(&reporter, &target_id, &reason2, &0);
    assert!(result.is_err());
}

// ── Deactivation Tests ──────────────────────────────────────────

#[test]
fn test_deactivate_wallet() {
    let (env, admin) = setup_env();
    let client = register_contract(&env, &admin);

    let user = Address::generate(&env);
    let user_id = client.register_wallet(&user);

    client.deactivate_wallet(&admin, &user_id);

    let rep = client.view_wallet_reputation(&user_id);
    assert!(!rep.is_active);
}

#[test]
fn test_non_admin_cannot_deactivate() {
    let (env, admin) = setup_env();
    let client = register_contract(&env, &admin);

    let user = Address::generate(&env);
    let non_admin = Address::generate(&env);
    let user_id = client.register_wallet(&user);

    let result = client.try_deactivate_wallet(&non_admin, &user_id);
    assert!(result.is_err());
}

#[test]
fn test_endorse_deactivated_wallet_fails() {
    let (env, admin) = setup_env();
    let client = register_contract(&env, &admin);

    let endorser = Address::generate(&env);
    let target = Address::generate(&env);

    client.register_wallet(&endorser);
    let target_id = client.register_wallet(&target);

    // Deactivate the target
    client.deactivate_wallet(&admin, &target_id);

    let reason = String::from_str(&env, "Good wallet");
    let result = client.try_endorse_wallet(&endorser, &target_id, &reason, &0);
    assert!(result.is_err());
}

// ── Interaction Log & History Tests ─────────────────────────────

#[test]
fn test_view_interaction_log() {
    let (env, admin) = setup_env();
    let client = register_contract(&env, &admin);

    let endorser = Address::generate(&env);
    let target = Address::generate(&env);

    client.register_wallet(&endorser);
    let target_id = client.register_wallet(&target);

    let reason = String::from_str(&env, "Trusted trader");
    let log_id = client.endorse_wallet(&endorser, &target_id, &reason, &1);

    let log = client.view_interaction_log(&log_id);
    assert_eq!(log.log_id, log_id);
    assert_eq!(log.target_wallet_id, target_id);
    assert!(log.is_endorsement);
    assert_eq!(log.reason, reason);
    assert_eq!(log.category, 1);
}

#[test]
fn test_view_wallet_history() {
    let (env, admin) = setup_env();
    let client = register_contract(&env, &admin);

    let endorser1 = Address::generate(&env);
    let endorser2 = Address::generate(&env);
    let reporter = Address::generate(&env);
    let target = Address::generate(&env);

    client.register_wallet(&endorser1);
    client.register_wallet(&endorser2);
    client.register_wallet(&reporter);
    let target_id = client.register_wallet(&target);

    let r1 = String::from_str(&env, "Nice");
    let r2 = String::from_str(&env, "Helpful");
    let r3 = String::from_str(&env, "Late delivery");

    client.endorse_wallet(&endorser1, &target_id, &r1, &0);
    client.endorse_wallet(&endorser2, &target_id, &r2, &1);
    client.report_wallet(&reporter, &target_id, &r3, &0);

    let history = client.view_wallet_history(&target_id);
    assert_eq!(history.len(), 3);

    let rep = client.view_wallet_reputation(&target_id);
    // 2 endorsements (+1 each) + 1 report (-3) = -1
    assert_eq!(rep.score, -1);
    assert_eq!(rep.endorsement_count, 2);
    assert_eq!(rep.report_count, 1);
}

#[test]
fn test_view_nonexistent_log() {
    let (env, admin) = setup_env();
    let client = register_contract(&env, &admin);

    let log = client.view_interaction_log(&999u64);
    assert_eq!(log.log_id, 0);
}

#[test]
fn test_empty_wallet_history() {
    let (env, admin) = setup_env();
    let client = register_contract(&env, &admin);

    let user = Address::generate(&env);
    let user_id = client.register_wallet(&user);

    let history = client.view_wallet_history(&user_id);
    assert_eq!(history.len(), 0);
}

// ── Combined Scenario Tests ─────────────────────────────────────

#[test]
fn test_can_report_and_endorse_same_target() {
    let (env, admin) = setup_env();
    let client = register_contract(&env, &admin);

    let user = Address::generate(&env);
    let target = Address::generate(&env);

    client.register_wallet(&user);
    let target_id = client.register_wallet(&target);

    // User can both endorse and report the same target (different interaction types)
    let r1 = String::from_str(&env, "Was good");
    let r2 = String::from_str(&env, "Then turned bad");

    client.endorse_wallet(&user, &target_id, &r1, &0);
    client.report_wallet(&user, &target_id, &r2, &0);

    let rep = client.view_wallet_reputation(&target_id);
    // +1 endorsement - 3 report = -2
    assert_eq!(rep.score, -2);
    assert_eq!(rep.endorsement_count, 1);
    assert_eq!(rep.report_count, 1);
}

// ══════════════════════════════════════════════════════════════════
//  TRUST TIER TESTS
// ══════════════════════════════════════════════════════════════════

#[test]
fn test_tier_newcomer() {
    let (env, admin) = setup_env();
    let client = register_contract(&env, &admin);

    let user = Address::generate(&env);
    let id = client.register_wallet(&user);

    assert_eq!(client.view_wallet_tier(&id), 0); // Newcomer (score=0)
}

#[test]
fn test_tier_budding() {
    let (env, admin) = setup_env();
    let client = register_contract(&env, &admin);

    let target = Address::generate(&env);
    let target_id = client.register_wallet(&target);

    // Give 3 endorsements
    for _ in 0..3 {
        let endorser = Address::generate(&env);
        client.register_wallet(&endorser);
        let reason = String::from_str(&env, "Great");
        client.endorse_wallet(&endorser, &target_id, &reason, &0);
    }

    assert_eq!(client.view_wallet_tier(&target_id), 1); // Budding (score=3)
}

#[test]
fn test_tier_flagged() {
    let (env, admin) = setup_env();
    let client = register_contract(&env, &admin);

    let target = Address::generate(&env);
    let target_id = client.register_wallet(&target);

    let reporter = Address::generate(&env);
    client.register_wallet(&reporter);
    let reason = String::from_str(&env, "Scam");
    client.report_wallet(&reporter, &target_id, &reason, &0);

    assert_eq!(client.view_wallet_tier(&target_id), 5); // Flagged (score=-3)
}

#[test]
fn test_tier_elder() {
    let (env, admin) = setup_env();
    let client = register_contract(&env, &admin);

    let target = Address::generate(&env);
    let target_id = client.register_wallet(&target);

    // Give 30 endorsements
    for _ in 0..30 {
        let endorser = Address::generate(&env);
        client.register_wallet(&endorser);
        let reason = String::from_str(&env, "Amazing");
        client.endorse_wallet(&endorser, &target_id, &reason, &0);
    }

    assert_eq!(client.view_wallet_tier(&target_id), 4); // Elder (score=30)
}

// ══════════════════════════════════════════════════════════════════
//  WALLET PROFILE TESTS
// ══════════════════════════════════════════════════════════════════

#[test]
fn test_set_and_view_profile() {
    let (env, admin) = setup_env();
    let client = register_contract(&env, &admin);

    let user = Address::generate(&env);
    let id = client.register_wallet(&user);

    let name = String::from_str(&env, "Alice");
    let bio = String::from_str(&env, "Stellar enthusiast");
    client.set_wallet_profile(&user, &name, &bio);

    let profile = client.view_wallet_profile(&id);
    assert_eq!(profile.display_name, name);
    assert_eq!(profile.bio, bio);
}

#[test]
fn test_unregistered_cannot_set_profile() {
    let (env, admin) = setup_env();
    let client = register_contract(&env, &admin);

    let user = Address::generate(&env);
    let name = String::from_str(&env, "Bob");
    let bio = String::from_str(&env, "test");

    let result = client.try_set_wallet_profile(&user, &name, &bio);
    assert!(result.is_err());
}

#[test]
fn test_empty_profile_default() {
    let (env, admin) = setup_env();
    let client = register_contract(&env, &admin);

    let user = Address::generate(&env);
    let id = client.register_wallet(&user);

    let profile = client.view_wallet_profile(&id);
    assert_eq!(profile.display_name, String::from_str(&env, ""));
    assert_eq!(profile.updated_at, 0);
}

// ══════════════════════════════════════════════════════════════════
//  AVATAR TESTS
// ══════════════════════════════════════════════════════════════════

#[test]
fn test_set_and_get_avatar() {
    let (env, admin) = setup_env();
    let client = register_contract(&env, &admin);

    let user = Address::generate(&env);
    let id = client.register_wallet(&user);

    let cid = String::from_str(&env, "QmT5NvUtoM5nWFfrQdVrFtvGfKFmG7AHE8P34isapyhCxX");
    client.set_profile_image(&user, &cid);

    let stored = client.get_profile_image(&id);
    assert_eq!(stored, cid);
}

#[test]
fn test_unregistered_cannot_set_avatar() {
    let (env, admin) = setup_env();
    let client = register_contract(&env, &admin);

    let user = Address::generate(&env);
    let cid = String::from_str(&env, "QmTest");

    let result = client.try_set_profile_image(&user, &cid);
    assert!(result.is_err());
}

#[test]
fn test_empty_avatar_default() {
    let (env, admin) = setup_env();
    let client = register_contract(&env, &admin);

    let user = Address::generate(&env);
    let id = client.register_wallet(&user);

    let cid = client.get_profile_image(&id);
    assert_eq!(cid, String::from_str(&env, ""));
}

// ══════════════════════════════════════════════════════════════════
//  CERTIFICATE SYSTEM TESTS — ISSUER
// ══════════════════════════════════════════════════════════════════

#[test]
fn test_register_issuer() {
    let (env, admin) = setup_env();
    let client = register_contract(&env, &admin);

    let org = Address::generate(&env);
    client.register_wallet(&org);

    let name = String::from_str(&env, "Stellar Dev Foundation");
    let desc = String::from_str(&env, "Official Stellar bootcamp");
    let logo = String::from_str(&env, "QmLogo123");

    let issuer_id = client.register_issuer(&org, &name, &desc, &logo);
    assert_eq!(issuer_id, 1);

    let issuer = client.view_issuer(&issuer_id);
    assert_eq!(issuer.issuer_id, 1);
    assert_eq!(issuer.name, name);
    assert!(!issuer.is_verified);
    assert_eq!(issuer.total_issued, 0);
}

#[test]
fn test_register_issuer_returns_existing() {
    let (env, admin) = setup_env();
    let client = register_contract(&env, &admin);

    let org = Address::generate(&env);
    client.register_wallet(&org);

    let name = String::from_str(&env, "Test Org");
    let desc = String::from_str(&env, "");
    let logo = String::from_str(&env, "");

    let id1 = client.register_issuer(&org, &name, &desc, &logo);
    let id2 = client.register_issuer(&org, &name, &desc, &logo);
    assert_eq!(id1, id2);
}

#[test]
fn test_unregistered_cannot_be_issuer() {
    let (env, admin) = setup_env();
    let client = register_contract(&env, &admin);

    let org = Address::generate(&env);
    let name = String::from_str(&env, "Rogue Org");
    let desc = String::from_str(&env, "");
    let logo = String::from_str(&env, "");

    let result = client.try_register_issuer(&org, &name, &desc, &logo);
    assert!(result.is_err());
}

#[test]
fn test_verify_issuer() {
    let (env, admin) = setup_env();
    let client = register_contract(&env, &admin);

    let org = Address::generate(&env);
    client.register_wallet(&org);

    let name = String::from_str(&env, "Verified Org");
    let desc = String::from_str(&env, "");
    let logo = String::from_str(&env, "");

    let issuer_id = client.register_issuer(&org, &name, &desc, &logo);
    client.verify_issuer(&admin, &issuer_id);

    let issuer = client.view_issuer(&issuer_id);
    assert!(issuer.is_verified);
}

#[test]
fn test_non_admin_cannot_verify_issuer() {
    let (env, admin) = setup_env();
    let client = register_contract(&env, &admin);

    let org = Address::generate(&env);
    client.register_wallet(&org);

    let name = String::from_str(&env, "Org");
    let desc = String::from_str(&env, "");
    let logo = String::from_str(&env, "");

    let issuer_id = client.register_issuer(&org, &name, &desc, &logo);

    let rando = Address::generate(&env);
    let result = client.try_verify_issuer(&rando, &issuer_id);
    assert!(result.is_err());
}

#[test]
fn test_get_issuer_by_address() {
    let (env, admin) = setup_env();
    let client = register_contract(&env, &admin);

    let org = Address::generate(&env);
    client.register_wallet(&org);

    let name = String::from_str(&env, "My Org");
    let desc = String::from_str(&env, "");
    let logo = String::from_str(&env, "");

    client.register_issuer(&org, &name, &desc, &logo);

    let id = client.get_issuer_by_address(&org);
    assert_eq!(id, 1);

    let unknown = Address::generate(&env);
    assert_eq!(client.get_issuer_by_address(&unknown), 0);
}

// ══════════════════════════════════════════════════════════════════
//  CERTIFICATE SYSTEM TESTS — CERTIFICATES
// ══════════════════════════════════════════════════════════════════

#[test]
fn test_issue_certificate() {
    let (env, admin) = setup_env();
    let client = register_contract(&env, &admin);

    let org = Address::generate(&env);
    let recipient = Address::generate(&env);
    client.register_wallet(&org);
    let recipient_id = client.register_wallet(&recipient);

    let name = String::from_str(&env, "Bootcamp");
    let desc = String::from_str(&env, "");
    let logo = String::from_str(&env, "");
    client.register_issuer(&org, &name, &desc, &logo);

    let title = String::from_str(&env, "Stellar Developer Graduate");
    let cert_desc = String::from_str(&env, "Completed 12-week program");
    let cat = String::from_str(&env, "Education");
    let img = String::from_str(&env, "QmCertImage");

    let cert_id = client.issue_certificate(
        &org, &recipient_id, &title, &cert_desc, &cat, &img, &0,
    );

    assert_eq!(cert_id, 1);

    let cert = client.view_certificate(&cert_id);
    assert_eq!(cert.cert_id, 1);
    assert_eq!(cert.recipient_wallet_id, recipient_id);
    assert_eq!(cert.title, title);
    assert!(!cert.is_revoked);
}

#[test]
fn test_verify_certificate() {
    let (env, admin) = setup_env();
    let client = register_contract(&env, &admin);

    let org = Address::generate(&env);
    let recipient = Address::generate(&env);
    client.register_wallet(&org);
    let recipient_id = client.register_wallet(&recipient);

    let name = String::from_str(&env, "Org");
    let desc = String::from_str(&env, "");
    let logo = String::from_str(&env, "");
    client.register_issuer(&org, &name, &desc, &logo);

    let title = String::from_str(&env, "Certificate");
    let cert_desc = String::from_str(&env, "Test");
    let cat = String::from_str(&env, "");
    let img = String::from_str(&env, "");

    let cert_id = client.issue_certificate(
        &org, &recipient_id, &title, &cert_desc, &cat, &img, &0,
    );

    // Verify should succeed
    let verified = client.verify_certificate(&cert_id);
    assert_eq!(verified.cert_id, cert_id);
    assert!(!verified.is_revoked);
}

#[test]
fn test_revoke_certificate() {
    let (env, admin) = setup_env();
    let client = register_contract(&env, &admin);

    let org = Address::generate(&env);
    let recipient = Address::generate(&env);
    client.register_wallet(&org);
    let recipient_id = client.register_wallet(&recipient);

    let name = String::from_str(&env, "Org");
    let desc = String::from_str(&env, "");
    let logo = String::from_str(&env, "");
    client.register_issuer(&org, &name, &desc, &logo);

    let title = String::from_str(&env, "Cert");
    let cert_desc = String::from_str(&env, "");
    let cat = String::from_str(&env, "");
    let img = String::from_str(&env, "");

    let cert_id = client.issue_certificate(
        &org, &recipient_id, &title, &cert_desc, &cat, &img, &0,
    );

    // Revoke
    client.revoke_certificate(&org, &cert_id);

    // View should show revoked
    let cert = client.view_certificate(&cert_id);
    assert!(cert.is_revoked);

    // verify_certificate should fail
    let result = client.try_verify_certificate(&cert_id);
    assert!(result.is_err());
}

#[test]
fn test_non_issuer_cannot_issue_certificate() {
    let (env, admin) = setup_env();
    let client = register_contract(&env, &admin);

    let rando = Address::generate(&env);
    let recipient = Address::generate(&env);
    client.register_wallet(&rando);
    let recipient_id = client.register_wallet(&recipient);

    let title = String::from_str(&env, "Fake Cert");
    let desc = String::from_str(&env, "");
    let cat = String::from_str(&env, "");
    let img = String::from_str(&env, "");

    let result = client.try_issue_certificate(
        &rando, &recipient_id, &title, &desc, &cat, &img, &0,
    );
    assert!(result.is_err());
}

#[test]
fn test_non_issuer_cannot_revoke() {
    let (env, admin) = setup_env();
    let client = register_contract(&env, &admin);

    let org = Address::generate(&env);
    let rando = Address::generate(&env);
    let recipient = Address::generate(&env);
    client.register_wallet(&org);
    client.register_wallet(&rando);
    let recipient_id = client.register_wallet(&recipient);

    let name = String::from_str(&env, "Org");
    let desc = String::from_str(&env, "");
    let logo = String::from_str(&env, "");
    client.register_issuer(&org, &name, &desc, &logo);

    let title = String::from_str(&env, "Cert");
    let cert_desc = String::from_str(&env, "");
    let cat = String::from_str(&env, "");
    let img = String::from_str(&env, "");

    let cert_id = client.issue_certificate(
        &org, &recipient_id, &title, &cert_desc, &cat, &img, &0,
    );

    // Rando tries to revoke
    let result = client.try_revoke_certificate(&rando, &cert_id);
    assert!(result.is_err());
}

#[test]
fn test_view_wallet_certificates() {
    let (env, admin) = setup_env();
    let client = register_contract(&env, &admin);

    let org = Address::generate(&env);
    let recipient = Address::generate(&env);
    client.register_wallet(&org);
    let recipient_id = client.register_wallet(&recipient);

    let name = String::from_str(&env, "Org");
    let desc = String::from_str(&env, "");
    let logo = String::from_str(&env, "");
    client.register_issuer(&org, &name, &desc, &logo);

    // Issue 2 certificates
    let t1 = String::from_str(&env, "Cert A");
    let t2 = String::from_str(&env, "Cert B");
    let empty = String::from_str(&env, "");

    client.issue_certificate(&org, &recipient_id, &t1, &empty, &empty, &empty, &0);
    client.issue_certificate(&org, &recipient_id, &t2, &empty, &empty, &empty, &0);

    let certs = client.view_wallet_certificates(&recipient_id);
    assert_eq!(certs.len(), 2);
}

#[test]
fn test_view_issuer_certificates() {
    let (env, admin) = setup_env();
    let client = register_contract(&env, &admin);

    let org = Address::generate(&env);
    let r1 = Address::generate(&env);
    let r2 = Address::generate(&env);
    client.register_wallet(&org);
    let r1_id = client.register_wallet(&r1);
    let r2_id = client.register_wallet(&r2);

    let name = String::from_str(&env, "Org");
    let desc = String::from_str(&env, "");
    let logo = String::from_str(&env, "");
    let issuer_id = client.register_issuer(&org, &name, &desc, &logo);

    let t1 = String::from_str(&env, "Cert 1");
    let t2 = String::from_str(&env, "Cert 2");
    let empty = String::from_str(&env, "");

    client.issue_certificate(&org, &r1_id, &t1, &empty, &empty, &empty, &0);
    client.issue_certificate(&org, &r2_id, &t2, &empty, &empty, &empty, &0);

    let issued = client.view_issuer_certificates(&issuer_id);
    assert_eq!(issued.len(), 2);
}

#[test]
fn test_global_stats_with_certificates() {
    let (env, admin) = setup_env();
    let client = register_contract(&env, &admin);

    let org = Address::generate(&env);
    let recipient = Address::generate(&env);
    client.register_wallet(&org);
    let recipient_id = client.register_wallet(&recipient);

    let name = String::from_str(&env, "Org");
    let desc = String::from_str(&env, "");
    let logo = String::from_str(&env, "");
    client.register_issuer(&org, &name, &desc, &logo);

    let title = String::from_str(&env, "Cert");
    let empty = String::from_str(&env, "");
    client.issue_certificate(&org, &recipient_id, &title, &empty, &empty, &empty, &0);

    let stats = client.view_global_stats();
    assert_eq!(stats.total_certificates, 1);
    assert_eq!(stats.total_issuers, 1);
}

// ══════════════════════════════════════════════════════════════════
//  DISPUTE RESOLUTION TESTS
// ══════════════════════════════════════════════════════════════════

#[test]
fn test_open_dispute() {
    let (env, admin) = setup_env();
    let client = register_contract(&env, &admin);

    let reporter = Address::generate(&env);
    let target = Address::generate(&env);
    client.register_wallet(&reporter);
    let target_id = client.register_wallet(&target);

    let reason = String::from_str(&env, "Scam");
    let log_id = client.report_wallet(&reporter, &target_id, &reason, &0);

    // Target opens dispute
    let dispute_reason = String::from_str(&env, "This was a misunderstanding");
    let dispute_id = client.open_dispute(&target, &log_id, &dispute_reason);
    assert_eq!(dispute_id, 1);

    let dispute = client.view_dispute(&dispute_id);
    assert_eq!(dispute.dispute_id, 1);
    assert_eq!(dispute.wallet_id, target_id);
    assert_eq!(dispute.log_id, log_id);
    assert!(!dispute.is_resolved);
}

#[test]
fn test_non_target_cannot_open_dispute() {
    let (env, admin) = setup_env();
    let client = register_contract(&env, &admin);

    let reporter = Address::generate(&env);
    let target = Address::generate(&env);
    let rando = Address::generate(&env);
    client.register_wallet(&reporter);
    client.register_wallet(&target);
    client.register_wallet(&rando);
    let target_id = client.register_wallet(&target);

    let reason = String::from_str(&env, "Bad");
    let log_id = client.report_wallet(&reporter, &target_id, &reason, &0);

    // Rando tries to dispute — should fail
    let dispute_reason = String::from_str(&env, "Not fair");
    let result = client.try_open_dispute(&rando, &log_id, &dispute_reason);
    assert!(result.is_err());
}

#[test]
fn test_vote_dispute() {
    let (env, admin) = setup_env();
    let client = register_contract(&env, &admin);

    let reporter = Address::generate(&env);
    let target = Address::generate(&env);
    let voter1 = Address::generate(&env);
    let voter2 = Address::generate(&env);

    client.register_wallet(&reporter);
    let target_id = client.register_wallet(&target);
    client.register_wallet(&voter1);
    client.register_wallet(&voter2);

    let reason = String::from_str(&env, "Scam");
    let log_id = client.report_wallet(&reporter, &target_id, &reason, &0);

    let dispute_reason = String::from_str(&env, "Not a scam");
    let dispute_id = client.open_dispute(&target, &log_id, &dispute_reason);

    // Vote
    client.vote_dispute(&voter1, &dispute_id, &true);
    client.vote_dispute(&voter2, &dispute_id, &false);

    let dispute = client.view_dispute(&dispute_id);
    assert_eq!(dispute.votes_for, 1);
    assert_eq!(dispute.votes_against, 1);
}

#[test]
fn test_duplicate_vote_fails() {
    let (env, admin) = setup_env();
    let client = register_contract(&env, &admin);

    let reporter = Address::generate(&env);
    let target = Address::generate(&env);
    let voter = Address::generate(&env);

    client.register_wallet(&reporter);
    let target_id = client.register_wallet(&target);
    client.register_wallet(&voter);

    let reason = String::from_str(&env, "Scam");
    let log_id = client.report_wallet(&reporter, &target_id, &reason, &0);

    let dispute_reason = String::from_str(&env, "Innocent");
    let dispute_id = client.open_dispute(&target, &log_id, &dispute_reason);

    client.vote_dispute(&voter, &dispute_id, &true);
    let result = client.try_vote_dispute(&voter, &dispute_id, &false);
    assert!(result.is_err());
}

#[test]
fn test_resolve_dispute_restores_score() {
    let (env, admin) = setup_env();
    let client = register_contract(&env, &admin);

    let reporter = Address::generate(&env);
    let target = Address::generate(&env);
    let voter = Address::generate(&env);

    client.register_wallet(&reporter);
    let target_id = client.register_wallet(&target);
    client.register_wallet(&voter);

    let reason = String::from_str(&env, "Scam");
    let log_id = client.report_wallet(&reporter, &target_id, &reason, &0);

    // Score is -3 after report
    let rep = client.view_wallet_reputation(&target_id);
    assert_eq!(rep.score, -3);

    let dispute_reason = String::from_str(&env, "Was not a scam");
    let dispute_id = client.open_dispute(&target, &log_id, &dispute_reason);

    // Vote in favor
    client.vote_dispute(&voter, &dispute_id, &true);

    // Resolve
    client.resolve_dispute(&admin, &dispute_id);

    // Score should be -2 (restored 1 point)
    let rep = client.view_wallet_reputation(&target_id);
    assert_eq!(rep.score, -2);

    let dispute = client.view_dispute(&dispute_id);
    assert!(dispute.is_resolved);
}

#[test]
fn test_resolve_dispute_no_restore_if_voted_against() {
    let (env, admin) = setup_env();
    let client = register_contract(&env, &admin);

    let reporter = Address::generate(&env);
    let target = Address::generate(&env);
    let voter = Address::generate(&env);

    client.register_wallet(&reporter);
    let target_id = client.register_wallet(&target);
    client.register_wallet(&voter);

    let reason = String::from_str(&env, "Scam");
    let log_id = client.report_wallet(&reporter, &target_id, &reason, &0);

    let dispute_reason = String::from_str(&env, "Innocent");
    let dispute_id = client.open_dispute(&target, &log_id, &dispute_reason);

    // Vote against
    client.vote_dispute(&voter, &dispute_id, &false);

    // Resolve
    client.resolve_dispute(&admin, &dispute_id);

    // Score stays -3 (no restoration)
    let rep = client.view_wallet_reputation(&target_id);
    assert_eq!(rep.score, -3);
}

#[test]
fn test_view_wallet_disputes() {
    let (env, admin) = setup_env();
    let client = register_contract(&env, &admin);

    let reporter = Address::generate(&env);
    let target = Address::generate(&env);

    client.register_wallet(&reporter);
    let target_id = client.register_wallet(&target);

    let reason = String::from_str(&env, "Bad");
    let log_id = client.report_wallet(&reporter, &target_id, &reason, &0);

    let dispute_reason = String::from_str(&env, "I disagree");
    client.open_dispute(&target, &log_id, &dispute_reason);

    let disputes = client.view_wallet_disputes(&target_id);
    assert_eq!(disputes.len(), 1);
}
