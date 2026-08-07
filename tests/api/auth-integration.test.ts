/**
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { randomUUID } from 'crypto';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { SESSION_COOKIE_NAME } from '@/lib/jwt';
import { POST as signupRoute } from '@/app/api/auth/signup/route';
import { POST as signinRoute } from '@/app/api/auth/signin/route';
import { POST as signoutRoute } from '@/app/api/auth/signout/route';
import { GET as getNotesRoute } from '@/app/api/notes/route';

const authFixturePrefix = `auth-integration-${randomUUID()}`;

const makeEmail = (label: string) => `${label}-${randomUUID()}@test.com`;

const buildCookie = (token: string) => `${SESSION_COOKIE_NAME}=${token}`;

const cleanupEmails: string[] = [];

const registerEmail = (email: string) => {
  cleanupEmails.push(email);
  return email;
};

const cleanupUsers = async () => {
  if (cleanupEmails.length === 0) return;
  await db.user.deleteMany({ where: { email: { in: cleanupEmails } } });
  cleanupEmails.length = 0;
};

const makeJsonRequest = (url: string, method: string, body?: unknown, cookie?: string) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (cookie) headers.cookie = cookie;

  return new NextRequest(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });
};

const extractSetCookie = (response: Response) =>
  response.headers.get('set-cookie') || response.headers.get('Set-Cookie') || '';

const signup = async (email: string, password: string) => {
  const req = makeJsonRequest('http://localhost/api/auth/signup', 'POST', { email, password });
  return signupRoute(req);
};

const signin = async (email: string, password: string) => {
  const req = makeJsonRequest('http://localhost/api/auth/signin', 'POST', { email, password });
  return signinRoute(req);
};

describe('Authentication API Integration Tests', () => {
  beforeEach(async () => {
    await cleanupUsers();
  });

  afterAll(async () => {
    await cleanupUsers();
  });

  it('1. POST /api/auth/signup successfully registers a new user and hashes the password', async () => {
    const email = registerEmail(makeEmail('signup'));
    const password = 'Password123!';

    const response = await signup(email, password);
    expect(response.status).toBe(201);

    const body = await response.json();
    expect(body).toHaveProperty('user');
    expect(body.user).toMatchObject({ email });
    expect(body.user).not.toHaveProperty('passwordHash');
    expect(body.user).not.toHaveProperty('token');

    const setCookie = extractSetCookie(response);
    expect(setCookie).toContain(`${SESSION_COOKIE_NAME}=`);
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie.toLowerCase()).toContain('samesite=lax');
    expect(setCookie).toContain('Path=/');
    expect(setCookie).not.toContain('Secure');

    const userCount = await db.user.count({ where: { email } });
    expect(userCount).toBe(1);

    const user = await db.user.findUnique({ where: { email } });
    expect(user).not.toBeNull();
    expect(user?.passwordHash).toBeDefined();
    expect(user?.passwordHash).not.toBe(password);
  });

  it('2. POST /api/auth/signup rejects duplicate email', async () => {
    const email = registerEmail(makeEmail('signup-duplicate'));
    const password = 'Password123!';

    const first = await signup(email, password);
    expect(first.status).toBe(201);

    const second = await signup(email, password);
    expect(second.status).toBe(409);

    const body = await second.json();
    expect(body).toMatchObject({ error: 'An account with this email already exists' });

    const userCount = await db.user.count({ where: { email } });
    expect(userCount).toBe(1);
  });

  it('3. POST /api/auth/signup rejects malformed email payload', async () => {
    const email = registerEmail(makeEmail('signup-bad-email'));
    const response = await signup('invalid-email', 'password123');
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Invalid signup details');
  });

  it('4. POST /api/auth/signup rejects weak password payload', async () => {
    const email = registerEmail(makeEmail('signup-weak-pass'));
    const response = await signup(email, 'short');
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Invalid signup details');

    const userCount = await db.user.count({ where: { email } });
    expect(userCount).toBe(0);
  });

  it('5. POST /api/auth/signin returns success and issues a session cookie for valid credentials', async () => {
    const email = registerEmail(makeEmail('signin-valid'));
    const password = 'Password123!';

    const signedUp = await signup(email, password);
    expect(signedUp.status).toBe(201);

    const response = await signin(email, password);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.user).toMatchObject({ email });
    expect(body.user).not.toHaveProperty('passwordHash');

    const setCookie = extractSetCookie(response);
    expect(setCookie).toContain(`${SESSION_COOKIE_NAME}=`);
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie.toLowerCase()).toContain('samesite=lax');
    expect(setCookie).toContain('Path=/');
    expect(setCookie).not.toContain('Secure');
  });

  it('6. POST /api/auth/signin rejects incorrect password', async () => {
    const email = registerEmail(makeEmail('signin-bad-password'));
    const password = 'Password123!';
    await signup(email, password);

    const response = await signin(email, 'WrongPassword!');
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Invalid email or password');
  });

  it('7. POST /api/auth/signin rejects unknown email', async () => {
    const email = registerEmail(makeEmail('signin-unknown'));
    const response = await signin(email, 'Password123!');
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Invalid email or password');
  });

  it('8. POST /api/auth/signin rejects malformed payload', async () => {
    const req = makeJsonRequest('http://localhost/api/auth/signin', 'POST', {
      email: 'not-an-email',
      password: 'pass',
    });
    const response = await signinRoute(req);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Invalid email or password');
  });

  it('9. Authenticated session request succeeds, unauthenticated request fails', async () => {
    const email = registerEmail(makeEmail('session-valid'));
    const password = 'Password123!';
    await signup(email, password);

    const loginResponse = await signin(email, password);
    expect(loginResponse.status).toBe(200);
    const cookieHeader = extractSetCookie(loginResponse);
    expect(cookieHeader).toContain(`${SESSION_COOKIE_NAME}=`);

    const authReq = makeJsonRequest('http://localhost/api/notes', 'GET', undefined, cookieHeader);
    const authRes = await getNotesRoute(authReq);
    expect(authRes.status).toBe(200);

    const unauthReq = makeJsonRequest('http://localhost/api/notes', 'GET');
    const unauthRes = await getNotesRoute(unauthReq);
    expect(unauthRes.status).toBe(401);
  });

  it('10. POST /api/auth/signout clears the session cookie and invalidates access', async () => {
    const email = registerEmail(makeEmail('signout-valid'));
    const password = 'Password123!';
    await signup(email, password);

    const loginResponse = await signin(email, password);
    const cookieHeader = extractSetCookie(loginResponse);

    const logoutRes = await signoutRoute();
    expect(logoutRes.status).toBe(200);
    const logoutCookie = extractSetCookie(logoutRes);
    expect(logoutCookie).toContain(`${SESSION_COOKIE_NAME}=`);
    expect(logoutCookie).toContain('Max-Age=0');

    const authReq = makeJsonRequest('http://localhost/api/notes', 'GET', undefined, logoutCookie);
    const authRes = await getNotesRoute(authReq);
    expect(authRes.status).toBe(401);

    const repeatLogout = await signoutRoute();
    expect(repeatLogout.status).toBe(200);
  });
});
