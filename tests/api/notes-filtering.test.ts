/**
 * @vitest-environment node
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'crypto';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, signToken } from '@/lib/auth';
import { SESSION_COOKIE_NAME } from '@/lib/jwt';
import { GET as getNotes, POST as createNote } from '@/app/api/notes/route';

type NoteResponse = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  tags: string[];
};

const filteringFixtureEmail = `filtering_user_${randomUUID()}@test.com`;

describe('Notes Filtering and Sorting API Tests', () => {
  let user: { id: string; email: string };
  let token: string;

  const cleanUp = async () => {
    await db.user.deleteMany({
      where: {
        email: filteringFixtureEmail,
      },
    });
  };

  beforeAll(async () => {
    await cleanUp();

    const pwHash = await hashPassword('password123');
    user = await db.user.create({
      data: {
        email: filteringFixtureEmail,
        passwordHash: pwHash,
      },
    });

    token = await signToken({ userId: user.id, email: user.email });

    // Seed notes with deterministic intervals to test sorting
    const notesData = [
      { title: 'Alpha Note', content: 'This is the first note.', tags: ['work', 'ideas'] },
      { title: 'Beta Note', content: 'This is the second note.', tags: ['personal', 'ideas'] },
      { title: 'Gamma Note', content: 'Focused on code search.', tags: ['work', 'urgent'] },
    ];

    for (const note of notesData) {
      await db.$transaction(async (tx) => {
        const tags = await Promise.all(
          note.tags.map(async (name) => {
            return tx.tag.upsert({
              where: {
                userId_name: { userId: user.id, name },
              },
              create: { userId: user.id, name },
              update: {},
            });
          }),
        );

        await tx.note.create({
          data: {
            title: note.title,
            content: note.content,
            userId: user.id,
            tags: {
              create: tags.map((tag) => ({ tagId: tag.id })),
            },
          },
        });
      });
      // Sleep briefly to ensure distinct createdAt timestamps
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  });

  afterAll(async () => {
    await cleanUp();
  });

  const makeReq = (url: string, token: string) => {
    return new NextRequest(url, {
      method: 'GET',
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${token}`,
      },
    });
  };

  it('should list all notes for the authenticated user', async () => {
    const req = makeReq('http://localhost/api/notes', token);
    const res = await getNotes(req);
    expect(res.status).toBe(200);

    const data = (await res.json()) as NoteResponse[];
    expect(data.length).toBe(3);
  });

  it('should filter notes by title search (case-insensitive partial match)', async () => {
    // Exact search
    let req = makeReq('http://localhost/api/notes?search=Alpha', token);
    let res = await getNotes(req);
    let data = (await res.json()) as NoteResponse[];
    expect(data).toHaveLength(1);
    const [first] = data;
    expect(first).toBeDefined();
    expect(first?.title).toBe('Alpha Note');

    // Case-insensitive search
    req = makeReq('http://localhost/api/notes?search=beta', token);
    res = await getNotes(req);
    data = (await res.json()) as NoteResponse[];
    expect(data).toHaveLength(1);
    const [beta] = data;
    expect(beta).toBeDefined();
    expect(beta?.title).toBe('Beta Note');

    // Partial search
    req = makeReq('http://localhost/api/notes?search=Note', token);
    res = await getNotes(req);
    data = (await res.json()) as NoteResponse[];
    expect(data).toHaveLength(3);
  });

  it('should filter notes by single tag', async () => {
    const req = makeReq('http://localhost/api/notes?tag=work', token);
    const res = await getNotes(req);
    const data = (await res.json()) as NoteResponse[];
    expect(data.length).toBe(2);
    expect(data.map((n) => n.title)).toContain('Alpha Note');
    expect(data.map((n) => n.title)).toContain('Gamma Note');
  });

  it('should filter notes by multiple tags using strict AND logic', async () => {
    // Both 'work' AND 'ideas' -> matches only Alpha Note
    let req = makeReq('http://localhost/api/notes?tag=work&tag=ideas', token);
    let res = await getNotes(req);
    let data = await res.json();
    expect(data.length).toBe(1);
    expect(data[0].title).toBe('Alpha Note');

    // 'work' AND 'urgent' -> matches only Gamma Note
    req = makeReq('http://localhost/api/notes?tag=work&tag=urgent', token);
    res = await getNotes(req);
    data = await res.json();
    expect(data.length).toBe(1);
    expect(data[0].title).toBe('Gamma Note');

    // 'work' AND 'personal' -> matches zero notes
    req = makeReq('http://localhost/api/notes?tag=work&tag=personal', token);
    res = await getNotes(req);
    data = await res.json();
    expect(data.length).toBe(0);
  });

  it('should sort notes by newest first (default)', async () => {
    const req = makeReq('http://localhost/api/notes', token);
    const res = await getNotes(req);
    const data = await res.json();

    // Insertion order: Alpha, then Beta, then Gamma.
    // Newest first should be: Gamma, Beta, Alpha.
    expect(data[0].title).toBe('Gamma Note');
    expect(data[1].title).toBe('Beta Note');
    expect(data[2].title).toBe('Alpha Note');
  });

  it('should sort notes by oldest first when sort=oldest', async () => {
    const req = makeReq('http://localhost/api/notes?sort=oldest', token);
    const res = await getNotes(req);
    const data = await res.json();

    // Oldest first: Alpha, Beta, Gamma.
    expect(data[0].title).toBe('Alpha Note');
    expect(data[1].title).toBe('Beta Note');
    expect(data[2].title).toBe('Gamma Note');
  });

  it('should create a note with duplicate and case-variant tags without error', async () => {
    const body = {
      title: 'Duplicate Tag Note',
      content: 'Testing duplicates',
      tagNames: ['Work', 'work', 'WORK', 'ideas', 'ideas'],
    };

    const req = new NextRequest('http://localhost/api/notes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: `${SESSION_COOKIE_NAME}=${token}`,
      },
      body: JSON.stringify(body),
    });

    const res = await createNote(req);
    expect(res.status).toBe(201);

    const note = (await res.json()) as NoteResponse;
    expect(note.tags.sort()).toEqual(['ideas', 'work']);
  });
});
