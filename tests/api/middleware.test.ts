/**
 * @vitest-environment node
 */

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_key_for_testing_12345';

import { describe, it, expect, beforeAll } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from '@/middleware';
import { signToken } from '@/lib/auth';
import { SESSION_COOKIE_NAME } from '@/lib/jwt';

describe('Next.js Middleware Routing Tests', () => {
  let validToken: string;

  beforeAll(async () => {
    validToken = await signToken({ userId: 'user-123', email: 'test@example.com' });
  });

  const makeReq = (path: string, token?: string) => {
    const headers: Record<string, string> = {};
    if (token) {
      headers['cookie'] = `${SESSION_COOKIE_NAME}=${token}`;
    }
    return new NextRequest(`http://localhost${path}`, {
      headers,
    });
  };

  it('1. Unauthenticated -> /notes -> redirects to /login?from=%2Fnotes', async () => {
    const req = makeReq('/notes');
    const res = await middleware(req);
    expect(res.status).toBe(307); // NextResponse.redirect returns 307 Temporary Redirect by default
    expect(res.headers.get('location')).toBe('http://localhost/login?from=%2Fnotes');
  });

  it('2. Unauthenticated -> /notes/some-id -> redirects to /login?from=%2Fnotes%2Fsome-id', async () => {
    const req = makeReq('/notes/some-id');
    const res = await middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost/login?from=%2Fnotes%2Fsome-id');
  });

  it('3. Unauthenticated -> /login -> allows request to pass', async () => {
    const req = makeReq('/login');
    const res = await middleware(req);
    // NextResponse.next() returns a header indicating x-middleware-next
    expect(res.headers.get('x-middleware-next')).toBe('1');
  });

  it('4. Authenticated -> /login -> redirects to /notes', async () => {
    const req = makeReq('/login', validToken);
    const res = await middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost/notes');
  });

  it('5. Authenticated -> /signup -> redirects to /notes', async () => {
    const req = makeReq('/signup', validToken);
    const res = await middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost/notes');
  });

  it('6. Authenticated -> /notes -> allows request to pass', async () => {
    const req = makeReq('/notes', validToken);
    const res = await middleware(req);
    expect(res.headers.get('x-middleware-next')).toBe('1');
  });
});
