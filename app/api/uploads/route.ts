import { NextRequest, NextResponse } from 'next/server';
import { saveImageFile } from '@/lib/imageStorage';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

const MAX_UPLOAD_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.type || !file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_SIZE) {
      return NextResponse.json({ error: 'File too large' }, { status: 413 });
    }

    const buffer = await file.arrayBuffer();
    const storagePath = await saveImageFile(buffer, file.name);

    // Create DB record linking this upload to the uploading user. noteId remains null until associated with a note.
    const image = await db.image.create({
      data: {
        filename: file.name,
        mimeType: file.type,
        size: file.size,
        storagePath,
        userId: session.userId,
      },
    });

    // Return a protected URL that routes through our authenticated image handler
    const url = `/api/uploads/${image.id}`;

    return NextResponse.json({ id: image.id, url }, { status: 201 });
  } catch (error) {
    console.error('POST /api/uploads failed:', error);
    return NextResponse.json({ error: 'Image upload failed' }, { status: 500 });
  }
}
