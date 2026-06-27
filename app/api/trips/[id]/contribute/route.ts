import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { fromError, ok } from '@/server/lib/http';
import { buildContribution } from '@/server/service/ledger.service';

export const runtime = 'nodejs';
export const maxDuration = 60;

const schema = z.object({
  source: z.string(),
  amount: z.string(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = schema.parse(await req.json());
    const result = await buildContribution({ tripId: id, ...body });
    return ok(result);
  } catch (err) {
    return fromError(err);
  }
}
