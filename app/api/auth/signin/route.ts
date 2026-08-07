import { NextResponse } from 'next/server';
import { verifyPassword, signToken } from '@/lib/auth';
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE } from '@/lib/jwt';
import { db } from '@/lib/db';
import { SigninSchema } from '@/lib/validations';

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
    const input = SigninSchema.safeParse(await request.json());
    if (!input.success)
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 400 });

    const user = await db.user.findUnique({ where: { email: input.data.email } });
    const valid = user ? await verifyPassword(input.data.password, user.passwordHash) : false;
    if (!user || !valid)
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });

    const response = NextResponse.json(
      { user: { id: user.id, email: user.email } },
      { status: 200 },
    );
    setSessionCookie(response, await signToken({ userId: user.id, email: user.email }));
    return response;
  } catch (error) {
    console.error('Signin failed:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
