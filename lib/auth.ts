import bcrypt from 'bcryptjs';
import { jwtVerify, SignJWT } from 'jose';
import { getJwtSecret } from '@/lib/jwt';

const BCRYPT_SALT_ROUNDS = 12;

export type JwtPayload = {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
};

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function signToken(payload: Pick<JwtPayload, 'userId' | 'email'>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getJwtSecret());
}

export async function verifyToken(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, getJwtSecret(), { algorithms: ['HS256'] });
  if (typeof payload.userId !== 'string' || typeof payload.email !== 'string') {
    throw new Error('Invalid session payload');
  }
  const session: JwtPayload = { userId: payload.userId, email: payload.email };
  if (payload.iat !== undefined) session.iat = payload.iat;
  if (payload.exp !== undefined) session.exp = payload.exp;
  return session;
}
