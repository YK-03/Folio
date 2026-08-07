import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';
import { NoteQuerySchema, CreateNoteSchema } from '@/lib/validations';
import { extractImageIdsFromHtml } from '@/lib/imageUtils';

export const dynamic = 'force-dynamic';

const normalizeTagName = (name: string) => name.trim().toLowerCase();

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const search = searchParams.get('search') || undefined;
    const sort = searchParams.get('sort') || undefined;
    const tag = searchParams.has('tag') ? searchParams.getAll('tag') : undefined;

    const queryResult = NoteQuerySchema.safeParse({ search, tag, sort });
    if (!queryResult.success) {
      return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 });
    }

    const { search: parsedSearch, tag: parsedTags, sort: parsedSort } = queryResult.data;

    // Filter notes that have ALL specified tags (AND logic)
    const tagFilter =
      parsedTags && parsedTags.length > 0
        ? {
            AND: parsedTags.map((tagName) => ({
              tags: {
                some: {
                  tag: {
                    name: {
                      equals: tagName,
                      mode: 'insensitive' as const,
                    },
                  },
                },
              },
            })),
          }
        : {};

    const notes = await db.note.findMany({
      where: {
        userId: session.userId,
        ...(parsedSearch
          ? {
              title: {
                contains: parsedSearch,
                mode: 'insensitive' as const,
              },
            }
          : {}),
        ...tagFilter,
      },
      orderBy: {
        createdAt: parsedSort === 'oldest' ? 'asc' : 'desc',
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    const responseNotes = notes.map((note) => ({
      id: note.id,
      title: note.title,
      content: note.content || '',
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      userId: note.userId,
      tags: note.tags.map((nt) => nt.tag.name),
    }));

    return NextResponse.json(responseNotes, { status: 200 });
  } catch (error) {
    console.error('GET /api/notes failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const validationResult = CreateNoteSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
    }

    const { title, content, tagNames } = validationResult.data;

    // Normalize tag names case-insensitively and dedupe before upsert.
    // This treats "Work" and "work" as the same tag.
    const cleanTagNames = Array.from(new Set(tagNames.map(normalizeTagName).filter(Boolean)));

    const createdNote = await db.$transaction(async (tx) => {
      // 1. Find or create all tags scoped to the user
      const tags = await Promise.all(
        cleanTagNames.map(async (name) => {
          return tx.tag.upsert({
            where: {
              userId_name: {
                userId: session.userId,
                name,
              },
            },
            create: {
              userId: session.userId,
              name,
            },
            update: {},
          });
        }),
      );

      const uniqueTagIds = Array.from(new Set(tags.map((tag) => tag.id)));

      // 2. Create the note and link to the tags
      const note = await tx.note.create({
        data: {
          title: title.trim(),
          content: content.trim(),
          userId: session.userId,
        },
      });

      if (uniqueTagIds.length > 0) {
        await tx.noteTag.createMany({
          data: uniqueTagIds.map((tagId) => ({
            noteId: note.id,
            tagId,
          })),
          skipDuplicates: true,
        });
      }

      // Associate any uploaded images referenced in the content with this note
      const imageIds = extractImageIdsFromHtml(content || '');
      if (imageIds.length > 0) {
        await tx.image.updateMany({
          where: { id: { in: imageIds }, userId: session.userId },
          data: { noteId: note.id },
        });
      }

      return tx.note.findUniqueOrThrow({
        where: { id: note.id },
        include: {
          tags: {
            include: {
              tag: true,
            },
          },
        },
      });
    });

    const responseNote = {
      id: createdNote.id,
      title: createdNote.title,
      content: createdNote.content || '',
      createdAt: createdNote.createdAt,
      updatedAt: createdNote.updatedAt,
      userId: createdNote.userId,
      tags: createdNote.tags.map((nt) => nt.tag.name),
    };

    return NextResponse.json(responseNote, { status: 201 });
  } catch (error) {
    console.error('POST /api/notes failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
