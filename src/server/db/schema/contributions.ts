import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { trips } from './trips';

// A real on-chain contribution from a member's wallet into the trip's pool contract.
export const contributions = pgTable('contributions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tripId: uuid('trip_id')
    .notNull()
    .references(() => trips.id, { onDelete: 'cascade' }),
  // The wallet (G-address) that funded this contribution.
  contributorWallet: text('contributor_wallet').notNull(),
  // Optional friendly label the contributor chose for themselves.
  contributorLabel: text('contributor_label').notNull().default(''),
  amount: text('amount').notNull(),
  asset: text('asset').notNull().default('XLM'),
  txHash: text('tx_hash').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type Contribution = typeof contributions.$inferSelect;
export type NewContribution = typeof contributions.$inferInsert;
