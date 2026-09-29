import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const sessions = new Map();
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

export async function verifyPassword(password, credential) {
  if (typeof password !== 'string' || !credential?.salt || !credential?.passwordHash) return false;

  const expected = Buffer.from(credential.passwordHash, 'hex');
  const actual = await scrypt(password, credential.salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function createSession(username) {
  const token = randomBytes(32).toString('base64url');
  sessions.set(token, { username, expiresAt: Date.now() + SESSION_TTL_MS });
  return token;
}

export function getSession(token) {
  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return null;
  }
  return session;
}

export function revokeSession(token) {
  sessions.delete(token);
}
