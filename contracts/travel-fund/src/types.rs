use soroban_sdk::{contracttype, Address, BytesN};

/// Lifecycle of a trip pool.
/// A trip starts `Open`; the organizer may `Settled` it once the journey is over.
/// Settling only blocks *new contributions* — the organizer can still spend or
/// refund the remaining held balance afterward.
#[contracttype]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum TripStatus {
    Open = 0,
    Settled = 1,
}

/// Whether a ledger entry was an outbound spend to a payee, or a remainder
/// refund returned to a member at trip end.
#[contracttype]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum SpendKind {
    Spend = 0,
    Refund = 1,
}

/// A single group travel fund, keyed in storage by a 32-byte `trip_id`
/// (the app passes `sha256(<trip UUID>)`).
///
/// The contract custodies exactly `balance` minor units of `token` for this
/// trip. `pooled` is the lifetime sum ever contributed (never decremented), so
/// the UI can always show "total pooled". `spent` + `refunded` + `balance` ==
/// `pooled`.
#[contracttype]
#[derive(Clone)]
pub struct Trip {
    /// The organizer who opened the trip; the only address allowed to spend/refund.
    pub organizer: Address,
    /// Stellar Asset Contract (SAC) address of the pool asset (XLM SAC by default).
    pub token: Address,
    /// Lifetime total ever contributed (monotonic; survives spends/refunds).
    pub pooled: i128,
    /// Funds currently held in the contract for this trip (pooled - spent - refunded).
    pub balance: i128,
    /// Lifetime total ever paid out to payees.
    pub spent: i128,
    /// Lifetime total ever refunded to members at trip end.
    pub refunded: i128,
    /// Number of distinct member wallets that have funded this trip.
    pub members: u32,
    /// Number of entries recorded in the on-chain spend ledger (spends + refunds).
    pub spends: u32,
    pub status: TripStatus,
}

/// One immutable entry in a trip's on-chain spend ledger. Appended on every
/// `spend` and `refund` and never mutated — this is the audit trail the whole
/// group can read.
#[contracttype]
#[derive(Clone)]
pub struct SpendRecord {
    /// Wallet the funds were paid to (a vendor payee, or a member on refund).
    pub payee: Address,
    /// Amount paid out, in the token's minor units (7 dp).
    pub amount: i128,
    /// `sha256(<payout description>)` — ties the on-chain entry to its off-chain note.
    pub memo: BytesN<32>,
    /// Ledger sequence at which the payout was recorded (on-chain timestamp).
    pub ledger: u32,
    /// Spend (to a payee) or Refund (remainder back to a member).
    pub kind: SpendKind,
}
