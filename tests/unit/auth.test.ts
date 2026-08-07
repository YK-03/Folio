/**
 * @vitest-environment node
 */

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_key_for_testing_12345';

import { describe, it, expect } from 'vitest';
import { SignJWT } from 'jose';
import { hashPassword, verifyPassword, signToken, verifyToken } from '@/lib/auth';
import { getJwtSecret } from '@/lib/jwt';

describe('hashPassword', () => {
  it('returns a bcrypt hash string', async () => {
    const hash = await hashPassword('password123');
    expect(hash).toBeTypeOf('string');
  });

  it('produces a different hash each call (due to salt)', async () => {
    const hash1 = await hashPassword('password123');
    const hash2 = await hashPassword('password123');
    expect(hash1).not.toBe(hash2);
  });

  it('hash length is >= 60 characters', async () => {
    const hash = await hashPassword('password123');
    expect(hash.length).toBeGreaterThanOrEqual(60);
  });
});

describe('verifyPassword', () => {
  it('returns true when the plain password matches the hash', async () => {
    const hash = await hashPassword('password123');
    const matches = await verifyPassword('password123', hash);
    expect(matches).toBe(true);
  });

  it('returns false when the plain password does not match', async () => {
    const hash = await hashPassword('password123');
    const matches = await verifyPassword('wrongpassword', hash);
    expect(matches).toBe(false);
  });

  it('returns false for an empty string against a valid hash', async () => {
    const hash = await hashPassword('password123');
    const matches = await verifyPassword('', hash);
    expect(matches).toBe(false);
  });
});

describe('signToken', () => {
  it('returns a string (the JWT)', async () => {
    const token = await signToken({ userId: '123', email: 'test@example.com' });
    expect(token).toBeTypeOf('string');
  });

  it('the token can be split into 3 parts separated by dots', async () => {
    const token = await signToken({ userId: '123', email: 'test@example.com' });
    const parts = token.split('.');
    expect(parts.length).toBe(3);
  });
});

describe('verifyToken', () => {
  it('decodes a token signed by signToken and returns the payload', async () => {
    const payload = { userId: '123', email: 'test@example.com' };
    const token = await signToken(payload);
    const decoded = await verifyToken(token);
    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.email).toBe(payload.email);
  });

  it('throws when given an invalid token', async () => {
    await expect(verifyToken('invalid.token.here')).rejects.toThrow();
  });

  it('throws when given an expired token', async () => {
    // Generate a token that expired 10 seconds ago
    const expiredToken = await new SignJWT({ userId: '123', email: 'test@example.com' })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuedAt()
      .setExpirationTime('-10s')
      .sign(getJwtSecret());

    await expect(verifyToken(expiredToken)).rejects.toThrow();
  });
});
