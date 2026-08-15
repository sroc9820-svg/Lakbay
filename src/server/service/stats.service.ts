import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { contributions, sessions, spends, trips } from '@/server/db/schema';

// Wallets used only for e2e/demo signing — excluded from real interaction counts.
export const DEMO_KEYS = new Set<string>([
  'GBL5RJKF4QNJ4ZPLJZ7PS7K5A4J44VEZJRV2CRTFFDRVSY2N76AIIE47',
]);

export type Stats = {
  uniqueWallets: number;
  logins: number;
  trips: number;
  contributions: number;
  spends: number;
  volumeXlm: string;
};

function notInDemo(column: Parameters<typeof sql>[0]): ReturnType<typeof sql> {
  const demoList = Array.from(DEMO_KEYS);
  if (demoList.length === 0) return sql`true`;
  return sql`${column} not in (${sql.join(
    demoList.map((k) => sql`${k}`),
    sql`, `,
  )})`;
}

export async function getStats(): Promise<Stats> {
  const [loginRow] = await db
    .select({
      logins: sql<number>`count(*)::int`,
      wallets: sql<number>`count(distinct ${sessions.publicKey})::int`,
    })
    .from(sessions)
    .where(and(eq(sessions.verified, true), eq(sessions.isDemo, false), notInDemo(sessions.publicKey)));

  const [tripRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(trips)
    .where(notInDemo(trips.organizerWallet));
  const [contribRow] = await db
    .select({
      n: sql<number>`count(*)::int`,
      vol: sql<string>`coalesce(sum(case when ${contributions.asset} = 'XLM' then ${contributions.amount}::numeric else 0 end), 0)::text`,
    })
    .from(contributions)
    .where(notInDemo(contributions.contributorWallet));
  const [spendRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(spends)
    .where(notInDemo(spends.recipient));

  return {
    uniqueWallets: loginRow?.wallets ?? 0,
    logins: loginRow?.logins ?? 0,
    trips: tripRow?.n ?? 0,
    contributions: contribRow?.n ?? 0,
    spends: spendRow?.n ?? 0,
    volumeXlm: contribRow?.vol ?? '0',
  };
}
