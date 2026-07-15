import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// SEP-10 web-auth sessions. A challenge row is created on /challenge and flipped
// to verified on /verify once the wallet signature checks out.
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  publicKey: text('public_key').notNull(),
  nonce: text('nonce').notNull(),
  verified: boolean('verified').notNull().default(false),
  // True for the e2e/demo deployer wallet so /api/stats can exclude it.
  isDemo: boolean('is_demo').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at').notNull(),
});

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
