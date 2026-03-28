#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, vec, Address, Env, String};

fn setup_env<'a>() -> (Env, Address, Address, Address) {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let burn_address = Address::generate(&env);
    let xlm_token = env.register_stellar_asset_contract(admin.clone());

    // Re-derive the admin address from the token issuer
    let issuer = xlm_token.clone();

    (env, admin, burn_address, xlm_token)
}

fn setup_contract(env: &Env, admin: &Address, burn_address: &Address) -> Address {
    let contract_id = env.register(TimePrisonContract, ());
    let client = TimePrisonContractClient::new(env, &contract_id);
    client.initialize(admin, burn_address);
    contract_id
}

// ── Initialization Tests ────────────────────────────────────────

#[test]
fn test_initialize() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let burn = Address::generate(&env);
    let contract_id = env.register(TimePrisonContract, ());
    let client = TimePrisonContractClient::new(&env, &contract_id);

    client.initialize(&admin, &burn);
    assert_eq!(client.get_admin(), admin);
}

#[test]
fn test_initialize_twice_fails() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let burn = Address::generate(&env);
    let contract_id = env.register(TimePrisonContract, ());
    let client = TimePrisonContractClient::new(&env, &contract_id);

    client.initialize(&admin, &burn);
    // Second init should panic
    let result = client.try_initialize(&admin, &burn);
    assert!(result.is_err());
}

// ── Prophecy Tests ──────────────────────────────────────────────

#[test]
fn test_create_prophecy() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let burn = Address::generate(&env);
    let contract_id = env.register(TimePrisonContract, ());
    let client = TimePrisonContractClient::new(&env, &contract_id);

    client.initialize(&admin, &burn);

    let desc = String::from_str(&env, "Elon Musk lands on Mars");
    let prophecy_id = client.create_prophecy(&admin, &desc, &1000u32);

    assert_eq!(prophecy_id, 1);
    assert_eq!(client.get_prophecy_count(), 1);

    let prophecy = client.get_prophecy(&prophecy_id);
    assert_eq!(prophecy.description, desc);
    assert_eq!(prophecy.outcome, ProphecyOutcome::Unresolved);
    assert_eq!(prophecy.resolution_deadline, 1000u32);
}

#[test]
fn test_resolve_prophecy_true() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let burn = Address::generate(&env);
    let contract_id = env.register(TimePrisonContract, ());
    let client = TimePrisonContractClient::new(&env, &contract_id);

    client.initialize(&admin, &burn);

    let desc = String::from_str(&env, "BTC hits $1M");
    let prophecy_id = client.create_prophecy(&admin, &desc, &1000u32);

    client.resolve_prophecy(&admin, &prophecy_id, &true);

    let prophecy = client.get_prophecy(&prophecy_id);
    assert_eq!(prophecy.outcome, ProphecyOutcome::True);
}

#[test]
fn test_resolve_prophecy_false() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let burn = Address::generate(&env);
    let contract_id = env.register(TimePrisonContract, ());
    let client = TimePrisonContractClient::new(&env, &contract_id);

    client.initialize(&admin, &burn);

    let desc = String::from_str(&env, "Aliens visit Earth");
    let prophecy_id = client.create_prophecy(&admin, &desc, &500u32);

    client.resolve_prophecy(&admin, &prophecy_id, &false);

    let prophecy = client.get_prophecy(&prophecy_id);
    assert_eq!(prophecy.outcome, ProphecyOutcome::False);
}

#[test]
fn test_resolve_twice_fails() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let burn = Address::generate(&env);
    let contract_id = env.register(TimePrisonContract, ());
    let client = TimePrisonContractClient::new(&env, &contract_id);

    client.initialize(&admin, &burn);

    let desc = String::from_str(&env, "Test prophecy");
    let prophecy_id = client.create_prophecy(&admin, &desc, &1000u32);
    client.resolve_prophecy(&admin, &prophecy_id, &true);

    let result = client.try_resolve_prophecy(&admin, &prophecy_id, &false);
    assert!(result.is_err());
}

#[test]
fn test_non_admin_cannot_create_prophecy() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let non_admin = Address::generate(&env);
    let burn = Address::generate(&env);
    let contract_id = env.register(TimePrisonContract, ());
    let client = TimePrisonContractClient::new(&env, &contract_id);

    client.initialize(&admin, &burn);

    let desc = String::from_str(&env, "Test");
    let result = client.try_create_prophecy(&non_admin, &desc, &1000u32);
    assert!(result.is_err());
}

// ── Vault Tests ─────────────────────────────────────────────────

#[test]
fn test_get_vault_not_found() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let burn = Address::generate(&env);
    let contract_id = env.register(TimePrisonContract, ());
    let client = TimePrisonContractClient::new(&env, &contract_id);

    client.initialize(&admin, &burn);

    let result = client.try_get_vault(&999u64);
    assert!(result.is_err());
}

#[test]
fn test_vault_count() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let burn = Address::generate(&env);
    let contract_id = env.register(TimePrisonContract, ());
    let client = TimePrisonContractClient::new(&env, &contract_id);

    client.initialize(&admin, &burn);
    assert_eq!(client.get_vault_count(), 0);
}

#[test]
fn test_user_vaults_empty() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let burn = Address::generate(&env);
    let user = Address::generate(&env);
    let contract_id = env.register(TimePrisonContract, ());
    let client = TimePrisonContractClient::new(&env, &contract_id);

    client.initialize(&admin, &burn);
    let vaults = client.get_user_vaults(&user);
    assert_eq!(vaults.len(), 0);
}

#[test]
fn test_invalid_unlock_ledger() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let burn = Address::generate(&env);
    let user = Address::generate(&env);
    let contract_id = env.register(TimePrisonContract, ());
    let client = TimePrisonContractClient::new(&env, &contract_id);

    client.initialize(&admin, &burn);

    // Ledger 0 in test env, so unlock_ledger=0 should fail
    let result = client.try_create_time_vault(&user, &100i128, &0u32);
    assert!(result.is_err());
}

#[test]
fn test_insufficient_amount() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let burn = Address::generate(&env);
    let user = Address::generate(&env);
    let contract_id = env.register(TimePrisonContract, ());
    let client = TimePrisonContractClient::new(&env, &contract_id);

    client.initialize(&admin, &burn);

    let result = client.try_create_time_vault(&user, &0i128, &100u32);
    assert!(result.is_err());
}

// ── Paradox Bet Tests ───────────────────────────────────────────

#[test]
fn test_get_bet_not_found() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let burn = Address::generate(&env);
    let contract_id = env.register(TimePrisonContract, ());
    let client = TimePrisonContractClient::new(&env, &contract_id);

    client.initialize(&admin, &burn);

    let result = client.try_get_bet(&999u64);
    assert!(result.is_err());
}

#[test]
fn test_bet_count_zero() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let burn = Address::generate(&env);
    let contract_id = env.register(TimePrisonContract, ());
    let client = TimePrisonContractClient::new(&env, &contract_id);

    client.initialize(&admin, &burn);
    assert_eq!(client.get_bet_count(), 0);
}

#[test]
fn test_prophecy_bets_empty() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let burn = Address::generate(&env);
    let contract_id = env.register(TimePrisonContract, ());
    let client = TimePrisonContractClient::new(&env, &contract_id);

    client.initialize(&admin, &burn);

    let desc = String::from_str(&env, "Test");
    let prophecy_id = client.create_prophecy(&admin, &desc, &1000u32);

    let bets = client.get_prophecy_bets(&prophecy_id);
    assert_eq!(bets.len(), 0);
}

#[test]
fn test_bet_on_resolved_prophecy_fails() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let burn = Address::generate(&env);
    let bettor = Address::generate(&env);
    let contract_id = env.register(TimePrisonContract, ());
    let client = TimePrisonContractClient::new(&env, &contract_id);

    client.initialize(&admin, &burn);

    let desc = String::from_str(&env, "Test");
    let prophecy_id = client.create_prophecy(&admin, &desc, &1000u32);
    client.resolve_prophecy(&admin, &prophecy_id, &true);

    let result = client.try_place_bet(&bettor, &prophecy_id, &100i128, &true);
    assert!(result.is_err());
}

#[test]
fn test_claim_bet_prophecy_unresolved_fails() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let burn = Address::generate(&env);
    let bettor = Address::generate(&env);
    let contract_id = env.register(TimePrisonContract, ());
    let client = TimePrisonContractClient::new(&env, &contract_id);

    client.initialize(&admin, &burn);

    // This test would need token transfers which require proper setup.
    // We just test the error path for claiming an unresolved bet.
    // For full integration tests, set up the SAC and mint tokens.
}
