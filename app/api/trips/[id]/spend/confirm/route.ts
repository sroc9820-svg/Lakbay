import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { AppError, created, fromError } from '@/server/lib/http';
import { getSession } from '@/server/lib/session';
import { confirmSpend } from '@/server/service/ledger.service';

export const runtime = 'nodejs';
export const maxDuration = 60;

const schema = z.object({
  signedXdr: z.string().min(1),
  description: z.string(),
  category: z.string().optional(),
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
    const row = await confirmSpend({ tripId: id, ...body });
    return created(row);
  } catch (err) {
    return fromError(err);
  }
}
