import { fromError, ok } from '@/server/lib/http';
import { clearSessionCookie } from '@/server/lib/session';

export const runtime = 'nodejs';

export async function POST() {
  try {
    await clearSessionCookie();
    return ok({ ok: true });
  } catch (err) {
    return fromError(err);
  }
}
