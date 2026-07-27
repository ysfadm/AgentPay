#![cfg(test)]
use super::*;
use soroban_sdk::{testutils::Address as _, Address, BytesN, Env, String};

#[test]
fn register_and_reputation() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(AgentRegistry, ());
    let client = AgentRegistryClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let marketplace = Address::generate(&env);
    let owner = Address::generate(&env);
    client.init(&admin, &marketplace);

    let agent_id = BytesN::from_array(&env, &[1u8; 32]);
    client.register(&owner, &agent_id, &String::from_str(&env, "Research Agent"));

    let rep = client.get_reputation(&agent_id);
    assert_eq!(rep.jobs_completed, 0);

    client.record_job(&agent_id, &true);
    let rep = client.get_reputation(&agent_id);
    assert_eq!(rep.jobs_completed, 1);
    assert_eq!(rep.success_rate_bps, 10_000);
}
