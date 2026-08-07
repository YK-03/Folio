import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { hashPassword, signToken } from '@/lib/auth';
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE } from '@/lib/jwt';
import { db } from '@/lib/db';
import { SignupSchema } from '@/lib/validations';

function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const input = SignupSchema.safeParse(await request.json());
    if (!input.success)
      return NextResponse.json({ error: 'Invalid signup details' }, { status: 400 });

    const existing = await db.user.findUnique({ where: { email: input.data.email } });
    if (existing)
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 },
      );

    const user = await db.user.create({
      data: { email: input.data.email, passwordHash: await hashPassword(input.data.password) },
      select: { id: true, email: true },
    });
    const response = NextResponse.json({ user }, { status: 201 });
    setSessionCookie(response, await signToken({ userId: user.id, email: user.email }));
    return response;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 },
      );
    }
    console.error('Signup failed:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
