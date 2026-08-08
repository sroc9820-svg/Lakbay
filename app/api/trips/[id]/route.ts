import { fromError, ok } from '@/server/lib/http';
import { getTripDetail } from '@/server/service/trip.service';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    return ok(await getTripDetail(id));
  } catch (err) {
    return fromError(err);
  }
}
