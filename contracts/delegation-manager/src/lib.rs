#![no_std]
use soroban_sdk::{contract, contracterror, contractimpl, contracttype, Address, Env};

#[contracttype]
#[derive(Clone)]
pub struct Allowance {
    pub owner: Address,
    pub token: Address,
    pub daily_limit: i128,
    pub spent_today: i128,
    pub day_start: u64,   // ledger timestamp marking the current 24h window
    pub expires_at: u64,
}

#[contracttype]
pub enum DataKey {
    Admin,
    Marketplace,
    Allowance(Address), // keyed by agent address
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum Error {
    NotAuthorized = 1,
    NoAllowance = 2,
    Expired = 3,
    LimitExceeded = 4,
}

const DAY_SECONDS: u64 = 86_400;

#[contract]
pub struct DelegationManager;

#[contractimpl]
impl DelegationManager {
    pub fn init(env: Env, admin: Address, marketplace: Address) {
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Marketplace, &marketplace);
    }

    /// Owner grants an agent a capped, expiring spending allowance.
    /// Requires the owner's wallet authorization (signed via Freighter / smart wallet).
    pub fn grant(
        env: Env,
        owner: Address,
        agent: Address,
        token: Address,
        daily_limit: i128,
        expires_at: u64,
    ) {
        owner.require_auth();
        let allowance = Allowance {
            owner,
            token,
            daily_limit,
            spent_today: 0,
            day_start: env.ledger().timestamp(),
            expires_at,
        };
        env.storage().persistent().set(&DataKey::Allowance(agent), &allowance);
    }

    /// Called by the Marketplace during a purchase. Reverts if expired or over-limit.
    pub fn check_and_spend(env: Env, agent: Address, amount: i128) -> Result<(), Error> {
        let marketplace: Address = env
            .storage()
            .instance()
            .get(&DataKey::Marketplace)
            .ok_or(Error::NotAuthorized)?;
        marketplace.require_auth();

        let key = DataKey::Allowance(agent);
        let mut a: Allowance = env.storage().persistent().get(&key).ok_or(Error::NoAllowance)?;

        let now = env.ledger().timestamp();
        if now >= a.expires_at {
            return Err(Error::Expired);
        }
        // Roll the daily window.
        if now >= a.day_start + DAY_SECONDS {
            a.day_start = now;
            a.spent_today = 0;
        }
        if a.spent_today + amount > a.daily_limit {
            return Err(Error::LimitExceeded);
        }
        a.spent_today += amount;
        env.storage().persistent().set(&key, &a);
        Ok(())
    }

    pub fn revoke(env: Env, owner: Address, agent: Address) -> Result<(), Error> {
        let key = DataKey::Allowance(agent);
        let a: Allowance = env.storage().persistent().get(&key).ok_or(Error::NoAllowance)?;
        a.owner.require_auth();
        if a.owner != owner {
            return Err(Error::NotAuthorized);
        }
        env.storage().persistent().remove(&key);
        Ok(())
    }

    pub fn get_allowance(env: Env, agent: Address) -> Result<Allowance, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Allowance(agent))
            .ok_or(Error::NoAllowance)
    }
}

mod test;
