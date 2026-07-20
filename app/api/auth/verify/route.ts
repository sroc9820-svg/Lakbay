import { and, desc, eq } from 'drizzle-orm';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/server/db/client';
import { sessions } from '@/server/db/schema';
import { AppError, fromError, ok } from '@/server/lib/http';
import { setSessionCookie } from '@/server/lib/session';
import { verifyChallenge } from '@/server/stellar/sep10';

export const runtime = 'nodejs';

const schema = z.object({
  publicKey: z.string(),
  signedNonce: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const { publicKey, signedNonce } = schema.parse(await req.json());
    const rows = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.publicKey, publicKey), eq(sessions.verified, false)))
      .orderBy(desc(sessions.createdAt))
      .limit(1);
    const challenge = rows[0];
    if (!challenge) throw new AppError('UNAUTHORIZED', 'No pending challenge for this wallet', 401);
    if (challenge.expiresAt.getTime() < Date.now()) {
      throw new AppError('UNAUTHORIZED', 'Challenge expired, please reconnect', 401);
    }

    verifyChallenge(signedNonce, publicKey, challenge.nonce);

    await db.update(sessions).set({ verified: true }).where(eq(sessions.id, challenge.id));
    await setSessionCookie(publicKey);
    return ok({ publicKey });
  } catch (err) {
    return fromError(err);
  }
}
