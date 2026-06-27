import type { NextRequest } from 'next/server';
import { AppError, fromError, ok } from '@/server/lib/http';
import { getSession } from '@/server/lib/session';
import { buildEnableUsdc } from '@/server/service/ledger.service';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(
  _req: NextRequest,
  { params: _params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) throw new AppError('UNAUTHORIZED', 'Connect a wallet to enable USDC', 401);
    return ok(await buildEnableUsdc(session.pub));
  } catch (err) {
    return fromError(err);
  }
}
