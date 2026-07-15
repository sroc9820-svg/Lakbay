#![no_std]
//! # Travel Fund Pool
//!
//! A Soroban smart contract that turns a group travel fund into a fully
//! on-chain, auditable pool. It is the trust-minimized core of the **Lakbay**
//! group travel fund: instead of one friend holding everyone's cash and being
//! *trusted* to spend it fairly, every contribution is escrowed *in the
//! contract*, and every payout — plus any end-of-trip refund — is appended to an
//! immutable on-chain spend ledger the whole group can read.
//!
//! ## Properties
//! - **Real on-chain custody** via the Stellar Asset Contract (SAC). The default
//!   token recorded at init is the native **XLM** SAC — no trustline required.
//! - **Per-trip + per-member accounting** — `pooled`, `balance`, `spent`,
//!   `refunded`, the distinct `members` count, and each wallet's lifetime
//!   contribution are all tracked on-chain.
//! - **Immutable spend ledger** — `spend` and `refund` append a `SpendRecord`
//!   (payee, amount, memo hash, ledger, kind) that is never mutated. This is the
//!   audit trail.
//! - **Authorization** — members authorize their own contributions; only the
//!   trip `organizer` can spend or refund, and never more than the held balance.
//! - **Admin + upgradeable** — the admin is the deployer; the code can ship fixes
//!   without migrating trip balances.
//! - **Events** — `init`, `open`, `contrib`, `spend`, `refund`, `settle`.

mod error;
mod storage;
mod types;

#[cfg(test)]
mod test;

use error::Error;
use storage::{
    DataKey, ENTRY_BUMP_AMOUNT, ENTRY_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT,
    INSTANCE_LIFETIME_THRESHOLD,
};
use types::{SpendKind, SpendRecord, Trip, TripStatus};

use soroban_sdk::{
    contract, contractimpl, symbol_short, token, Address, BytesN, Env, Vec,
};

#[contract]
pub struct TravelFundPool;

#[contractimpl]
impl TravelFundPool {
    /// One-time setup. Records the admin (the deployer) and the default token
    /// (the XLM Stellar Asset Contract).
    pub fn initialize(env: Env, admin: Address, token: Address) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::TotalPooled, &0i128);
        bump_instance(&env);
        env.events().publish((symbol_short!("init"),), (admin, token));
        Ok(())
    }

    /// Open a new trip pool owned by `organizer` and denominated in `token` (the
    /// XLM SAC by default). Fails if the id is already taken.
    ///
    /// Auth: requires the organizer's signature.
    pub fn open_trip(
        env: Env,
        organizer: Address,
        trip_id: BytesN<32>,
        token: Address,
    ) -> Result<(), Error> {
        organizer.require_auth();
        let key = DataKey::Trip(trip_id.clone());
        if env.storage().persistent().has(&key) {
            return Err(Error::TripExists);
        }
        let trip = Trip {
            organizer: organizer.clone(),
            token: token.clone(),
            pooled: 0,
            balance: 0,
            spent: 0,
            refunded: 0,
            members: 0,
            spends: 0,
            status: TripStatus::Open,
        };
        save_trip(&env, &key, &trip);
        env.storage()
            .persistent()
            .set(&DataKey::Spends(trip_id.clone()), &Vec::<SpendRecord>::new(&env));
        bump_entry(&env, &DataKey::Spends(trip_id.clone()));
        bump_instance(&env);
        env.events()
            .publish((symbol_short!("open"), organizer), (trip_id, token));
        Ok(())
    }

    /// Contribute `amount` of the trip's token into the pool, locking it in the
    /// contract. Tracks the trip total and the member's lifetime amount;
    /// increments the distinct-member count on a wallet's first contribution.
    /// Returns the new lifetime pooled total.
    ///
    /// Auth: requires the member's signature. The same authorization covers the
    /// inner SAC `transfer(member -> contract)`.
    pub fn contribute(
        env: Env,
        member: Address,
        trip_id: BytesN<32>,
        amount: i128,
    ) -> Result<i128, Error> {
        member.require_auth();
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let key = DataKey::Trip(trip_id.clone());
        let mut trip = env
            .storage()
            .persistent()
            .get::<_, Trip>(&key)
            .ok_or(Error::TripNotFound)?;
        if trip.status == TripStatus::Settled {
            return Err(Error::TripSettled);
        }

        // Pull the contribution into the contract's custody.
        token::Client::new(&env, &trip.token).transfer(
            &member,
            &env.current_contract_address(),
            &amount,
        );

        // Per-member lifetime accounting (+ distinct-member count on first gift).
        let member_key = DataKey::Member(trip_id.clone(), member.clone());
        let prev: i128 = env.storage().persistent().get(&member_key).unwrap_or(0);
        if prev == 0 {
            trip.members += 1;
        }
        env.storage().persistent().set(&member_key, &(prev + amount));
        bump_entry(&env, &member_key);

        trip.pooled += amount;
        trip.balance += amount;
        save_trip(&env, &key, &trip);

        let total: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalPooled)
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::TotalPooled, &(total + amount));
        bump_instance(&env);

        env.events().publish(
            (symbol_short!("contrib"), member),
            (trip_id, amount, trip.pooled),
        );
        Ok(trip.pooled)
    }

    /// Spend `amount` of the held balance to `payee`, appending an immutable
    /// `SpendRecord` (payee, amount, `memo` = sha256 of the payout note, ledger
    /// sequence, kind=Spend) to the trip's on-chain spend ledger. Returns the
    /// index of the new ledger entry.
    ///
    /// Auth: requires the trip organizer's signature; cannot exceed the held
    /// balance.
    pub fn spend(
        env: Env,
        organizer: Address,
        trip_id: BytesN<32>,
        payee: Address,
        amount: i128,
        memo: BytesN<32>,
    ) -> Result<u32, Error> {
        organizer.require_auth();
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let key = DataKey::Trip(trip_id.clone());
        let mut trip = env
            .storage()
            .persistent()
            .get::<_, Trip>(&key)
            .ok_or(Error::TripNotFound)?;
        if trip.organizer != organizer {
            return Err(Error::Unauthorized);
        }
        if amount > trip.balance {
            return Err(Error::InsufficientBalance);
        }

        // Pay out from the contract's custody to the payee.
        token::Client::new(&env, &trip.token).transfer(
            &env.current_contract_address(),
            &payee,
            &amount,
        );

        let index = append_spend(&env, &trip_id, &payee, amount, &memo, SpendKind::Spend);

        trip.balance -= amount;
        trip.spent += amount;
        trip.spends += 1;
        save_trip(&env, &key, &trip);
        bump_instance(&env);

        env.events().publish(
            (symbol_short!("spend"), organizer),
            (trip_id, payee, amount),
        );
        Ok(index)
    }

    /// Refund `amount` of the remaining held balance back to `member` at trip
    /// end, decrementing that member's tracked contribution and appending an
    /// immutable `SpendRecord` (kind=Refund) to the on-chain ledger. Returns the
    /// index of the new ledger entry.
    ///
    /// Auth: requires the trip organizer's signature; cannot exceed the member's
    /// remaining tracked contribution nor the held balance.
    pub fn refund(
        env: Env,
        organizer: Address,
        trip_id: BytesN<32>,
        member: Address,
        amount: i128,
        memo: BytesN<32>,
    ) -> Result<u32, Error> {
        organizer.require_auth();
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let key = DataKey::Trip(trip_id.clone());
        let mut trip = env
            .storage()
            .persistent()
            .get::<_, Trip>(&key)
            .ok_or(Error::TripNotFound)?;
        if trip.organizer != organizer {
            return Err(Error::Unauthorized);
        }
        if amount > trip.balance {
            return Err(Error::InsufficientBalance);
        }

        let member_key = DataKey::Member(trip_id.clone(), member.clone());
        let contributed: i128 = env.storage().persistent().get(&member_key).unwrap_or(0);
        if amount > contributed {
            return Err(Error::ExceedsContribution);
        }

        // Return the remainder from the contract's custody to the member.
        token::Client::new(&env, &trip.token).transfer(
            &env.current_contract_address(),
            &member,
            &amount,
        );
        env.storage()
            .persistent()
            .set(&member_key, &(contributed - amount));
        bump_entry(&env, &member_key);

        let index = append_spend(&env, &trip_id, &member, amount, &memo, SpendKind::Refund);

        trip.balance -= amount;
        trip.refunded += amount;
        trip.spends += 1;
        save_trip(&env, &key, &trip);
        bump_instance(&env);

        env.events().publish(
            (symbol_short!("refund"), organizer),
            (trip_id, member, amount),
        );
        Ok(index)
    }

    /// Settle a trip: block new contributions (the organizer can still spend or
    /// refund the remaining held balance afterward). Auth: trip organizer.
    pub fn close_trip(
        env: Env,
        organizer: Address,
        trip_id: BytesN<32>,
    ) -> Result<(), Error> {
        organizer.require_auth();
        let key = DataKey::Trip(trip_id.clone());
        let mut trip = env
            .storage()
            .persistent()
            .get::<_, Trip>(&key)
            .ok_or(Error::TripNotFound)?;
        if trip.organizer != organizer {
            return Err(Error::Unauthorized);
        }
        trip.status = TripStatus::Settled;
        save_trip(&env, &key, &trip);
        bump_instance(&env);
        env.events()
            .publish((symbol_short!("settle"), organizer), trip_id);
        Ok(())
    }

    // --- Views -------------------------------------------------------------

    pub fn get_trip(env: Env, trip_id: BytesN<32>) -> Result<Trip, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Trip(trip_id))
            .ok_or(Error::TripNotFound)
    }

    pub fn pooled(env: Env, trip_id: BytesN<32>) -> i128 {
        env.storage()
            .persistent()
            .get::<_, Trip>(&DataKey::Trip(trip_id))
            .map(|t| t.pooled)
            .unwrap_or(0)
    }

    pub fn balance(env: Env, trip_id: BytesN<32>) -> i128 {
        env.storage()
            .persistent()
            .get::<_, Trip>(&DataKey::Trip(trip_id))
            .map(|t| t.balance)
            .unwrap_or(0)
    }

    pub fn member_amount(env: Env, trip_id: BytesN<32>, member: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::Member(trip_id, member))
            .unwrap_or(0)
    }

    pub fn spend_count(env: Env, trip_id: BytesN<32>) -> u32 {
        env.storage()
            .persistent()
            .get::<_, Vec<SpendRecord>>(&DataKey::Spends(trip_id))
            .map(|v| v.len())
            .unwrap_or(0)
    }

    pub fn get_spends(env: Env, trip_id: BytesN<32>) -> Vec<SpendRecord> {
        env.storage()
            .persistent()
            .get(&DataKey::Spends(trip_id))
            .unwrap_or_else(|| Vec::new(&env))
    }

    pub fn total_pooled(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::TotalPooled)
            .unwrap_or(0)
    }

    pub fn get_token(env: Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Token)
            .ok_or(Error::NotInitialized)
    }

    pub fn get_admin(env: Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)
    }

    // --- Admin -------------------------------------------------------------

    pub fn set_admin(env: Env, new_admin: Address) -> Result<(), Error> {
        admin(&env)?.require_auth();
        env.storage().instance().set(&DataKey::Admin, &new_admin);
        bump_instance(&env);
        Ok(())
    }

    /// Replace the contract's own code (admin-gated). Enables shipping fixes
    /// without migrating trip balances.
    pub fn upgrade(env: Env, new_wasm_hash: BytesN<32>) -> Result<(), Error> {
        admin(&env)?.require_auth();
        env.deployer().update_current_contract_wasm(new_wasm_hash);
        Ok(())
    }
}

// --- Internal helpers ------------------------------------------------------

fn admin(env: &Env) -> Result<Address, Error> {
    env.storage()
        .instance()
        .get(&DataKey::Admin)
        .ok_or(Error::NotInitialized)
}

fn append_spend(
    env: &Env,
    trip_id: &BytesN<32>,
    payee: &Address,
    amount: i128,
    memo: &BytesN<32>,
    kind: SpendKind,
) -> u32 {
    let spends_key = DataKey::Spends(trip_id.clone());
    let mut spends: Vec<SpendRecord> = env
        .storage()
        .persistent()
        .get(&spends_key)
        .unwrap_or_else(|| Vec::new(env));
    let index = spends.len();
    spends.push_back(SpendRecord {
        payee: payee.clone(),
        amount,
        memo: memo.clone(),
        ledger: env.ledger().sequence(),
        kind,
    });
    env.storage().persistent().set(&spends_key, &spends);
    bump_entry(env, &spends_key);
    index
}

fn save_trip(env: &Env, key: &DataKey, trip: &Trip) {
    env.storage().persistent().set(key, trip);
    env.storage()
        .persistent()
        .extend_ttl(key, ENTRY_LIFETIME_THRESHOLD, ENTRY_BUMP_AMOUNT);
}

fn bump_entry(env: &Env, key: &DataKey) {
    env.storage()
        .persistent()
        .extend_ttl(key, ENTRY_LIFETIME_THRESHOLD, ENTRY_BUMP_AMOUNT);
}

fn bump_instance(env: &Env) {
    env.storage()
        .instance()
        .extend_ttl(INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);
}
