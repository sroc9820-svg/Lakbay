import { createHash } from 'node:crypto';
import { type JWTPayload, jwtVerify, SignJWT } from 'jose';
import { cookies } from 'next/headers';
import { env } from '@/server/config/env';

const secret = new TextEncoder().encode(env.SESSION_SECRET);

export type SessionData = { pub: string };

export async function issueSession(publicKey: string): Promise<string> {
  return new SignJWT({ pub: publicKey } satisfies SessionData & JWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${env.SESSION_TTL_SECONDS}s`)
    .sign(secret);
}

export async function setSessionCookie(publicKey: string): Promise<void> {
  const token = await issueSession(publicKey);
  const jar = await cookies();
  jar.set(env.SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: env.SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(env.SESSION_COOKIE_NAME);
}

export async function getSession(): Promise<SessionData | null> {
  const jar = await cookies();
  const token = jar.get(env.SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    if (typeof payload.pub === 'string') return { pub: payload.pub };
    return null;
  } catch {
    return null;
  }
}

/** Deterministic server keypair seed derived from SESSION_SECRET (for SEP-10 challenges). */
export function serverSeed(): Buffer {
  return createHash('sha256').update(`sep10:${env.SESSION_SECRET}`).digest();
}
