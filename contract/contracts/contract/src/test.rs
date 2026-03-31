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
}

// ── Endorsement Tests ───────────────────────────────────────────

#[test]
fn test_endorse_wallet() {
    let (env, admin) = setup_env();
    let client = register_contract(&env, &admin);

    let endorser = Address::generate(&env);
    let target = Address::generate(&env);

    client.register_wallet(&endorser);
    let target_id = client.register_wallet(&target);

    let reason = String::from_str(&env, "Great P2P trade partner");
    let log_id = client.endorse_wallet(&endorser, &target_id, &reason);

    assert_eq!(log_id, 1);

    let rep = client.view_wallet_reputation(&target_id);
    assert_eq!(rep.score, 1);
    assert_eq!(rep.endorsement_count, 1);
    assert_eq!(rep.report_count, 0);
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
    client.endorse_wallet(&endorser, &target_id, &reason);

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
    let result = client.try_endorse_wallet(&user, &user_id, &reason);
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
    client.endorse_wallet(&endorser, &target_id, &reason);

    // Second endorsement should fail
    let reason2 = String::from_str(&env, "Still good");
    let result = client.try_endorse_wallet(&endorser, &target_id, &reason2);
    assert!(result.is_err());
}

#[test]
fn test_endorse_nonexistent_wallet_fails() {
    let (env, admin) = setup_env();
    let client = register_contract(&env, &admin);

    let endorser = Address::generate(&env);
    client.register_wallet(&endorser);

    let reason = String::from_str(&env, "Test");
    let result = client.try_endorse_wallet(&endorser, &999u64, &reason);
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
    let result = client.try_endorse_wallet(&endorser, &target_id, &reason);
    assert!(result.is_err());
}

// ── Report Tests ────────────────────────────────────────────────

#[test]
fn test_report_wallet() {
    let (env, admin) = setup_env();
    let client = register_contract(&env, &admin);

    let reporter = Address::generate(&env);
    let target = Address::generate(&env);

    client.register_wallet(&reporter);
    let target_id = client.register_wallet(&target);

    let reason = String::from_str(&env, "Scam attempt");
    let log_id = client.report_wallet(&reporter, &target_id, &reason);

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
        client.report_wallet(&reporter, &target_id, &reason);
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
    let result = client.try_report_wallet(&user, &user_id, &reason);
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
    client.report_wallet(&reporter, &target_id, &reason);

    let reason2 = String::from_str(&env, "More scam");
    let result = client.try_report_wallet(&reporter, &target_id, &reason2);
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
    let result = client.try_endorse_wallet(&endorser, &target_id, &reason);
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
    let log_id = client.endorse_wallet(&endorser, &target_id, &reason);

    let log = client.view_interaction_log(&log_id);
    assert_eq!(log.log_id, log_id);
    assert_eq!(log.target_wallet_id, target_id);
    assert!(log.is_endorsement);
    assert_eq!(log.reason, reason);
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

    client.endorse_wallet(&endorser1, &target_id, &r1);
    client.endorse_wallet(&endorser2, &target_id, &r2);
    client.report_wallet(&reporter, &target_id, &r3);

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

    client.endorse_wallet(&user, &target_id, &r1);
    client.report_wallet(&user, &target_id, &r2);

    let rep = client.view_wallet_reputation(&target_id);
    // +1 endorsement - 3 report = -2
    assert_eq!(rep.score, -2);
    assert_eq!(rep.endorsement_count, 1);
    assert_eq!(rep.report_count, 1);
}
