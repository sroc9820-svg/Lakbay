import { fromError, ok } from '@/server/lib/http';
import { getStats } from '@/server/service/stats.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return ok(await getStats());
  } catch (err) {
    return fromError(err);
  }
}
