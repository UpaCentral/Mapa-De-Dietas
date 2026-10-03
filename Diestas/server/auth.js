const encoder = new TextEncoder();
const defaultIterations = 210000;

function decodeBase64(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function toHex(bytes) {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function createSessionToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return toHex(bytes);
}

export async function hashSessionToken(token) {
  return toHex(await crypto.subtle.digest('SHA-256', encoder.encode(token)));
}

export async function hashPassword(password, salt, iterations = defaultIterations) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password.trim()), 'PBKDF2', false, ['deriveBits']);
  const result = await crypto.subtle.deriveBits({
    name: 'PBKDF2',
    salt: decodeBase64(salt),
    iterations,
    hash: 'SHA-256',
  }, key, 256);
  return toHex(result);
}

export async function verifyPassword(password, credential) {
  if (typeof password !== 'string' || typeof credential?.salt !== 'string' || !/^(?:[a-f\d]{2})+$/i.test(credential.passwordHash || '')) {
    return false;
  }

  const actual = await hashPassword(password, credential.salt, credential.iterations || defaultIterations);
  const expected = credential.passwordHash.toLowerCase();
  if (actual.length !== expected.length) return false;

  let difference = 0;
  for (let index = 0; index < actual.length; index += 1) {
    difference |= actual.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return difference === 0;
}