import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);

export function createSessionToken() {
  return randomBytes(32).toString("hex");
}

export function hashSessionToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export async function verifyPassword(password, credential) {
  if (
    typeof password !== "string" ||
    typeof credential?.salt !== "string" ||
    typeof credential?.passwordHash !== "string" ||
    !/^(?:[a-f\d]{2})+$/i.test(credential.passwordHash)
  ) {
    return false;
  }

  const expected = Buffer.from(credential.passwordHash, "hex");
  const actual = await scrypt(password, credential.salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}