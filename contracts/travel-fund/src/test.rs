#![cfg(test)]

use crate::types::{SpendKind, TripStatus};
use crate::{TravelFundPool, TravelFundPoolClient};

use soroban_sdk::testutils::Address as _;
use soroban_sdk::token::{Client as TokenClient, StellarAssetClient};
use soroban_sdk::{Address, BytesN, Env};

struct Setup<'a> {
    env: Env,
    client: TravelFundPoolClient<'a>,
    contract: Address,
    token: Address,
    token_client: TokenClient<'a>,
    organizer: Address,
    member: Address,
}

fn setup<'a>(member_mint: i128) -> Setup<'a> {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let organizer = Address::generate(&env);
    let member = Address::generate(&env);

    // Deploy a Stellar Asset Contract to stand in for the XLM SAC.
    let sac = env.register_stellar_asset_contract_v2(admin.clone());
    let token = sac.address();
    StellarAssetClient::new(&env, &token).mint(&member, &member_mint);

    let contract_id = env.register(TravelFundPool, ());
    let client = TravelFundPoolClient::new(&env, &contract_id);
    client.initialize(&admin, &token);

    Setup {
        token_client: TokenClient::new(&env, &token),
        env,
        client,
        contract: contract_id,
        token,
        organizer,
        member,
    }
}

fn id(env: &Env, tag: u8) -> BytesN<32> {
    BytesN::from_array(env, &[tag; 32])
}

fn memo(env: &Env, tag: u8) -> BytesN<32> {
    BytesN::from_array(env, &[tag; 32])
}

#[test]
fn initialize_records_admin_and_token() {
    let s = setup(1_000);
    assert_eq!(s.client.get_token(), s.token);
    assert_eq!(s.client.total_pooled(), 0);
}

#[test]
#[should_panic(expected = "Error(Contract, #1)")] // AlreadyInitialized
fn double_initialize_fails() {
    let s = setup(1_000);
    let admin2 = Address::generate(&s.env);
    s.client.initialize(&admin2, &s.token);
}

#[test]
fn open_trip_records_organizer() {
    let s = setup(1_000);
    let t = id(&s.env, 1);
    s.client.open_trip(&s.organizer, &t, &s.token);

    let trip = s.client.get_trip(&t);
    assert_eq!(trip.organizer, s.organizer);
    assert_eq!(trip.token, s.token);
    assert_eq!(trip.pooled, 0);
    assert_eq!(trip.balance, 0);
    assert_eq!(trip.members, 0);
    assert_eq!(trip.status, TripStatus::Open);
}

#[test]
#[should_panic(expected = "Error(Contract, #5)")] // TripExists
fn open_duplicate_trip_fails() {
    let s = setup(1_000);
    let t = id(&s.env, 2);
    s.client.open_trip(&s.organizer, &t, &s.token);
    s.client.open_trip(&s.organizer, &t, &s.token);
}

#[test]
fn contribute_locks_funds_and_tracks_totals() {
    let s = setup(1_000);
    let t = id(&s.env, 4);
    s.client.open_trip(&s.organizer, &t, &s.token);

    let pooled = s.client.contribute(&s.member, &t, &200);
    assert_eq!(pooled, 200);

    // Member debited, contract custodies the funds.
    assert_eq!(s.token_client.balance(&s.member), 800);
    assert_eq!(s.token_client.balance(&s.contract), 200);

    let trip = s.client.get_trip(&t);
    assert_eq!(trip.pooled, 200);
    assert_eq!(trip.balance, 200);
    assert_eq!(trip.members, 1);
    assert_eq!(s.client.member_amount(&t, &s.member), 200);
    assert_eq!(s.client.total_pooled(), 200);
}

#[test]
fn multiple_contributions_accumulate_distinct_members() {
    let s = setup(1_000);
    let other = Address::generate(&s.env);
    StellarAssetClient::new(&s.env, &s.token).mint(&other, &1_000);
    let t = id(&s.env, 5);
    s.client.open_trip(&s.organizer, &t, &s.token);

    s.client.contribute(&s.member, &t, &100);
    s.client.contribute(&s.member, &t, &50); // same member again — members stays 1
    s.client.contribute(&other, &t, &300);

    let trip = s.client.get_trip(&t);
    assert_eq!(trip.pooled, 450);
    assert_eq!(trip.balance, 450);
    assert_eq!(trip.members, 2);
    assert_eq!(s.client.member_amount(&t, &s.member), 150);
    assert_eq!(s.client.member_amount(&t, &other), 300);
    assert_eq!(s.client.total_pooled(), 450);
}

#[test]
#[should_panic(expected = "Error(Contract, #4)")] // InvalidAmount
fn contribute_zero_amount_fails() {
    let s = setup(1_000);
    let t = id(&s.env, 6);
    s.client.open_trip(&s.organizer, &t, &s.token);
    s.client.contribute(&s.member, &t, &0);
}

#[test]
#[should_panic(expected = "Error(Contract, #6)")] // TripNotFound
fn contribute_to_unknown_trip_fails() {
    let s = setup(1_000);
    let t = id(&s.env, 7);
    s.client.contribute(&s.member, &t, &50);
}

#[test]
fn spend_pays_payee_and_appends_ledger() {
    let s = setup(1_000);
    let payee = Address::generate(&s.env);
    let t = id(&s.env, 8);
    s.client.open_trip(&s.organizer, &t, &s.token);
    s.client.contribute(&s.member, &t, &300);

    let idx = s.client.spend(&s.organizer, &t, &payee, &120, &memo(&s.env, 9));
    assert_eq!(idx, 0); // first ledger entry

    // Payee received the funds; contract balance reduced.
    assert_eq!(s.token_client.balance(&payee), 120);
    assert_eq!(s.token_client.balance(&s.contract), 180);

    let trip = s.client.get_trip(&t);
    assert_eq!(trip.pooled, 300); // lifetime pooled unchanged
    assert_eq!(trip.balance, 180);
    assert_eq!(trip.spent, 120);
    assert_eq!(trip.spends, 1);

    // Immutable on-chain spend ledger holds the entry.
    assert_eq!(s.client.spend_count(&t), 1);
    let spends = s.client.get_spends(&t);
    let record = spends.get(0).unwrap();
    assert_eq!(record.payee, payee);
    assert_eq!(record.amount, 120);
    assert_eq!(record.kind, SpendKind::Spend);
}

#[test]
#[should_panic(expected = "Error(Contract, #8)")] // InsufficientBalance
fn spend_over_balance_fails() {
    let s = setup(1_000);
    let payee = Address::generate(&s.env);
    let t = id(&s.env, 10);
    s.client.open_trip(&s.organizer, &t, &s.token);
    s.client.contribute(&s.member, &t, &100);
    s.client.spend(&s.organizer, &t, &payee, &101, &memo(&s.env, 1));
}

#[test]
#[should_panic(expected = "Error(Contract, #3)")] // Unauthorized
fn spend_by_non_organizer_fails() {
    let s = setup(1_000);
    let stranger = Address::generate(&s.env);
    let payee = Address::generate(&s.env);
    let t = id(&s.env, 11);
    s.client.open_trip(&s.organizer, &t, &s.token);
    s.client.contribute(&s.member, &t, &100);
    // mock_all_auths lets `stranger` sign, but the contract rejects a non-organizer.
    s.client.spend(&stranger, &t, &payee, &50, &memo(&s.env, 1));
}

#[test]
fn refund_returns_remainder_and_appends_ledger() {
    let s = setup(1_000);
    let t = id(&s.env, 14);
    s.client.open_trip(&s.organizer, &t, &s.token);
    s.client.contribute(&s.member, &t, &300);
    s.client.close_trip(&s.organizer, &t);

    // Spend part to a vendor, refund the remainder to the member at trip end.
    let payee = Address::generate(&s.env);
    s.client.spend(&s.organizer, &t, &payee, &100, &memo(&s.env, 1));
    let idx = s.client.refund(&s.organizer, &t, &s.member, &200, &memo(&s.env, 2));
    assert_eq!(idx, 1); // second ledger entry

    // Member got the remainder back; contract emptied.
    assert_eq!(s.token_client.balance(&s.member), 900); // 1000 - 300 + 200
    assert_eq!(s.token_client.balance(&s.contract), 0);

    let trip = s.client.get_trip(&t);
    assert_eq!(trip.pooled, 300);
    assert_eq!(trip.spent, 100);
    assert_eq!(trip.refunded, 200);
    assert_eq!(trip.balance, 0);
    assert_eq!(trip.spends, 2);
    // The member's tracked contribution is drawn down by the refund.
    assert_eq!(s.client.member_amount(&t, &s.member), 100);

    let spends = s.client.get_spends(&t);
    assert_eq!(spends.get(1).unwrap().kind, SpendKind::Refund);
}

#[test]
#[should_panic(expected = "Error(Contract, #9)")] // ExceedsContribution
fn refund_over_member_contribution_fails() {
    let s = setup(1_000);
    let other = Address::generate(&s.env);
    StellarAssetClient::new(&s.env, &s.token).mint(&other, &1_000);
    let t = id(&s.env, 15);
    s.client.open_trip(&s.organizer, &t, &s.token);
    s.client.contribute(&s.member, &t, &100);
    s.client.contribute(&other, &t, &100);
    // Pool holds 200, but member only put in 100 — cannot refund them 150.
    s.client.refund(&s.organizer, &t, &s.member, &150, &memo(&s.env, 1));
}

#[test]
fn settle_blocks_new_contributions_but_allows_spend() {
    let s = setup(1_000);
    let payee = Address::generate(&s.env);
    let t = id(&s.env, 12);
    s.client.open_trip(&s.organizer, &t, &s.token);
    s.client.contribute(&s.member, &t, &200);
    s.client.close_trip(&s.organizer, &t);

    // Organizer can still pay out the held balance after settling.
    s.client.spend(&s.organizer, &t, &payee, &200, &memo(&s.env, 1));
    assert_eq!(s.token_client.balance(&payee), 200);
    assert_eq!(s.client.get_trip(&t).status, TripStatus::Settled);
}

#[test]
#[should_panic(expected = "Error(Contract, #7)")] // TripSettled
fn contribute_to_settled_trip_fails() {
    let s = setup(1_000);
    let t = id(&s.env, 13);
    s.client.open_trip(&s.organizer, &t, &s.token);
    s.client.close_trip(&s.organizer, &t);
    s.client.contribute(&s.member, &t, &50);
}

#[test]
fn trips_are_isolated() {
    let s = setup(1_000);
    let a = id(&s.env, 20);
    let b = id(&s.env, 21);
    s.client.open_trip(&s.organizer, &a, &s.token);
    s.client.open_trip(&s.organizer, &b, &s.token);

    s.client.contribute(&s.member, &a, &200);
    s.client.contribute(&s.member, &b, &50);

    assert_eq!(s.client.pooled(&a), 200);
    assert_eq!(s.client.pooled(&b), 50);
    assert_eq!(s.client.balance(&a), 200);
    assert_eq!(s.client.balance(&b), 50);
    assert_eq!(s.client.total_pooled(), 250);
}
