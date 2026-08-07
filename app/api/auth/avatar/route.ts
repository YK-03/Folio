import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

const avatarIds = ['spider-man', 'batman', 'jake', 'random'] as const;

type AvatarId = (typeof avatarIds)[number];

function isAvatarId(value: unknown): value is AvatarId {
  return typeof value === 'string' && (avatarIds as readonly string[]).includes(value);
}

export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { avatarId: true },
  });

  return NextResponse.json({ avatarId: user?.avatarId ?? 'spider-man' });
}

export async function PATCH(request: NextRequest) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid avatar request' }, { status: 400 });
  }

  if (!payload || typeof payload !== 'object' || !('avatarId' in payload) || !isAvatarId(payload.avatarId)) {
    return NextResponse.json({ error: 'Invalid avatar request' }, { status: 400 });
  }

  const user = await db.user.update({
    where: { id: session.userId },
    data: { avatarId: payload.avatarId },
    select: { avatarId: true },
  });

  return NextResponse.json({ avatarId: user.avatarId });
}
