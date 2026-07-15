import { boolean, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const tripStatusEnum = pgEnum('trip_status', ['open', 'closed']);

// A group travel fund. Funds are custodied on-chain by the TravelFundPool Soroban
// contract, keyed by sha256(this row's id). Members contribute XLM into the pool
// (member-signed contract invoke); the organiser spends from the pool to a payee
// (organiser-signed invoke) and every move is an immutable on-chain ledger entry.
export const trips = pgTable('trips', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  destination: text('destination').notNull().default(''),
  // Wallet (G-address) of the organiser who opened the fund (the spender / authoriser).
  organizerWallet: text('organizer_wallet').notNull().default(''),
  // Tx hash of the on-chain open_trip invoke. Empty until the pool is opened on-chain.
  openTxHash: text('open_tx_hash').notNull().default(''),
  // Whether the organiser's wallet has added a USDC trustline (opt-in). XLM needs none.
  usdcEnabled: boolean('usdc_enabled').notNull().default(false),
  status: tripStatusEnum('status').notNull().default('open'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type Trip = typeof trips.$inferSelect;
export type NewTrip = typeof trips.$inferInsert;
