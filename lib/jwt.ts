export const SESSION_COOKIE_NAME = 'session_token';
export const SESSION_MAX_AGE = 7 * 24 * 60 * 60;

export function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured');
  return new TextEncoder().encode(secret);
}
