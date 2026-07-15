import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { trips } from './trips';

// A real on-chain payout from the TravelFundPool contract to a payee (vendor),
// or an end-of-trip refund back to a member — both appended to the contract's
// immutable spend ledger and mirrored here for fast reads.
export const spends = pgTable('spends', {
  id: uuid('id').primaryKey().defaultRandom(),
  tripId: uuid('trip_id')
    .notNull()
    .references(() => trips.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  category: text('category').notNull().default('general'),
  // 'spend' = paid out to a payee; 'refund' = remainder returned to a member.
  kind: text('kind').notNull().default('spend'),
  // Destination G-address the pool paid.
  recipient: text('recipient').notNull(),
  amount: text('amount').notNull(),
  asset: text('asset').notNull().default('XLM'),
  txHash: text('tx_hash').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type Spend = typeof spends.$inferSelect;
export type NewSpend = typeof spends.$inferInsert;
