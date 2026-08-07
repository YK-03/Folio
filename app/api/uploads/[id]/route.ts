import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';
import { deleteImageFile } from '@/lib/imageStorage';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { id: string } };

export async function GET(
  request: NextRequest,
  { params }: RouteContext,
): Promise<Response> {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const image = await db.image.findUnique({
      where: { id: params.id },
    });

    if (!image) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (image.userId !== session.userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Image is stored in Vercel Blob.
    // User ownership has already been verified.
    return NextResponse.redirect(image.storagePath);
  } catch (error) {
    console.error(`GET /api/uploads/${params.id} failed:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
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

    const image = await db.image.findUnique({ where: { id: params.id } });
    if (!image || image.userId !== session.userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Delete file and DB record
    await deleteImageFile(image.storagePath);
    await db.image.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error(`DELETE /api/uploads/${params.id} failed:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
