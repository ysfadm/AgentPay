#![no_std]
use soroban_sdk::{contract, contracterror, contractimpl, contracttype, Address, BytesN, Env, String};

#[contracttype]
#[derive(Clone)]
pub struct AgentData {
    pub owner: Address,
    pub metadata: String,
}

#[contracttype]
#[derive(Clone)]
pub struct ReputationData {
    pub jobs_completed: u32,
    pub successful_payments: u32,
    pub success_rate_bps: u32, // 0..=10000
}

#[contracttype]
pub enum DataKey {
    Admin,
    Marketplace,
    Agent(BytesN<32>),
    Reputation(BytesN<32>),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum Error {
    NotAuthorized = 1,
    AgentExists = 2,
    AgentNotFound = 3,
}

#[contract]
pub struct AgentRegistry;

#[contractimpl]
impl AgentRegistry {
    pub fn init(env: Env, admin: Address, marketplace: Address) {
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Marketplace, &marketplace);
    }

    /// Register a new agent. Requires the owner's wallet authorization (Freighter / smart wallet).
    pub fn register(
        env: Env,
        owner: Address,
        agent_id: BytesN<32>,
        metadata: String,
    ) -> Result<(), Error> {
        owner.require_auth();
        let key = DataKey::Agent(agent_id.clone());
        if env.storage().persistent().has(&key) {
            return Err(Error::AgentExists);
        }
        env.storage().persistent().set(&key, &AgentData { owner, metadata });
        env.storage().persistent().set(
            &DataKey::Reputation(agent_id),
            &ReputationData { jobs_completed: 0, successful_payments: 0, success_rate_bps: 0 },
        );
        Ok(())
    }

    pub fn get_agent(env: Env, agent_id: BytesN<32>) -> Result<AgentData, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Agent(agent_id))
            .ok_or(Error::AgentNotFound)
    }

    pub fn get_reputation(env: Env, agent_id: BytesN<32>) -> ReputationData {
        env.storage()
            .persistent()
            .get(&DataKey::Reputation(agent_id))
            .unwrap_or(ReputationData { jobs_completed: 0, successful_payments: 0, success_rate_bps: 0 })
    }

    /// Record a completed job. Callable ONLY by the Marketplace contract, so reputation can't be faked.
    pub fn record_job(env: Env, agent_id: BytesN<32>, success: bool) -> Result<(), Error> {
        let marketplace: Address = env
            .storage()
            .instance()
            .get(&DataKey::Marketplace)
            .ok_or(Error::NotAuthorized)?;
        marketplace.require_auth();

        let key = DataKey::Reputation(agent_id);
        let mut rep: ReputationData = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(Error::AgentNotFound)?;

        rep.jobs_completed += 1;
        if success {
            rep.successful_payments += 1;
        }
        rep.success_rate_bps = (rep.successful_payments * 10_000) / rep.jobs_completed;
        env.storage().persistent().set(&key, &rep);
        Ok(())
    }
}

mod test;
