import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { AppError, fromError, ok } from '@/server/lib/http';
import { getSession } from '@/server/lib/session';
import { confirmEnableUsdc } from '@/server/service/ledger.service';

export const runtime = 'nodejs';
export const maxDuration = 60;

const schema = z.object({ signedXdr: z.string().min(1) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) throw new AppError('UNAUTHORIZED', 'Connect a wallet to enable USDC', 401);
    const { id } = await params;
    const body = schema.parse(await req.json());
    return ok(await confirmEnableUsdc({ tripId: id, signedXdr: body.signedXdr }));
  } catch (err) {
    return fromError(err);
  }
}
