import test from "node:test";
import assert from "node:assert/strict";

import { createSessionToken, hashPassword, hashSessionToken, verifyPassword } from "../server/auth.js";

test("session tokens are random and stored as one-way hashes", async () => {
  const firstToken = createSessionToken();
  const secondToken = createSessionToken();

  assert.notEqual(firstToken, secondToken);
  assert.equal(firstToken.length, 64);
  const firstHash = await hashSessionToken(firstToken);
  assert.equal(firstHash.length, 64);
  assert.notEqual(firstHash, firstToken);
});

test("password verification accepts only the matching PBKDF2 credential", async () => {
  const salt = "dGVzdC1zYWx0";
  const passwordHash = await hashPassword("correct horse", salt, 1000);
  const credential = { salt, passwordHash, iterations: 1000 };

  assert.equal(await verifyPassword("correct horse", credential), true);
  assert.equal(await verifyPassword(" correct horse ", credential), true);
  assert.equal(await verifyPassword("wrong password", credential), false);
  assert.equal(await verifyPassword(undefined, credential), false);
});

test("uses the Cloudflare Workers-supported PBKDF2 iteration count by default", async () => {
  const salt = "dGVzdC1zYWx0";
  const defaultHash = await hashPassword("correct horse", salt);
  const workerHash = await hashPassword("correct horse", salt, 100000);

  assert.equal(defaultHash, workerHash);
  assert.equal(await verifyPassword("correct horse", { salt, passwordHash: workerHash }), true);
});
