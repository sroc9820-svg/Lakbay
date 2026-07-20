# Deployment Record — TravelFundPool

## Testnet (LIVE)
Contract ID: CC6YMREXBYOITKX26BTDBGQ55AGRJ6RRGEBNMI3O4V6G2ZB45ZAB5H4T
Admin / deployer: GBL5RJKF4QNJ4ZPLJZ7PS7K5A4J44VEZJRV2CRTFFDRVSY2N76AIIE47
Default token (XLM SAC): CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
Deploy date: 2026-06-27
Network passphrase: Test SDF Network ; September 2015
RPC: https://soroban-testnet.stellar.org
Explorer: https://stellar.expert/explorer/testnet/contract/CC6YMREXBYOITKX26BTDBGQ55AGRJ6RRGEBNMI3O4V6G2ZB45ZAB5H4T

Build: cargo +1.89.0 build --release --target wasm32-unknown-unknown
Optimize: stellar contract optimize (27,622 -> 20,999 bytes)
Tests: cargo +1.89.0 test -> 16 passed; 0 failed

Entrypoints:
  initialize(admin, token)
  open_trip(organizer, trip_id, token)              organizer-signed
  contribute(member, trip_id, amount) -> i128       member-signed
  spend(organizer, trip_id, payee, amount, memo) -> u32     organizer-signed
  refund(organizer, trip_id, member, amount, memo) -> u32   organizer-signed
  close_trip(organizer, trip_id)                    organizer-signed
  views: get_trip, pooled, balance, member_amount, spend_count, get_spends,
         total_pooled, get_token, get_admin
  admin: set_admin, upgrade

## Mainnet (LIVE)
Contract ID: CBTFUJR7QXX5GY4NUOS7IFZJTHIWY4L3WPLJGJFK3NXHDHRZ7FH33EW4
Network passphrase: Public Global Stellar Network ; September 2015
RPC: https://soroban.stellar.org
Explorer: https://stellar.expert/explorer/public/contract/CBTFUJR7QXX5GY4NUOS7IFZJTHIWY4L3WPLJGJFK3NXHDHRZ7FH33EW4

Confirmed live via the stellar.expert API (contract exists on the public network, created
2026-07-12 UTC). Deploy-tx history — init tx hash, wasm hash, admin/deployer key, toolchain —
wasn't recorded at deploy time and isn't reconstructed here.
