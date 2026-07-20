import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { created, fromError } from '@/server/lib/http';
import { confirmContribution } from '@/server/service/ledger.service';

export const runtime = 'nodejs';
export const maxDuration = 60;

const schema = z.object({
  signedXdr: z.string().min(1),
  contributorWallet: z.string(),
  contributorLabel: z.string().optional(),
  amount: z.string(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = schema.parse(await req.json());
    const row = await confirmContribution({ tripId: id, ...body });
    return created(row);
  } catch (err) {
    return fromError(err);
  }
}
