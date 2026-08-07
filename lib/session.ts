import { jwtVerify } from 'jose';
import type { NextRequest } from 'next/server';
import { getJwtSecret, SESSION_COOKIE_NAME } from '@/lib/jwt';

export type Session = {
  userId: string;
  email: string;
};

export async function getSession(request: NextRequest): Promise<Session | null> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), { algorithms: ['HS256'] });
    if (typeof payload.userId !== 'string' || typeof payload.email !== 'string') return null;
    return { userId: payload.userId, email: payload.email };
  } catch {
    return null;
  }
}
