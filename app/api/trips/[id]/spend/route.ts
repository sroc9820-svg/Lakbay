import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { AppError, fromError, ok } from '@/server/lib/http';
import { getSession } from '@/server/lib/session';
import { buildSpendTx } from '@/server/service/ledger.service';

export const runtime = 'nodejs';
export const maxDuration = 60;

const schema = z.object({
  description: z.string(),
  recipient: z.string(),
  amount: z.string(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session)
      throw new AppError('UNAUTHORIZED', 'Connect a wallet to spend from the pool', 401);
    const { id } = await params;
    const body = schema.parse(await req.json());
    const result = await buildSpendTx({ tripId: id, organizer: session.pub, ...body });
    return ok(result);
  } catch (err) {
    return fromError(err);
  }
}
