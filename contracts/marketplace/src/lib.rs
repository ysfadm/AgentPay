#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, token, Address, BytesN, Env, String,
};

#[contracttype]
#[derive(Clone)]
pub struct Listing {
    pub provider: Address,         // provider agent's wallet (payment recipient)
    pub provider_agent_id: BytesN<32>,
    pub price: i128,
    pub metadata: String,
    pub active: bool,
}

#[contracttype]
#[derive(Clone)]
pub struct JobReceipt {
    pub job_id: u64,
    pub amount: i128,
    pub provider: Address,
    pub timestamp: u64,
}

#[contracttype]
pub enum DataKey {
    Admin,
    Registry,            // AgentRegistry contract address
    Delegation,          // DelegationManager contract address
    Token,               // USDC token contract address
    NextListing,
    NextJob,
    Listing(u64),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum Error {
    NotFound = 1,
    Inactive = 2,
}

#[contract]
pub struct Marketplace;

#[contractimpl]
impl Marketplace {
    pub fn init(env: Env, admin: Address, registry: Address, delegation: Address, token: Address) {
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Registry, &registry);
        env.storage().instance().set(&DataKey::Delegation, &delegation);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::NextListing, &0u64);
        env.storage().instance().set(&DataKey::NextJob, &0u64);
    }

    pub fn list_service(
        env: Env,
        provider: Address,
        provider_agent_id: BytesN<32>,
        price: i128,
        metadata: String,
    ) -> u64 {
        provider.require_auth();
        let id: u64 = env.storage().instance().get(&DataKey::NextListing).unwrap_or(0);
        env.storage().persistent().set(
            &DataKey::Listing(id),
            &Listing { provider, provider_agent_id, price, metadata, active: true },
        );
        env.storage().instance().set(&DataKey::NextListing, &(id + 1));
        id
    }

    pub fn get_listing(env: Env, listing_id: u64) -> Result<Listing, Error> {
        env.storage().persistent().get(&DataKey::Listing(listing_id)).ok_or(Error::NotFound)
    }

    /// THE money-shot: atomic delegation check -> USDC transfer -> reputation bump.
    pub fn purchase(
        env: Env,
        buyer_agent: Address,
        buyer_agent_id: BytesN<32>,
        listing_id: u64,
    ) -> Result<JobReceipt, Error> {
        buyer_agent.require_auth();

        let listing: Listing = env
            .storage()
            .persistent()
            .get(&DataKey::Listing(listing_id))
            .ok_or(Error::NotFound)?;
        if !listing.active {
            return Err(Error::Inactive);
        }

        let token_addr: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let delegation: Address = env.storage().instance().get(&DataKey::Delegation).unwrap();
        let registry: Address = env.storage().instance().get(&DataKey::Registry).unwrap();

        // 1. Enforce the spending allowance (reverts the whole tx if over-limit/expired).
        let del = delegation_client::Client::new(&env, &delegation);
        del.check_and_spend(&buyer_agent, &listing.price);

        // 2. Settle in USDC.
        let token_client = token::Client::new(&env, &token_addr);
        token_client.transfer(&buyer_agent, &listing.provider, &listing.price);

        // 3. Bump provider + buyer reputation (only the Marketplace may call this).
        let reg = registry_client::Client::new(&env, &registry);
        reg.record_job(&listing.provider_agent_id, &true);
        reg.record_job(&buyer_agent_id, &true);

        // 4. Emit a job receipt.
        let job_id: u64 = env.storage().instance().get(&DataKey::NextJob).unwrap_or(0);
        env.storage().instance().set(&DataKey::NextJob, &(job_id + 1));

        let receipt = JobReceipt {
            job_id,
            amount: listing.price,
            provider: listing.provider,
            timestamp: env.ledger().timestamp(),
        };
        env.events().publish((String::from_str(&env, "purchase"),), receipt.clone());
        Ok(receipt)
    }
}

mod delegation_client {
    use soroban_sdk::{contractclient, Address, Env};
    #[contractclient(name = "Client")]
    #[allow(dead_code)]
    pub trait Delegation {
        fn check_and_spend(env: Env, agent: Address, amount: i128);
    }
}

mod registry_client {
    use soroban_sdk::{contractclient, BytesN, Env};
    #[contractclient(name = "Client")]
    #[allow(dead_code)]
    pub trait Registry {
        fn record_job(env: Env, agent_id: BytesN<32>, success: bool);
    }
}

mod test;
