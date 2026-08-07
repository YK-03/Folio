/**
 * @vitest-environment node
 */

import { randomUUID } from 'crypto';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as signupRoute } from '@/app/api/auth/signup/route';
import { GET as getAvatarRoute, PATCH as updateAvatarRoute } from '@/app/api/auth/avatar/route';
import { db } from '@/lib/db';
import { SESSION_COOKIE_NAME } from '@/lib/jwt';

const prefix = `avatar-api-${randomUUID()}`;
const cleanupEmails: string[] = [];
const makeEmail = (label: string) => `${prefix}-${label}-${randomUUID()}@test.com`;
const buildCookie = (token: string) => `${SESSION_COOKIE_NAME}=${token}`;

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

const signup = async (email: string) => {
  const req = makeJsonRequest('http://localhost/api/auth/signup', 'POST', {
    email,
    password: 'Password123!',
  });

  return signupRoute(req);
};

describe('Avatar persistence API', () => {
  beforeEach(async () => {
    if (cleanupEmails.length > 0) {
      await db.user.deleteMany({
        where: {
          email: {
            in: cleanupEmails,
          },
        },
      });

      cleanupEmails.length = 0;
    }
  });

  afterAll(async () => {
    if (cleanupEmails.length > 0) {
      await db.user.deleteMany({
        where: {
          email: {
            in: cleanupEmails,
          },
        },
      });
    }
  });

  it('returns and updates the authenticated user avatar', async () => {
    const email = makeEmail('avatar');
    cleanupEmails.push(email);

    const signupResponse = await signup(email);
    expect(signupResponse.status).toBe(201);

    const setCookie = extractSetCookie(signupResponse);

    const cookieMatch = setCookie.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));

    expect(cookieMatch).not.toBeNull();

    const token = cookieMatch?.[1];

    expect(token).toBeDefined();

    const cookieHeader = buildCookie(token!);

    const initialResponse = await getAvatarRoute(
      makeJsonRequest('http://localhost/api/auth/avatar', 'GET', undefined, cookieHeader),
    );

    expect(initialResponse.status).toBe(200);
    expect(await initialResponse.json()).toMatchObject({
      avatarId: 'spider-man',
    });

    const updatedResponse = await updateAvatarRoute(
      makeJsonRequest(
        'http://localhost/api/auth/avatar',
        'PATCH',
        {
          avatarId: 'batman',
        },
        cookieHeader,
      ),
    );

    expect(updatedResponse.status).toBe(200);
    expect(await updatedResponse.json()).toMatchObject({
      avatarId: 'batman',
    });

    const user = await db.user.findUnique({
      where: {
        email,
      },
    });

    expect(user?.avatarId).toBe('batman');
  });
});
