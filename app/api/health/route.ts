import { ok } from '@/server/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return ok({ status: 'ok', app: 'lakbay' });
}
