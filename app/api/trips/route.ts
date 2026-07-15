import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { AppError, created, fromError, ok } from '@/server/lib/http';
import { getSession } from '@/server/lib/session';
import { createTrip, listTrips } from '@/server/service/trip.service';

export const runtime = 'nodejs';
export const maxDuration = 60;

const schema = z.object({
  name: z.string(),
  destination: z.string().optional(),
});

export async function GET() {
  try {
    return ok(await listTrips());
  } catch (err) {
    return fromError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      throw new AppError('UNAUTHORIZED', 'Connect a wallet to open a fund on-chain', 401);
    }
    const body = schema.parse(await req.json());
    const result = await createTrip({
      name: body.name,
      destination: body.destination,
      organizerWallet: session.pub,
    });
    return created(result);
  } catch (err) {
    return fromError(err);
  }
}
