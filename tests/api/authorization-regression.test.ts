/**
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { randomUUID } from 'crypto';
import { SignJWT } from 'jose';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, signToken } from '@/lib/auth';
import { getJwtSecret, SESSION_COOKIE_NAME } from '@/lib/jwt';
import { GET as getNotesRoute, POST as createNoteRoute } from '@/app/api/notes/route';
import {
  GET as getNoteRoute,
  PATCH as patchNoteRoute,
  DELETE as deleteNoteRoute,
} from '@/app/api/notes/[id]/route';
import { GET as getUploadRoute } from '@/app/api/uploads/[id]/route';
import { POST as uploadImageRoute } from '@/app/api/uploads/route';

type AuthContext = {
  email: string;
  password: string;
  token: string;
  userId: string;
};

const fixturePrefix = `auth-regression-${randomUUID()}`;
const fixtureEmails: string[] = [];

const registerEmail = (label: string) => {
  const email = `${label}-${randomUUID()}@test.com`;
  fixtureEmails.push(email);
  return email;
};

const cleanupFixtures = async () => {
  if (fixtureEmails.length === 0) return;
  const users = await db.user.findMany({ where: { email: { in: fixtureEmails } } });
  const userIds = users.map((user) => user.id);
  if (userIds.length === 0) {
    fixtureEmails.length = 0;
    return;
  }

  await db.image.deleteMany({ where: { userId: { in: userIds } } });
  await db.note.deleteMany({ where: { userId: { in: userIds } } });
  await db.tag.deleteMany({ where: { userId: { in: userIds } } });
  await db.user.deleteMany({ where: { id: { in: userIds } } });
  fixtureEmails.length = 0;
};

const makeRequest = (url: string, method: string, body?: unknown, cookie?: string) => {
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

const makeFormRequest = (url: string, token?: string, formData?: FormData) => {
  const headers: Record<string, string> = {};
  if (token) headers.cookie = `${SESSION_COOKIE_NAME}=${token}`;

  return new NextRequest(url, {
    method: 'POST',
    headers,
    body: formData ?? null,
  });
};

const buildCookie = (token: string) => `${SESSION_COOKIE_NAME}=${token}`;

const createAuthContext = async (): Promise<AuthContext> => {
  const email = registerEmail('auth-regression');
  const password = 'Password123!';
  const passwordHash = await hashPassword(password);
  const user = await db.user.create({
    data: { email, passwordHash },
    select: { id: true, email: true },
  });
  const token = await signToken({ userId: user.id, email: user.email });
  return { email, password, token, userId: user.id };
};

const createExpiredToken = async (userId: string, email: string) => {
  return new SignJWT({ userId, email })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime('-1s')
    .sign(getJwtSecret());
};

const createProtectedNote = async (token: string) => {
  const response = await createNoteRoute(
    makeRequest(
      'http://localhost/api/notes',
      'POST',
      {
        title: 'Protected Note',
        content: 'Secret content',
        tagNames: ['secure'],
      },
      buildCookie(token),
    ),
  );
  expect(response.status).toBe(201);
  return response.json();
};

const createProtectedImage = async (token: string) => {
  const payload = new Uint8Array(32).fill(1);
  const file = new File([payload], 'protected.png', { type: 'image/png' });
  const formData = new FormData();
  formData.append('file', file);
  const req = makeFormRequest('http://localhost/api/uploads', token, formData);
  const response = await uploadImageRoute(req);
  expect(response.status).toBe(201);
  return response.json() as Promise<{ id: string; url: string }>;
};

describe('Authorization Regression Tests', () => {
  beforeEach(async () => {
    await cleanupFixtures();
  });

  afterAll(async () => {
    await cleanupFixtures();
  });

  it('1. No session cookie returns 401 for all protected endpoints', async () => {
    const context = await createAuthContext();
    const note = await createProtectedNote(context.token);
    const noteId = (await note).id;

    const notesRes = await getNotesRoute(makeRequest('http://localhost/api/notes', 'GET'));
    expect(notesRes.status).toBe(401);
    expect((await notesRes.json()).error).toBe('Unauthorized');

    const createRes = await createNoteRoute(
      makeRequest('http://localhost/api/notes', 'POST', {
        title: 'Should fail',
        content: 'Nope',
      }),
    );
    expect(createRes.status).toBe(401);
    expect((await createRes.json()).error).toBe('Unauthorized');

    const patchRes = await patchNoteRoute(
      makeRequest(`http://localhost/api/notes/${noteId}`, 'PATCH', {
        title: 'Hijacked',
      }),
      { params: { id: noteId } },
    );
    expect(patchRes.status).toBe(401);
    expect((await patchRes.json()).error).toBe('Unauthorized');

    const deleteRes = await deleteNoteRoute(
      makeRequest(`http://localhost/api/notes/${noteId}`, 'DELETE'),
      { params: { id: noteId } },
    );
    expect(deleteRes.status).toBe(401);
    expect((await deleteRes.json()).error).toBe('Unauthorized');

    const image = await createProtectedImage(context.token);
    const uploadRes = await getUploadRoute(
      new NextRequest(`http://localhost/api/uploads/${image.id}`, { method: 'GET' }),
      { params: { id: image.id } },
    );
    expect(uploadRes.status).toBe(401);
    expect((await uploadRes.json()).error).toBe('Unauthorized');
  });

  it('2. Invalid or tampered cookies return 401 for all protected endpoints', async () => {
    const context = await createAuthContext();
    const note = await createProtectedNote(context.token);
    const noteId = (await note).id;

    const invalidCookie = buildCookie('tampered-token');

    const notesRes = await getNotesRoute(
      makeRequest('http://localhost/api/notes', 'GET', undefined, invalidCookie),
    );
    expect(notesRes.status).toBe(401);
    expect((await notesRes.json()).error).toBe('Unauthorized');

    const createRes = await createNoteRoute(
      makeRequest(
        'http://localhost/api/notes',
        'POST',
        {
          title: 'Should fail',
          content: 'Nope',
        },
        invalidCookie,
      ),
    );
    expect(createRes.status).toBe(401);
    expect((await createRes.json()).error).toBe('Unauthorized');

    const patchRes = await patchNoteRoute(
      makeRequest(
        `http://localhost/api/notes/${noteId}`,
        'PATCH',
        {
          title: 'Hijacked',
        },
        invalidCookie,
      ),
      { params: { id: noteId } },
    );
    expect(patchRes.status).toBe(401);
    expect((await patchRes.json()).error).toBe('Unauthorized');

    const deleteRes = await deleteNoteRoute(
      makeRequest(`http://localhost/api/notes/${noteId}`, 'DELETE', undefined, invalidCookie),
      { params: { id: noteId } },
    );
    expect(deleteRes.status).toBe(401);
    expect((await deleteRes.json()).error).toBe('Unauthorized');

    const image = await createProtectedImage(context.token);
    const uploadRes = await getUploadRoute(
      new NextRequest(`http://localhost/api/uploads/${image.id}`, {
        method: 'GET',
        headers: { cookie: invalidCookie },
      }),
      { params: { id: image.id } },
    );
    expect(uploadRes.status).toBe(401);
    expect((await uploadRes.json()).error).toBe('Unauthorized');
  });

  it('3. Expired cookies return 401 for all protected endpoints', async () => {
    const context = await createAuthContext();
    const note = await createProtectedNote(context.token);
    const noteId = (await note).id;
    const expiredToken = await createExpiredToken(context.userId, context.email);
    const expiredCookie = buildCookie(expiredToken);

    const notesRes = await getNotesRoute(
      makeRequest('http://localhost/api/notes', 'GET', undefined, expiredCookie),
    );
    expect(notesRes.status).toBe(401);
    expect((await notesRes.json()).error).toBe('Unauthorized');

    const createRes = await createNoteRoute(
      makeRequest(
        'http://localhost/api/notes',
        'POST',
        {
          title: 'Should fail',
          content: 'Nope',
        },
        expiredCookie,
      ),
    );
    expect(createRes.status).toBe(401);
    expect((await createRes.json()).error).toBe('Unauthorized');

    const patchRes = await patchNoteRoute(
      makeRequest(
        `http://localhost/api/notes/${noteId}`,
        'PATCH',
        {
          title: 'Hijacked',
        },
        expiredCookie,
      ),
      { params: { id: noteId } },
    );
    expect(patchRes.status).toBe(401);
    expect((await patchRes.json()).error).toBe('Unauthorized');

    const deleteRes = await deleteNoteRoute(
      makeRequest(`http://localhost/api/notes/${noteId}`, 'DELETE', undefined, expiredCookie),
      { params: { id: noteId } },
    );
    expect(deleteRes.status).toBe(401);
    expect((await deleteRes.json()).error).toBe('Unauthorized');

    const image = await createProtectedImage(context.token);
    const uploadRes = await getUploadRoute(
      new NextRequest(`http://localhost/api/uploads/${image.id}`, {
        method: 'GET',
        headers: { cookie: expiredCookie },
      }),
      { params: { id: image.id } },
    );
    expect(uploadRes.status).toBe(401);
    expect((await uploadRes.json()).error).toBe('Unauthorized');
  });

  it('4. Valid cookies allow protected endpoints to succeed', async () => {
    const context = await createAuthContext();
    const note = await createProtectedNote(context.token);
    const noteId = (await note).id;

    const notesRes = await getNotesRoute(
      makeRequest('http://localhost/api/notes', 'GET', undefined, buildCookie(context.token)),
    );
    expect(notesRes.status).toBe(200);
    const notesBody = await notesRes.json();
    expect(Array.isArray(notesBody)).toBe(true);
    expect(notesBody.some((item: { id: string }) => item.id === noteId)).toBe(true);

    const createRes = await createNoteRoute(
      makeRequest(
        'http://localhost/api/notes',
        'POST',
        {
          title: 'Second note',
          content: 'Visible content',
        },
        buildCookie(context.token),
      ),
    );
    expect(createRes.status).toBe(201);
    const createdBody = await createRes.json();
    expect(createdBody.title).toBe('Second note');

    const patchRes = await patchNoteRoute(
      makeRequest(
        `http://localhost/api/notes/${noteId}`,
        'PATCH',
        {
          title: 'Updated title',
        },
        buildCookie(context.token),
      ),
      { params: { id: noteId } },
    );
    expect(patchRes.status).toBe(200);
    const patchBody = await patchRes.json();
    expect(patchBody.title).toBe('Updated title');

    const deleteRes = await deleteNoteRoute(
      makeRequest(
        `http://localhost/api/notes/${noteId}`,
        'DELETE',
        undefined,
        buildCookie(context.token),
      ),
      { params: { id: noteId } },
    );
    expect(deleteRes.status).toBe(200);
    const deleteBody = await deleteRes.json();
    expect(deleteBody.success).toBe(true);

    const image = await createProtectedImage(context.token);
    const uploadRes = await getUploadRoute(
      new NextRequest(`http://localhost/api/uploads/${image.id}`, {
        method: 'GET',
        headers: { cookie: buildCookie(context.token) },
      }),
      { params: { id: image.id } },
    );
    expect(uploadRes.status).toBe(200);
    expect(uploadRes.headers.get('Content-Type')).toBe('image/png');
  });
});
