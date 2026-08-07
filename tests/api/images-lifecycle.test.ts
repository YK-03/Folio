/**
 * @vitest-environment node
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, signToken } from '@/lib/auth';
import { SESSION_COOKIE_NAME } from '@/lib/jwt';
import { POST as uploadImage } from '@/app/api/uploads/route';
import { GET as getImage, DELETE as deleteImage } from '@/app/api/uploads/[id]/route';
import { POST as createNote } from '@/app/api/notes/route';
import { PATCH as updateNote, DELETE as deleteNote } from '@/app/api/notes/[id]/route';

const uploadsDir = path.join(process.cwd(), 'storage', 'uploads');
const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;
const fixtureSuffix = randomUUID();
const fixtureEmails: [string, string] = [
  `image_user_a-${fixtureSuffix}@test.com`,
  `image_user_b-${fixtureSuffix}@test.com`,
];

describe('Image Lifecycle Integration Tests', () => {
  let userA: { id: string; email: string };
  let userB: { id: string; email: string };
  let tokenA: string;
  let tokenB: string;

  const buildCookie = (token: string) => `${SESSION_COOKIE_NAME}=${token}`;

  const cleanStorage = async () => {
    await fs.promises.rm(uploadsDir, { force: true, recursive: true });
  };

  const cleanupData = async () => {
    const users = await db.user.findMany({ where: { email: { in: fixtureEmails } } });
    const userIds = users.map((u) => u.id);

    if (userIds.length > 0) {
      await db.image.deleteMany({ where: { userId: { in: userIds } } });
      await db.note.deleteMany({ where: { userId: { in: userIds } } });
      await db.tag.deleteMany({ where: { userId: { in: userIds } } });
    }
  };

  const cleanupUsers = async () => {
    await db.user.deleteMany({ where: { email: { in: fixtureEmails } } });
  };

  const makeJsonRequest = (url: string, method: string, token?: string, body?: unknown) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers.cookie = buildCookie(token);
    }

    return new NextRequest(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null,
    });
  };

  const makeFormRequest = (url: string, token?: string, formData?: FormData) => {
    const headers: Record<string, string> = {};
    if (token) {
      headers.cookie = buildCookie(token);
    }

    return new NextRequest(url, {
      method: 'POST',
      headers,
      body: formData ?? null,
    });
  };

  const normalizeStoragePath = (storagePath: string) =>
    path.join(process.cwd(), storagePath.replace(/\\/g, '/'));

  beforeAll(async () => {
    const passwordHash = await hashPassword('imageLifecyclePass123');

    await cleanupUsers();
    await cleanupData();

    userA = await db.user.create({
      data: { email: fixtureEmails[0], passwordHash },
      select: { id: true, email: true },
    });

    userB = await db.user.create({
      data: { email: fixtureEmails[1], passwordHash },
      select: { id: true, email: true },
    });

    tokenA = await signToken({ userId: userA.id, email: userA.email });
    tokenB = await signToken({ userId: userB.id, email: userB.email });
  });

  beforeEach(async () => {
    await cleanupData();
    await cleanStorage();
  });

  afterAll(async () => {
    await cleanupData();
    await cleanupUsers();
    await cleanStorage();
  });

  const uploadDummyImage = async (
    token: string,
    fileName = 'test-image.png',
    type = 'image/png',
    size = 1024,
  ) => {
    const payload = new Uint8Array(size).fill(0);
    const file = new File([payload], fileName, { type });
    const formData = new FormData();
    formData.append('file', file);

    const req = makeFormRequest('http://localhost/api/uploads', token, formData);
    const res = await uploadImage(req);
    return { res, file };
  };

  it('upload auth: authenticated user can upload and receive protected url', async () => {
    const { res } = await uploadDummyImage(tokenA);

    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: string; url: string };
    expect(body.id).toBeDefined();
    expect(body.url).toBe(`/api/uploads/${body.id}`);

    const imageRecord = await db.image.findUnique({ where: { id: body.id } });
    expect(imageRecord).not.toBeNull();
    expect(imageRecord?.userId).toBe(userA.id);
    expect(imageRecord?.storagePath).toMatch(/storage[\\/]+uploads[\\/]+/);

    await expect(
      fs.promises.access(normalizeStoragePath(imageRecord!.storagePath)),
    ).resolves.toBeUndefined();
  });

  it('upload auth: unauthenticated upload returns 401', async () => {
    const payload = new Uint8Array(16).fill(0);
    const file = new File([payload], 'unauth.png', { type: 'image/png' });
    const formData = new FormData();
    formData.append('file', file);

    const req = makeFormRequest('http://localhost/api/uploads', undefined, formData);
    const res = await uploadImage(req);

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('Unauthorized');
  });

  it('upload auth: invalid file type is rejected', async () => {
    const payload = new TextEncoder().encode('not-an-image');
    const file = new File([payload], 'text.txt', { type: 'text/plain' });
    const formData = new FormData();
    formData.append('file', file);

    const req = makeFormRequest('http://localhost/api/uploads', tokenA, formData);
    const res = await uploadImage(req);

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('File must be an image');
  });

  it('upload auth: oversized file is rejected with 413', async () => {
    const payload = new Uint8Array(MAX_UPLOAD_SIZE + 1).fill(0);
    const file = new File([payload], 'big.png', { type: 'image/png' });
    const formData = new FormData();
    formData.append('file', file);

    const req = makeFormRequest('http://localhost/api/uploads', tokenA, formData);
    const res = await uploadImage(req);

    expect(res.status).toBe(413);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('File too large');
  });

  it('image ownership: user A can retrieve their image and user B gets 404', async () => {
    const { res: uploadRes } = await uploadDummyImage(tokenA);
    const uploadBody = (await uploadRes.json()) as { id: string; url: string };

    const reqA = new NextRequest(`http://localhost/api/uploads/${uploadBody.id}`, {
      method: 'GET',
      headers: { cookie: buildCookie(tokenA) },
    });
    const resA = await getImage(reqA, { params: { id: uploadBody.id } });
    expect(resA.status).toBe(200);
    expect(resA.headers.get('Content-Type')).toBe('image/png');

    const reqB = new NextRequest(`http://localhost/api/uploads/${uploadBody.id}`, {
      method: 'GET',
      headers: { cookie: buildCookie(tokenB) },
    });
    const resB = await getImage(reqB, { params: { id: uploadBody.id } });
    expect(resB.status).toBe(404);
    expect(((await resB.json()) as { error: string }).error).toBe('Not found');

    const reqUnauth = new NextRequest(`http://localhost/api/uploads/${uploadBody.id}`, {
      method: 'GET',
    });
    const resUnauth = await getImage(reqUnauth, { params: { id: uploadBody.id } });
    expect(resUnauth.status).toBe(401);
  });

  it('note association: referenced uploaded images are linked to the note', async () => {
    const firstUpload = await uploadDummyImage(tokenA, 'first.png');
    const secondUpload = await uploadDummyImage(tokenA, 'second.png');

    const first = (await firstUpload.res.json()) as { id: string; url: string };
    const second = (await secondUpload.res.json()) as { id: string; url: string };

    const noteContent = `<p><img src="${first.url}" alt="first" /><img src="${second.url}" alt="second" /></p>`;
    const req = makeJsonRequest('http://localhost/api/notes', 'POST', tokenA, {
      title: 'Note with images',
      content: noteContent,
      tagNames: ['todo'],
    });

    const res = await createNote(req);
    expect(res.status).toBe(201);

    const body = (await res.json()) as { id: string };
    const image1 = await db.image.findUnique({ where: { id: first.id } });
    const image2 = await db.image.findUnique({ where: { id: second.id } });

    expect(image1?.noteId).toBe(body.id);
    expect(image2?.noteId).toBe(body.id);
  });

  it('editing notes: adding, removing, and preserving image associations', async () => {
    const uploadedA = await uploadDummyImage(tokenA, 'a.png');
    const uploadedB = await uploadDummyImage(tokenA, 'b.png');
    const uploadedC = await uploadDummyImage(tokenA, 'c.png');

    const imageA = (await uploadedA.res.json()) as { id: string; url: string };
    const imageB = (await uploadedB.res.json()) as { id: string; url: string };
    const imageC = (await uploadedC.res.json()) as { id: string; url: string };

    const createReq = makeJsonRequest('http://localhost/api/notes', 'POST', tokenA, {
      title: 'Associations Test',
      content: `<img src="${imageA.url}" /><img src="${imageB.url}" />`,
      tagNames: ['images'],
    });
    const createRes = await createNote(createReq);
    expect(createRes.status).toBe(201);
    const note = (await createRes.json()) as { id: string };

    const imageARecord = await db.image.findUnique({ where: { id: imageA.id } });
    const imageBRecord = await db.image.findUnique({ where: { id: imageB.id } });
    const imageCRecord = await db.image.findUnique({ where: { id: imageC.id } });
    expect(imageARecord?.noteId).toBe(note.id);
    expect(imageBRecord?.noteId).toBe(note.id);
    expect(imageCRecord?.noteId).toBeNull();

    const removedImagePath = imageARecord!.storagePath;

    const updateReq = makeJsonRequest(`http://localhost/api/notes/${note.id}`, 'PATCH', tokenA, {
      content: `<img src="${imageB.url}" /><img src="${imageC.url}" />`,
    });
    const updateRes = await updateNote(updateReq, { params: { id: note.id } });
    expect(updateRes.status).toBe(200);

    const updatedA = await db.image.findUnique({ where: { id: imageA.id } });
    const updatedB = await db.image.findUnique({ where: { id: imageB.id } });
    const updatedC = await db.image.findUnique({ where: { id: imageC.id } });

    expect(updatedB?.noteId).toBe(note.id);
    expect(updatedC?.noteId).toBe(note.id);
    expect(updatedA).toBeNull();
    await expect(fs.promises.access(normalizeStoragePath(removedImagePath))).rejects.toThrow();

    const fileBExists = await fs.promises
      .access(normalizeStoragePath(updatedB!.storagePath))
      .then(() => true)
      .catch(() => false);
    const fileCExists = await fs.promises
      .access(normalizeStoragePath(updatedC!.storagePath))
      .then(() => true)
      .catch(() => false);
    expect(fileBExists).toBe(true);
    expect(fileCExists).toBe(true);
  });

  it('note deletion removes note, image DB records, and physical files', async () => {
    const uploadOne = await uploadDummyImage(tokenA, 'delete-one.png');
    const uploadTwo = await uploadDummyImage(tokenA, 'delete-two.png');

    const one = (await uploadOne.res.json()) as { id: string; url: string };
    const two = (await uploadTwo.res.json()) as { id: string; url: string };

    const createReq = makeJsonRequest('http://localhost/api/notes', 'POST', tokenA, {
      title: 'Delete Note',
      content: `<img src="${one.url}" /><img src="${two.url}" />`,
      tagNames: ['cleanup'],
    });
    const createRes = await createNote(createReq);
    expect(createRes.status).toBe(201);
    const note = (await createRes.json()) as { id: string };

    const imageOneBefore = await db.image.findUnique({ where: { id: one.id } });
    const imageTwoBefore = await db.image.findUnique({ where: { id: two.id } });
    expect(imageOneBefore).not.toBeNull();
    expect(imageTwoBefore).not.toBeNull();

    const deleteReq = new NextRequest(`http://localhost/api/notes/${note.id}`, {
      method: 'DELETE',
      headers: { cookie: buildCookie(tokenA) },
    });
    const deleteRes = await deleteNote(deleteReq, { params: { id: note.id } });
    expect(deleteRes.status).toBe(200);

    const noteInDb = await db.note.findUnique({ where: { id: note.id } });
    expect(noteInDb).toBeNull();

    const imageOne = await db.image.findUnique({ where: { id: one.id } });
    const imageTwo = await db.image.findUnique({ where: { id: two.id } });
    expect(imageOne).toBeNull();
    expect(imageTwo).toBeNull();

    await expect(
      fs.promises.access(normalizeStoragePath(imageOneBefore!.storagePath)),
    ).rejects.toThrow();
    await expect(
      fs.promises.access(normalizeStoragePath(imageTwoBefore!.storagePath)),
    ).rejects.toThrow();
  });

  it('cross-user safety: user B cannot access or attach user A images', async () => {
    const uploadRes = await uploadDummyImage(tokenA, 'private.png');
    const image = (await uploadRes.res.json()) as { id: string; url: string };

    const getReq = new NextRequest(`http://localhost/api/uploads/${image.id}`, {
      method: 'GET',
      headers: { cookie: buildCookie(tokenB) },
    });
    const getRes = await getImage(getReq, { params: { id: image.id } });
    expect(getRes.status).toBe(404);

    const deleteReq = new NextRequest(`http://localhost/api/uploads/${image.id}`, {
      method: 'DELETE',
      headers: { cookie: buildCookie(tokenB) },
    });
    const deleteRes = await deleteImage(deleteReq, { params: { id: image.id } });
    expect(deleteRes.status).toBe(404);

    const noteReq = makeJsonRequest('http://localhost/api/notes', 'POST', tokenB, {
      title: 'Attempt Attach',
      content: `<img src="${image.url}" />`,
      tagNames: ['hijack'],
    });
    const noteRes = await createNote(noteReq);
    expect(noteRes.status).toBe(201);

    const imageRecord = await db.image.findUnique({ where: { id: image.id } });
    expect(imageRecord?.noteId).toBeNull();
    expect(imageRecord?.userId).toBe(userA.id);
  });

  it('data integrity: invalid and nonexistent image IDs are ignored safely', async () => {
    const uploadRes = await uploadDummyImage(tokenA, 'valid.png');
    const image = (await uploadRes.res.json()) as { id: string; url: string };

    const fakeUrl = '/api/uploads/nonexistent-id';
    const noteReq = makeJsonRequest('http://localhost/api/notes', 'POST', tokenA, {
      title: 'Invalid Image ID',
      content: `<img src="${image.url}" /><img src="${fakeUrl}" />`,
      tagNames: ['validity'],
    });
    const noteRes = await createNote(noteReq);
    expect(noteRes.status).toBe(201);

    const imageRecord = await db.image.findUnique({ where: { id: image.id } });
    expect(imageRecord?.noteId).toBeDefined();
    expect(imageRecord?.noteId).not.toBeNull();
  });
});
