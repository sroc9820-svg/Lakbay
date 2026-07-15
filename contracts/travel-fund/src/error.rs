use soroban_sdk::contracterror;

/// All failure modes are explicit, contiguous `u32` codes so the TypeScript
/// client can map them to user-facing messages without guessing.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    Unauthorized = 3,
    InvalidAmount = 4,
    TripExists = 5,
    TripNotFound = 6,
    TripSettled = 7,
    InsufficientBalance = 8,
    ExceedsContribution = 9,
}
