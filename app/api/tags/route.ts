/**
 * app/api/tags/route.ts — GET /api/tags  |  POST /api/tags
 *
 * ─── GET /api/tags ───────────────────────────────────────────────────────────
 * Returns all tags belonging to the authenticated user, optionally with
 * a count of how many notes use each tag.
 *
 * Query parameters:
 *   withCount — boolean (default false): include _count.notes on each tag
 *
 * Steps:
 * 1. Verify session (401).
 * 2. Fetch tags from Prisma filtered by userId, ordered by name.
 * 3. If withCount=true, include `_count: { select: { notes: true } }`.
 * 4. Return 200 with tags array.
 *
 * ─── POST /api/tags ──────────────────────────────────────────────────────────
 * Creates a new tag for the authenticated user.
 *
 * Request body: { name: string }
 *
 * Steps:
 * 1. Verify session (401).
 * 2. Validate body with `CreateTagSchema` from lib/validations.ts.
 * 3. Check for duplicate tag name for this user (409 if duplicate).
 * 4. Create tag via Prisma.
 * 5. Return 201 with new tag.
 *
 * TODO: Implement both handlers.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Support optional ?withCount=true to include _count.notes
    const url = new URL(request.url);
    const withCount = url.searchParams.get('withCount') === 'true';

    // Only return tags that are currently associated with at least one note
    // This prevents orphaned tags (no notes referencing them) from appearing
    // in the filter UI and keeps the filters derived from the database
    const tags = await db.tag.findMany({
      where: {
        userId: session.userId,
        notes: { some: {} },
      },
      orderBy: {
        name: 'asc',
      },
      select: withCount
        ? {
            id: true,
            name: true,
            _count: {
              select: { notes: true },
            },
          }
        : {
            id: true,
            name: true,
          },
    });

    return NextResponse.json(tags, { status: 200 });
  } catch (error) {
    console.error('GET /api/tags failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
