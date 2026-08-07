/**
 * app/api/notes/[id]/route.ts — GET | PATCH | DELETE /api/notes/:id
 *
 * All handlers require authentication AND ownership verification.
 * If the note exists but belongs to a different user → 403 Forbidden.
 * If the note does not exist → 404 Not Found.
 *
 * ─── GET /api/notes/:id ──────────────────────────────────────────────────────
 * Returns a single note with its tags.
 *
 * Steps:
 * 1. Verify session (401 if missing).
 * 2. Fetch note by id from Prisma, include tags.
 * 3. Ownership check: note.userId === session.userId (403 if mismatch).
 * 4. Return 200 with note data.
 *
 * ─── PATCH /api/notes/:id ────────────────────────────────────────────────────
 * Partially updates a note (title, content, tags).
 *
 * Request body (JSON — all fields optional):
 *   { title?: string; content?: string; tagIds?: string[] }
 *
 * Steps:
 * 1. Verify session (401).
 * 2. Fetch note, ownership check (403/404).
 * 3. Validate body with `UpdateNoteSchema` from lib/validations.ts.
 * 4. Update via Prisma. If tagIds provided, replace the note's tags using
 *    `set: tagIds.map(id => ({ id }))` in the NoteTag relation.
 * 5. Return 200 with updated note.
 *
 * ─── DELETE /api/notes/:id ───────────────────────────────────────────────────
 * Permanently deletes a note and its NoteTag join records.
 *
 * Steps:
 * 1. Verify session (401).
 * 2. Fetch note, ownership check (403/404).
 * 3. Delete the note (cascade deletes NoteTag records if configured in schema).
 * 4. Return 204 No Content.
 *
 * TODO: Implement all three handlers.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';
import { UpdateNoteSchema } from '@/lib/validations';
import { extractImageIdsFromHtml } from '@/lib/imageUtils';
import { deleteImageFile } from '@/lib/imageStorage';

export const dynamic = 'force-dynamic';

const normalizeTagName = (name: string) => name.trim().toLowerCase();

type RouteContext = {
  params: { id: string };
};

export async function GET(request: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const note = await db.note.findFirst({
      where: {
        id: params.id,
        userId: session.userId,
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    if (!note) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const responseNote = {
      id: note.id,
      title: note.title,
      content: note.content || '',
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      userId: note.userId,
      tags: note.tags.map((nt) => nt.tag.name),
    };

    return NextResponse.json(responseNote, { status: 200 });
  } catch (error) {
    console.error(`GET /api/notes/${params.id} failed:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Confirm ownership
    const noteExists = await db.note.findFirst({
      where: {
        id: params.id,
        userId: session.userId,
      },
    });

    if (!noteExists) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const validationResult = UpdateNoteSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
    }

    const { title, content, tagNames } = validationResult.data;

    let removedImagePaths: string[] = [];
    const updatedNote = await db.$transaction(async (tx) => {
      if (tagNames !== undefined) {
        // Normalize tag names case-insensitively and dedupe before upsert.
        // This treats "Work" and "work" as the same tag.
        const cleanTagNames = Array.from(new Set(tagNames.map(normalizeTagName).filter(Boolean)));

        // Find or create tags scoped to user
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

        // Delete existing relations
        await tx.noteTag.deleteMany({
          where: {
            noteId: params.id,
          },
        });

        const uniqueTagIds = Array.from(new Set(tags.map((tag) => tag.id)));

        // Insert new relations
        if (uniqueTagIds.length > 0) {
          await tx.noteTag.createMany({
            data: uniqueTagIds.map((tagId) => ({
              noteId: params.id,
              tagId,
            })),
            skipDuplicates: true,
          });
        }
      }

      const existingImages = await tx.image.findMany({
        where: { noteId: params.id, userId: session.userId },
      });
      const existingImageIds = existingImages.map((image) => image.id);

      const note = await tx.note.update({
        where: { id: params.id },
        data: {
          ...(title !== undefined ? { title: title.trim() } : {}),
          ...(content !== undefined ? { content: content.trim() } : {}),
        },
      });

      if (content !== undefined) {
        const imageIds = extractImageIdsFromHtml(content || '');
        const uniqueImageIds = Array.from(new Set(imageIds));

        const removedImageIds = existingImageIds.filter((id) => !uniqueImageIds.includes(id));
        const addImageIds = uniqueImageIds.filter((id) => !existingImageIds.includes(id));

        if (removedImageIds.length > 0) {
          const removedImages = await tx.image.findMany({
            where: {
              id: { in: removedImageIds },
              userId: session.userId,
            },
            select: { storagePath: true },
          });

          removedImagePaths = removedImages.map((image) => image.storagePath);

          await tx.image.deleteMany({
            where: {
              id: { in: removedImageIds },
              userId: session.userId,
            },
          });
        }

        if (addImageIds.length > 0) {
          await tx.image.updateMany({
            where: { id: { in: addImageIds }, userId: session.userId },
            data: { noteId: note.id },
          });
        }
      }

      return tx.note.findUniqueOrThrow({
        where: { id: note.id },
        include: {
          tags: { include: { tag: true } },
        },
      });
    });

    for (const storagePath of removedImagePaths) {
      try {
        await deleteImageFile(storagePath);
      } catch (deleteError) {
        console.error('Failed to delete removed note image file:', deleteError);
      }
    }

    const responseNote = {
      id: updatedNote.id,
      title: updatedNote.title,
      content: updatedNote.content || '',
      createdAt: updatedNote.createdAt,
      updatedAt: updatedNote.updatedAt,
      userId: updatedNote.userId,
      tags: updatedNote.tags.map((nt) => nt.tag.name),
    };

    return NextResponse.json(responseNote, { status: 200 });
  } catch (error) {
    console.error(`PATCH /api/notes/${params.id} failed:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteContext,
): Promise<NextResponse> {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Confirm ownership
    const noteExists = await db.note.findFirst({
      where: {
        id: params.id,
        userId: session.userId,
      },
    });

    if (!noteExists) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Delete associated image files first
    const images = await db.image.findMany({ where: { noteId: params.id } });
    for (const img of images) {
      try {
        const { deleteImageFile } = await import('@/lib/imageStorage');
        await deleteImageFile(img.storagePath);
      } catch (err) {
        // ignore
      }
    }

    // Remove image records then delete the note in a transaction
    await db.$transaction(async (tx) => {
      await tx.image.deleteMany({ where: { noteId: params.id } });
      await tx.note.delete({ where: { id: params.id } });
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error(`DELETE /api/notes/${params.id} failed:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
