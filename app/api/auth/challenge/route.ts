import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/server/db/client';
import { sessions } from '@/server/db/schema';
import { fromError, ok } from '@/server/lib/http';
import { DEMO_KEYS } from '@/server/service/stats.service';
import { isValidPublicKey } from '@/server/stellar/network';
import { buildChallenge } from '@/server/stellar/sep10';

export const runtime = 'nodejs';

const schema = z.object({ publicKey: z.string() });

export async function POST(req: NextRequest) {
  try {
    const { publicKey } = schema.parse(await req.json());
    if (!isValidPublicKey(publicKey)) {
      return fromError({ name: 'ZodError', issues: [{ message: 'INVALID_PUBLIC_KEY' }] });
    }
    const { xdr, nonce } = buildChallenge(publicKey);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await db.insert(sessions).values({
      publicKey,
      nonce,
      verified: false,
      isDemo: DEMO_KEYS.has(publicKey),
      expiresAt,
    });
    return ok({ xdr, network: 'testnet' });
  } catch (err) {
    return fromError(err);
  }
}
