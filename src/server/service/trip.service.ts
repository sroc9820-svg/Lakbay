import { desc, eq, ne } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { contributions, spends, trips } from '@/server/db/schema';
import { AppError } from '@/server/lib/http';
import { isValidPublicKey } from '@/server/stellar/network';
import {
  buildOpenTrip,
  readTrip as readOnchainTrip,
  submit,
  travelFundContractId,
  waitForTripReadable,
  xlmSac,
} from '@/server/stellar/soroban';

export type PublicTrip = {
  id: string;
  name: string;
  destination: string;
  organizerWallet: string;
  contractId: string;
  openTxHash: string;
  usdcEnabled: boolean;
  status: 'open' | 'closed';
  createdAt: Date;
};

function toPublic(t: typeof trips.$inferSelect): PublicTrip {
  return {
    id: t.id,
    name: t.name,
    destination: t.destination,
    organizerWallet: t.organizerWallet,
    contractId: travelFundContractId,
    openTxHash: t.openTxHash,
    usdcEnabled: t.usdcEnabled,
    status: t.status,
    createdAt: t.createdAt,
  };
}

/** Public listing — only trips whose pool has been opened on-chain. */
export async function listTrips(): Promise<PublicTrip[]> {
  const rows = await db
    .select()
    .from(trips)
    .where(ne(trips.openTxHash, ''))
    .orderBy(desc(trips.createdAt));
  return rows.map(toPublic);
}

export async function getTripRow(id: string) {
  const rows = await db.select().from(trips).where(eq(trips.id, id));
  if (!rows[0]) throw new AppError('NOT_FOUND', 'Trip fund not found', 404);
  return rows[0];
}

/**
 * Create the DB row for a new fund and build the organiser-signed `open_trip`
 * invoke that opens its on-chain pool. The row is hidden from public listings
 * until `confirmOpenTrip` records the open tx hash.
 */
export async function createTrip(input: {
  name: string;
  destination?: string;
  organizerWallet: string;
}): Promise<{ trip: PublicTrip; xdr: string }> {
  const name = input.name?.trim();
  if (!name || name.length < 2) throw new AppError('INVALID_INPUT', 'Fund name is required', 400);
  if (name.length > 60) throw new AppError('INVALID_INPUT', 'Fund name is too long', 400);
  if (!isValidPublicKey(input.organizerWallet)) {
    throw new AppError('INVALID_PUBLIC_KEY', 'INVALID_PUBLIC_KEY', 400);
  }
  const rows = await db
    .insert(trips)
    .values({
      name,
      destination: (input.destination ?? '').trim().slice(0, 80),
      organizerWallet: input.organizerWallet,
    })
    .returning();
  const trip = rows[0];
  const xdr = await buildOpenTrip({
    organizer: input.organizerWallet,
    tripUuid: trip.id,
    token: xlmSac(),
  });
  return { trip: toPublic(trip), xdr };
}

/** Submit the signed open_trip invoke and mark the fund live on-chain. */
export async function confirmOpenTrip(input: {
  tripId: string;
  signedXdr: string;
}): Promise<PublicTrip> {
  const trip = await getTripRow(input.tripId);
  const res = await submit(input.signedXdr);
  await waitForTripReadable(trip.id).catch(() => false);
  const rows = await db
    .update(trips)
    .set({ openTxHash: res.hash })
    .where(eq(trips.id, trip.id))
    .returning();
  return toPublic(rows[0]);
}

export async function getTripDetail(id: string) {
  const trip = await getTripRow(id);
  const [onchain, contribRows, spendRows] = await Promise.all([
    readOnchainTrip(id).catch(() => null),
    db
      .select()
      .from(contributions)
      .where(eq(contributions.tripId, id))
      .orderBy(desc(contributions.createdAt)),
    db.select().from(spends).where(eq(spends.tripId, id)).orderBy(desc(spends.createdAt)),
  ]);

  const pool = onchain ?? {
    pooled: '0',
    balance: '0',
    spent: '0',
    refunded: '0',
    members: 0,
    spends: 0,
    status: 'Open' as const,
  };

  return {
    trip: toPublic(trip),
    pool,
    contributions: contribRows,
    spends: spendRows,
    totals: {
      contributors: new Set(contribRows.map((c) => c.contributorWallet)).size,
      totalIn: pool.pooled,
      totalOut: pool.spent,
    },
  };
}

export async function setUsdcEnabled(id: string, enabled: boolean) {
  await db.update(trips).set({ usdcEnabled: enabled }).where(eq(trips.id, id));
}
