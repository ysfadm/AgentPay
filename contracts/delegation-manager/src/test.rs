#![cfg(test)]
use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env};

fn setup(env: &Env) -> (DelegationManagerClient<'_>, Address, Address) {
    let contract_id = env.register(DelegationManager, ());
    let client = DelegationManagerClient::new(env, &contract_id);
    let admin = Address::generate(env);
    let marketplace = Address::generate(env);
    client.init(&admin, &marketplace);
    (client, marketplace, admin)
}

#[test]
fn grant_and_spend_within_limit() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, _mkt, _admin) = setup(&env);

    let owner = Address::generate(&env);
    let agent = Address::generate(&env);
    let token = Address::generate(&env);

    client.grant(&owner, &agent, &token, &10_0000000, &(env.ledger().timestamp() + 86_400));
    client.check_and_spend(&agent, &2_0000000);

    let a = client.get_allowance(&agent);
    assert_eq!(a.spent_today, 2_0000000);
}

#[test]
fn spend_over_limit_fails() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, _mkt, _admin) = setup(&env);

    let owner = Address::generate(&env);
    let agent = Address::generate(&env);
    let token = Address::generate(&env);

    client.grant(&owner, &agent, &token, &3_0000000, &(env.ledger().timestamp() + 86_400));
    let res = client.try_check_and_spend(&agent, &5_0000000);
    assert!(res.is_err());
}
