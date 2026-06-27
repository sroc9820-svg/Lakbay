import { fromError, ok } from '@/server/lib/http';
import { getSession } from '@/server/lib/session';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const session = await getSession();
    return ok({ publicKey: session?.pub ?? null });
  } catch (err) {
    return fromError(err);
  }
}
