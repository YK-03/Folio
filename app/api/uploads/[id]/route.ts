import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';
import { deleteImageFile } from '@/lib/imageStorage';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { id: string } };

export async function GET(request: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const image = await db.image.findUnique({ where: { id: params.id } });
    if (!image) {
      // Don't reveal whether it existed
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (image.userId !== session.userId) {
      // Treat as not found to avoid revealing existence
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Stream the file from private storage
    const absPath = image.storagePath.startsWith('/')
      ? image.storagePath.slice(1)
      : image.storagePath;
    const fs = await import('fs');
    const path = await import('path');
    const full = path.join(process.cwd(), absPath);

    try {
      const buffer = await fs.promises.readFile(full);
      return new NextResponse(buffer, { status: 200, headers: { 'Content-Type': image.mimeType } });
    } catch (err) {
      console.error('Failed to read image file:', err);
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
  } catch (error) {
    console.error(`GET /api/uploads/${params.id} failed:`, error);
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
