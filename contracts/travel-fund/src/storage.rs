use soroban_sdk::{contracttype, Address, BytesN};

/// Storage keys. `Trip`, `Member` and `Spends` live in *persistent* storage
/// (they must outlive the contract instance so funds and the audit trail are
/// never stranded); `Admin`/`Token`/`TotalPooled` live in *instance* storage so
/// they share the instance TTL.
#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    /// Default token (the XLM Stellar Asset Contract) recorded at init.
    Token,
    /// Running total of all minor units ever contributed across every trip.
    TotalPooled,
    /// trip_id -> Trip
    Trip(BytesN<32>),
    /// (trip_id, member) -> i128 lifetime contributed by that wallet.
    Member(BytesN<32>, Address),
    /// trip_id -> Vec<SpendRecord> (append-only on-chain spend ledger).
    Spends(BytesN<32>),
}

// Soroban ledgers close ~every 5s -> 17,280 ledgers/day.
pub const DAY_IN_LEDGERS: u32 = 17_280;

// Keep the contract instance (admin/config) alive ~30 days, re-bumped on every
// state-changing call.
pub const INSTANCE_BUMP_AMOUNT: u32 = 30 * DAY_IN_LEDGERS;
pub const INSTANCE_LIFETIME_THRESHOLD: u32 = INSTANCE_BUMP_AMOUNT - DAY_IN_LEDGERS;

// Trip / member / ledger entries are bumped to ~90 days so a trip's funds
// and its audit trail can never expire out from under it.
pub const ENTRY_BUMP_AMOUNT: u32 = 90 * DAY_IN_LEDGERS;
pub const ENTRY_LIFETIME_THRESHOLD: u32 = ENTRY_BUMP_AMOUNT - DAY_IN_LEDGERS;
