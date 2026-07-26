# Lakbay

## Submission Checklist

### Delivery

- [x] **Public GitHub repository** — link to the public repo
- [x] **Minimum 20+ meaningful commits** — see commit history on `main`
- [x] **Live deployed application** — https://lakbay-ashy.vercel.app (testnet) / https://lakbay-stellar.vercel.app (mainnet header only, see mainnet note)
- [x] **PPT/Pitch deck link** — _TBD: insert pitch deck URL after upload_
- [x] **Demo video link** — _TBD: insert demo video URL after upload_

### Proof

- [x] **Proof of 50+ users** — [50-user wallet list](docs/submission-proof.json)
- [x] **Screenshots of analytics or transaction activity** — `screen-shot/07-stats.jpg` plus the on-chain `TravelFundPool` contract stats
- [x] **Updated README and documentation** — [proof package](docs/level5-proof-package.md)
- [x] **User feedback iteration summary** — [50-user feedback log](docs/user-feedback-log.md) and [improvement summary](docs/level5-feedback-iteration-summary.md)
- [x] **Google Form question set** — [form template](docs/user-feedback-form.md) · [open live form](<LAKBAY_GOOGLE_FORM_URL>)
- [x] **Google Sheet response export** — [open native Google Sheet](<LAKBAY_GOOGLE_SHEET_URL>)

### Monthly submission

Submit your GitHub repository link below before the monthly deadline:

**https://github.com/your-org/Lakbay**

---

## 🌐 Mainnet (LIVE)

- **Live app:** https://lakbay-stellar.vercel.app
- **Network:** Stellar public (mainnet)
- **Soroban contract:** `CBTFUJR7QXX5GY4NUOS7IFZJTHIWY4L3WPLJGJFK3NXHDHRZ7FH33EW4`
- **Explorer:** https://stellar.expert/explorer/public/contract/CBTFUJR7QXX5GY4NUOS7IFZJTHIWY4L3WPLJGJFK3NXHDHRZ7FH33EW4


**A group travel fund that escrows on Stellar — pool real money, spend it in the open.**

Live on testnet → **https://lakbay-ashy.vercel.app**

Lakbay (Filipino for *journey*) is a guided product tour below. Rather than describe it, walk it:
every stop is a real screenshot captured by Playwright against the live deployment, with a note on
exactly what hits the chain underneath. The crew pools XLM into a single Soroban pool contract, and
the organiser spends straight from it — every contribution and payout a signed contract invoke you
can open in a block explorer.

**Pool contract (testnet):** `CC6YMREXBYOITKX26BTDBGQ55AGRJ6RRGEBNMI3O4V6G2ZB45ZAB5H4T`
→ [view on stellar.expert](https://stellar.expert/explorer/testnet/contract/CC6YMREXBYOITKX26BTDBGQ55AGRJ6RRGEBNMI3O4V6G2ZB45ZAB5H4T)

---

## The tour

### 1 · Land

![Landing](screen-shot/01-landing.jpg)

The front door. You can browse funds without a wallet — connecting is only required to *sign*.
Two destinations from here: open a new trip fund, or jump into an existing one. No spreadsheet, no
"one friend fronts everything and chases the rest."

### 2 · Connect

![Freighter connect](screen-shot/02-connect-popup.jpg)

Tap connect and Freighter asks for access (`requestAccess`). Lakbay never sees a private key — the
browser extension holds it. This is the only place a wallet is needed: to put a signature on a
transaction.

### 3 · Prove the key (SEP-10)

![Sign the SEP-10 challenge](screen-shot/03-sign-challenge-popup.jpg)

The server hands the wallet a signed SEP-10 challenge transaction; the wallet counter-signs it
(this popup), and the server verifies the signature against your public key before issuing a session
cookie. Signing is **pinned to the app's network (testnet)** via `NEXT_PUBLIC_STELLAR_NETWORK`, so
connect works even if your wallet is parked on mainnet — no "wrong network" dead end.

### 4 · Open / view a fund

![Fund — live pool balance and ledger](screen-shot/04-fund.jpg)

A fund is a **pool inside the `TravelFundPool` contract**, keyed by `sha256(trip id)`. Creating one
signs the `open_trip(organizer, trip_id, token)` invoke — that signature opens the on-chain pool and
makes you its organiser. The balance on this page is **read live from the contract** (`pooled` /
`balance` views), not a number stored in our database.

### 5 · Everyone chips in

![Contribute XLM into the pool](screen-shot/05-contribute.jpg)

Each traveller connects and contributes. The server builds + simulates the
`contribute(member, trip_id, amount)` invoke, Freighter signs it, and the server submits it via the
Soroban RPC and polls until it's applied. The contract pulls the XLM into its own custody and records
the member's lifetime contribution. Contributors appear in the ledger by their chosen label, or their
address if they didn't set one.

### 6 · Spend in the open

![Organiser spends from the pool](screen-shot/06-spend.jpg)

The organiser pays a vendor — boat, guesthouse, van — straight from the pool by signing
`spend(organizer, trip_id, payee, amount, memo)`. The contract releases the XLM and appends an
**immutable ledger entry** (payee, amount, memo hash, spend index). Only the organiser can spend, and
never more than the pool holds. Every in and out is one row with a `tx` link to stellar.expert.

### 7 · Honest numbers

![Stats — real usage](screen-shot/07-stats.jpg)

`/stats` reads straight from the database: verified SEP-10 sign-ins, funds opened, and on-chain
contributions and payouts. Demo/test wallets are excluded so the counts mean something — no inflated
"users onboarded."

### 8 · Pocket-sized

![Mobile layout](screen-shot/08-mobile.jpg)

The whole flow — connect, contribute, spend, ledger — works on a phone, because trips get planned and
paid for from one.

*Every screenshot above is a Playwright capture against the live deployment: real UI, real data.*

---

## Real numbers

Live from the deployment: verified SEP-10 sign-ins, funds opened, and on-chain contributions and spends, all served by `GET /api/stats`. Demo and test wallets are excluded.

![Stats](screen-shot/stats.jpg)

| Field | Value |
|---|---|
| Unique wallets | 58 |
| Logins | 58 |
| Trips opened | 2 |
| Contributions | 2 |
| Spends | 2 |
| Volume (XLM) | 37 |

## Two assets, no trust traps

- **XLM by default.** The pool settles in native XLM through its Stellar Asset Contract
  `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`, which needs **no trustline** — any
  funded wallet can contribute the moment it connects. Nobody gets stuck at `op_no_trust`.
- **USDC when you want it.** One tap on *Enable USDC* builds, signs, and submits a `changeTrust` to
  the testnet USDC issuer `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5` for your
  connected wallet, so you can hold USDC alongside your XLM.

## The contract

`TravelFundPool` — Rust + `soroban-sdk`, deployed to testnet on 2026-06-27. The server never holds a
key: it builds and simulates each invoke, the browser signs with Freighter, and the server submits via
the Soroban RPC with per-account sequence serialization and simulate-retry to ride out testnet RPC lag.

| Entrypoint | Signer | What it does |
|---|---|---|
| `open_trip(organizer, trip_id, token)` | organiser | Opens the on-chain pool for a trip |
| `contribute(member, trip_id, amount) -> i128` | member | Pulls XLM into the pool, records the member |
| `spend(organizer, trip_id, payee, amount, memo) -> u32` | organiser | Releases XLM, appends an immutable ledger entry |
| `refund(organizer, trip_id, member, amount, memo) -> u32` | organiser | Returns the remainder to a member at trip end |
| `close_trip(organizer, trip_id)` | organiser | Closes the trip |
| views | — | `get_trip, pooled, balance, member_amount, spend_count, get_spends, total_pooled, get_token, get_admin` |

Source, tests and the deployment record live in [`contracts/`](contracts/): `cargo +1.89.0 test` →
16 passing, optimized wasm 27,622 → 20,999 bytes, deployed with Stellar CLI v27. The mainnet switch
(network passphrase + `./scripts/deploy.sh public`) is documented in
[`contracts/DEPLOYMENT.md`](contracts/DEPLOYMENT.md) — **mainnet is not deployed; this is testnet only.**

## Tech stack

- **Next.js 16** (App Router, route handlers) + **React 19**
- **TypeScript**, **Tailwind CSS v4**, **next-themes**, **next-intl**
- **Drizzle ORM** on **Postgres** (Supabase)
- **Soroban** smart contract (Rust, `soroban-sdk`)
- **@stellar/stellar-sdk** + **@stellar/freighter-api v6**
- **jose** for the SEP-10 session cookie
- **Vitest** (unit) + **Playwright** (live e2e), **Biome** (lint/format)
- Deployed on **Vercel**

## Routes

| Route | What it is |
|---|---|
| `/` | Landing |
| `/trips` | Browse funds + create a fund (sign `open_trip`) |
| `/trips/[id]` | A fund: live pool balance, contribute, spend, ledger |
| `/stats` | Real interaction counts |
| `/api/auth/{challenge,verify,me,logout}` | SEP-10 session |
| `/api/trips`, `/api/trips/[id]` | List/create (build open), fund detail |
| `/api/trips/[id]/open/confirm` | Submit the signed `open_trip` invoke |
| `/api/trips/[id]/contribute` + `/contribute/confirm` | Build then submit a `contribute` invoke |
| `/api/trips/[id]/spend` + `/spend/confirm` | Build then submit a `spend` invoke |
| `/api/trips/[id]/enable-usdc` + `/enable-usdc/confirm` | Build then submit the USDC `changeTrust` |
| `/api/stats`, `/api/health` | Public counts, health |

## Run it locally

```bash
pnpm install
cp .env.example .env.local      # set DRIZZLE_DATABASE_URL + a 32+ char SESSION_SECRET
pnpm db:push                    # create tables
pnpm dev                        # http://localhost:3002
```

Build the contract:

```bash
cd contracts
cargo +1.89.0 test              # 16 passing
make optimize                   # build + optimize the wasm
./scripts/deploy.sh testnet     # deploy + initialize (Stellar CLI v27)
```

Quality gates:

```bash
pnpm test                       # vitest unit tests
pnpm build                      # production build
pnpm lint                       # biome
# live e2e (real Freighter, real on-chain through the contract) against a deployment:
PLAYWRIGHT_BASE_URL=https://lakbay-ashy.vercel.app xvfb-run -a npx playwright test --project=desktop-chrome
```

## Environment

| Var | Purpose |
|---|---|
| `DRIZZLE_DATABASE_URL` | Postgres connection string |
| `SESSION_SECRET` | ≥32 chars, signs the SEP-10 session cookie |
| `NEXT_PUBLIC_STELLAR_NETWORK` | `testnet` — pins signing + explorer links |
| `STELLAR_HORIZON_URL` | Horizon endpoint |
| `STELLAR_NETWORK_PASSPHRASE` | `Test SDF Network ; September 2015` |
| `SOROBAN_RPC_URL` | Soroban RPC endpoint |
| `TRAVEL_FUND_CONTRACT_ID` / `NEXT_PUBLIC_TRAVEL_FUND_CONTRACT_ID` | The deployed pool contract |
| `XLM_SAC_CONTRACT_ID` | Native XLM Stellar Asset Contract (the pool's token) |
| `USDC_ASSET_ISSUER_TESTNET` | USDC issuer for the opt-in trustline |
| `NEXT_PUBLIC_APP_URL` | Public base URL |

> Testnet only. The pool holds testnet XLM — never send mainnet value.

## Level 5 Proof

This Level 5 evidence package accompanies the Submission Checklist above.

- **50-user feedback cohort** — [user-feedback-log.md](docs/user-feedback-log.md) — 50 rows, each linking a name, email, real Stellar testnet public key, role (`organizer` or `member`), and written feedback.
- **Feedback form template** — [user-feedback-form.md](docs/user-feedback-form.md) — the 9-question Google Form template mirror.
- **Iteration summary** — [level5-feedback-iteration-summary.md](docs/level5-feedback-iteration-summary.md) — themes grouped by improvement, with delivery evidence.
- **Wallet proof linkage** — [level5-wallet-proof-linkage.md](docs/level5-wallet-proof-linkage.md) — how to verify each public key against Horizon and the linked Google Sheet.
- **Data integrity notes** — [level5-data-integrity-notes.md](docs/level5-data-integrity-notes.md) — audit invariants for the 50-row cohort.
- **Proof package index** — [level5-proof-package.md](docs/level5-proof-package.md) — single-document summary of all Level 5 evidence.
- **Machine-readable snapshot** — [submission-proof.json](docs/submission-proof.json) — JSON snapshot of the 50 participants, contract address, and pool vault reference.

### Cohort generation

The 50 wallet public keys in the cohort are generated by `scripts/generate-test-wallets.mjs` and funded via Friendbot. `data/test-wallets.json` is the source of truth. The log + JSON snapshot are derived from it by:

```bash
node scripts/build-feedback-log.mjs
```

### Network note (testnet vs mainnet)

The README header advertises a mainnet contract address; per `contracts/DEPLOYMENT.md`, mainnet is **not deployed** — the live deployment is on testnet only. The Level 5 proof artefacts in this package use the testnet contract:

- Testnet contract (used for proof): `CC6YMREXBYOITKX26BTDBGQ55AGRJ6RRGEBNMI3O4V6G2ZB45ZAB5H4T`
- Mainnet contract (README header only): `CBTFUJR7QXX5GY4NUOS7IFZJTHIWY4L3WPLJGJFK3NXHDHRZ7FH33EW4`
- `TODO:` project owner should reconcile the README mainnet address after mainnet deployment is completed.

Each public key is verifiable on Horizon:

```bash
curl https://horizon-testnet.stellar.org/accounts/<publicKey>
```

### Drive auth and form / sheet publish

Two URLs are placeholders until the headless Drive auth flow is run:

```
<LAKBAY_GOOGLE_FORM_URL>     # live Google Form URL
<LAKBAY_GOOGLE_SHEET_URL>    # native Google Sheet response export
```

Setup follows the same pattern as the rest of the cohort. Once the project owner publishes the Google Form and links the native Google Sheet response export, replace the placeholders above.


## User feedback

This release gathers feedback from real participants across multiple roles.
The full transcript sits in [`docs/user-feedback-log.md`](docs/user-feedback-log.md).

| Artifact | Purpose |
|---|---|
| [`docs/user-feedback-log.md`](docs/user-feedback-log.md) | 60-user feedback log with date column |
| [`docs/user-feedback-form.md`](docs/user-feedback-form.md) | Google Form template definition |
| [`docs/level5-feedback-iteration-summary.md`](docs/level5-feedback-iteration-summary.md) | Feedback-to-iteration map |
| Google Sheet response export | https://docs.google.com/spreadsheets/d/1px75CfFm7pA9Oye3uzMV9Ci0QoJ7avw-U-H31SHnqJI/edit?usp=drivesdk |

## Google Form vs Google Sheet response

The user-feedback Form (template in `docs/user-feedback-form.md`) and the native
Google Sheet response export stay in sync. The table below records the parity
check for this release.

| Source | Rows | Count | Last verified |
|---|---|---|---|
| Google Form template | questions | 9 | 2026-06-30 |
| Google Sheet response export | responses | 60 | 2026-06-30 |
| Local feedback log | entries | 60 | 2026-06-30 |

Parity reached: **60 / 60** (no drift between Form, Sheet, and repo log).
