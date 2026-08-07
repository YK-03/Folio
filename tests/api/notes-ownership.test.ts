/**
 * @vitest-environment node
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { randomUUID } from 'crypto';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, signToken } from '@/lib/auth';
import { SESSION_COOKIE_NAME } from '@/lib/jwt';
import {
  GET as getNote,
  PATCH as patchNote,
  DELETE as deleteNote,
} from '@/app/api/notes/[id]/route';

type NoteResponse = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  tags: string[];
};

const fixtureSuffix = randomUUID();
const fixtureEmails: [string, string] = [
  `security-user-a-${fixtureSuffix}@test.com`,
  `security-user-b-${fixtureSuffix}@test.com`,
];

describe('Note Ownership & Isolation Security Proofs', () => {
  // Test user representations
  let userA: { id: string; email: string };
  let userB: { id: string; email: string };

  // Auth tokens
  let tokenA: string;
  let tokenB: string;

  // Track the ID of the fresh note created before each test case
  let noteAId: string;

  // Cleanup helper
  const cleanDatabase = async () => {
    // Delete test users (cascade constraints will remove notes, tags, and note-tags)
    await db.user.deleteMany({
      where: {
        email: { in: fixtureEmails },
      },
    });
  };

  type TestRequestBody = { title?: string; content?: string; tagNames?: string[] };

  // Helper to build a mock Next.js NextRequest
  const makeRequest = (url: string, method: string, token: string, body?: TestRequestBody) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      cookie: `${SESSION_COOKIE_NAME}=${token}`,
    };
    return new NextRequest(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null,
    });
  };

  // Helper to retrieve note from DB directly (bypass API)
  const fetchNoteFromDb = async (id: string) => {
    return db.note.findUnique({
      where: { id },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });
  };

  beforeAll(async () => {
    // Clean potential leftover records
    await cleanDatabase();

    const pwHash = await hashPassword('securePassword123');

    // Create User A and User B
    userA = await db.user.create({
      data: {
        email: fixtureEmails[0],
        passwordHash: pwHash,
      },
      select: { id: true, email: true },
    });

    userB = await db.user.create({
      data: {
        email: fixtureEmails[1],
        passwordHash: pwHash,
      },
      select: { id: true, email: true },
    });

    // Sign in both users
    tokenA = await signToken({ userId: userA.id, email: userA.email });
    tokenB = await signToken({ userId: userB.id, email: userB.email });
  });

  afterAll(async () => {
    // Final database cleanup
    await cleanDatabase();
  });

  beforeEach(async () => {
    // Clear existing notes for User A to isolate tests
    if (userA?.id) {
      await db.note.deleteMany({
        where: { userId: userA.id },
      });
    }

    // Create a fresh note owned by User A to use for the current test case
    const tag = await db.tag.upsert({
      where: {
        userId_name: { userId: userA.id, name: 'secret' },
      },
      create: { userId: userA.id, name: 'secret' },
      update: {},
    });

    const note = await db.note.create({
      data: {
        title: 'Original Title',
        content: 'Original Content',
        userId: userA.id,
        tags: {
          create: {
            tagId: tag.id,
          },
        },
      },
    });

    noteAId = note.id;
  });

  // --- SECURITY TEST CASES ---

  it("1. GET: User B must get a 404 and no details when reading User A's note", async () => {
    const req = makeRequest(`http://localhost/api/notes/${noteAId}`, 'GET', tokenB);
    const res = await getNote(req, { params: { id: noteAId } });

    // Expect 404, not 403, to avoid leaking existence
    expect(res.status).toBe(404);

    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('Not found');
    expect((body as { title?: string }).title).toBeUndefined();
  });

  it('2. PATCH: User B must get a 404 and the note in DB must remain unchanged', async () => {
    const req = makeRequest(`http://localhost/api/notes/${noteAId}`, 'PATCH', tokenB, {
      title: 'Hacked Title',
      content: 'Hacked Content',
      tagNames: ['hacked-tag'],
    });

    const res = await patchNote(req, { params: { id: noteAId } });
    expect(res.status).toBe(404);

    // Verify DB state directly - no changes should be persisted
    const noteInDb = await fetchNoteFromDb(noteAId);
    expect(noteInDb).not.toBeNull();
    expect(noteInDb?.title).toBe('Original Title');
    expect(noteInDb?.content).toBe('Original Content');

    const tags = noteInDb?.tags.map((nt) => nt.tag.name) || [];
    expect(tags).toContain('secret');
    expect(tags).not.toContain('hacked-tag');
  });

  it('3. DELETE: User B must get a 404 and the note in DB must NOT be removed', async () => {
    const req = makeRequest(`http://localhost/api/notes/${noteAId}`, 'DELETE', tokenB);
    const res = await deleteNote(req, { params: { id: noteAId } });

    expect(res.status).toBe(404);

    // Verify DB state directly - note must still exist
    const noteInDb = await fetchNoteFromDb(noteAId);
    expect(noteInDb).not.toBeNull();
    expect(noteInDb?.title).toBe('Original Title');
  });

  // --- POSITIVE CONTROLS (USER A AUTHORIZED ACCESS) ---

  it('4. Positive Control - GET: User A can successfully retrieve their own note', async () => {
    const req = makeRequest(`http://localhost/api/notes/${noteAId}`, 'GET', tokenA);
    const res = await getNote(req, { params: { id: noteAId } });

    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.id).toBe(noteAId);
    expect(body.title).toBe('Original Title');
    expect(body.content).toBe('Original Content');
    expect(body.tags).toContain('secret');
  });

  it('5. Positive Control - PATCH: User A can successfully update their own note and see updates in DB', async () => {
    const req = makeRequest(`http://localhost/api/notes/${noteAId}`, 'PATCH', tokenA, {
      title: 'Updated Title',
      content: 'Updated Content',
      tagNames: ['updated-tag'],
    });

    const res = await patchNote(req, { params: { id: noteAId } });
    expect(res.status).toBe(200);

    // Verify DB state directly
    const noteInDb = await fetchNoteFromDb(noteAId);
    expect(noteInDb).not.toBeNull();
    expect(noteInDb?.title).toBe('Updated Title');
    expect(noteInDb?.content).toBe('Updated Content');

    const tags = noteInDb?.tags.map((nt) => nt.tag.name) || [];
    expect(tags).toContain('updated-tag');
    expect(tags).not.toContain('secret');
  });

  it('5a. Positive Control - PATCH: duplicate and casing-variant tag names do not create duplicates', async () => {
    const req = makeRequest(`http://localhost/api/notes/${noteAId}`, 'PATCH', tokenA, {
      tagNames: ['Work', 'work', 'WORK', 'secret', 'secret'],
    });

    const res = await patchNote(req, { params: { id: noteAId } });
    expect(res.status).toBe(200);

    const noteInDb = await fetchNoteFromDb(noteAId);
    expect(noteInDb).not.toBeNull();
    const tags = noteInDb?.tags.map((nt) => nt.tag.name).sort() || [];
    expect(tags).toEqual(['secret', 'work']);
    expect(tags.filter((name) => name === 'work')).toHaveLength(1);
  });

  it('6. Positive Control - DELETE: User A can successfully delete their own note and remove it from DB', async () => {
    const req = makeRequest(`http://localhost/api/notes/${noteAId}`, 'DELETE', tokenA);
    const res = await deleteNote(req, { params: { id: noteAId } });

    expect(res.status).toBe(200);

    // Verify DB state directly - note must be fully removed
    const noteInDb = await fetchNoteFromDb(noteAId);
    expect(noteInDb).toBeNull();
  });
});
